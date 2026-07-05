const { Expo } = require('expo-server-sdk');

let expo = null;

const getExpo = () => {
  if (!expo) expo = new Expo();
  return expo;
};

const sendPushNotification = async ({ token, title, body, data = {} }) => {
  if (!token) {
    console.warn('Push skipped: no token');
    return;
  }

  if (!Expo.isExpoPushToken(token)) {
    console.warn('Not a valid Expo push token:', token.substring(0, 30));
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
  }];

  try {
    const chunks = getExpo().chunkPushNotifications(messages);
    for (const chunk of chunks) {
      const receipts = await getExpo().sendPushNotificationsAsync(chunk);
      console.log('Expo push sent:', JSON.stringify(receipts));
    }
  } catch (err) {
    console.error('Push error:', err.message);
  }
};

module.exports = { sendPushNotification };
