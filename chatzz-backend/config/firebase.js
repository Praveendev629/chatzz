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
    console.log('Firebase Admin initialized');
  } catch (error) {
    console.error('Firebase init error:', error.message);
  }
};

const sendPushNotification = async ({ token, title, body, data = {}, category }) => {
  if (!token) {
    console.warn('Push skipped: no token');
    return;
  }

  // Skip Expo push tokens — they need Expo infrastructure
  if (token.startsWith('ExponentPushToken') || token.startsWith('ExpoPushToken')) {
    console.warn('Skipping Expo push token (FCM not configured in Expo). Token:', token.substring(0, 30));
    return;
  }

  if (!firebaseInitialized) initializeFirebase();
  if (!firebaseInitialized) {
    console.error('Firebase not initialized, cannot send push');
    return;
  }

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
      token,
    };

    console.log(`Sending FCM push to ${token.substring(0, 30)}...`);
    const response = await admin.messaging().send(message);
    console.log('FCM push sent:', response);
    return response;
  } catch (error) {
    console.error('FCM Error:', error.message);
  }
};

module.exports = { sendPushNotification };
