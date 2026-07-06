const { GoogleAuth } = require('google-auth-library');

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
  tokenExpiry = Date.now() + 50 * 60 * 1000; // refresh every 50 min
  return accessToken;
};

const sendPushNotification = async ({ token, title, body, data = {} }) => {
  if (!token) {
    console.warn('Push skipped: no token');
    return;
  }

  // Skip Expo push tokens
  if (token.startsWith('ExponentPushToken') || token.startsWith('ExpoPushToken')) {
    console.warn('Skipping Expo token (need FCM token):', token.substring(0, 30));
    return;
  }

  try {
    const accessToken = await getAccessToken();
    const projectId = process.env.FIREBASE_PROJECT_ID;

    // FCM V1 API endpoint
    const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

    const message = {
      message: {
        token,
        notification: { title, body },
        data: data || {},
        android: {
          notification: {
            sound: 'notification',
            channelId: 'chatzz_messages',
          },
          priority: 'high',
        },
      },
    };

    console.log(`Sending FCM V1 push to ${token.substring(0, 30)}...`);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    if (response.ok) {
      console.log('FCM V1 push sent:', JSON.stringify(result));
    } else {
      console.error('FCM V1 error:', response.status, JSON.stringify(result));
    }
    return result;
  } catch (err) {
    console.error('Push error:', err.message);
  }
};

module.exports = { sendPushNotification };
