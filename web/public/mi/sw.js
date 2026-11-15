// Mi Xyro: red primero y caché de respaldo, para que el QR abra aunque no haya señal.
const C = 'mi-xyro-v9';
self.addEventListener('install', (e) => { self.skipWaiting(); e.waitUntil(caches.open(C).then((c) => c.addAll(['/mi/', '/img/marca/logo-xyrostudio-app.svg']))); });
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((x) => x.startsWith('mi-xyro') && x !== C).map((x) => caches.delete(x)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  const lib = /cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net/.test(u.host);
  if (u.origin !== location.origin && !lib) return;
  if (u.origin === location.origin && !u.pathname.startsWith('/mi/') && !u.pathname.startsWith('/img/')) return;
  e.respondWith(fetch(e.request).then((r) => { if (r.ok) { const c = r.clone(); caches.open(C).then((x) => x.put(e.request, c)); } return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
