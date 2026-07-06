import 'react-native-gesture-handler';
import React, { useEffect, useRef } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { NavigationContainerRef } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { AuthProvider } from './src/context/AuthContext';
import { SocketProvider } from './src/context/SocketContext';
import { ThemeProvider } from './src/context/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';
import {
  addNotificationListener,
  addNotificationResponseListener,
} from './src/services/notifications';
import { getSocket, emitSendMessage } from './src/services/socket';
import { messageAPI } from './src/services/api';
import { getActiveChatId } from './src/utils/activeChat';

// Configure how notifications display in foreground
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const chatId = notification?.request?.content?.data?.chatId;
    const activeChatId = getActiveChatId();
    if (chatId && activeChatId && chatId === activeChatId) {
      return { shouldShowAlert: false, shouldPlaySound: false, shouldSetBadge: false };
    }
    return { shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: true };
  },
});

export const navigationRef = React.createRef();

// Handle notification when app is killed and opened via tap
const handleInitialNotification = async () => {
  try {
    const response = await Notifications.getLastNotificationResponseAsync();
    if (response) {
      handleNotificationResponse(response);
    }
  } catch (_) {}
};

const handleNotificationResponse = (response) => {
  const data = response.notification?.request?.content?.data;
  const actionIdentifier = response.actionIdentifier;

  // Handle inline reply
  if (actionIdentifier === 'reply' && response.userText) {
    const replyText = response.userText.trim();
    if (!replyText) return;
    if (data?.chatId && data?.senderId) {
      const socket = getSocket();
      if (socket?.connected) {
        emitSendMessage({
          chatId: data.chatId,
          receiverId: data.senderId,
          messageType: 'text',
          content: replyText,
        });
      } else {
        const formData = new FormData();
        formData.append('chatId', data.chatId);
        formData.append('receiverId', data.senderId);
        formData.append('messageType', 'text');
        formData.append('content', replyText);
        messageAPI.send(formData).catch(() => {});
      }
    }
  }

  // Navigate to chat
  if (data?.chatId && navigationRef.current) {
    setTimeout(() => {
      try {
        navigationRef.current.navigate('Chat', {
          chatId: data.chatId,
          participant: { _id: data.senderId, username: data.senderName },
        });
      } catch (_) {}
    }, 800);
  }
};

export default function App() {
  useEffect(() => {
    // Handle notification that opened the app from killed state
    handleInitialNotification();

    const sub1 = addNotificationListener((notification) => {
      console.log('Notification received:', notification.request.content.title);
    });

    const sub2 = addNotificationResponseListener((response) => {
      handleNotificationResponse(response);
    });

    return () => {
      sub1.remove();
      sub2.remove();
    };
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <ThemeProvider>
        <AuthProvider>
          <SocketProvider>
            <AppNavigator navigationRef={navigationRef} />
          </SocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
