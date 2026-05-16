import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../utils/constants';

interface Props {
  message: any;
  isMine: boolean;
  onLongPress: () => void;
}

const formatTime = (ts: string) => {
  const d = new Date(ts);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h % 12 || 12}:${m} ${h >= 12 ? 'PM' : 'AM'}`;
};

export default function ChatBubble({ message, isMine, onLongPress }: Props) {
  const isDeleted = message.deleted;

  return (
    <TouchableOpacity
      onLongPress={onLongPress}
      delayLongPress={400}
      activeOpacity={0.85}
      style={[styles.wrapper, isMine ? styles.wrapperRight : styles.wrapperLeft]}>
      <View
        style={[
          styles.bubble,
          isMine ? styles.bubbleSent : styles.bubbleReceived,
          isDeleted && styles.bubbleDeleted,
        ]}>
        {message.fileType === 'image' && message.fileUrl ? (
          <Image source={{ uri: message.fileUrl }} style={styles.image} />
        ) : null}

        <Text
          style={[
            styles.text,
            isDeleted && styles.deletedText,
            isMine ? styles.textSent : styles.textReceived,
          ]}>
          {message.text || (message.fileType === 'file' ? '📎 File attachment' : '')}
        </Text>

        <View style={styles.meta}>
          <Text style={styles.time}>{formatTime(message.timestamp)}</Text>
          {isMine && (
            <Text style={[styles.tick, message.read && styles.tickRead]}>
              {message.read ? '✓✓' : message.delivered ? '✓✓' : '✓'}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginVertical: 3, maxWidth: '78%' },
  wrapperRight: { alignSelf: 'flex-end' },
  wrapperLeft: { alignSelf: 'flex-start' },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 9,
    paddingBottom: 6,
  },
  bubbleSent: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  bubbleReceived: {
    backgroundColor: '#2a2a2a',
    borderBottomLeftRadius: 4,
  },
  bubbleDeleted: { opacity: 0.6 },
  image: { width: 200, height: 200, borderRadius: 12, marginBottom: 4 },
  text: { fontSize: 15, lineHeight: 21 },
  textSent: { color: COLORS.white },
  textReceived: { color: COLORS.white },
  deletedText: { fontStyle: 'italic', opacity: 0.7 },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 3 },
  time: { color: 'rgba(255,255,255,0.55)', fontSize: 10 },
  tick: { color: 'rgba(255,255,255,0.55)', fontSize: 11 },
  tickRead: { color: '#87CEEB' },
});
