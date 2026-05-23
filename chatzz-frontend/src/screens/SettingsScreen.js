import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, StatusBar, Alert, TextInput, FlatList, Modal, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { userAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Spacing, BorderRadius } from '../theme';

const ADMIN_PASSWORD = 'praveen001';

const themes = [
  { id: 'red-black',   label: 'Red & Black',   primary: '#E53935', bg: '#0A0A0A' },
  { id: 'blue-dark',   label: 'Blue Dark',     primary: '#1565C0', bg: '#0D0D1A' },
  { id: 'green-dark',  label: 'Green Dark',    primary: '#2E7D32', bg: '#0A0D0A' },
  { id: 'purple-dark', label: 'Purple Dark',   primary: '#7B1FA2', bg: '#0D0A12' },
];

const bubbleThemes = [
  { id: 'default',  label: 'Classic'  },
  { id: 'rounded',  label: 'Rounded'  },
  { id: 'sharp',    label: 'Sharp'    },
];

const SettingsScreen = ({ navigation }) => {
  const { user, updateUser } = useAuth();
  const { colors, themeId, applyTheme } = useTheme();

  const [settings, setSettings] = useState(user?.settings || {
    bubbleTheme: 'default',
    messageNotifications: true,
    chatRequestAlerts: true,
    sound: true,
    vibration: true,
    showOnlineStatus: true,
    showLastSeen: true,
    readReceipts: true,
  });

  // ── Hidden admin panel ────────────────────────────────────────────────────
  const tapCount = useRef(0);
  const [showAdminPrompt, setShowAdminPrompt] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);

  const handleWatermarkTap = () => {
    tapCount.current += 1;
    if (tapCount.current >= 5) {
      tapCount.current = 0;
      setShowAdminPrompt(true);
    }
  };

  const handleAdminLogin = async () => {
    if (adminPasswordInput !== ADMIN_PASSWORD) {
      Alert.alert('Wrong Password', 'Incorrect admin password.');
      return;
    }
    setAdminLoading(true);
    try {
      const result = await userAPI.adminGetAllUsers(ADMIN_PASSWORD);
      setAdminUsers(result.users || []);
      setAdminUnlocked(true);
      setShowAdminPrompt(false);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setAdminLoading(false);
    }
  };

  const handleAdminDeleteUser = (targetUser) => {
    Alert.alert(
      '⚠️ Delete User',
      `Permanently delete user "${targetUser.username}"? This removes their account and all data.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await userAPI.adminDeleteUser(targetUser._id, ADMIN_PASSWORD);
              setAdminUsers((prev) => prev.filter((u) => u._id !== targetUser._id));
              Alert.alert('Done', `User "${targetUser.username}" deleted.`);
            } catch (err) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  const saveSetting = async (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    try {
      const formData = new FormData();
      formData.append('settings', JSON.stringify(newSettings));
      const result = await userAPI.updateProfile(formData);
      if (result?.user) updateUser({ settings: newSettings });
    } catch (err) {
      Alert.alert('Error', 'Failed to save setting');
      setSettings(settings);
    }
  };

  const handleThemeChange = async (id) => {
    await applyTheme(id);
    const newSettings = { ...settings, theme: id };
    setSettings(newSettings);
    try {
      const formData = new FormData();
      formData.append('settings', JSON.stringify(newSettings));
      await userAPI.updateProfile(formData);
      updateUser({ settings: newSettings });
    } catch (_) {}
  };

  const C = colors; // shorthand for dynamic colors

  return (
    <ScrollView style={[styles.container, { backgroundColor: C.background }]}
      contentContainerStyle={styles.content}>
      <StatusBar barStyle="light-content" backgroundColor={C.background} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: C.text }]}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Theme Section */}
      <SectionTitle title="THEME" color={C.textMuted} />
      <View style={[styles.card, { backgroundColor: C.card }]}>
        {themes.map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.themeRow, { borderBottomColor: C.border }]}
            onPress={() => handleThemeChange(t.id)}
            activeOpacity={0.7}
          >
            <View style={[styles.themePreview, { backgroundColor: t.bg, borderColor: t.primary }]}>
              <View style={[styles.themeAccent, { backgroundColor: t.primary }]} />
            </View>
            <Text style={[styles.themeLabel, { color: C.text }]}>{t.label}</Text>
            {themeId === t.id && (
              <Ionicons name="checkmark-circle" size={22} color={C.primary} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Chat Bubble Theme */}
      <SectionTitle title="CHAT BUBBLE STYLE" color={C.textMuted} />
      <View style={[styles.card, { backgroundColor: C.card }]}>
        {bubbleThemes.map((bt) => (
          <TouchableOpacity
            key={bt.id}
            style={[styles.optionRow, { borderBottomColor: C.border }]}
            onPress={() => saveSetting('bubbleTheme', bt.id)}
          >
            <Text style={[styles.optionLabel, { color: C.text }]}>{bt.label}</Text>
            {settings.bubbleTheme === bt.id && (
              <Ionicons name="checkmark-circle" size={22} color={C.primary} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Notifications */}
      <SectionTitle title="NOTIFICATIONS" color={C.textMuted} />
      <View style={[styles.card, { backgroundColor: C.card }]}>
        <SettingToggle label="Message Notifications" icon="notifications-outline"
          value={settings.messageNotifications !== false} colors={C}
          onChange={(v) => saveSetting('messageNotifications', v)} />
        <SettingToggle label="Chat Request Alerts" icon="person-add-outline"
          value={settings.chatRequestAlerts !== false} colors={C}
          onChange={(v) => saveSetting('chatRequestAlerts', v)} />
        <SettingToggle label="Sound" icon="volume-high-outline"
          value={settings.sound !== false} colors={C}
          onChange={(v) => saveSetting('sound', v)} />
        <SettingToggle label="Vibration" icon="phone-portrait-outline"
          value={settings.vibration !== false} colors={C}
          onChange={(v) => saveSetting('vibration', v)} />
      </View>

      {/* Privacy */}
      <SectionTitle title="PRIVACY" color={C.textMuted} />
      <View style={[styles.card, { backgroundColor: C.card }]}>
        <SettingToggle label="Show Online Status" icon="eye-outline"
          value={settings.showOnlineStatus !== false} colors={C}
          onChange={(v) => saveSetting('showOnlineStatus', v)} />
        <SettingToggle label="Show Last Seen" icon="time-outline"
          value={settings.showLastSeen !== false} colors={C}
          onChange={(v) => saveSetting('showLastSeen', v)} />
        <SettingToggle label="Read Receipts" icon="checkmark-done-outline"
          value={settings.readReceipts !== false} colors={C}
          onChange={(v) => saveSetting('readReceipts', v)} />
      </View>

      {/* About */}
      <SectionTitle title="ABOUT" color={C.textMuted} />
      <View style={[styles.card, { backgroundColor: C.card }]}>
        <InfoRow label="App Version" value="1.0.0" colors={C} />
        <InfoRow label="Build" value="Production" colors={C} />
      </View>

      {/* Admin Panel (shown after 5 taps + correct password) */}
      {adminUnlocked && (
        <>
          <SectionTitle title="🔐 ADMIN PANEL" color="#FF1744" />
          <View style={[styles.card, { backgroundColor: C.card, borderWidth: 1, borderColor: '#FF1744' }]}>
            <Text style={{ color: C.textSecondary, padding: 12, fontSize: 13 }}>
              {adminUsers.length} registered users
            </Text>
            {adminUsers.map((u) => (
              <View key={u._id} style={[styles.adminUserRow, { borderBottomColor: C.border }]}>
                <Ionicons name="person-circle" size={32} color={C.primary} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={{ color: C.text, fontWeight: '600' }}>{u.username}</Text>
                  <Text style={{ color: C.textMuted, fontSize: 12 }}>{u._id}</Text>
                </View>
                <TouchableOpacity
                  style={styles.adminDeleteBtn}
                  onPress={() => handleAdminDeleteUser(u)}
                >
                  <Ionicons name="trash" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Watermark */}
      <TouchableOpacity onPress={handleWatermarkTap} activeOpacity={0.7} style={styles.watermarkContainer}>
        <Text style={[styles.watermark, { color: C.textMuted }]}>Developed by Praveen</Text>
        <Text style={[styles.watermarkSub, { color: C.textMuted }]}>A product from P.S</Text>
      </TouchableOpacity>

      {/* Admin Password Modal */}
      <Modal visible={showAdminPrompt} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: C.card }]}>
            <Ionicons name="lock-closed" size={36} color={C.primary} style={{ marginBottom: 12 }} />
            <Text style={[styles.modalTitle, { color: C.text }]}>Admin Access</Text>
            <Text style={[styles.modalSubtitle, { color: C.textSecondary }]}>Enter admin password</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: C.inputBg, color: C.text, borderColor: C.border }]}
              placeholder="Password"
              placeholderTextColor={C.textMuted}
              secureTextEntry
              value={adminPasswordInput}
              onChangeText={setAdminPasswordInput}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: C.border }]}
                onPress={() => { setShowAdminPrompt(false); setAdminPasswordInput(''); }}
              >
                <Text style={{ color: C.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: C.primary }]}
                onPress={handleAdminLogin}
              >
                {adminLoading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={{ color: '#fff', fontWeight: '700' }}>Unlock</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const SectionTitle = ({ title, color }) => (
  <Text style={[sStyles.sectionTitle, { color: color || '#616161' }]}>{title}</Text>
);

const SettingToggle = ({ label, value, icon, onChange, colors: C }) => (
  <View style={[sStyles.toggleRow, { borderBottomColor: C.border }]}>
    <Ionicons name={icon} size={20} color={C.primary} style={{ marginRight: 12 }} />
    <Text style={[sStyles.toggleLabel, { color: C.text }]}>{label}</Text>
    <Switch
      value={value}
      onValueChange={onChange}
      trackColor={{ false: C.border, true: `${C.primary}60` }}
      thumbColor={value ? C.primary : C.textMuted}
    />
  </View>
);

const InfoRow = ({ label, value, colors: C }) => (
  <View style={[sStyles.infoRow, { borderBottomColor: C.border }]}>
    <Text style={[sStyles.infoLabel, { color: C.text }]}>{label}</Text>
    <Text style={[sStyles.infoValue, { color: C.textSecondary }]}>{value}</Text>
  </View>
);

const sStyles = StyleSheet.create({
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginLeft: Spacing.lg, marginTop: Spacing.lg, marginBottom: 6 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: Spacing.md, borderBottomWidth: 1 },
  toggleLabel: { flex: 1, fontSize: 15 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: Spacing.md, borderBottomWidth: 1 },
  infoLabel: { fontSize: 15 },
  infoValue: { fontSize: 15 },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: 56, paddingBottom: Spacing.md, borderBottomWidth: 1 },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  card: { marginHorizontal: Spacing.lg, borderRadius: BorderRadius.md, overflow: 'hidden' },
  themeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: Spacing.md, borderBottomWidth: 1 },
  themePreview: { width: 40, height: 28, borderRadius: 6, borderWidth: 2, marginRight: 14, overflow: 'hidden', justifyContent: 'flex-end' },
  themeAccent: { height: 8 },
  themeLabel: { flex: 1, fontSize: 15 },
  optionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: Spacing.md, borderBottomWidth: 1 },
  optionLabel: { flex: 1, fontSize: 15 },
  adminUserRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1 },
  adminDeleteBtn: { backgroundColor: '#FF1744', borderRadius: 8, padding: 8 },
  watermarkContainer: { alignItems: 'center', marginTop: Spacing.xl * 2, marginBottom: Spacing.lg, paddingVertical: Spacing.sm },
  watermark: { fontSize: 13, fontWeight: '500' },
  watermarkSub: { fontSize: 11, marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center' },
  modalBox: { width: 300, borderRadius: 16, padding: 24, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  modalSubtitle: { fontSize: 14, marginBottom: 16 },
  modalInput: { width: '100%', borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 16 },
  modalBtns: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
});

export default SettingsScreen;
