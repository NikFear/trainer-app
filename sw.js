/* Офлайн-кеш тренажера. Змініть VERSION, щоб примусово оновити кеш. */
const VERSION = "mt-202611120340";
const FONTS = "mt-fonts";
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./icon.svg", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png", "./apple-touch-icon.png"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== FONTS).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    // Спершу з кешу (працює без мережі), у фоні — оновлення кешу для наступного запуску.
    const key = req.mode === "navigate" ? "./index.html" : req;
    const net = fetch(req).then(r => {
      if (r && r.ok) { const copy = r.clone(); return caches.open(VERSION).then(c => c.put(key, copy)).then(() => r); }
      return r;
    }).catch(() => null);
    e.waitUntil(net);
    e.respondWith(caches.match(key, { ignoreSearch: true }).then(hit => hit || net.then(r => r || new Response("Офлайн: сторінка ще не збережена.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } }))));
  } else if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(caches.open(FONTS).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      try { const r = await fetch(req); if (r.ok || r.type === "opaque") c.put(req, r.clone()); return r; }
      catch (x) { return new Response("", { status: 504 }); }
    }));
  }
});
