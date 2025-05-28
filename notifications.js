import { messaging } from './firebase-config.js';
import { getToken, onMessage } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

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

      // Salva o token no Firestore
      const db = getFirestore();
      const auth = getAuth();
      const user = auth.currentUser;
      if (user) {
        // Salva o token vinculado ao UID do usuário
        await setDoc(doc(db, "fcmTokens", user.uid), { token });
        console.log('Token salvo no Firestore para o usuário:', user.uid);
      } else {
        // Se não estiver autenticado, salva por token (menos seguro)
        await setDoc(doc(db, "fcmTokens", token), { token });
        console.log('Token salvo no Firestore (sem usuário autenticado)');
      }
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