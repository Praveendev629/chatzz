import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import ChatsScreen from '../screens/ChatsScreen';
import PeopleScreen from '../screens/PeopleScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ChatScreen from '../screens/ChatScreen';
import { COLORS } from '../utils/constants';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TabIcon = ({ name, focused }: { name: string; focused: boolean }) => (
  <Text style={{ fontSize: 22 }}>{name}</Text>
);

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.primary },
        headerTitleStyle: { color: COLORS.white, fontWeight: 'bold', fontSize: 20 },
        headerTintColor: COLORS.white,
        tabBarStyle: { backgroundColor: COLORS.black, borderTopColor: '#222' },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: '#666',
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}>
      <Tab.Screen
        name="Chats"
        component={ChatsScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="💬" focused={focused} />, title: 'Chatzz' }}
      />
      <Tab.Screen
        name="People"
        component={PeopleScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="👥" focused={focused} /> }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="👤" focused={focused} /> }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen
            name="Chat"
            component={ChatScreen}
            options={{
              headerShown: true,
              headerStyle: { backgroundColor: COLORS.primary },
              headerTintColor: COLORS.white,
              headerTitleStyle: { fontWeight: 'bold' },
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
