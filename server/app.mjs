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
import { startSyncLoop, syncNow, hubPing, getSyncStatus } from "./sync.mjs";
import { tunnelApi, autoStartTunnel } from "./tunnel.mjs";

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

const readJsonBody = (req) =>
  new Promise((resolve) => {
    let buf = "";
    req.on("data", (c) => (buf += c));
    req.on("end", () => {
      try { resolve(JSON.parse(buf || "{}")); } catch { resolve({}); }
    });
    req.on("error", () => resolve({}));
  });

// --- Standalone APK: không có .git (code nằm trong assets, giải nén ra disk) ---
// Update bằng tarball GitHub thay git pull.
const STANDALONE = !fs.existsSync(path.join(ROOT, ".git"));
const REPO = "ecomplus2024/pos_fnb";
const REPO_API = `https://api.github.com/repos/${REPO}/commits/main`;
const REPO_TARBALL = `https://codeload.github.com/${REPO}/tar.gz/refs/heads/main`;
// Chỉ ghi đè những đường dẫn này — data/, file lỗi người dùng không động vào
const UPDATE_PATHS = /^(server|public|src)\/|^schema\.sql$|^package\.json$/;

const readDeployed = () => {
  try {
    return fs.readFileSync(path.join(ROOT, ".deployed-commit"), "utf8").trim();
  } catch {
    return null;
  }
};
const buildVersion = () => {
  try {
    return "apk-" + fs.readFileSync(path.join(ROOT, ".build-version"), "utf8").trim();
  } catch {
    return "standalone";
  }
};

async function latestCommit() {
  const r = await fetch(REPO_API, {
    headers: { "User-Agent": "pos-standalone" },
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) throw new Error("GitHub API " + r.status);
  const j = await r.json();
  return {
    sha: j.sha.slice(0, 7),
    message: j.commit.message.split("\n")[0],
    date: j.commit.committer.date,
  };
}

// Giải nén tar (ustar + GNU longname 'L'), chỉ file match UPDATE_PATHS
function untarSelective(buf, dest) {
  let off = 0;
  let longName = null;
  let count = 0;
  while (off + 512 <= buf.length) {
    const h = buf.subarray(off, off + 512);
    if (h[0] === 0) break;
    const str = (a, b) => h.subarray(a, b).toString("utf8").replace(/\0.*$/, "");
    const size = parseInt(str(124, 136).trim() || "0", 8);
    const type = String.fromCharCode(h[156]);
    const full = longName || (str(345, 500) ? str(345, 500) + "/" + str(0, 100) : str(0, 100));
    longName = null;
    const data = buf.subarray(off + 512, off + 512 + size);
    off += 512 + Math.ceil(size / 512) * 512;
    if (type === "L") {
      longName = data.toString("utf8").replace(/\0.*$/, "");
      continue;
    }
    // Bỏ component đầu ("pos_fnb-main/")
    const rel = full.split("/").slice(1).join("/");
    if (!rel || !UPDATE_PATHS.test(rel)) continue;
    const target = path.normalize(path.join(dest, rel));
    if (!target.startsWith(dest)) continue;
    if (type === "5") {
      fs.mkdirSync(target, { recursive: true });
      continue;
    }
    if (type !== "0" && type !== "\0") continue;
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, data);
    count++;
  }
  return count;
}

async function tarballUpdate() {
  const r = await fetch(REPO_TARBALL, {
    headers: { "User-Agent": "pos-standalone" },
    signal: AbortSignal.timeout(120000),
  });
  if (!r.ok) throw new Error("Tải tarball lỗi " + r.status);
  const { gunzipSync } = await import("node:zlib");
  const tar = gunzipSync(Buffer.from(await r.arrayBuffer()));
  const n = untarSelective(tar, ROOT);
  const head = await latestCommit().catch(() => null);
  if (head) fs.writeFileSync(path.join(ROOT, ".deployed-commit"), head.sha);
  return `updated ${n} files → ${head ? head.sha : "?"}`;
}

