// Este worker só recebe avisos. Não intercepta requisições nem armazena dados offline.
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('push', event => {
  event.waitUntil(self.registration.showNotification('Novo cadastro recebido', {
    body: 'Um aluno enviou sua ficha. Abra o Tá Pago para analisar e aprovar.',
    icon: '/assets/pwa/icon-192.png', badge: '/assets/pwa/icon-192.png',
    tag: 'enrollment-received', renotify: true, data: { url: '/alunos/cadastros' },
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin === self.location.origin) {
        await client.navigate('/alunos/cadastros'); await client.focus(); return;
      }
    }
    await self.clients.openWindow('/alunos/cadastros');
  })());
});
