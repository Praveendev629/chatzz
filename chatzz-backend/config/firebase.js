const { Expo } = require('expo-server-sdk');

let expo = null;

const getExpo = () => {
  if (!expo) expo = new Expo();
  return expo;
};

const sendPushNotification = async ({ token, title, body, data = {}, category }) => {
  if (!token) {
    console.warn('Push skipped: no token for receiver');
    return;
  }

  // Expo push tokens start with ExponentPushToken or ExpoPushToken
  const isExpoToken = token.startsWith('ExponentPushToken') || token.startsWith('ExpoPushToken');

  if (isExpoToken) {
    // Validate the token
    if (!Expo.isExpoPushToken(token)) {
      console.warn('Invalid Expo push token:', token);
      return;
    }

    const messages = [{
      to: token,
      title,
      body,
      data: data || {},
      sound: 'default',
      channelId: 'chatzz_messages',
      priority: 'high',
      ...(category && { category }),
    }];

    console.log(`Sending Expo push to ${token.substring(0, 30)}...`);
    const chunks = getExpo().chunkPushNotifications(messages);
    for (const chunk of chunks) {
      try {
        const receipts = await getExpo().sendPushNotificationsAsync(chunk);
        console.log('Expo push receipts:', JSON.stringify(receipts));
      } catch (err) {
        console.error('Expo push error:', err.message);
      }
    }
    return;
  }

  // Fallback: send via Firebase for legacy FCM tokens
  console.log('Using Firebase fallback for token:', token.substring(0, 30));
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
