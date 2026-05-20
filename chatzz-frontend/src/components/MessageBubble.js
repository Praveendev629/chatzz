import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { Colors, BorderRadius, Spacing } from '../theme';

const MessageBubble = ({ message, isMine, onLongPress }) => {
  const [playing, setPlaying] = useState(false);
  const [sound, setSound] = useState(null);

  if (message.deletedForEveryone) {
    return (
      <View style={[styles.wrapper, isMine ? styles.right : styles.left]}>
        <View style={[styles.deletedBubble]}>
          <Ionicons name="ban" size={14} color={Colors.textMuted} style={{ marginRight: 6 }} />
          <Text style={styles.deletedText}>This message was deleted</Text>
        </View>
      </View>
    );
  }

  const playAudio = async () => {
    if (sound) {
      await sound.unloadAsync();
      setSound(null);
      setPlaying(false);
      return;
    }
    try {
      const { sound: s } = await Audio.Sound.createAsync({ uri: message.fileUrl });
      setSound(s);
      setPlaying(true);
      await s.playAsync();
      s.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) { setPlaying(false); setSound(null); }
      });
    } catch {}
  };

  const renderContent = () => {
    switch (message.messageType) {
      case 'image':
        return (
          <Image
            source={{ uri: message.fileUrl }}
            style={styles.imageContent}
            resizeMode="cover"
          />
        );
      case 'audio':
        return (
          <TouchableOpacity style={styles.audioContent} onPress={playAudio}>
            <Ionicons name={playing ? 'pause-circle' : 'play-circle'} size={36} color={isMine ? '#fff' : Colors.primary} />
            <View style={styles.audioWave}>
              {[...Array(8)].map((_, i) => (
                <View key={i} style={[styles.audioBar, { height: 6 + (i % 3) * 6 }]} />
              ))}
            </View>
            <Text style={[styles.audioDuration, isMine && { color: 'rgba(255,255,255,0.8)' }]}>
              Voice
            </Text>
          </TouchableOpacity>
        );
      case 'document':
        return (
          <View style={styles.docContent}>
            <Ionicons name="document-attach" size={28} color={isMine ? '#fff' : Colors.primary} />
            <Text style={[styles.docName, isMine && { color: '#fff' }]} numberOfLines={1}>
              {message.fileName || 'Document'}
            </Text>
          </View>
        );
      default:
        return <Text style={[styles.messageText, isMine && styles.messageTextMine]}>{message.content}</Text>;
    }
  };

  const getStatusIcon = () => {
    if (!isMine) return null;
    switch (message.status) {
      case 'seen': return <Ionicons name="checkmark-done" size={14} color={isMine ? 'rgba(255,255,255,0.8)' : Colors.primary} />;
      case 'delivered': return <Ionicons name="checkmark-done" size={14} color="rgba(255,255,255,0.6)" />;
      default: return <Ionicons name="checkmark" size={14} color="rgba(255,255,255,0.6)" />;
    }
  };

  const formatTime = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <TouchableWithoutFeedback onLongPress={onLongPress}>
      <View style={[styles.wrapper, isMine ? styles.right : styles.left]}>
        <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
          {renderContent()}
          <View style={styles.meta}>
            <Text style={[styles.time, isMine && styles.timeMine]}>{formatTime(message.createdAt)}</Text>
            {getStatusIcon()}
          </View>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  wrapper: { marginVertical: 2, marginHorizontal: Spacing.sm, flexDirection: 'row' },
  left: { justifyContent: 'flex-start' },
  right: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '75%', padding: 10, borderRadius: 16,
    minWidth: 80,
  },
  bubbleMine: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: Colors.card,
    borderBottomLeftRadius: 4,
  },
  deletedBubble: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, paddingHorizontal: 12,
    backgroundColor: Colors.surfaceLight, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  deletedText: { fontSize: 13, color: Colors.textMuted, fontStyle: 'italic' },
  messageText: { fontSize: 15, color: Colors.text, lineHeight: 20 },
  messageTextMine: { color: '#fff' },
  imageContent: { width: 200, height: 200, borderRadius: 12, marginBottom: 4 },
  audioContent: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 8 },
  audioWave: { flexDirection: 'row', alignItems: 'center', gap: 2, flex: 1 },
  audioBar: { width: 3, backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 2 },
  audioDuration: { fontSize: 12, color: Colors.textSecondary },
  docContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  docName: { flex: 1, fontSize: 14, color: Colors.text },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4, gap: 4 },
  time: { fontSize: 11, color: Colors.textMuted },
  timeMine: { color: 'rgba(255,255,255,0.7)' },
});

export default MessageBubble;
