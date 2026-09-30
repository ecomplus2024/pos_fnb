/**
 * Khởi tạo + migrate database local.
 *
 * schema.sql trong repo LỖI THỜI so với DB production trên D1 — worker.ts
 * đang dùng các cột/bảng chưa có trong schema. migrate() bù phần drift đó
 * (idempotent — chạy mọi lần boot an toàn).
 */
import fs from "node:fs";
import crypto from "node:crypto";

const ORDER_COLUMNS = [
  ["display_code", "display_code TEXT"],
  ["client_id", "client_id TEXT"],
  ["customer_phone", "customer_phone TEXT"],
  ["ship_address", "ship_address TEXT"],
  ["latitude", "latitude REAL"],
  ["longitude", "longitude REAL"],
  ["ship_notes", "ship_notes TEXT"],
  ["payment_status", "payment_status TEXT"],
  ["synced_at", "synced_at TEXT"],
  ["updated_at", "updated_at TEXT"],
];

export async function initDb(db, { schemaPath }) {
  const row = await db
    .prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    .first();
  if (!row || row.n === 0) {
    db.exec(fs.readFileSync(schemaPath, "utf8"));
    console.log("[db] Initialized from schema.sql");
  }
  await migrate(db);
  await normalizeNfc(db);
  await seedAdmin(db);
}

async function columnNames(db, table) {
  const { results } = await db.prepare(`PRAGMA table_info(${table})`).all();
  return results.map((c) => c.name);
}

