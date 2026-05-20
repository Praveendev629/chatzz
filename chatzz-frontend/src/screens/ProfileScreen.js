import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity,
  ScrollView, Alert, TextInput, StatusBar, ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { userAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Colors, Spacing, BorderRadius } from '../theme';

const ProfileScreen = ({ navigation }) => {
  const { user, updateUser, logout } = useAuth();
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState(user?.username || '');
  const [about, setAbout] = useState(user?.about || '');
  const [loading, setLoading] = useState(false);
  const [profilePic, setProfilePic] = useState(user?.profilePicture);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });

    if (!result.canceled) {
      setProfilePic(result.assets[0].uri);
    }
  };

  const saveProfile = async () => {
    if (!username.trim()) { Alert.alert('Error', 'Username is required'); return; }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('username', username.trim());
      formData.append('about', about.trim());

      if (profilePic && profilePic !== user.profilePicture) {
        const filename = profilePic.split('/').pop();
        formData.append('profilePicture', {
          uri: profilePic, name: filename, type: 'image/jpeg',
        });
      }

      const result = await userAPI.updateProfile(formData);
      updateUser(result.user);
      setEditing(false);
      Alert.alert('Success', 'Profile updated!');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity onPress={() => editing ? saveProfile() : setEditing(true)}>
          {loading ? (
            <ActivityIndicator color={Colors.primary} size="small" />
          ) : (
            <Text style={styles.editBtn}>{editing ? 'Save' : 'Edit'}</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Avatar */}
      <View style={styles.avatarSection}>
        <TouchableOpacity
          style={styles.avatarContainer}
          onPress={editing ? pickImage : undefined}
          activeOpacity={editing ? 0.7 : 1}
        >
          {profilePic ? (
            <Image source={{ uri: profilePic }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={50} color={Colors.textMuted} />
            </View>
          )}
          {editing && (
            <View style={styles.cameraOverlay}>
              <Ionicons name="camera" size={24} color={Colors.white} />
            </View>
          )}
        </TouchableOpacity>

        {!editing ? (
          <>
            <Text style={styles.username}>{user?.username}</Text>
            <Text style={styles.about}>{user?.about}</Text>
          </>
        ) : null}
      </View>

      {/* Edit Form */}
      {editing && (
        <View style={styles.form}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>USERNAME</Text>
            <TextInput
              style={styles.fieldInput}
              value={username}
              onChangeText={setUsername}
              placeholder="Username"
              placeholderTextColor={Colors.textMuted}
              maxLength={30}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>ABOUT</Text>
            <TextInput
              style={[styles.fieldInput, { height: 80 }]}
              value={about}
              onChangeText={setAbout}
              placeholder="Write something about yourself..."
              placeholderTextColor={Colors.textMuted}
              multiline
              maxLength={150}
            />
          </View>
        </View>
      )}

      {/* Info Cards */}
      {!editing && (
        <View style={styles.infoCards}>
          <InfoRow icon="person-outline" label="Username" value={user?.username} />
          <InfoRow icon="information-circle-outline" label="About" value={user?.about} />
          <InfoRow icon="ellipse" label="Status" value="Active" valueColor={Colors.online} />
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionRow} onPress={() => navigation.navigate('Settings')}>
          <View style={styles.actionIcon}><Ionicons name="settings-outline" size={22} color={Colors.primary} /></View>
          <Text style={styles.actionLabel}>Settings</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionRow, { marginTop: 6 }]}
          onPress={() => Alert.alert('Logout', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Logout', style: 'destructive', onPress: logout },
          ])}
        >
          <View style={[styles.actionIcon, { backgroundColor: `${Colors.danger}20` }]}>
            <Ionicons name="log-out-outline" size={22} color={Colors.danger} />
          </View>
          <Text style={[styles.actionLabel, { color: Colors.danger }]}>Logout</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.danger} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const InfoRow = ({ icon, label, value, valueColor }) => (
  <View style={infoStyles.row}>
    <Ionicons name={icon} size={20} color={Colors.primary} style={{ marginRight: 12 }} />
    <View style={infoStyles.content}>
      <Text style={infoStyles.label}>{label}</Text>
      <Text style={[infoStyles.value, valueColor && { color: valueColor }]}>{value}</Text>
    </View>
  </View>
);

const infoStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border },
  content: { flex: 1 },
  label: { fontSize: 12, color: Colors.textMuted, marginBottom: 2 },
  value: { fontSize: 15, color: Colors.text },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 40 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingTop: 56, paddingBottom: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 24, fontWeight: '900', color: Colors.text },
  editBtn: { fontSize: 16, color: Colors.primary, fontWeight: '700' },
  avatarSection: { alignItems: 'center', paddingVertical: Spacing.xl },
  avatarContainer: { width: 110, height: 110, borderRadius: 55, position: 'relative', marginBottom: Spacing.md },
  avatar: { width: '100%', height: '100%', borderRadius: 55 },
  avatarPlaceholder: {
    width: '100%', height: '100%', borderRadius: 55,
    backgroundColor: Colors.surfaceLight, alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: Colors.border,
  },
  cameraOverlay: {
    position: 'absolute', inset: 0, borderRadius: 55,
    backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center',
  },
  username: { fontSize: 22, fontWeight: '800', color: Colors.text },
  about: { fontSize: 14, color: Colors.textSecondary, marginTop: 6, textAlign: 'center', paddingHorizontal: 40 },
  form: { paddingHorizontal: Spacing.lg, marginTop: Spacing.md },
  fieldGroup: { marginBottom: Spacing.lg },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1, marginBottom: 6 },
  fieldInput: {
    backgroundColor: Colors.inputBg, borderRadius: BorderRadius.md,
    paddingHorizontal: 16, paddingVertical: 12, color: Colors.text, fontSize: 15,
    borderWidth: 1, borderColor: Colors.border,
  },
  infoCards: { marginTop: 8 },
  actions: { paddingHorizontal: Spacing.lg, marginTop: Spacing.xl },
  actionRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.card, borderRadius: BorderRadius.md, padding: Spacing.md,
  },
  actionIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: `${Colors.primary}20`, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md,
  },
  actionLabel: { flex: 1, fontSize: 16, color: Colors.text, fontWeight: '500' },
});

export default ProfileScreen;
