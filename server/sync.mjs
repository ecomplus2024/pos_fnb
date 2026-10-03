// ============================================================
// sync.mjs — đẩy data quán lên kho trung tâm (D1 trên Cloudflare)
// Chạy định kỳ trong local server. 2 mode:
//
//   mode "d1" (mặc định mới): gọi THẲNG Cloudflare REST API ghi vào
//     D1 — dùng chung CF API token của phần Tunnel (settings.tunnel
//     .cf_token) + tên D1 database cấu hình ở settings.hub.db_name.
//     Token cần quyền "Account → D1 (Edit)". Không cần hub Worker.
//
//   mode "worker" (cũ): POST /api/hub/push tới hub Worker với
//     Bearer api_key từ /api/hub/register.
//
// settings.hub = { enabled, mode, store_id, db_name, db_id,
//                  account_id, device_id, url, api_key }
// ============================================================
import { cfApi } from "./tunnel.mjs";
import { randomUUID } from "node:crypto";

const SYNC_INTERVAL_MS = Number(process.env.SYNC_INTERVAL_MS || 60_000);
const PUSH_BATCH = 100;
const RAW_CHUNK = 40; // số statement tối đa mỗi call /d1/raw

let timer = null;
let running = false;
let lastStatus = { ok: null, at: null, detail: "chưa sync lần nào" };
let ensuredD1 = null; // cache "đã ensure schema" theo db_id
export const getSyncStatus = () => lastStatus;

async function getSetting(db, key) {
  const row = await db.prepare("SELECT value FROM settings WHERE key = ?").bind(key).first();
  if (!row) return null;
  try { return JSON.parse(row.value); } catch { return row.value; }
}

async function setSetting(db, key, value) {
  await db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).bind(key, JSON.stringify(value)).run();
}

