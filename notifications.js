import { messaging } from './firebase-config.js';
import { getToken, onMessage } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging.js";
import { getFirestore, doc, setDoc, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

let pendingFcmToken = null;
let _isIOS = null;

// Solicita permissão ao usuário
async function solicitarPermissaoNotificacao() {
  try {
    const status = await Notification.requestPermission();
    if (status === 'granted') {
      // Registra explicitamente o service worker e passa para o getToken
      const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      const token = await getToken(messaging, {
        vapidKey: 'BGqnPKyVrK1n4mnSspDY75WGNYDEqJ4k0MBamGuMhdSMImw5q33T-ssiEWHRczZrq01XNP4xuxrKXlUkKluXyAQ',
        serviceWorkerRegistration: swReg
      });
      console.log('Token FCM:', token);
      // Exibe o token na tela para depuração
      const el = document.getElementById('fcm-token');
      if (el) el.textContent = token || 'Não foi possível obter o token';

      // Salva o token no Firestore
      const db = getFirestore();
      const auth = getAuth();
      const user = auth.currentUser;
      if (user) {
        // Salva o token vinculado ao UID do usuário em uma subcoleção
        await setDoc(doc(db, `usuarios/${user.uid}/fcmTokens`, token), { token });
        console.log('Token salvo no Firestore para o usuário:', user.uid);
      } else {
        // Guarda o token para salvar depois que autenticar
        pendingFcmToken = token;
        console.warn('Usuário não autenticado, token FCM será salvo após login.');
      }
    } else {
      console.warn('Permissão de notificação negada');
      const el = document.getElementById('fcm-token');
      if (el) el.textContent = 'Permissão negada';
      // Se não marcou "não mostrar novamente", mostra o modal de novo
      if (!localStorage.getItem('iosNotifNeverShow')) {
        setTimeout(mostrarModalNotificacaoIOS, 300);
      }
    }
  } catch (e) {
    console.error('Erro ao obter token FCM:', e);
    const el = document.getElementById('fcm-token');
    if (el) el.textContent = 'Erro ao obter token';
    // Se não marcou "não mostrar novamente", mostra o modal de novo
    if (!localStorage.getItem('iosNotifNeverShow')) {
      setTimeout(mostrarModalNotificacaoIOS, 300);
    }
  }
}

// Aguarde o SW estar pronto antes de pedir permissão/token
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then(() => {
    if (_isIOS === null) isIOS();
    if (_isIOS) {
      // Se já aceitou permissão, só busca o token
      if (Notification.permission === 'granted') {
        buscarTokenFCM();
      }
      // Se não, só mostra o modal (não chama solicitarPermissaoNotificacao aqui!)
    } else {
      solicitarPermissaoNotificacao();
    }
  });
} else {
  if (_isIOS === null) isIOS();
  if (_isIOS) {
    if (Notification.permission === 'granted') {
      buscarTokenFCM();
    }
  } else {
    solicitarPermissaoNotificacao();
  }
}

// NOVO: Permitir ativação manual via botão (útil para iOS/PWA)
const ativarBtn = document.getElementById('ativar-notificacoes-btn');
if (ativarBtn) {
  ativarBtn.addEventListener('click', () => {
    solicitarPermissaoNotificacao();
  });
}

// Quando o usuário autenticar, salve o token pendente (se houver)
const auth = getAuth();
onAuthStateChanged(auth, async (user) => {
  if (user && pendingFcmToken) {
    const db = getFirestore();
    await setDoc(doc(db, `usuarios/${user.uid}/fcmTokens`, pendingFcmToken), { token: pendingFcmToken });
    console.log('Token FCM pendente salvo após login:', user.uid);
    pendingFcmToken = null;
  }
});

// document.getElementById('test-notification-btn').addEventListener('click', async () => {
//   const db = getFirestore();
//   const auth = getAuth();
//   const user = auth.currentUser;
//   if (!user) {
//     alert('Faça login para testar notificações.');
//     return;
//   }
//   // Cria uma notificação planejada para agora
//   await addDoc(collection(db, "scheduledNotifications"), {
//     uid: user.uid,
//     title: "Notificação de Teste",
//     body: "Esta é uma notificação de teste enviada pelo botão.",
//     badge: "https://raw.githubusercontent.com/Ak4ai/TasksApp/e38ef409e5a90d423d1b5034e2229433d85cd538/badge.png",
//     scheduledAt: new Date(),
//     sent: false,
//     createdAt: serverTimestamp()
//   });
//   // Chama a API para enviar notificações
//   fetch('https://runa-phi.vercel.app/api/send-notifications')
//     .then(r => r.json())
//     .then(data => alert('Resultado: ' + JSON.stringify(data)))
//     .catch(e => alert('Erro ao chamar API: ' + e));
// });

console.log('notifications.js carregado');

// Altere a função isIOS para usar cache:
function isIOS() {
  if (_isIOS !== null) return _isIOS; // retorna o valor já detectado

  const ua = navigator.userAgent || '';
  const platform = navigator.platform || '';
  const isIpadOS = /Macintosh/.test(ua) && navigator.maxTouchPoints && navigator.maxTouchPoints > 2;
  const isIOSDevice =
    /iphone|ipod|ipad/i.test(ua) ||
    /iPad|iPhone|iPod/.test(platform) ||
    isIpadOS;

  _isIOS = isIOSDevice;
  if (isIOSDevice) {
    console.log('Este dispositivo É iOS');
    document.body.classList.add('ios-pwa');
  } else {
    console.log('Este dispositivo NÃO é iOS');
  }
  return _isIOS;
}

