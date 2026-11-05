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
    icon: data.icon || '/icon-192.png',
    tag: data.tag || 'due-reminder',
    renotify: true,
    data: {
      url: data.url || '/',
      itemId: data.itemId,
      groupId: data.groupId,
      targetTab: data.targetTab,
    },
    vibrate: [200, 100, 200],
    timestamp: Date.now(),
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification tap / click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href;

  event.waitUntil(
    (async () => {
      const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      const open = windows.find((c) => c.url.startsWith(self.location.origin));
      if (open) {
        await open.focus();
        try {
          await open.navigate(target);
        } catch {
          // Not controlled by this worker yet: let the page switch itself.
          open.postMessage({ type: 'open-url', url: target });
        }
        return;
      }
      await clients.openWindow(target);
    })(),
  );
});
