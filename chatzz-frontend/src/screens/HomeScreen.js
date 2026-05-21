import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Alert, StatusBar, Animated, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { chatAPI, userAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { scheduleLocalNotification } from '../services/notifications';
import ChatListItem from '../components/ChatListItem';
import { Colors, Spacing } from '../theme';

const HomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { on, off } = useSocket();
  const [chats, setChats] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Track currently open chat so we don't double-notify
  const activeChatId = useRef(null);

  useFocusEffect(
    useCallback(() => {
      activeChatId.current = null; // back on home, no active chat
      fetchChats();
      fetchRequests();
    }, [])
  );

  useEffect(() => {
    const handleNewMessage = (message) => {
      // Update chat list in real-time
      setChats((prev) => {
        const updated = prev.map((c) => {
          if (c._id === message.chatId) {
            return { ...c, lastMessage: message, lastMessageAt: message.createdAt };
          }
          return c;
        }).sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
        return updated;
      });

      // Show local notification if this chat is NOT currently open
      if (message.chatId !== activeChatId.current) {
        const senderName = message.sender?.username || 'Someone';
        const body =
          message.messageType === 'text'
            ? message.content
            : message.messageType === 'image'
            ? '📷 Image'
            : message.messageType === 'audio'
            ? '🎤 Voice message'
            : '📎 File';

        scheduleLocalNotification({
          title: senderName,
          body,
          data: { type: 'message', chatId: message.chatId },
        });
      }
    };

    const handleChatRequest = (data) => {
      setRequests((prev) => {
        // Avoid duplicates
        if (prev.find((r) => r.from._id === data.from._id)) return prev;
        return [...prev, data];
      });
      scheduleLocalNotification({
        title: 'New Chat Request',
        body: `${data.from.username} wants to chat with you`,
        data: { type: 'chat_request', userId: data.from._id },
      });
    };

    const handleIncomingCall = (data) => {
      navigation.navigate('Call', {
        participant: data.caller,
        isIncoming: true,
        offer: data.offer,
      });
    };

    on('new_message', handleNewMessage);
    on('chat_request', handleChatRequest);
    on('call_offer', handleIncomingCall);

    return () => {
      off('new_message', handleNewMessage);
      off('chat_request', handleChatRequest);
      off('call_offer', handleIncomingCall);
    };
  }, [on, off]);

  const fetchChats = async () => {
    try {
      const result = await chatAPI.getAll();
      setChats(result.chats || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchRequests = async () => {
    try {
      const result = await userAPI.getRequests();
      setRequests(result.requests || []);
    } catch {}
  };

  const handleDeleteChat = async (chatId) => {
    Alert.alert('Delete Chat', 'Delete this conversation?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await chatAPI.delete(chatId);
          setChats((prev) => prev.filter((c) => c._id !== chatId));
        },
      },
    ]);
  };

  const handleBlockUser = (userId) => {
    Alert.alert('Block User', 'Block this user?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block', style: 'destructive',
        onPress: async () => {
          await userAPI.blockUser(userId);
          setChats((prev) =>
            prev.filter((c) => !c.participants.some((p) => p._id === userId))
          );
        },
      },
    ]);
  };

  const handleChatRequest = async (request, action) => {
    try {
      await userAPI.respondRequest(request.from._id, action);
      setRequests((prev) => prev.filter((r) => r.from._id !== request.from._id));
      if (action === 'accept') fetchChats();
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const openChat = (chat) => {
    const otherParticipant = chat.participants.find((p) => p._id !== user._id);
    activeChatId.current = chat._id;
    navigation.navigate('Chat', { chatId: chat._id, participant: otherParticipant });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chatzz</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate('Settings')}>
            <Ionicons name="settings-outline" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Chat Requests Banner */}
      {requests.length > 0 && (
        <View style={styles.requestsBanner}>
          <Ionicons name="person-add" size={20} color={Colors.primary} />
          <Text style={styles.requestsBannerText}>
            {requests.length} pending chat request{requests.length > 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {/* Requests List */}
      {requests.map((req) => (
        <View key={req._id || req.from._id} style={styles.requestCard}>
          <Ionicons name="person-circle" size={36} color={Colors.primary} />
          <View style={styles.requestInfo}>
            <Text style={styles.requestName}>{req.from.username}</Text>
            <Text style={styles.requestText}>wants to chat with you</Text>
          </View>
          <TouchableOpacity
            style={styles.acceptBtn}
            onPress={() => handleChatRequest(req, 'accept')}
          >
            <Ionicons name="checkmark" size={18} color={Colors.white} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.rejectBtn}
            onPress={() => handleChatRequest(req, 'reject')}
          >
            <Ionicons name="close" size={18} color={Colors.white} />
          </TouchableOpacity>
        </View>
      ))}

      {/* Chat List */}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 60 }} size="large" color={Colors.primary} />
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <ChatListItem
              chat={item}
              currentUserId={user._id}
              onPress={() => openChat(item)}
              onLongPress={() =>
                Alert.alert('Options', '', [
                  {
                    text: 'Delete Chat', style: 'destructive',
                    onPress: () => handleDeleteChat(item._id),
                  },
                  {
                    text: 'Block User',
                    onPress: () => {
                      const other = item.participants.find((p) => p._id !== user._id);
                      if (other) handleBlockUser(other._id);
                    },
                  },
                  { text: 'Cancel', style: 'cancel' },
                ])
              }
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchChats(); }}
              tintColor={Colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={80} color={Colors.border} />
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.emptySubtitle}>Search for users to start chatting</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingTop: 56, paddingBottom: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 26, fontWeight: '900', color: Colors.primary, letterSpacing: 1 },
  headerRight: { flexDirection: 'row', gap: Spacing.sm },
  headerBtn: { padding: 4 },
  requestsBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: `${Colors.primary}20`, padding: Spacing.md,
    marginHorizontal: Spacing.lg, marginTop: Spacing.md, borderRadius: 12,
  },
  requestsBannerText: { flex: 1, marginLeft: 8, color: Colors.text, fontSize: 14 },
  requestCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.card, marginHorizontal: Spacing.lg,
    marginTop: 6, borderRadius: 12, padding: Spacing.md,
  },
  requestInfo: { flex: 1, marginLeft: 10 },
  requestName: { fontSize: 15, fontWeight: '600', color: Colors.text },
  requestText: { fontSize: 12, color: Colors.textSecondary },
  acceptBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.success, alignItems: 'center', justifyContent: 'center', marginLeft: 8,
  },
  rejectBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.danger, alignItems: 'center', justifyContent: 'center', marginLeft: 6,
  },
  emptyContainer: { flex: 1, alignItems: 'center', paddingTop: 100 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.textMuted, marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: Colors.textMuted, marginTop: 8 },
});

export default HomeScreen;
