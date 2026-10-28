// Menyimpan tampilan aplikasi agar tetap terbuka saat sinyal lemah.
const CACHE = "mudzakaroh-v12";
const SHELL = ["./", "index.html", "style.css", "app.js", "koleksi.js", "config.js", "data.json", "manifest.webmanifest",
  "img/logo-rumah-dakwah.png", "img/logo-rumah-dakwah-gelap.png", "img/logo-emblem.png", "img/logo-pesantren-online.png", "img/icon-192.png", "img/icon-512.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  // Utamakan versi terbaru dari internet, pakai simpanan bila luring.
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match("index.html"))));
});
