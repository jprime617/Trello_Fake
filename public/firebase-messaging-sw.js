// ==========================================================
// SERVICE WORKER PARA NOTIFICAÇÕES PUSH EM SEGUNDO PLANO
// ==========================================================

importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// Notificações em segundo plano nativas do FCM usam a API 'push' do navegador.
// Este Service Worker intercepta o push e gera a notificação na barra de status do Android ou desktop.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    console.log('[Service Worker] Notificação push recebida em segundo plano:', payload);

    // Se a notificação não foi gerada automaticamente pelo navegador (mensagens data-only)
    if (payload.data && !payload.notification) {
      const title = payload.data.title || 'Alerta de Prazo - Kanban';
      const options = {
        body: payload.data.body || 'Você possui uma tarefa pendente para expirar em breve.',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        data: payload.data,
        vibrate: [200, 100, 200],
        tag: 'deadline-alert', // Agrupa notificações repetidas
        actions: [
          { action: 'open', title: 'Abrir Kanban' }
        ]
      };
      event.waitUntil(self.registration.showNotification(title, options));
    }
  } catch (err) {
    console.error('[Service Worker] Erro ao analisar dados da notificação push:', err);
  }
});

// Ação disparada quando o usuário clica na notificação
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // URL padrão a ser aberta (página principal do aplicativo)
  const urlToOpen = new URL('/', self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Se o app já estiver aberto em alguma aba, foca nele
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Caso contrário, abre uma nova janela
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
