// public/sw.js - PWA Service Worker cho POS
const CACHE_NAME = 'pos-v6';

// Precache list — chỉ static files không thay đổi (JS/CSS/HTML dùng network-first)
// KHÔNG precache manifest.json — nó thay đổi (orientation, icon) mà PWA đọc lúc cài
const PRECACHE_URLS = [
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  // CDN resources
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://unpkg.com/@babel/standalone@7.24.0/babel.min.js',
  'https://unpkg.com/qrcode-generator@1.4.4/qrcode.js',
];

// Runtime cache cho GET API responses (đọc offline)
const API_CACHE_NAME = 'pos-api-v1';

// ============ Install ============
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Precache all resources');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => self.skipWaiting())
  );
});

// ============ Activate ============
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME && name !== API_CACHE_NAME)
          .map(name => {
            console.log('[SW] Delete old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// ============ Fetch ============
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (POST/PUT/DELETE không cache)
  if (request.method !== 'GET') return;

  // Skip Chrome extensions
  if (url.protocol === 'chrome-extension:') return;

  // Navigation request — network-first (always fetch fresh when online)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(networkResponse => {
          // Cache fresh copy for offline fallback
          if (networkResponse.ok) {
            const cloned = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, cloned));
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline — return cached index.html
          return caches.match('/index.html');
        })
    );
    return;
  }

  // API GET requests — network-first, cache response
  if (url.pathname.startsWith('/api/')) {
    // /api/changes polling — không cache, luôn network
    if (url.pathname.includes('/changes')) {
      return;
    }

    event.respondWith(
      networkFirstWithCache(request, API_CACHE_NAME)
    );
    return;
  }

  // Static files (JS/JSX/CSS/HTML) — network-first (always fetch fresh, fallback to cache offline)
  // .jsx PHẢI ở đây — nếu rơi xuống cache-first bên dưới, app.jsx cũ sẽ sống mãi trong cache
  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.jsx') || url.pathname.endsWith('.css') || url.pathname.endsWith('.html') || url.pathname.endsWith('.json') || url.pathname === '/') {
    event.respondWith(
      fetch(request).then(networkResponse => {
        if (networkResponse.ok) {
          const cloned = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, cloned));
        }
        return networkResponse;
      }).catch(() => caches.match(request))
    );
    return;
  }

  // CDN & other static — cache-first
  event.respondWith(
    caches.match(request)
      .then(response => {
        if (response) return response;
        return fetch(request).then(networkResponse => {
          if (networkResponse.ok) {
            const cloned = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, cloned));
          }
          return networkResponse;
        });
      })
  );
});

// ============ Helper: Network First with Cache ============
async function networkFirstWithCache(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Network failed — try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    // No cache — return offline error JSON
    return new Response(
      JSON.stringify({ error: 'offline', cached: false }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// ============ Message Handling (từ app) ============
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  // Sync offline orders
  if (event.data && event.data.type === 'SYNC_ORDERS') {
    syncOfflineOrders().then(() => {
      event.ports[0].postMessage({ success: true });
    }).catch(err => {
      event.ports[0].postMessage({ success: false, error: err.message });
    });
  }
});

// ============ Offline Order Sync ============
async function syncOfflineOrders() {
  // Mở IndexedDB và sync queue
  // (Logic này implement trong app.jsx, SW chỉ nhận message trigger)
  console.log('[SW] Sync triggered');
}

// ============ Background Sync (nếu hỗ trợ) ============
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-orders') {
    event.waitUntil(syncOfflineOrders());
  }
});
