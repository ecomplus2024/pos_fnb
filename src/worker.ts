// @ts-nocheck
/**
 * POS Demo - Cloudflare Worker
 *
 * NOTE: File nay duoc khoi phuc tu ban da deploy (wrangler download 2026-09-05)
 * vi source goc khong con trong git. Noi dung chinh xac voi ban dang chay tai
 * https://pos-demo.webhook-logger.workers.dev (tsconfig allowJs=false nen dat @ts-nocheck).
 */

var corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders
    }
  });
}
async function sha256Hex(input) {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function generateSessionToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function extractToken(request) {
  const auth = request.headers.get("Authorization");
  if (!auth || !auth.startsWith("Bearer ")) return null;
  return auth.slice(7).trim();
}
async function withCache(request, ttlSeconds, swrSeconds, fetcher) {
  const cache = caches.default;
  const cached = await cache.match(request);
  if (cached) {
    const storedAt = parseInt(cached.headers.get("x-cached-at") || "0", 10);
    const ageMs = Date.now() - storedAt;
    const ttlMs = ttlSeconds * 1e3;
    const swrMs = swrSeconds * 1e3;
    if (ageMs < ttlMs) {
      const h = new Headers(cached.headers);
      h.set("x-cache", "HIT");
      return new Response(cached.body, { status: cached.status, headers: h });
    }
    if (swrSeconds > 0 && ageMs < ttlMs + swrMs) {
      const ctx = request.ctx;
      if (ctx) {
        ctx.waitUntil(fetcher().then((r) => cache.put(request, stampCache(r, ttlSeconds))));
      } else {
        fetcher().then((r) => cache.put(request, stampCache(r, ttlSeconds))).catch(() => {
        });
      }
      const h = new Headers(cached.headers);
      h.set("x-cache", "STALE");
      return new Response(cached.body, { status: cached.status, headers: h });
    }
    await cache.delete(request);
  }
  const fresh = await fetcher();
  if (fresh.status >= 200 && fresh.status < 300) {
    await cache.put(request, stampCache(fresh.clone(), ttlSeconds));
  }
  const h = new Headers(fresh.headers);
  h.set("x-cache", "MISS");
  return new Response(fresh.body, { status: fresh.status, headers: h });
}
function stampCache(resp, ttl) {
  const h = new Headers(resp.headers);
  h.set("Cache-Control", `public, max-age=${ttl}, s-maxage=${ttl}`);
  h.set("x-cached-at", String(Date.now()));
  return new Response(resp.body, { status: resp.status, headers: h });
}
async function handleLogin(env, body) {
  if (!body.username || !body.password) {
    return json({ message: "Thi\u1EBFu t\xEAn \u0111\u0103ng nh\u1EADp ho\u1EB7c m\u1EADt kh\u1EA9u" }, 400);
  }
  const userResult = await env.DB.prepare(
    "SELECT id, username, password_hash, salt, full_name, role FROM users WHERE username = ?"
  ).bind(body.username).first();
  if (!userResult) return json({ message: "Sai t\xEAn \u0111\u0103ng nh\u1EADp ho\u1EB7c m\u1EADt kh\u1EA9u" }, 401);
  const hashed = await sha256Hex(userResult.salt + body.password);
  if (hashed !== userResult.password_hash) return json({ message: "Sai t\xEAn \u0111\u0103ng nh\u1EADp ho\u1EB7c m\u1EADt kh\u1EA9u" }, 401);
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3).toISOString();
  await env.DB.prepare(
    "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)"
  ).bind(token, userResult.id, expiresAt).run();
  return json({
    access_token: token,
    user: {
      id: userResult.id,
      username: userResult.username,
      full_name: userResult.full_name,
      role: userResult.role
    }
  });
}
async function handleVerify(env, token) {
  const result = await env.DB.prepare(
    `SELECT u.id, u.username, u.full_name, u.role, s.expires_at
     FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?`
  ).bind(token).first();
  if (!result) return json({ valid: false, message: "Token kh\xF4ng h\u1EE3p l\u1EC7" }, 401);
  if (new Date(result.expires_at) < new Date()) return json({ valid: false, message: "Token \u0111\xE3 h\u1EBFt h\u1EA1n" }, 401);
  return json({
    valid: true,
    user: { id: result.id, username: result.username, full_name: result.full_name, role: result.role }
  });
}
async function handleLogout(env, token) {
  await env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
  return json({ success: true });
}
// Lightweight change-detection key for polling optimization.
// Returns a single "key" string derived from the latest IDs and state hashes
// of the relevant tables. Client compares the key string between polls — if
// unchanged, no full data fetch is needed.
async function handleChanges(env, ctx, unit) {
  if (ctx === "kitchen") {
    // Kitchen: order_items filtered by production_unit + order_item_change_logs (cancellations)
    const [itemResult, eventResult] = await Promise.all([
      env.DB.prepare(
        `SELECT oi.id, oi.status FROM order_items oi
         JOIN products p ON p.id = oi.product_id
         JOIN orders o ON o.id = oi.order_id
         WHERE o.status = 'pending' AND p.production_unit = ?
         ORDER BY oi.id`
      ).bind(unit).all(),
      env.DB.prepare(
        `SELECT MAX(id) as max_id FROM order_item_change_logs
         WHERE production_unit = ? AND created_at >= datetime('now', '-12 hours')`
      ).bind(unit).first(),
    ]);
    const itemsSig = (itemResult.results || []).map((r) => `${r.id}:${r.status}`).join(",");
    const maxItemId = (itemResult.results || []).reduce((m, r) => Math.max(m, r.id), 0);
    const maxEventId = eventResult?.max_id ?? 0;
    const key = `k:${unit}:${maxItemId}:${maxEventId}:${itemsSig}`;
    return json({ key });
  }
  // Default / tables context: tables, orders, order_items, staff_calls
  const todayStart = new Date().toISOString().slice(0, 10);
  const [tablesResult, ordersResult, itemsResult, callsResult] = await Promise.all([
    env.DB.prepare(
      `SELECT id, status FROM tables ORDER BY id`
    ).all(),
    env.DB.prepare(
      `SELECT MAX(id) as max_id FROM orders WHERE created_at >= ?`
    ).bind(todayStart).first(),
    env.DB.prepare(
      `SELECT MAX(id) as max_id FROM order_items
       WHERE order_id IN (SELECT id FROM orders WHERE status = 'pending')`
    ).first(),
    env.DB.prepare(
      `SELECT MAX(id) as max_id FROM staff_calls WHERE created_at >= ?`
    ).bind(todayStart).first(),
  ]);
  const tableSig = (tablesResult.results || []).map((r) => `${r.id}:${r.status}`).join(",");
  const maxOrderId = ordersResult?.max_id ?? 0;
  const maxItemId = itemsResult?.max_id ?? 0;
  const maxCallId = callsResult?.max_id ?? 0;
  const key = `t:${maxOrderId}:${maxCallId}:${maxItemId}:${tableSig}`;
  return json({ key });
}
async function handleMenu(env) {
  const [categoriesResult, productsResult] = await Promise.all([
    env.DB.prepare("SELECT id, name, sort_order, production_unit, allow_all_toppings FROM categories ORDER BY sort_order, name").all(),
    env.DB.prepare(
      `SELECT id, category_id, name, price, image_url, available, is_topping, production_unit FROM products
       WHERE available = 1 ORDER BY name`
    ).all()
  ]);
  // D1 limits SQL variables per query. Batch IN-clause queries (batch size 80).
  const BATCH = 80;
  const productIds = productsResult.results.map((p) => p.id);
  let sizesByProduct = new Map();
  for (let i = 0; i < productIds.length; i += BATCH) {
    const chunk = productIds.slice(i, i + BATCH);
    const placeholders = chunk.map(() => "?").join(",");
    const sizesResult = await env.DB.prepare(
      `SELECT id, product_id, name, price FROM product_sizes WHERE product_id IN (${placeholders}) ORDER BY sort_order, id`
    ).bind(...chunk).all();
    for (const s of sizesResult.results) {
      if (!sizesByProduct.has(s.product_id)) sizesByProduct.set(s.product_id, []);
      sizesByProduct.get(s.product_id).push({ id: s.id, name: s.name, price: s.price });
    }
  }
  const catIds = categoriesResult.results.map((c) => c.id);
  let toppingsByCategory = new Map();
  for (let i = 0; i < catIds.length; i += BATCH) {
    const chunk = catIds.slice(i, i + BATCH);
    const placeholders = chunk.map(() => "?").join(",");
    const ctResult = await env.DB.prepare(
      `SELECT category_id, product_id FROM category_toppings WHERE category_id IN (${placeholders})`
    ).bind(...chunk).all();
    for (const r of ctResult.results) {
      if (!toppingsByCategory.has(r.category_id)) toppingsByCategory.set(r.category_id, []);
      toppingsByCategory.get(r.category_id).push(r.product_id);
    }
  }
  const categories = categoriesResult.results.map((c) => ({
    ...c,
    allowed_toppings: toppingsByCategory.get(c.id) || []
  }));
  const products = productsResult.results.map((p) => ({
    ...p,
    sizes: sizesByProduct.get(p.id) || []
  }));
  return json({ store_name: env.STORE_NAME, categories, products });
}
async function handleTables(env) {
  const result = await env.DB.prepare(
    `SELECT id, name, status, current_order_id FROM tables ORDER BY id`
  ).all();
  const ordersResult = await env.DB.prepare(
    `SELECT id, table_id, table_position, total, created_at FROM orders
     WHERE status = 'pending' AND table_id IS NOT NULL ORDER BY created_at ASC`
  ).all();
  const POSITIONS = ["A", "B", "C", "D"];
  const ordersByTablePos = new Map();
  for (const o of ordersResult.results) {
    const pos = (o.table_position || "A").toUpperCase();
    const key = `${o.table_id}:${pos}`;
    if (!ordersByTablePos.has(key)) ordersByTablePos.set(key, []);
    ordersByTablePos.get(key).push(o);
  }
  const itemRows = await env.DB.prepare(
    `SELECT oi.id, oi.order_id, oi.product_id, oi.product_name, oi.price, oi.quantity,
            oi.size_name, oi.note, oi.status, p.image_url
     FROM order_items oi
     LEFT JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id IN (SELECT id FROM orders WHERE status = 'pending' AND table_id IS NOT NULL)
     ORDER BY oi.id ASC`
  ).all();
  const toppingsRows = await env.DB.prepare(
    `SELECT t.order_item_id, t.product_id, t.price, p.name
     FROM order_item_toppings t LEFT JOIN products p ON p.id = t.product_id
     WHERE t.order_item_id IN (SELECT id FROM order_items
       WHERE order_id IN (SELECT id FROM orders WHERE status = 'pending' AND table_id IS NOT NULL))`
  ).all();
  const toppingsByItem = new Map();
  for (const t of toppingsRows.results) {
    if (!toppingsByItem.has(t.order_item_id)) toppingsByItem.set(t.order_item_id, []);
    toppingsByItem.get(t.order_item_id).push({ id: t.product_id, name: t.name || "", price: t.price });
  }
  const itemsByOrder = new Map();
  for (const it of itemRows.results) {
    if (!itemsByOrder.has(it.order_id)) itemsByOrder.set(it.order_id, []);
    itemsByOrder.get(it.order_id).push({
      id: it.id,
      order_id: it.order_id,
      product_id: it.product_id,
      name: it.product_name,
      quantity: it.quantity,
      price: it.price,
      image_url: it.image_url,
      size_name: it.size_name,
      size: it.size_name ? { name: it.size_name } : null,
      note: it.note,
      toppings: toppingsByItem.get(it.id) || [],
      status: it.status
    });
  }
  const serverTime = (new Date()).toISOString();
  const tables = result.results.map((t) => {
    const positions = POSITIONS.map((pos) => {
      const orders = ordersByTablePos.get(`${t.id}:${pos}`) || [];
      const current_order_items = [];
      let revenue = 0;
      let occupiedAt = null;
      for (const o of orders) {
        if (!occupiedAt || o.created_at < occupiedAt) occupiedAt = o.created_at;
        const items = itemsByOrder.get(o.id) || [];
        for (const it of items) {
          const lineTotal = (Number(it.price) + it.toppings.reduce((s, tp) => s + tp.price, 0)) * Number(it.quantity);
          revenue += lineTotal;
          current_order_items.push(it);
        }
      }
      return {
        position: pos,
        status: orders.length > 0 ? "occupied" : "available",
        occupied_at: occupiedAt,
        revenue,
        current_order_items
      };
    });
    const anyOccupied = positions.some((p) => p.status === "occupied");
    const totalRevenue = positions.reduce((s, p) => s + p.revenue, 0);
    const primaryOrder = ordersByTablePos.get(`${t.id}:A`)?.[0] || ordersResult.results.find((o) => o.table_id === t.id);
    // Bàn chỉ occupied khi có order pending thực sự (không dùng fallback từ DB)
    const derivedStatus = anyOccupied ? "occupied" : "empty";
    return {
      ...t,
      positions,
      revenue: totalRevenue,
      status: derivedStatus,
      pending_order: primaryOrder ? { id: primaryOrder.id, total: primaryOrder.total, created_at: primaryOrder.created_at } : null
    };
  });
  // Auto-reset DB status cho các bàn bị stale (DB ghi occupied nhưng không có order pending)
  const staleTableIds = tables.filter((t) => t.status === "empty" && result.results.find((r) => r.id === t.id)?.status === "occupied").map((t) => t.id);
  if (staleTableIds.length > 0) {
    const ph = staleTableIds.map(() => "?").join(",");
    await env.DB.prepare(`UPDATE tables SET status = 'empty', current_order_id = NULL WHERE id IN (${ph})`).bind(...staleTableIds).run();
  }
  return json({ tables, server_time: serverTime });
}
async function handleGetOrders(env) {
  const orders = await env.DB.prepare(
    `SELECT o.id, o.table_id, o.order_type, o.total, o.status,
            o.payment_method, o.customer_name, o.created_at, t.name as table_name
     FROM orders o LEFT JOIN tables t ON t.id = o.table_id
     ORDER BY o.created_at DESC LIMIT 50`
  ).all();
  return json({ orders: orders.results });
}
// ============ In-memory menu cache (per isolate) ============
// Dùng khi tạo đơn: tránh đọc products/sizes/categories/category_toppings mỗi lần báo chế biến.
// - TTL ngắn (15s): menu đổi trên DB sẽ tự cập nhật tối đa sau 15s trên mọi isolate
// - invalidateMenuCaches(): xóa ngay lập tức khi admin sửa menu (cùng isolate)
let menuDataCache = null; // { productsById, sizesById, toppingsById, allowAllByCategory, allowedToppingsByCategory, expiresAt }
const MENU_CACHE_TTL_MS = 15000;

async function getMenuData(env) {
  if (menuDataCache && Date.now() < menuDataCache.expiresAt) return menuDataCache;
  const [productsRes, sizesRes, catsRes, catToppingsRes] = await env.DB.batch([
    env.DB.prepare(`SELECT id, price, name, available, category_id, is_topping FROM products`),
    env.DB.prepare(`SELECT id, name, price, product_id FROM product_sizes`),
    env.DB.prepare(`SELECT id, allow_all_toppings FROM categories`),
    env.DB.prepare(`SELECT category_id, product_id FROM category_toppings`),
  ]);
  const productsById = new Map();
  const toppingsById = new Map();
  for (const p of productsRes.results || []) {
    productsById.set(p.id, p);
    if (p.is_topping === 1 && p.available === 1) {
      toppingsById.set(p.id, { price: p.price, is_topping: p.is_topping, available: p.available });
    }
  }
  const sizesById = new Map();
  for (const s of sizesRes.results || []) {
    sizesById.set(s.id, { name: s.name, price: s.price, product_id: s.product_id });
  }
  const allowAllByCategory = new Map();
  for (const c of catsRes.results || []) {
    allowAllByCategory.set(c.id, c.allow_all_toppings);
  }
  const allowedToppingsByCategory = new Map();
  for (const r of catToppingsRes.results || []) {
    if (!allowedToppingsByCategory.has(r.category_id)) allowedToppingsByCategory.set(r.category_id, new Set());
    allowedToppingsByCategory.get(r.category_id).add(r.product_id);
  }
  menuDataCache = {
    productsById, sizesById, toppingsById, allowAllByCategory, allowedToppingsByCategory,
    expiresAt: Date.now() + MENU_CACHE_TTL_MS,
  };
  return menuDataCache;
}

