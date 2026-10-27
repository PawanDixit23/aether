// ⚡ Aether Service Worker — Background Push Notifications (VAPID)
// Browser बंद होने पर भी GitHub Actions → Server → यह SW → OS Notification!

const CACHE_NAME = 'aether-v2';
const AETHER_ORIGIN = self.location.origin;

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// ─── Background Push Event Handler ──────────────────────────────────────────
// यह तब भी fire होता है जब browser बिल्कुल बंद हो!
self.addEventListener('push', (event) => {
  let payload = {
    title: '⚡ Aether Executive Reminder',
    body: 'कार्य का समय हो गया है!',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: 'aether-reminder',
    vibrate: [200, 100, 200, 100, 200],
    data: { url: '/' }
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      payload = { ...payload, ...parsed };
    } catch (e) {
      payload.body = event.data.text();
    }
  }

  const options = {
    body: payload.body,
    icon: payload.icon || '/favicon.svg',
    badge: payload.badge || '/favicon.svg',
    vibrate: payload.vibrate || [200, 100, 200, 100, 200],
    tag: payload.tag || 'aether-alert',
    renotify: true,
    requireInteraction: true,   // ✅ User dismiss करे तब तक notification रहेगी
    silent: false,
    data: { url: payload.data?.url || '/', tag: payload.tag },
    actions: [
      { action: 'open',     title: '⚡ Aether खोलें' },
      { action: 'dismiss',  title: '✓ देख लिया'     }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  );
});

// ─── Notification Click Handler ──────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // अगर Aether पहले से खुला है तो focus करें
        for (const client of windowClients) {
          if (client.url.startsWith(AETHER_ORIGIN) && 'focus' in client) {
            return client.focus();
          }
        }
        // नहीं तो नई window खोलें
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});

// ─── Push Subscription Change (जब browser subscription expire करे) ───────────
self.addEventListener('pushsubscriptionchange', (event) => {
  // Re-subscribe और नई subscription server को भेजें
  event.waitUntil(
    self.registration.pushManager.subscribe(event.oldSubscription.options)
      .then(subscription => {
        console.log('[Aether SW] Push subscription refreshed');
        // Client को message भेजें ताकि वो server update करे
        return self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'PUSH_SUBSCRIPTION_CHANGED',
              subscription: subscription.toJSON()
            });
          });
        });
      })
  );
});
