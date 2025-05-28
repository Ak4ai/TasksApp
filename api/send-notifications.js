import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

const app = initializeApp({
  credential: applicationDefault(),
});
const db = getFirestore();
const messaging = getMessaging();

export default async function handler(req, res) {
  const now = new Date().toISOString();
  const snapshot = await db.collection('scheduled_notifications')
    .where('sent', '==', false)
    .where('sendAt', '<=', now)
    .get();

  const batch = db.batch();
  const results = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();
    try {
      await messaging.send({
        token: data.token,
        notification: {
          title: data.title,
          body: data.body,
        },
      });
      batch.update(doc.ref, { sent: true });
      results.push({ id: doc.id, status: 'sent' });
    } catch (e) {
      results.push({ id: doc.id, status: 'error', error: e.message });
    }
  }

  await batch.commit();
  res.status(200).json({ results });
}