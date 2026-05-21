import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, StatusBar, Alert, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { userAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Colors, Spacing, BorderRadius } from '../theme';

const themes = [
  { id: 'red-black', label: 'Red & Black', primary: '#E53935', bg: '#0A0A0A' },
  { id: 'blue-dark', label: 'Blue Dark', primary: '#1565C0', bg: '#0D0D1A' },
  { id: 'green-dark', label: 'Green Dark', primary: '#2E7D32', bg: '#0A0D0A' },
  { id: 'purple-dark', label: 'Purple Dark', primary: '#7B1FA2', bg: '#0D0A12' },
];

const bubbleThemes = [
  { id: 'default', label: 'Classic' },
  { id: 'rounded', label: 'Rounded' },
  { id: 'sharp', label: 'Sharp' },
];

const SettingsScreen = ({ navigation }) => {
  const { user, updateUser, deleteAccount } = useAuth();
  const [settings, setSettings] = useState(user?.settings || {
    theme: 'red-black',
    bubbleTheme: 'default',
    messageNotifications: true,
    chatRequestAlerts: true,
    sound: true,
    vibration: true,
    showOnlineStatus: true,
    showLastSeen: true,
    readReceipts: true,
  });

  // Hidden delete account: tap watermark 5 times
  const tapCount = useRef(0);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);

  const handleWatermarkTap = () => {
    tapCount.current += 1;
    if (tapCount.current >= 5) {
      tapCount.current = 0;
      setShowDeleteAccount(true);
    }
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
      Alert.alert('Error', 'Failed to save setting: ' + err.message);
      // Revert
      setSettings(settings);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      '⚠️ Delete Account',
      'This action is PERMANENT. Your account and all data will be deleted. Connected users will be notified. Are you absolutely sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete My Account',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount();
            } catch (err) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Theme Section */}
      <SectionTitle title="THEME" />
      <View style={styles.card}>
        {themes.map((t) => (
          <TouchableOpacity
            key={t.id}
            style={styles.themeRow}
            onPress={() => saveSetting('theme', t.id)}
            activeOpacity={0.7}
          >
            <View style={[styles.themePreview, { backgroundColor: t.bg, borderColor: t.primary }]}>
              <View style={[styles.themeAccent, { backgroundColor: t.primary }]} />
            </View>
            <Text style={styles.themeLabel}>{t.label}</Text>
            {settings.theme === t.id && (
              <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Chat Bubble Theme */}
      <SectionTitle title="CHAT BUBBLE STYLE" />
      <View style={styles.card}>
        {bubbleThemes.map((bt) => (
          <TouchableOpacity
            key={bt.id}
            style={styles.optionRow}
            onPress={() => saveSetting('bubbleTheme', bt.id)}
          >
            <Text style={styles.optionLabel}>{bt.label}</Text>
            {settings.bubbleTheme === bt.id && (
              <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Notifications */}
      <SectionTitle title="NOTIFICATIONS" />
      <View style={styles.card}>
        <SettingToggle
          label="Message Notifications"
          icon="notifications-outline"
          value={settings.messageNotifications !== false}
          onChange={(v) => saveSetting('messageNotifications', v)}
        />
        <SettingToggle
          label="Chat Request Alerts"
          icon="person-add-outline"
          value={settings.chatRequestAlerts !== false}
          onChange={(v) => saveSetting('chatRequestAlerts', v)}
        />
        <SettingToggle
          label="Sound"
          icon="volume-high-outline"
          value={settings.sound !== false}
          onChange={(v) => saveSetting('sound', v)}
        />
        <SettingToggle
          label="Vibration"
          icon="phone-portrait-outline"
          value={settings.vibration !== false}
          onChange={(v) => saveSetting('vibration', v)}
        />
      </View>

      {/* Privacy */}
      <SectionTitle title="PRIVACY" />
      <View style={styles.card}>
        <SettingToggle
          label="Show Online Status"
          icon="eye-outline"
          value={settings.showOnlineStatus !== false}
          onChange={(v) => saveSetting('showOnlineStatus', v)}
        />
        <SettingToggle
          label="Show Last Seen"
          icon="time-outline"
          value={settings.showLastSeen !== false}
          onChange={(v) => saveSetting('showLastSeen', v)}
        />
        <SettingToggle
          label="Read Receipts"
          icon="checkmark-done-outline"
          value={settings.readReceipts !== false}
          onChange={(v) => saveSetting('readReceipts', v)}
        />
      </View>

      {/* About */}
      <SectionTitle title="ABOUT" />
      <View style={styles.card}>
        <InfoRow label="App Version" value="1.0.0" />
        <InfoRow label="Build" value="Production" />
        <TouchableOpacity style={styles.optionRow}>
          <Ionicons name="document-text-outline" size={20} color={Colors.primary} style={{ marginRight: 12 }} />
          <Text style={styles.optionLabel}>Privacy Policy</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Hidden Delete Account (shown after tapping watermark 5x) */}
      {showDeleteAccount && (
        <>
          <SectionTitle title="DANGER ZONE" />
          <View style={[styles.card, { borderWidth: 1, borderColor: Colors.danger }]}>
            <TouchableOpacity style={styles.deleteAccountRow} onPress={handleDeleteAccount}>
              <Ionicons name="trash-outline" size={22} color={Colors.danger} style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionLabel, { color: Colors.danger }]}>Delete Account</Text>
                <Text style={{ fontSize: 12, color: Colors.textMuted, marginTop: 2 }}>
                  Permanently delete your account and all data
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Watermark – tap 5 times to reveal delete account */}
      <TouchableOpacity
        onPress={handleWatermarkTap}
        activeOpacity={0.7}
        style={styles.watermarkContainer}
      >
        <Text style={styles.watermark}>Developed by Praveen</Text>
        <Text style={styles.watermarkSub}>A product from P.S</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const SectionTitle = ({ title }) => (
  <Text style={sStyles.sectionTitle}>{title}</Text>
);

const SettingToggle = ({ label, value, icon, onChange }) => {
  return (
    <View style={sStyles.toggleRow}>
      <Ionicons name={icon} size={20} color={Colors.primary} style={{ marginRight: 12 }} />
      <Text style={sStyles.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: Colors.border, true: `${Colors.primary}60` }}
        thumbColor={value ? Colors.primary : Colors.textMuted}
      />
    </View>
  );
};

const InfoRow = ({ label, value }) => (
  <View style={sStyles.infoRow}>
    <Text style={sStyles.infoLabel}>{label}</Text>
    <Text style={sStyles.infoValue}>{value}</Text>
  </View>
);

const sStyles = StyleSheet.create({
  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: Colors.textMuted,
    letterSpacing: 1, marginLeft: Spacing.lg, marginTop: Spacing.lg, marginBottom: 6,
  },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  toggleLabel: { flex: 1, fontSize: 15, color: Colors.text },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  infoLabel: { fontSize: 15, color: Colors.text },
  infoValue: { fontSize: 15, color: Colors.textSecondary },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 40 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingTop: 56, paddingBottom: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.text },
  card: {
    backgroundColor: Colors.card, marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md, overflow: 'hidden',
  },
  themeRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  themePreview: {
    width: 40, height: 28, borderRadius: 6, borderWidth: 2,
    marginRight: 14, overflow: 'hidden', justifyContent: 'flex-end',
  },
  themeAccent: { height: 8 },
  themeLabel: { flex: 1, fontSize: 15, color: Colors.text },
  optionRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  optionLabel: { flex: 1, fontSize: 15, color: Colors.text },
  deleteAccountRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 16, paddingHorizontal: Spacing.md,
  },
  watermarkContainer: {
    alignItems: 'center', marginTop: Spacing.xl * 2, marginBottom: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  watermark: { fontSize: 13, color: Colors.textMuted, fontWeight: '500' },
  watermarkSub: { fontSize: 11, color: Colors.textMuted, marginTop: 4 },
});

export default SettingsScreen;