async function setSyncStatusSetting(db, status) {
  await db.prepare(
    "INSERT INTO settings (key, value) VALUES ('sync_status', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).bind(JSON.stringify(status)).run();
}

async function collectOrders(db) {
  const { results: orders } = await db.prepare(
    `SELECT o.id AS local_id, o.display_code, o.order_type, o.status,
            o.customer_phone, o.total, o.paid_at, o.created_at, o.updated_at,
            t.name AS table_name
     FROM orders o LEFT JOIN tables t ON t.id = o.table_id
     WHERE o.synced_at IS NULL OR (o.updated_at IS NOT NULL AND o.updated_at > o.synced_at)
     ORDER BY o.id LIMIT ${PUSH_BATCH}`
  ).all();
  if (!orders.length) return orders;
  for (const o of orders) {
    const { results: items } = await db.prepare(
      `SELECT i.id, i.quantity, i.price, i.notes, i.status,
              p.name AS product_name, s.name AS size_name
       FROM order_items i
       LEFT JOIN products p ON p.id = i.product_id
       LEFT JOIN product_sizes s ON s.id = i.size_id
       WHERE i.order_id = ?`
    ).bind(o.local_id).all();
    for (const it of items) {
      const { results: tops } = await db.prepare(
        `SELECT t.quantity, p.name, p.price FROM order_item_toppings t
         LEFT JOIN products p ON p.id = t.topping_id WHERE t.order_item_id = ?`
      ).bind(it.id).all();
      it.toppings = tops;
    }
    o.items = items;
  }
  return orders;
}

async function collectAttendance(db) {
  const { results } = await db.prepare(
    `SELECT a.id AS local_id, e.name AS user_name,
            a.check_in_at, a.check_out_at, a.note
     FROM attendance a LEFT JOIN employees e ON e.id = a.user_id
     WHERE a.synced_at IS NULL
     ORDER BY a.id LIMIT ${PUSH_BATCH}`
  ).all().catch(() => ({ results: [] }));
  return results;
}

// Bản ghi đã xóa ở local cần xóa trên hub (tombstone)
async function collectDeletes(db) {
  const { results } = await db.prepare(
    "SELECT id, entity, local_id FROM sync_deletes ORDER BY id LIMIT 500"
  ).all().catch(() => ({ results: [] }));
  return results;
}

async function collectCatalog(db) {
  const categories = (await db.prepare(
    "SELECT id AS local_id, name, sort_order, production_unit FROM categories"
  ).all()).results;
  const products = (await db.prepare(
    `SELECT p.id AS local_id, p.name, p.price, p.available, p.production_unit,
            c.name AS category
     FROM products p LEFT JOIN categories c ON c.id = p.category_id`
  ).all()).results;
  for (const p of products) {
    p.sizes = (await db.prepare(
      "SELECT name, price FROM product_sizes WHERE product_id = ? ORDER BY sort_order"
    ).bind(p.local_id).all()).results;
  }
  const tables = (await db.prepare(
    "SELECT id AS local_id, name, seats FROM tables"
  ).all()).results;
  return { categories, products, tables };
}

// ---------- SQL literal escape cho D1 /raw (không hỗ trợ params) ----------
function sqlLit(v) {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "NULL";
  if (typeof v === "boolean") return v ? "1" : "0";
  return "'" + String(v).replace(/'/g, "''") + "'";
}

// ---------- mode "d1": nói thẳng với Cloudflare REST API ----------

// Lấy auth CF: token lưu chung trong settings.tunnel + account_id.
async function getCfAuth(db) {
  const tun = (await getSetting(db, "tunnel")) || {};
  const auth = { token: tun.cf_token || "", email: tun.cf_email || "" };
  if (!auth.token) {
    throw new Error('chưa có CF API token — nhập token ở mục "Tên miền riêng" rồi bấm "Lưu token"');
  }
  let account_id = tun.account_id || "";
  if (!account_id) {
    const accounts = await cfApi(auth, "GET", "/accounts?per_page=50");
    account_id = accounts?.[0]?.id || "";
    if (!account_id) throw new Error("token không thấy account nào — nhập Account ID ở mục Tên miền riêng");
  }
  return { auth, account_id };
}

// API cho UI: liệt kê / tạo D1 database bằng token đã lưu.
// Trả true nếu đã xử lý request.
export async function d1Api(db, req, res, pathname, body, sendJson) {
  if (!pathname.startsWith("/api/admin/d1-")) return false;
  try {
    const { auth, account_id } = await getCfAuth(db);

    if (req.method === "POST" && pathname === "/api/admin/d1-list") {
      const dbs = await cfApi(auth, "GET",
        `/accounts/${account_id}/d1/database?per_page=100`).catch((e) => {
          throw new Error(`lỗi liệt kê D1 (token cần quyền "Account → D1: Edit"): ${e.message || e}`);
        });
      sendJson(res, {
        ok: true,
        databases: (dbs || []).map((d) => ({ name: d.name, uuid: d.uuid || d.id })),
      });
      return true;
    }

    if (req.method === "POST" && pathname === "/api/admin/d1-create") {
      const name = String(body?.name || "").trim().toLowerCase();
      if (!/^[a-z0-9][a-z0-9_-]{0,62}$/.test(name)) {
        throw new Error("tên DB chỉ gồm chữ thường, số, gạch ngang, gạch dưới");
      }
      const created = await cfApi(auth, "POST",
        `/accounts/${account_id}/d1/database`, { name }).catch((e) => {
          throw new Error(`không tạo được DB (token cần quyền "Account → D1: Edit"): ${e.message || e}`);
        });
      sendJson(res, { ok: true, database: { name: created.name || name, uuid: created.uuid || created.id } });
      return true;
    }
  } catch (err) {
    sendJson(res, { ok: false, error: String(err?.message || err) }, 200);
    return true;
  }
  return false;
}

// Resolve thông tin kết nối: token (từ tunnel), account_id, db_id.
async function resolveD1(db, hub) {
  const { auth, account_id } = await getCfAuth(db);
  const db_name = String(hub.db_name || "pos-free").trim();
  let db_id = hub.db_id || "";
  if (!db_id || hub._db_name_cached !== db_name) {
    const dbs = await cfApi(
      auth, "GET",
      `/accounts/${account_id}/d1/database?name=${encodeURIComponent(db_name)}&per_page=10`
    ).catch((e) => {
      throw new Error(`lỗi tìm D1 (token cần quyền "Account → D1: Edit"): ${e.message || e}`);
    });
    const match = (dbs || []).find((d) => d.name === db_name);
    if (!match) {
      throw new Error(`không thấy D1 database "${db_name}" trong account — tạo DB trên Cloudflare hoặc sửa lại tên`);
    }
    db_id = match.uuid || match.id;
    // Merge vào bản settings mới nhất — tránh xoá field các hàm khác vừa lưu
    const cur = (await getSetting(db, "hub")) || {};
    await setSetting(db, "hub", { ...cur, db_name, db_id, account_id, _db_name_cached: db_name });
  }
  return { auth, account_id, db_id, db_name };
}

async function d1Raw(ctx, sql) {
  const res = await cfApi(ctx.auth, "POST",
    `/accounts/${ctx.account_id}/d1/database/${ctx.db_id}/raw`, { sql });
  // /raw trả mảng kết quả theo từng statement — check từng cái
  const arr = Array.isArray(res) ? res : [res];
  for (const r of arr) {
    if (r && r.success === false) throw new Error(r.error || "D1 statement lỗi");
  }
  return arr;
}

async function d1QueryRows(ctx, sql) {
  const res = await cfApi(ctx.auth, "POST",
    `/accounts/${ctx.account_id}/d1/database/${ctx.db_id}/query`, { sql });
  const first = Array.isArray(res) ? res[0] : res;
  const rows = first?.results ?? [];
  return Array.isArray(rows) ? rows : [];
}

const HUB_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS hub_stores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id TEXT UNIQUE NOT NULL,
  name TEXT,
  api_key TEXT,
  device_id TEXT,
  last_sync_at TEXT,
  last_sync_detail TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS hub_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id TEXT NOT NULL,
  local_id INTEGER NOT NULL,
  display_code TEXT,
  order_type TEXT,
  status TEXT,
  table_name TEXT,
  customer_phone TEXT,
  total INTEGER NOT NULL DEFAULT 0,
  paid_at TEXT,
  created_at TEXT,
  updated_at TEXT,
  items_json TEXT,
  synced_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(store_id, local_id)
);
CREATE TABLE IF NOT EXISTS hub_products (
  store_id TEXT NOT NULL,
  local_id INTEGER NOT NULL,
  name TEXT,
  price INTEGER,
  category TEXT,
  available INTEGER,
  production_unit TEXT,
  sizes_json TEXT,
  synced_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(store_id, local_id)
);
CREATE TABLE IF NOT EXISTS hub_categories (
  store_id TEXT NOT NULL,
  local_id INTEGER NOT NULL,
  name TEXT,
  sort_order INTEGER,
  production_unit TEXT,
  UNIQUE(store_id, local_id)
);
CREATE TABLE IF NOT EXISTS hub_tables (
  store_id TEXT NOT NULL,
  local_id INTEGER NOT NULL,
  name TEXT,
  seats INTEGER,
  UNIQUE(store_id, local_id)
);
CREATE TABLE IF NOT EXISTS hub_attendance (
  store_id TEXT NOT NULL,
  local_id INTEGER NOT NULL,
  user_name TEXT,
  check_in_at TEXT,
  check_out_at TEXT,
  note TEXT,
  synced_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(store_id, local_id)
);
CREATE TABLE IF NOT EXISTS hub_payroll (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id TEXT NOT NULL,
  local_id INTEGER,
  user_name TEXT,
  period TEXT,
  hours REAL, rate INTEGER, bonus INTEGER DEFAULT 0, penalty INTEGER DEFAULT 0,
  total INTEGER, note TEXT, shifts_json TEXT,
  synced_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(store_id, local_id)
);
CREATE TABLE IF NOT EXISTS hub_employees (
  store_id TEXT NOT NULL,
  local_id INTEGER NOT NULL,
  name TEXT,
  hourly_rate INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  synced_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(store_id, local_id)
);
`;

async function ensureD1Schema(ctx) {
  if (ensuredD1 === ctx.db_id) return;
  await d1Raw(ctx, HUB_SCHEMA_SQL);
  // DB cũ có thể thiếu cột mới — thử thêm, lỗi thì bỏ qua
  try {
    await d1Raw(ctx, "ALTER TABLE hub_stores ADD COLUMN device_id TEXT;");
  } catch {}
  try {
    await d1Raw(ctx, "ALTER TABLE hub_payroll ADD COLUMN shifts_json TEXT;");
  } catch {}
  try {
    await d1Raw(ctx, "ALTER TABLE hub_attendance ADD COLUMN note TEXT;");
  } catch {}
  ensuredD1 = ctx.db_id;
}

// Kiểm tra trùng lặp mã quán: mỗi store_id chỉ được gắn với 1 máy POS.
// device_id lưu trong hub_stores — máy khác cùng store_id sẽ bị báo lỗi.
async function claimStoreDevice(db, ctx, hub, storeId) {
  let deviceId = hub.device_id;
  if (!deviceId) {
    deviceId = randomUUID();
    const cur = (await getSetting(db, "hub")) || {};
    await setSetting(db, "hub", { ...cur, device_id: deviceId });
  }
  const rows = await d1QueryRows(ctx,
    `SELECT device_id FROM hub_stores WHERE store_id = ${sqlLit(storeId)}`);
  const existing = rows?.[0]?.device_id;
  if (existing && existing !== deviceId) {
    throw new Error(
      `mã quán "${storeId}" đang được máy POS khác sử dụng — đổi Mã quán khác, ` +
      `hoặc xóa dòng store này trong bảng hub_stores trên D1 nếu là máy cũ`
    );
  }
  await d1Raw(ctx, `
    INSERT INTO hub_stores (store_id, name, api_key, device_id, last_sync_at)
    VALUES (${sqlLit(storeId)}, ${sqlLit(storeId)}, 'd1-direct', ${sqlLit(deviceId)}, datetime('now'))
    ON CONFLICT(store_id) DO UPDATE SET
      device_id = COALESCE(hub_stores.device_id, excluded.device_id),
      last_sync_at = excluded.last_sync_at;
  `);
  return deviceId;
}

function buildCatalogStatements(storeId, catalog) {
  const stmts = [];
  const S = sqlLit(storeId);
  for (const c of catalog.categories) {
    stmts.push(
      `INSERT INTO hub_categories (store_id, local_id, name, sort_order, production_unit)
       VALUES (${S}, ${Number(c.local_id) || 0}, ${sqlLit(c.name)}, ${Number(c.sort_order) || 0}, ${sqlLit(c.production_unit)})
       ON CONFLICT(store_id, local_id) DO UPDATE SET
         name=excluded.name, sort_order=excluded.sort_order, production_unit=excluded.production_unit`
    );
  }
  for (const p of catalog.products) {
    stmts.push(
      `INSERT INTO hub_products (store_id, local_id, name, price, category, available, production_unit, sizes_json, synced_at)
       VALUES (${S}, ${Number(p.local_id) || 0}, ${sqlLit(p.name)}, ${Number(p.price) || 0},
               ${sqlLit(p.category)}, ${p.available ? 1 : 0}, ${sqlLit(p.production_unit)},
               ${sqlLit(JSON.stringify(p.sizes || []))}, datetime('now'))
       ON CONFLICT(store_id, local_id) DO UPDATE SET
         name=excluded.name, price=excluded.price, category=excluded.category,
         available=excluded.available, production_unit=excluded.production_unit,
         sizes_json=excluded.sizes_json, synced_at=excluded.synced_at`
    );
  }
  for (const t of catalog.tables) {
    stmts.push(
      `INSERT INTO hub_tables (store_id, local_id, name, seats)
       VALUES (${S}, ${Number(t.local_id) || 0}, ${sqlLit(t.name)}, ${Number(t.seats) || 0})
       ON CONFLICT(store_id, local_id) DO UPDATE SET name=excluded.name, seats=excluded.seats`
    );
  }
  // Xóa ở hub những món/danh mục/bàn đã bị xóa ở local
  const catIds = catalog.categories.map((c) => Number(c.local_id) || 0).join(",") || "NULL";
  const prodIds = catalog.products.map((p) => Number(p.local_id) || 0).join(",") || "NULL";
  const tblIds = catalog.tables.map((t) => Number(t.local_id) || 0).join(",") || "NULL";
  stmts.push(`DELETE FROM hub_categories WHERE store_id=${S} AND local_id NOT IN (${catIds})`);
  stmts.push(`DELETE FROM hub_products WHERE store_id=${S} AND local_id NOT IN (${prodIds})`);
  stmts.push(`DELETE FROM hub_tables WHERE store_id=${S} AND local_id NOT IN (${tblIds})`);
  return stmts;
}

function buildDataStatements(storeId, orders, attendance, payroll, employees) {
  const stmts = [];
  const S = sqlLit(storeId);
  for (const o of orders) {
    stmts.push(
      `INSERT INTO hub_orders (store_id, local_id, display_code, order_type, status,
         table_name, customer_phone, total, paid_at, created_at, updated_at, items_json, synced_at)
       VALUES (${S}, ${Number(o.local_id) || 0}, ${sqlLit(o.display_code)}, ${sqlLit(o.order_type)},
         ${sqlLit(o.status)}, ${sqlLit(o.table_name)}, ${sqlLit(o.customer_phone)},
         ${Number(o.total) || 0}, ${sqlLit(o.paid_at)}, ${sqlLit(o.created_at)},
         ${sqlLit(o.updated_at)}, ${sqlLit(JSON.stringify(o.items || []))}, datetime('now'))
       ON CONFLICT(store_id, local_id) DO UPDATE SET
         display_code=excluded.display_code, order_type=excluded.order_type,
         status=excluded.status, table_name=excluded.table_name,
         customer_phone=excluded.customer_phone, total=excluded.total,
         paid_at=excluded.paid_at, updated_at=excluded.updated_at,
         items_json=excluded.items_json, synced_at=excluded.synced_at`
    );
  }
  for (const a of attendance) {
    stmts.push(
      `INSERT INTO hub_attendance (store_id, local_id, user_name, check_in_at, check_out_at, note, synced_at)
       VALUES (${S}, ${Number(a.local_id) || 0}, ${sqlLit(a.user_name)},
         ${sqlLit(a.check_in_at)}, ${sqlLit(a.check_out_at)}, ${sqlLit(a.note)}, datetime('now'))
       ON CONFLICT(store_id, local_id) DO UPDATE SET
         user_name=excluded.user_name, check_in_at=excluded.check_in_at,
         check_out_at=excluded.check_out_at, note=excluded.note, synced_at=excluded.synced_at`
    );
  }
  for (const p of payroll) {
    stmts.push(
      `INSERT INTO hub_payroll (store_id, local_id, user_name, period, hours, rate, bonus, penalty, total, note, shifts_json, synced_at)
       VALUES (${S}, ${Number(p.local_id) || 0}, ${sqlLit(p.user_name)}, ${sqlLit(p.period)},
         ${Number(p.hours) || 0}, ${Number(p.rate) || 0}, ${Number(p.bonus) || 0},
         ${Number(p.penalty) || 0}, ${Number(p.total) || 0}, ${sqlLit(p.note)},
         ${sqlLit(p.shifts_json)}, datetime('now'))
       ON CONFLICT(store_id, local_id) DO UPDATE SET
         user_name=excluded.user_name, period=excluded.period, hours=excluded.hours,
         rate=excluded.rate, bonus=excluded.bonus, penalty=excluded.penalty,
         total=excluded.total, note=excluded.note, shifts_json=excluded.shifts_json,
         synced_at=excluded.synced_at`
    );
  }
  for (const e of employees) {
    stmts.push(
      `INSERT INTO hub_employees (store_id, local_id, name, hourly_rate, active, synced_at)
       VALUES (${S}, ${Number(e.local_id) || 0}, ${sqlLit(e.name)},
         ${Number(e.hourly_rate) || 0}, ${e.active ? 1 : 0}, datetime('now'))
       ON CONFLICT(store_id, local_id) DO UPDATE SET
         name=excluded.name, hourly_rate=excluded.hourly_rate,
         active=excluded.active, synced_at=excluded.synced_at`
    );
  }
  return stmts;
}

async function runRawChunked(ctx, stmts) {
  for (let i = 0; i < stmts.length; i += RAW_CHUNK) {
    const sql = stmts.slice(i, i + RAW_CHUNK).join(";\n") + ";";
    await d1Raw(ctx, sql);
  }
}

async function collectPayroll(db) {
  const { results } = await db.prepare(
    `SELECT id AS local_id, user_name, period, hours, rate, bonus, penalty, total, note, shifts_json
     FROM payroll WHERE synced_at IS NULL ORDER BY id LIMIT ${PUSH_BATCH}`
  ).all().catch(() => ({ results: [] }));
  return results;
}

async function collectEmployees(db) {
  const { results } = await db.prepare(
    `SELECT id AS local_id, name, hourly_rate, active
     FROM employees WHERE synced_at IS NULL ORDER BY id LIMIT ${PUSH_BATCH}`
  ).all().catch(() => ({ results: [] }));
  return results;
}

const DELETE_TABLE_MAP = {
  attendance: "hub_attendance",
  employees: "hub_employees",
  payroll: "hub_payroll",
};

function buildDeleteStatements(storeId, deletes) {
  const S = sqlLit(storeId);
  return deletes
    .filter((d) => DELETE_TABLE_MAP[d.entity])
    .map((d) => `DELETE FROM ${DELETE_TABLE_MAP[d.entity]} WHERE store_id=${S} AND local_id=${Number(d.local_id) || 0}`);
}

async function pushD1(db, hub, orders, catalog, attendance, payroll, employees, deletes) {
  const storeId = String(hub.store_id || "").trim();
  if (!storeId) throw new Error("chưa nhập Mã quán (store_id)");
  const ctx = await resolveD1(db, hub);
  await ensureD1Schema(ctx);
  await claimStoreDevice(db, ctx, hub, storeId);
  const stmts = [
    ...buildDataStatements(storeId, orders, attendance, payroll, employees),
    ...buildCatalogStatements(storeId, catalog),
    ...buildDeleteStatements(storeId, deletes || []),
  ];
  await runRawChunked(ctx, stmts);
  return { db_name: ctx.db_name };
}

// ---------- mode "worker": POST tới hub Worker như cũ ----------
async function pushWorker(hub, orders, catalog, attendance, payroll, employees) {
  if (!hub.url || !hub.api_key || !hub.store_id) {
    throw new Error("mode worker cần đủ url + store_id + api_key");
  }
  const url = hub.url.replace(/\/+$/, "") + "/api/hub/push";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${hub.api_key}`,
    },
    body: JSON.stringify({
      store_id: hub.store_id, full_catalog: true,
      orders, attendance, payroll, employees, ...catalog,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`hub ${res.status}: ${data.message || data.error || ""}`);
}

