import 'react-native-gesture-handler';
import React, { useEffect, useRef } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { NavigationContainerRef } from '@react-navigation/native';
import { AuthProvider } from './src/context/AuthContext';
import { SocketProvider } from './src/context/SocketContext';
import { ThemeProvider } from './src/context/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';
import {
  addNotificationListener,
  addNotificationResponseListener,
} from './src/services/notifications';

export const navigationRef = React.createRef();

export default function App() {
  useEffect(() => {
    const sub1 = addNotificationListener((notification) => {
      console.log('Notification received:', notification.request.content.title);
    });

    const sub2 = addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.type === 'message' && data?.chatId && navigationRef.current) {
        // Navigate to chat when notification tapped
        try {
          navigationRef.current.navigate('Chat', {
            chatId: data.chatId,
            participant: data.participant || { _id: data.senderId, username: data.senderName },
          });
        } catch (_) {}
      } else if (data?.type === 'call' && navigationRef.current) {
        try {
          navigationRef.current.navigate('Call', {
            participant: data.caller || { _id: data.callerId, username: data.callerName },
            isIncoming: true,
            offer: data.offer,
          });
        } catch (_) {}
      }
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
