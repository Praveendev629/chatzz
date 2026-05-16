import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import AppNavigator from './app/navigation/AppNavigator';
import { AuthProvider } from './app/context/AuthContext';
import { SocketProvider } from './app/context/SocketContext';
import SplashScreenView from './app/screens/SplashScreen';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar style="light" backgroundColor="#000000" />
      <AuthProvider>
        <SocketProvider>
          <NavigationContainer>
            {showSplash ? (
              <SplashScreenView onFinish={() => setShowSplash(false)} />
            ) : (
              <AppNavigator />
            )}
          </NavigationContainer>
        </SocketProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
});
