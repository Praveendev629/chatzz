import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as Device from 'expo-device';
import * as FileSystem from 'expo-file-system';
import { authAPI, userAPI } from '../services/api';
import { registerForPushNotifications } from '../services/notifications';
import { initSocket, disconnectSocket } from '../services/socket';

const AuthContext = createContext({});

const PROFILE_PIC_PATH = FileSystem.documentDirectory + 'chatzz_profile.jpg';

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
        // Restore local profile picture if server URL is missing/stale
        const userData = result.user;
        const localPic = await loadLocalProfilePic();
        if (!userData.profilePicture && localPic) {
          userData.profilePicture = localPic;
        }
        await saveSession(result.token, userData);
        initSocket(result.token);

        // Refresh FCM token
        try {
          const fcmToken = await registerForPushNotifications();
          if (fcmToken) await authAPI.updateFcmToken(fcmToken);
        } catch (_) {}
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
      deviceId =
        Device.osInternalBuildId ||
        Device.deviceName ||
        `device_${Date.now()}`;
      await SecureStore.setItemAsync('chatzz_device_id', deviceId);
    }
    return deviceId;
  };

  // Load a locally-cached profile picture (survives network issues)
  const loadLocalProfilePic = async () => {
    try {
      const info = await FileSystem.getInfoAsync(PROFILE_PIC_PATH);
      if (info.exists) return PROFILE_PIC_PATH;
      return null;
    } catch {
      return null;
    }
  };

  // Save profile picture to local filesystem for permanent storage
  const saveLocalProfilePic = async (uri) => {
    try {
      if (uri && uri !== PROFILE_PIC_PATH) {
        await FileSystem.copyAsync({ from: uri, to: PROFILE_PIC_PATH });
      }
    } catch (err) {
      console.warn('Could not save profile pic locally:', err.message);
    }
  };

  const saveSession = async (newToken, newUser) => {
    await SecureStore.setItemAsync('chatzz_token', newToken);
    // Persist user JSON (non-sensitive) so we can restore instantly
    await SecureStore.setItemAsync('chatzz_user', JSON.stringify(newUser));
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
      // Cache locally for persistence
      await saveLocalProfilePic(profilePictureUri);
    }

    const result = await authAPI.register(formData);
    await saveSession(result.token, result.user);
    initSocket(result.token);
    setIsNewUser(false);
    return result;
  };

  const updateUser = useCallback(async (updatedUser) => {
    setUser((prev) => {
      const merged = { ...prev, ...updatedUser };
      // Persist
      SecureStore.setItemAsync('chatzz_user', JSON.stringify(merged)).catch(() => {});
      return merged;
    });

    // If profile picture changed, save locally
    if (updatedUser.profilePicture) {
      await saveLocalProfilePic(updatedUser.profilePicture);
    }
  }, []);

  const deleteAccount = async () => {
    try {
      await userAPI.deleteAccount();
    } catch (err) {
      // Continue even if API fails
      console.warn('Delete account error:', err.message);
    }
    // Clean up local data
    await SecureStore.deleteItemAsync('chatzz_token');
    await SecureStore.deleteItemAsync('chatzz_device_id');
    await SecureStore.deleteItemAsync('chatzz_user');
    try { await FileSystem.deleteAsync(PROFILE_PIC_PATH, { idempotent: true }); } catch (_) {}
    disconnectSocket();
    setUser(null);
    setToken(null);
    setIsNewUser(true);
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('chatzz_token');
    await SecureStore.deleteItemAsync('chatzz_device_id');
    await SecureStore.deleteItemAsync('chatzz_user');
    disconnectSocket();
    setUser(null);
    setToken(null);
    setIsNewUser(true);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isNewUser,
        register,
        updateUser,
        logout,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
