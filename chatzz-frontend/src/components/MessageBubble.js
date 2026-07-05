import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity,
  TouchableWithoutFeedback, Linking, Alert, Animated, PanResponder,
  Dimensions, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { Colors, BorderRadius, Spacing } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BUBBLE_MAX_WIDTH = SCREEN_WIDTH * 0.75;

const MessageBubble = ({ message, isMine, onLongPress, onImagePress, onSwipeReply, colors, replySelectMode, onTapForReply }) => {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sound, setSound] = useState(null);
  const C = colors || Colors;
  const translateX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dy) < 10;
      },
      onPanResponderMove: (evt, gestureState) => {
        if (gestureState.dx > 0 && gestureState.dx < 100) {
          translateX.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx > 60) {
          // Swipe right - trigger reply
          if (onSwipeReply) onSwipeReply(message);
        }
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;

  if (message.deletedForEveryone) {
    return (
      <View style={[styles.wrapper, isMine ? styles.right : styles.left]}>
        <View style={[styles.deletedBubble, { backgroundColor: C.surfaceLight, borderColor: C.border }]}>
          <Ionicons name="ban" size={14} color={C.textMuted} style={{ marginRight: 6 }} />
          <Text style={[styles.deletedText, { color: C.textMuted }]}>This message was deleted</Text>
        </View>
      </View>
    );
  }

  const playAudio = async () => {
    if (sound) {
      await sound.unloadAsync();
      setSound(null); setPlaying(false);
      return;
    }
    try {
      setLoading(true);
      const { sound: s } = await Audio.Sound.createAsync(
        { uri: message.fileUrl },
        { shouldPlay: true }
      );
      setSound(s);
      setPlaying(true);
      setLoading(false);
      s.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.isBuffering) {
          setLoading(true);
        } else if (status.isLoaded && !status.isBuffering) {
          setLoading(false);
        }
        if (status.didJustFinish) { setPlaying(false); setSound(null); setLoading(false); }
      });
    } catch {
      setLoading(false);
      Alert.alert('Error', 'Could not play audio');
    }
  };

  const openDocument = async () => {
    if (!message.fileUrl) return;
    try {
      const supported = await Linking.canOpenURL(message.fileUrl);
      if (supported) {
        await Linking.openURL(message.fileUrl);
      } else {
        Alert.alert('Cannot open', 'Install a file viewer app to open this document.');
      }
    } catch {
      Alert.alert('Error', 'Could not open document');
    }
  };

  const renderReplyPreview = () => {
    if (!message.replyTo) return null;
    return (
      <View style={[styles.replyPreview, { backgroundColor: isMine ? 'rgba(255,255,255,0.15)' : `${C.primary}15`, borderLeftColor: isMine ? 'rgba(255,255,255,0.5)' : C.primary }]}>
        <Text style={[styles.replySender, { color: isMine ? 'rgba(255,255,255,0.9)' : C.primary }]} numberOfLines={1}>
          {message.replyToSender || 'Unknown'}
        </Text>
        <Text style={[styles.replyContent, { color: isMine ? 'rgba(255,255,255,0.7)' : C.textSecondary }]} numberOfLines={1}>
          {message.replyToContent || 'Message'}
        </Text>
      </View>
    );
  };

  const renderContent = () => {
    switch (message.messageType) {
      case 'image':
        return (
          <TouchableOpacity onPress={() => onImagePress && onImagePress(message.fileUrl)} activeOpacity={0.9}>
            <Image
              source={{ uri: message.fileUrl }}
              style={styles.imageContent}
              resizeMode="cover"
            />
          </TouchableOpacity>
        );

      case 'audio':
        return (
          <TouchableOpacity style={styles.audioContent} onPress={playAudio} disabled={loading}>
            {loading ? (
              <ActivityIndicator size={36} color={isMine ? '#fff' : C.primary} />
            ) : (
              <Ionicons
                name={playing ? 'pause-circle' : 'play-circle'}
                size={40}
                color={isMine ? '#fff' : C.primary}
              />
            )}
            <View style={styles.audioWaveContainer}>
              <View style={styles.audioWave}>
                {[...Array(16)].map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.audioBar,
                      {
                        height: loading ? 4 + (i % 4) * 3 : 4 + (i % 4) * 5,
                        backgroundColor: loading
                          ? (isMine ? 'rgba(255,255,255,0.3)' : 'rgba(150,150,150,0.4)')
                          : playing
                            ? (isMine ? '#fff' : C.primary)
                            : (isMine ? 'rgba(255,255,255,0.6)' : 'rgba(150,150,150,0.8)'),
                      },
                    ]}
                  />
                ))}
              </View>
              <Text style={[styles.audioDuration, { color: isMine ? 'rgba(255,255,255,0.75)' : C.textMuted }]}>
                {loading ? 'Downloading...' : playing ? 'Playing...' : 'Voice Message'}
              </Text>
            </View>
          </TouchableOpacity>
        );

      case 'document':
        return (
          <TouchableOpacity style={styles.docContent} onPress={openDocument}>
            <View style={[styles.docIconBox, { backgroundColor: isMine ? 'rgba(255,255,255,0.2)' : `${C.primary}20` }]}>
              <Ionicons name="document-attach" size={28} color={isMine ? '#fff' : C.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.docName, { color: isMine ? '#fff' : C.text }]} numberOfLines={2}>
                {message.fileName || 'Document'}
              </Text>
              <Text style={[styles.docTap, { color: isMine ? 'rgba(255,255,255,0.7)' : C.textMuted }]}>
                Tap to open
              </Text>
            </View>
            <Ionicons name="download-outline" size={20} color={isMine ? '#fff' : C.primary} />
          </TouchableOpacity>
        );

      default:
        return (
          <Text style={[styles.messageText, isMine && styles.messageTextMine]}>
            {message.content}
          </Text>
        );
    }
  };

  const getStatusIcon = () => {
    if (!isMine) return null;
    switch (message.status) {
      case 'seen':
        return <Ionicons name="checkmark-done" size={14} color="rgba(147,213,255,0.9)" />;
      case 'delivered':
        return <Ionicons name="checkmark-done" size={14} color="rgba(255,255,255,0.6)" />;
      default:
        return <Ionicons name="checkmark" size={14} color="rgba(255,255,255,0.5)" />;
    }
  };

  const formatTime = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={[styles.wrapper, isMine ? styles.right : styles.left]}>
      {/* Swipe reply indicator */}
      <Animated.View style={[styles.replyIndicator, { opacity: translateX.interpolate({ inputRange: [0, 60], outputRange: [0, 1], extrapolate: 'clamp' }) }]}>
        <Ionicons name="arrow-back" size={20} color={C.primary} />
      </Animated.View>
      <Animated.View
        style={[styles.animatedBubble, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <TouchableWithoutFeedback
          onLongPress={!replySelectMode ? onLongPress : undefined}
          onPress={replySelectMode ? () => onTapForReply && onTapForReply(message) : undefined}
        >
          <View style={[
            styles.bubble,
            isMine
              ? [styles.bubbleMine, { backgroundColor: C.sent }]
              : [styles.bubbleTheirs, { backgroundColor: C.received }],
          ]}>
            {renderReplyPreview()}
            {renderContent()}
            <View style={styles.meta}>
              <Text style={[styles.time, isMine && styles.timeMine]}>
                {formatTime(message.createdAt)}
              </Text>
              {getStatusIcon()}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { marginVertical: 2, marginHorizontal: 6, flexDirection: 'row', alignItems: 'center' },
  left: { justifyContent: 'flex-start', paddingLeft: 4 },
  right: { justifyContent: 'flex-end', paddingRight: 4 },
  replyIndicator: { position: 'absolute', left: 0, zIndex: 1 },
  animatedBubble: { maxWidth: BUBBLE_MAX_WIDTH },
  bubble: {
    padding: 8, paddingTop: 6, paddingBottom: 4,
    borderRadius: 8,
  },
  bubbleMine: {
    borderBottomRightRadius: 0,
    borderTopRightRadius: 8,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  bubbleTheirs: {
    borderBottomLeftRadius: 0,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  deletedBubble: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, paddingHorizontal: 12,
    borderRadius: 12, borderWidth: 1,
  },
  deletedText: { fontSize: 13, fontStyle: 'italic' },
  replyPreview: {
    borderLeftWidth: 3,
    paddingLeft: 8,
    marginBottom: 4,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  replySender: { fontSize: 12, fontWeight: '700', marginBottom: 2, color: '#00A884' },
  replyContent: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  messageText: { fontSize: 15.5, color: '#E9EDEF', lineHeight: 20 },
  messageTextMine: { color: '#E9EDEF' },
  imageContent: { width: 220, height: 220, borderRadius: 8, marginBottom: 4 },
  audioContent: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingRight: 4, minWidth: 180 },
  audioWaveContainer: { flex: 1 },
  audioWave: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 4 },
  audioBar: { width: 3, borderRadius: 2, minHeight: 4 },
  audioDuration: { fontSize: 11, color: 'rgba(255,255,255,0.6)' },
  docContent: { flexDirection: 'row', alignItems: 'center', gap: 10, maxWidth: 200 },
  docIconBox: { width: 46, height: 46, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)' },
  docName: { fontSize: 13, fontWeight: '600', flexShrink: 1, color: '#E9EDEF' },
  docTap: { fontSize: 11, marginTop: 2, color: 'rgba(255,255,255,0.5)' },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4, gap: 4 },
  time: { fontSize: 11, color: 'rgba(255,255,255,0.5)' },
  timeMine: { color: 'rgba(255,255,255,0.7)' },
});

export default MessageBubble;