async function handleCreateOrder(env, body) {
  if (!body.items || body.items.length === 0) return json({ error: "Cart r\u1ED7ng" }, 400);
  const tablePosition = (body.table_position || "A").toUpperCase();
  let orderId = null;
  let reused = false;
  const isTakeawayOrShip = !body.table_id && body.order_type && (body.order_type === "takeaway" || body.order_type === "ship");

  // T\u1ED1i \u01B0u: gom c\u00E1c query \u0111\u1ECDc (existing order, display code count, products, categories,
  // category_toppings, sizes, toppings) ch\u1EA1y song song thay v\u00EC tu\u1EA7n t\u1EF1
  // Tối ưu: menu data (products/sizes/categories/category_toppings) lấy từ cache in-memory
  // TTL 15s + invalidate khi admin sửa menu → không cần đọc lại mỗi lần báo chế biến
  const todayStart = (new Date()).toISOString().slice(0, 10);

  const prep = [];
  const prepKeys = [];
  if (body.table_id) {
    prepKeys.push("existing");
    prep.push(env.DB.prepare(
      `SELECT id FROM orders
       WHERE table_id = ? AND status = 'pending' AND (table_position = ? OR table_position IS NULL)
       ORDER BY created_at DESC LIMIT 1`
    ).bind(body.table_id, tablePosition));
  }
  if (isTakeawayOrShip) {
    prepKeys.push("codeCount");
    prep.push(env.DB.prepare(
      `SELECT COUNT(*) AS cnt FROM orders
       WHERE table_id IS NULL AND order_type = ? AND created_at >= ?`
    ).bind(body.order_type, todayStart));
  }
  const [menuData, prepResults] = await Promise.all([
    getMenuData(env),
    prep.length > 0 ? env.DB.batch(prep) : Promise.resolve([]),
  ]);
  const prepByKey = {};
  prepKeys.forEach((k, i) => { prepByKey[k] = prepResults[i]; });
  const productsById = menuData.productsById;
  const sizesById = menuData.sizesById;
  const toppingsById = menuData.toppingsById;
  const allowAllByCategory = menuData.allowAllByCategory;
  const allowedToppingsByCategory = menuData.allowedToppingsByCategory;

  if (body.table_id) {
    const existing = prepByKey.existing?.results?.[0];
    if (existing) {
      orderId = existing.id;
      reused = true;
      await env.DB.prepare(`UPDATE orders SET table_position = ? WHERE id = ? AND table_position IS NULL`).bind(tablePosition, orderId).run();
    }
  }
  if (orderId === null) {
    let displayCode = null;
    if (isTakeawayOrShip) {
      const countRow = prepByKey.codeCount?.results?.[0];
      const prefix = body.order_type === "takeaway" ? "mv" : "ship";
      displayCode = `${prefix}${(countRow?.cnt ?? 0) + 1}`;
    }
    const orderResult = await env.DB.prepare(
      `INSERT INTO orders (table_id, table_position, order_type, total, status, payment_method, customer_name, display_code)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`
    ).bind(
      body.table_id ?? null,
      body.table_id ? tablePosition : "A",
      body.order_type ?? "dine_in",
      0,
      // total will be recalculated
      "pending",
      body.payment_method ?? null,
      body.customer_name ?? null,
      displayCode
    ).first();
    if (!orderResult) return json({ error: "Kh\xF4ng t\u1EA1o \u0111\u01B0\u1EE3c \u0111\u01A1n" }, 500);
    orderId = orderResult.id;
  }
  const skippedItems = [];
  const invalidToppings = [];
  let insertedCount = 0;
  const insertedItems = [];
  // Tối ưu: gom toàn bộ INSERT item vào 1 D1 batch (thay vì N round-trip tuần tự)
  const validItems = [];
  for (let idx = 0; idx < body.items.length; idx++) {
    const it = body.items[idx];
    const product = productsById.get(it.product_id);
    if (!product) {
      skippedItems.push({ product_id: it.product_id, reason: "not_found" });
      continue;
    }
    if (!product.available) {
      skippedItems.push({ product_id: it.product_id, reason: "unavailable" });
      continue;
    }
    let itemPrice = product.price;
    let sizeName = null;
    if (it.size_id) {
      const size = sizesById.get(it.size_id);
      if (size && size.product_id === product.id) {
        itemPrice = size.price;
        sizeName = size.name;
      }
    }
    validItems.push({ idx, it, product, itemPrice, sizeName });
  }
  // Batch 1: INSERT tất cả items (RETURNING id)
  const itemStmts = validItems.map((v) =>
    env.DB.prepare(
      `INSERT INTO order_items (order_id, product_id, product_name, price, quantity, status, size_name, note)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, ?) RETURNING id`
    ).bind(orderId, v.product.id, v.product.name, v.itemPrice, v.it.quantity ?? 1, v.sizeName, (v.it.note ?? "") || null)
  );
  const itemResults = itemStmts.length > 0 ? await env.DB.batch(itemStmts) : [];
  // Batch 2: INSERT tất cả toppings
  const toppingStmts = [];
  const toppingFallbacks = []; // { stmtIdx: index trong toppingStmts, tid, ... } — fallback nếu thiếu cột quantity
  validItems.forEach((v, vi) => {
    const insertRes = itemResults[vi];
    const newItemId = insertRes?.results?.[0]?.id;
    if (!newItemId) return;
    insertedCount++;
    insertedItems.push({ cart_index: v.idx, order_item_id: newItemId });
    const toppingEntries = v.it.toppings ?? [];
    const allowAll = allowAllByCategory.get(v.product.category_id) ?? 0;
    const allowedSet = allowedToppingsByCategory.get(v.product.category_id);
    for (const tEntry of toppingEntries) {
      const tid = typeof tEntry === "number" ? tEntry : tEntry.id;
      const tqty = typeof tEntry === "number" ? 1 : tEntry.quantity || 1;
      const tp = toppingsById.get(tid);
      if (!tp) {
        invalidToppings.push({ product_id: v.product.id, topping_id: tid, reason: "invalid_or_unavailable" });
        continue;
      }
      if (!allowAll && allowedSet && !allowedSet.has(tid)) {
        invalidToppings.push({ product_id: v.product.id, topping_id: tid, reason: "not_allowed_for_category" });
        continue;
      }
      toppingFallbacks.push({ stmtIdx: toppingStmts.length, itemId: newItemId, tid, price: tp.price });
      toppingStmts.push(
        env.DB.prepare(
          `INSERT INTO order_item_toppings (order_item_id, product_id, price, quantity) VALUES (?, ?, ?, ?)`
        ).bind(newItemId, tid, tp.price, tqty)
      );
    }
  });
  // Tối ưu: gom topping inserts + recalc total + update table vào 1 batch (1 RTT)
  const finalBatch = [];
  if (toppingStmts.length > 0) {
    finalBatch.push(...toppingStmts);
  }
  finalBatch.push(env.DB.prepare(
    `UPDATE orders SET total = (
      SELECT COALESCE(SUM(oi.price * oi.quantity), 0) +
             COALESCE((SELECT SUM(oit.price * COALESCE(oit.quantity, 1) * oi.quantity)
                       FROM order_item_toppings oit
                       JOIN order_items oi ON oi.id = oit.order_item_id
                       WHERE oi.order_id = ?), 0)
      FROM order_items oi WHERE oi.order_id = ?
    ) WHERE id = ? RETURNING total`
  ).bind(orderId, orderId, orderId));
  if (body.table_id) {
    finalBatch.push(env.DB.prepare(
      `UPDATE tables SET status = 'occupied', current_order_id = ? WHERE id = ?`
    ).bind(orderId, body.table_id));
  }
  let toppingBatchFailed = false;
  let finalTotal = null;
  const recalcIdx = toppingStmts.length; // vị trí statement recalc trong finalBatch
  try {
    const batchResults = await env.DB.batch(finalBatch);
    finalTotal = batchResults?.[recalcIdx]?.results?.[0]?.total ?? null;
  } catch (e) {
    // Nếu batch lỗi (vd schema cũ thiếu cột quantity trong topping insert) → fallback tuần tự
    toppingBatchFailed = true;
  }
  if (toppingBatchFailed) {
    // Fallback: topping không quantity + recalc + table
    for (const fb of toppingFallbacks) {
      try {
        await env.DB.prepare(
          `INSERT INTO order_item_toppings (order_item_id, product_id, price) VALUES (?, ?, ?)`
        ).bind(fb.itemId, fb.tid, fb.price).run();
      } catch {}
    }
    await recalcOrderTotal(env, orderId);
    if (body.table_id) {
      await env.DB.prepare(
        `UPDATE tables SET status = 'occupied', current_order_id = ? WHERE id = ?`
      ).bind(orderId, body.table_id).run();
    }
  }
  if (finalTotal === null) {
    finalTotal = (await env.DB.prepare("SELECT total FROM orders WHERE id = ?").bind(orderId).first())?.total ?? 0;
  }
  return json({
    success: true,
    order_id: orderId,
    reused,
    total: finalTotal,
    items_count: insertedCount,
    inserted_items: insertedItems,
    ...skippedItems.length > 0 ? { skipped_items: skippedItems } : {},
    ...invalidToppings.length > 0 ? { invalid_toppings: invalidToppings } : {}
  });
}
async function handlePayTable(env, tableId, paymentMethod, tablePosition) {
  let order;
  if (tablePosition) {
    const pos = tablePosition.toUpperCase();
    order = await env.DB.prepare(
      `SELECT id FROM orders WHERE table_id = ? AND table_position = ? AND status = 'pending'
       ORDER BY created_at DESC LIMIT 1`
    ).bind(tableId, pos).first();
  } else {
    order = await env.DB.prepare(
      `SELECT id FROM orders WHERE table_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1`
    ).bind(tableId).first();
  }
  if (!order) return json({ error: "Kh\xF4ng c\xF3 order pending cho b\xE0n n\xE0y" }, 404);
  await env.DB.prepare(`UPDATE orders SET status = 'completed', payment_method = ? WHERE id = ?`).bind(paymentMethod, order.id).run();
  // Đóng luôn các item chưa xong — đơn đã thanh toán không còn hiện ở bếp/quầy
  await env.DB.prepare(`UPDATE order_items SET status = 'completed' WHERE order_id = ? AND status != 'completed'`).bind(order.id).run();
  const remaining = await env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM orders WHERE table_id = ? AND status = 'pending'`
  ).bind(tableId).first();
  if ((remaining?.cnt ?? 0) === 0) {
    await env.DB.prepare(`UPDATE tables SET status = 'empty', current_order_id = NULL WHERE id = ?`).bind(tableId).run();
  }
  return json({ success: true, order_id: order.id });
}
async function buildOrderDisplayName(env, orderId) {
  const order = await env.DB.prepare(
    `SELECT o.order_type, o.customer_name, t.name as table_name
     FROM orders o LEFT JOIN tables t ON t.id = o.table_id WHERE o.id = ?`
  ).bind(orderId).first();
  if (!order) return "Unknown";
  if (order.table_name) return order.table_name;
  if (order.order_type === "takeaway") {
    const name = (order.customer_name || "").trim();
    return name ? `MV - ${name}` : "MV";
  }
  if (order.order_type === "ship") {
    const name = (order.customer_name || "").trim();
    return name ? `SHIP - ${name}` : "SHIP";
  }
  return "Mang v\u1EC1";
}
async function logItemChange(env, orderId, itemId, productName, tableName, action, oldQty, newQty, productionUnit) {
  await env.DB.prepare(
    `INSERT INTO order_item_change_logs (order_id, order_item_id, product_name, table_name, action, old_quantity, new_quantity, production_unit)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(orderId, itemId, productName, tableName, action, oldQty, newQty, productionUnit).run();
}
async function handleDeleteCashierItem(env, orderId, itemId) {
  const item = await env.DB.prepare(
    `SELECT oi.id, oi.product_name, oi.quantity, oi.status, p.production_unit
     FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id
     WHERE oi.id = ? AND oi.order_id = ?`
  ).bind(itemId, orderId).first();
  if (!item) return json({ message: "Kh\xF4ng t\xECm th\u1EA5y m\xF3n" }, 404);
  const prodUnit = item.production_unit || "kitchen";
  const tableName = await buildOrderDisplayName(env, orderId);
  await logItemChange(env, orderId, itemId, item.product_name, tableName, "deleted", item.quantity, 0, prodUnit);
  await env.DB.prepare(`DELETE FROM order_items WHERE id = ?`).bind(itemId).run();
  const remaining = await env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM order_items WHERE order_id = ?`
  ).bind(orderId).first();
  if ((remaining?.cnt ?? 0) === 0) {
    const order = await env.DB.prepare(`SELECT table_id FROM orders WHERE id = ?`).bind(orderId).first();
    await env.DB.prepare(`DELETE FROM orders WHERE id = ?`).bind(orderId).run();
    if (order?.table_id) {
      await env.DB.prepare(`UPDATE tables SET status = 'empty', current_order_id = NULL WHERE id = ?`).bind(order.table_id).run();
    }
  } else {
    await recalcOrderTotal(env, orderId);
  }
  return json({ success: true });
}
async function handleUpdateCashierItemQuantity(env, orderId, itemId, body) {
  const item = await env.DB.prepare(
    `SELECT oi.id, oi.product_name, oi.quantity, oi.status, p.production_unit
     FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id
     WHERE oi.id = ? AND oi.order_id = ?`
  ).bind(itemId, orderId).first();
  if (!item) return json({ message: "Kh\xF4ng t\xECm th\u1EA5y m\xF3n" }, 404);
  const qty = body.quantity ?? 0;
  if (qty <= 0) {
    return await handleDeleteCashierItem(env, orderId, itemId);
  }
  const prodUnit = item.production_unit || "kitchen";
  const oldQty = item.quantity;
  if (qty < oldQty) {
    const tableName = await buildOrderDisplayName(env, orderId);
    await logItemChange(env, orderId, itemId, item.product_name, tableName, "quantity_reduced", oldQty, qty, prodUnit);
  }
  await env.DB.prepare(`UPDATE order_items SET quantity = ? WHERE id = ?`).bind(qty, itemId).run();
  await recalcOrderTotal(env, orderId);
  return json({ success: true });
}
async function handleTransferTable(env, body) {
  if (!body.old_table_id || !body.new_table_id) {
    return json({ error: "Thi\u1EBFu th\xF4ng tin b\xE0n" }, 400);
  }
  if (body.old_table_id === body.new_table_id) {
    return json({ error: "B\xE0n ngu\u1ED3n v\xE0 b\xE0n \u0111\xEDch gi\u1ED1ng nhau" }, 400);
  }
  const targetTable = await env.DB.prepare(
    `SELECT id FROM tables WHERE id = ?`
  ).bind(body.new_table_id).first();
  if (!targetTable) return json({ error: "B\xE0n \u0111\xEDch kh\xF4ng t\u1ED3n t\u1EA1i" }, 404);
  // Ki\u1EC3m tra tr\u1EF1c ti\u1EBFp c\u00F3 order pending tr\u00EAn b\u00E0n \u0111\u00EDch (kh\u00F4ng d\u00F9ng DB status \u0111\u1EC3 tr\u00E1nh stale)
  const targetOccupied = await env.DB.prepare(
    `SELECT id FROM orders WHERE table_id = ? AND status = 'pending' LIMIT 1`
  ).bind(body.new_table_id).first();
  if (targetOccupied) {
    return json({ error: "B\xE0n \u0111\xEDch \u0111ang c\xF3 kh\xE1ch" }, 409);
  }
  const order = await env.DB.prepare(
    `SELECT id FROM orders WHERE table_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1`
  ).bind(body.old_table_id).first();
  if (!order) return json({ error: "Kh\xF4ng c\xF3 order pending \u0111\u1EC3 chuy\u1EC3n" }, 404);
  await env.DB.prepare(`UPDATE orders SET table_id = ? WHERE id = ?`).bind(body.new_table_id, order.id).run();
  await env.DB.prepare(`UPDATE tables SET status = 'empty', current_order_id = NULL WHERE id = ?`).bind(body.old_table_id).run();
  await env.DB.prepare(`UPDATE tables SET status = 'occupied', current_order_id = ? WHERE id = ?`).bind(order.id, body.new_table_id).run();
  return json({ success: true, order_id: order.id });
}
async function handleKitchenOrders(env, unit) {
  const ordersResult = await env.DB.prepare(
    `SELECT DISTINCT o.id, o.order_type, o.customer_name, o.created_at, t.name as table_name
     FROM orders o
     JOIN order_items oi ON oi.order_id = o.id
     LEFT JOIN products p ON p.id = oi.product_id
     LEFT JOIN tables t ON t.id = o.table_id
     WHERE oi.status != 'completed' AND o.status = 'pending'
       AND (p.production_unit = ? OR (oi.product_id IS NULL AND ? = 'kitchen'))
     ORDER BY o.created_at ASC`
  ).bind(unit, unit).all();
  const orderList = ordersResult.results || [];
  if (orderList.length === 0) return json([]);

  // Tối ưu N+1: fetch tất cả items + toppings của các order trong 2 query song song
  const orderIds = orderList.map((o) => o.id);
  const orderPh = orderIds.map(() => "?").join(",");
  const [allItemsResult, allToppingsResult] = await Promise.all([
    env.DB.prepare(
      `SELECT oi.id, oi.order_id, oi.product_id, oi.product_name, oi.quantity, oi.note, oi.status, oi.size_name,
              oi.reported_at, p.production_unit
       FROM order_items oi
       LEFT JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id IN (${orderPh}) AND oi.status != 'completed'
         AND (p.production_unit = ? OR (oi.product_id IS NULL AND ? = 'kitchen'))`
    ).bind(...orderIds, unit, unit).all(),
    env.DB.prepare(
      `SELECT oit.order_item_id, p.name FROM order_item_toppings oit
       JOIN products p ON p.id = oit.product_id
       JOIN order_items oi ON oi.id = oit.order_item_id
       WHERE oi.order_id IN (${orderPh})`
    ).bind(...orderIds).all(),
  ]);
  const itemsByOrder = new Map();
  for (const it of allItemsResult.results || []) {
    if (!itemsByOrder.has(it.order_id)) itemsByOrder.set(it.order_id, []);
    itemsByOrder.get(it.order_id).push(it);
  }
  const toppingsByItem = new Map();
  for (const t of allToppingsResult.results || []) {
    if (!toppingsByItem.has(t.order_item_id)) toppingsByItem.set(t.order_item_id, []);
    toppingsByItem.get(t.order_item_id).push(t.name);
  }

  const results = [];
  for (const order of orderList) {
    const orderItems = itemsByOrder.get(order.id) || [];
    if (orderItems.length === 0) continue;
    let displayName;
    if (order.table_name) {
      displayName = order.table_name;
    } else if (order.order_type === "takeaway") {
      const code = "MV";
      const name = (order.customer_name || "").trim();
      displayName = name ? `${code} - ${name}` : code;
    } else if (order.order_type === "ship") {
      const code = "SHIP";
      const name = (order.customer_name || "").trim();
      displayName = name ? `${code} - ${name}` : code;
    } else {
      displayName = "Mang v\u1EC1";
    }
    const items = orderItems.map((it) => ({
      id: it.id,
      product_id: it.product_id,
      product_name: it.product_name,
      quantity: it.quantity,
      notes: it.note,
      status: it.status,
      size_name: it.size_name,
      toppings: toppingsByItem.get(it.id) || [],
      is_voice_order: false,
      // Voice orders not supported in Worker yet
      voice_url: null,
      // Mốc đếm thời gian trên màn hình bếp/quầy: thời điểm báo chế biến
      reported_at: it.reported_at || order.created_at
    }));
    results.push({
      id: order.id,
      table_name: displayName,
      order_type: order.order_type,
      display_code: null,
      is_self_order: false,
      status: "pending",
      created_at: order.created_at,
      items
    });
  }
  return json(results);
}
async function handleKitchenCancellationEvents(env, unit, hours) {
  hours = Math.max(1, Math.min(hours, 72));
  // created_at trong D1 lưu dạng "YYYY-MM-DD HH:MM:SS" (UTC, datetime('now')).
  // Phải cắt cùng format để so sánh chuỗi đúng: ISO "2026-01-01T07:30:00.000Z"
  // luôn LỚN hơn "2026-01-01 ..." vì 'T' > ' ' khiến mọi event cùng ngày bị loại.
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1e3).toISOString().slice(0, 19).replace("T", " ");
  const result = await env.DB.prepare(
    `SELECT id, order_id, order_item_id, product_name, table_name, action,
            old_quantity, new_quantity, production_unit, created_at
     FROM order_item_change_logs
     WHERE production_unit = ? AND created_at >= ?
     ORDER BY created_at DESC LIMIT 200`
  ).bind(unit, cutoff).all();
  return json(result.results.map((c) => ({
    event_id: c.id,
    order_id: c.order_id,
    item_id: c.order_item_id,
    action: c.action,
    old_quantity: c.old_quantity,
    new_quantity: c.new_quantity,
    product_name: c.product_name,
    table_name: c.table_name,
    is_self_order: false,
    created_at: c.created_at
  })));
}
async function handleUpdateItemStatus(env, itemId, newStatus) {
  if (!["pending", "processing", "completed"].includes(newStatus)) {
    return json({ message: "Status invalid" }, 400);
  }
  const item = await env.DB.prepare(
    `SELECT id, status FROM order_items WHERE id = ?`
  ).bind(itemId).first();
  if (!item) return json({ message: "Item not found" }, 404);
  await env.DB.prepare(`UPDATE order_items SET status = ? WHERE id = ?`).bind(newStatus, itemId).run();
  return json({ message: "Status updated", itemId, status: newStatus });
}

async function handleKitchenBatchSync(env, changes) {
  // Phase 5b offline sync: batch update nhiều item status
  // Non-completed (pending/processing): kitchen staff là authority — luôn áp dụng
  // Completed: last-write-wins
  if (!Array.isArray(changes)) return json({ message: "changes must be an array" }, 400);
  const results = [];
  for (const change of changes) {
    const { itemId, status } = change;
    if (!itemId || !status) { results.push({ itemId, success: false, error: "missing fields" }); continue; }
    if (!["pending", "processing", "completed"].includes(status)) {
      results.push({ itemId, success: false, error: "invalid status" }); continue;
    }
    try {
      const item = await env.DB.prepare("SELECT id FROM order_items WHERE id = ?").bind(itemId).first();
      if (!item) { results.push({ itemId, success: false, error: "not_found" }); continue; }
      // Kitchen rule: non-completed luôn apply (staff là authority)
      await env.DB.prepare("UPDATE order_items SET status = ? WHERE id = ?").bind(status, itemId).run();
      results.push({ itemId, success: true, applied: true });
    } catch (err) {
      results.push({ itemId, success: false, error: String(err) });
    }
  }
  return json({ results });
}
async function handlePublicMenu(env, tableId) {
  const tableRow = await env.DB.prepare("SELECT id, name FROM tables WHERE id = ?").bind(tableId).first();
  if (!tableRow) return json({ message: "B\xE0n kh\xF4ng t\u1ED3n t\u1EA1i" }, 404);
  const categoriesResult = await env.DB.prepare(
    `SELECT id, name, sort_order, production_unit, allow_all_toppings
     FROM categories ORDER BY
     CASE production_unit WHEN 'counter' THEN 0 WHEN 'kitchen' THEN 1 ELSE 2 END,
     sort_order, id`
  ).all();
  const productsResult = await env.DB.prepare(
    `SELECT id, category_id, name, price, image_url, available, is_topping, production_unit
     FROM products WHERE available = 1`
  ).all();
  const BATCH = 80;
  const productIds = productsResult.results.map((p) => p.id);
  let sizesByProduct = new Map();
  for (let i = 0; i < productIds.length; i += BATCH) {
    const chunk = productIds.slice(i, i + BATCH);
    const placeholders = chunk.map(() => "?").join(",");
    const sizesResult = await env.DB.prepare(
      `SELECT id, product_id, name, price FROM product_sizes WHERE product_id IN (${placeholders}) ORDER BY sort_order, id`
    ).bind(...chunk).all();
    for (const s of sizesResult.results) {
      if (!sizesByProduct.has(s.product_id)) sizesByProduct.set(s.product_id, []);
      sizesByProduct.get(s.product_id).push({ id: s.id, name: s.name, price: s.price });
    }
  }
  const catIds = categoriesResult.results.map((c) => c.id);
  let toppingsByCategory = new Map();
  for (let i = 0; i < catIds.length; i += BATCH) {
    const chunk = catIds.slice(i, i + BATCH);
    const placeholders = chunk.map(() => "?").join(",");
    const ctResult = await env.DB.prepare(
      `SELECT category_id, product_id FROM category_toppings WHERE category_id IN (${placeholders})`
    ).bind(...chunk).all();
    for (const r of ctResult.results) {
      if (!toppingsByCategory.has(r.category_id)) toppingsByCategory.set(r.category_id, []);
      toppingsByCategory.get(r.category_id).push(r.product_id);
    }
  }
  const categories = categoriesResult.results.map((c) => ({
    ...c,
    allowed_toppings: toppingsByCategory.get(c.id) || []
  }));
  const products = productsResult.results.map((p) => ({
    ...p,
    sizes: sizesByProduct.get(p.id) || []
  }));
  return json({
    store: { name: env.STORE_NAME },
    table: tableRow,
    categories,
    products
  });
}
async function handlePublicTableState(env, tableId) {
  const pending = await env.DB.prepare(
    `SELECT customer_session_id FROM orders
     WHERE table_id = ? AND status IN ('pending', 'processing')
     ORDER BY created_at DESC LIMIT 1`
  ).bind(tableId).first();
  const hasPending = !!pending;
  return json({
    table_id: tableId,
    status: hasPending ? "occupied" : "available",
    has_pending_order: hasPending,
    customer_session_id: pending?.customer_session_id ?? null
  });
}
async function handlePublicItems(env, tableId) {
  const result = await env.DB.prepare(
    `SELECT oi.id, oi.order_id, oi.product_id, oi.product_name, oi.price, oi.quantity,
            oi.note, oi.status, oi.size_name, o.created_at AS order_created_at
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     WHERE o.table_id = ? AND o.status IN ('pending', 'processing') AND oi.status IN ('pending', 'processing', 'completed')
     ORDER BY oi.id DESC`
  ).bind(tableId).all();
  const itemIds = result.results.map((r) => r.id);
  let toppingsByItem = new Map();
  if (itemIds.length > 0) {
    const placeholders = itemIds.map(() => "?").join(",");
    const tResult = await env.DB.prepare(
      `SELECT oit.order_item_id, p.name FROM order_item_toppings oit
       JOIN products p ON p.id = oit.product_id
       WHERE oit.order_item_id IN (${placeholders})`
    ).bind(...itemIds).all();
    for (const t of tResult.results) {
      if (!toppingsByItem.has(t.order_item_id)) toppingsByItem.set(t.order_item_id, []);
      toppingsByItem.get(t.order_item_id).push(t.name);
    }
  }
  return json(result.results.map((it) => ({
    id: it.id,
    order_id: it.order_id,
    product_id: it.product_id,
    name: it.product_name,
    quantity: it.quantity,
    price: it.price,
    status: it.status,
    size_name: it.size_name,
    notes: it.note,
    toppings: toppingsByItem.get(it.id) || [],
    created_at: it.order_created_at ? it.order_created_at + "Z" : null
  })));
}
async function handleCreatePublicOrder(env, body) {
  if (!body.table_id || !body.items?.length) {
    return json({ message: "Thi\u1EBFu th\xF4ng tin b\xE0n ho\u1EB7c m\xF3n \u0103n" }, 400);
  }
  if (body.request_token) {
    const replayed = await env.DB.prepare(
      `SELECT id, total, customer_session_id FROM orders
       WHERE request_token = ? AND table_id = ? AND status IN ('pending', 'processing')
       LIMIT 1`
    ).bind(body.request_token, body.table_id).first();
    if (replayed) {
      return json({
        message: "\u0110\u1EB7t m\xF3n th\xE0nh c\xF4ng",
        order_id: replayed.id,
        total_amount: replayed.total,
        customer_session_id: replayed.customer_session_id,
        replayed: true
      }, 200);
    }
    const reusedToken = await env.DB.prepare(
      `SELECT id FROM orders WHERE request_token = ? LIMIT 1`
    ).bind(body.request_token).first();
    if (reusedToken) {
      return json({ error: "request_token_reused", message: "Token \u0111\xE3 \u0111\u01B0\u1EE3c s\u1EED d\u1EE5ng, vui l\xF2ng th\u1EED l\u1EA1i." }, 409);
    }
  }
  const pending = await env.DB.prepare(
    `SELECT id, customer_session_id FROM orders
     WHERE table_id = ? AND status IN ('pending', 'processing')
     ORDER BY created_at DESC LIMIT 1`
  ).bind(body.table_id).first();
  let sessionId;
  if (pending) {
    if (!body.customer_session_id) {
      return json({ error: "table_occupied_need_choice", message: "B\xE0n n\xE0y \u0111\xE3 c\xF3 \u0111\u01A1n ch\u01B0a thanh to\xE1n. Vui l\xF2ng ch\u1ECDn ti\u1EBFp t\u1EE5c ho\u1EB7c g\u1ECDi nh\xE2n vi\xEAn." }, 409);
    }
    if (body.customer_session_id !== pending.customer_session_id) {
      return json({ error: "invalid_session", message: "Phi\xEAn \u0111\u1EB7t m\xF3n \u0111\xE3 h\u1EBFt h\u1EA1n ho\u1EB7c kh\xF4ng h\u1EE3p l\u1EC7." }, 403);
    }
    sessionId = pending.customer_session_id;
  } else {
    sessionId = crypto.randomUUID();
  }
  let orderId;
  let isNewOrder = false;
  if (pending) {
    orderId = pending.id;
    if (body.request_token) {
      await env.DB.prepare(
        `UPDATE orders SET request_token = COALESCE(request_token, ?) WHERE id = ?`
      ).bind(body.request_token, orderId).run();
    }
  } else {
    const insertResult = await env.DB.prepare(
      `INSERT INTO orders (table_id, order_type, total, status, customer_session_id, request_token, table_position)
       VALUES (?, 'dine_in', 0, 'pending', ?, ?, ?) RETURNING id`
    ).bind(body.table_id, sessionId, body.request_token ?? null, body.table_position ?? "A").first();
    if (!insertResult) return json({ error: "Kh\xF4ng t\u1EA1o \u0111\u01B0\u1EE3c \u0111\u01A1n" }, 500);
    orderId = insertResult.id;
    isNewOrder = true;
  }
  const mergeDuplicates = !!body.retry_after_failure && !isNewOrder;
  // Menu data từ cache in-memory (15s TTL) — tránh query product/size/topping cho từng món
  const menuData = await getMenuData(env);
  let computedTotal = 0;
  for (const it of body.items) {
    const product = menuData.productsById.get(it.product_id);
    if (!product || !product.available) continue;
    let itemPrice = product.price;
    let sizeName = null;
    if (it.size_id) {
      const size = menuData.sizesById.get(it.size_id);
      if (size && size.product_id === product.id) {
        itemPrice = size.price;
        sizeName = size.name;
      }
    }
    const qty = it.quantity ?? 1;
    const notes = it.notes ?? "";
    const toppingEntries = it.toppings ?? [];
    const toppingIds = toppingEntries.map((t) => typeof t === "number" ? t : t.id);
    if (mergeDuplicates) {
      const existingItems = await env.DB.prepare(
        `SELECT id, price, size_name, note FROM order_items
         WHERE order_id = ? AND product_id = ? AND status = 'pending'`
      ).bind(orderId, product.id).all();
      let merged = false;
      for (const ex of existingItems.results) {
        if ((ex.size_name ?? null) !== sizeName) continue;
        if ((ex.note ?? "") !== notes) continue;
        const exToppings = await env.DB.prepare(
          `SELECT product_id FROM order_item_toppings WHERE order_item_id = ?`
        ).bind(ex.id).all();
        const exIds = exToppings.results.map((t) => t.product_id).sort((a, b) => a - b);
        const newIds = [...toppingIds].sort((a, b) => a - b);
        if (JSON.stringify(exIds) !== JSON.stringify(newIds)) continue;
        await env.DB.prepare(`UPDATE order_items SET quantity = quantity + ? WHERE id = ?`).bind(qty, ex.id).run();
        let toppingSum2 = 0;
        for (const tid of toppingIds) {
          const tp2 = menuData.toppingsById.get(tid);
          if (tp2) toppingSum2 += tp2.price;
        }
        computedTotal += (itemPrice + toppingSum2) * qty;
        merged = true;
        break;
      }
      if (merged) continue;
    }
    const inserted = await env.DB.prepare(
      `INSERT INTO order_items (order_id, product_id, product_name, price, quantity, status, size_name, note)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, ?) RETURNING id`
    ).bind(orderId, product.id, product.name, itemPrice, qty, sizeName, notes || null).first();
    if (!inserted) continue;
    let toppingSum = 0;
    for (const tEntry of toppingEntries) {
      const tid = typeof tEntry === "number" ? tEntry : tEntry.id;
      const tqty = typeof tEntry === "number" ? 1 : tEntry.quantity || 1;
      const tp = menuData.toppingsById.get(tid);
      if (tp) {
        try {
          await env.DB.prepare(
            `INSERT INTO order_item_toppings (order_item_id, product_id, price, quantity) VALUES (?, ?, ?, ?)`
          ).bind(inserted.id, tid, tp.price, tqty).run();
        } catch {
          await env.DB.prepare(
            `INSERT INTO order_item_toppings (order_item_id, product_id, price) VALUES (?, ?, ?)`
          ).bind(inserted.id, tid, tp.price).run();
        }
        toppingSum += tp.price * tqty;
      }
    }
    computedTotal += (itemPrice + toppingSum) * qty;
  }
  await recalcOrderTotal(env, orderId);
  const finalTotal = (await env.DB.prepare("SELECT total FROM orders WHERE id = ?").bind(orderId).first())?.total ?? 0;
  if (isNewOrder) {
    await env.DB.prepare(
      `UPDATE tables SET status = 'occupied', current_order_id = ? WHERE id = ?`
    ).bind(orderId, body.table_id).run();
  }
  await caches.default.delete(new Request("https://cache/api/tables", { method: "GET" }));
  return json({
    message: "\u0110\u1EB7t m\xF3n th\xE0nh c\xF4ng",
    order_id: orderId,
    total_amount: finalTotal,
    customer_session_id: sessionId,
    added_items_count: body.items.length
  }, 201);
}
async function recalcOrderTotal(env, orderId) {
  await env.DB.prepare(
    `UPDATE orders SET total = (
      SELECT COALESCE(SUM(oi.price * oi.quantity), 0) +
             COALESCE((SELECT SUM(oit.price * COALESCE(oit.quantity, 1) * oi.quantity)
                       FROM order_item_toppings oit
                       JOIN order_items oi ON oi.id = oit.order_item_id
                       WHERE oi.order_id = ?), 0)
      FROM order_items oi WHERE oi.order_id = ?
    ) WHERE id = ?`
  ).bind(orderId, orderId, orderId).run();
}

// ============ Zalo Bot Notifier ============
const ZALO_DEFAULT_API_BASE = "https://bot-api.zaloplatforms.com";
const ZALO_MAX_ATTEMPTS = 3;
const ZALO_RETRY_BACKOFF = [1000, 2000, 4000];

class ZaloBotNotifier {
  constructor(env) {
    this.env = env;
    this.enabled = false;
    this.bot_token = "";
    this.group_chat_id = "";
    this.api_base = ZALO_DEFAULT_API_BASE;
  }

  async _reloadConfig() {
    try {
      const row = await this.env.DB.prepare("SELECT value FROM settings WHERE key = 'zalo_bot'").first();
      if (!row) return;
      const cfg = JSON.parse(row.value);
      this.enabled = Boolean(cfg.enabled);
      this.bot_token = (cfg.bot_token || "").trim();
      this.group_chat_id = (cfg.group_chat_id || "").trim();
      this.api_base = (cfg.api_base || ZALO_DEFAULT_API_BASE).replace(/\/+$/, "");
    } catch (e) {
      console.warn("ZaloBotNotifier: reload config fail:", e);
    }
  }

  isReady() {
    return this.enabled && Boolean(this.bot_token) && Boolean(this.group_chat_id);
  }

  _formatMoney(amount) {
    return Number(amount).toLocaleString("vi-VN") + "đ";
  }

  _formatMessage(orderData) {
    const { display_code, customer_name, customer_phone, ship_address, latitude, longitude, items, total_amount, created_at } = orderData;
    const timeStr = created_at
      ? new Date(created_at).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })
      : "";

    const lines = [
      `Đơn ship mới #${display_code || "N/A"}`,
      "",
      `Khách: ${customer_name || "(không có)"}`,
      `SĐT: ${customer_phone || "(không có)"}`,
      `Địa chỉ: ${ship_address || "(không có)"}`,
    ];

    if (latitude != null && longitude != null) {
      lines.push(`GPS: https://www.google.com/maps?q=${latitude},${longitude}`);
    }

    lines.push("", "Món:");
    for (const item of items || []) {
      const sizeText = item.size_name ? ` size ${item.size_name}` : "";
      const toppingTotal = (item.toppings || []).reduce((s, t) => s + (t.price || 0), 0);
      const itemTotal = (item.price + toppingTotal) * item.quantity;
      lines.push(`- ${item.quantity} x ${item.product_name}${sizeText} - ${this._formatMoney(itemTotal)}`);

      const toppingNames = (item.toppings || []).filter(t => t.name).map(t => t.name);
      if (toppingNames.length) lines.push(`  Topping: ${toppingNames.join(", ")}`);
      if (item.note) lines.push(`  Ghi chú: ${item.note}`);
    }

    lines.push("", `Tổng: ${this._formatMoney(total_amount)}`);
    if (timeStr) lines.push(`Thời gian: ${timeStr}`);
    return lines.join("\n");
  }

  async _sendWithRetry(message) {
    const url = `${this.api_base}/bot${this.bot_token}/sendMessage`;
    const payload = { chat_id: this.group_chat_id, text: message };

    let lastError = null;
    for (let attempt = 1; attempt <= ZALO_MAX_ATTEMPTS; attempt++) {
      try {
        const resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        let data;
        try { data = await resp.json(); } catch { data = {}; }

        if (resp.ok && data.ok) {
          return { success: true, attempts: attempt, error: null, message_id: data.result?.message_id };
        }

        // 4xx: config error — no retry
        if (resp.status >= 400 && resp.status < 500) {
          return { success: false, attempts: attempt, error: `HTTP ${resp.status}: ${data.description || "Unknown"}`, message_id: null };
        }

        lastError = `HTTP ${resp.status}: ${data.description || "Unknown"}`;
      } catch (e) {
        lastError = String(e);
      }

      if (attempt < ZALO_MAX_ATTEMPTS) {
        await new Promise(r => setTimeout(r, ZALO_RETRY_BACKOFF[attempt - 1]));
      }
    }

    return { success: false, attempts: ZALO_MAX_ATTEMPTS, error: lastError, message_id: null };
  }

  async _log(orderId, success, attempts, errorMessage, messageId) {
    try {
      await this.env.DB.prepare(
        `INSERT INTO zalo_notification_logs (order_id, order_type, success, attempts, error_message, response_message_id)
         VALUES (?, 'ship', ?, ?, ?, ?)`
      ).bind(orderId, success ? 1 : 0, attempts, errorMessage || null, messageId || null).run();
    } catch (e) {
      console.warn("ZaloBotNotifier: log write fail:", e);
    }
  }

  async notifyNewShipOrder(orderData) {
    try {
      await this._reloadConfig();
      if (!this.isReady()) return;

      const message = this._formatMessage(orderData);
      const result = await this._sendWithRetry(message);

      try {
        await this._log(orderData.order_id, result.success, result.attempts, result.error, result.message_id);
      } catch {
        // already caught in _log
      }
    } catch (e) {
      console.warn("ZaloBotNotifier: notify fail:", e);
    }
  }
}

