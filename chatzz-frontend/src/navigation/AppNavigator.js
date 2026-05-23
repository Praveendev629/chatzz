import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSocket } from '../context/SocketContext';
import { scheduleLocalNotification } from '../services/notifications';

import SplashScreen from '../screens/SplashScreen';
import GetStartedScreen from '../screens/GetStartedScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ChatScreen from '../screens/ChatScreen';
import SettingsScreen from '../screens/SettingsScreen';
import CallScreen from '../screens/CallScreen';

const Stack = createNativeStackNavigator();

const AppNavigator = ({ navigationRef }) => {
  const { user, loading } = useAuth();
  const { colors } = useTheme();
  const { on, off } = useSocket();
  const [splashDone, setSplashDone] = useState(false);

  // Handle incoming calls globally (even from other screens)
  useEffect(() => {
    if (!user) return;
    const handleIncomingCall = (data) => {
      // Send call notification (works even when app is in foreground)
      scheduleLocalNotification({
        title: `📞 Incoming Call from ${data.caller?.username || 'Someone'}`,
        body: 'Tap to answer',
        data: { type: 'call', caller: data.caller, callerId: data.from, offer: data.offer },
        categoryIdentifier: 'call',
      });
      // Navigate to call screen
      if (navigationRef?.current) {
        try {
          navigationRef.current.navigate('Call', {
            participant: data.caller,
            isIncoming: true,
            offer: data.offer,
          });
        } catch (_) {}
      }
    };

    on('call_offer', handleIncomingCall);
    return () => off('call_offer', handleIncomingCall);
  }, [user, on, off]);

  if (loading || !splashDone) {
    return <SplashScreen onFinish={() => setSplashDone(true)} />;
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        {!user ? (
          <>
            <Stack.Screen name="GetStarted" component={GetStartedScreen} />
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Main" component={HomeScreen} />
            <Stack.Screen name="Search" component={SearchScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen
              name="Call"
              component={CallScreen}
              options={{ animation: 'slide_from_bottom', gestureEnabled: false }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({});

export default AppNavigator;