document.addEventListener('DOMContentLoaded', () => {
  // Também loga ao carregar o DOM
  isIOS();
  
  // Eventos dos botões do modal
  const modal = document.getElementById('ios-notification-modal');
  if (modal) {
    document.getElementById('ios-notif-yes').onclick = () => {
      modal.style.display = 'none';
      solicitarPermissaoNotificacao();
    };
    // Adicione ao seu script principal
    document.getElementById('fechar-ios-notification-modal').onclick = function() {
      document.getElementById('ios-notification-modal').style.display = 'none';
    };
    document.getElementById('ios-notif-never').onclick = () => {
      localStorage.setItem('iosNotifNeverShow', '1');
      modal.style.display = 'none';
    };
  }

  // Após login, se iOS, mostra o modal
  onAuthStateChanged(auth, (user) => {
    if (user) {
      setTimeout(mostrarModalNotificacaoIOS, 500);
    }
  });
});

// Exibe modal após login se for iOS, usuário logado e não marcado "nunca mostrar"
function mostrarModalNotificacaoIOS() {
  // Não mostra se não for iOS
  if (_isIOS === null) isIOS(); // garante que _isIOS está setado
  if (!_isIOS) return;
  // Não mostra se já marcou "nunca mostrar"
  if (localStorage.getItem('iosNotifNeverShow')) return;
  // Não mostra se já aceitou a permissão
  if (Notification.permission === 'granted') return;

  const modal = document.getElementById('ios-notification-modal');
  if (modal) modal.style.display = 'flex';
}

async function buscarTokenFCM() {
  try {
    // Registra o SW se necessário
    const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const token = await getToken(messaging, {
      vapidKey: 'BGqnPKyVrK1n4mnSspDY75WGNYDEqJ4k0MBamGuMhdSMImw5q33T-ssiEWHRczZrq01XNP4xuxrKXlUkKluXyAQ',
      serviceWorkerRegistration: swReg
    });
    console.log('Token FCM:', token);
    // Salva/exibe o token como já faz em solicitarPermissaoNotificacao
    const el = document.getElementById('fcm-token');
    if (el) el.textContent = token || 'Não foi possível obter o token';

    // Salva no Firestore se autenticado
    const db = getFirestore();
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
      await setDoc(doc(db, `usuarios/${user.uid}/fcmTokens`, token), { token });
      console.log('Token salvo no Firestore para o usuário:', user.uid);
    } else {
      pendingFcmToken = token;
      console.warn('Usuário não autenticado, token FCM será salvo após login.');
    }
  } catch (e) {
    console.error('Erro ao obter token FCM:', e);
    const el = document.getElementById('fcm-token');
    if (el) el.textContent = 'Erro ao obter token';
  }
}

// Modal de Teste de Notificação
const testNotifBtn = document.getElementById('test-notification-btn');
const modalTestNotif = document.getElementById('modal-test-notification'); // <-- CORRIGIDO
const fecharModalTestNotif = document.getElementById('fechar-modal-test-notification'); // <-- CORRIGIDO
const enviarTestNotif = document.getElementById('enviar-test-notification'); // <-- CORRIGIDO

if (testNotifBtn && modalTestNotif && fecharModalTestNotif && enviarTestNotif) {
  testNotifBtn.addEventListener('click', () => {
    modalTestNotif.style.display = 'flex';
    // Preenche data/hora padrão para agora
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1); // 1 min no futuro
    document.getElementById('test-notif-datetime').value = now.toISOString().slice(0,16);
  });

  fecharModalTestNotif.onclick = () => {
    modalTestNotif.style.display = 'none';
  };

  enviarTestNotif.onclick = async () => {
    const title = document.getElementById('test-notif-title').value || 'Notificação de Teste';
    const body = document.getElementById('test-notif-body').value || 'Esta é uma notificação de teste.';
    const datetime = document.getElementById('test-notif-datetime').value;
    if (!datetime) {
      alert('Escolha a data/hora de envio!');
      return;
    }
    const db = getFirestore();
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      alert('Faça login para testar notificações.');
      return;
    }
    await addDoc(collection(db, "scheduledNotifications"), {
      uid: user.uid,
      title,
      body,
      badge: "https://raw.githubusercontent.com/Ak4ai/TasksApp/e38ef409e5a90d423d1b5034e2229433d85cd538/badge.png",
      scheduledAt: new Date(datetime),
      sent: false,
      createdAt: serverTimestamp()
    });
    fetch('https://runa-phi.vercel.app/api/send-notifications', { method: 'POST' })
      .then(r => r.json())
      .then(data => alert('Resultado: ' + JSON.stringify(data)))
      .catch(e => alert('Erro ao chamar API: ' + e));
    modalTestNotif.style.display = 'none';
  };
}

window.onclick = function(event) {
  if (event.target === modalTestNotif) {
    modalTestNotif.style.display = "none";
  }
};
