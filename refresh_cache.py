"""修改 dist 文件后执行，离线缓存版本由资源内容决定。"""
from pathlib import Path
from hashlib import sha256
import json

root = Path(__file__).resolve().parent / "dist"
files = sorted(p for p in root.rglob("*") if p.is_file() and p.name != "sw.js")
digest = sha256()
for path in files:
    digest.update(path.relative_to(root).as_posix().encode())
    digest.update(path.read_bytes())
# 使用规范首页路径。某些静态服务器会重定向 index.html，重定向响应不能回放为离线导航。
assets = ["./" if p == root / "index.html" else "./" + p.relative_to(root).as_posix() for p in files]
worker = """const cacheName = 'focus-training-CACHE_ID';
const files = ASSETS;
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
"""
digest.update(worker.encode())
(root / "sw.js").write_text(worker.replace("CACHE_ID", digest.hexdigest()[:14]).replace("ASSETS", json.dumps(assets, indent=2)), encoding="utf-8")
