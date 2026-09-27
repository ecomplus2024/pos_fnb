/**
 * Local POS server — chạy nguyên logic src/worker.ts (bản Cloudflare Worker)
 * trên Node.js bằng cách shim các binding Workers:
 *
 *   env.DB        → server/d1.mjs         (D1 API trên node:sqlite)
 *   env.ASSETS    → server/assets.mjs     (serve public/)
 *   caches.default→ server/cache-shim.mjs (Map in-memory)
 *   ctx.waitUntil → fire-and-forget stub
 *
 * Env vars:
 *   PORT           (default 8787)
 *   HOST           (default 0.0.0.0 — mở LAN)
 *   POS_DATA_DIR   (default ./data — chứa pos.db)
 *   STORE_NAME     (default "POS")
 *   ADMIN_PASSWORD (password seed lần đầu, default "admin123")
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { D1Database } from "./d1.mjs";
import { createAssets } from "./assets.mjs";
import { installCacheShim } from "./cache-shim.mjs";
import { initDb } from "./migrations.mjs";

installCacheShim();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DATA_DIR = process.env.POS_DATA_DIR || path.join(ROOT, "data");
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new D1Database(path.join(DATA_DIR, "pos.db"));
await initDb(db, { schemaPath: path.join(ROOT, "schema.sql") });

// Load worker source nguyên vẹn (file .ts thực chất là JS thuần, @ts-nocheck)
// qua data-URL import — không cần copy/rename file
const workerSrc = fs.readFileSync(path.join(ROOT, "src", "worker.ts"), "utf8");
const { default: worker } = await import(
  "data:text/javascript;charset=utf-8," + encodeURIComponent(workerSrc)
);

const env = {
  DB: db,
  ASSETS: createAssets(path.join(ROOT, "public")),
  STORE_NAME: process.env.STORE_NAME || "POS",
};

const ctx = {
  waitUntil: (p) => Promise.resolve(p).catch((e) => console.error("[waitUntil]", e)),
};

// --- SSE push: client subscribe /api/events, server báo "change" sau mọi mutation ---
// Workers stateless không làm được việc này (nên bản cũ phải polling + optimistic hacks).
const sseClients = new Set();
const broadcastChange = (path) => {
  const msg = `data: ${JSON.stringify({ type: "change", path, t: Date.now() })}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(msg);
    } catch {
      sseClients.delete(client);
    }
  }
};

// --- Admin server management: xem version, git pull, restart ---
// Auth: Bearer token của user role='admin' (bảng sessions+users)
const sendJson = (res, data, status = 200) => {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify(data));
};

async function requireAdmin(req) {
  const auth = req.headers["authorization"] || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  if (!token) return false;
  const row = await db
    .prepare(
      `SELECT u.role, s.expires_at FROM sessions s
       JOIN users u ON u.id = s.user_id WHERE s.token = ?`
    )
    .bind(token)
    .first();
  return !!row && row.role === "admin" && new Date(row.expires_at) > new Date();
}

// GIT_TERMINAL_PROMPT=0: fail nhanh thay vì treo chờ nhập password (repo private)
const git = (args, timeout = 30000) =>
  execSync(`git ${args}`, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout,
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  }).trim();

const exitSoon = () => setTimeout(() => process.exit(0), 600);

async function handleAdminServer(req, res, pathname) {
  if (!(await requireAdmin(req))) {
    sendJson(res, { message: "Chỉ admin" }, 401);
    return true;
  }
  try {
    if (req.method === "GET" && pathname === "/api/admin/server-info") {
      sendJson(res, {
        commit: git("rev-parse --short HEAD"),
        branch: git("rev-parse --abbrev-ref HEAD"),
        date: git("log -1 --format=%cI"),
        message: git("log -1 --format=%s"),
      });
      return true;
    }
    if (req.method === "POST" && pathname === "/api/admin/server-check") {
      git("fetch origin", 60000);
      sendJson(res, {
        behind: parseInt(git("rev-list --count HEAD..origin/main") || "0", 10),
        latest: git("rev-parse --short origin/main"),
        latest_message: git("log -1 --format=%s origin/main"),
      });
      return true;
    }
    if (req.method === "POST" && pathname === "/api/admin/server-update") {
      const output = git("pull --ff-only", 120000);
      sendJson(res, { ok: true, output, restarting: true });
      exitSoon(); // supervisor loop sẽ chạy lại với code mới
      return true;
    }
    if (req.method === "POST" && pathname === "/api/admin/server-restart") {
      sendJson(res, { ok: true, restarting: true });
      exitSoon();
      return true;
    }
  } catch (err) {
    sendJson(res, { ok: false, error: String(err.stderr || err.message || err) }, 500);
    return true;
  }
  return false;
}

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || "0.0.0.0";

http
  .createServer(async (req, res) => {
    const pathname = new URL(req.url || "/", "http://localhost").pathname;

    if (pathname.startsWith("/api/admin/server-")) {
      if (await handleAdminServer(req, res, pathname)) return;
    }


    // SSE endpoint — đặt trước worker (worker không biết route này)
    if (req.method === "GET" && pathname === "/api/events") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
      });
      res.write("retry: 3000\n\n");
      sseClients.add(res);
      const keepAlive = setInterval(() => {
        try {
          res.write(": ping\n\n");
        } catch {}
      }, 25000);
      req.on("close", () => {
        clearInterval(keepAlive);
        sseClients.delete(res);
      });
      return;
    }

    try {
      const headers = new Headers();
      for (const [k, v] of Object.entries(req.headers)) {
        if (v !== undefined) headers.set(k, Array.isArray(v) ? v.join(",") : v);
      }
      let body;
      if (req.method !== "GET" && req.method !== "HEAD") {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        body = Buffer.concat(chunks);
      }
      const request = new Request(`http://${req.headers.host || "localhost"}${req.url}`, {
        method: req.method,
        headers,
        body,
      });
      try {
        request.ctx = ctx;
      } catch {}
      const response = await worker.fetch(request, env, ctx);
      // Mutation thành công → báo cho mọi client SSE biết để refetch
      if (req.method !== "GET" && response.status >= 200 && response.status < 300) {
        broadcastChange(pathname);
      }
      res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch (err) {
      console.error(err);
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json" });
      }
      res.end(JSON.stringify({ error: String(err) }));
    }
  })
  .listen(PORT, HOST, () => {
    console.log(`POS local server: http://localhost:${PORT}`);
    console.log(`LAN: các máy khác truy cập http://<ip-máy-này>:${PORT}`);
  });
