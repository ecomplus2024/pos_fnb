// @ts-nocheck
/**
 * pos-hub-admin — trang quản trị trung tâm cho chuỗi quán.
 *
 * Stateless proxy tới Cloudflare REST API:
 *   - Admin đăng nhập bằng CF API token (quyền Account → D1: Edit)
 *   - Token đi kèm mỗi request qua header x-cf-token — Worker KHÔNG
 *     lưu token, không có DB riêng, mọi quyền hạn = quyền của token.
 *   - /api/login    — verify token (CF /user/tokens/verify)
 *   - /api/dbs      — liệt kê accounts + D1 databases
 *   - /api/d1       — proxy /d1/database/{id}/query (sql + params)
 *   - /api/d1-raw   — proxy /d1/database/{id}/raw (multi-statement)
 *   - /api/d1-create— tạo database mới
 * Mọi path khác → static assets (public/).
 */

const CF_API = "https://api.cloudflare.com/client/v4";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (!url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

    const token = request.headers.get("x-cf-token") || "";
    if (!token) return json({ success: false, errors: [{ message: "thiếu token" }] }, 401);

    const cf = async (method, path, body) => {
      const r = await fetch(CF_API + path, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      return r.json().catch(() => ({ success: false, errors: [{ message: `CF HTTP ${r.status}` }] }));
    };

    try {
      // Verify token — "đăng nhập"
      if (url.pathname === "/api/login" && request.method === "POST") {
        const v = await cf("GET", "/user/tokens/verify");
        return json(v, v.success ? 200 : 401);
      }

      // Liệt kê tất cả account + D1 databases mà token nhìn thấy
      if (url.pathname === "/api/dbs" && request.method === "GET") {
        const acc = await cf("GET", "/accounts?per_page=50");
        if (!acc.success) return json(acc, 400);
        const out = [];
        for (const a of acc.result || []) {
          const dbs = await cf("GET", `/accounts/${a.id}/d1/database?per_page=100`);
          for (const d of dbs.result || []) {
            out.push({ account_id: a.id, account_name: a.name, uuid: d.uuid, name: d.name });
          }
        }
        return json({ success: true, result: out });
      }

      // Tạo D1 database mới
      if (url.pathname === "/api/d1-create" && request.method === "POST") {
        const { account_id, name } = await request.json();
        return json(await cf("POST", `/accounts/${account_id}/d1/database`, { name }));
      }

      // Query đơn có params — dùng cho mọi SELECT/INSERT/UPDATE/DELETE
      if (url.pathname === "/api/d1" && request.method === "POST") {
        const { account_id, db_id, sql, params } = await request.json();
        return json(await cf("POST",
          `/accounts/${account_id}/d1/database/${db_id}/query`,
          { sql, params: params || [] }));
      }

      // Multi-statement — dùng cho schema DDL
      if (url.pathname === "/api/d1-raw" && request.method === "POST") {
        const { account_id, db_id, sql } = await request.json();
        return json(await cf("POST",
          `/accounts/${account_id}/d1/database/${db_id}/raw`, { sql }));
      }

      return json({ success: false, errors: [{ message: "not found" }] }, 404);
    } catch (err) {
      return json({ success: false, errors: [{ message: String(err?.message || err) }] }, 500);
    }
  },
};
