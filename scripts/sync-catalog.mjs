// Đồng bộ catalog (bàn, danh mục, sản phẩm+sizes, topping links, ảnh) từ POS cũ sang POS mới.
// Chạy: node scripts/sync-catalog.mjs <pos-cu> <pos-moi>
const OLD = (process.argv[2] || "https://daoche.itask.vn").replace(/\/$/, "");
const NEW = (process.argv[3] || "https://quan.itask.vn").replace(/\/$/, "");
const CRED = { username: "admin", password: "admin123" };

async function login(base) {
  const res = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(CRED),
  });
  const d = await res.json();
  if (!d.access_token) throw new Error(`Login ${base} thất bại: ${JSON.stringify(d)}`);
  return d.access_token;
}

async function api(base, token, path, method = "GET", body, retry = 4) {
  for (let i = 0; i < retry; i++) {
    try {
      const res = await fetch(`${base}${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const text = await res.text();
      let d;
      try { d = JSON.parse(text); } catch { d = text; }
      return { status: res.status, data: d };
    } catch (e) {
      if (i === retry - 1) return { status: 0, data: String(e) };
      await new Promise((s) => setTimeout(s, 2000 * (i + 1)));
    }
  }
}

// Tải ảnh từ POS cũ → upload sang POS mới, trả URL mới
async function migrateImage(imageUrl, oldToken, newToken, cache) {
  if (!imageUrl) return null;
  if (imageUrl.startsWith("data:") || /^https?:\/\//.test(imageUrl)) {
    // URL ngoài (unsplash...) hoặc data URL — giữ nguyên
    if (/^https?:\/\//.test(imageUrl) && !imageUrl.startsWith(OLD)) return imageUrl;
    if (imageUrl.startsWith("data:")) return imageUrl;
  }
  if (cache.has(imageUrl)) return cache.get(imageUrl);
  const src = imageUrl.startsWith("http") ? imageUrl : `${OLD}${imageUrl}`;
  let imgRes = null;
  for (let i = 0; i < 4; i++) {
    try { imgRes = await fetch(src); break; } catch (e) {
      if (i === 3) { console.log(`  ! Không tải được ảnh ${src} (${e.message})`); cache.set(imageUrl, imageUrl); return imageUrl; }
      await new Promise((s) => setTimeout(s, 2000 * (i + 1)));
    }
  }
  if (!imgRes.ok) { console.log(`  ! Không tải được ảnh ${src} (${imgRes.status})`); cache.set(imageUrl, imageUrl); return imageUrl; }
  const buf = Buffer.from(await imgRes.arrayBuffer());
  const { status, data } = await api(NEW, newToken, "/api/admin/upload", "POST", {
    image: buf.toString("base64"),
    filename: imageUrl.split("/").pop() || "image.jpg",
  });
  const newUrl = status === 200 && data.url ? data.url : imageUrl;
  if (!data.url) console.log(`  ! Upload ảnh ${imageUrl} lỗi: ${JSON.stringify(data).slice(0, 120)}`);
  cache.set(imageUrl, newUrl);
  return newUrl;
}

const oldToken = await login(OLD);
const newToken = await login(NEW);
console.log("Đăng nhập OK cả hai POS");

// 1. Đọc dữ liệu POS cũ
const [catsOld, prodsOld, tablesOld] = await Promise.all([
  api(OLD, oldToken, "/api/products/categories"),
  api(OLD, oldToken, "/api/products"),
  api(OLD, oldToken, "/api/tables"),
]);
const categories = catsOld.data || [];
const products = prodsOld.data || [];
const tables = (tablesOld.data?.tables || tablesOld.data || []);
console.log(`POS cũ: ${categories.length} danh mục, ${products.length} sản phẩm, ${tables.length} bàn`);

// 2. Xóa catalog POS mới (products trước — category không xóa được khi còn product)
const [catsNew, prodsNew, tablesNew] = await Promise.all([
  api(NEW, newToken, "/api/products/categories"),
  api(NEW, newToken, "/api/products"),
  api(NEW, newToken, "/api/tables"),
]);
let delErr = 0;
for (const p of prodsNew.data || []) {
  const r = await api(NEW, newToken, `/api/admin/products/${p.id}`, "DELETE");
  if (r.status >= 400) { delErr++; console.log(`  ! Xóa product ${p.id} "${p.name}": ${JSON.stringify(r.data).slice(0, 100)}`); }
}
for (const c of catsNew.data || []) {
  const r = await api(NEW, newToken, `/api/admin/categories/${c.id}`, "DELETE");
  if (r.status >= 400) { delErr++; console.log(`  ! Xóa category ${c.id} "${c.name}": ${JSON.stringify(r.data).slice(0, 100)}`); }
}
const tablesNewList = tablesNew.data?.tables || tablesNew.data || [];
for (const t of tablesNewList) {
  const r = await api(NEW, newToken, `/api/admin/tables/${t.id}`, "DELETE");
  if (r.status >= 400) { delErr++; console.log(`  ! Xóa table ${t.id} "${t.name}": ${JSON.stringify(r.data).slice(0, 100)}`); }
}
console.log(`Đã xóa catalog POS mới (${delErr} lỗi)`);

// 3. Tạo lại categories → map id cũ → mới
const catMap = new Map();
for (const c of categories) {
  const r = await api(NEW, newToken, "/api/admin/categories", "POST", {
    name: c.name,
    sort_order: c.sort_order,
    production_unit: c.production_unit || "kitchen",
    allow_all_toppings: !!c.allow_all_toppings,
  });
  if (r.status === 201 && r.data.id) {
    catMap.set(c.id, r.data.id);
  } else {
    console.log(`  ! Tạo category "${c.name}": ${JSON.stringify(r.data).slice(0, 120)}`);
  }
}
console.log(`Tạo ${catMap.size}/${categories.length} danh mục`);

// 4. Tạo products + sizes (ảnh migrate nếu là file /pos-uploads/ của POS cũ)
const imgCache = new Map();
const prodMap = new Map();
let prodOk = 0;
for (const p of products) {
  const newCatId = catMap.get(p.category_id);
  if (!newCatId && !p.is_topping) {
    console.log(`  ! Bỏ qua "${p.name}" — category ${p.category_id} không có`);
    continue;
  }
  const imageUrl = await migrateImage(p.image_url, oldToken, newToken, imgCache);
  const r = await api(NEW, newToken, "/api/admin/products", "POST", {
    name: p.name,
    price: p.price,
    category_id: newCatId || catMap.values().next().value,
    image_url: imageUrl,
    available: !!p.available,
    production_unit: p.production_unit || "kitchen",
    is_topping: !!p.is_topping,
  });
  if (r.status === 201 && r.data.id) {
    prodMap.set(p.id, r.data.id);
    prodOk++;
    for (const s of p.sizes || []) {
      await api(NEW, newToken, `/api/admin/products/${r.data.id}/sizes`, "POST", {
        name: s.name, price: s.price,
      });
    }
  } else {
    console.log(`  ! Tạo product "${p.name}": ${JSON.stringify(r.data).slice(0, 120)}`);
  }
}
console.log(`Tạo ${prodOk}/${products.length} sản phẩm (${imgCache.size} ảnh đã migrate)`);

// 5. Gán lại topping links cho categories (PUT topping_ids đã map)
for (const c of categories) {
  const newCatId = catMap.get(c.id);
  if (!newCatId) continue;
  const toppingIds = (c.allowed_toppings || []).map((id) => prodMap.get(id)).filter(Boolean);
  if (toppingIds.length) {
    await api(NEW, newToken, `/api/admin/categories/${newCatId}`, "PUT", { topping_ids: toppingIds });
  }
}

// 6. Tạo tables
let tblOk = 0;
for (const t of tables) {
  // Giữ nguyên id từ POS nguồn — QR/đơn public gắn theo table_id
  const r = await api(NEW, newToken, "/api/admin/tables", "POST", { name: t.name, id: t.id });
  if (r.status === 201) tblOk++;
  else console.log(`  ! Tạo bàn "${t.name}": ${JSON.stringify(r.data).slice(0, 120)}`);
}
console.log(`Tạo ${tblOk}/${tables.length} bàn`);
console.log("HOÀN TẤT");
