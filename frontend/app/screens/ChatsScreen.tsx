import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { getAcceptedChats, getPendingRequests, respondChatRequest } from '../services/api';
import { COLORS } from '../utils/constants';

export default function ChatsScreen() {
  const { user } = useAuth();
  const { onlineUsers } = useSocket();
  const navigation = useNavigation<any>();
  const [chats, setChats] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    if (!user?._id) return;
    try {
      const [chatsRes, reqRes] = await Promise.all([
        getAcceptedChats(user._id),
        getPendingRequests(user._id),
      ]);
      setChats(chatsRes.data.chats);
      setPendingRequests(reqRes.data.requests);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const getOtherUser = (chat: any) =>
    chat.senderId._id === user?._id ? chat.receiverId : chat.senderId;

  const handleRespond = async (requestId: string, status: 'accepted' | 'rejected') => {
    await respondChatRequest(requestId, status);
    load();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {pendingRequests.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chat Requests</Text>
          {pendingRequests.map((req) => (
            <View key={req._id} style={styles.requestCard}>
              <Image
                source={{ uri: req.senderId.profileImage || 'https://i.pravatar.cc/100' }}
                style={styles.avatar}
              />
              <Text style={styles.requestName}>{req.senderId.name}</Text>
              <TouchableOpacity
                style={styles.acceptBtn}
                onPress={() => handleRespond(req._id, 'accepted')}>
                <Text style={styles.btnText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rejectBtn}
                onPress={() => handleRespond(req._id, 'rejected')}>
                <Text style={styles.btnText}>Reject</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <FlatList
        data={chats}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No chats yet. Find people to chat with! 👥</Text>
          </View>
        }
        renderItem={({ item }) => {
          const other = getOtherUser(item);
          const isOnline = onlineUsers[other._id] ?? other.isOnline;
          return (
            <TouchableOpacity
              style={styles.chatItem}
              onPress={() => navigation.navigate('Chat', { otherUser: other })}>
              <View style={styles.avatarWrapper}>
                <Image
                  source={{ uri: other.profileImage || 'https://i.pravatar.cc/100' }}
                  style={styles.avatar}
                />
                <View style={[styles.statusDot, { backgroundColor: isOnline ? COLORS.online : COLORS.offline }]} />
              </View>
              <View style={styles.chatInfo}>
                <Text style={styles.chatName}>{other.name}</Text>
                <Text style={styles.chatStatus}>{isOnline ? 'Online' : 'Offline'}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { color: '#555', textAlign: 'center', fontSize: 15, lineHeight: 24 },
  section: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#222' },
  sectionTitle: { color: COLORS.primary, fontWeight: '700', fontSize: 13, marginBottom: 8, letterSpacing: 1 },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    gap: 8,
  },
  requestName: { flex: 1, color: COLORS.white, fontWeight: '600' },
  acceptBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  rejectBtn: { backgroundColor: '#333', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  btnText: { color: COLORS.white, fontSize: 12, fontWeight: '700' },
  chatItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#111' },
  avatarWrapper: { position: 'relative', marginRight: 14 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#222' },
  statusDot: { position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: COLORS.black },
  chatInfo: { flex: 1 },
  chatName: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  chatStatus: { color: '#666', fontSize: 13, marginTop: 2 },
});
