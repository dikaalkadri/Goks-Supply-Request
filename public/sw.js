/* Goks! Supply Request service worker.
 * Push notifications only: no page caching, so request data is never stale.
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'Goks! Supply Request';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || 'Ada pembaruan permintaan barang.',
      icon: '/icon-192.png',
      badge: '/badge-96.png',
      tag: data.tag,
      renotify: Boolean(data.tag),
      vibrate: [100, 50, 100],
      data: { url: data.url || '/requests' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/requests', self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      // Reuse an open app window when there is one
      for (const win of windows) {
        if (new URL(win.url).origin === self.location.origin && 'focus' in win) {
          return win.focus().then((w) => (w && 'navigate' in w ? w.navigate(target) : w));
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
