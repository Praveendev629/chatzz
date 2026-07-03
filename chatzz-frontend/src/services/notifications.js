import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { getActiveChatId } from '../utils/activeChat';

// Quick-reply action for message notifications
const MESSAGE_CATEGORY = 'message_reply';
const CALL_CATEGORY = 'call';

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    // Suppress notification if user is viewing the chat
    const chatId = notification?.request?.content?.data?.chatId;
    const activeChatId = getActiveChatId();
    if (chatId && activeChatId && chatId === activeChatId) {
      return { shouldShowAlert: false, shouldPlaySound: false, shouldSetBadge: false };
    }
    return { shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: true };
  },
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

  // Register notification categories for quick actions (iOS)
  if (Platform.OS === 'ios') {
    await Notifications.setNotificationCategoryAsync(MESSAGE_CATEGORY, [
      {
        identifier: 'reply',
        buttonTitle: 'Reply',
        textInput: { submitButtonTitle: 'Send', placeholder: 'Type a reply...' },
        options: { isDestructive: false, isAuthenticationRequired: false },
      },
    ]);

    await Notifications.setNotificationCategoryAsync(CALL_CATEGORY, [
      { identifier: 'answer', buttonTitle: '✅ Answer', options: { opensAppToForeground: true } },
      { identifier: 'decline', buttonTitle: '❌ Decline', options: { isDestructive: true, opensAppToForeground: false } },
    ]);
  }

  // Register notification categories with actions for Android
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('chatzz_messages', {
      name: 'Chatzz Messages',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#E53935',
      sound: 'notification.wav',
      enableVibrate: true,
      showBadge: true,
    });

    await Notifications.setNotificationChannelAsync('chatzz_calls', {
      name: 'Chatzz Calls',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 500, 500, 500, 500],
      lightColor: '#4CAF50',
      sound: 'notification.wav',
      enableVibrate: true,
      bypassDnd: true,
    });

    // Set up Android notification categories with reply action
    await Notifications.setNotificationCategoryAsync(MESSAGE_CATEGORY, [
      {
        identifier: 'reply',
        buttonTitle: 'Reply',
        textInput: { submitButtonTitle: 'Send', placeholder: 'Type a reply...' },
        options: { isDestructive: false, opensAppToForeground: false },
      },
    ]);

    await Notifications.setNotificationCategoryAsync(CALL_CATEGORY, [
      { identifier: 'answer', buttonTitle: '✅ Answer', options: { opensAppToForeground: true } },
      { identifier: 'decline', buttonTitle: '❌ Decline', options: { isDestructive: true, opensAppToForeground: false } },
    ]);
  }

  try {
    const token = (await Notifications.getDevicePushTokenAsync()).data;
    return token;
  } catch {
    try {
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      return token;
    } catch { return null; }
  }
};

export const addNotificationListener = (callback) => {
  return Notifications.addNotificationReceivedListener(callback);
};

export const addNotificationResponseListener = (callback) => {
  return Notifications.addNotificationResponseReceivedListener(callback);
};

export const scheduleLocalNotification = async ({ title, body, data, categoryIdentifier }) => {
  const channelId = categoryIdentifier === 'call' ? 'chatzz_calls' : 'chatzz_messages';
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data || {},
      sound: 'notification.wav',
      categoryIdentifier: categoryIdentifier || MESSAGE_CATEGORY,
      ...(Platform.OS === 'android' && { channelId }),
    },
    trigger: null,
  });
};

export const dismissAllNotifications = async () => {
  await Notifications.dismissAllNotificationsAsync();
};
