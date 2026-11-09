// Trocas de Turno: funciona sem internet e atualiza-se sozinha.
// Não guarda horários: só guarda os ficheiros da própria app.
const VERSION = 'v37-2026-11-09';
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
    // com rede fraca não fica à espera: ao fim de 3 s abre a versão guardada (e a nova fica guardada para a próxima vez)
    const cached = () => caches.match('./index.html', {ignoreSearch: true}).then(h => h || caches.match('./', {ignoreSearch: true}));
    const net = fetch(req).then(r => { if (r && r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put('./index.html', cp)); } return r; });
    const timeout = new Promise(res => setTimeout(res, 3000)).then(cached);
    e.respondWith(Promise.race([net.catch(cached), timeout.then(h => h || net)]).then(r => r || cached()));
    return;
  }
  // restantes ficheiros (app e tipos de letra): rápido a partir da cache, renovado em segundo plano
  e.respondWith(caches.match(req, {ignoreSearch: url.origin === location.origin}).then(hit => {
    const net = fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return r; }).catch(() => hit || new Response('', {status: 504}));
    return hit || net;
  }));
});
