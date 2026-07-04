const { Expo } = require('expo-server-sdk');

let expo = null;

const getExpo = () => {
  if (!expo) expo = new Expo();
  return expo;
};

const sendPushNotification = async ({ token, title, body, data = {}, category }) => {
  if (!token) return;

  // Expo push tokens start with ExponentPushToken or ExpoPushToken
  const isExpoToken = token.startsWith('ExponentPushToken') || token.startsWith('ExpoPushToken');

  if (isExpoToken) {
    // Send via Expo Push API — supports categories for inline reply
    const messages = [{
      to: token,
      title,
      body,
      data: data || {},
      sound: 'notification.wav',
      channelId: 'chatzz_messages',
      ...(category && { category }),
    }];

    const chunks = getExpo().chunkPushNotifications(messages);
    for (const chunk of chunks) {
      try {
        await getExpo().sendPushNotificationsAsync(chunk);
      } catch (err) {
        console.error('Expo push error:', err.message);
      }
    }
    return;
  }

  // Fallback: send via Firebase for legacy FCM tokens
  try {
    const admin = require('firebase-admin');
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          clientId: process.env.FIREBASE_CLIENT_ID,
        }),
      });
    }

    await admin.messaging().send({
      notification: { title, body },
      data: { ...data, click_action: 'FLUTTER_NOTIFICATION_CLICK' },
      android: {
        notification: { sound: 'notification', channelId: 'chatzz_messages', priority: 'high' },
        priority: 'high',
      },
      token,
    });
  } catch (error) {
    console.error('FCM Error:', error.message);
  }
};

module.exports = { sendPushNotification };
