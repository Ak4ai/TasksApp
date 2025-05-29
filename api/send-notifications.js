const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

// Inicialize o Firebase Admin apenas uma vez
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}
const db = getFirestore();

module.exports = async (req, res) => {
  // Habilita CORS para qualquer origem (ou especifique seu domínio)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Responde imediatamente a requisições OPTIONS (pré-flight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Busca notificações planejadas (exemplo: todas para hoje)
  const now = new Date();
  const snapshot = await db.collection('scheduledNotifications')
    .where('scheduledAt', '<=', now)
    .where('sent', '==', false)
    .get();

  if (snapshot.empty) {
    return res.status(200).json({ message: 'Nenhuma notificação planejada para enviar.' });
  }

  const results = [];
  for (const doc of snapshot.docs) {
    const notif = doc.data();
    // Busca o token FCM do usuário
    const tokenDoc = await db.collection('fcmTokens').doc(notif.uid).get();
    if (!tokenDoc.exists) continue;
    const { token } = tokenDoc.data();

    // Monta e envia a notificação
    const message = {
      token,
      notification: {
        title: notif.title,
        body: notif.body,
      },
    };

    try {
      const response = await admin.messaging().send(message);
      results.push({ uid: notif.uid, status: 'sent', response });
      // Marca como enviada
      await doc.ref.update({ sent: true });
    } catch (error) {
      results.push({ uid: notif.uid, status: 'error', error: error.message });
    }
  }

  res.status(200).json({ results });
};