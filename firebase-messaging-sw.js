importScripts('https://www.gstatic.com/firebasejs/11.6.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAlAcMD-HOn2EKiraMUUMCqno_59TlHhFQ",
  authDomain: "tasks-dc58c.firebaseapp.com",
  projectId: "tasks-dc58c",
  storageBucket: "tasks-dc58c.firebasestorage.app",
  messagingSenderId: "38066305641",
  appId: "1:38066305641:web:bbd50f93070832198c80f8",
  measurementId: "G-T5FDLX0CYZ"
});

const messaging = firebase.messaging();

// messaging.onBackgroundMessage(function(payload) {
//   console.log('[firebase-messaging-sw.js] Mensagem recebida em background:', payload);
//   // Só mostra manualmente se NÃO houver notification no payload
//   if (!payload.notification && payload.data) {
//     self.registration.showNotification(
//       payload.data.title || 'Nova notificação',
//       {
//         body: payload.data.body || '',
//         icon: payload.data.icon || '/web-icon-192x192.png'
//       }
//     );
//   }
// });

self.addEventListener('install', function(event) {
    event.waitUntil(
      caches.open('my-cache').then(function(cache) {
        return cache.addAll([
          '/',
          '/index.html',
          '/style.css',
          '/script.js',
          '/tarefas.js',
          '/auth.js',
          '/firebase-config.js',
          '/notifications.js',
          '/manifest.json',
          '/firebase-messaging-sw.js',
          '/android-icon-192x192.png',
          '/apple-icon-180x180.png',
          '/web-icon-192x192.png',
          '/mobile-icon.png',
          // Fontes
          '/fonts/din-next-rounded-lt-pro-medium.ttf',
          // Imagens principais (adicione outras se necessário)
          '/img/arco.png',
          '/img/astronauta.png',
          '/img/bardo.jpg',
          '/img/bruxo.jpg',
          '/img/cajado.png',
          '/img/carnaval.png',
          '/img/cartola.png',
          '/img/coroa.png',
          '/img/escudo.png',
          '/img/espada.png',
          '/img/guerreiro.jpg',
          '/img/hat.png',
          // ...adicione outros arquivos de img/ conforme necessário...
        ]);
      })
    );
  });
  
  self.addEventListener('fetch', function(event) {
    event.respondWith(
      caches.match(event.request).then(function(response) {
        return response || fetch(event.request);
      })
    );
  });
  
  self.addEventListener('push', function(event) {
      let data = {};
      try {
        data = event.data ? event.data.json() : {};
      } catch (e) {
        data = {};
      }
      const notification = data.notification || data;
      const title = notification.title || 'Nova notificação';
      const options = {
        body: notification.body || '',
        badge: notification.badge || '/badge.png' // badge adicionado aqui
      };
      event.waitUntil(
        self.registration.showNotification(title, options)
      );
  });