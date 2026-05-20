import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Image, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { Colors, Spacing, BorderRadius } from '../theme';

const OnboardingScreen = ({ navigation }) => {
  const { register } = useAuth();
  const [username, setUsername] = useState('');
  const [profilePic, setProfilePic] = useState(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera roll access is required');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) setProfilePic(result.assets[0].uri);
  };

  const takePicture = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });

    if (!result.canceled) setProfilePic(result.assets[0].uri);
  };

  const handleImagePick = () => {
    Alert.alert('Profile Picture', 'Choose an option', [
      { text: 'Camera', onPress: takePicture },
      { text: 'Gallery', onPress: pickImage },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleRegister = async () => {
    if (!username.trim()) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }
    if (username.trim().length < 3) {
      Alert.alert('Error', 'Username must be at least 3 characters');
      return;
    }

    setLoading(true);
    try {
      await register({ username: username.trim(), profilePictureUri: profilePic });
    } catch (error) {
      Alert.alert('Error', error.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>

        <Text style={styles.title}>Create Your Profile</Text>
        <Text style={styles.subtitle}>This is how others will see you on Chatzz</Text>

        {/* Profile Picture */}
        <TouchableOpacity style={styles.avatarContainer} onPress={handleImagePick} activeOpacity={0.8}>
          {profilePic ? (
            <Image source={{ uri: profilePic }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={48} color={Colors.textMuted} />
            </View>
          )}
          <View style={styles.cameraBtn}>
            <Ionicons name="camera" size={18} color={Colors.white} />
          </View>
        </TouchableOpacity>

        <Text style={styles.avatarHint}>Tap to add profile photo</Text>

        {/* Username Input */}
        <View style={styles.inputContainer}>
          <View style={styles.inputIcon}>
            <Ionicons name="person-outline" size={20} color={Colors.textSecondary} />
          </View>
          <TextInput
            style={styles.input}
            placeholder="Enter username"
            placeholderTextColor={Colors.textMuted}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={30}
          />
        </View>
        <Text style={styles.inputHint}>{username.length}/30 characters • Min. 3 characters</Text>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={18} color={Colors.primary} />
          <Text style={styles.infoText}>One account is created per device. Your profile is stored securely.</Text>
        </View>

        <TouchableOpacity
          style={[styles.registerBtn, loading && styles.registerBtnDisabled]}
          onPress={handleRegister}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <>
              <Text style={styles.registerBtnText}>Create Account</Text>
              <Ionicons name="checkmark-circle" size={22} color={Colors.white} style={{ marginLeft: 8 }} />
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.xl, paddingTop: 60, alignItems: 'center' },
  backBtn: { position: 'absolute', top: 16, left: Spacing.lg },
  title: { fontSize: 28, fontWeight: '800', color: Colors.text, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginBottom: Spacing.xl, textAlign: 'center' },
  avatarContainer: {
    width: 120, height: 120, borderRadius: 60,
    marginBottom: Spacing.sm, position: 'relative',
    borderWidth: 3, borderColor: Colors.primary,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
  },
  avatar: { width: '100%', height: '100%', borderRadius: 60 },
  avatarPlaceholder: {
    width: '100%', height: '100%', borderRadius: 60,
    backgroundColor: Colors.surfaceLight, alignItems: 'center', justifyContent: 'center',
  },
  cameraBtn: {
    position: 'absolute', bottom: 2, right: 2,
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.background,
  },
  avatarHint: { fontSize: 12, color: Colors.textMuted, marginBottom: Spacing.xl },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.inputBg, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border,
    width: '100%', marginBottom: 6,
  },
  inputIcon: { paddingHorizontal: Spacing.md },
  input: { flex: 1, paddingVertical: 16, color: Colors.text, fontSize: 16 },
  inputHint: { fontSize: 12, color: Colors.textMuted, alignSelf: 'flex-start', marginBottom: Spacing.lg },
  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: `${Colors.primary}15`, borderRadius: BorderRadius.md,
    padding: Spacing.md, width: '100%', marginBottom: Spacing.xl,
  },
  infoText: { flex: 1, marginLeft: 8, fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  registerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, paddingVertical: 16,
    borderRadius: BorderRadius.full, width: '100%',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  registerBtnDisabled: { opacity: 0.6 },
  registerBtnText: { fontSize: 17, fontWeight: '700', color: Colors.white },
});

export default OnboardingScreen;