async function migrate(db) {
  // Bảng log hủy/sửa món cho màn hình bếp — schema.sql thiếu
  db.exec(`CREATE TABLE IF NOT EXISTS order_item_change_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER,
    order_item_id INTEGER,
    product_name TEXT,
    table_name TEXT,
    action TEXT,
    old_quantity INTEGER,
    new_quantity INTEGER,
    production_unit TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_change_logs_unit
    ON order_item_change_logs(production_unit, created_at)`);

  // orders thiếu nhiều cột (ship/takeaway/display_code...)
  const orderCols = await columnNames(db, "orders");
  for (const [name, def] of ORDER_COLUMNS) {
    if (!orderCols.includes(name)) {
      db.exec(`ALTER TABLE orders ADD COLUMN ${def}`);
      console.log(`[db] +orders.${name}`);
    }
  }

  // order_item_toppings thiếu quantity (worker insert kèm quantity)
  const toppingCols = await columnNames(db, "order_item_toppings");
  if (!toppingCols.includes("quantity")) {
    db.exec("ALTER TABLE order_item_toppings ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1");
    console.log("[db] +order_item_toppings.quantity");
  }

  // users.pin — mã 4 số để chấm công trên máy POS chung
  const userCols = await columnNames(db, "users");
  if (!userCols.includes("pin")) {
    db.exec("ALTER TABLE users ADD COLUMN pin TEXT");
    console.log("[db] +users.pin");
  }
  // users.hidden — nhân viên pull từ hub bị tắt thì ẩn khỏi màn chấm công
  if (!userCols.includes("hidden")) {
    db.exec("ALTER TABLE users ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0");
    console.log("[db] +users.hidden");
  }
  // users.hourly_rate — lương theo giờ, dùng cho phiếu lương
  if (!userCols.includes("hourly_rate")) {
    db.exec("ALTER TABLE users ADD COLUMN hourly_rate INTEGER NOT NULL DEFAULT 0");
    console.log("[db] +users.hourly_rate");
  }

  // payroll — phiếu lương theo kỳ tạo từ trang quản trị
  db.exec(`CREATE TABLE IF NOT EXISTS payroll (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_name TEXT NOT NULL,
    period TEXT NOT NULL,
    hours REAL, rate INTEGER, bonus INTEGER DEFAULT 0, penalty INTEGER DEFAULT 0,
    total INTEGER, note TEXT,
    synced_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  // Chấm công: 1 row = 1 ca (check_in_at bắt đầu, check_out_at kết thúc)
  // synced_at: đánh dấu đã đẩy lên hub (giống orders)
  db.exec(`CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    check_in_at TEXT NOT NULL,
    check_out_at TEXT,
    note TEXT,
    synced_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_attendance_user ON attendance(user_id, check_in_at)`);

  // Trigger giữ updated_at cho sync — chỉ chạy khi synced_at KHÔNG đổi
  // (mark synced_at không kích trigger → tránh vòng lặp re-push)
  db.exec(`CREATE TRIGGER IF NOT EXISTS trg_orders_touch
    AFTER UPDATE ON orders
    WHEN NEW.synced_at IS OLD.synced_at
    BEGIN
      UPDATE orders SET updated_at = datetime('now') WHERE id = NEW.id;
    END`);
}

/**
 * Chuẩn hóa text tiếng Việt về NFC (gộp dấu).
 * Data nhập từ iOS/Mac hoặc sync về hay ở dạng NFD (base + combining mark)
 * → font thiếu combining circumflex U+0302 render lỗi đúng các chữ có dấu mũ.
 * Idempotent — chạy mỗi boot, chỉ UPDATE row nào khác sau normalize.
 */
const NFC_COLUMNS = [
  ["categories", "name"],
  ["products", "name"],
  ["product_sizes", "name"],
  ["tables", "name"],
  ["orders", "customer_name"],
  ["orders", "ship_address"],
  ["orders", "ship_notes"],
  ["order_items", "product_name"],
  ["order_items", "note"],
  ["order_items", "size_name"],
  ["users", "full_name"],
  ["order_item_change_logs", "product_name"],
  ["order_item_change_logs", "table_name"],
  ["hub_stores", "name"],
  ["hub_orders", "table_name"],
  ["hub_orders", "items_json"],
  ["hub_products", "name"],
  ["hub_products", "category"],
  ["hub_products", "sizes_json"],
  ["hub_categories", "name"],
  ["hub_tables", "name"],
];

async function normalizeNfc(db) {
  let fixed = 0;
  for (const [table, col] of NFC_COLUMNS) {
    const cols = await columnNames(db, table);
    if (!cols.includes(col)) continue;
    const { results } = await db
      .prepare(`SELECT id, ${col} AS v FROM ${table} WHERE ${col} IS NOT NULL`)
      .all();
    const upd = db.prepare(`UPDATE ${table} SET ${col} = ? WHERE id = ?`);
    for (const row of results) {
      const n = String(row.v).normalize("NFC");
      if (n !== row.v) {
        await upd.bind(n, row.id).run();
        fixed++;
      }
    }
  }
  // settings không có cột id — normalize value theo key
  const { results: sRows } = await db.prepare("SELECT key, value FROM settings").all();
  const sUpd = db.prepare("UPDATE settings SET value = ? WHERE key = ?");
  for (const row of sRows) {
    const n = String(row.value).normalize("NFC");
    if (n !== row.value) {
      await sUpd.bind(n, row.key).run();
      fixed++;
    }
  }
  if (fixed) console.log(`[db] Normalized ${fixed} text value(s) → NFC`);
}

/** Tạo user admin mặc định nếu chưa có user nào */
async function seedAdmin(db) {
  const row = await db.prepare("SELECT COUNT(*) AS n FROM users").first();
  if (row && row.n > 0) return;
  const password = process.env.ADMIN_PASSWORD || "admin123";
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.createHash("sha256").update(salt + password).digest("hex");
  await db
    .prepare(
      "INSERT INTO users (username, password_hash, salt, full_name, role) VALUES (?, ?, ?, ?, ?)"
    )
    .bind("admin", hash, salt, "Quản trị", "admin")
    .run();
  console.log(`[db] Seeded user "admin" / password "${password}" — đổi ngay sau khi đăng nhập`);
}
