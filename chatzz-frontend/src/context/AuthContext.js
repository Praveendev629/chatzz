import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as Device from 'expo-device';
import { authAPI } from '../services/api';
import { registerForPushNotifications } from '../services/notifications';
import { initSocket, disconnectSocket } from '../services/socket';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      const deviceId = await getDeviceId();
      const result = await authAPI.checkDevice(deviceId);

      if (result.registered && result.token) {
        await saveSession(result.token, result.user);
        initSocket(result.token);
      } else {
        setIsNewUser(true);
      }
    } catch {
      setIsNewUser(true);
    } finally {
      setLoading(false);
    }
  };

  const getDeviceId = async () => {
    let deviceId = await SecureStore.getItemAsync('chatzz_device_id');
    if (!deviceId) {
      deviceId = Device.osInternalBuildId || Device.deviceName || `device_${Date.now()}`;
      await SecureStore.setItemAsync('chatzz_device_id', deviceId);
    }
    return deviceId;
  };

  const saveSession = async (newToken, newUser) => {
    await SecureStore.setItemAsync('chatzz_token', newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const register = async ({ username, profilePictureUri }) => {
    const deviceId = await getDeviceId();
    const fcmToken = await registerForPushNotifications();

    const formData = new FormData();
    formData.append('username', username);
    formData.append('deviceId', deviceId);
    if (fcmToken) formData.append('fcmToken', fcmToken);

    if (profilePictureUri) {
      const filename = profilePictureUri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      formData.append('profilePicture', { uri: profilePictureUri, name: filename, type });
    }

    const result = await authAPI.register(formData);
    await saveSession(result.token, result.user);
    initSocket(result.token);
    setIsNewUser(false);
    return result;
  };

  const updateUser = useCallback((updatedUser) => {
    setUser((prev) => ({ ...prev, ...updatedUser }));
  }, []);

  const logout = async () => {
    await SecureStore.deleteItemAsync('chatzz_token');
    await SecureStore.deleteItemAsync('chatzz_device_id');
    disconnectSocket();
    setUser(null);
    setToken(null);
    setIsNewUser(true);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, isNewUser, register, updateUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