async function handleAdminServer(req, res, pathname) {
  if (!(await requireAdmin(req))) {
    sendJson(res, { message: "Chỉ admin" }, 401);
    return true;
  }
  try {
    if (req.method === "GET" && pathname === "/api/admin/server-info") {
      if (STANDALONE) {
        sendJson(res, {
          commit: readDeployed() || buildVersion(),
          branch: "standalone",
          date: "",
          message: "APK standalone",
        });
        return true;
      }
      sendJson(res, {
        commit: git("rev-parse --short HEAD"),
        branch: git("rev-parse --abbrev-ref HEAD"),
        date: git("log -1 --format=%cI"),
        message: git("log -1 --format=%s"),
      });
      return true;
    }
    if (req.method === "POST" && pathname === "/api/admin/server-check") {
      if (STANDALONE) {
        const head = await latestCommit();
        const deployed = readDeployed();
        sendJson(res, {
          behind: !deployed || deployed === head.sha ? 0 : 1,
          latest: head.sha,
          latest_message: head.message,
        });
        return true;
      }
      git("fetch origin", 60000);
      sendJson(res, {
        behind: parseInt(git("rev-list --count HEAD..origin/main") || "0", 10),
        latest: git("rev-parse --short origin/main"),
        latest_message: git("log -1 --format=%s origin/main"),
      });
      return true;
    }
    if (req.method === "POST" && pathname === "/api/admin/server-update") {
      const output = STANDALONE
        ? await tarballUpdate()
        : git("pull --ff-only", 120000);
      sendJson(res, { ok: true, output, restarting: true });
      exitSoon(); // supervisor/service sẽ chạy lại với code mới
      return true;
    }
    if (req.method === "POST" && pathname === "/api/admin/server-restart") {
      sendJson(res, { ok: true, restarting: true });
      exitSoon();
      return true;
    }
    if (req.method === "GET" && pathname === "/api/admin/server-logs") {
      const tail = (f, lines = 80) => {
        try {
          const txt = fs.readFileSync(f, "utf8");
          return txt.trimEnd().split("\n").slice(-lines).join("\n");
        } catch {
          return "";
        }
      };
      const home = process.env.HOME || "";
      sendJson(res, {
        pos_log: tail(path.join(home, "pos.log")),
        watchdog_log: tail(path.join(home, "pos-watchdog.log"), 40),
      });
      return true;
    }
    if (req.method === "GET" && pathname === "/api/admin/sync-status") {
      sendJson(res, getSyncStatus());
      return true;
    }
    if (req.method === "POST" && pathname === "/api/admin/sync-now") {
      sendJson(res, await syncNow(db));
      return true;
    }
    if (req.method === "POST" && pathname === "/api/admin/sync-test") {
      sendJson(res, await hubPing(db));
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

    if (pathname.startsWith("/api/admin/server-") || pathname.startsWith("/api/admin/sync-")) {
      if (await handleAdminServer(req, res, pathname)) return;
    }

    if (pathname.startsWith("/api/admin/tunnel-")) {
      if (!(await requireAdmin(req))) {
        sendJson(res, { message: "Chỉ admin" }, 401);
        return;
      }
      const body = await readJsonBody(req);
      if (await tunnelApi(db, req, res, pathname, body, sendJson)) return;
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
      // Log API lỗi vào pos.log để debug (client WebView không có console)
      if (response.status >= 400 && pathname.startsWith("/api/")) {
        const errBody = await response.clone().text();
        console.error(`[api] ${req.method} ${pathname} -> ${response.status} ${errBody.slice(0, 300)}`);
      }
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

// Đồng bộ lên central hub (nếu đã cấu hình trong Admin → Hub)
startSyncLoop(db);
autoStartTunnel(db).catch((e) => console.error("[tunnel] autostart:", e.message));
