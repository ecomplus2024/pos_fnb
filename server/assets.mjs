/**
 * Shim binding env.ASSETS (Workers Static Assets) — serve file từ public/.
 * Giữ nguyên contract: trả Response, 404 nếu không có file (worker tự SPA-fallback).
 */
import fs from "node:fs";
import path from "node:path";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".jsx": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json",
};

export function createAssets(publicDir) {
  const root = path.resolve(publicDir);
  return {
    async fetch(request) {
      const url = new URL(request.url);
      let pathname;
      try {
        pathname = decodeURIComponent(url.pathname);
      } catch {
        return new Response("Bad request", { status: 400 });
      }
      if (pathname === "/" || pathname === "") pathname = "/index.html";
      const filePath = path.resolve(root, "." + pathname);
      // Chặn path traversal ra ngoài public/
      if (filePath !== root && !filePath.startsWith(root + path.sep)) {
        return new Response("Forbidden", { status: 403 });
      }
      try {
        const stat = fs.statSync(filePath);
        if (!stat.isFile()) return new Response("Not found", { status: 404 });
        const data = fs.readFileSync(filePath);
        return new Response(data, {
          status: 200,
          headers: {
            "Content-Type": MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream",
            "Cache-Control": "no-cache",
          },
        });
      } catch {
        return new Response("Not found", { status: 404 });
      }
    },
  };
}
