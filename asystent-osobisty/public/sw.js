// Minimalny service worker — wymagany do instalacji PWA na telefonie.
// Cache'uje tylko powłokę aplikacji; dane zawsze pobieramy na żywo z /api.
const CACHE = 'asystent-v1';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Zapytania do API zawsze sieć (świeże dane), bez cache.
  if (url.pathname.startsWith('/api/')) return;
  // Powłoka: najpierw sieć, w razie offline z cache.
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request).then((r) => r || caches.match('/'))));
});
