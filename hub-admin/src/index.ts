// pos-hub-admin — Worker chỉ phục vụ trang quản trị tĩnh.
// Trang gọi TRỰC TIẾP tới API của từng server POS quán (qua Cloudflare
// Tunnel URL hoặc IP LAN) — dữ liệu thật nằm ở máy quán, D1 chỉ là backup
// do sync.mjs đẩy lên.
interface Env {
  ASSETS: { fetch: (r: Request) => Promise<Response> };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return env.ASSETS.fetch(request);
  },
};
