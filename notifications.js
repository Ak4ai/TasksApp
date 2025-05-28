import { messaging } from './firebase-config.js';
import { getToken, onMessage } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging.js";

// Solicita permissão ao usuário
async function solicitarPermissaoNotificacao() {
  try {
    const status = await Notification.requestPermission();
    if (status === 'granted') {
      const token = await getToken(messaging, { vapidKey: 'BGqnPKyVrK1n4mnSspDY75WGNYDEqJ4k0MBamGuMhdSMImw5q33T-ssiEWHRczZrq01XNP4xuxrKXlUkKluXyAQ' });
      console.log('Token FCM:', token);
      // Salve o token no Firestore para este usuário, se desejar
    } else {
      console.warn('Permissão de notificação negada');
    }
  } catch (e) {
    console.error('Erro ao obter token FCM:', e);
  }
}

// Chame ao iniciar o app
solicitarPermissaoNotificacao();

// Recebe notificações enquanto o app está aberto
onMessage(messaging, (payload) => {
  console.log('Notificação recebida:', payload);
  // Exiba um popup customizado ou use Notification API
  new Notification(payload.notification.title, {
    body: payload.notification.body,
    icon: payload.notification.icon
  });
});

// Notificação local de teste ao entrar na página
if (Notification.permission === 'granted') {
  new Notification('Notificação de Teste', {
    body: 'Bem-vindo! Esta é uma notificação local.',
    icon: 'android-icon-192x192.png'
  });
}