async function markSynced(db, orders, attendance, payroll, employees, deletes) {
  const now = new Date().toISOString();
  for (const o of orders) {
    await db.prepare("UPDATE orders SET synced_at = ? WHERE id = ?").bind(now, o.local_id).run();
  }
  for (const a of attendance) {
    await db.prepare("UPDATE attendance SET synced_at = ? WHERE id = ?").bind(now, a.local_id).run();
  }
  for (const p of payroll || []) {
    await db.prepare("UPDATE payroll SET synced_at = ? WHERE id = ?").bind(now, p.local_id).run();
  }
  for (const e of employees || []) {
    await db.prepare("UPDATE employees SET synced_at = ? WHERE id = ?").bind(now, e.local_id).run();
  }
  // Tombstone đã đẩy lên hub xong → dọn
  for (const d of deletes || []) {
    await db.prepare("DELETE FROM sync_deletes WHERE id = ?").bind(d.id).run().catch(() => {});
  }
  return now;
}

async function syncOnce(db) {
  if (running) return;
  running = true;
  try {
    const hub = await getSetting(db, "hub");
    if (!hub?.enabled) {
      lastStatus = { ok: null, at: null, detail: "sync tắt hoặc chưa cấu hình hub" };
      return;
    }
    const mode = hub.mode || (hub.url && hub.api_key ? "worker" : "d1");

    const orders = await collectOrders(db);
    const catalog = await collectCatalog(db);
    const attendance = await collectAttendance(db);
    const payroll = await collectPayroll(db);
    const employees = await collectEmployees(db);
    const deletes = await collectDeletes(db);

    let detail;
    if (mode === "d1") {
      const { db_name } = await pushD1(db, hub, orders, catalog, attendance, payroll, employees, deletes);
      detail = `đẩy ${orders.length} đơn + ${attendance.length} chấm công + ${payroll.length} phiếu lương + ${employees.length} nhân viên + ${deletes.length} xóa + catalog (${catalog.products.length} món) → D1 "${db_name}"`;
    } else {
      await pushWorker(hub, orders, catalog, attendance, payroll, employees);
      detail = `đẩy ${orders.length} đơn + ${attendance.length} chấm công + ${payroll.length} phiếu lương + ${employees.length} nhân viên + catalog (${catalog.products.length} món)`;
    }
    const now = await markSynced(db, orders, attendance, payroll, employees, deletes);
    lastStatus = { ok: true, at: now, detail };
    await setSyncStatusSetting(db, lastStatus);
  } catch (err) {
    lastStatus = { ok: false, at: new Date().toISOString(), detail: String(err?.message || err) };
    await setSyncStatusSetting(db, lastStatus).catch(() => {});
  } finally {
    running = false;
  }
}

