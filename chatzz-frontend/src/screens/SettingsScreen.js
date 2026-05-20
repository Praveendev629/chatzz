import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, StatusBar, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { userAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Colors, Spacing, BorderRadius } from '../theme';

const themes = [
  { id: 'red-black', label: 'Red & Black', primary: '#E53935', bg: '#0A0A0A' },
  { id: 'blue-dark', label: 'Blue Dark', primary: '#1565C0', bg: '#0A0A0A' },
  { id: 'green-dark', label: 'Green Dark', primary: '#2E7D32', bg: '#0A0A0A' },
  { id: 'purple-dark', label: 'Purple Dark', primary: '#6A1B9A', bg: '#0A0A0A' },
];

const bubbleThemes = [
  { id: 'default', label: 'Classic' },
  { id: 'rounded', label: 'Rounded' },
  { id: 'sharp', label: 'Sharp' },
];

const SettingsScreen = ({ navigation }) => {
  const { user, updateUser } = useAuth();
  const [settings, setSettings] = useState(user?.settings || {});
  const [saving, setSaving] = useState(false);

  const saveSetting = async (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    try {
      await userAPI.updateProfile(
        Object.assign(new FormData(), { settings: JSON.stringify(newSettings) })
      );
      updateUser({ settings: newSettings });
    } catch (err) {
      Alert.alert('Error', 'Failed to save setting');
    }
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
        <SettingToggle label="Message Notifications" value icon="notifications-outline" />
        <SettingToggle label="Chat Request Alerts" value icon="person-add-outline" />
        <SettingToggle label="Sound" value icon="volume-high-outline" />
        <SettingToggle label="Vibration" value icon="phone-portrait-outline" />
      </View>

      {/* Privacy */}
      <SectionTitle title="PRIVACY" />
      <View style={styles.card}>
        <SettingToggle label="Show Online Status" value icon="eye-outline" />
        <SettingToggle label="Show Last Seen" value icon="time-outline" />
        <SettingToggle label="Read Receipts" value icon="checkmark-done-outline" />
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
    </ScrollView>
  );
};

const SectionTitle = ({ title }) => (
  <Text style={sStyles.sectionTitle}>{title}</Text>
);

const SettingToggle = ({ label, value, icon }) => {
  const [enabled, setEnabled] = useState(value !== false);
  return (
    <View style={sStyles.toggleRow}>
      <Ionicons name={icon} size={20} color={Colors.primary} style={{ marginRight: 12 }} />
      <Text style={sStyles.toggleLabel}>{label}</Text>
      <Switch
        value={enabled}
        onValueChange={setEnabled}
        trackColor={{ false: Colors.border, true: `${Colors.primary}60` }}
        thumbColor={enabled ? Colors.primary : Colors.textMuted}
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
  sectionTitle: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1, marginLeft: Spacing.lg, marginTop: Spacing.lg, marginBottom: 6 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  toggleLabel: { flex: 1, fontSize: 15, color: Colors.text },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
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
  card: { backgroundColor: Colors.card, marginHorizontal: Spacing.lg, borderRadius: BorderRadius.md, overflow: 'hidden' },
  themeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  themePreview: { width: 40, height: 28, borderRadius: 6, borderWidth: 2, marginRight: 14, overflow: 'hidden', justifyContent: 'flex-end' },
  themeAccent: { height: 8 },
  themeLabel: { flex: 1, fontSize: 15, color: Colors.text },
  optionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  optionLabel: { flex: 1, fontSize: 15, color: Colors.text },
});

export default SettingsScreen;
