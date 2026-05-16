import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { registerUser } from '../services/api';
import { registerForPushNotifications } from '../services/notifications';
import { COLORS } from '../utils/constants';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const { login } = useAuth();
  const [name, setName] = useState('');
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

  const handleJoin = async () => {
    if (!name.trim()) return Alert.alert('Error', 'Please enter your name');

    setLoading(true);
    try {
      const fcmToken = await registerForPushNotifications();
      const formData = new FormData();
      formData.append('name', name.trim());
      if (fcmToken) formData.append('fcmToken', fcmToken);
      if (image) {
        const ext = image.split('.').pop();
        formData.append('profileImage', {
          uri: image,
          name: `profile.${ext}`,
          type: `image/${ext}`,
        } as any);
      }

      const res = await registerUser(formData);
      await login(res.data.user);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Image
        source={require('../../assets/logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.title}>CHATZZ</Text>
      <Text style={styles.subtitle}>INSTANT MESSENGER</Text>

      <TouchableOpacity style={styles.avatarPicker} onPress={pickImage}>
        {image ? (
          <Image source={{ uri: image }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarIcon}>📷</Text>
            <Text style={styles.avatarText}>Add Photo</Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Enter your name"
          placeholderTextColor="#666"
          value={name}
          onChangeText={setName}
          maxLength={30}
        />
      </View>

      <TouchableOpacity
        style={[styles.button, loading && { opacity: 0.7 }]}
        onPress={handleJoin}
        disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>JOIN CHATZZ</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.watermark}>craft by p.s</Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.black,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  logo: { width: 100, height: 100, marginBottom: 12 },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 6,
  },
  subtitle: {
    fontSize: 11,
    color: COLORS.white,
    letterSpacing: 3,
    marginBottom: 40,
    opacity: 0.7,
  },
  avatarPicker: {
    marginBottom: 28,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111',
  },
  avatarIcon: { fontSize: 26 },
  avatarText: { color: '#666', fontSize: 11, marginTop: 4 },
  inputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    color: COLORS.white,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  button: {
    width: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2,
  },
  watermark: {
    position: 'absolute',
    bottom: 30,
    color: '#444',
    fontSize: 11,
    letterSpacing: 1,
  },
});