async function handleZaloBotTest(env) {
  const notifier = new ZaloBotNotifier(env);
  await notifier._reloadConfig();
  if (!notifier.isReady()) {
    return json({
      ok: false,
      message: "Zalo Bot chưa được cấu hình hoặc đã tắt. Vui lòng bật và điền Bot Token + Group Chat ID.",
    }, 400);
  }

  const testOrderData = {
    order_id: 0,
    display_code: "TEST",
    customer_name: "Khách thử",
    customer_phone: "0900000000",
    ship_address: "123 Đường thử, Quận 1, TP.HCM",
    latitude: null,
    longitude: null,
    items: [
      { product_name: "Cà phê đen", price: 25000, quantity: 2, size_name: null, note: "", toppings: [] },
      { product_name: "Trà sữa trân châu", price: 45000, quantity: 1, size_name: "L", note: "ít đá", toppings: [{ name: "Trân châu trắng", price: 5000 }] },
    ],
    total_amount: 95000,
    created_at: new Date().toISOString(),
  };

  const message = notifier._formatMessage(testOrderData);
  const result = await notifier._sendWithRetry(message);

  return json({
    ok: result.success,
    message: result.success
      ? "Gửi thử thành công! Kiểm tra nhóm Zalo."
      : `Gửi thử thất bại: ${result.error}`,
    attempts: result.attempts,
    debug_message: message,
  });
}

