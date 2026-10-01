// Repair pass sau sync-catalog.mjs bị ngắt: tạo SP còn thiếu, tạo bàn,
// sửa ảnh còn trỏ domain cũ, gán topping links.
// Chạy: node scripts/repair-catalog.mjs <pos-cu> <pos-moi>
const OLD = (process.argv[2] || "https://chehue3.itask.vn").replace(/\/$/, "");
const NEW = (process.argv[3] || "https://chehue2.itask.vn").replace(/\/$/, "");
const CRED = { username: "admin", password: "admin123" };

async function login(base) {
  const r = await fetch(`${base}/api/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(CRED),
  });
  return (await r.json()).access_token;
}
async function api(base, token, path, method = "GET", body, retry = 3) {
  for (let i = 0; i < retry; i++) {
    try {
      const r = await fetch(`${base}${path}`, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: body ? JSON.stringify(body) : undefined,
      });
      const t = await r.text();
      let d; try { d = JSON.parse(t); } catch { d = t; }
      return { status: r.status, data: d };
    } catch (e) {
      if (i === retry - 1) return { status: 0, data: String(e) };
      await new Promise((s) => setTimeout(s, 2000 * (i + 1)));
    }
  }
}
async function getJson(url, retry = 3) {
  for (let i = 0; i < retry; i++) {
    try { return await fetch(url); } catch (e) {
      if (i === retry - 1) throw e;
      await new Promise((s) => setTimeout(s, 2000 * (i + 1)));
    }
  }
}

const ot = await login(OLD), nt = await login(NEW);
const [oc, op, otRes, bc, bp, btRes] = await Promise.all([
  api(OLD, ot, "/api/products/categories"), api(OLD, ot, "/api/products"), api(OLD, ot, "/api/tables"),
  api(NEW, nt, "/api/products/categories"), api(NEW, nt, "/api/products"), api(NEW, nt, "/api/tables"),
]);
const oldCats = oc.data || [], newCats = bc.data || [];
const catByName = new Map(newCats.map((c) => [c.name, c.id]));
const imgCache = new Map();

async function migrateImage(imageUrl) {
  if (!imageUrl || imageUrl.startsWith("data:")) return imageUrl;
  if (/^https?:\/\//.test(imageUrl) && !imageUrl.startsWith(OLD)) return imageUrl;
  if (imageUrl.startsWith("/pos-uploads/")) return imageUrl; // đã là file trên máy mới
  if (imgCache.has(imageUrl)) return imgCache.get(imageUrl);
  const src = imageUrl.startsWith("http") ? imageUrl : `${OLD}${imageUrl}`;
  const res = await getJson(src);
  if (!res.ok) { console.log("  ! Ảnh nguồn lỗi", src, res.status); imgCache.set(imageUrl, imageUrl); return imageUrl; }
  const buf = Buffer.from(await res.arrayBuffer());
  const r = await api(NEW, nt, "/api/admin/upload", "POST", {
    image: buf.toString("base64"), filename: imageUrl.split("/").pop() || "img.jpg",
  });
  const url = r.status === 200 && r.data.url ? r.data.url : imageUrl;
  if (!r.data.url) console.log("  ! Upload ảnh lỗi", imageUrl, String(r.data).slice(0, 100));
  imgCache.set(imageUrl, url);
  return url;
}

// 1. Tạo SP còn thiếu (so khớp name+price)
const newProds = bp.data || [];
const missing = (op.data || []).filter((x) => !newProds.some((y) => y.name === x.name && y.price === x.price));
const prodMapByName = new Map(); // name -> newId (cho topping links)
for (const p of newProds) { if (!prodMapByName.has(p.name)) prodMapByName.set(p.name, p.id); }
let created = 0;
for (const p of missing) {
  const newCat = catByName.get(oldCats.find((c) => c.id === p.category_id)?.name);
  const img = await migrateImage(p.image_url);
  const r = await api(NEW, nt, "/api/admin/products", "POST", {
    name: p.name, price: p.price,
    category_id: newCat || newCats[0]?.id,
    image_url: img, available: !!p.available,
    production_unit: p.production_unit || "kitchen", is_topping: !!p.is_topping,
  });
  if (r.status === 201 && r.data.id) {
    created++;
    if (!prodMapByName.has(p.name)) prodMapByName.set(p.name, r.data.id);
    for (const s of p.sizes || []) {
      await api(NEW, nt, `/api/admin/products/${r.data.id}/sizes`, "POST", { name: s.name, price: s.price });
    }
  } else {
    console.log(`  ! Tạo "${p.name}":`, JSON.stringify(r.data).slice(0, 120));
  }
}
console.log(`Tạo thêm ${created}/${missing.length} SP còn thiếu`);

// 2. Sửa SP trên đích có ảnh trỏ domain cũ (/uploads/ hoặc OLD)
const cur = (await api(NEW, nt, "/api/products")).data || [];
for (const p of cur) {
  if (p.image_url && (p.image_url.startsWith("/uploads/") || p.image_url.startsWith(OLD))) {
    const img = await migrateImage(p.image_url);
    if (img !== p.image_url) {
      await api(NEW, nt, `/api/admin/products/${p.id}`, "PUT", { image_url: img });
      console.log(`  ~ Sửa ảnh "${p.name}"`);
    }
  }
}

// 3. Topping links cho categories
for (const c of oldCats) {
  const newCatId = catByName.get(c.name);
  if (!newCatId) continue;
  const toppingIds = (c.allowed_toppings || [])
    .map((oldPid) => (op.data || []).find((x) => x.id === oldPid)?.name)
    .map((n) => prodMapByName.get(n)).filter(Boolean);
  if (toppingIds.length) {
    await api(NEW, nt, `/api/admin/categories/${newCatId}`, "PUT", { topping_ids: toppingIds });
  }
}
console.log("Đã gán topping links");

// 4. Tạo bàn còn thiếu
const oldTables = (otRes.data?.tables || otRes.data || []);
const newTables = (btRes.data?.tables || btRes.data || []);
const newTableNames = new Set(newTables.map((t) => t.name));
let tOk = 0;
for (const t of oldTables) {
  if (newTableNames.has(t.name)) continue;
  const r = await api(NEW, nt, "/api/admin/tables", "POST", { name: t.name, id: t.id });
  if (r.status === 201) tOk++;
  else console.log(`  ! Tạo bàn "${t.name}":`, JSON.stringify(r.data).slice(0, 100));
}
console.log(`Tạo ${tOk} bàn còn thiếu`);
console.log("HOÀN TẤT");
