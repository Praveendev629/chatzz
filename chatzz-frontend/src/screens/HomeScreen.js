import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, StatusBar, ActivityIndicator,
  Dimensions, ScrollView, Animated, PanResponder, Image, TextInput, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { chatAPI, userAPI, statusAPI } from '../services/api';
import { uploadToCloudinary } from '../utils/cloudinary';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import { chatCache } from '../utils/chatCache';
import ChatListItem from '../components/ChatListItem';
import { Spacing } from '../theme';

const { width } = Dimensions.get('window');
const TABS = ['Chats', 'Find People', 'Status'];

const HomeScreen = ({ navigation }) => {
  const { user, token } = useAuth();
  const { on, off } = useSocket();
  const { colors: C } = useTheme();

  const [chats, setChats] = useState([]);
  const [requests, setRequests] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [ownStatuses, setOwnStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [showStatusViewer, setShowStatusViewer] = useState(false);
  const [viewingStatuses, setViewingStatuses] = useState([]);
  const [viewingStatusIndex, setViewingStatusIndex] = useState(0);
  const [showCreateStatus, setShowCreateStatus] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [statusBgColor, setStatusBgColor] = useState('#E53935');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
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

  const fetchStatuses = async () => {
    try {
      const result = await statusAPI.getAll();
      setStatuses(result.statuses || []);
      setOwnStatuses(result.ownStatuses || []);
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
    fetchStatuses();

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

  const createTextStatus = async () => {
    if (!statusText.trim()) return;
    try {
      setUploading(true);
      setUploadProgress(100);
      await statusAPI.create({ mediaType: 'text', content: statusText, backgroundColor: statusBgColor });
      setShowCreateStatus(false);
      setStatusText('');
      setUploading(false);
      setUploadProgress(0);
      fetchStatuses();
    } catch (err) {
      setUploading(false);
      Alert.alert('Error', err.message || 'Failed to create status');
    }
  };

  const createImageStatus = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow photo access'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled) {
      try {
        setUploading(true);
        setUploadProgress(0);
        const file = result.assets[0];
        const mediaUrl = await uploadToCloudinary(file.uri, 'chatzz/statuses', token, (pct) => setUploadProgress(pct));
        await statusAPI.create({ mediaType: 'image', mediaUrl });
        setUploadProgress(100);
        setTimeout(() => {
          setUploading(false);
          setUploadProgress(0);
          fetchStatuses();
        }, 500);
      } catch (err) {
        setUploading(false);
        Alert.alert('Error', err.message || 'Failed to create status');
      }
    }
  };

  const createVideoStatus = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow video access'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 0.8,
      videoMaxDuration: 30,
    });
    if (!result.canceled) {
      try {
        setUploading(true);
        setUploadProgress(0);
        const file = result.assets[0];
        const mediaUrl = await uploadToCloudinary(file.uri, 'chatzz/statuses', token, (pct) => setUploadProgress(pct));
        await statusAPI.create({ mediaType: 'video', mediaUrl });
        setUploadProgress(100);
        setTimeout(() => {
          setUploading(false);
          setUploadProgress(0);
          fetchStatuses();
        }, 500);
      } catch (err) {
        setUploading(false);
        Alert.alert('Error', err.message || 'Failed to create status');
      }
    }
  };

  const openStatusViewer = (userStatuses, index = 0) => {
    setViewingStatuses(userStatuses);
    setViewingStatusIndex(index);
    setShowStatusViewer(true);
  };

  const viewStatusItem = async (status) => {
    try {
      await statusAPI.view(status._id);
    } catch (err) { console.error(err); }
  };

  const deleteOwnStatuses = async () => {
    try {
      for (const status of ownStatuses) {
        await statusAPI.delete(status._id);
      }
      setOwnStatuses([]);
      fetchStatuses();
    } catch (err) {
      Alert.alert('Error', 'Failed to delete status');
    }
  };

  const deleteSingleStatus = async (statusId) => {
    try {
      await statusAPI.delete(statusId);
      setViewingStatuses(prev => prev.filter(s => s._id !== statusId));
      if (viewingStatuses.length <= 1) {
        setShowStatusViewer(false);
      }
      fetchStatuses();
    } catch (err) {
      Alert.alert('Error', 'Failed to delete status');
    }
  };

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

        {/* Tab 2: Status */}
        <View style={{ width }}>
          {/* My Status - WhatsApp Style */}
          <TouchableOpacity
            style={[styles.myStatusSection, { borderBottomColor: C.border }]}
            onPress={() => {
              if (ownStatuses.length > 0) {
                openStatusViewer(ownStatuses, 0);
              } else {
                setShowCreateStatus(true);
              }
            }}
            onLongPress={() => {
              if (ownStatuses.length > 0) {
                Alert.alert('My Status', 'Choose an action', [
                  { text: 'View Status', onPress: () => openStatusViewer(ownStatuses, 0) },
                  { text: 'Add New Status', onPress: () => setShowCreateStatus(true) },
                  { text: 'Delete All Status', style: 'destructive', onPress: () => deleteOwnStatuses() },
                  { text: 'Cancel', style: 'cancel' },
                ]);
              } else {
                setShowCreateStatus(true);
              }
            }}
          >
            <View style={styles.myStatusAvatarContainer}>
              <View style={[styles.myStatusAvatarRing, { borderColor: ownStatuses.length > 0 ? '#FFD600' : C.primary }]}>
                {user.profilePicture ? (
                  <Image source={{ uri: user.profilePicture }} style={styles.myStatusAvatarImg} />
                ) : (
                  <View style={[styles.myStatusAvatarPlaceholder, { backgroundColor: C.primary }]}>
                    <Ionicons name="person" size={22} color="#fff" />
                  </View>
                )}
              </View>
              {ownStatuses.length === 0 && (
                <View style={[styles.addStatusIcon, { backgroundColor: C.primary }]}>
                  <Ionicons name="add" size={16} color="#fff" />
                </View>
              )}
            </View>
            <View style={styles.myStatusInfo}>
              <Text style={[styles.myStatusTitle, { color: C.text }]}>My Status</Text>
              <Text style={[styles.myStatusSubtitle, { color: C.textMuted }]}>
                {ownStatuses.length > 0
                  ? `${ownStatuses.length} update${ownStatuses.length > 1 ? 's' : ''} · Tap to view`
                  : 'Tap to add status update'}
              </Text>
            </View>
            {ownStatuses.length > 0 && (
              <View style={[styles.statusCountBadge, { backgroundColor: C.primary }]}>
                <Text style={styles.statusCountText}>{ownStatuses.length}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Recent Updates Header */}
          {statuses.length > 0 && (
            <View style={[styles.statusSectionHeader, { borderBottomColor: C.border }]}>
              <Text style={[styles.statusSectionTitle, { color: C.textMuted }]}>RECENT UPDATES</Text>
            </View>
          )}

          {/* Other Users' Statuses */}
          <FlatList
            data={statuses}
            keyExtractor={(item) => item.user._id}
            scrollEnabled={false}
            renderItem={({ item }) => {
              const lastStatus = item.statuses[0];
              const timeAgo = lastStatus ? getTimeAgo(lastStatus.createdAt) : '';
              return (
                <TouchableOpacity
                  style={[styles.statusRow, { borderBottomColor: C.border }]}
                  onPress={() => openStatusViewer(item.statuses, 0)}
                  activeOpacity={0.7}
                >
                  <View style={styles.statusAvatarContainer}>
                    <View style={[
                      styles.statusAvatarRing,
                      item.hasUnviewed
                        ? { borderColor: '#FFD600' }
                        : { borderColor: C.textMuted }
                    ]}>
                      {item.user.profilePicture ? (
                        <Image source={{ uri: item.user.profilePicture }} style={styles.statusAvatarImg} />
                      ) : (
                        <View style={[styles.statusAvatarPlaceholder, { backgroundColor: C.primary }]}>
                          <Ionicons name="person" size={22} color="#fff" />
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={styles.statusInfo}>
                    <Text style={[styles.statusName, { color: C.text }]}>{item.user.username}</Text>
                    <Text style={[styles.statusTime, { color: C.textMuted }]}>
                      {timeAgo} · {item.statuses.length} update{item.statuses.length > 1 ? 's' : ''}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyStatusContainer}>
                    <View style={[styles.emptyStatusIcon, { backgroundColor: '#FFD60015' }]}>
                      <Ionicons name="image-outline" size={48} color="#FFD600" />
                </View>
                <Text style={[styles.emptyStatusTitle, { color: C.text }]}>No status updates yet</Text>
                <Text style={[styles.emptyStatusSubtitle, { color: C.textMuted }]}>
                  When your contacts post status updates, they'll appear here
                </Text>
              </View>
            }
          />
        </View>
      </ScrollView>

      {/* Status Viewer Modal */}
      <Modal visible={showStatusViewer} transparent animationType="fade">
        <View style={styles.statusViewerOverlay}>
          {/* Status Progress Bar */}
          <View style={styles.statusProgressContainer}>
            {viewingStatuses.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.statusProgressBar,
                  { backgroundColor: index <= viewingStatusIndex ? '#fff' : 'rgba(255,255,255,0.3)' }
                ]}
              />
            ))}
          </View>

          {/* Header */}
          <View style={styles.statusViewerHeader}>
            <View style={styles.statusViewerUserInfo}>
              {viewingStatuses[viewingStatusIndex]?.user?.profilePicture ? (
                <Image
                  source={{ uri: viewingStatuses[viewingStatusIndex].user.profilePicture }}
                  style={styles.statusViewerAvatar}
                />
              ) : (
                <View style={[styles.statusViewerAvatarPlaceholder, { backgroundColor: C.primary }]}>
                  <Ionicons name="person" size={16} color="#fff" />
                </View>
              )}
              <View>
                <Text style={styles.statusViewerTitle}>
                  {viewingStatuses[viewingStatusIndex]?.user?.username || 'Status'}
                </Text>
                <Text style={styles.statusViewerTime}>
                  {getTimeAgo(viewingStatuses[viewingStatusIndex]?.createdAt)}
                </Text>
              </View>
            </View>
            <View style={styles.statusViewerActions}>
              {/* Show viewers count for own status */}
              {viewingStatuses[viewingStatusIndex]?.user?._id === user._id && (
                <TouchableOpacity
                  style={styles.statusViewerActionBtn}
                  onPress={() => {
                    const status = viewingStatuses[viewingStatusIndex];
                    Alert.alert(
                      'Status Viewers',
                      `${status.views?.length || 0} people viewed this status`,
                      [{ text: 'OK' }]
                    );
                  }}
                >
                  <Ionicons name="eye-outline" size={22} color="#fff" />
                  <Text style={styles.statusViewerActionText}>
                    {viewingStatuses[viewingStatusIndex]?.views?.length || 0}
                  </Text>
                </TouchableOpacity>
              )}
              {/* Delete button for own status */}
              {viewingStatuses[viewingStatusIndex]?.user?._id === user._id && (
                <TouchableOpacity
                  style={styles.statusViewerActionBtn}
                  onPress={() => {
                    Alert.alert('Delete Status', 'Are you sure?', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => {
                        deleteSingleStatus(viewingStatuses[viewingStatusIndex]._id);
                      }},
                    ]);
                  }}
                >
                  <Ionicons name="trash-outline" size={22} color="#FF6B6B" />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => setShowStatusViewer(false)}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Status Content */}
          <View style={styles.statusViewerContent}>
            {viewingStatuses[viewingStatusIndex]?.mediaType === 'text' ? (
              <View style={[styles.textStatusContent, { backgroundColor: viewingStatuses[viewingStatusIndex]?.backgroundColor || '#E53935' }]}>
                <Text style={styles.textStatus}>{viewingStatuses[viewingStatusIndex]?.content}</Text>
              </View>
            ) : viewingStatuses[viewingStatusIndex]?.mediaType === 'image' ? (
              <Image
                source={{ uri: viewingStatuses[viewingStatusIndex]?.mediaUrl }}
                style={styles.statusImage}
                resizeMode="contain"
              />
            ) : (
              <Text style={styles.statusMediaType}>Video</Text>
            )}
          </View>

          {/* Navigation */}
          <View style={styles.statusViewerNav}>
            <TouchableOpacity
              style={styles.statusNavBtn}
              onPress={() => {
                if (viewingStatusIndex > 0) {
                  setViewingStatusIndex(viewingStatusIndex - 1);
                  viewStatusItem(viewingStatuses[viewingStatusIndex - 1]);
                }
              }}
              disabled={viewingStatusIndex === 0}
            >
              <Ionicons name="chevron-back" size={32} color={viewingStatusIndex === 0 ? '#666' : '#fff'} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.statusNavBtn}
              onPress={() => {
                if (viewingStatusIndex < viewingStatuses.length - 1) {
                  setViewingStatusIndex(viewingStatusIndex + 1);
                  viewStatusItem(viewingStatuses[viewingStatusIndex + 1]);
                } else {
                  setShowStatusViewer(false);
                }
              }}
            >
              <Ionicons name="chevron-forward" size={32} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Create Status Modal */}
      <Modal visible={showCreateStatus} transparent animationType="slide">
        <View style={styles.createStatusOverlay}>
          <View style={[styles.createStatusSheet, { backgroundColor: C.surface }]}>
            {uploading ? (
              // Upload Progress View
              <View style={styles.uploadProgressContainer}>
                <View style={styles.uploadProgressCircle}>
                  <View style={[styles.uploadProgressRing, { borderColor: C.primary }]}>
                    <Text style={[styles.uploadProgressText, { color: C.primary }]}>{uploadProgress}%</Text>
                  </View>
                </View>
                <Text style={[styles.uploadProgressTitle, { color: C.text }]}>Uploading Status...</Text>
                <View style={[styles.uploadProgressBar, { backgroundColor: C.border }]}>
                  <View style={[styles.uploadProgressFill, { width: `${uploadProgress}%`, backgroundColor: C.primary }]} />
                </View>
                <Text style={[styles.uploadProgressSubtitle, { color: C.textMuted }]}>
                  {uploadProgress < 100 ? 'Please wait...' : 'Upload complete!'}
                </Text>
              </View>
            ) : (
              // Create Status Form
              <>
                <Text style={[styles.createStatusTitle, { color: C.text }]}>Create Status</Text>
                <View style={[styles.colorPicker, { backgroundColor: C.card }]}>
                  {['#E53935', '#1565C0', '#2E7D32', '#7B1FA2', '#FF9800', '#000000'].map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[styles.colorOption, { backgroundColor: color, borderColor: statusBgColor === color ? '#fff' : 'transparent' }]}
                      onPress={() => setStatusBgColor(color)}
                    />
                  ))}
                </View>
                <TextInput
                  style={[styles.statusInput, { backgroundColor: C.inputBg, color: C.text, borderColor: C.border }]}
                  placeholder="What's on your mind?"
                  placeholderTextColor={C.textMuted}
                  value={statusText}
                  onChangeText={setStatusText}
                  multiline
                />
                <View style={styles.createStatusActions}>
                  <TouchableOpacity style={[styles.createStatusBtn, { backgroundColor: C.primary }]} onPress={createTextStatus}>
                    <Text style={styles.createStatusBtnText}>Post Text</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.createStatusBtn, { backgroundColor: '#9C27B0' }]} onPress={createImageStatus}>
                    <Ionicons name="image" size={20} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.createStatusBtn, { backgroundColor: '#FF9800' }]} onPress={createVideoStatus}>
                    <Ionicons name="videocam" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => setShowCreateStatus(false)}>
                  <Text style={[styles.cancelCreate, { color: C.textMuted }]}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
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
  // Status styles - WhatsApp-like design
  myStatusSection: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: 16, borderBottomWidth: 1,
  },
  myStatusAvatarContainer: { position: 'relative', width: 56, height: 56 },
  myStatusAvatarRing: {
    width: 56, height: 56, borderRadius: 28, borderWidth: 2.5,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  myStatusAvatarImg: { width: 50, height: 50, borderRadius: 25 },
  myStatusAvatarPlaceholder: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  addStatusIcon: {
    position: 'absolute', bottom: -2, right: -2,
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#000',
  },
  myStatusInfo: { flex: 1, marginLeft: 14 },
  myStatusTitle: { fontSize: 16, fontWeight: '600' },
  myStatusSubtitle: { fontSize: 13, marginTop: 3, opacity: 0.6 },
  statusCountBadge: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  statusCountText: { color: '#fff', fontSize: 12, fontWeight: '700' },
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
  // Status Viewer Modal
  statusViewerOverlay: { flex: 1, backgroundColor: '#000' },
  statusProgressContainer: {
    flexDirection: 'row', paddingHorizontal: 12, paddingTop: 50, gap: 4,
  },
  statusProgressBar: { flex: 1, height: 3, borderRadius: 2 },
  statusViewerHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10,
  },
  statusViewerUserInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusViewerAvatar: { width: 40, height: 40, borderRadius: 20 },
  statusViewerAvatarPlaceholder: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  statusViewerTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  statusViewerTime: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  statusViewerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusViewerActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusViewerActionText: { color: '#fff', fontSize: 14 },
  statusViewerContent: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  textStatusContent: {
    width: '90%', height: '60%', borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  textStatus: { color: '#fff', fontSize: 24, fontWeight: '700', textAlign: 'center' },
  statusImage: { width: '100%', height: '100%' },
  statusMediaType: { color: '#fff', fontSize: 18 },
  statusViewerNav: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 32, paddingBottom: 40,
  },
  statusNavBtn: { padding: 10 },
  // Create Status Modal
  createStatusOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  createStatusSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  createStatusTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 16 },
  colorPicker: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 16, padding: 12, borderRadius: 12 },
  colorOption: { width: 36, height: 36, borderRadius: 18, borderWidth: 3 },
  statusInput: {
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 16, marginBottom: 16, borderWidth: 1, minHeight: 80,
  },
  createStatusActions: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  createStatusBtn: {
    flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center',
  },
  createStatusBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  cancelCreate: { textAlign: 'center', paddingVertical: 12, fontSize: 15 },
  // Upload Progress
  uploadProgressContainer: { alignItems: 'center', paddingVertical: 30 },
  uploadProgressCircle: { marginBottom: 20 },
  uploadProgressRing: {
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 4, alignItems: 'center', justifyContent: 'center',
  },
  uploadProgressText: { fontSize: 24, fontWeight: '700' },
  uploadProgressTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
  uploadProgressBar: {
    width: '80%', height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 12,
  },
  uploadProgressFill: {
    height: '100%', borderRadius: 3,
  },
  uploadProgressSubtitle: { fontSize: 14 },
});

export default HomeScreen;
