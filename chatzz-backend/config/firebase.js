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

const sendPushNotification = async ({ token, title, body, data = {}, android = {}, apns = {} }) => {
  if (!firebaseInitialized) initializeFirebase();
  if (!token) return;

  // Serialize all data values to strings (FCM requirement)
  const serializedData = {};
  for (const [k, v] of Object.entries(data)) {
    serializedData[k] = typeof v === 'string' ? v : JSON.stringify(v);
  }
  serializedData.click_action = 'FLUTTER_NOTIFICATION_CLICK';

  const isCall = data.type === 'incoming_call';

  try {
    const message = {
      notification: { title, body },
      data: serializedData,
      android: {
        priority: 'high',
        notification: {
          sound: isCall ? 'notification' : 'notification',
          channelId: isCall ? 'chatzz_calls' : 'chatzz_messages',
          priority: 'max',
          defaultSound: true,
          ...(android.notification || {}),
        },
        ...(android || {}),
      },
      apns: {
        headers: { 'apns-priority': isCall ? '10' : '10', ...(apns.headers || {}) },
        payload: {
          aps: {
            sound: 'notification.wav',
            badge: 1,
            contentAvailable: isCall ? true : false,
            ...(apns.payload?.aps || {}),
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
