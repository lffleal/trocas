// Trocas de Turno: funciona sem internet e atualiza-se sozinha.
// Não guarda horários: só guarda os ficheiros da própria app.
const VERSION = 'v1b-2026-10-31';
const CACHE = 'trocas-' + VERSION;
const CORE = ['./', './index.html', './manifest.webmanifest', './pdf.min.mjs', './pdf.worker.min.mjs',
  './icon-192.png', './icon-512.png', './maskable-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isPage = req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('.html');
  if (isPage) {
    // página: tenta sempre a versão mais recente; sem rede, usa a guardada
    e.respondWith(fetch(req).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put('./index.html', cp)); return r; })
      .catch(() => caches.match('./index.html')));
    return;
  }
  // restantes ficheiros (app e tipos de letra): rápido a partir da cache, renovado em segundo plano
  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return r; }).catch(() => hit);
    return hit || net;
  }));
});
