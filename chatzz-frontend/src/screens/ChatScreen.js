import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert, Image, Modal,
  ActivityIndicator, StatusBar, Dimensions, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Audio } from 'expo-av';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { messageAPI } from '../services/api';
import { getSocket, emitSendMessage, emitTyping, emitStopTyping, emitMarkSeen, emitViewingChat } from '../services/socket';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import MessageBubble from '../components/MessageBubble';
import TypingIndicator from '../components/TypingIndicator';
import { Colors, Spacing, BorderRadius } from '../theme';
import { setActiveChatId, clearActiveChatId } from '../utils/activeChat';
import { chatCache } from '../utils/chatCache';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const ChatScreen = ({ route, navigation }) => {
  const { chatId, participant } = route.params;
  const { user } = useAuth();
  const { on, off } = useSocket();
  const { colors: C } = useTheme();
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [replyTo, setReplyTo] = useState(null);

  const flatListRef = useRef(null);
  const typingTimeout = useRef(null);
  const durationInterval = useRef(null);

  // Mark this chat as active (suppresses notifications)
  useFocusEffect(
    useCallback(() => {
      setActiveChatId(chatId);
      emitViewingChat(chatId);
      return () => {
        clearActiveChatId();
        emitViewingChat(null);
      };
    }, [chatId])
  );

  useEffect(() => {
    fetchMessages();

    const handleNewMessage = (msg) => {
      if (msg.chatId !== chatId) return;
      setMessages((prev) => {
        if (prev.find((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
      markSeen();
      scrollToBottom();
    };

    const handleMessageSent = ({ tempId, message }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === tempId ? { ...message } : m))
      );
    };

    const handleTyping = ({ chatId: cId }) => { if (cId === chatId) setIsTyping(true); };
    const handleStopTyping = ({ chatId: cId }) => { if (cId === chatId) setIsTyping(false); };

    const handleMessagesSeen = ({ chatId: cId }) => {
      if (cId !== chatId) return;
      setMessages((prev) => prev.map((m) =>
        m.sender?._id === user._id ? { ...m, status: 'seen' } : m
      ));
    };

    const handleMessageDelivered = ({ messageId }) => {
      setMessages((prev) => prev.map((m) =>
        m._id === messageId ? { ...m, status: 'delivered' } : m
      ));
    };

    const handleDeletedEveryone = ({ messageId }) => {
      setMessages((prev) => prev.map((m) =>
        m._id === messageId ? { ...m, deletedForEveryone: true, content: '' } : m
      ));
    };

    on('new_message', handleNewMessage);
    on('message_sent', handleMessageSent);
    on('user_typing', handleTyping);
    on('user_stop_typing', handleStopTyping);
    on('messages_seen', handleMessagesSeen);
    on('message_delivered', handleMessageDelivered);
    on('message_deleted_everyone', handleDeletedEveryone);

    return () => {
      off('new_message', handleNewMessage);
      off('message_sent', handleMessageSent);
      off('user_typing', handleTyping);
      off('user_stop_typing', handleStopTyping);
      off('messages_seen', handleMessagesSeen);
      off('message_delivered', handleMessageDelivered);
      off('message_deleted_everyone', handleDeletedEveryone);
      clearTimeout(typingTimeout.current);
      clearInterval(durationInterval.current);
    };
  }, [chatId]);

  const fetchMessages = async () => {
    try {
      const result = await messageAPI.getMessages(chatId);
      const msgs = result.messages || [];
      setMessages(msgs);
      await chatCache.saveMessages(chatId, msgs);
      markSeen();
    } catch (err) {
      console.error(err);
      // Load from cache on error
      const cached = await chatCache.loadMessages(chatId);
      if (cached) setMessages(cached);
    } finally { setLoading(false); }
  };

  // Auto-refresh messages every 3 seconds
  const refreshInterval = useRef(null);

  useEffect(() => {
    // Load from cache immediately
    const loadCachedMessages = async () => {
      const cached = await chatCache.loadMessages(chatId);
      if (cached) {
        setMessages(cached);
        setLoading(false);
      }
    };
    loadCachedMessages();

    // Set up auto-refresh
    refreshInterval.current = setInterval(() => {
      fetchMessages();
    }, 3000);

    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, [chatId]);

  const markSeen = () => emitMarkSeen({ chatId, senderId: participant._id });

  const scrollToBottom = () => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleTextChange = (value) => {
    setText(value);
    emitTyping({ chatId, receiverId: participant._id });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      emitStopTyping({ chatId, receiverId: participant._id });
    }, 1500);
  };

  const handleSwipeReply = (message) => {
    setReplyTo(message);
  };

  const cancelReply = () => {
    setReplyTo(null);
  };

  const sendTextMessage = () => {
    if (!text.trim()) return;
    const tempId = `temp_${Date.now()}`;
    const optimisticMsg = {
      _id: tempId, chatId,
      sender: { _id: user._id, username: user.username, profilePicture: user.profilePicture },
      receiver: participant._id,
      messageType: 'text',
      content: text.trim(),
      replyTo: replyTo?._id || null,
      replyToContent: replyTo?.content || replyTo?.fileName || null,
      replyToSender: replyTo?.sender?.username || null,
      status: 'sent',
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    scrollToBottom();
    emitSendMessage({
      chatId,
      receiverId: participant._id,
      messageType: 'text',
      content: text.trim(),
      tempId,
      replyTo: replyTo?._id || null,
    });
    setText('');
    setReplyTo(null);
    emitStopTyping({ chatId, receiverId: participant._id });
  };

  const sendImageMessage = async () => {
    setShowAttachMenu(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Please allow photo access in settings'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7, allowsEditing: false,
    });
    if (!result.canceled) {
      const file = result.assets[0];
      const formData = new FormData();
      formData.append('chatId', chatId);
      formData.append('receiverId', participant._id);
      formData.append('messageType', 'image');
      formData.append('file', { uri: file.uri, name: file.uri.split('/').pop(), type: 'image/jpeg' });
      try {
        const res = await messageAPI.send(formData);
        setMessages((prev) => [...prev, res.message]);
        scrollToBottom();
      } catch (err) { Alert.alert('Error', 'Failed to send image: ' + err.message); }
    }
  };

  const takePhoto = async () => {
    setShowAttachMenu(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Please allow camera access'); return; }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled) {
      const file = result.assets[0];
      const formData = new FormData();
      formData.append('chatId', chatId);
      formData.append('receiverId', participant._id);
      formData.append('messageType', 'image');
      formData.append('file', { uri: file.uri, name: 'photo.jpg', type: 'image/jpeg' });
      try {
        const res = await messageAPI.send(formData);
        setMessages((prev) => [...prev, res.message]);
        scrollToBottom();
      } catch (err) { Alert.alert('Error', 'Failed to send photo'); }
    }
  };

  const sendDocumentMessage = async () => {
    setShowAttachMenu(false);
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (result.canceled) return;
    const file = result.assets[0];
    const formData = new FormData();
    formData.append('chatId', chatId);
    formData.append('receiverId', participant._id);
    formData.append('messageType', 'document');
    formData.append('file', { uri: file.uri, name: file.name, type: file.mimeType || 'application/octet-stream' });
    try {
      const res = await messageAPI.send(formData);
      setMessages((prev) => [...prev, res.message]);
      scrollToBottom();
    } catch (err) { Alert.alert('Error', 'Failed to send document'); }
  };

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission needed', 'Please allow microphone access'); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: rec } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(rec);
      setIsRecording(true);
      setRecordingDuration(0);
      durationInterval.current = setInterval(() => setRecordingDuration((p) => p + 1), 1000);
    } catch (err) { Alert.alert('Error', 'Cannot start recording'); }
  };

  const stopRecording = async () => {
    try {
      clearInterval(durationInterval.current);
      setIsRecording(false);
      if (!recording) return;
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (!uri) { Alert.alert('Error', 'No recording found'); return; }
      setRecording(null); setRecordingDuration(0);

      // Determine file type from URI extension
      const uriLower = uri.toLowerCase();
      let fileType = 'audio/m4a';
      let fileName = `voice_${Date.now()}.m4a`;

      if (uriLower.endsWith('.wav')) {
        fileType = 'audio/wav';
        fileName = `voice_${Date.now()}.wav`;
      } else if (uriLower.endsWith('.mp3')) {
        fileType = 'audio/mp3';
        fileName = `voice_${Date.now()}.mp3`;
      } else if (uriLower.endsWith('.ogg')) {
        fileType = 'audio/ogg';
        fileName = `voice_${Date.now()}.ogg`;
      }

      const formData = new FormData();
      formData.append('chatId', chatId);
      formData.append('receiverId', participant._id);
      formData.append('messageType', 'audio');
      formData.append('file', { uri, name: fileName, type: fileType });
      const res = await messageAPI.send(formData);
      setMessages((prev) => [...prev, res.message]);
      scrollToBottom();
    } catch (err) {
      console.error('Voice send error:', err);
      Alert.alert('Error', 'Failed to send voice message: ' + err.message);
    }
  };

  const cancelRecording = async () => {
    try {
      clearInterval(durationInterval.current);
      setIsRecording(false);
      if (recording) { await recording.stopAndUnloadAsync(); }
      setRecording(null); setRecordingDuration(0);
    } catch (_) {}
  };

  const handleLongPressMessage = (message) => {
    const isMine = message.sender?._id === user._id;
    const options = [
      { text: 'Delete for Me', style: 'destructive', onPress: () => deleteMessage(message._id, false) },
    ];
    if (isMine) {
      options.push({ text: 'Delete for Everyone', style: 'destructive', onPress: () => deleteMessage(message._id, true) });
    }
    options.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Message Options', '', options);
  };

  const deleteMessage = (messageId, forEveryone) => {
    const socket = getSocket();
    socket?.emit('delete_message', { messageId, deleteForEveryone: forEveryone, chatId, receiverId: participant._id });
    if (forEveryone) {
      setMessages((prev) => prev.map((m) =>
        m._id === messageId ? { ...m, deletedForEveryone: true, content: '' } : m
      ));
    } else {
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
    }
  };

  const startVoiceCall = () => navigation.navigate('Call', { participant, isIncoming: false, callType: 'voice' });
  const startVideoCall = () => navigation.navigate('Call', { participant, isIncoming: false, callType: 'video' });

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const getOnlineStatus = () => {
    if (participant.isOnline) return 'Online';
    if (participant.lastSeen) {
      const d = new Date(participant.lastSeen);
      return `Last seen ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return '';
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={C.surface} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: C.surface, borderBottomColor: C.border, paddingTop: 48 + insets.top * 0.5 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={C.text} />
        </TouchableOpacity>
        <View style={styles.participantInfo}>
          {participant.profilePicture ? (
            <Image source={{ uri: participant.profilePicture }} style={styles.participantAvatar} />
          ) : (
            <View style={[styles.participantAvatarPlaceholder, { backgroundColor: C.surfaceLight }]}>
              <Ionicons name="person" size={20} color={C.textMuted} />
            </View>
          )}
          {participant.isOnline && <View style={styles.onlineDot} />}
        </View>
        <View style={styles.participantMeta}>
          <Text style={[styles.participantName, { color: C.text }]}>{participant.username}</Text>
          <Text style={[styles.participantStatus, { color: participant.isOnline ? C.online : C.textMuted }]}>
            {getOnlineStatus()}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerActionBtn} onPress={startVoiceCall}>
            <Ionicons name="call-outline" size={22} color={C.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerActionBtn} onPress={startVideoCall}>
            <Ionicons name="videocam-outline" size={22} color={C.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerActionBtn} onPress={() =>
            Alert.alert('Options', '', [
              { text: 'Clear Chat', onPress: () => {} },
              { text: 'Cancel', style: 'cancel' },
            ])
          }>
            <Ionicons name="ellipsis-vertical" size={22} color={C.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
        enabled={Platform.OS === 'ios'}
      >
        {loading ? (
          <ActivityIndicator style={{ flex: 1 }} size="large" color={C.primary} />
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <MessageBubble
                message={item}
                isMine={item.sender?._id === user._id}
                onLongPress={() => handleLongPressMessage(item)}
                onImagePress={(url) => setImagePreview(url)}
                onSwipeReply={handleSwipeReply}
                colors={C}
              />
            )}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={scrollToBottom}
            ListFooterComponent={isTyping ? <TypingIndicator username={participant.username} /> : null}
          />
        )}
      </KeyboardAvoidingView>

      {/* Reply Preview */}
      {replyTo && (
        <View style={[styles.replyPreviewBar, { backgroundColor: C.surface, borderTopColor: C.border }]}>
          <View style={[styles.replyPreviewContent, { borderLeftColor: C.primary }]}>
            <Text style={[styles.replyPreviewSender, { color: C.primary }]} numberOfLines={1}>
              {replyTo.sender?.username || 'Unknown'}
            </Text>
            <Text style={[styles.replyPreviewText, { color: C.textSecondary }]} numberOfLines={1}>
              {replyTo.content || replyTo.fileName || (replyTo.messageType === 'image' ? '📷 Image' : replyTo.messageType === 'audio' ? '🎤 Voice' : '📎 File')}
            </Text>
          </View>
          <TouchableOpacity onPress={cancelReply} style={styles.replyCancelBtn}>
            <Ionicons name="close" size={20} color={C.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* Input Bar */}
      <View style={[styles.inputBar, { backgroundColor: C.surface, borderTopColor: C.border, paddingBottom: Math.max(insets.bottom, 8) }]}>
        {isRecording ? (
          <View style={[styles.recordingBar, { backgroundColor: `${C.primary}20` }]}>
            <TouchableOpacity onPress={cancelRecording} style={{ padding: 4 }}>
              <Ionicons name="trash-outline" size={22} color={C.danger} />
            </TouchableOpacity>
            <View style={styles.recordingDot} />
            <Text style={[styles.recordingText, { color: C.text }]}>🎤 {formatDuration(recordingDuration)}</Text>
            <TouchableOpacity style={[styles.stopRecordBtn, { backgroundColor: C.primary }]} onPress={stopRecording}>
              <Ionicons name="send" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <TouchableOpacity style={styles.attachBtn} onPress={() => setShowAttachMenu(true)}>
              <Ionicons name="attach" size={26} color={C.textSecondary} />
            </TouchableOpacity>
            <TextInput
              style={[styles.textInput, { backgroundColor: C.inputBg, color: C.text, borderColor: C.border }]}
              placeholder="Type a message..."
              placeholderTextColor={C.textMuted}
              value={text}
              onChangeText={handleTextChange}
              multiline
              maxLength={1000}
            />
            {text.trim() ? (
              <TouchableOpacity style={[styles.sendBtn, { backgroundColor: C.primary }]} onPress={sendTextMessage}>
                <Ionicons name="send" size={20} color="#fff" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.micBtn} onLongPress={startRecording} onPress={() => Alert.alert('Voice', 'Hold to record voice message')}>
                <Ionicons name="mic" size={26} color={C.primary} />
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {/* Attach Menu */}
      <Modal visible={showAttachMenu} transparent animationType="slide">
        <TouchableOpacity style={styles.attachOverlay} activeOpacity={1} onPress={() => setShowAttachMenu(false)}>
          <View style={[styles.attachSheet, { backgroundColor: C.surface }]}>
            <Text style={[styles.attachTitle, { color: C.textMuted }]}>Share</Text>
            <View style={styles.attachGrid}>
              <AttachOption icon="image" label="Gallery" color="#9C27B0" onPress={sendImageMessage} />
              <AttachOption icon="camera" label="Camera" color="#F44336" onPress={takePhoto} />
              <AttachOption icon="document-attach" label="Document" color="#2196F3" onPress={sendDocumentMessage} />
              <AttachOption icon="mic" label="Audio" color="#4CAF50" onPress={() => { setShowAttachMenu(false); startRecording(); }} />
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Image Preview Modal */}
      {imagePreview && (
        <Modal visible={!!imagePreview} transparent animationType="fade">
          <View style={styles.previewOverlay}>
            <TouchableOpacity style={styles.previewClose} onPress={() => setImagePreview(null)}>
              <Ionicons name="close" size={30} color="#fff" />
            </TouchableOpacity>
            <Image source={{ uri: imagePreview }} style={styles.previewImage} resizeMode="contain" />
          </View>
        </Modal>
      )}
    </View>
  );
};

const AttachOption = ({ icon, label, color, onPress }) => (
  <TouchableOpacity style={styles.attachOption} onPress={onPress}>
    <View style={[styles.attachIconCircle, { backgroundColor: color }]}>
      <Ionicons name={icon} size={26} color="#fff" />
    </View>
    <Text style={styles.attachOptionLabel}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingBottom: 12, paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: { marginRight: 4 },
  participantInfo: { position: 'relative', marginRight: 10 },
  participantAvatar: { width: 40, height: 40, borderRadius: 20 },
  participantAvatarPlaceholder: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: '#4CAF50', borderWidth: 2, borderColor: '#1A1A1A' },
  participantMeta: { flex: 1 },
  participantName: { fontSize: 16, fontWeight: '700' },
  participantStatus: { fontSize: 12, marginTop: 1 },
  headerActions: { flexDirection: 'row', gap: 2 },
  headerActionBtn: { padding: 7 },
  messagesList: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.md },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 8, paddingTop: 8,
    borderTopWidth: 1,
  },
  replyPreviewBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 8,
    borderTopWidth: 1,
  },
  replyPreviewContent: {
    flex: 1,
    borderLeftWidth: 3,
    paddingLeft: 8,
    paddingVertical: 4,
  },
  replyPreviewSender: { fontSize: 13, fontWeight: '700' },
  replyPreviewText: { fontSize: 12, marginTop: 2 },
  replyCancelBtn: { padding: 8 },
  attachBtn: { padding: 8, marginBottom: 2 },
  textInput: {
    flex: 1, borderRadius: 22,
    paddingHorizontal: 16, paddingVertical: 10, fontSize: 15,
    maxHeight: 120, marginHorizontal: 4,
    borderWidth: 1,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center', marginBottom: 2,
  },
  micBtn: { padding: 8, marginBottom: 2 },
  recordingBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    borderRadius: 22, paddingHorizontal: 12, paddingVertical: 10, gap: 10,
  },
  recordingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF1744' },
  recordingText: { flex: 1, fontSize: 15 },
  stopRecordBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  attachOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  attachSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 16, paddingBottom: 32 },
  attachTitle: { textAlign: 'center', fontSize: 13, fontWeight: '600', letterSpacing: 1, marginBottom: 20 },
  attachGrid: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 20 },
  attachOption: { alignItems: 'center', gap: 8 },
  attachIconCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  attachOptionLabel: { fontSize: 12, color: '#9E9E9E', marginTop: 4 },
  previewOverlay: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  previewClose: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 8 },
  previewImage: { width: '100%', height: '85%' },
});

export default ChatScreen;
