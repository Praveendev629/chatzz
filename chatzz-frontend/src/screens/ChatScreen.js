import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert, Image,
  ActivityIndicator, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Audio } from 'expo-av';
import { messageAPI } from '../services/api';
import { getSocket, emitSendMessage, emitTyping, emitStopTyping, emitMarkSeen } from '../services/socket';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import MessageBubble from '../components/MessageBubble';
import TypingIndicator from '../components/TypingIndicator';
import { Colors, Spacing, BorderRadius } from '../theme';

const ChatScreen = ({ route, navigation }) => {
  const { chatId, participant } = route.params;
  const { user } = useAuth();
  const { on, off } = useSocket();

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const flatListRef = useRef(null);
  const typingTimeout = useRef(null);
  const durationInterval = useRef(null);

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

    const handleTyping = ({ chatId: cId }) => {
      if (cId === chatId) setIsTyping(true);
    };

    const handleStopTyping = ({ chatId: cId }) => {
      if (cId === chatId) setIsTyping(false);
    };

    const handleMessagesSeen = ({ chatId: cId }) => {
      if (cId !== chatId) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.sender?._id === user._id ? { ...m, status: 'seen' } : m
        )
      );
    };

    const handleMessageDelivered = ({ messageId }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, status: 'delivered' } : m))
      );
    };

    const handleDeletedEveryone = ({ messageId }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId ? { ...m, deletedForEveryone: true, content: '' } : m
        )
      );
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
      setMessages(result.messages || []);
      markSeen();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markSeen = () => {
    emitMarkSeen({ chatId, senderId: participant._id });
  };

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

  const sendTextMessage = () => {
    if (!text.trim()) return;
    const tempId = `temp_${Date.now()}`;
    const optimisticMsg = {
      _id: tempId,
      chatId,
      sender: { _id: user._id, username: user.username, profilePicture: user.profilePicture },
      receiver: participant._id,
      messageType: 'text',
      content: text.trim(),
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
    });
    setText('');
    emitStopTyping({ chatId, receiverId: participant._id });
  };

  const sendImageMessage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (!result.canceled) {
      const file = result.assets[0];
      const formData = new FormData();
      formData.append('chatId', chatId);
      formData.append('receiverId', participant._id);
      formData.append('messageType', 'image');
      formData.append('file', {
        uri: file.uri,
        name: file.uri.split('/').pop(),
        type: 'image/jpeg',
      });

      try {
        const res = await messageAPI.send(formData);
        setMessages((prev) => [...prev, res.message]);
        scrollToBottom();
      } catch (err) {
        Alert.alert('Error', 'Failed to send image');
      }
    }
  };

  const sendDocumentMessage = async () => {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (result.canceled) return;

    const file = result.assets[0];
    const formData = new FormData();
    formData.append('chatId', chatId);
    formData.append('receiverId', participant._id);
    formData.append('messageType', 'document');
    formData.append('file', { uri: file.uri, name: file.name, type: file.mimeType });

    try {
      const res = await messageAPI.send(formData);
      setMessages((prev) => [...prev, res.message]);
      scrollToBottom();
    } catch (err) {
      Alert.alert('Error', 'Failed to send document');
    }
  };

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') return;

      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(rec);
      setIsRecording(true);
      setRecordingDuration(0);
      durationInterval.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      Alert.alert('Error', 'Cannot start recording');
    }
  };

  const stopRecording = async () => {
    try {
      clearInterval(durationInterval.current);
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      setRecordingDuration(0);

      const formData = new FormData();
      formData.append('chatId', chatId);
      formData.append('receiverId', participant._id);
      formData.append('messageType', 'audio');
      formData.append('file', { uri, name: 'voice_message.m4a', type: 'audio/mp4' });

      const res = await messageAPI.send(formData);
      setMessages((prev) => [...prev, res.message]);
      scrollToBottom();
    } catch (err) {
      Alert.alert('Error', 'Failed to send voice message');
    }
  };

  const handleLongPressMessage = (message) => {
    const isMine = message.sender?._id === user._id;
    const options = [
      { text: 'Copy Text', onPress: () => {} },
      { text: 'Delete for Me', style: 'destructive', onPress: () => deleteMessage(message._id, false) },
    ];

    if (isMine) {
      options.push({
        text: 'Delete for Everyone', style: 'destructive',
        onPress: () => deleteMessage(message._id, true),
      });
    }
    options.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Message Options', '', options);
  };

  const deleteMessage = (messageId, forEveryone) => {
    const socket = getSocket();
    socket?.emit('delete_message', {
      messageId, deleteForEveryone: forEveryone,
      chatId, receiverId: participant._id,
    });
    if (forEveryone) {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId ? { ...m, deletedForEveryone: true, content: '' } : m
        )
      );
    } else {
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
    }
  };

  const startVoiceCall = () => {
    navigation.navigate('Call', {
      participant,
      isIncoming: false,
    });
  };

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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <StatusBar barStyle="light-content" backgroundColor={Colors.surface} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>

        <View style={styles.participantInfo}>
          {participant.profilePicture ? (
            <Image source={{ uri: participant.profilePicture }} style={styles.participantAvatar} />
          ) : (
            <View style={styles.participantAvatarPlaceholder}>
              <Ionicons name="person" size={20} color={Colors.textMuted} />
            </View>
          )}
          {participant.isOnline && <View style={styles.onlineDot} />}
        </View>

        <View style={styles.participantMeta}>
          <Text style={styles.participantName}>{participant.username}</Text>
          <Text style={styles.participantStatus}>{getOnlineStatus()}</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerActionBtn} onPress={startVoiceCall}>
            <Ionicons name="call-outline" size={22} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={() =>
              Alert.alert('Options', '', [
                { text: 'Clear Chat', onPress: () => {} },
                { text: 'Cancel', style: 'cancel' },
              ])
            }
          >
            <Ionicons name="ellipsis-vertical" size={22} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} size="large" color={Colors.primary} />
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
            />
          )}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={scrollToBottom}
          ListFooterComponent={isTyping ? <TypingIndicator username={participant.username} /> : null}
        />
      )}

      {/* Input Bar */}
      <View style={styles.inputBar}>
        {isRecording ? (
          <View style={styles.recordingBar}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>Recording {formatDuration(recordingDuration)}</Text>
            <TouchableOpacity style={styles.stopRecordBtn} onPress={stopRecording}>
              <Ionicons name="stop-circle" size={32} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={styles.attachBtn}
              onPress={() =>
                Alert.alert('Attach', '', [
                  { text: 'Image', onPress: sendImageMessage },
                  { text: 'Document', onPress: sendDocumentMessage },
                  { text: 'Cancel', style: 'cancel' },
                ])
              }
            >
              <Ionicons name="attach" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>

            <TextInput
              style={styles.textInput}
              placeholder="Type a message..."
              placeholderTextColor={Colors.textMuted}
              value={text}
              onChangeText={handleTextChange}
              multiline
              maxLength={1000}
            />

            {text.trim() ? (
              <TouchableOpacity style={styles.sendBtn} onPress={sendTextMessage}>
                <Ionicons name="send" size={20} color={Colors.white} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.micBtn} onPress={startRecording}>
                <Ionicons name="mic" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, paddingTop: 52, paddingBottom: 12,
    paddingHorizontal: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { marginRight: 8 },
  participantInfo: { position: 'relative', marginRight: 10 },
  participantAvatar: { width: 40, height: 40, borderRadius: 20 },
  participantAvatarPlaceholder: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.surfaceLight, alignItems: 'center', justifyContent: 'center',
  },
  onlineDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: Colors.online, borderWidth: 2, borderColor: Colors.surface,
  },
  participantMeta: { flex: 1 },
  participantName: { fontSize: 16, fontWeight: '700', color: Colors.text },
  participantStatus: { fontSize: 12, color: Colors.online, marginTop: 1 },
  headerActions: { flexDirection: 'row', gap: 4 },
  headerActionBtn: { padding: 6 },
  messagesList: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.md },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    backgroundColor: Colors.surface, paddingHorizontal: 8,
    paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  attachBtn: { padding: 8, marginBottom: 2 },
  textInput: {
    flex: 1, backgroundColor: Colors.inputBg, borderRadius: 22,
    paddingHorizontal: 16, paddingVertical: 10, color: Colors.text,
    fontSize: 15, maxHeight: 120, marginHorizontal: 4,
    borderWidth: 1, borderColor: Colors.border,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 2,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4, shadowRadius: 6, elevation: 4,
  },
  micBtn: { padding: 8, marginBottom: 2 },
  recordingBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: `${Colors.primary}20`, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10,
  },
  recordingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.danger, marginRight: 10 },
  recordingText: { flex: 1, color: Colors.text, fontSize: 15 },
  stopRecordBtn: { marginLeft: 8 },
});

export default ChatScreen;
