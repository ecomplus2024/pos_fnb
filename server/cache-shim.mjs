/**
 * Shim tối thiểu cho `caches.default` (Cache API của Workers).
 * Map in-memory: key = request URL, value = { status, headers, body }.
 * Server là single-instance nên in-memory đủ — cache mất khi restart, chấp nhận được.
 */
const store = new Map();
const keyOf = (request) => (typeof request === "string" ? request : request.url);

export const memoryCache = {
  async match(request) {
    const hit = store.get(keyOf(request));
    if (!hit) return undefined;
    return new Response(hit.body, {
      status: hit.status,
      headers: new Headers(hit.headers),
    });
  },
  async put(request, response) {
    const res = response.clone();
    store.set(keyOf(request), {
      status: res.status,
      headers: [...res.headers.entries()],
      body: await res.text(),
    });
  },
  async delete(request) {
    return store.delete(keyOf(request));
  },
};

export function installCacheShim() {
  if (!globalThis.caches || !globalThis.caches.default) {
    globalThis.caches = { default: memoryCache };
  }
}
