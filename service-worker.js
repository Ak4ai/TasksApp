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

messaging.onBackgroundMessage(function(payload) {
  // Mostra notificação mesmo com app fechado
  self.registration.showNotification(
    payload.notification.title,
    {
      body: payload.notification.body,
      icon: payload.notification.icon
    }
  );
});

self.addEventListener('install', function(event) {
    event.waitUntil(
      caches.open('my-cache').then(function(cache) {
        return cache.addAll([
          '/',
          '/index.html',
          '/style.css', // Adicione todos os arquivos necessários para o offline
          '/script.js',
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
