// Service Worker for Utang List PWA & Push Notifications

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Handle incoming Web Push notifications from server or background
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || 'Reminder:';
  const options = {
    body: data.body || 'Please check your active bill reminders.',
    icon: data.icon || '/apple-touch-icon.png',
    badge: data.badge || '/apple-touch-icon.png',
    tag: data.tag || 'due-reminder',
    renotify: true,
    data: {
      url: data.url || '/',
      itemId: data.itemId,
      groupId: data.groupId,
      targetTab: data.targetTab,
    },
    vibrate: [200, 100, 200],
    actions: [
      { action: 'open', title: 'Open App' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification tap / click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          if (client.url.includes(self.registration.scope)) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
