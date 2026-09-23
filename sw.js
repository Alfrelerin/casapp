// Service worker: permite instalar la app y abrirla sin conexión.
// Si cambias archivos y no ves los cambios, sube el número de versión.
const CACHE = 'reparto-v3';
const SHELL = [
  './', './index.html', './css/styles.css', './js/app.js', './js/logic.js', './js/store.js',
  './js/firebase-config.js', './manifest.webmanifest', './icons/icon.svg', './icons/icon-192.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Librerías de Firebase (versionadas) y tipografía: primero caché.
  const cacheFirst =
    (url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/')) ||
    url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (cacheFirst) {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }))
    );
    return;
  }

  // Archivos propios: primero red (para recibir actualizaciones), si no hay red, caché.
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match('./index.html')))
    );
  }
  // El resto (Firestore, Auth) lo gestiona Firebase directamente.
});
