import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { updateUser } from '../services/api';
import { disconnectSocket } from '../services/socket';
import { COLORS } from '../utils/constants';

export default function ProfileScreen() {
  const { user, logout, updateUserData } = useAuth();
  const { socket } = useSocket();
  const [name, setName] = useState(user?.name || '');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const handleUpdate = async () => {
    if (!user?._id) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      if (image) {
        const ext = image.split('.').pop();
        formData.append('profileImage', { uri: image, name: `profile.${ext}`, type: `image/${ext}` } as any);
      }
      const res = await updateUser(user._id, formData);
      updateUserData(res.data.user);
      Alert.alert('✅ Updated', 'Profile updated successfully');
    } catch {
      Alert.alert('Error', 'Could not update profile');
    }
    setLoading(false);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          socket?.disconnect();
          disconnectSocket();
          await logout();
        },
      },
    ]);
  };

  const displayImage = image || user?.profileImage;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.avatarSection}>
        <TouchableOpacity onPress={pickImage}>
          {displayImage ? (
            <Image source={{ uri: displayImage }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.editBadge}>
            <Text style={styles.editBadgeText}>✏️</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>YOUR NAME</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholderTextColor="#555"
          placeholder="Enter your name"
          maxLength={30}
        />

        <TouchableOpacity
          style={[styles.updateBtn, loading && { opacity: 0.7 }]}
          onPress={handleUpdate}
          disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.updateBtnText}>UPDATE PROFILE</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>LOGOUT</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black },
  avatarSection: { alignItems: 'center', paddingTop: 40, paddingBottom: 30 },
  avatar: { width: 110, height: 110, borderRadius: 55, borderWidth: 3, borderColor: COLORS.primary },
  avatarPlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: COLORS.white, fontSize: 40, fontWeight: '800' },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#222',
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  editBadgeText: { fontSize: 12 },
  form: { paddingHorizontal: 24 },
  label: { color: '#555', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8 },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 15,
    color: COLORS.white,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 20,
  },
  updateBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 14,
  },
  updateBtnText: { color: COLORS.white, fontWeight: '800', fontSize: 14, letterSpacing: 1.5 },
  logoutBtn: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  logoutText: { color: '#ff4444', fontWeight: '700', fontSize: 14, letterSpacing: 1 },
});
