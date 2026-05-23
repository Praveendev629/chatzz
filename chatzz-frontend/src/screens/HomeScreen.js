import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Alert, StatusBar, ActivityIndicator,
  Dimensions, ScrollView, Animated, PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { chatAPI, userAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import { scheduleLocalNotification } from '../services/notifications';
import { getActiveChatId } from '../utils/activeChat';
import ChatListItem from '../components/ChatListItem';
import { Spacing } from '../theme';

const { width } = Dimensions.get('window');
const TABS = ['Chats', 'Calls', 'Status'];

const HomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { on, off } = useSocket();
  const { colors: C } = useTheme();

  const [chats, setChats] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const scrollRef = useRef(null);
  const tabAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      fetchChats();
      fetchRequests();
    }, [])
  );

  const switchTab = (idx) => {
    setActiveTab(idx);
    Animated.timing(tabAnim, { toValue: idx * (width / TABS.length), duration: 200, useNativeDriver: false }).start();
    scrollRef.current?.scrollTo({ x: idx * width, animated: true });
  };

  useEffect(() => {
    const handleNewMessage = (message) => {
      setChats((prev) => prev.map((c) => {
        if (c._id === message.chatId) {
          return { ...c, lastMessage: message, lastMessageAt: message.createdAt };
        }
        return c;
      }).sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt)));

      // Only notify if this chat is NOT currently open
      const activeChatId = getActiveChatId();
      if (message.chatId !== activeChatId) {
        const senderName = message.sender?.username || 'Someone';
        const body =
          message.messageType === 'text' ? message.content :
          message.messageType === 'image' ? '📷 Image' :
          message.messageType === 'audio' ? '🎤 Voice message' : '📎 File';
        scheduleLocalNotification({
          title: senderName,
          body,
          data: {
            type: 'message',
            chatId: message.chatId,
            senderId: message.sender?._id,
            senderName,
          },
        });
      }
    };

    const handleChatRequest = (data) => {
      setRequests((prev) => {
        if (prev.find((r) => r.from._id === data.from._id)) return prev;
        return [...prev, data];
      });
      scheduleLocalNotification({
        title: 'New Chat Request',
        body: `${data.from.username} wants to chat with you`,
        data: { type: 'chat_request', userId: data.from._id },
      });
    };

    on('new_message', handleNewMessage);
    on('chat_request', handleChatRequest);
    return () => {
      off('new_message', handleNewMessage);
      off('chat_request', handleChatRequest);
    };
  }, [on, off]);

  const fetchChats = async () => {
    try {
      const result = await chatAPI.getAll();
      setChats(result.chats || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const fetchRequests = async () => {
    try {
      const result = await userAPI.getRequests();
      setRequests(result.requests || []);
    } catch {}
  };

  const handleChatRequest = async (request, action) => {
    try {
      await userAPI.respondRequest(request.from._id, action);
      setRequests((prev) => prev.filter((r) => r.from._id !== request.from._id));
      if (action === 'accept') fetchChats();
    } catch (err) { Alert.alert('Error', err.message); }
  };

  const openChat = (chat) => {
    const otherParticipant = chat.participants.find((p) => p._id !== user._id);
    navigation.navigate('Chat', { chatId: chat._id, participant: otherParticipant });
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
          setChats((prev) => prev.filter((c) => !c.participants.some((p) => p._id === userId)));
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={C.background} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: C.border }]}>
        <Text style={[styles.headerTitle, { color: C.primary }]}>Chatzz</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate('Search')}>
            <Ionicons name="search-outline" size={24} color={C.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate('Profile')}>
            <Ionicons name="person-circle-outline" size={24} color={C.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate('Settings')}>
            <Ionicons name="settings-outline" size={24} color={C.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Bar */}
      <View style={[styles.tabBar, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        {TABS.map((tab, idx) => (
          <TouchableOpacity key={tab} style={styles.tab} onPress={() => switchTab(idx)}>
            <Text style={[styles.tabText, { color: activeTab === idx ? C.primary : C.textMuted }]}>
              {tab}
              {tab === 'Chats' && requests.length > 0 ? ` (${requests.length})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
        <Animated.View style={[styles.tabIndicator, { backgroundColor: C.primary, left: tabAnim }]} />
      </View>

      {/* Swipeable Content */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / width);
          if (idx !== activeTab) switchTab(idx);
        }}
        style={{ flex: 1 }}
      >
        {/* Tab 0: Chats */}
        <View style={{ width }}>
          {requests.length > 0 && (
            <View style={[styles.requestsBanner, { backgroundColor: `${C.primary}20` }]}>
              <Ionicons name="person-add" size={18} color={C.primary} />
              <Text style={[styles.requestsBannerText, { color: C.text }]}>
                {requests.length} pending chat request{requests.length > 1 ? 's' : ''}
              </Text>
            </View>
          )}
          {requests.map((req) => (
            <View key={req._id || req.from._id} style={[styles.requestCard, { backgroundColor: C.card }]}>
              <Ionicons name="person-circle" size={36} color={C.primary} />
              <View style={styles.requestInfo}>
                <Text style={[styles.requestName, { color: C.text }]}>{req.from.username}</Text>
                <Text style={[styles.requestText, { color: C.textSecondary }]}>wants to chat with you</Text>
              </View>
              <TouchableOpacity style={styles.acceptBtn} onPress={() => handleChatRequest(req, 'accept')}>
                <Ionicons name="checkmark" size={18} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.rejectBtn} onPress={() => handleChatRequest(req, 'reject')}>
                <Ionicons name="close" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}

          {loading ? (
            <ActivityIndicator style={{ marginTop: 60 }} size="large" color={C.primary} />
          ) : (
            <FlatList
              data={chats}
              keyExtractor={(item) => item._id}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <ChatListItem
                  chat={item}
                  currentUserId={user._id}
                  onPress={() => openChat(item)}
                  onLongPress={() => Alert.alert('Options', '', [
                    { text: 'Delete Chat', style: 'destructive', onPress: () => handleDeleteChat(item._id) },
                    {
                      text: 'Block User', onPress: () => {
                        const other = item.participants.find((p) => p._id !== user._id);
                        if (other) handleBlockUser(other._id);
                      },
                    },
                    { text: 'Cancel', style: 'cancel' },
                  ])}
                />
              )}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchChats(); }} tintColor={C.primary} />}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="chatbubbles-outline" size={80} color={C.border} />
                  <Text style={[styles.emptyTitle, { color: C.textMuted }]}>No conversations yet</Text>
                  <Text style={[styles.emptySubtitle, { color: C.textMuted }]}>Search for users to start chatting</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Search')} style={[styles.startChatBtn, { backgroundColor: C.primary }]}>
                    <Text style={styles.startChatBtnText}>Find People</Text>
                  </TouchableOpacity>
                </View>
              }
            />
          )}
        </View>

        {/* Tab 1: Calls */}
        <View style={[{ width }, styles.emptyContainer]}>
          <Ionicons name="call-outline" size={80} color={C.border} />
          <Text style={[styles.emptyTitle, { color: C.textMuted }]}>No recent calls</Text>
          <Text style={[styles.emptySubtitle, { color: C.textMuted }]}>Start a voice or video call from a chat</Text>
        </View>

        {/* Tab 2: Status */}
        <View style={[{ width }, styles.emptyContainer]}>
          <Ionicons name="ellipse-outline" size={80} color={C.border} />
          <Text style={[styles.emptyTitle, { color: C.textMuted }]}>Status</Text>
          <Text style={[styles.emptySubtitle, { color: C.textMuted }]}>Coming soon</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingTop: 56, paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 26, fontWeight: '900', letterSpacing: 1 },
  headerRight: { flexDirection: 'row', gap: Spacing.sm },
  headerBtn: { padding: 4 },
  tabBar: {
    flexDirection: 'row', borderBottomWidth: 1,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabText: { fontSize: 14, fontWeight: '700', letterSpacing: 0.5 },
  tabIndicator: {
    position: 'absolute', bottom: 0, height: 3,
    width: `${100 / 3}%`, borderTopLeftRadius: 2, borderTopRightRadius: 2,
  },
  requestsBanner: {
    flexDirection: 'row', alignItems: 'center',
    padding: Spacing.md, marginHorizontal: Spacing.lg, marginTop: Spacing.md, borderRadius: 12,
  },
  requestsBannerText: { flex: 1, marginLeft: 8, fontSize: 14 },
  requestCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: Spacing.lg, marginTop: 6, borderRadius: 12, padding: Spacing.md,
  },
  requestInfo: { flex: 1, marginLeft: 10 },
  requestName: { fontSize: 15, fontWeight: '600' },
  requestText: { fontSize: 12 },
  acceptBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#4CAF50', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  rejectBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#FF1744', alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
  emptyContainer: { flex: 1, alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginTop: 16 },
  emptySubtitle: { fontSize: 14, marginTop: 8, textAlign: 'center', paddingHorizontal: 40 },
  startChatBtn: { marginTop: 24, paddingHorizontal: 32, paddingVertical: 12, borderRadius: 24 },
  startChatBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});

export default HomeScreen;
