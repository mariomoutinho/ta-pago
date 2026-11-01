// Este worker só recebe avisos. Não intercepta requisições nem armazena dados offline.
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('push', event => {
  event.waitUntil((async () => {
    let shown = false;
    try { await self.registration.showNotification('Novidade no Tá Pago', {
    body: 'Você tem uma nova atualização dos seus alunos. Toque para ver.',
    icon: '/assets/pwa/icon-192.png', badge: '/assets/pwa/icon-192.png',
    tag: 'student-news', renotify: true, data: { url: '/notificacao' },
    }); shown = true; } finally {
      // Diagnóstico posterior: nunca esperar a rede para apresentar o alerta.
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      try {
        const subscription = await self.registration.pushManager.getSubscription();
        if (subscription) await fetch('/api/notifications/receipt', {
          method: 'POST', credentials: 'include', cache: 'no-store', signal: controller.signal,
          headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'TaPago' },
          body: JSON.stringify({ endpoint: subscription.endpoint, shown }),
        });
      } catch {} finally { clearTimeout(timeout); }
    }
  })());
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    let target = new URL('/notificacao', self.location.origin);
    try {
      const candidate = new URL(event.notification.data?.url || '/notificacao', self.location.origin);
      if (candidate.origin === self.location.origin && candidate.pathname === '/notificacao') target = candidate;
    } catch {}
    // No Android, openWindow pode retomar a janela do PWA instalado.
    try {
      const opened = await self.clients.openWindow(target.href);
      if (opened) { try { await opened.focus(); } catch {} return; }
    } catch {}
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin === self.location.origin) {
        try { await client.focus(); await client.navigate(target.href); return; } catch {}
      }
    }
    await self.clients.openWindow(target.href);
  })());
});
