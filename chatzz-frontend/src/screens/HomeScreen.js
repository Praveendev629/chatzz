import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, StatusBar, ActivityIndicator,
  Dimensions, ScrollView, Animated, PanResponder, Image, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { chatAPI, userAPI, callAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import { chatCache } from '../utils/chatCache';
import ChatListItem from '../components/ChatListItem';
import { Spacing } from '../theme';

const { width } = Dimensions.get('window');
const TABS = ['Chats', 'Find People', 'Calls'];

const HomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { on, off } = useSocket();
  const { colors: C } = useTheme();

  const [chats, setChats] = useState([]);
  const [requests, setRequests] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [callHistory, setCallHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const scrollRef = useRef(null);
  const tabAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      // Data is already loaded via auto-refresh
      // Just ensure we have fresh data when screen is focused
      fetchChats(false);
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

  const fetchChats = async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true);
      const result = await chatAPI.getAll();
      const newChats = result.chats || [];
      setChats(newChats);
      await chatCache.saveChats(newChats);
    } catch (err) {
      console.error(err);
      // Load from cache on error
      const cached = await chatCache.loadChats();
      if (cached) setChats(cached);
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    try {
      const result = await userAPI.getRequests();
      setRequests(result.requests || []);
    } catch {}
  };

  const fetchAllUsers = async () => {
    try {
      const result = await userAPI.getAll('');
      const users = result.users || [];
      setAllUsers(users);
      await chatCache.saveUsers(users);
    } catch (err) {
      console.error(err);
      const cached = await chatCache.loadUsers();
      if (cached) setAllUsers(cached);
    }
  };

  const fetchCallHistory = async () => {
    try {
      const result = await callAPI.getAll();
      setCallHistory(result.calls || []);
    } catch (err) { console.error(err); }
  };

  // Auto-refresh interval
  const refreshInterval = useRef(null);

  useEffect(() => {
    // Load from cache immediately
    const loadCachedData = async () => {
      const cachedChats = await chatCache.loadChats();
      if (cachedChats) {
        setChats(cachedChats);
        setLoading(false);
      }
    };
    loadCachedData();

    // Initial fetch
    fetchChats(true);
    fetchRequests();
    fetchAllUsers();
    fetchCallHistory();

    // Set up auto-refresh every 3 seconds
    refreshInterval.current = setInterval(() => {
      fetchChats(false);
      fetchRequests();
    }, 3000);

    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, []);

  const getTimeAgo = (date) => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
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

  const filteredChats = chats.filter((chat) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const other = chat.participants.find((p) => p._id !== user._id);
    const nameMatch = other?.username?.toLowerCase().includes(q);
    const msgMatch = chat.lastMessage?.content?.toLowerCase().includes(q);
    return nameMatch || msgMatch;
  });

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
          {/* Search Bar */}
          <View style={[styles.searchContainer, { backgroundColor: C.inputBg, borderColor: C.border }]}>
            <Ionicons name="search" size={18} color={C.textSecondary} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.searchInput, { color: C.text }]}
              placeholder="Search chats or messages..."
              placeholderTextColor={C.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={C.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

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
              data={filteredChats}
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

        {/* Tab 1: Find People */}
        <View style={{ width }}>
          <FlatList
            data={allUsers.filter(u => {
              if (u._id === user._id) return false;
              // Remove users who have an active chat (request accepted)
              const hasChat = chats.some(c => c.participants.some(p => p._id === u._id));
              if (hasChat) return false;
              return true;
            })}
            keyExtractor={(item) => item._id}
            scrollEnabled={false}
            renderItem={({ item }) => {
              const hasRequest = requests.some(r => r.from._id === item._id);
              return (
                <TouchableOpacity
                  style={[styles.userRow, { borderBottomColor: C.border }]}
                  onPress={() => {
                    if (hasRequest) {
                      // Already has pending request - show info
                      Alert.alert('Request Pending', `You already have a pending request with ${item.username}`);
                    } else {
                      navigation.navigate('Search');
                    }
                  }}
                  activeOpacity={0.7}
                >
                  {item.profilePicture ? (
                    <Image source={{ uri: item.profilePicture }} style={styles.userAvatar} />
                  ) : (
                    <View style={[styles.userAvatar, { backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' }]}>
                      <Ionicons name="person" size={24} color="#fff" />
                    </View>
                  )}
                  <View style={styles.userInfo}>
                    <Text style={[styles.userName, { color: C.text }]}>{item.username}</Text>
                    <Text style={[styles.userStatus, { color: item.isOnline ? C.online : C.textMuted }]}>
                      {hasRequest ? 'Pending request' : item.isOnline ? 'Online' : 'Offline'}
                    </Text>
                  </View>
                  {hasRequest && (
                    <View style={styles.requestBadge}>
                      <Text style={styles.requestBadgeText}>Pending</Text>
                    </View>
                  )}
                  {!hasRequest && (
                    <TouchableOpacity
                      style={[styles.connectBtn, { backgroundColor: C.primary }]}
                      onPress={() => navigation.navigate('Search')}
                    >
                      <Ionicons name="person-add" size={16} color="#fff" />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={80} color={C.border} />
                <Text style={[styles.emptyTitle, { color: C.textMuted }]}>No new people found</Text>
                <Text style={[styles.emptySubtitle, { color: C.textMuted }]}>All users are already connected</Text>
              </View>
            }
          />
        </View>

        {/* Tab 2: Call History */}
        <View style={{ width }}>
          <FlatList
            data={callHistory}
            keyExtractor={(item) => item._id}
            scrollEnabled={false}
            contentContainerStyle={{ paddingBottom: 80 }}
            ListHeaderComponent={
              callHistory.length > 0 ? (
                <View style={[styles.statusSectionHeader, { borderBottomColor: C.border }]}>
                  <Text style={[styles.statusSectionTitle, { color: C.textMuted }]}>RECENT CALLS</Text>
                </View>
              ) : null
            }
            renderItem={({ item }) => {
              const otherUser = item.caller._id === user._id ? item.receiver : item.caller;
              const isOutgoing = item.caller._id === user._id;
              const isMissed = item.status === 'missed';
              const isRejected = item.status === 'rejected';
              const statusColor = isMissed || isRejected ? '#FF1744' : C.textMuted;
              const durationText = item.duration > 0 ? `${Math.floor(item.duration / 60)}m ${item.duration % 60}s` : '';
              const timeAgo = getTimeAgo(item.createdAt);
              return (
                <TouchableOpacity
                  style={[styles.statusRow, { borderBottomColor: C.border }]}
                  onPress={() => {
                    const other = item.caller._id === user._id ? item.receiver : item.caller;
                    navigation.navigate('Call', { participant: other, isIncoming: false, callType: item.callType });
                  }}
                  onLongPress={() => {
                    Alert.alert('Call Options', '', [
                      { text: 'Call Back', onPress: () => {
                        const other = item.caller._id === user._id ? item.receiver : item.caller;
                        navigation.navigate('Call', { participant: other, isIncoming: false, callType: item.callType });
                      }},
                      { text: 'Delete', style: 'destructive', onPress: async () => {
                        try { await callAPI.delete(item._id); fetchCallHistory(); } catch (err) {}
                      }},
                      { text: 'Cancel', style: 'cancel' },
                    ]);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.statusAvatarContainer}>
                    <View style={[styles.statusAvatarRing, { borderColor: isMissed ? '#FF1744' : C.primary }]}>
                      {otherUser.profilePicture ? (
                        <Image source={{ uri: otherUser.profilePicture }} style={styles.statusAvatarImg} />
                      ) : (
                        <View style={[styles.statusAvatarPlaceholder, { backgroundColor: C.primary }]}>
                          <Ionicons name="person" size={22} color="#fff" />
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={styles.statusInfo}>
                    <Text style={[styles.statusName, { color: isMissed ? '#FF1744' : C.text }]}>{otherUser.username}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <Ionicons
                        name={isOutgoing ? 'arrow-up' : 'arrow-down'}
                        size={14}
                        color={isOutgoing ? '#2196F3' : '#4CAF50'}
                      />
                      <Text style={[styles.statusTime, { color: statusColor }]}>
                        {isMissed ? 'Missed' : isRejected ? 'Rejected' : item.status === 'ended' ? (isOutgoing ? 'Outgoing' : 'Incoming') : item.status}
                        {durationText ? ` · ${durationText}` : ''}
                        {' · '}
                        {timeAgo}
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name={item.callType === 'video' ? 'videocam' : 'call'}
                    size={18}
                    color={C.textMuted}
                  />
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyStatusContainer}>
                <View style={[styles.emptyStatusIcon, { backgroundColor: '#2196F315' }]}>
                  <Ionicons name="call-outline" size={48} color="#2196F3" />
                </View>
                <Text style={[styles.emptyStatusTitle, { color: C.text }]}>No call history yet</Text>
                <Text style={[styles.emptyStatusSubtitle, { color: C.textMuted }]}>
                  Your voice and video calls will appear here
                </Text>
              </View>
            }
          />
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
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: Spacing.lg, marginTop: Spacing.md,
    borderRadius: 12, paddingHorizontal: Spacing.md,
    borderWidth: 1,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14 },
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
  userRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: 12, borderBottomWidth: 1,
  },
  userAvatar: { width: 48, height: 48, borderRadius: 24, overflow: 'hidden' },
  userInfo: { flex: 1, marginLeft: 12 },
  userName: { fontSize: 16, fontWeight: '600' },
  userStatus: { fontSize: 13, marginTop: 2 },
  requestBadge: {
    backgroundColor: '#FF9800',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 8,
  },
  requestBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  connectBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  statusSectionHeader: {
    paddingHorizontal: Spacing.lg, paddingVertical: 10,
    borderBottomWidth: 1,
  },
  statusSectionTitle: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
  statusRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: 12, borderBottomWidth: 1,
  },
  statusAvatarContainer: { width: 56, height: 56, justifyContent: 'center', alignItems: 'center' },
  statusAvatarRing: {
    width: 52, height: 52, borderRadius: 26, borderWidth: 2.5,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  statusAvatarImg: { width: 46, height: 46, borderRadius: 23 },
  statusAvatarPlaceholder: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  statusInfo: { flex: 1, marginLeft: 14 },
  statusName: { fontSize: 16, fontWeight: '500' },
  statusTime: { fontSize: 13, marginTop: 3, opacity: 0.6 },
  emptyStatusContainer: { flex: 1, alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyStatusIcon: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyStatusTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptyStatusSubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});

export default HomeScreen;
