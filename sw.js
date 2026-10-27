// Офлайн-режим: сначала сеть (чтобы обновления приходили сразу), без сети — из кэша
const CACHE = 'balance-v10';
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './js/app.js',
  './js/store.js',
  './js/ui.js',
  './js/art.js',
  './js/sync.js',
  './js/practices-data.js',
  './js/views/practices.js',
  './js/views/report.js',
  './js/views/import.js',
  './js/views/today.js',
  './js/views/checkin.js',
  './js/views/diary.js',
  './js/views/charts.js',
  './js/views/breathe.js',
  './js/views/settings.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // шрифты не меняются — берём из кэша, чтобы работали и без сети
  if (FONT_HOSTS.includes(url.hostname)) {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      })),
    );
    return;
  }

  if (url.origin !== location.origin) return;
  // no-cache: всегда спрашиваем сервер, не изменился ли файл, — иначе браузер может
  // отдавать старую версию из своего HTTP-кэша и обновления приходят с задержкой
  e.respondWith(
    fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' })
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match('./index.html'))),
  );
});
