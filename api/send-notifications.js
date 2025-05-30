const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

// Inicialize o Firebase Admin apenas uma vez
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
    projectId: process.env.GOOGLE_CLOUD_PROJECT, // opcional, mas recomendado
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

  // Limpeza em massa se for por volta da meia-noite
  const now = new Date();
  const hora = now.getHours();
  const minutos = now.getMinutes();
  if (hora === 0 && minutos < 10) { // Entre 00:00 e 00:09
    const notificacoesEnviadas = await db.collection('scheduledNotifications')
      .where('sent', '==', true)
      .get();

    if (!notificacoesEnviadas.empty) {
      const batch = db.batch();
      notificacoesEnviadas.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      console.log(`Limpeza diária: removidas ${notificacoesEnviadas.size} notificações enviadas.`);
    }
  }

  // Busca notificações planejadas (exemplo: todas para hoje)
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
    // Busca todos os tokens FCM do usuário
    const tokensSnapshot = await db.collection(`usuarios/${notif.uid}/fcmTokens`).get();
    if (tokensSnapshot.empty) continue;

    const tokens = tokensSnapshot.docs.map(tokenDoc => tokenDoc.data().token);

    for (const token of tokens) {
      const message = {
        token,
        data: {
          title: notif.title,
          body: notif.body,
          badge: notif.badge || 'https://raw.githubusercontent.com/Ak4ai/TasksApp/e38ef409e5a90d423d1b5034e2229433d85cd538/badge.png'
        }
      };

      try {
        const response = await admin.messaging().send(message);
        results.push({ uid: notif.uid, token, status: 'sent', response });
      } catch (error) {
        results.push({ uid: notif.uid, token, status: 'error', error: error.message });
      }
    }
    // Marca como enviada após tentar todos os tokens
    await doc.ref.update({ sent: true });
  }

  res.status(200).json({ results });
};