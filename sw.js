// Minimaler Service Worker: macht Zeitstrahl CH installierbar.
// Er speichert bewusst NICHTS zwischen – jede Version kommt immer frisch vom Server.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
