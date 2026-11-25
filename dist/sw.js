const cacheName = 'focus-training-0bc1659a824497';
const files = [
  "./app.js",
  "./catalog.js",
  "./games/common.js",
  "./games/cue.js",
  "./games/memory.js",
  "./games/numeric.js",
  "./games/schulte.js",
  "./games/stroop.js",
  "./games/visual.js",
  "./icon-192.png",
  "./icon-512.png",
  "./",
  "./manifest.webmanifest",
  "./store.js",
  "./style.css",
  "./trainer.js",
  "./ui.js",
  "./views.js"
];
const urls = new Set(files.map(f => new URL(f, self.registration.scope).href));
self.addEventListener('install', event => {
  event.waitUntil(caches.open(cacheName).then(cache => cache.addAll(files.map(f => new Request(f, {cache:'reload'})))));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('focus-training-') && k !== cacheName).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const req = event.request;
  if(req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  const navigation = req.mode === 'navigate' && [new URL('./',self.registration.scope).pathname,new URL('./index.html',self.registration.scope).pathname].includes(new URL(req.url).pathname);
  if (!navigation && !urls.has(req.url)) return;
  event.respondWith(caches.open(cacheName).then(async cache => (await cache.match(navigation ? './' : req)) || fetch(req)));
});
