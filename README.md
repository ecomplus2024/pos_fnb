# POS Demo - Cloudflare Workers + D1

Demo POS chạy hoàn toàn trên Cloudflare: **Worker (API) + Assets (React frontend) + D1 (database)**, một lần deploy duy nhất.

## Chạy local (không cần Cloudflare) — `server/`

`server/server.mjs` chạy **nguyên logic `src/worker.ts`** trên Node.js: D1 được shim bằng `node:sqlite` (built-in, zero dependency), `env.ASSETS` serve `public/`, `caches.default` là Map in-memory.

```bash
node server/server.mjs     # hoặc: npm start
# → http://localhost:8787  (mở LAN: http://<ip>:8787)
```

- DB SQLite lưu tại `data/pos.db`, tự init từ `schema.sql` + migration bù drift (cột `orders.*`, `order_item_toppings.quantity`, bảng `order_item_change_logs`) lần chạy đầu.
- User mặc định: `admin` / `admin123` (đổi bằng env `ADMIN_PASSWORD` trước lần chạy đầu, hoặc đổi trong Admin panel).
- Yêu cầu Node >= 22.5 (`node:sqlite`; bản <22.13 tự respawn với `--experimental-sqlite`).
- Env: `PORT`, `HOST`, `POS_DATA_DIR`, `STORE_NAME`, `ADMIN_PASSWORD`.

### Trên Android (Termux) — tablet làm server trong quán

**1. Cài Termux** — bản Play Store đã bỏ hoang, cài qua F-Droid:
vào `f-droid.org` trên tablet → cài F-Droid → trong F-Droid cài **Termux** + **Termux:Boot**
(mở Termux:Boot 1 lần sau khi cài). Vào *Settings → Apps → Termux → Battery → Unrestricted*.

**2. Đưa code lên + chạy:**

```bash
pkg update -y && pkg install -y nodejs git
# Repo PRIVATE — cần GitHub Personal Access Token (Settings → Developer settings
# → Tokens → Generate, scope "repo"), dùng token làm password khi git hỏi:
git clone https://github.com/ecomplus2024/pos_fnb.git
cd pos_fnb
bash setup-termux.sh      # autostart khi boot + cloudflared (tuỳ chọn)
node server/server.mjs    # → http://localhost:8787
```

Không có git/internet: `termux-setup-storage` rồi `cp -r /sdcard/.../pos-cloudflare ~/`
(phải copy vào `$HOME`, không chạy từ `/sdcard`).

**3. Cố định IP tablet** — `ip addr show wlan0 | grep inet` → DHCP reservation trên router.

**4. Thiết bị khác** mở `http://<IP-tablet>:8787` → *Add to Home Screen* (PWA, giống APK):
`/` = thu ngân (admin/admin123), `/kitchen` = bếp, `/counter` = quầy, `/menu/:id` = QR bàn.
Shipper/khách ngoài LAN: `pkg install cloudflared` → tunnel (xem `setup-termux.sh`).

**5. Vận hành:** tablet cắm sạc 24/7; backup = copy `data/pos.db`; log tại `~/pos.log`.

**6. Update & restart từ xa** — trang *Quản trị → Cài đặt → Hệ thống server*:

- **Kiểm tra bản mới**: `git fetch` → báo số commit chưa pull
- **Cập nhật & khởi động lại**: `git pull --ff-only` → process exit → supervisor loop
  trong boot script bật lại với code mới (gián đoạn ~2s, UI tự reload khi server lên)
- **Khởi động lại**: chỉ restart, không pull

API (yêu cầu Bearer token của user `role=admin`):

```
GET  /api/admin/server-info      # commit/branch đang chạy
POST /api/admin/server-check     # fetch + số commit phía sau
POST /api/admin/server-update    # pull + restart
POST /api/admin/server-restart   # chỉ restart
```

⚠️ Repo private → tablet phải lưu credential để `git pull` không hỏi password:
clone bằng `https://<TOKEN>@github.com/ecomplus2024/pos_fnb.git`, hoặc
`git config credential.helper store` rồi pull thủ công 1 lần.
Không chạy qua supervisor loop thì `update` sẽ tắt server vĩnh viễn — phải start lại tay.

