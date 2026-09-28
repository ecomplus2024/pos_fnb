// ============================================================
// sync.mjs — đẩy data quán lên central hub (Worker + D1)
// Chạy định kỳ trong local server. Settings lấy từ bảng settings
// key 'hub': { url, store_id, api_key, enabled }
// ============================================================

const SYNC_INTERVAL_MS = Number(process.env.SYNC_INTERVAL_MS || 60_000);
const PUSH_BATCH = 100;

let timer = null;
let running = false;
let lastStatus = { ok: null, at: null, detail: "chưa sync lần nào" };
export const getSyncStatus = () => lastStatus;

async function getSetting(db, key) {
  const row = await db.prepare("SELECT value FROM settings WHERE key = ?").bind(key).first();
  if (!row) return null;
  try { return JSON.parse(row.value); } catch { return row.value; }
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

async function syncOnce(db) {
  if (running) return;
  running = true;
  try {
    const hub = await getSetting(db, "hub");
    if (!hub?.enabled || !hub?.url || !hub?.api_key || !hub?.store_id) {
      lastStatus = { ok: null, at: null, detail: "sync tắt hoặc chưa cấu hình hub" };
      return;
    }

    const orders = await collectOrders(db);
    const catalog = await collectCatalog(db);
    const payload = {
      store_id: hub.store_id,
      full_catalog: true,
      orders,
      ...catalog,
    };

    const url = hub.url.replace(/\/+$/, "") + "/api/hub/push";
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${hub.api_key}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      lastStatus = { ok: false, at: new Date().toISOString(), detail: `hub ${res.status}: ${data.message || data.error || ""}` };
    } else {
      const now = new Date().toISOString();
      for (const o of orders) {
        await db.prepare(
          "UPDATE orders SET synced_at = ? WHERE id = ?"
        ).bind(now, o.local_id).run();
      }
      lastStatus = { ok: true, at: now, detail: `đẩy ${orders.length} đơn + catalog (${catalog.products.length} món)` };
    }
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

// Cho admin nút "Đồng bộ ngay" / "Kiểm tra kết nối"
export async function syncNow(db) {
  await syncOnce(db);
  return lastStatus;
}

export async function hubPing(db) {
  const hub = await getSetting(db, "hub");
  if (!hub?.url || !hub?.api_key) return { ok: false, detail: "chưa cấu hình hub" };
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
