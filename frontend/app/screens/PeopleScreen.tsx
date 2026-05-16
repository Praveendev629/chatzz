import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { fetchAllUsers, sendChatRequest } from '../services/api';
import { COLORS } from '../utils/constants';

export default function PeopleScreen() {
  const { user } = useAuth();
  const { onlineUsers, socket } = useSocket();
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadUsers();
  }, [search]);

  const loadUsers = async () => {
    if (!user?._id) return;
    setLoading(true);
    try {
      const res = await fetchAllUsers({ search, exclude: user._id });
      setUsers(res.data.users);
      setTotal(res.data.total);
    } catch {}
    setLoading(false);
  };

  const handleSendRequest = async (targetId: string, targetName: string) => {
    if (!user?._id) return;
    try {
      const res = await sendChatRequest(user._id, targetId);
      setSent((prev) => new Set([...prev, targetId]));
      socket?.emit('chat_request', { request: res.data.request, receiverId: targetId });
      Alert.alert('✅ Request Sent', `Request sent to ${targetName}`);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Could not send request');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.totalText}>👥 {total} members enrolled</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search people..."
          placeholderTextColor="#555"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item._id}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No users found</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isOnline = onlineUsers[item._id] ?? item.isOnline;
            const alreadySent = sent.has(item._id);
            return (
              <View style={styles.userCard}>
                <View style={styles.avatarWrapper}>
                  <Image
                    source={{ uri: item.profileImage || 'https://i.pravatar.cc/100' }}
                    style={styles.avatar}
                  />
                  <View style={[styles.statusDot, { backgroundColor: isOnline ? COLORS.online : COLORS.offline }]} />
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{item.name}</Text>
                  <Text style={[styles.userStatus, { color: isOnline ? COLORS.online : '#555' }]}>
                    {isOnline ? '● Online' : '○ Offline'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.requestBtn, alreadySent && styles.requestBtnSent]}
                  onPress={() => handleSendRequest(item._id, item.name)}
                  disabled={alreadySent}>
                  <Text style={styles.requestBtnText}>
                    {alreadySent ? 'Sent ✓' : 'Chat'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black },
  header: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  totalText: { color: COLORS.primary, fontWeight: '700', fontSize: 13, letterSpacing: 0.5 },
  searchContainer: { padding: 12 },
  searchInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 12,
    color: COLORS.white,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#555' },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#111',
  },
  avatarWrapper: { position: 'relative', marginRight: 12 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#222' },
  statusDot: { position: 'absolute', bottom: 1, right: 1, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: COLORS.black },
  userInfo: { flex: 1 },
  userName: { color: COLORS.white, fontSize: 15, fontWeight: '600' },
  userStatus: { fontSize: 12, marginTop: 2 },
  requestBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  requestBtnSent: { backgroundColor: '#333' },
  requestBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 13 },
});
