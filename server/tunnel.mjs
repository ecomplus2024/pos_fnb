// ============================================================
// tunnel.mjs — Cloudflare Tunnel chạy ngay trong app
// Nhập CF API token → chọn domain + subdomain → tạo named tunnel,
// trỏ DNS CNAME, spawn `cloudflared run --token ...` (binary nhúng
// trong APK, path qua env CF_BIN). Config lưu ở settings key 'tunnel':
//   { enabled, cf_token, account_id, tunnel_id, hostname }
// ============================================================
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const CF_API = "https://api.cloudflare.com/client/v4";
const RESPAWN_MS = 15_000;

let proc = null;
let stopping = false;
let lastExit = null; // { code, at }
let logPath = null;

const getLogPath = () =>
  logPath || (logPath = path.join(process.env.HOME || process.env.POS_DATA_DIR || ".", "cloudflared.log"));

async function getSetting(db, key) {
  const row = await db.prepare("SELECT value FROM settings WHERE key = ?").bind(key).first();
  if (!row) return null;
  try { return JSON.parse(row.value); } catch { return row.value; }
}

async function setSetting(db, key, value) {
  await db
    .prepare(
      "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    )
    .bind(key, JSON.stringify(value))
    .run();
}

// auth = { token, email } — có email → Global API Key (X-Auth-Email/Key),
// không có → API Token (Bearer). Global Key là chuỗi hex ở mục API Keys.
async function cfApi(auth, method, p, body) {
  const headers = { "Content-Type": "application/json" };
  if (auth.email) {
    headers["X-Auth-Email"] = auth.email;
    headers["X-Auth-Key"] = auth.token;
  } else {
    headers["Authorization"] = `Bearer ${auth.token}`;
  }
  const r = await fetch(CF_API + p, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.success === false) {
    const msg = (j.errors || []).map((e) => e.message || e.code).join("; ") || `HTTP ${r.status}`;
    throw new Error(msg);
  }
  return j.result;
}

function startCloudflared(token) {
  const bin = process.env.CF_BIN || "";
  if (!bin || !fs.existsSync(bin)) {
    lastExit = { code: -1, at: Date.now(), error: "Thiếu binary cloudflared (CF_BIN=" + bin + ")" };
    console.error("[tunnel]", lastExit.error);
    return false;
  }
  try { fs.chmodSync(bin, 0o755); } catch {}
  const out = fs.createWriteStream(getLogPath(), { flags: "a" });
  proc = spawn(bin, ["tunnel", "--no-autoupdate", "run", "--token", token], {
    env: { ...process.env, TUNNEL_LOGLEVEL: "info" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  proc.stdout.pipe(out);
  proc.stderr.pipe(out);
  lastExit = null;
  proc.on("exit", (code) => {
    proc = null;
    lastExit = { code, at: Date.now() };
    out.end();
    if (!stopping) setTimeout(respawnIfEnabled, RESPAWN_MS);
  });
  return true;
}

async function respawnIfEnabled() {
  if (!dbRef || stopping) return;
  const cfg = await getSetting(dbRef, "tunnel");
  if (cfg?.enabled && cfg.token) startCloudflared(cfg.token);
}

let dbRef = null;

/** Gọi khi server boot — tự chạy lại tunnel nếu trước đó đã bật. */
export async function autoStartTunnel(db) {
  dbRef = db;
  const cfg = await getSetting(db, "tunnel");
  if (cfg?.enabled && cfg.token) startCloudflared(cfg.token);
}

function tunnelStatus(cfg) {
  return {
    configured: !!cfg?.tunnel_id,
    enabled: !!cfg?.enabled,
    running: !!proc && proc.exitCode === null,
    hostname: cfg?.hostname || null,
    url: cfg?.hostname ? "https://" + cfg.hostname : null,
    last_exit: lastExit,
  };
}

/**
 * API handlers — trả true nếu đã xử lý.
 * body: object JSON đã parse sẵn (app.mjs đọc body trước khi gọi).
 */
export async function tunnelApi(db, req, res, pathname, body, sendJson) {
  try {
    // auth chung: token + email (email rỗng → Bearer token)
    const auth = {
      token: String(body?.token || "").trim(),
      email: String(body?.email || "").trim(),
    };

    // Danh sách domain (zones) trong tài khoản CF
    if (req.method === "POST" && pathname === "/api/admin/tunnel-domains") {
      const zones = await cfApi(auth, "GET", "/zones?per_page=50&status=active");
      sendJson(res, { ok: true, zones: (zones || []).map((z) => ({ id: z.id, name: z.name })) });
      return true;
    }

    if (req.method === "GET" && pathname === "/api/admin/tunnel-status") {
      sendJson(res, tunnelStatus(await getSetting(db, "tunnel")));
      return true;
    }

    // Tạo tunnel + ingress + DNS, lưu config, chạy cloudflared
    if (req.method === "POST" && pathname === "/api/admin/tunnel-setup") {
      const { zone_name, subdomain } = body || {};
      let { zone_id } = body || {};
      const sub = String(subdomain || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
      if (!auth.token || !zone_name || !sub) throw new Error("Thiếu token/domain/subdomain");
      const hostname = `${sub}.${zone_name}`;
      const tunnelName = `pos-${sub}`;

      // User nhập domain tay → resolve zone_id theo tên
      if (!zone_id) {
        const zs = await cfApi(auth, "GET", `/zones?name=${encodeURIComponent(zone_name)}&status=active`);
        zone_id = zs?.[0]?.id;
        if (!zone_id) throw new Error(`Không thấy domain "${zone_name}" trong tài khoản`);
      }

      // Account ID: user nhập tay (trang domain → Overview) hoặc tự lấy account đầu
      let account_id = String(body.account_id || "").trim();
      if (!account_id) {
        const accounts = await cfApi(auth, "GET", "/accounts?per_page=5");
        account_id = accounts?.[0]?.id;
        if (!account_id) throw new Error("Token không thấy account nào — nhập Account ID tay");
      }

      // Reuse tunnel cùng tên nếu đã có (tránh tạo trùng khi setup lại)
      let tunnel_id = null;
      const existing = await cfApi(
        auth, "GET", `/accounts/${account_id}/cfd_tunnel?name=${tunnelName}&is_deleted=false`
      );
      if (existing?.[0]?.id) {
        tunnel_id = existing[0].id;
      } else {
        const created = await cfApi(auth, "POST", `/accounts/${account_id}/cfd_tunnel`, {
          name: tunnelName,
          config_src: "cloudflare",
        });
        tunnel_id = created.id;
      }

      // Ingress: hostname → server local
      await cfApi(auth, "PUT", `/accounts/${account_id}/cfd_tunnel/${tunnel_id}/configurations`, {
        config: {
          ingress: [
            { hostname, service: "http://localhost:8787" },
            { service: "http_status:404" },
          ],
        },
      });

      // DNS CNAME hostname → <tunnel_id>.cfargotunnel.com
      const cnameTarget = `${tunnel_id}.cfargotunnel.com`;
      const recs = await cfApi(auth, "GET", `/zones/${zone_id}/dns_records?name=${hostname}`);
      if (recs?.[0]?.id) {
        await cfApi(auth, "PUT", `/zones/${zone_id}/dns_records/${recs[0].id}`, {
          type: "CNAME", name: hostname, content: cnameTarget, proxied: true,
        });
      } else {
        await cfApi(auth, "POST", `/zones/${zone_id}/dns_records`, {
          type: "CNAME", name: hostname, content: cnameTarget, proxied: true,
        });
      }

      // Tunnel token để chạy cloudflared
      const runToken = await cfApi(auth, "GET", `/accounts/${account_id}/cfd_tunnel/${tunnel_id}/token`);

      await setSetting(db, "tunnel", {
        enabled: true, cf_token: auth.token, cf_email: auth.email, account_id, tunnel_id, hostname, token: runToken,
      });
      dbRef = db;
      stopping = false;
      const started = startCloudflared(runToken);
      sendJson(res, { ok: true, started, ...tunnelStatus(await getSetting(db, "tunnel")) });
      return true;
    }

    if (req.method === "POST" && pathname === "/api/admin/tunnel-stop") {
      stopping = true;
      const cfg = await getSetting(db, "tunnel");
      if (cfg) await setSetting(db, "tunnel", { ...cfg, enabled: false });
      if (proc) { try { proc.kill(); } catch {} proc = null; }
      sendJson(res, { ok: true, ...tunnelStatus(await getSetting(db, "tunnel")) });
      return true;
    }

    if (req.method === "POST" && pathname === "/api/admin/tunnel-start") {
      const cfg = await getSetting(db, "tunnel");
      if (!cfg?.token) throw new Error("Chưa cấu hình tunnel");
      stopping = false;
      await setSetting(db, "tunnel", { ...cfg, enabled: true });
      const started = proc || startCloudflared(cfg.token);
      sendJson(res, { ok: true, started: !!started, ...tunnelStatus(await getSetting(db, "tunnel")) });
      return true;
    }
  } catch (err) {
    sendJson(res, { ok: false, error: String(err.message || err) }, 500);
    return true;
  }
  return false;
}
