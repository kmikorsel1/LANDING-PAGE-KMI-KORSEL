// Service worker KMI Korsel. Naikkan nomor versi CACHE setiap rilis besar.
const CACHE = "kmi-korsel-v1";
const INTI = ["/", "/index.html", "/config.js", "/manifest.json", "/favicon.png", "/ikon-192.png", "/ikon-512.png", "/ikon-maskable-512.png", "/apple-touch-icon.png"];
const CDN = ["cdn.jsdelivr.net", "fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(INTI)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Data Supabase (database, login, foto) TIDAK PERNAH disimpan di cache
  if (url.hostname.endsWith("supabase.co") || url.hostname.endsWith("supabase.in")) return;
  if (url.origin === self.location.origin) {
    // Network-first: selalu ambil versi terbaru, pakai cache bila offline
    e.respondWith(fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match("/index.html"))));
    return;
  }
  if (CDN.some(h => url.hostname === h)) {
    // Stale-while-revalidate untuk pustaka & font
    e.respondWith(caches.open(CACHE).then(async c => {
      const cached = await c.match(req);
      const net = fetch(req).then(res => { if (res.ok || res.type === "opaque") c.put(req, res.clone()); return res; }).catch(() => cached);
      return cached || net;
    }));
  }
});
