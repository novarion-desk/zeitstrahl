// Service Worker Zeitstrahl (Version 1.10): macht die App installierbar UND offline nutzbar.
// Strategie: zuerst Netz (immer frische Version, wenn online), bei Ausfall oder langsamem Netz (4 s) der Zwischenspeicher.
// Beim Erhöhen der App-Version hier VERSION mitändern, damit der Update-Hinweis erscheint.
const VERSION = '1.10';
const CACHE = 'zeitstrahl-' + VERSION;
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'drive-backup.js', 'shared-ki.js', 'vendor/app.css', 'vendor/firebase-app-compat.js', 'vendor/firebase-auth-compat.js', 'vendor/firebase-firestore-compat.js', 'vendor/qrcode.js', 'icons/icon.svg', 'icons/favicon-32.png', 'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-192.png', 'icons/icon-maskable-512.png'];
const SCOPE = self.registration.scope;

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('zeitstrahl-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;            // fremde Server (z. B. Feedback-Formular) unverändert
  if (url.pathname.indexOf('/versions/') !== -1) return;  // Archiv-Versionen nicht zwischenspeichern
  e.respondWith(handle(e, req, url));
});

async function handle(e, req, url) {
  const cache = await caches.open(CACHE);
  const key = url.origin + url.pathname;                  // Suchteil (?demo usw.) nicht Teil des Schlüssels
  const net = fetch(url.href, { cache: 'no-cache', credentials: 'same-origin' }).then((res) => {
    if (res && res.ok && res.type === 'basic' && !res.redirected) cache.put(key, res.clone());
    return res;
  });
  net.catch(() => {});
  e.waitUntil(net.catch(() => {}));
  let res = null;
  try {
    res = await Promise.race([net, new Promise((r) => setTimeout(() => r(null), 4000))]);
  } catch (err) { /* offline */ }
  if (res) return res;
  let hit = await cache.match(key);
  if (!hit && req.mode === 'navigate') hit = (await cache.match(SCOPE + 'index.html')) || (await cache.match(SCOPE));
  if (hit) return hit;
  try { return await net; } catch (err) { return Response.error(); }
}
