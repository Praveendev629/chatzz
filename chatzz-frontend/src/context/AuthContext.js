import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import * as FileSystem from 'expo-file-system';
import messaging from '@react-native-firebase/messaging';
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
  const _tokenRefreshSubRef = React.useRef(null);

  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      // ── OFFLINE-FIRST: restore from local storage immediately ──────────────
      const cachedToken = await SecureStore.getItemAsync('chatzz_token');
      const cachedUserStr = await SecureStore.getItemAsync('chatzz_user');

      if (cachedToken && cachedUserStr) {
        const cachedUser = JSON.parse(cachedUserStr);
        const localPic = await loadLocalProfilePic();
        if (localPic && !cachedUser.profilePicture?.startsWith('http')) {
          cachedUser.profilePicture = localPic;
        }
        setToken(cachedToken);
        setUser(cachedUser);
        initSocket(cachedToken);

        // Background sync: verify token + refresh FCM
        setLoading(false);
        try {
          const deviceId = await getDeviceId();
          const result = await authAPI.checkDevice(deviceId);
          if (result.registered && result.token) {
            await saveSession(result.token, { ...cachedUser, ...result.user });
          }
          const fcmToken = await registerForPushNotifications();
          if (fcmToken) await authAPI.updateFcmToken(fcmToken);

          // Listen for FCM token rotations (happens on app updates, token expiry, etc.)
          const tokenSub = messaging().onTokenRefresh(async (newToken) => {
            try {
              console.log('Firebase FCM token refreshed:', newToken.substring(0, 40) + '...');
              await authAPI.updateFcmToken(newToken);
            } catch (_) {}
          });
          _tokenRefreshSubRef.current = tokenSub;
        } catch (_) {}
        return;
      }

      // ── No cached session – check if device is already registered ──────────
      const deviceId = await getDeviceId();
      const result = await authAPI.checkDevice(deviceId);

      if (result.registered && result.token) {
        // Device already has an account – auto-login
        const userData = result.user;
        const localPic = await loadLocalProfilePic();
        if (!userData.profilePicture && localPic) userData.profilePicture = localPic;
        await saveSession(result.token, userData);
        initSocket(result.token);
        try {
          const fcmToken = await registerForPushNotifications();
          if (fcmToken) await authAPI.updateFcmToken(fcmToken);
        } catch (_) {}
      } else {
        // New device – show registration
        setIsNewUser(true);
      }
    } catch {
      const cachedToken = await SecureStore.getItemAsync('chatzz_token').catch(() => null);
      const cachedUserStr = await SecureStore.getItemAsync('chatzz_user').catch(() => null);
      if (cachedToken && cachedUserStr) {
        const cachedUser = JSON.parse(cachedUserStr);
        setToken(cachedToken);
        setUser(cachedUser);
        initSocket(cachedToken);
      } else {
        setIsNewUser(true);
      }
    } finally {
      setLoading(false);
    }
  };

  // Get unique device ID – persists across reinstalls via Android's ANDROID_ID
  const getDeviceId = async () => {
    // Android's ANDROID_ID is a stable constant per device+app-signing-key
    const androidId = Application.androidId;
    if (androidId) return androidId;

    // Fallback for iOS or edge cases
    let deviceId = await SecureStore.getItemAsync('chatzz_device_id');
    if (deviceId) return deviceId;

    const hardwareId = Device.osInternalBuildId || Device.deviceName || 'dev';
    const randomSuffix = Math.random().toString(36).substring(2, 10);
    const timestamp = Date.now().toString(36);
    deviceId = `${hardwareId}_${timestamp}_${randomSuffix}`;
    await SecureStore.setItemAsync('chatzz_device_id', deviceId);
    return deviceId;
  };

  const loadLocalProfilePic = async () => {
    try {
      const info = await FileSystem.getInfoAsync(PROFILE_PIC_PATH);
      if (info.exists) return PROFILE_PIC_PATH + '?v=' + Date.now();
      return null;
    } catch { return null; }
  };

  const saveLocalProfilePic = async (uri) => {
    try {
      if (uri && !uri.startsWith(FileSystem.documentDirectory)) {
        await FileSystem.copyAsync({ from: uri, to: PROFILE_PIC_PATH });
      }
    } catch (err) {
      console.warn('Could not save profile pic locally:', err.message);
    }
  };

  const saveSession = async (newToken, newUser) => {
    await SecureStore.setItemAsync('chatzz_token', newToken);
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
      SecureStore.setItemAsync('chatzz_user', JSON.stringify(merged)).catch(() => {});
      return merged;
    });
    if (updatedUser.profilePicture && !updatedUser.profilePicture.startsWith('http')) {
      await saveLocalProfilePic(updatedUser.profilePicture);
    }
  }, []);

  const deleteAccount = async () => {
    if (_tokenRefreshSubRef.current) {
      _tokenRefreshSubRef.current.remove();
      _tokenRefreshSubRef.current = null;
    }
    try { await userAPI.deleteAccount(); } catch (err) {
      console.warn('Delete account error:', err.message);
    }
    await SecureStore.deleteItemAsync('chatzz_token');
    await SecureStore.deleteItemAsync('chatzz_user');
    try { await FileSystem.deleteAsync(PROFILE_PIC_PATH, { idempotent: true }); } catch (_) {}
    disconnectSocket();
    setUser(null);
    setToken(null);
    setIsNewUser(true);
  };

  const logout = async () => {
    if (_tokenRefreshSubRef.current) {
      _tokenRefreshSubRef.current.remove();
      _tokenRefreshSubRef.current = null;
    }
    await SecureStore.deleteItemAsync('chatzz_token');
    await SecureStore.deleteItemAsync('chatzz_user');
    disconnectSocket();
    setUser(null);
    setToken(null);
    setIsNewUser(true);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, isNewUser, register, updateUser, logout, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
