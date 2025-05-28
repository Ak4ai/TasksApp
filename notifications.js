import { messaging } from './firebase-config.js';
import { getToken, onMessage } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging.js";

// Solicita permissão ao usuário
async function solicitarPermissaoNotificacao() {
  try {
    const status = await Notification.requestPermission();
    if (status === 'granted') {
      const token = await getToken(messaging, { vapidKey: 'BGqnPKyVrK1n4mnSspDY75WGNYDEqJ4k0MBamGuMhdSMImw5q33T-ssiEWHRczZrq01XNP4xuxrKXlUkKluXyAQ' });
      console.log('Token FCM:', token);
      // Exibe o token na tela para depuração
      const el = document.getElementById('fcm-token');
      if (el) el.textContent = token || 'Não foi possível obter o token';
      // Salve o token no Firestore para este usuário, se desejar
    } else {
      console.warn('Permissão de notificação negada');
      const el = document.getElementById('fcm-token');
      if (el) el.textContent = 'Permissão negada';
    }
  } catch (e) {
    console.error('Erro ao obter token FCM:', e);
    const el = document.getElementById('fcm-token');
    if (el) el.textContent = 'Erro ao obter token';
  }
}

// Chame ao iniciar o app
solicitarPermissaoNotificacao();

// Recebe notificações enquanto o app está aberto
onMessage(messaging, (payload) => {
  console.log('Notificação recebida:', payload);
  // Exiba um popup customizado OU tente mostrar notificação se permitido
  if (Notification.permission === 'granted') {
    navigator.serviceWorker.getRegistration().then(function(reg) {
      if (reg) {
        reg.showNotification(payload.notification.title, {
          body: payload.notification.body,
          icon: payload.notification.icon
        });
      }
    });
  } else {
    // Ou exiba um popup customizado na tela
    alert(payload.notification.title + '\n' + payload.notification.body);
  }
});