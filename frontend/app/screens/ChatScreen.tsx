import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ActionSheetIOS,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  getMessages,
  deleteMessageEveryone,
  deleteMessageForMe,
  uploadFile,
} from '../services/api';
import ChatBubble from '../components/ChatBubble';
import TypingIndicator from '../components/TypingIndicator';
import { COLORS } from '../utils/constants';

export default function ChatScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const { otherUser } = route.params;
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const flatRef = useRef<FlatList>(null);
  const typingTimeout = useRef<any>(null);

  const isOnline = onlineUsers[otherUser._id] ?? otherUser.isOnline;

  useEffect(() => {
    navigation.setOptions({
      title: otherUser.name,
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isOnline ? COLORS.online : '#666', marginRight: 6 }} />
          <Text style={{ color: '#fff', fontSize: 12 }}>{isOnline ? 'Online' : 'Offline'}</Text>
        </View>
      ),
    });
  }, [isOnline]);

  useEffect(() => {
    loadMessages();
    setupSocket();
    return () => {
      socket?.off('receive_message');
      socket?.off('typing');
      socket?.off('stop_typing');
      socket?.off('messages_read');
      socket?.off('message_deleted_everyone');
    };
  }, [socket]);

  const loadMessages = async () => {
    if (!user?._id) return;
    try {
      const res = await getMessages(user._id, otherUser._id);
      setMessages(res.data.messages);
      markRead(res.data.messages);
    } catch {}
    setLoading(false);
  };

  const markRead = (msgs: any[]) => {
    const unread = msgs.filter((m) => m.senderId._id === otherUser._id && !m.read).map((m) => m._id);
    if (unread.length > 0) {
      socket?.emit('mark_read', { messageIds: unread, receiverId: otherUser._id });
    }
  };

  const setupSocket = () => {
    socket?.on('receive_message', (msg: any) => {
      if (
        (msg.senderId._id === otherUser._id && msg.receiverId._id === user?._id) ||
        (msg.senderId._id === user?._id && msg.receiverId._id === otherUser._id)
      ) {
        setMessages((prev) => [...prev, msg]);
        socket?.emit('mark_read', { messageIds: [msg._id], receiverId: otherUser._id });
        setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
      }
    });

    socket?.on('typing', ({ senderId }: any) => {
      if (senderId === otherUser._id) setIsTyping(true);
    });

    socket?.on('stop_typing', ({ senderId }: any) => {
      if (senderId === otherUser._id) setIsTyping(false);
    });

    socket?.on('messages_read', ({ messageIds }: any) => {
      setMessages((prev) =>
        prev.map((m) => (messageIds.includes(m._id) ? { ...m, read: true } : m))
      );
    });

    socket?.on('message_deleted_everyone', ({ messageId }: any) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId ? { ...m, deleted: true, text: 'This message was deleted.' } : m
        )
      );
    });
  };

  const handleTextChange = (val: string) => {
    setText(val);
    socket?.emit('typing', { senderId: user?._id, receiverId: otherUser._id });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket?.emit('stop_typing', { senderId: user?._id, receiverId: otherUser._id });
    }, 1500);
  };

  const sendMessage = (content: { text?: string; fileUrl?: string; fileType?: string }) => {
    if (!user?._id) return;
    socket?.emit('send_message', {
      senderId: user._id,
      receiverId: otherUser._id,
      ...content,
    });
    socket?.emit('stop_typing', { senderId: user._id, receiverId: otherUser._id });
    setText('');
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleSend = () => {
    if (!text.trim()) return;
    sendMessage({ text: text.trim(), fileType: 'text' });
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled) return;
    const uri = result.assets[0].uri;
    const ext = uri.split('.').pop();
    const formData = new FormData();
    formData.append('file', { uri, name: `img.${ext}`, type: `image/${ext}` } as any);
    formData.append('fileType', 'image');
    const res = await uploadFile(formData);
    sendMessage({ fileUrl: res.data.fileUrl, fileType: 'image' });
  };

  const handleLongPress = (msg: any) => {
    if (msg.deleted) return;
    const isMine = msg.senderId._id === user?._id;
    const options = isMine
      ? ['Delete for everyone', 'Delete for me', 'Cancel']
      : ['Delete for me', 'Cancel'];

    Alert.alert('Message Options', '', [
      ...options.slice(0, -1).map((opt) => ({
        text: opt,
        style: opt.includes('Delete') ? ('destructive' as const) : ('default' as const),
        onPress: async () => {
          if (opt === 'Delete for everyone') {
            await deleteMessageEveryone(msg._id);
            socket?.emit('message_deleted_everyone', { messageId: msg._id, receiverId: otherUser._id });
            setMessages((prev) =>
              prev.map((m) => m._id === msg._id ? { ...m, deleted: true, text: 'This message was deleted.' } : m)
            );
          } else {
            await deleteMessageForMe(msg._id, user!._id);
            setMessages((prev) => prev.filter((m) => m._id !== msg._id));
          }
        },
      })),
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}>
      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: 12, paddingBottom: 4 }}
        onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => (
          <ChatBubble
            message={item}
            isMine={item.senderId._id === user?._id}
            onLongPress={() => handleLongPress(item)}
          />
        )}
        ListFooterComponent={isTyping ? <TypingIndicator /> : null}
      />

      <View style={styles.inputBar}>
        <TouchableOpacity style={styles.attachBtn} onPress={handlePickImage}>
          <Text style={styles.attachIcon}>📎</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={handleTextChange}
          placeholder="Type a message..."
          placeholderTextColor="#555"
          multiline
          maxLength={2000}
        />
        <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={!text.trim()}>
          <Text style={styles.sendIcon}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0d0d0d' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 8,
    paddingHorizontal: 12,
    backgroundColor: '#111',
    borderTopWidth: 1,
    borderTopColor: '#222',
    gap: 8,
  },
  attachBtn: { paddingBottom: 10, paddingHorizontal: 4 },
  attachIcon: { fontSize: 22 },
  input: {
    flex: 1,
    backgroundColor: '#1e1e1e',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: COLORS.white,
    fontSize: 15,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#333',
  },
  sendBtn: {
    backgroundColor: COLORS.primary,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendIcon: { color: COLORS.white, fontSize: 18, fontWeight: '700' },
});
