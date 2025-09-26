// docs/sw.js
const SW_VERSION = 'gj-v5';                // 每次改版就 +1
const SW_SCOPE_ROOT = './';               // 以 docs/ 為根
const SHELL = [
  './',
  './index.html',
  './reader.html',
  './assets/css/style.css?v=20250923-1',
  './assets/js/app-reader.js?v=20250923-1',
  './assets/js/ui.js?v=20250923-1',
  './assets/js/toc.js?v=20250923-1'
];

self.addEventListener('install', (e) => {
  self.skipWaiting(); // 新 SW 立刻進入 waiting
  e.waitUntil(
    caches.open(SW_VERSION).then((cache) => cache.addAll(SHELL))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    // 清掉舊版快取
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== SW_VERSION) && caches.delete(k)));
    // 立刻接管現有 clients
    await self.clients.claim();
  })());
});

// 小工具：判斷副檔名
const ext = (url) => (new URL(url, location.href).pathname.split('.').pop() || '').toLowerCase();

self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // 只攔同源請求
  if (url.origin !== location.origin) return;

  const extension = ext(url.href);

  // 對 HTML 導覽（含 reader.html）做 network-first，避免舊頁面殘留
  if (request.mode === 'navigate' || extension === 'html') {
    e.respondWith(networkFirst(request));
    return;
  }

  // 對 JS / JSON / MD（內容與程式）採 network-first
  if (['js','json','md'].includes(extension)) {
    e.respondWith(networkFirst(request));
    return;
  }

  // 對 CSS / TTF 字型做 stale-while-revalidate（先回快取，再背景更新）
  if (['css','ttf','woff','woff2'].includes(extension)) {
    e.respondWith(staleWhileRevalidate(request));
    return;
  }

  // 其他資源：cache-first
  e.respondWith(cacheFirst(request));
});

// ---- 三種策略 ----
async function networkFirst(req) {
  const cache = await caches.open(SW_VERSION);
  try {
    const fresh = await fetch(req, { cache: 'no-cache' });
    cache.put(req, fresh.clone());
    return fresh;
  } catch {
    const cached = await cache.match(req);
    if (cached) return cached;
    throw new Error('Network and cache failed for ' + req.url);
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(SW_VERSION);
  const cached = await cache.match(req);
  const fetchPromise = fetch(req).then((resp) => {
    cache.put(req, resp.clone());
    return resp;
  }).catch(() => cached);
  return cached || fetchPromise;
}

async function cacheFirst(req) {
  const cache = await caches.open(SW_VERSION);
  const cached = await cache.match(req);
  return cached || fetch(req).then((resp) => {
    cache.put(req, resp.clone());
    return resp;
  });
}
