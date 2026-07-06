const { GoogleAuth } = require('google-auth-library');
const { Expo } = require('expo-server-sdk');
const User = require('../models/User');

let accessToken = null;
let tokenExpiry = 0;

const getAccessToken = async () => {
  if (accessToken && Date.now() < tokenExpiry) return accessToken;

  const auth = new GoogleAuth({
    credentials: {
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
    },
    scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
  });

  const client = await auth.getIdTokenClient('https://firebase.googleapis.com/');
  const token = await client.getAccessToken();
  accessToken = token.token;
  tokenExpiry = Date.now() + 50 * 60 * 1000;
  return accessToken;
};

const INVALID_TOKEN_ERRORS = [
  'InvalidRegistration',
  'NotRegistered',
  'MismatchSenderId',
  'RegistrationTokenNotRegistered',
  'SenderIdMismatch',
];

const removeStaleToken = async (token) => {
  try {
    await User.updateMany({ fcmToken: token }, { $unset: { fcmToken: 1 } });
    console.log(`Cleaned up stale FCM token: ${token.substring(0, 30)}...`);
  } catch (err) {
    console.warn('Failed to clean stale token:', err.message);
  }
};

// Send via Expo Push API (for Expo push tokens)
const sendViaExpo = async ({ token, title, body, data = {} }) => {
  if (!Expo.isExpoPushToken(token)) {
    console.warn('Not a valid Expo push token:', token.substring(0, 30));
    return;
  }

  try {
    const expo = new Expo();
    const chunks = expo.chunkPushNotifications([{
      to: token,
      title,
      body,
      data,
      sound: 'notification.wav',
      channelId: 'chatzz_messages',
    }]);

    for (const chunk of chunks) {
      const receipts = await expo.sendPushNotificationsAsync(chunk);
      for (const receipt of receipts) {
        if (receipt.status === 'error' && receipt.message) {
          console.error('Expo push error:', receipt.message);
          if (receipt.details?.error === 'DeviceNotRegistered' || receipt.details?.error === 'InvalidCredentials') {
            await removeStaleToken(token);
          }
        } else {
          console.log('Expo push sent:', receipt.id);
        }
      }
    }
  } catch (err) {
    console.error('Expo push error:', err.message);
  }
};

// Send via FCM V1 API (for raw FCM device tokens)
const sendViaFCM = async ({ token, title, body, data = {}, android: androidConfig }) => {
  try {
    const at = await getAccessToken();
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

    const stringData = {};
    if (data && typeof data === 'object') {
      for (const [key, value] of Object.entries(data)) {
        stringData[key] = value != null ? String(value) : '';
      }
    }

    const channelConfig = androidConfig?.channelId || 'chatzz_messages';

    const message = {
      message: {
        token,
        notification: { title, body },
        data: stringData,
        android: {
          notification: {
            sound: 'notification',
            channelId: channelConfig,
            click_action: 'OPEN_CHAT',
          },
          priority: 'high',
          ttl: '86400s',
        },
        apns: {
          payload: {
            aps: {
              sound: 'notification.wav',
              badge: 1,
              'content-available': 1,
            },
          },
        },
      },
    };

    console.log(`Sending FCM V1 push to ${token.substring(0, 30)}...`);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${at}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    if (response.ok) {
      console.log('FCM V1 push sent:', JSON.stringify(result));
    } else {
      console.error('FCM V1 error:', response.status, JSON.stringify(result));
      const errorMessage = result.error?.message || '';
      const errorStatus = result.error?.status;
      if (INVALID_TOKEN_ERRORS.some((code) => errorMessage.includes(code)) || errorStatus === 'INVALID_ARGUMENT') {
        await removeStaleToken(token);
      }
    }
    return result;
  } catch (err) {
    console.error('FCM push error:', err.message);
  }
};

const sendPushNotification = async ({ token, title, body, data = {}, android: androidConfig }) => {
  if (!token) {
    console.warn('Push skipped: no token');
    return;
  }

  // Route to correct push provider based on token type
  if (token.startsWith('ExponentPushToken') || token.startsWith('ExpoPushToken')) {
    return sendViaExpo({ token, title, body, data });
  }

  return sendViaFCM({ token, title, body, data, android: androidConfig });
};

module.exports = { sendPushNotification };