export function startSyncLoop(db) {
  if (timer) return;
  console.log(`[sync] hub sync mỗi ${SYNC_INTERVAL_MS / 1000}s`);
  const tick = () => syncOnce(db).catch((e) => console.error("[sync]", e));
  setTimeout(tick, 5000); // lần đầu sau 5s
  timer = setInterval(tick, SYNC_INTERVAL_MS);
  timer.unref?.();
}

// Cho admin nút "Đồng bộ ngay"
export async function syncNow(db) {
  await syncOnce(db);
  return lastStatus;
}

// Nút "Kiểm tra kết nối" — mode nào cũng trả {ok, detail}
export async function hubPing(db) {
  const hub = await getSetting(db, "hub");
  if (!hub) return { ok: false, detail: "chưa cấu hình hub" };
  const mode = hub.mode || (hub.url && hub.api_key ? "worker" : "d1");

  if (mode === "d1") {
    try {
      if (!String(hub.store_id || "").trim()) {
        return { ok: false, detail: "chưa nhập Mã quán (store_id)" };
      }
      const ctx = await resolveD1(db, hub);
      await ensureD1Schema(ctx);
      await claimStoreDevice(db, ctx, hub, String(hub.store_id).trim());
      return {
        ok: true,
        detail: `token OK → account ${ctx.account_id.slice(0, 8)}… → D1 "${ctx.db_name}" ✓ → quán "${hub.store_id}" ✓`,
      };
    } catch (err) {
      return { ok: false, detail: String(err?.message || err) };
    }
  }

  // mode worker như cũ
  if (!hub.url || !hub.api_key) return { ok: false, detail: "chưa cấu hình hub" };
  try {
    const res = await fetch(hub.url.replace(/\/+$/, "") + "/api/hub/ping", {
      headers: { Authorization: `Bearer ${hub.api_key}` },
    });
    const data = await res.json().catch(() => ({}));
    return res.ok ? { ok: true, ...data } : { ok: false, detail: `${res.status}: ${data.message || ""}` };
  } catch (err) {
    return { ok: false, detail: String(err?.message || err) };
  }
}
