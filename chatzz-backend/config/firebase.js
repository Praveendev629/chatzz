const admin = require('firebase-admin');

let firebaseInitialized = false;

const initializeFirebase = () => {
  if (firebaseInitialized) return;

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        clientId: process.env.FIREBASE_CLIENT_ID,
      }),
    });
    firebaseInitialized = true;
    console.log('✅ Firebase Admin initialized');
  } catch (error) {
    console.error('❌ Firebase init error:', error.message);
  }
};

const sendPushNotification = async ({ token, title, body, data = {} }) => {
  if (!firebaseInitialized) initializeFirebase();
  if (!token) return;

  try {
    const message = {
      notification: { title, body },
      data: { ...data, click_action: 'FLUTTER_NOTIFICATION_CLICK' },
      android: {
        notification: {
          sound: 'notification',
          channelId: 'chatzz_messages',
          priority: 'high',
        },
        priority: 'high',
      },
      apns: {
        payload: {
          aps: {
            sound: 'notification.wav',
            badge: 1,
            'mutable-content': 1,
            'content-available': 1,
          },
        },
      },
      token,
    };

    const response = await admin.messaging().send(message);
    return response;
  } catch (error) {
    console.error('FCM Error:', error.message);
  }
};

module.exports = { initializeFirebase, sendPushNotification };
