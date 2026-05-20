import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../theme';

const UserListItem = ({ user, onPress, requestSent }) => (
  <TouchableOpacity
    style={styles.container}
    onPress={onPress}
    activeOpacity={0.7}
    disabled={requestSent}
  >
    <View style={styles.avatarWrapper}>
      {user.profilePicture ? (
        <Image source={{ uri: user.profilePicture }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarFallback}>
          <Ionicons name="person" size={22} color={Colors.textMuted} />
        </View>
      )}
      {user.isOnline && <View style={styles.onlineDot} />}
    </View>

    <View style={styles.info}>
      <Text style={styles.name}>{user.username}</Text>
      <Text style={styles.about} numberOfLines={1}>{user.about || 'Hey there!'}</Text>
    </View>

    <View style={[styles.requestBtn, requestSent && styles.requestBtnSent]}>
      <Ionicons
        name={requestSent ? 'checkmark' : 'chatbubble-ellipses-outline'}
        size={18}
        color={requestSent ? Colors.success : Colors.white}
      />
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
  },
  avatarWrapper: { position: 'relative', marginRight: 14 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarFallback: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.surfaceLight, alignItems: 'center', justifyContent: 'center',
  },
  onlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: Colors.online, borderWidth: 2, borderColor: Colors.background,
  },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: Colors.text },
  about: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  requestBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  requestBtnSent: { backgroundColor: `${Colors.success}30` },
});

export default UserListItem;
