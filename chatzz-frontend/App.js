import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { AuthProvider } from './src/context/AuthContext';
import { SocketProvider } from './src/context/SocketContext';
import AppNavigator from './src/navigation/AppNavigator';
import {
  addNotificationListener,
  addNotificationResponseListener,
} from './src/services/notifications';

export default function App() {
  useEffect(() => {
    const sub1 = addNotificationListener((notification) => {
      console.log('Notification received:', notification);
    });

    const sub2 = addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data;
      console.log('Notification tapped:', data);
      // Navigate based on notification type
    });

    return () => {
      sub1.remove();
      sub2.remove();
    };
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <AuthProvider>
        <SocketProvider>
          <AppNavigator />
        </SocketProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