async function handleDeletePublicItem(env, orderId, itemId) {
  const item = await env.DB.prepare(
    `SELECT id, status FROM order_items WHERE id = ? AND order_id = ?`
  ).bind(itemId, orderId).first();
  if (!item) return json({ message: "Kh\xF4ng t\xECm th\u1EA5y m\xF3n" }, 404);
  if (item.status === "completed") return json({ message: "M\xF3n \u0111\xE3 ho\xE0n th\xE0nh, kh\xF4ng th\u1EC3 x\xF3a" }, 400);
  await env.DB.prepare(`DELETE FROM order_items WHERE id = ?`).bind(itemId).run();
  const remaining = await env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM order_items WHERE order_id = ?`
  ).bind(orderId).first();
  if ((remaining?.cnt ?? 0) === 0) {
    const order = await env.DB.prepare(`SELECT table_id FROM orders WHERE id = ?`).bind(orderId).first();
    await env.DB.prepare(`DELETE FROM orders WHERE id = ?`).bind(orderId).run();
    if (order?.table_id) {
      await env.DB.prepare(`UPDATE tables SET status = 'empty', current_order_id = NULL WHERE id = ?`).bind(order.table_id).run();
    }
  } else {
    await recalcOrderTotal(env, orderId);
  }
  return json({ success: true });
}
async function handleUpdatePublicItemQuantity(env, orderId, itemId, body) {
  const item = await env.DB.prepare(
    `SELECT id, status FROM order_items WHERE id = ? AND order_id = ?`
  ).bind(itemId, orderId).first();
  if (!item) return json({ message: "Kh\xF4ng t\xECm th\u1EA5y m\xF3n" }, 404);
  if (item.status === "completed") return json({ message: "M\xF3n \u0111\xE3 ho\xE0n th\xE0nh" }, 400);
  const qty = body.quantity ?? 0;
  if (qty <= 0) {
    return await handleDeletePublicItem(env, orderId, itemId);
  }
  await env.DB.prepare(`UPDATE order_items SET quantity = ? WHERE id = ?`).bind(qty, itemId).run();
  await recalcOrderTotal(env, orderId);
  return json({ success: true });
}
async function handlePublicCallStaff(env, body) {
  if (!body.table_id) return json({ error: "missing_table_id" }, 400);
  const table3 = await env.DB.prepare("SELECT id FROM tables WHERE id = ?").bind(body.table_id).first();
  if (!table3) return json({ error: "Table not found" }, 404);
  await env.DB.prepare(
    `INSERT INTO staff_calls (table_id, reason) VALUES (?, ?)`
  ).bind(body.table_id, body.reason ?? "new_customer").run();
  return json({ ok: true });
}
async function handleGetStaffCalls(env) {
  const todayStart = (new Date()).toISOString().slice(0, 10);
  const result = await env.DB.prepare(
    `SELECT sc.id, sc.table_id, sc.reason, sc.created_at, t.name as table_name
     FROM staff_calls sc
     LEFT JOIN tables t ON t.id = sc.table_id
     WHERE sc.created_at >= ?
     ORDER BY sc.created_at DESC`
  ).bind(todayStart).all();
  return json(result.results.map((r) => ({
    id: r.id,
    table_id: r.table_id,
    table_name: r.table_name,
    reason: r.reason,
    created_at: r.created_at ? r.created_at + "Z" : null
  })));
}
async function handleResolveStaffCall(env, callId) {
  const existing = await env.DB.prepare("SELECT id FROM staff_calls WHERE id = ?").bind(callId).first();
  if (!existing) return json({ message: "Kh\xF4ng t\xECm th\u1EA5y staff call" }, 404);
  await env.DB.prepare("DELETE FROM staff_calls WHERE id = ?").bind(callId).run();
  return json({ success: true });
}
async function handleCashierTakeawayList(env, statusParam) {
  const todayStart = (new Date()).toISOString().slice(0, 10);
  const statusFilter = statusParam === "completed" ? "completed" : "pending";
  const ordersResult = await env.DB.prepare(
    `SELECT id, order_type, display_code, customer_name, customer_phone, ship_address, latitude, longitude, ship_notes, total, status, payment_method, created_at
     FROM orders
     WHERE table_id IS NULL AND status = ? AND created_at >= ?
     ORDER BY created_at ASC`
  ).bind(statusFilter, todayStart).all();
  const orderIds = ordersResult.results.map((o) => o.id);
  let itemsByOrder = new Map();
  if (orderIds.length > 0) {
    const ph = orderIds.map(() => "?").join(",");
    const itemsResult = await env.DB.prepare(
      `SELECT oi.id, oi.order_id, oi.product_name, oi.quantity, oi.price, oi.status, oi.size_name, oi.note
       FROM order_items oi WHERE oi.order_id IN (${ph}) ORDER BY oi.id ASC`
    ).bind(...orderIds).all();
    const itemIds = itemsResult.results.map((i) => i.id);
    let toppingsByItem = new Map();
    if (itemIds.length > 0) {
      const tph = itemIds.map(() => "?").join(",");
      const tResult = await env.DB.prepare(
        `SELECT oit.order_item_id, p.name FROM order_item_toppings oit
         LEFT JOIN products p ON p.id = oit.product_id
         WHERE oit.order_item_id IN (${tph})`
      ).bind(...itemIds).all();
      for (const t of tResult.results) {
        if (!toppingsByItem.has(t.order_item_id)) toppingsByItem.set(t.order_item_id, []);
        if (t.name) toppingsByItem.get(t.order_item_id).push(t.name);
      }
    }
    for (const it of itemsResult.results) {
      if (!itemsByOrder.has(it.order_id)) itemsByOrder.set(it.order_id, []);
      itemsByOrder.get(it.order_id).push({
        id: it.id,
        name: it.product_name,
        quantity: it.quantity,
        price: it.price,
        status: it.status,
        size_name: it.size_name,
        note: it.note,
        toppings: toppingsByItem.get(it.id) || []
      });
    }
  }
  return json(ordersResult.results.map((o) => ({
    id: o.id,
    order_type: o.order_type || "takeaway",
    display_code: o.display_code || `${o.order_type || "mv"}${o.id}`,
    customer_name: o.customer_name,
    customer_phone: o.customer_phone,
    ship_address: o.ship_address,
    latitude: o.latitude,
    longitude: o.longitude,
    ship_notes: o.ship_notes,
    total_amount: o.total,
    status: o.status,
    payment_method: o.payment_method,
    created_at: o.created_at ? o.created_at + "Z" : null,
    items: itemsByOrder.get(o.id) || []
  })));
}
async function handleCashierTakeawayComplete(env, orderId, body) {
  const order = await env.DB.prepare(
    `SELECT id, table_id, status FROM orders WHERE id = ?`
  ).bind(orderId).first();
  if (!order) return json({ message: "Kh\xF4ng t\xECm th\u1EA5y \u0111\u01A1n h\xE0ng" }, 404);
  if (order.table_id !== null) return json({ message: "\u0110\u01A1n n\xE0y kh\xF4ng ph\u1EA3i \u0111\u01A1n mang v\u1EC1" }, 400);
  const pm = body.payment_method;
  if (pm && !["cash", "transfer"].includes(pm)) {
    return json({ message: "payment_method kh\xF4ng h\u1EE3p l\u1EC7" }, 400);
  }
  if (pm === "transfer") {
    await env.DB.prepare(`UPDATE orders SET payment_method = ?, payment_status = 'paid', status = 'completed' WHERE id = ?`).bind(pm, orderId).run();
  } else if (pm) {
    await env.DB.prepare(`UPDATE orders SET payment_method = ?, status = 'completed' WHERE id = ?`).bind(pm, orderId).run();
  } else {
    await env.DB.prepare(`UPDATE orders SET status = 'completed' WHERE id = ?`).bind(orderId).run();
  }
  await env.DB.prepare(`UPDATE order_items SET status = 'completed' WHERE order_id = ? AND status != 'completed'`).bind(orderId).run();
  return json({ success: true, message: "\u0110\xE3 ho\xE0n th\xE0nh \u0111\u01A1n mang v\u1EC1" });
}
async function handleGetSettings(env) {
  const r = await env.DB.prepare("SELECT key, value FROM settings").all();
  const settings = {};
  for (const row of r.results) {
    try {
      settings[row.key] = JSON.parse(row.value);
    } catch {
      settings[row.key] = row.value;
    }
  }
  // Không trả zalo_bot qua public endpoint (tránh rò rỉ token)
  delete settings.zalo_bot;
  return json(settings);
}
async function handleTakeawayMenu(env) {
  const categoriesResult = await env.DB.prepare(
    `SELECT id, name, sort_order, production_unit, allow_all_toppings
     FROM categories ORDER BY
     CASE production_unit WHEN 'counter' THEN 0 WHEN 'kitchen' THEN 1 ELSE 2 END,
     sort_order, id`
  ).all();
  const productsResult = await env.DB.prepare(
    `SELECT id, category_id, name, price, image_url, available, is_topping, production_unit
     FROM products WHERE available = 1`
  ).all();
  const BATCH = 80;
  const productIds = productsResult.results.map((p) => p.id);
  let sizesByProduct = new Map();
  for (let i = 0; i < productIds.length; i += BATCH) {
    const chunk = productIds.slice(i, i + BATCH);
    const placeholders = chunk.map(() => "?").join(",");
    const sizesResult = await env.DB.prepare(
      `SELECT id, product_id, name, price FROM product_sizes WHERE product_id IN (${placeholders}) ORDER BY sort_order, id`
    ).bind(...chunk).all();
    for (const s of sizesResult.results) {
      if (!sizesByProduct.has(s.product_id)) sizesByProduct.set(s.product_id, []);
      sizesByProduct.get(s.product_id).push({ id: s.id, name: s.name, price: s.price });
    }
  }
  const catIds = categoriesResult.results.map((c) => c.id);
  let toppingsByCategory = new Map();
  for (let i = 0; i < catIds.length; i += BATCH) {
    const chunk = catIds.slice(i, i + BATCH);
    const placeholders = chunk.map(() => "?").join(",");
    const ctResult = await env.DB.prepare(
      `SELECT category_id, product_id FROM category_toppings WHERE category_id IN (${placeholders})`
    ).bind(...chunk).all();
    for (const r of ctResult.results) {
      if (!toppingsByCategory.has(r.category_id)) toppingsByCategory.set(r.category_id, []);
      toppingsByCategory.get(r.category_id).push(r.product_id);
    }
  }
  const categories = categoriesResult.results.map((c) => ({
    ...c,
    allowed_toppings: toppingsByCategory.get(c.id) || []
  }));
  const products = productsResult.results.map((p) => ({
    ...p,
    sizes: sizesByProduct.get(p.id) || []
  }));
  return json({
    store: { name: env.STORE_NAME },
    categories,
    products
  });
}
async function handleCreateTakeawayOrder(env, body) {
  if (!body.client_id || !body.items?.length) {
    return json({ message: "Thieu thong tin" }, 400);
  }
  let order = await env.DB.prepare(
    `SELECT id, display_code, customer_name FROM orders
     WHERE table_id IS NULL AND order_type = 'takeaway' AND client_id = ?
       AND status IN ('pending', 'processing')
     ORDER BY created_at ASC LIMIT 1`
  ).bind(body.client_id).first();
  let isNewOrder = false;
  if (!order) {
    const todayStart = (new Date()).toISOString().slice(0, 10);
    const countRow = await env.DB.prepare(
      `SELECT COUNT(*) AS cnt FROM orders
       WHERE table_id IS NULL AND order_type = 'takeaway'
         AND created_at >= ?`
    ).bind(todayStart).first();
    const displayCode = `mv${(countRow?.cnt ?? 0) + 1}`;
    const inserted = await env.DB.prepare(
      `INSERT INTO orders (table_id, order_type, total, status, client_id, customer_name, display_code, table_position)
       VALUES (NULL, 'takeaway', 0, 'pending', ?, ?, ?, 'A') RETURNING id`
    ).bind(body.client_id, body.customer_name ?? null, displayCode).first();
    if (!inserted) return json({ message: "Khong tao duoc don" }, 500);
    order = { id: inserted.id, display_code: displayCode, customer_name: body.customer_name ?? null };
    isNewOrder = true;
  } else if (body.customer_name) {
    await env.DB.prepare(`UPDATE orders SET customer_name = ? WHERE id = ?`).bind(body.customer_name, order.id).run();
    order.customer_name = body.customer_name;
  }
  // Menu data từ cache in-memory (15s TTL) — không cần query riêng mỗi lần
  const menuData = await getMenuData(env);
  const productsById = menuData.productsById;
  const sizesById = menuData.sizesById;
  const toppingsById = menuData.toppingsById;
  const allowAllByCategory = menuData.allowAllByCategory;
  const allowedToppingsByCategory = menuData.allowedToppingsByCategory;
  for (const it of body.items) {
    const product = productsById.get(it.product_id);
    if (!product || !product.available) continue;
    let itemPrice = product.price;
    let sizeName = null;
    if (it.size_id) {
      const size = sizesById.get(it.size_id);
      if (size && size.product_id === product.id) {
        itemPrice = size.price;
        sizeName = size.name;
      }
    }
    const qty = it.quantity ?? 1;
    const notes = it.notes ?? "";
    const inserted = await env.DB.prepare(
      `INSERT INTO order_items (order_id, product_id, product_name, price, quantity, status, size_name, note)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, ?) RETURNING id`
    ).bind(order.id, product.id, product.name, itemPrice, qty, sizeName, notes || null).first();
    if (!inserted) continue;
    const toppingEntries = it.toppings ?? [];
    const allowAll = allowAllByCategory.get(product.category_id) ?? 0;
    const allowedSet = allowedToppingsByCategory.get(product.category_id);
    for (const tEntry of toppingEntries) {
      const tid = typeof tEntry === "number" ? tEntry : tEntry.id;
      const tqty = typeof tEntry === "number" ? 1 : tEntry.quantity || 1;
      const tp = toppingsById.get(tid);
      if (!tp) continue;
      if (!allowAll && allowedSet && !allowedSet.has(tid)) continue;
      try {
        await env.DB.prepare(
          `INSERT INTO order_item_toppings (order_item_id, product_id, price, quantity) VALUES (?, ?, ?, ?)`
        ).bind(inserted.id, tid, tp.price, tqty).run();
      } catch {
        await env.DB.prepare(
          `INSERT INTO order_item_toppings (order_item_id, product_id, price) VALUES (?, ?, ?)`
        ).bind(inserted.id, tid, tp.price).run();
      }
    }
  }
  await recalcOrderTotal(env, order.id);
  const finalTotal = (await env.DB.prepare("SELECT total FROM orders WHERE id = ?").bind(order.id).first())?.total ?? 0;
  return json({
    message: "Dat mon thanh cong",
    order_id: order.id,
    total_amount: finalTotal,
    display_code: order.display_code,
    is_new_order: isNewOrder
  }, 201);
}
async function handleTakeawayItems(env, clientId) {
  const todayStart = (new Date()).toISOString().slice(0, 10);
  const result = await env.DB.prepare(
    `SELECT oi.id, oi.order_id, oi.product_id, oi.product_name, oi.price, oi.quantity,
            oi.note, oi.status, oi.size_name, o.created_at AS order_created_at
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     WHERE o.client_id = ? AND o.status IN ('pending', 'processing')
       AND o.created_at >= ? AND oi.status IN ('pending', 'processing', 'completed')
     ORDER BY oi.id DESC`
  ).bind(clientId, todayStart).all();
  const itemIds = result.results.map((r) => r.id);
  let toppingsByItem = new Map();
  if (itemIds.length > 0) {
    const placeholders = itemIds.map(() => "?").join(",");
    const tResult = await env.DB.prepare(
      `SELECT oit.order_item_id, p.name FROM order_item_toppings oit
       JOIN products p ON p.id = oit.product_id
       WHERE oit.order_item_id IN (${placeholders})`
    ).bind(...itemIds).all();
    for (const t of tResult.results) {
      if (!toppingsByItem.has(t.order_item_id)) toppingsByItem.set(t.order_item_id, []);
      toppingsByItem.get(t.order_item_id).push(t.name);
    }
  }
  return json(result.results.map((it) => ({
    id: it.id,
    order_id: it.order_id,
    product_id: it.product_id,
    name: it.product_name,
    quantity: it.quantity,
    price: it.price,
    status: it.status,
    size_name: it.size_name,
    notes: it.note,
    toppings: toppingsByItem.get(it.id) || [],
    created_at: it.order_created_at ? it.order_created_at + "Z" : null
  })));
}
async function handleDeleteTakeawayItem(env, orderId, itemId, requestClientId) {
  const order = await env.DB.prepare(
    `SELECT id, client_id FROM orders WHERE id = ? AND order_type = 'takeaway'`
  ).bind(orderId).first();
  if (!order) return json({ message: "Khong tim thay don hang" }, 404);
  if (order.client_id && requestClientId !== order.client_id) {
    return json({ message: "Khong the xoa mon cua nguoi khac" }, 403);
  }
  const item = await env.DB.prepare(
    `SELECT id, status FROM order_items WHERE id = ? AND order_id = ?`
  ).bind(itemId, orderId).first();
  if (!item) return json({ message: "Khong tim thay mon" }, 404);
  if (item.status === "completed") return json({ message: "Khong the xoa mon da phuc vu" }, 400);
  await env.DB.prepare(`DELETE FROM order_item_toppings WHERE order_item_id = ?`).bind(itemId).run();
  await env.DB.prepare(`DELETE FROM order_items WHERE id = ?`).bind(itemId).run();
  const remaining = await env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM order_items WHERE order_id = ?`
  ).bind(orderId).first();
  if ((remaining?.cnt ?? 0) === 0) {
    await env.DB.prepare(`DELETE FROM orders WHERE id = ?`).bind(orderId).run();
  } else {
    await recalcOrderTotal(env, orderId);
  }
  return json({ message: "Da xoa mon" }, 200);
}
async function handleUpdateTakeawayItemQuantity(env, orderId, itemId, requestClientId, body) {
  const order = await env.DB.prepare(
    `SELECT id, client_id FROM orders WHERE id = ? AND order_type = 'takeaway'`
  ).bind(orderId).first();
  if (!order) return json({ message: "Khong tim thay don hang" }, 404);
  if (order.client_id && requestClientId !== order.client_id) {
    return json({ message: "Khong the sua mon cua nguoi khac" }, 403);
  }
  const item = await env.DB.prepare(
    `SELECT id, status FROM order_items WHERE id = ? AND order_id = ?`
  ).bind(itemId, orderId).first();
  if (!item) return json({ message: "Khong tim thay mon" }, 404);
  if (item.status === "completed") return json({ message: "Khong the sua mon da phuc vu" }, 400);
  const qty = body.quantity ?? 0;
  if (qty <= 0) {
    return await handleDeleteTakeawayItem(env, orderId, itemId, requestClientId);
  }
  await env.DB.prepare(`UPDATE order_items SET quantity = ? WHERE id = ?`).bind(qty, itemId).run();
  await recalcOrderTotal(env, orderId);
  const totalRow = await env.DB.prepare(`SELECT total FROM orders WHERE id = ?`).bind(orderId).first();
  return json({ message: "Da cap nhat so luong", total_amount: totalRow?.total ?? 0 }, 200);
}
async function isShipEnabled(env) {
  const row = await env.DB.prepare(`SELECT value FROM settings WHERE key = 'ship_enabled'`).first();
  if (!row) return true;
  try {
    return JSON.parse(row.value) !== false;
  } catch {
    return row.value !== "false";
  }
}
async function shipDisabledResponse(env) {
  const reasonRow = await env.DB.prepare(`SELECT value FROM settings WHERE key = 'ship_disable_reason'`).first();
  let reason = null;
  if (reasonRow) {
    try {
      reason = JSON.parse(reasonRow.value);
    } catch {
      reason = reasonRow.value;
    }
  }
  const message = reason || "Qu\xE1n \u0111ang t\u1EA1m d\u1EEBng nh\u1EADn \u0111\u01A1n ship";
  return json({
    message: "Qu\xE1n \u0111ang t\u1EA1m d\u1EEBng nh\u1EADn \u0111\u01A1n ship",
    ship_disable_message: message,
    ship_enabled: false
  }, 403);
}
async function handleShipMenu(env) {
  const categoriesResult = await env.DB.prepare(
    `SELECT id, name, sort_order, production_unit, allow_all_toppings
     FROM categories ORDER BY
     CASE production_unit WHEN 'counter' THEN 0 WHEN 'kitchen' THEN 1 ELSE 2 END,
     sort_order, id`
  ).all();
  const productsResult = await env.DB.prepare(
    `SELECT id, category_id, name, price, image_url, available, is_topping, production_unit
     FROM products WHERE available = 1`
  ).all();
  const BATCH = 80;
  const productIds = productsResult.results.map((p) => p.id);
  let sizesByProduct = new Map();
  for (let i = 0; i < productIds.length; i += BATCH) {
    const chunk = productIds.slice(i, i + BATCH);
    const placeholders = chunk.map(() => "?").join(",");
    const sizesResult = await env.DB.prepare(
      `SELECT id, product_id, name, price FROM product_sizes WHERE product_id IN (${placeholders}) ORDER BY sort_order, id`
    ).bind(...chunk).all();
    for (const s of sizesResult.results) {
      if (!sizesByProduct.has(s.product_id)) sizesByProduct.set(s.product_id, []);
      sizesByProduct.get(s.product_id).push({ id: s.id, name: s.name, price: s.price });
    }
  }
  const catIds = categoriesResult.results.map((c) => c.id);
  let toppingsByCategory = new Map();
  for (let i = 0; i < catIds.length; i += BATCH) {
    const chunk = catIds.slice(i, i + BATCH);
    const placeholders = chunk.map(() => "?").join(",");
    const ctResult = await env.DB.prepare(
      `SELECT category_id, product_id FROM category_toppings WHERE category_id IN (${placeholders})`
    ).bind(...chunk).all();
    for (const r of ctResult.results) {
      if (!toppingsByCategory.has(r.category_id)) toppingsByCategory.set(r.category_id, []);
      toppingsByCategory.get(r.category_id).push(r.product_id);
    }
  }
  const categories = categoriesResult.results.map((c) => ({
    ...c,
    allowed_toppings: toppingsByCategory.get(c.id) || []
  }));
  const products = productsResult.results.map((p) => ({
    ...p,
    sizes: sizesByProduct.get(p.id) || []
  }));
  return json({
    store: { name: env.STORE_NAME },
    categories,
    products
  });
}
async function handleCreateShipOrder(env, body, ctx) {
  if (!await isShipEnabled(env)) return shipDisabledResponse(env);
  if (!body.client_id || !body.items?.length) {
    return json({ message: "Thieu thong tin" }, 400);
  }
  if (!body.customer_phone) {
    return json({ message: "Thieu so dien thoai" }, 400);
  }
  if (!body.ship_address) {
    return json({ message: "Thieu dia chi giao hang" }, 400);
  }
  let order = await env.DB.prepare(
    `SELECT id, display_code, customer_name FROM orders
     WHERE table_id IS NULL AND order_type = 'ship' AND client_id = ?
       AND status IN ('pending', 'processing')
     ORDER BY created_at ASC LIMIT 1`
  ).bind(body.client_id).first();
  let isNewOrder = false;
  if (!order) {
    const todayStart = (new Date()).toISOString().slice(0, 10);
    const countRow = await env.DB.prepare(
      `SELECT COUNT(*) AS cnt FROM orders
       WHERE table_id IS NULL AND order_type = 'ship'
         AND created_at >= ?`
    ).bind(todayStart).first();
    const displayCode = `ship${(countRow?.cnt ?? 0) + 1}`;
    const inserted = await env.DB.prepare(
      `INSERT INTO orders (table_id, order_type, total, status, client_id, customer_name, customer_phone,
                           ship_address, latitude, longitude, ship_notes, display_code, table_position)
       VALUES (NULL, 'ship', 0, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, 'A') RETURNING id`
    ).bind(
      body.client_id,
      body.customer_name ?? null,
      body.customer_phone,
      body.ship_address,
      body.latitude ?? null,
      body.longitude ?? null,
      body.ship_notes ?? null,
      displayCode
    ).first();
    if (!inserted) return json({ message: "Khong tao duoc don" }, 500);
    order = { id: inserted.id, display_code: displayCode, customer_name: body.customer_name ?? null };
    isNewOrder = true;
  } else {
    await env.DB.prepare(
      `UPDATE orders SET
         customer_name = COALESCE(?, customer_name),
         customer_phone = COALESCE(?, customer_phone),
         ship_address = COALESCE(?, ship_address),
         latitude = COALESCE(?, latitude),
         longitude = COALESCE(?, longitude),
         ship_notes = COALESCE(?, ship_notes)
       WHERE id = ?`
    ).bind(
      body.customer_name ?? null,
      body.customer_phone ?? null,
      body.ship_address ?? null,
      body.latitude ?? null,
      body.longitude ?? null,
      body.ship_notes ?? null,
      order.id
    ).run();
    if (body.customer_name) order.customer_name = body.customer_name;
  }
  // Menu data từ cache in-memory (15s TTL) — không cần query riêng mỗi lần
  const menuData = await getMenuData(env);
  const productsById = menuData.productsById;
  const sizesById = menuData.sizesById;
  const toppingsById = menuData.toppingsById;
  const allowAllByCategory = menuData.allowAllByCategory;
  const allowedToppingsByCategory = menuData.allowedToppingsByCategory;
  for (const it of body.items) {
    const product = productsById.get(it.product_id);
    if (!product || !product.available) continue;
    let itemPrice = product.price;
    let sizeName = null;
    if (it.size_id) {
      const size = sizesById.get(it.size_id);
      if (size && size.product_id === product.id) {
        itemPrice = size.price;
        sizeName = size.name;
      }
    }
    const qty = it.quantity ?? 1;
    const notes = it.notes ?? "";
    const inserted = await env.DB.prepare(
      `INSERT INTO order_items (order_id, product_id, product_name, price, quantity, status, size_name, note)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, ?) RETURNING id`
    ).bind(order.id, product.id, product.name, itemPrice, qty, sizeName, notes || null).first();
    if (!inserted) continue;
    const toppingEntries = it.toppings ?? [];
    const allowAll = allowAllByCategory.get(product.category_id) ?? 0;
    const allowedSet = allowedToppingsByCategory.get(product.category_id);
    for (const tEntry of toppingEntries) {
      const tid = typeof tEntry === "number" ? tEntry : tEntry.id;
      const tqty = typeof tEntry === "number" ? 1 : tEntry.quantity || 1;
      const tp = toppingsById.get(tid);
      if (!tp) continue;
      if (!allowAll && allowedSet && !allowedSet.has(tid)) continue;
      try {
        await env.DB.prepare(
          `INSERT INTO order_item_toppings (order_item_id, product_id, price, quantity) VALUES (?, ?, ?, ?)`
        ).bind(inserted.id, tid, tp.price, tqty).run();
      } catch {
        await env.DB.prepare(
          `INSERT INTO order_item_toppings (order_item_id, product_id, price) VALUES (?, ?, ?)`
        ).bind(inserted.id, tid, tp.price).run();
      }
    }
  }
  await recalcOrderTotal(env, order.id);
  const finalTotal = (await env.DB.prepare("SELECT total FROM orders WHERE id = ?").bind(order.id).first())?.total ?? 0;

  // Zalo notification — fire-and-forget (chỉ khi tạo đơn mới)
  if (isNewOrder) {
    const notifier = new ZaloBotNotifier(env);
    // Gather full order data for notification
    const notifyItems = await env.DB.prepare(
      `SELECT oi.id, oi.product_name, oi.price, oi.quantity, oi.size_name, oi.note
       FROM order_items oi WHERE oi.order_id = ?`
    ).bind(order.id).all();
    const itemIds = notifyItems.results.map(i => i.id);
    let toppingsByItem = new Map();
    if (itemIds.length > 0) {
      const ph = itemIds.map(() => "?").join(",");
      const tRes = await env.DB.prepare(
        `SELECT oit.order_item_id, p.name, oit.price FROM order_item_toppings oit
         JOIN products p ON p.id = oit.product_id WHERE oit.order_item_id IN (${ph})`
      ).bind(...itemIds).all();
      for (const t of tRes.results) {
        if (!toppingsByItem.has(t.order_item_id)) toppingsByItem.set(t.order_item_id, []);
        toppingsByItem.get(t.order_item_id).push({ name: t.name, price: t.price });
      }
    }
    const notifyData = {
      order_id: order.id,
      display_code: order.display_code,
      customer_name: order.customer_name,
      customer_phone: body.customer_phone,
      ship_address: body.ship_address,
      latitude: body.latitude ?? null,
      longitude: body.longitude ?? null,
      items: notifyItems.results.map(it => ({
        product_name: it.product_name,
        price: it.price,
        quantity: it.quantity,
        size_name: it.size_name,
        note: it.note,
        toppings: toppingsByItem.get(it.id) || [],
      })),
      total_amount: finalTotal,
      created_at: new Date().toISOString(),
    };
    if (ctx && ctx.waitUntil) {
      ctx.waitUntil(notifier.notifyNewShipOrder(notifyData));
    } else {
      notifier.notifyNewShipOrder(notifyData).catch(() => {});
    }
  }

  return json({
    message: "Dat mon thanh cong",
    order_id: order.id,
    total_amount: finalTotal,
    display_code: order.display_code,
    is_new_order: isNewOrder
  }, 201);
}
async function handleShipItems(env, clientId) {
  const todayStart = (new Date()).toISOString().slice(0, 10);
  const result = await env.DB.prepare(
    `SELECT oi.id, oi.order_id, oi.product_id, oi.product_name, oi.price, oi.quantity,
            oi.note, oi.status, oi.size_name, o.created_at AS order_created_at
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     WHERE o.client_id = ? AND o.order_type = 'ship'
       AND o.status IN ('pending', 'processing')
       AND o.created_at >= ? AND oi.status IN ('pending', 'processing', 'completed')
     ORDER BY oi.id DESC`
  ).bind(clientId, todayStart).all();
  const itemIds = result.results.map((r) => r.id);
  let toppingsByItem = new Map();
  if (itemIds.length > 0) {
    const placeholders = itemIds.map(() => "?").join(",");
    const tResult = await env.DB.prepare(
      `SELECT oit.order_item_id, p.name FROM order_item_toppings oit
       JOIN products p ON p.id = oit.product_id
       WHERE oit.order_item_id IN (${placeholders})`
    ).bind(...itemIds).all();
    for (const t of tResult.results) {
      if (!toppingsByItem.has(t.order_item_id)) toppingsByItem.set(t.order_item_id, []);
      toppingsByItem.get(t.order_item_id).push(t.name);
    }
  }
  return json(result.results.map((it) => ({
    id: it.id,
    order_id: it.order_id,
    product_id: it.product_id,
    name: it.product_name,
    quantity: it.quantity,
    price: it.price,
    status: it.status,
    size_name: it.size_name,
    notes: it.note,
    toppings: toppingsByItem.get(it.id) || [],
    created_at: it.order_created_at ? it.order_created_at + "Z" : null
  })));
}
async function handleDeleteShipItem(env, orderId, itemId, requestClientId) {
  if (!await isShipEnabled(env)) return shipDisabledResponse(env);
  const order = await env.DB.prepare(
    `SELECT id, client_id FROM orders WHERE id = ? AND order_type = 'ship'`
  ).bind(orderId).first();
  if (!order) return json({ message: "Khong tim thay don hang" }, 404);
  if (order.client_id && requestClientId !== order.client_id) {
    return json({ message: "Khong the xoa mon cua nguoi khac" }, 403);
  }
  const item = await env.DB.prepare(
    `SELECT id, status FROM order_items WHERE id = ? AND order_id = ?`
  ).bind(itemId, orderId).first();
  if (!item) return json({ message: "Khong tim thay mon" }, 404);
  if (item.status === "completed") return json({ message: "Khong the xoa mon da phuc vu" }, 400);
  await env.DB.prepare(`DELETE FROM order_item_toppings WHERE order_item_id = ?`).bind(itemId).run();
  await env.DB.prepare(`DELETE FROM order_items WHERE id = ?`).bind(itemId).run();
  const remaining = await env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM order_items WHERE order_id = ?`
  ).bind(orderId).first();
  if ((remaining?.cnt ?? 0) === 0) {
    await env.DB.prepare(`DELETE FROM orders WHERE id = ?`).bind(orderId).run();
  } else {
    await recalcOrderTotal(env, orderId);
  }
  return json({ message: "Da xoa mon" }, 200);
}
async function handleUpdateShipItemQuantity(env, orderId, itemId, requestClientId, body) {
  if (!await isShipEnabled(env)) return shipDisabledResponse(env);
  const order = await env.DB.prepare(
    `SELECT id, client_id FROM orders WHERE id = ? AND order_type = 'ship'`
  ).bind(orderId).first();
  if (!order) return json({ message: "Khong tim thay don hang" }, 404);
  if (order.client_id && requestClientId !== order.client_id) {
    return json({ message: "Khong the sua mon cua nguoi khac" }, 403);
  }
  const item = await env.DB.prepare(
    `SELECT id, status FROM order_items WHERE id = ? AND order_id = ?`
  ).bind(itemId, orderId).first();
  if (!item) return json({ message: "Khong tim thay mon" }, 404);
  if (item.status === "completed") return json({ message: "Khong the sua mon da phuc vu" }, 400);
  const qty = body.quantity ?? 0;
  if (qty <= 0) {
    return await handleDeleteShipItem(env, orderId, itemId, requestClientId);
  }
  await env.DB.prepare(`UPDATE order_items SET quantity = ? WHERE id = ?`).bind(qty, itemId).run();
  await recalcOrderTotal(env, orderId);
  const totalRow = await env.DB.prepare(`SELECT total FROM orders WHERE id = ?`).bind(orderId).first();
  return json({ message: "Da cap nhat so luong", total_amount: totalRow?.total ?? 0 }, 200);
}
async function buildShipOrderDetail(env, orderId) {
  const o = await env.DB.prepare(
    `SELECT id, display_code, customer_name, customer_phone, ship_address, latitude, longitude,
            ship_notes, ship_voice_url, total, status, created_at
     FROM orders WHERE id = ? AND order_type = 'ship'`
  ).bind(orderId).first();
  if (!o) return null;
  const itemsResult = await env.DB.prepare(
    `SELECT oi.id, oi.product_name, oi.quantity, oi.price, oi.size_name, oi.note
     FROM order_items oi
     WHERE oi.order_id = ? AND oi.status != 'completed'`
  ).bind(orderId).all();
  const itemIds = itemsResult.results.map((i) => i.id);
  let toppingsByItem = new Map();
  if (itemIds.length > 0) {
    const ph = itemIds.map(() => "?").join(",");
    const tResult = await env.DB.prepare(
      `SELECT oit.order_item_id, p.name FROM order_item_toppings oit
       JOIN products p ON p.id = oit.product_id
       WHERE oit.order_item_id IN (${ph})`
    ).bind(...itemIds).all();
    for (const t of tResult.results) {
      if (!toppingsByItem.has(t.order_item_id)) toppingsByItem.set(t.order_item_id, []);
      toppingsByItem.get(t.order_item_id).push(t.name);
    }
  }
  const items = itemsResult.results.map((i) => ({
    id: i.id,
    name: i.product_name,
    quantity: i.quantity,
    price: i.price,
    size_name: i.size_name,
    toppings: toppingsByItem.get(i.id) || [],
    notes: i.note
  }));
  return {
    id: o.id,
    display_code: o.display_code || `ship${o.id}`,
    customer_name: o.customer_name,
    customer_phone: o.customer_phone,
    ship_address: o.ship_address,
    latitude: o.latitude,
    longitude: o.longitude,
    ship_notes: o.ship_notes,
    ship_voice_url: o.ship_voice_url,
    total_amount: o.total,
    status: o.status,
    created_at: o.created_at ? o.created_at + "Z" : null,
    items
  };
}
async function handleGetShipOrders(env) {
  const todayStart = (new Date()).toISOString().slice(0, 10);
  const orders = await env.DB.prepare(
    `SELECT id FROM orders
     WHERE table_id IS NULL AND order_type = 'ship' AND status = 'pending'
       AND created_at >= ?
     ORDER BY created_at ASC`
  ).bind(todayStart).all();
  const results = [];
  for (const o of orders.results) {
    const detail = await buildShipOrderDetail(env, o.id);
    if (detail) results.push(detail);
  }
  return json(results);
}
async function handleGetTransferOrders(env) {
  const todayStart = (new Date()).toISOString().slice(0, 10);
  const orders = await env.DB.prepare(
    `SELECT id FROM orders
     WHERE table_id IS NULL AND order_type = 'ship' AND status = 'awaiting_transfer'
       AND created_at >= ?
     ORDER BY created_at ASC`
  ).bind(todayStart).all();
  const results = [];
  for (const o of orders.results) {
    const detail = await buildShipOrderDetail(env, o.id);
    if (detail) results.push(detail);
  }
  return json(results);
}
async function handlePayCashShipOrder(env, orderId) {
  const order = await env.DB.prepare(
    `SELECT id, status FROM orders WHERE id = ? AND order_type = 'ship'`
  ).bind(orderId).first();
  if (!order) return json({ message: "Khong tim thay don hang" }, 404);
  if (order.status !== "pending") {
    return json({ message: "Don khong o trang thai cho xu ly" }, 400);
  }
  await env.DB.prepare(`UPDATE orders SET status = 'completed' WHERE id = ?`).bind(orderId).run();
  await env.DB.prepare(`UPDATE order_items SET status = 'completed' WHERE order_id = ? AND status != 'completed'`).bind(orderId).run();
  return json({ message: "Da hoan tat don (tien mat)", order_id: orderId, status: "completed" });
}
async function handlePayTransferShipOrder(env, orderId) {
  const order = await env.DB.prepare(
    `SELECT id, status FROM orders WHERE id = ? AND order_type = 'ship'`
  ).bind(orderId).first();
  if (!order) return json({ message: "Khong tim thay don hang" }, 404);
  if (order.status !== "pending") {
    return json({ message: "Don khong o trang thai cho xu ly" }, 400);
  }
  await env.DB.prepare(`UPDATE orders SET status = 'awaiting_transfer' WHERE id = ?`).bind(orderId).run();
  return json({ message: "Da chuyen sang cho chuyen khoan", order_id: orderId, status: "awaiting_transfer" });
}
async function handleConfirmTransferShipOrder(env, orderId) {
  const order = await env.DB.prepare(
    `SELECT id, status FROM orders WHERE id = ? AND order_type = 'ship'`
  ).bind(orderId).first();
  if (!order) return json({ message: "Khong tim thay don hang" }, 404);
  if (order.status !== "awaiting_transfer") {
    return json({ message: "Don khong o trang thai cho chuyen khoan" }, 400);
  }
  await env.DB.prepare(`UPDATE orders SET status = 'completed' WHERE id = ?`).bind(orderId).run();
  await env.DB.prepare(`UPDATE order_items SET status = 'completed' WHERE order_id = ? AND status != 'completed'`).bind(orderId).run();
  return json({ message: "Da xac nhan nhan tien chuyen khoan", order_id: orderId, status: "completed" });
}
var VALID_PRODUCTION_UNITS = ["counter", "kitchen"];
function requireRole(auth, roles) {
  if (!auth.valid) return auth.error ?? json({ message: "Thi\u1EBFu token" }, 401);
  if (!roles.includes(auth.user.role)) {
    return json({ message: "Kh\xF4ng c\xF3 quy\u1EC1n truy c\u1EADp" }, 403);
  }
  return null;
}
async function hashPassword(password, salt) {
  return sha256Hex(salt + password);
}
function randomSalt() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function handleAdminGetUsers(env) {
  const result = await env.DB.prepare(
    "SELECT id, username, role, full_name FROM users ORDER BY id"
  ).all();
  return json(result.results.map((u) => ({ ...u, full_name: u.full_name ?? null })));
}
async function handleAdminAddUser(env, body) {
  if (!body.username || !body.password) {
    return json({ message: "Username v\xE0 password l\xE0 b\u1EAFt bu\u1ED9c" }, 400);
  }
  const existing = await env.DB.prepare("SELECT id FROM users WHERE username = ?").bind(body.username).first();
  if (existing) return json({ message: "Username already exists" }, 400);
  const role = body.role ?? "staff";
  const salt = randomSalt();
  const passwordHash = await hashPassword(body.password, salt);
  const result = await env.DB.prepare(
    `INSERT INTO users (username, password_hash, salt, full_name, role) VALUES (?, ?, ?, ?, ?) RETURNING id`
  ).bind(body.username, passwordHash, salt, body.full_name ?? null, role).first();
  if (!result) return json({ message: "Kh\xF4ng t\u1EA1o \u0111\u01B0\u1EE3c ng\u01B0\u1EDDi d\xF9ng" }, 500);
  return json({ message: "User added successful", id: result.id }, 201);
}
async function handleAdminUpdateDeleteUser(env, userId, request) {
  const user = await env.DB.prepare("SELECT id, username, full_name, role FROM users WHERE id = ?").bind(userId).first();
  if (!user) return json({ message: "User not found" }, 404);
  if (request.method === "DELETE") {
    if (user.username === "admin") {
      return json({ message: "Cannot delete main admin" }, 400);
    }
    await env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(userId).run();
    await env.DB.prepare("DELETE FROM users WHERE id = ?").bind(userId).run();
    return json({ message: "User deleted" });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const fullName = body.full_name ?? user.full_name;
  const role = body.role ?? user.role;
  if (body.password) {
    const salt = randomSalt();
    const passwordHash = await hashPassword(body.password, salt);
    await env.DB.prepare("UPDATE users SET full_name = ?, role = ?, password_hash = ?, salt = ? WHERE id = ?").bind(fullName, role, passwordHash, salt, userId).run();
  } else {
    await env.DB.prepare("UPDATE users SET full_name = ?, role = ? WHERE id = ?").bind(fullName, role, userId).run();
  }
  return json({ message: "User updated" });
}
async function handleAdminAddProduct(env, body) {
  if (!body.name || body.price === void 0 || body.price === null || !body.category_id) {
    return json({ message: "name, price, category_id l\xE0 b\u1EAFt bu\u1ED9c" }, 400);
  }
  const category = await env.DB.prepare("SELECT id FROM categories WHERE id = ?").bind(body.category_id).first();
  if (!category) return json({ message: "Category not found" }, 400);
  const result = await env.DB.prepare(
    `INSERT INTO products (category_id, name, price, image_url, available, production_unit, is_topping)
     VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`
  ).bind(
    body.category_id,
    body.name,
    Math.round(body.price),
    body.image_url ?? null,
    body.available === false ? 0 : 1,
    body.production_unit ?? "kitchen",
    body.is_topping ? 1 : 0
  ).first();
  if (!result) return json({ message: "Kh\xF4ng t\u1EA1o \u0111\u01B0\u1EE3c s\u1EA3n ph\u1EA9m" }, 500);
  await invalidateMenuCaches(env);
  return json({ message: "Product added", id: result.id }, 201);
}
async function handleAdminUpdateDeleteProduct(env, productId, request) {
  const product = await env.DB.prepare(
    "SELECT id, name, price, category_id, image_url, available, production_unit, is_topping FROM products WHERE id = ?"
  ).bind(productId).first();
  if (!product) return json({ message: "Product not found" }, 404);
  if (request.method === "DELETE") {
    const orderItem = await env.DB.prepare("SELECT id FROM order_items WHERE product_id = ? LIMIT 1").bind(productId).first();
    if (orderItem) {
      return json({ message: "Kh\xF4ng th\u1EC3 x\xF3a m\xF3n \u0111\xE3 c\xF3 \u0111\u01A1n h\xE0ng. Vui l\xF2ng ch\u1ECDn 'T\u1EA1m ng\u01B0ng' kinh doanh." }, 400);
    }
    const toppingRef = await env.DB.prepare("SELECT id FROM order_item_toppings WHERE product_id = ? LIMIT 1").bind(productId).first();
    if (toppingRef) {
      return json({ message: "Kh\xF4ng th\u1EC3 x\xF3a m\xF3n (\u0111ang l\xE0 Topping trong \u0111\u01A1n h\xE0ng). Vui l\xF2ng ch\u1ECDn 'T\u1EA1m ng\u01B0ng'." }, 400);
    }
    await env.DB.prepare("DELETE FROM product_sizes WHERE product_id = ?").bind(productId).run();
    await env.DB.prepare("DELETE FROM category_toppings WHERE product_id = ?").bind(productId).run();
    await env.DB.prepare("DELETE FROM products WHERE id = ?").bind(productId).run();
    await invalidateMenuCaches(env);
    return json({ message: "Product deleted" });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const name = body.name ?? product.name;
  const price = body.price !== void 0 ? Math.round(body.price) : product.price;
  const categoryId = body.category_id ?? product.category_id;
  const imageUrl = body.image_url !== void 0 ? body.image_url : product.image_url;
  const available = body.available !== void 0 ? body.available ? 1 : 0 : product.available;
  const productionUnit = body.production_unit ?? product.production_unit;
  const isTopping = body.is_topping !== void 0 ? body.is_topping ? 1 : 0 : product.is_topping;
  if (body.category_id !== void 0 && body.category_id !== product.category_id) {
    const category = await env.DB.prepare("SELECT id FROM categories WHERE id = ?").bind(categoryId).first();
    if (!category) return json({ message: "Category not found" }, 400);
  }
  await env.DB.prepare(
    `UPDATE products SET name = ?, price = ?, category_id = ?, image_url = ?, available = ?, production_unit = ?, is_topping = ? WHERE id = ?`
  ).bind(name, price, categoryId, imageUrl, available, productionUnit, isTopping, productId).run();
  await invalidateMenuCaches(env);
  return json({ message: "Product updated" });
}
async function handleAdminAddProductSize(env, productId, body) {
  const product = await env.DB.prepare("SELECT id FROM products WHERE id = ?").bind(productId).first();
  if (!product) return json({ message: "Product not found" }, 404);
  if (!body.name || body.price === void 0 || body.price === null) {
    return json({ message: "name v\xE0 price l\xE0 b\u1EAFt bu\u1ED9c" }, 400);
  }
  const result = await env.DB.prepare(
    `INSERT INTO product_sizes (product_id, name, price) VALUES (?, ?, ?) RETURNING id`
  ).bind(productId, body.name, Math.round(body.price)).first();
  if (!result) return json({ message: "Kh\xF4ng t\u1EA1o \u0111\u01B0\u1EE3c size" }, 500);
  await invalidateMenuCaches(env);
  return json({ message: "Size added", id: result.id }, 201);
}
async function handleAdminDeleteProductSize(env, sizeId) {
  const size = await env.DB.prepare("SELECT id FROM product_sizes WHERE id = ?").bind(sizeId).first();
  if (!size) return json({ message: "Size not found" }, 404);
  await env.DB.prepare("DELETE FROM product_sizes WHERE id = ?").bind(sizeId).run();
  await invalidateMenuCaches(env);
  return json({ message: "Size deleted" });
}
async function handleAdminAddCategory(env, body) {
  if (!body.name) return json({ message: "name l\xE0 b\u1EAFt bu\u1ED9c" }, 400);
  const productionUnit = body.production_unit ?? "kitchen";
  if (!VALID_PRODUCTION_UNITS.includes(productionUnit)) {
    return json({ message: "Invalid production_unit" }, 400);
  }
  const maxRow = await env.DB.prepare("SELECT COALESCE(MAX(sort_order), -1) AS max_sort FROM categories").first();
  const nextSort = (maxRow?.max_sort ?? -1) + 1;
  const result = await env.DB.prepare(
    `INSERT INTO categories (name, sort_order, production_unit, allow_all_toppings) VALUES (?, ?, ?, ?) RETURNING id`
  ).bind(
    body.name,
    body.sort_order ?? nextSort,
    productionUnit,
    body.allow_all_toppings === false ? 0 : 1
  ).first();
  if (!result) return json({ message: "Kh\xF4ng t\u1EA1o \u0111\u01B0\u1EE3c danh m\u1EE5c" }, 500);
  if (Array.isArray(body.topping_ids) && body.topping_ids.length > 0) {
    await linkCategoryToppings(env, result.id, body.topping_ids);
  }
  await invalidateMenuCaches(env);
  return json({ message: "Category added", id: result.id }, 201);
}
async function linkCategoryToppings(env, categoryId, toppingIds) {
  const placeholders = toppingIds.map(() => "?").join(",");
  const rows = await env.DB.prepare(
    `SELECT id FROM products WHERE id IN (${placeholders}) AND is_topping = 1`
  ).bind(...toppingIds).all();
  for (const row of rows.results) {
    await env.DB.prepare(
      "INSERT OR IGNORE INTO category_toppings (category_id, product_id) VALUES (?, ?)"
    ).bind(categoryId, row.id).run();
  }
}
async function handleAdminUpdateDeleteCategory(env, categoryId, request) {
  const category = await env.DB.prepare(
    "SELECT id, name, sort_order, production_unit, allow_all_toppings FROM categories WHERE id = ?"
  ).bind(categoryId).first();
  if (!category) return json({ message: "Category not found" }, 404);
  if (request.method === "DELETE") {
    const productRef = await env.DB.prepare("SELECT id FROM products WHERE category_id = ? LIMIT 1").bind(categoryId).first();
    if (productRef) return json({ message: "Cannot delete category with products" }, 400);
    await env.DB.prepare("DELETE FROM category_toppings WHERE category_id = ?").bind(categoryId).run();
    await env.DB.prepare("DELETE FROM categories WHERE id = ?").bind(categoryId).run();
    await invalidateMenuCaches(env);
    return json({ message: "Category deleted" });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const name = body.name ?? category.name;
  const sortOrder = body.sort_order ?? category.sort_order;
  const allowAll = body.allow_all_toppings !== void 0 ? body.allow_all_toppings ? 1 : 0 : category.allow_all_toppings;
  let productionUnit = category.production_unit;
  if (body.production_unit !== void 0) {
    if (!VALID_PRODUCTION_UNITS.includes(body.production_unit)) {
      return json({ message: "Invalid production_unit" }, 400);
    }
    productionUnit = body.production_unit;
    await env.DB.prepare("UPDATE products SET production_unit = ? WHERE category_id = ?").bind(productionUnit, categoryId).run();
  }
  await env.DB.prepare(
    "UPDATE categories SET name = ?, sort_order = ?, production_unit = ?, allow_all_toppings = ? WHERE id = ?"
  ).bind(name, sortOrder, productionUnit, allowAll, categoryId).run();
  if (Array.isArray(body.topping_ids)) {
    await env.DB.prepare("DELETE FROM category_toppings WHERE category_id = ?").bind(categoryId).run();
    if (body.topping_ids.length > 0) {
      await linkCategoryToppings(env, categoryId, body.topping_ids);
    }
  }
  await invalidateMenuCaches(env);
  return json({ message: "Category updated" });
}
async function handleAdminReorderCategories(env, body) {
  const ids = body.category_ids;
  if (!Array.isArray(ids) || ids.length === 0) {
    return json({ message: "category_ids is required" }, 400);
  }
  const placeholders = ids.map(() => "?").join(",");
  const found = await env.DB.prepare(
    `SELECT id FROM categories WHERE id IN (${placeholders})`
  ).bind(...ids).all();
  if (found.results.length !== ids.length) {
    return json({ message: "Some category ids are invalid" }, 400);
  }
  for (let i = 0; i < ids.length; i++) {
    await env.DB.prepare("UPDATE categories SET sort_order = ? WHERE id = ?").bind(i, ids[i]).run();
  }
  await invalidateMenuCaches(env);
  return json({ message: "Category order updated" });
}
async function handleAdminListProducts(env, availableParam) {
  const products = await env.DB.prepare(
    `SELECT id, category_id, name, price, image_url, available, is_topping, production_unit
     FROM products ORDER BY id`
  ).all();
  const sizes = await env.DB.prepare(
    "SELECT id, product_id, name, price FROM product_sizes ORDER BY sort_order, id"
  ).all();
  const sizesByProduct = new Map();
  for (const s of sizes.results) {
    if (!sizesByProduct.has(s.product_id)) sizesByProduct.set(s.product_id, []);
    sizesByProduct.get(s.product_id).push({ id: s.id, name: s.name, price: s.price });
  }
  let rows = products.results;
  if (availableParam === "true") rows = rows.filter((p) => p.available === 1);
  else if (availableParam === "false") rows = rows.filter((p) => p.available === 0);
  return json(rows.map((p) => ({ ...p, sizes: sizesByProduct.get(p.id) || [] })));
}
async function handleAdminListCategories(env) {
  const cats = await env.DB.prepare(
    `SELECT id, name, sort_order, production_unit, allow_all_toppings FROM categories
     ORDER BY CASE production_unit WHEN 'counter' THEN 0 WHEN 'kitchen' THEN 1 ELSE 2 END, sort_order, id`
  ).all();
  const links = await env.DB.prepare("SELECT category_id, product_id FROM category_toppings").all();
  const toppingsByCategory = new Map();
  for (const l of links.results) {
    if (!toppingsByCategory.has(l.category_id)) toppingsByCategory.set(l.category_id, []);
    toppingsByCategory.get(l.category_id).push(l.product_id);
  }
  return json(cats.results.map((c) => ({
    ...c,
    allowed_toppings: toppingsByCategory.get(c.id) || []
  })));
}
async function handleAdminAddTable(env, body) {
  if (!body.name) return json({ message: "name l\xE0 b\u1EAFt bu\u1ED9c" }, 400);
  const existing = await env.DB.prepare("SELECT id FROM tables WHERE name = ?").bind(body.name).first();
  if (existing) return json({ message: "Table name already exists" }, 400);
  const result = await env.DB.prepare(
    "INSERT INTO tables (name, status) VALUES (?, 'empty') RETURNING id"
  ).bind(body.name).first();
  if (!result) return json({ message: "Kh\xF4ng t\u1EA1o \u0111\u01B0\u1EE3c b\xE0n" }, 500);
  await invalidateMenuCaches(env);
  return json({ message: "Table added", id: result.id }, 201);
}
async function handleAdminUpdateDeleteTable(env, tableId, request) {
  const table3 = await env.DB.prepare("SELECT id, name, status FROM tables WHERE id = ?").bind(tableId).first();
  if (!table3) return json({ message: "Table not found" }, 404);
  if (request.method === "DELETE") {
    await env.DB.prepare("DELETE FROM tables WHERE id = ?").bind(tableId).run();
    await invalidateMenuCaches(env);
    return json({ message: "Table deleted" });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const name = body.name ?? table3.name;
  const status = body.status ?? table3.status;
  await env.DB.prepare("UPDATE tables SET name = ?, status = ? WHERE id = ?").bind(name, status, tableId).run();
  await invalidateMenuCaches(env);
  return json({ message: "Table updated" });
}
async function handleOrderHistory(env, tableId = null) {
  let query = `SELECT o.id, o.table_id, o.table_position, o.order_type, o.total, o.status, o.customer_name, o.created_at, t.name as table_name
     FROM orders o LEFT JOIN tables t ON t.id = o.table_id
     WHERE o.status = 'completed'`;
  const params = [];
  if (tableId) {
    query += ` AND o.table_id = ?`;
    params.push(tableId);
  }
  query += ` ORDER BY o.created_at DESC LIMIT ?`;
  params.push(tableId ? 20 : 100);
  const stmt = params.length > 0
    ? env.DB.prepare(query).bind(...params)
    : env.DB.prepare(query);
  const orders = await stmt.all();
  const results = [];
  for (const o of orders.results) {
    const items = await env.DB.prepare(
      `SELECT oi.id, oi.product_id, oi.product_name as name, oi.price, oi.quantity, oi.size_name
       FROM order_items oi WHERE oi.order_id = ?`
    ).bind(o.id).all();
    const itemsOut = [];
    for (const it of items.results) {
      const tops = await env.DB.prepare(
        `SELECT p.name FROM order_item_toppings oit LEFT JOIN products p ON p.id = oit.product_id
         WHERE oit.order_item_id = ?`
      ).bind(it.id).all();
      itemsOut.push({
        name: it.name,
        quantity: it.quantity,
        price: it.price,
        size_name: it.size_name,
        toppings: tops.results.map((t) => t.name).filter((n) => Boolean(n))
      });
    }
    let displayName;
    if (o.table_name) displayName = o.table_name;
    else if (o.order_type === "takeaway") displayName = o.customer_name ? `MV - ${o.customer_name}` : "Order / Mang v\u1EC1";
    else if (o.order_type === "ship") displayName = o.customer_name ? `SHIP - ${o.customer_name}` : "Order / Ship";
    else displayName = "Order / Mang v\u1EC1";
    results.push({
      id: o.id,
      table_name: displayName,
      table_position: o.table_position,
      order_type: o.order_type,
      total_amount: o.total,
      status: o.status,
      created_at: o.created_at ? o.created_at + "Z" : null,
      items: itemsOut
    });
  }
  return json(results);
}
async function handleAdminGetSettings(env) {
  const r = await env.DB.prepare("SELECT key, value FROM settings").all();
  const settings = {};
  for (const row of r.results) {
    try {
      settings[row.key] = JSON.parse(row.value);
    } catch {
      settings[row.key] = row.value;
    }
  }
  const zb = settings["zalo_bot"];
  if (zb && typeof zb === "object") {
    const zbObj = zb;
    const token = typeof zbObj.bot_token === "string" ? zbObj.bot_token : "";
    settings["zalo_bot"] = {
      enabled: Boolean(zbObj.enabled),
      bot_token_masked: token ? token.length < 4 ? "***" : "..." + token.slice(-4) : "",
      group_chat_id: typeof zbObj.group_chat_id === "string" ? zbObj.group_chat_id : "",
      api_base: typeof zbObj.api_base === "string" ? zbObj.api_base : "https://bot-api.zaloplatforms.com"
    };
  }
  const hub = settings["hub"];
  if (hub && typeof hub === "object") {
    const hubObj = hub;
    const key = typeof hubObj.api_key === "string" ? hubObj.api_key : "";
    settings["hub"] = {
      enabled: Boolean(hubObj.enabled),
      url: typeof hubObj.url === "string" ? hubObj.url : "",
      store_id: typeof hubObj.store_id === "string" ? hubObj.store_id : "",
      api_key_masked: key ? key.length < 4 ? "***" : "..." + key.slice(-6) : ""
    };
  }
  return json(settings);
}
async function handleAdminPutSettings(env, request) {
  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  if (body.zalo_bot) {
    const currentRow = await env.DB.prepare("SELECT value FROM settings WHERE key = 'zalo_bot'").first();
    let current = {};
    if (currentRow) {
      try {
        current = JSON.parse(currentRow.value);
      } catch {
        current = {};
      }
    }
    const incoming = body.zalo_bot;
    const merged = {
      ...current,
      enabled: incoming.enabled ?? current.enabled ?? false,
      group_chat_id: incoming.group_chat_id ?? current.group_chat_id ?? "",
      api_base: incoming.api_base ?? current.api_base ?? "https://bot-api.zaloplatforms.com"
    };
    if (incoming.bot_token) {
      merged.bot_token = incoming.bot_token;
    }
    await env.DB.prepare(
      "INSERT INTO settings (key, value) VALUES ('zalo_bot', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    ).bind(JSON.stringify(merged)).run();
  }
  if (body.hub) {
    const currentRow = await env.DB.prepare("SELECT value FROM settings WHERE key = 'hub'").first();
    let current = {};
    if (currentRow) {
      try {
        current = JSON.parse(currentRow.value);
      } catch {
        current = {};
      }
    }
    const incoming = body.hub;
    const merged = {
      ...current,
      enabled: incoming.enabled ?? current.enabled ?? false,
      url: incoming.url ?? current.url ?? "",
      store_id: incoming.store_id ?? current.store_id ?? ""
    };
    if (incoming.api_key) {
      merged.api_key = incoming.api_key;
    }
    await env.DB.prepare(
      "INSERT INTO settings (key, value) VALUES ('hub', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    ).bind(JSON.stringify(merged)).run();
  }
  return json({ message: "Settings updated", ok: true });
}
var UPLOAD_MAX_BYTES = 15e5;
var ALLOWED_IMAGE_TYPES = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp"
};
async function handleAdminUpload(env, request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ message: "Body kh\xF4ng h\u1EE3p l\u1EC7" }, 400);
  }
  if (!body.image) return json({ message: "No selected file" }, 400);
  let raw = body.image;
  let mime = "image/png";
  const dataUrlMatch = raw.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/s);
  if (dataUrlMatch) {
    mime = dataUrlMatch[1];
    raw = dataUrlMatch[2];
  }
  const decoded = atob(raw);
  const bytes = new Uint8Array(decoded.length);
  for (let i = 0; i < decoded.length; i++) bytes[i] = decoded.charCodeAt(i);
  if (bytes.length === 0) return json({ message: "No selected file" }, 400);
  if (bytes.length > UPLOAD_MAX_BYTES) return json({ message: "File qu\xE1 l\u1EDBn (t\u1ED1i \u0111a 1.5MB)" }, 413);
  let detected = mime;
  if (bytes[0] === 137 && bytes[1] === 80) detected = "image/png";
  else if (bytes[0] === 255 && bytes[1] === 216) detected = "image/jpeg";
  else if (bytes[0] === 71 && bytes[1] === 73) detected = "image/gif";
  else if (bytes[0] === 82 && bytes[1] === 73 && bytes[2] === 70 && bytes[3] === 70 && bytes[8] === 87 && bytes[9] === 69 && bytes[10] === 66 && bytes[11] === 80) detected = "image/webp";
  else return json({ message: "Ch\u1EC9 ch\u1EA5p nh\u1EADn file \u1EA3nh (png, jpg, gif, webp)" }, 400);
  const ext = ALLOWED_IMAGE_TYPES[detected] ?? "png";
  const dataUrl = `data:${detected};base64,${btoa(String.fromCharCode(...bytes))}`;
  return json({ url: dataUrl });
}
function parseReportDates(url) {
  const today = (new Date()).toISOString().slice(0, 10);
  const endDate = url.searchParams.get("end_date") || today;
  let startDate = url.searchParams.get("start_date");
  if (!startDate) {
    const end = new Date(endDate + "T00:00:00Z");
    end.setUTCDate(end.getUTCDate() - 6);
    startDate = end.toISOString().slice(0, 10);
  }
  return { startDate, endDate };
}
async function handleReportsStats(env, url) {
  const { startDate, endDate } = parseReportDates(url);
  const revenueRow = await env.DB.prepare(
    `SELECT COALESCE(SUM(total), 0) AS revenue FROM orders
     WHERE status = 'completed' AND substr(created_at, 1, 10) >= ? AND substr(created_at, 1, 10) <= ?`
  ).bind(startDate, endDate).first();
  const countRow = await env.DB.prepare(
    `SELECT COUNT(*) AS cnt FROM orders
     WHERE status = 'completed' AND substr(created_at, 1, 10) >= ? AND substr(created_at, 1, 10) <= ?`
  ).bind(startDate, endDate).first();
  const productsRow = await env.DB.prepare("SELECT COUNT(*) AS cnt FROM products").first();
  return json({
    revenue: revenueRow?.revenue ?? 0,
    orders_count: countRow?.cnt ?? 0,
    total_products: productsRow?.cnt ?? 0
  });
}
async function handleReportsChartData(env, url) {
  const { startDate, endDate } = parseReportDates(url);
  const rows = await env.DB.prepare(
    `SELECT substr(created_at, 1, 10) AS day, SUM(total) AS revenue
     FROM orders
     WHERE status = 'completed' AND substr(created_at, 1, 10) >= ? AND substr(created_at, 1, 10) <= ?
     GROUP BY substr(created_at, 1, 10)`
  ).bind(startDate, endDate).all();
  const byDay = new Map();
  for (const r of rows.results) byDay.set(r.day, r.revenue ?? 0);
  const out = [];
  const cursor = new Date(startDate + "T00:00:00Z");
  const end = new Date(endDate + "T00:00:00Z");
  let guard = 0;
  while (cursor <= end && guard < 400) {
    const day = cursor.toISOString().slice(0, 10);
    const [y, m, d] = day.split("-");
    out.push({ date: `${d}/${m}`, revenue: byDay.get(day) ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    guard++;
  }
  return json(out);
}
async function handleReportsProductSales(env, url) {
  const { startDate, endDate } = parseReportDates(url);
  const rows = await env.DB.prepare(
    `SELECT p.name AS product_name, c.name AS category_name,
            SUM(oi.quantity) AS quantity,
            SUM(oi.price * oi.quantity) AS revenue
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     JOIN products p ON p.id = oi.product_id
     JOIN categories c ON c.id = p.category_id
     WHERE o.status = 'completed' AND substr(o.created_at, 1, 10) >= ? AND substr(o.created_at, 1, 10) <= ?
     GROUP BY p.id
     ORDER BY revenue DESC`
  ).bind(startDate, endDate).all();
  return json(rows.results.map((r) => ({
    product_name: r.product_name,
    category_name: r.category_name,
    quantity: r.quantity,
    revenue: r.revenue ?? 0
  })));
}
async function handleReportsCategorySales(env, url) {
  const { startDate, endDate } = parseReportDates(url);
  const rows = await env.DB.prepare(
    `SELECT c.name AS category_name,
            SUM(oi.quantity) AS quantity,
            SUM(oi.price * oi.quantity) AS revenue
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     JOIN products p ON p.id = oi.product_id
     JOIN categories c ON c.id = p.category_id
     WHERE o.status = 'completed' AND substr(o.created_at, 1, 10) >= ? AND substr(o.created_at, 1, 10) <= ?
     GROUP BY c.id
     ORDER BY revenue DESC`
  ).bind(startDate, endDate).all();
  return json(rows.results.map((r) => ({
    category_name: r.category_name,
    quantity: r.quantity,
    revenue: r.revenue ?? 0
  })));
}
async function invalidateMenuCaches(env) {
  // Hủy cache menu in-memory (dùng khi tạo đơn — tránh đọc lại products/sizes/categories mỗi lần)
  menuDataCache = null;
  const keys = [
    new Request("https://cache/api/menu"),
    new Request("https://cache/api/public/takeaway/menu"),
    new Request("https://cache/api/public/ship/menu")
  ];
  for (const key of keys) {
    try {
      await caches.default.delete(key);
    } catch {
    }
  }
}
async function requireAuth(env, request) {
  const token = extractToken(request);
  if (!token) return { valid: false, error: json({ message: "Thi\u1EBFu token" }, 401) };
  const result = await env.DB.prepare(
    `SELECT u.id, u.username, u.full_name, u.role, s.expires_at
     FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?`
  ).bind(token).first();
  if (!result) return { valid: false, error: json({ message: "Token kh\xF4ng h\u1EE3p l\u1EC7" }, 401) };
  if (new Date(result.expires_at) < new Date()) return { valid: false, error: json({ message: "Token \u0111\xE3 h\u1EBFt h\u1EA1n" }, 401) };
  return { valid: true, user: { id: result.id, username: result.username, full_name: result.full_name, role: result.role } };
}
var worker_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    if (url.pathname === "/api/auth/login" && request.method === "POST") {
      try {
        const body = await request.json();
        return await handleLogin(env, body);
      } catch {
        return json({ message: "Body kh\xF4ng h\u1EE3p l\u1EC7" }, 400);
      }
    }
    if (url.pathname === "/api/auth/verify" && request.method === "GET") {
      const token = extractToken(request);
      if (!token) return json({ valid: false, message: "Thi\u1EBFu token" }, 401);
      try {
        return await handleVerify(env, token);
      } catch (err) {
        return json({ valid: false, message: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/auth/logout" && request.method === "POST") {
      const token = extractToken(request);
      if (!token) return json({ success: false }, 400);
      try {
        return await handleLogout(env, token);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    // Change detection: lightweight key-based polling (reduces D1 query load)
    if (url.pathname === "/api/changes" && request.method === "GET") {
      const auth = await requireAuth(env, request);
      if (!auth.valid) return auth.error;
      try {
        const ctx = url.searchParams.get("ctx") || "all";
        const unit = url.searchParams.get("unit") || "kitchen";
        return await handleChanges(env, ctx, unit);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/health") {
      return json({ ok: true, store: env.STORE_NAME, time: (new Date()).toISOString() });
    }
    if (url.pathname === "/api/menu" && request.method === "GET") {
      const auth = await requireAuth(env, request);
      if (!auth.valid) return auth.error;
      try {
        return await handleMenu(env);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/products" && request.method === "GET") {
      const auth = await requireAuth(env, request);
      if (!auth.valid) return auth.error;
      try {
        return await handleAdminListProducts(env, url.searchParams.get("available"));
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/products/categories" && request.method === "GET") {
      const auth = await requireAuth(env, request);
      if (!auth.valid) return auth.error;
      try {
        return await handleAdminListCategories(env);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/tables" && request.method === "GET") {
      const auth = await requireAuth(env, request);
      if (!auth.valid) return auth.error;
      try {
        return await handleTables(env);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    const payMatch = url.pathname.match(/^\/api\/tables\/(\d+)\/pay$/);
    if (payMatch && request.method === "POST") {
      const auth = await requireAuth(env, request);
      if (!auth.valid) return auth.error;
      try {
        const tableId = parseInt(payMatch[1], 10);
        const body = await request.json();
        return await handlePayTable(env, tableId, body.payment_method ?? "cash", body.table_position ?? null);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/orders") {
      if (request.method === "GET") {
        const auth = await requireAuth(env, request);
        if (!auth.valid) return auth.error;
        try {
          return await handleGetOrders(env);
        } catch (err) {
          return json({ error: String(err) }, 500);
        }
      }
      if (request.method === "POST") {
        const auth = await requireAuth(env, request);
        if (!auth.valid) return auth.error;
        try {
          const body = await request.json();
          return await handleCreateOrder(env, body);
        } catch (err) {
          return json({ error: String(err) }, 400);
        }
      }
    }
    const cashierItemMatch = url.pathname.match(/^\/api\/orders\/(\d+)\/items\/(\d+)$/);
    if (cashierItemMatch && request.method === "DELETE") {
      const auth = await requireAuth(env, request);
      if (!auth.valid) return auth.error;
      try {
        return await handleDeleteCashierItem(env, parseInt(cashierItemMatch[1], 10), parseInt(cashierItemMatch[2], 10));
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (cashierItemMatch && request.method === "PUT") {
      const auth = await requireAuth(env, request);
      if (!auth.valid) return auth.error;
      try {
        const body = await request.json();
        return await handleUpdateCashierItemQuantity(env, parseInt(cashierItemMatch[1], 10), parseInt(cashierItemMatch[2], 10), body);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/tables/transfer" && request.method === "POST") {
      const auth = await requireAuth(env, request);
      if (!auth.valid) return auth.error;
      try {
        const body = await request.json();
        return await handleTransferTable(env, body);
      } catch (err) {
        return json({ error: String(err) }, 400);
      }
    }
    if (url.pathname === "/api/orders/kitchen" && request.method === "GET") {
      const auth = await requireAuth(env, request);
      if (!auth.valid) return auth.error;
      try {
        const unit = url.searchParams.get("unit") || "kitchen";
        return await handleKitchenOrders(env, unit);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/orders/kitchen/count" && request.method === "GET") {
      const auth = await requireAuth(env, request);
      if (!auth.valid) return auth.error;
      try {
        const unit = url.searchParams.get("unit") || "kitchen";
        const countResult = await env.DB.prepare(
          `SELECT COUNT(DISTINCT oi.order_id) AS cnt
           FROM order_items oi
           JOIN products p ON p.id = oi.product_id
           JOIN orders o ON o.id = oi.order_id
           WHERE oi.status != 'completed' AND o.status = 'pending' AND p.production_unit = ?`
        ).bind(unit).first();
        return json({ count: countResult?.cnt ?? 0 });
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/orders/kitchen/cancellation-events" && request.method === "GET") {
      const auth = await requireAuth(env, request);
      if (!auth.valid) return auth.error;
      try {
        const unit = url.searchParams.get("unit") || "kitchen";
        const hours = parseInt(url.searchParams.get("hours") || "12", 10);
        return await handleKitchenCancellationEvents(env, unit, hours);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    const itemStatusMatch = url.pathname.match(/^\/api\/admin\/order-items\/(\d+)\/status$/);
    if (itemStatusMatch && request.method === "PUT") {
      const auth = await requireAuth(env, request);
      if (!auth.valid) return auth.error;
      try {
        const body = await request.json();
        return await handleUpdateItemStatus(env, parseInt(itemStatusMatch[1], 10), body.status ?? "");
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    // Phase 5b: batch kitchen sync endpoint
    if (url.pathname === "/api/sync/kitchen-batch" && request.method === "POST") {
      const auth = await requireAuth(env, request);
      if (!auth.valid) return auth.error;
      try {
        const body = await request.json();
        return await handleKitchenBatchSync(env, body.changes || []);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    const publicMenuMatch = url.pathname.match(/^\/api\/public\/menu\/(\d+)$/);
    if (publicMenuMatch && request.method === "GET") {
      try {
        return await withCache(
          request,
          60,
          30,
          () => handlePublicMenu(env, parseInt(publicMenuMatch[1], 10))
        );
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    const tableStateMatch = url.pathname.match(/^\/api\/public\/table-state\/(\d+)$/);
    if (tableStateMatch && request.method === "GET") {
      try {
        return await withCache(
          request,
          5,
          5,
          () => handlePublicTableState(env, parseInt(tableStateMatch[1], 10))
        );
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    const itemsMatch = url.pathname.match(/^\/api\/public\/items\/(\d+)$/);
    if (itemsMatch && request.method === "GET") {
      try {
        return await handlePublicItems(env, parseInt(itemsMatch[1], 10));
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/public/orders" && request.method === "POST") {
      try {
        const body = await request.json();
        return await handleCreatePublicOrder(env, body);
      } catch (err) {
        return json({ error: String(err) }, 400);
      }
    }
    const itemMatch = url.pathname.match(/^\/api\/public\/orders\/(\d+)\/items\/(\d+)$/);
    if (itemMatch && request.method === "DELETE") {
      try {
        return await handleDeletePublicItem(env, parseInt(itemMatch[1], 10), parseInt(itemMatch[2], 10));
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (itemMatch && request.method === "PUT") {
      try {
        const body = await request.json();
        return await handleUpdatePublicItemQuantity(env, parseInt(itemMatch[1], 10), parseInt(itemMatch[2], 10), body);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/public/call-staff" && request.method === "POST") {
      try {
        const body = await request.json();
        return await handlePublicCallStaff(env, body);
      } catch (err) {
        return json({ error: String(err) }, 400);
      }
    }
    if (url.pathname === "/api/staff-calls" && request.method === "GET") {
      const auth = await requireAuth(env, request);
      if (!auth.valid) return auth.error;
      try {
        return await handleGetStaffCalls(env);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    const staffCallResolveMatch = url.pathname.match(/^\/api\/staff-calls\/(\d+)\/resolve$/);
    if (staffCallResolveMatch && request.method === "POST") {
      const auth = await requireAuth(env, request);
      if (!auth.valid) return auth.error;
      try {
        return await handleResolveStaffCall(env, parseInt(staffCallResolveMatch[1], 10));
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/takeaway" && request.method === "GET") {
      const auth = await requireAuth(env, request);
      if (!auth.valid) return auth.error;
      try {
        return await handleCashierTakeawayList(env, url.searchParams.get("status"));
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    const takeawayCompleteMatch = url.pathname.match(/^\/api\/takeaway\/(\d+)\/complete$/);
    if (takeawayCompleteMatch && request.method === "POST") {
      const auth = await requireAuth(env, request);
      if (!auth.valid) return auth.error;
      try {
        const body = await request.json();
        return await handleCashierTakeawayComplete(env, parseInt(takeawayCompleteMatch[1], 10), body);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/settings" && request.method === "GET") {
      try {
        return await handleGetSettings(env);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/public/takeaway/menu" && request.method === "GET") {
      try {
        return await withCache(request, 60, 30, () => handleTakeawayMenu(env));
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/public/takeaway/orders" && request.method === "POST") {
      try {
        const body = await request.json();
        return await handleCreateTakeawayOrder(env, body);
      } catch (err) {
        return json({ error: String(err) }, 400);
      }
    }
    const takeawayItemsMatch = url.pathname.match(/^\/api\/public\/takeaway\/items\/([^/]+)$/);
    if (takeawayItemsMatch && request.method === "GET") {
      try {
        return await handleTakeawayItems(env, decodeURIComponent(takeawayItemsMatch[1]));
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    const takeawayItemMatch = url.pathname.match(/^\/api\/public\/takeaway\/orders\/(\d+)\/items\/(\d+)$/);
    if (takeawayItemMatch && request.method === "DELETE") {
      try {
        const clientId = url.searchParams.get("client_id");
        return await handleDeleteTakeawayItem(
          env,
          parseInt(takeawayItemMatch[1], 10),
          parseInt(takeawayItemMatch[2], 10),
          clientId
        );
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (takeawayItemMatch && request.method === "PUT") {
      try {
        const body = await request.json();
        const clientId = url.searchParams.get("client_id");
        return await handleUpdateTakeawayItemQuantity(
          env,
          parseInt(takeawayItemMatch[1], 10),
          parseInt(takeawayItemMatch[2], 10),
          clientId,
          body
        );
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/public/ship/menu" && request.method === "GET") {
      try {
        return await withCache(request, 60, 30, () => handleShipMenu(env));
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/public/ship/orders" && request.method === "POST") {
      try {
        const body = await request.json();
        return await handleCreateShipOrder(env, body, ctx);
      } catch (err) {
        return json({ error: String(err) }, 400);
      }
    }
    const shipItemsMatch = url.pathname.match(/^\/api\/public\/ship\/items\/([^/]+)$/);
    if (shipItemsMatch && request.method === "GET") {
      try {
        return await handleShipItems(env, decodeURIComponent(shipItemsMatch[1]));
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    const shipItemMatch = url.pathname.match(/^\/api\/public\/ship\/orders\/(\d+)\/items\/(\d+)$/);
    if (shipItemMatch && request.method === "DELETE") {
      try {
        const clientId = url.searchParams.get("client_id");
        return await handleDeleteShipItem(
          env,
          parseInt(shipItemMatch[1], 10),
          parseInt(shipItemMatch[2], 10),
          clientId
        );
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (shipItemMatch && request.method === "PUT") {
      try {
        const body = await request.json();
        const clientId = url.searchParams.get("client_id");
        return await handleUpdateShipItemQuantity(
          env,
          parseInt(shipItemMatch[1], 10),
          parseInt(shipItemMatch[2], 10),
          clientId,
          body
        );
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/public/ship-orders" && request.method === "GET") {
      try {
        return await handleGetShipOrders(env);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/public/ship-orders/transfer" && request.method === "GET") {
      try {
        return await handleGetTransferOrders(env);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    const shipperPayCashMatch = url.pathname.match(/^\/api\/public\/ship-orders\/(\d+)\/pay-cash$/);
    if (shipperPayCashMatch && request.method === "POST") {
      try {
        return await handlePayCashShipOrder(env, parseInt(shipperPayCashMatch[1], 10));
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    const shipperPayTransferMatch = url.pathname.match(/^\/api\/public\/ship-orders\/(\d+)\/pay-transfer$/);
    if (shipperPayTransferMatch && request.method === "POST") {
      try {
        return await handlePayTransferShipOrder(env, parseInt(shipperPayTransferMatch[1], 10));
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    const shipperConfirmTransferMatch = url.pathname.match(/^\/api\/public\/ship-orders\/(\d+)\/confirm-transfer$/);
    if (shipperConfirmTransferMatch && request.method === "POST") {
      try {
        return await handleConfirmTransferShipOrder(env, parseInt(shipperConfirmTransferMatch[1], 10));
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/admin/users" && request.method === "GET") {
      const auth = await requireAuth(env, request);
      const denied = requireRole(auth, ["admin"]);
      if (denied) return denied;
      try {
        return await handleAdminGetUsers(env);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/admin/users" && request.method === "POST") {
      const auth = await requireAuth(env, request);
      const denied = requireRole(auth, ["admin"]);
      if (denied) return denied;
      try {
        const body = await request.json();
        return await handleAdminAddUser(env, body);
      } catch (err) {
        return json({ error: String(err) }, 400);
      }
    }
    const adminUserMatch = url.pathname.match(/^\/api\/admin\/users\/(\d+)$/);
    if (adminUserMatch && (request.method === "PUT" || request.method === "DELETE")) {
      const auth = await requireAuth(env, request);
      const denied = requireRole(auth, ["admin"]);
      if (denied) return denied;
      try {
        return await handleAdminUpdateDeleteUser(env, parseInt(adminUserMatch[1], 10), request);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/admin/products" && request.method === "POST") {
      const auth = await requireAuth(env, request);
      const denied = requireRole(auth, ["admin"]);
      if (denied) return denied;
      try {
        const body = await request.json();
        return await handleAdminAddProduct(env, body);
      } catch (err) {
        return json({ error: String(err) }, 400);
      }
    }
    const adminProductMatch = url.pathname.match(/^\/api\/admin\/products\/(\d+)$/);
    if (adminProductMatch && (request.method === "PUT" || request.method === "DELETE")) {
      const auth = await requireAuth(env, request);
      const denied = requireRole(auth, ["admin"]);
      if (denied) return denied;
      try {
        return await handleAdminUpdateDeleteProduct(env, parseInt(adminProductMatch[1], 10), request);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    const adminProductSizeMatch = url.pathname.match(/^\/api\/admin\/products\/(\d+)\/sizes$/);
    if (adminProductSizeMatch && request.method === "POST") {
      const auth = await requireAuth(env, request);
      const denied = requireRole(auth, ["admin"]);
      if (denied) return denied;
      try {
        const body = await request.json();
        return await handleAdminAddProductSize(env, parseInt(adminProductSizeMatch[1], 10), body);
      } catch (err) {
        return json({ error: String(err) }, 400);
      }
    }
    const adminSizeMatch = url.pathname.match(/^\/api\/admin\/products\/sizes\/(\d+)$/);
    if (adminSizeMatch && request.method === "DELETE") {
      const auth = await requireAuth(env, request);
      const denied = requireRole(auth, ["admin"]);
      if (denied) return denied;
      try {
        return await handleAdminDeleteProductSize(env, parseInt(adminSizeMatch[1], 10));
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/admin/categories" && request.method === "POST") {
      const auth = await requireAuth(env, request);
      const denied = requireRole(auth, ["admin"]);
      if (denied) return denied;
      try {
        const body = await request.json();
        return await handleAdminAddCategory(env, body);
      } catch (err) {
        return json({ error: String(err) }, 400);
      }
    }
    const adminCategoryMatch = url.pathname.match(/^\/api\/admin\/categories\/(\d+)$/);
    if (adminCategoryMatch && (request.method === "PUT" || request.method === "DELETE")) {
      const auth = await requireAuth(env, request);
      const denied = requireRole(auth, ["admin"]);
      if (denied) return denied;
      try {
        return await handleAdminUpdateDeleteCategory(env, parseInt(adminCategoryMatch[1], 10), request);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/admin/categories/reorder" && request.method === "PUT") {
      const auth = await requireAuth(env, request);
      const denied = requireRole(auth, ["admin"]);
      if (denied) return denied;
      try {
        const body = await request.json();
        return await handleAdminReorderCategories(env, body);
      } catch (err) {
        return json({ error: String(err) }, 400);
      }
    }
    if (url.pathname === "/api/admin/tables" && request.method === "POST") {
      const auth = await requireAuth(env, request);
      const denied = requireRole(auth, ["admin"]);
      if (denied) return denied;
      try {
        const body = await request.json();
        return await handleAdminAddTable(env, body);
      } catch (err) {
        return json({ error: String(err) }, 400);
      }
    }
    const adminTableMatch = url.pathname.match(/^\/api\/admin\/tables\/(\d+)$/);
    if (adminTableMatch && (request.method === "PUT" || request.method === "DELETE")) {
      const auth = await requireAuth(env, request);
      const denied = requireRole(auth, ["admin"]);
      if (denied) return denied;
      try {
        return await handleAdminUpdateDeleteTable(env, parseInt(adminTableMatch[1], 10), request);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/admin/upload" && request.method === "POST") {
      const auth = await requireAuth(env, request);
      const denied = requireRole(auth, ["admin"]);
      if (denied) return denied;
      try {
        return await handleAdminUpload(env, request);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/admin/settings" && request.method === "GET") {
      const auth = await requireAuth(env, request);
      const denied = requireRole(auth, ["admin"]);
      if (denied) return denied;
      try {
        return await handleAdminGetSettings(env);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/admin/settings" && request.method === "PUT") {
      const auth = await requireAuth(env, request);
      const denied = requireRole(auth, ["admin"]);
      if (denied) return denied;
      try {
        return await handleAdminPutSettings(env, request);
      } catch (err) {
        return json({ error: String(err) }, 400);
      }
    }
    if (url.pathname === "/api/admin/zalo-bot/test" && request.method === "POST") {
      const auth = await requireAuth(env, request);
      const denied = requireRole(auth, ["admin"]);
      if (denied) return denied;
      try {
        return await handleZaloBotTest(env);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/orders/history" && request.method === "GET") {
      const auth = await requireAuth(env, request);
      if (!auth.valid) return auth.error;
      try {
        const tableId = url.searchParams.get("table_id");
        return await handleOrderHistory(env, tableId ? Number(tableId) : null);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/settings" && request.method === "POST") {
      const auth = await requireAuth(env, request);
      const denied = requireRole(auth, ["admin"]);
      if (denied) return denied;
      try {
        const body = await request.json();
        for (const [key, value] of Object.entries(body)) {
          await env.DB.prepare(
            "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
          ).bind(key, JSON.stringify(value ?? null)).run();
        }
        return await handleGetSettings(env);
      } catch (err) {
        return json({ error: String(err) }, 400);
      }
    }
    if (url.pathname === "/api/reports/stats" && request.method === "GET") {
      const auth = await requireAuth(env, request);
      const denied = requireRole(auth, ["admin"]);
      if (denied) return denied;
      try {
        return await handleReportsStats(env, url);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/reports/chart-data" && request.method === "GET") {
      const auth = await requireAuth(env, request);
      const denied = requireRole(auth, ["admin"]);
      if (denied) return denied;
      try {
        return await handleReportsChartData(env, url);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/reports/product-sales" && request.method === "GET") {
      const auth = await requireAuth(env, request);
      const denied = requireRole(auth, ["admin"]);
      if (denied) return denied;
      try {
        return await handleReportsProductSales(env, url);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    if (url.pathname === "/api/reports/category-sales" && request.method === "GET") {
      const auth = await requireAuth(env, request);
      const denied = requireRole(auth, ["admin"]);
      if (denied) return denied;
      try {
        return await handleReportsCategorySales(env, url);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }
    // ================= HUB SYNC (multi-store) =================
    // Trung tâm nhận data từ các quán (orders/catalog push lên).
    // Auth: Bearer <api_key của store> cho push/ping; Bearer admin session
    // cho quản lý stores + report.
    if (url.pathname === "/api/hub/stores" && request.method === "POST") {
      const auth = await requireAuth(env, request);
      const denied = requireRole(auth, ["admin"]);
      if (denied) return denied;
      try {
        const body = await request.json();
        return await handleHubCreateStore(env, body);
      } catch (err) {
        return json({ error: String(err) }, 400);
      }
    }
    if (url.pathname === "/api/hub/stores" && request.method === "GET") {
      const auth = await requireAuth(env, request);
      const denied = requireRole(auth, ["admin"]);
      if (denied) return denied;
      return await handleHubListStores(env);
    }
    if (url.pathname === "/api/hub/ping" && request.method === "GET") {
      const store = await requireHubStore(env, request);
      if (!store) return json({ message: "Sai hub key" }, 401);
      return json({ ok: true, store_id: store.store_id, name: store.name });
    }
    if (url.pathname === "/api/hub/push" && request.method === "POST") {
      const store = await requireHubStore(env, request);
      if (!store) return json({ message: "Sai hub key" }, 401);
      try {
        const body = await request.json();
        return await handleHubPush(env, store.store_id, body);
      } catch (err) {
        return json({ error: String(err) }, 400);
      }
    }
    if (url.pathname === "/api/hub/report" && request.method === "GET") {
      const auth = await requireAuth(env, request);
      const denied = requireRole(auth, ["admin"]);
      if (denied) return denied;
      return await handleHubReport(env, url.searchParams.get("date"));
    }

    const assetResp = await env.ASSETS.fetch(request);
    if (assetResp.status === 404 && !url.pathname.startsWith("/api/")) {
      const indexResp = await env.ASSETS.fetch(new Request(new URL("/index.html", url)));
      if (indexResp.ok) return indexResp;
    }
    return assetResp;
  }
};

// ================= HUB SYNC handlers =================

async function ensureHubSchema(env) {
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS hub_stores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      store_id TEXT UNIQUE NOT NULL,
      name TEXT,
      api_key TEXT NOT NULL,
      last_sync_at TEXT,
      last_sync_detail TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  ).run();
  // Migrate DB cũ: ALTER thiếu cột (bỏ qua lỗi nếu đã có)
  for (const col of ["last_sync_at TEXT", "last_sync_detail TEXT"]) {
    try {
      await env.DB.prepare(`ALTER TABLE hub_stores ADD COLUMN ${col}`).run();
    } catch {}
  }
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS hub_orders (
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
    )`
  ).run();
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS hub_products (
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
    )`
  ).run();
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS hub_categories (
      store_id TEXT NOT NULL,
      local_id INTEGER NOT NULL,
      name TEXT,
      sort_order INTEGER,
      production_unit TEXT,
      UNIQUE(store_id, local_id)
    )`
  ).run();
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS hub_tables (
      store_id TEXT NOT NULL,
      local_id INTEGER NOT NULL,
      name TEXT,
      seats INTEGER,
      UNIQUE(store_id, local_id)
    )`
  ).run();
}

async function requireHubStore(env, request) {
  await ensureHubSchema(env);
  const auth = request.headers.get("Authorization") || "";
  const key = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!key) return null;
  return await env.DB.prepare(
    "SELECT store_id, name FROM hub_stores WHERE api_key = ?"
  ).bind(key).first();
}

function hubApiKey() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return "hub_" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function handleHubCreateStore(env, body) {
  await ensureHubSchema(env);
  const storeId = String(body?.store_id || "").trim();
  const name = String(body?.name || storeId).trim();
  if (!storeId) return json({ message: "Thieu store_id" }, 400);
  const apiKey = hubApiKey();
  await env.DB.prepare(
    `INSERT INTO hub_stores (store_id, name, api_key) VALUES (?, ?, ?)
     ON CONFLICT(store_id) DO UPDATE SET name = excluded.name, api_key = excluded.api_key`
  ).bind(storeId, name, apiKey).run();
  return json({ ok: true, store_id: storeId, name, api_key: apiKey });
}

async function handleHubListStores(env) {
  await ensureHubSchema(env);
  const r = await env.DB.prepare(
    "SELECT store_id, name, api_key, last_sync_at, last_sync_detail, created_at FROM hub_stores ORDER BY store_id"
  ).all();
  const stores = (r.results || []).map((s) => ({
    ...s,
    api_key: s.api_key ? "..." + String(s.api_key).slice(-6) : "",
  }));
  return json({ stores });
}

async function handleHubPush(env, storeId, body) {
  await ensureHubSchema(env);
  const now = new Date().toISOString();
  let orders = 0, products = 0, categories = 0, tables = 0;

  const orderRows = Array.isArray(body?.orders) ? body.orders : [];
  for (const o of orderRows) {
    if (o?.local_id == null) continue;
    await env.DB.prepare(
      `INSERT INTO hub_orders (store_id, local_id, display_code, order_type, status,
        table_name, customer_phone, total, paid_at, created_at, updated_at, items_json, synced_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(store_id, local_id) DO UPDATE SET
        display_code=excluded.display_code, order_type=excluded.order_type,
        status=excluded.status, table_name=excluded.table_name,
        customer_phone=excluded.customer_phone, total=excluded.total,
        paid_at=excluded.paid_at, updated_at=excluded.updated_at,
        items_json=excluded.items_json, synced_at=excluded.synced_at`
    ).bind(
      storeId, o.local_id, o.display_code || null, o.order_type || "dine_in",
      o.status || "open", o.table_name || null, o.customer_phone || null,
      o.total || 0, o.paid_at || null, o.created_at || null, o.updated_at || null,
      JSON.stringify(o.items || []), now
    ).run();
    orders++;
  }

  const catRows = Array.isArray(body?.categories) ? body.categories : [];
  const catIds = [];
  for (const c of catRows) {
    if (c?.local_id == null) continue;
    catIds.push(c.local_id);
    await env.DB.prepare(
      `INSERT INTO hub_categories (store_id, local_id, name, sort_order, production_unit)
       VALUES (?,?,?,?,?)
       ON CONFLICT(store_id, local_id) DO UPDATE SET
        name=excluded.name, sort_order=excluded.sort_order, production_unit=excluded.production_unit`
    ).bind(storeId, c.local_id, c.name || "", c.sort_order || 0, c.production_unit || "counter").run();
    categories++;
  }

  const prodRows = Array.isArray(body?.products) ? body.products : [];
  const prodIds = [];
  for (const p of prodRows) {
    if (p?.local_id == null) continue;
    prodIds.push(p.local_id);
    await env.DB.prepare(
      `INSERT INTO hub_products (store_id, local_id, name, price, category, available, production_unit, sizes_json, synced_at)
       VALUES (?,?,?,?,?,?,?,?,?)
       ON CONFLICT(store_id, local_id) DO UPDATE SET
        name=excluded.name, price=excluded.price, category=excluded.category,
        available=excluded.available, production_unit=excluded.production_unit,
        sizes_json=excluded.sizes_json, synced_at=excluded.synced_at`
    ).bind(
      storeId, p.local_id, p.name || "", p.price || 0, p.category || null,
      p.available ? 1 : 0, p.production_unit || "counter",
      JSON.stringify(p.sizes || []), now
    ).run();
    products++;
  }

  const tableRows = Array.isArray(body?.tables) ? body.tables : [];
  const tableIds = [];
  for (const t of tableRows) {
    if (t?.local_id == null) continue;
    tableIds.push(t.local_id);
    await env.DB.prepare(
      `INSERT INTO hub_tables (store_id, local_id, name, seats)
       VALUES (?,?,?,?)
       ON CONFLICT(store_id, local_id) DO UPDATE SET name=excluded.name, seats=excluded.seats`
    ).bind(storeId, t.local_id, t.name || "", t.seats || 0).run();
    tables++;
  }

  // Xoá catalog bị xoá ở quán (replace semantics) — chỉ khi payload gửi full list
  if (body?.full_catalog) {
    const wipeNotIn = async (table, ids) => {
      if (!ids.length) {
        await env.DB.prepare(`DELETE FROM ${table} WHERE store_id = ?`).bind(storeId).run();
      } else {
        await env.DB.prepare(
          `DELETE FROM ${table} WHERE store_id = ? AND local_id NOT IN (${ids.map(() => "?").join(",")})`
        ).bind(storeId, ...ids).run();
      }
    };
    await wipeNotIn("hub_categories", catIds);
    await wipeNotIn("hub_products", prodIds);
    await wipeNotIn("hub_tables", tableIds);
  }

  await env.DB.prepare(
    "UPDATE hub_stores SET last_sync_at = ?, last_sync_detail = ? WHERE store_id = ?"
  ).bind(now, `${orders} đơn, ${products} món, ${categories} danh mục, ${tables} bàn`, storeId).run();

  return json({ ok: true, received: { orders, products, categories, tables } });
}

async function handleHubReport(env, date) {
  await ensureHubSchema(env);
  const day = date || new Date().toISOString().slice(0, 10);
  const stores = await env.DB.prepare(
    "SELECT store_id, name, last_sync_at, last_sync_detail FROM hub_stores ORDER BY store_id"
  ).all();
  const perStore = await env.DB.prepare(
    `SELECT store_id,
       COUNT(*) AS orders_count,
       SUM(CASE WHEN status = 'completed' OR status = 'paid' THEN total ELSE 0 END) AS revenue
     FROM hub_orders
     WHERE substr(created_at, 1, 10) = ?
     GROUP BY store_id`
  ).bind(day).all();
  const totals = await env.DB.prepare(
    `SELECT store_id, COUNT(*) AS orders_count,
       SUM(CASE WHEN status = 'completed' OR status = 'paid' THEN total ELSE 0 END) AS revenue
     FROM hub_orders GROUP BY store_id`
  ).all();
  return json({
    date: day,
    stores: stores.results || [],
    today: perStore.results || [],
    all_time: totals.results || [],
  });
}

export default worker_default;
