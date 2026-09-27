#!/usr/bin/env node
/**
 * Bootstrap entry: đảm bảo node:sqlite khả dụng rồi load app.
 *
 * - Node >= 22.13 / 23.4 / 24 (Termux): node:sqlite sẵn, không cần flag
 * - Node 22.5 – 22.12: node:sqlite bị khóa sau --experimental-sqlite
 *   → tự respawn với flag nếu import thất bại
 */
try {
  await import("node:sqlite");
} catch {
  const { spawn } = await import("node:child_process");
  const { fileURLToPath } = await import("node:url");
  const child = spawn(
    process.execPath,
    ["--experimental-sqlite", fileURLToPath(import.meta.url), ...process.argv.slice(2)],
    { stdio: "inherit" }
  );
  child.on("exit", (code) => process.exit(code ?? 0));
  await new Promise(() => {}); // giữ process cha sống tới khi con thoát
}

await import("./app.mjs");
