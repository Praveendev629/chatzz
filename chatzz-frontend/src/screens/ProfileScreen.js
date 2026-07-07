import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity,
  ScrollView, Alert, TextInput, StatusBar, ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { userAPI } from '../services/api';
import { uploadToCloudinary } from '../utils/cloudinary';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Spacing, BorderRadius } from '../theme';

const ProfileScreen = ({ navigation }) => {
  const { user, updateUser, logout, token } = useAuth();
  const { colors: C } = useTheme();
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState(user?.username || '');
  const [about, setAbout] = useState(user?.about || '');
  const [loading, setLoading] = useState(false);
  const [profilePic, setProfilePic] = useState(user?.profilePicture);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow photo access in settings'); return; }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (!result.canceled) {
      setProfilePic(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow camera access in settings'); return; }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (!result.canceled) {
      setProfilePic(result.assets[0].uri);
    }
  };

  const handlePickImagePress = () => {
    Alert.alert('Profile Photo', '', [
      { text: 'Take Photo', onPress: takePhoto },
      { text: 'Choose from Gallery', onPress: pickImage },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const saveProfile = async () => {
    if (!username.trim()) { Alert.alert('Error', 'Username is required'); return; }
    setLoading(true);
    try {
      const payload = { username: username.trim(), about: about.trim() };

      if (profilePic && profilePic !== user.profilePicture) {
        const profilePictureUrl = await uploadToCloudinary(profilePic, 'chatzz/profiles', token);
        payload.profilePictureUrl = profilePictureUrl;
      }

      const result = await userAPI.updateProfile(payload);
      await updateUser({
        ...result.user,
        profilePicture: result.user?.profilePicture || profilePic,
      });
      setEditing(false);
      Alert.alert('Saved', 'Profile updated successfully!');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: C.background }]} contentContainerStyle={styles.content}>
      <StatusBar barStyle="light-content" backgroundColor={C.background} />

      <View style={[styles.header, { borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: C.text }]}>Profile</Text>
        <TouchableOpacity onPress={() => editing ? saveProfile() : setEditing(true)}>
          {loading ? <ActivityIndicator color={C.primary} size="small" /> :
            <Text style={[styles.editBtn, { color: C.primary }]}>{editing ? 'Save' : 'Edit'}</Text>}
        </TouchableOpacity>
      </View>

      {/* Avatar */}
      <View style={styles.avatarSection}>
        <TouchableOpacity
          style={styles.avatarContainer}
          onPress={editing ? handlePickImagePress : undefined}
          activeOpacity={editing ? 0.7 : 1}
        >
          {profilePic ? (
            <Image source={{ uri: profilePic }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: C.surfaceLight, borderColor: C.border }]}>
              <Ionicons name="person" size={50} color={C.textMuted} />
            </View>
          )}
          {editing && (
            <View style={styles.cameraOverlay}>
              <Ionicons name="camera" size={26} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 11, marginTop: 4 }}>Change</Text>
            </View>
          )}
        </TouchableOpacity>
        {!editing && <Text style={[styles.username, { color: C.text }]}>{user?.username}</Text>}
        {!editing && <Text style={[styles.about, { color: C.textSecondary }]}>{user?.about}</Text>}
      </View>

      {/* Edit Form */}
      {editing && (
        <View style={styles.form}>
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: C.textMuted }]}>USERNAME</Text>
            <TextInput
              style={[styles.fieldInput, { backgroundColor: C.inputBg, color: C.text, borderColor: C.border }]}
              value={username} onChangeText={setUsername}
              placeholder="Username" placeholderTextColor={C.textMuted}
              maxLength={30} autoCapitalize="none"
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: C.textMuted }]}>ABOUT</Text>
            <TextInput
              style={[styles.fieldInput, { backgroundColor: C.inputBg, color: C.text, borderColor: C.border, height: 80 }]}
              value={about} onChangeText={setAbout}
              placeholder="Write something about yourself..."
              placeholderTextColor={C.textMuted} multiline maxLength={150}
            />
          </View>
        </View>
      )}

      {/* Info Cards */}
      {!editing && (
        <View style={styles.infoCards}>
          <InfoRow icon="person-outline" label="Username" value={user?.username} colors={C} />
          <InfoRow icon="information-circle-outline" label="About" value={user?.about || 'No bio yet'} colors={C} />
          <InfoRow icon="ellipse" label="Status" value="Active" valueColor={C.online} colors={C} />
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionRow, { backgroundColor: C.card }]} onPress={() => navigation.navigate('Settings')}>
          <View style={[styles.actionIcon, { backgroundColor: `${C.primary}20` }]}>
            <Ionicons name="settings-outline" size={22} color={C.primary} />
          </View>
          <Text style={[styles.actionLabel, { color: C.text }]}>Settings</Text>
          <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionRow, { backgroundColor: C.card, marginTop: 8 }]}
          onPress={() => Alert.alert('Logout', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Logout', style: 'destructive', onPress: logout },
          ])}
        >
          <View style={[styles.actionIcon, { backgroundColor: `${C.danger}20` }]}>
            <Ionicons name="log-out-outline" size={22} color={C.danger} />
          </View>
          <Text style={[styles.actionLabel, { color: C.danger }]}>Logout</Text>
          <Ionicons name="chevron-forward" size={18} color={C.danger} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const InfoRow = ({ icon, label, value, valueColor, colors: C }) => (
  <View style={[infoStyles.row, { borderBottomColor: C.border }]}>
    <Ionicons name={icon} size={20} color={C.primary} style={{ marginRight: 12 }} />
    <View style={infoStyles.content}>
      <Text style={[infoStyles.label, { color: C.textMuted }]}>{label}</Text>
      <Text style={[infoStyles.value, { color: C.text }, valueColor && { color: valueColor }]}>{value}</Text>
    </View>
  </View>
);

const infoStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: Spacing.lg, borderBottomWidth: 1 },
  content: { flex: 1 },
  label: { fontSize: 12, marginBottom: 2 },
  value: { fontSize: 15 },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 40 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingTop: 56, paddingBottom: Spacing.md, borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 24, fontWeight: '900' },
  editBtn: { fontSize: 16, fontWeight: '700' },
  avatarSection: { alignItems: 'center', paddingVertical: Spacing.xl },
  avatarContainer: { width: 120, height: 120, borderRadius: 60, position: 'relative', marginBottom: Spacing.md },
  avatar: { width: '100%', height: '100%', borderRadius: 60 },
  avatarPlaceholder: { width: '100%', height: '100%', borderRadius: 60, alignItems: 'center', justifyContent: 'center', borderWidth: 3 },
  cameraOverlay: { position: 'absolute', inset: 0, borderRadius: 60, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  username: { fontSize: 22, fontWeight: '800' },
  about: { fontSize: 14, marginTop: 6, textAlign: 'center', paddingHorizontal: 40 },
  form: { paddingHorizontal: Spacing.lg, marginTop: Spacing.md },
  fieldGroup: { marginBottom: Spacing.lg },
  fieldLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
  fieldInput: { borderRadius: BorderRadius.md, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, borderWidth: 1 },
  infoCards: { marginTop: 8 },
  actions: { paddingHorizontal: Spacing.lg, marginTop: Spacing.xl },
  actionRow: { flexDirection: 'row', alignItems: 'center', borderRadius: BorderRadius.md, padding: Spacing.md },
  actionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  actionLabel: { flex: 1, fontSize: 16, fontWeight: '500' },
});

export default ProfileScreen;