### Import data từ D1 production (nếu muốn mang data cũ về local)

```bash
npx wrangler d1 export pos-free --remote --output=dump.sql
# trên máy local:
node -e "const{DatabaseSync}=require('node:sqlite');const fs=require('fs');const db=new DatabaseSync('data/pos.db');db.exec(fs.readFileSync('dump.sql','utf8'))" --experimental-sqlite
```

---

## Cấu trúc

```
cf-pos-demo/
├── wrangler.toml          # Cấu hình Worker + Assets + D1 binding
├── package.json
├── tsconfig.json
├── schema.sql             # Schema + dữ liệu mẫu cho D1
├── src/
│   └── worker.ts          # API: /api/health, /api/menu, /api/products
└── public/                # Static React frontend (served bởi Worker)
    ├── index.html
    └── app.jsx            # React + Tailwind (qua CDN cho demo)
```

## Yêu cầu

- Node.js 18+
- Tài khoản Cloudflare (miễn phí)

## Deploy từng bước

```bash
# 1. Cài dependencies
cd cf-pos-demo
npm install

# 2. Login Cloudflare (mở browser, đăng nhập, cấp quyền - KHÔNG cần API key)
npx wrangler login

# 3. Tạo D1 database
npm run db:create
# → Copy database_id từ output (vd: "abcd-1234-...")

# 4. Sửa wrangler.toml: thay REPLACE_AFTER_WRANGLER_D1_CREATE
#    bằng database_id vừa copy

# 5. Khởi tạo schema + dữ liệu mẫu trên D1
npm run db:init

# 6. Deploy
npm run deploy
```

Sau khi deploy xong, wrangler sẽ in ra URL:
```
Published pos-demo (1.23 sec)
  https://pos-demo.<your-subdomain>.workers.dev
```

## Test các endpoint

```bash
# Health check
curl https://pos-demo.<your-subdomain>.workers.dev/api/health

# Lấy menu (categories + products)
curl https://pos-demo.<your-subdomain>.workers.dev/api/menu

# Lọc sản phẩm theo danh mục
curl https://pos-demo.<your-subdomain>.workers.dev/api/products?category_id=1
```

## Test local (không cần deploy)

```bash
npx wrangler dev
# Mở http://localhost:8787
```

Database local dùng `--local` flag:
```bash
npx wrangler d1 execute pos-demo-db --file=./schema.sql --local
```

## Cách hoạt động

```
Browser                Cloudflare Edge
   │                         │
   │  1. GET /              │
   │────────────────────►  Worker (worker.ts)
   │                         │
   │                         ├─ URL là /api/* ?
   │                         │   → Query D1, trả JSON
   │                         │
   │                         └─ URL khác ?
   │                             → env.ASSETS.fetch()
   │                               → Trả file từ public/
   │
   │  2. HTML + JS + CSS     │
   │◄────────────────────
   │
   │  3. React gọi /api/menu │
   │────────────────────►  Worker query D1
   │◄────────────────────  Trả JSON
   │
   │  4. Render menu         │
```

## Multi-store (nếu muốn mở rộng)

Thêm cột `store_id` đã có sẵn trong schema. Mọi query thêm `WHERE store_id = ?`:
```typescript
const storeId = Number(new URL(request.url).searchParams.get("store") || 1);
const { results } = await env.DB
  .prepare("SELECT * FROM products WHERE store_id = ?")
  .bind(storeId)
  .all();
```

## Production notes

- **Tailwind qua CDN** chỉ để demo. Production nên build Tailwind CLI trước:
  ```bash
  npm install -D tailwindcss
  npx tailwindcss -i ./src/input.css -o ./public/styles.css --minify
  ```
- **React qua CDN** cũng chỉ cho demo. Production nên build với Vite → static bundle.
- **SSE/real-time**: Workers không giữ connection → dùng Durable Objects.
- **Auth**: thêm middleware kiểm tra JWT trong worker.ts trước khi gọi DB.
