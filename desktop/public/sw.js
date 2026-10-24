// Aether Service Worker for Mobile & Desktop Native Push Notifications
const CACHE_NAME = 'aether-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle incoming push events from server
self.addEventListener('push', (event) => {
  let data = {
    title: '⚡ Aether Executive Reminder',
    body: 'Time for your scheduled task!',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: 'aether-reminder',
    vibrate: [200, 100, 200, 100, 200]
  };

  if (event.data) {
    try {
      data = Object.assign(data, event.data.json());
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/favicon.svg',
    badge: data.badge || '/favicon.svg',
    vibrate: data.vibrate || [200, 100, 200, 100, 200],
    tag: data.tag || 'aether-alert',
    renotify: true,
    requireInteraction: true,
    data: data.data || { url: '/' }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification click: focus existing window or open new one
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
