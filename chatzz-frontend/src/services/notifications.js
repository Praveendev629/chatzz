import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const registerForPushNotifications = async () => {
  if (!Device.isDevice) {
    console.warn('Push notifications only work on physical devices');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Push notification permission denied');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('chatzz_messages', {
      name: 'Chatzz Messages',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#E53935',
      sound: 'notification.wav',
    });
  }

  // For Expo Go use getExpoPushTokenAsync, for production use getDevicePushTokenAsync (FCM)
  try {
    const token = (await Notifications.getDevicePushTokenAsync()).data;
    return token;
  } catch {
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    return token;
  }
};

export const addNotificationListener = (callback) => {
  return Notifications.addNotificationReceivedListener(callback);
};

export const addNotificationResponseListener = (callback) => {
  return Notifications.addNotificationResponseReceivedListener(callback);
};

export const scheduleLocalNotification = async ({ title, body, data }) => {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data, sound: 'notification.wav' },
    trigger: null,
  });
};
