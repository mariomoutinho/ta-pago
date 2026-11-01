// Este worker só recebe avisos. Não intercepta requisições nem armazena dados offline.
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('push', event => {
  event.waitUntil(self.registration.showNotification('Novidade no Tá Pago', {
    body: 'Você tem uma nova atualização dos seus alunos. Toque para ver.',
    icon: '/assets/pwa/icon-192.png', badge: '/assets/pwa/icon-192.png',
    tag: 'student-news', renotify: true, data: { url: '/?novidades=1' },
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin === self.location.origin) {
        await client.navigate('/?novidades=1'); await client.focus(); return;
      }
    }
    await self.clients.openWindow('/?novidades=1');
  })());
});
