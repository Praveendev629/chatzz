const admin = require('firebase-admin');
const path = require('path');

let firebaseApp;

const initFirebase = () => {
  try {
    const serviceAccount = require(path.join(__dirname, 'firebase-service-account.json'));
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('✅ Firebase Admin initialized');
  } catch (err) {
    console.warn('⚠️  Firebase not configured — push notifications disabled');
  }
};

const sendPushNotification = async ({ token, title, body, data = {} }) => {
  if (!firebaseApp || !token) return;
  try {
    await admin.messaging().send({
      token,
      notification: { title, body },
      data,
      android: {
        notification: {
          sound: 'chatzz_sound',
          channelId: 'chatzz_messages',
        },
      },
      apns: {
        payload: {
          aps: { sound: 'chatzz_sound.caf' },
        },
      },
    });
  } catch (err) {
    console.error('Push notification error:', err.message);
  }
};

module.exports = { initFirebase, sendPushNotification };
