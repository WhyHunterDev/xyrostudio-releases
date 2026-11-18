// Xyro (/x/): red primero y caché de respaldo. Las llamadas a Supabase nunca se guardan.
const C = 'xyro-x-v1';
const BASE = ['/x/', '/x/app.css', '/x/js/app.js', '/x/js/core.js', '/x/js/demo.js', '/img/marca/logo-xyrostudio-app.svg'];
self.addEventListener('install', (e) => { self.skipWaiting(); e.waitUntil(caches.open(C).then((c) => c.addAll(BASE)).catch(() => {})); });
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((x) => x.startsWith('xyro-x') && x !== C).map((x) => caches.delete(x)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  const lib = /cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net/.test(u.host);
  if (u.origin !== location.origin && !lib) return;
  if (u.origin === location.origin && !u.pathname.startsWith('/x/') && !u.pathname.startsWith('/img/')) return;
  e.respondWith(fetch(e.request).then((r) => { if (r.ok) { const c = r.clone(); caches.open(C).then((x) => x.put(e.request, c)); } return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('/x/'))));
});
