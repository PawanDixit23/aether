// ⚡ Aether Service Worker — Background Push Notifications (VAPID)
// Browser बंद होने पर भी GitHub Actions → Server → यह SW → OS Notification!

const CACHE_NAME = 'aether-v3';
const AETHER_ORIGIN = self.location.origin;

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
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
  // Re-subscribe और नई subscription सीधे server को POST करें (बिना window open होने की निर्भरता के)
  const oldEndpoint = event.oldSubscription ? event.oldSubscription.endpoint : null;
  const options = (event.oldSubscription && event.oldSubscription.options) ? event.oldSubscription.options : { userVisibleOnly: true };

  event.waitUntil(
    self.registration.pushManager.subscribe(options)
      .then(subscription => {
        console.log('[Aether SW] Push subscription refreshed, syncing to server...');
        
        // 1. सीधे server को update POST करें
        const syncPromise = fetch('/api/push/refresh-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            old_endpoint: oldEndpoint,
            subscription: subscription.toJSON()
          })
        }).catch(err => console.error('[Aether SW] Push refresh sync failed:', err));

        // 2. Client windows को भी सूचित करें
        const notifyClients = self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'PUSH_SUBSCRIPTION_CHANGED',
              subscription: subscription.toJSON()
            });
          });
        });

        return Promise.all([syncPromise, notifyClients]);
      })
  );
});

// ─── High Performance 0-Lag Asset & Data Caching ───────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests and WebSocket/streaming connections
  if (event.request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/chat/stream') || url.pathname.startsWith('/ws')) return;

  // 1. Code Assets (JS, CSS) -> Stale-While-Revalidate for instant load + automatic updates
  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cached) => {
          const fetchPromise = fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => cached);
          return cached || fetchPromise;
        });
      })
    );
    return;
  }

  // 2. Media Assets (fonts, images) -> Cache-First
  if (
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.ico')
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // 2. Read-only Data APIs (/api/cricket/live, /api/finance/summary, /api/news) -> Stale-While-Revalidate
  if (
    url.pathname === '/api/cricket/live' ||
    url.pathname === '/api/finance/summary' ||
    url.pathname === '/api/news'
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const fetchPromise = fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                cache.put(event.request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => cachedResponse);

          return cachedResponse || fetchPromise;
        });
      })
    );
  }
});
