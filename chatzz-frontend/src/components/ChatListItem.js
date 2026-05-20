import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../theme';

const ChatListItem = ({ chat, currentUserId, onPress, onLongPress }) => {
  const other = chat.participants?.find((p) => p._id !== currentUserId);
  if (!other) return null;

  const lastMsg = chat.lastMessage;
  const isLastMine = lastMsg?.sender?._id === currentUserId || lastMsg?.sender === currentUserId;

  const getLastMessagePreview = () => {
    if (!lastMsg) return 'No messages yet';
    if (lastMsg.deletedForEveryone) return 'This message was deleted';
    switch (lastMsg.messageType) {
      case 'image': return '📷 Image';
      case 'audio': return '🎤 Voice message';
      case 'document': return '📎 Document';
      default: return lastMsg.content || '';
    }
  };

  const getStatusIcon = () => {
    if (!isLastMine || !lastMsg) return null;
    switch (lastMsg.status) {
      case 'seen': return <Ionicons name="checkmark-done" size={14} color={Colors.primary} />;
      case 'delivered': return <Ionicons name="checkmark-done" size={14} color={Colors.textMuted} />;
      default: return <Ionicons name="checkmark" size={14} color={Colors.textMuted} />;
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} onLongPress={onLongPress} activeOpacity={0.7}>
      {/* Avatar */}
      <View style={styles.avatarWrapper}>
        {other.profilePicture ? (
          <Image source={{ uri: other.profilePicture }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Ionicons name="person" size={22} color={Colors.textMuted} />
          </View>
        )}
        {other.isOnline && <View style={styles.onlineDot} />}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>{other.username}</Text>
          <Text style={styles.time}>{formatTime(chat.lastMessageAt)}</Text>
        </View>
        <View style={styles.bottomRow}>
          <View style={styles.previewRow}>
            {getStatusIcon()}
            <Text style={styles.preview} numberOfLines={1}>
              {isLastMine ? '' : ''}{getLastMessagePreview()}
            </Text>
          </View>
        </View>
      </View>

      {/* Separator */}
      <View style={styles.separator} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: 12 },
  avatarWrapper: { position: 'relative', marginRight: 14 },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarFallback: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Colors.surfaceLight, alignItems: 'center', justifyContent: 'center',
  },
  onlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 13, height: 13, borderRadius: 7,
    backgroundColor: Colors.online, borderWidth: 2, borderColor: Colors.background,
  },
  content: { flex: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  name: { fontSize: 16, fontWeight: '600', color: Colors.text, flex: 1, marginRight: 8 },
  time: { fontSize: 12, color: Colors.textMuted },
  bottomRow: { flexDirection: 'row', alignItems: 'center' },
  previewRow: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 4 },
  preview: { fontSize: 13, color: Colors.textSecondary, flex: 1 },
  separator: {
    position: 'absolute', bottom: 0, right: 0, left: 82,
    height: StyleSheet.hairlineWidth, backgroundColor: Colors.border,
  },
});

export default ChatListItem;
