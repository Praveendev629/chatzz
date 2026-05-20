import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, ActivityIndicator, StatusBar, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import debounce from '../utils/debounce';
import { userAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import UserListItem from '../components/UserListItem';
import { Colors, Spacing, BorderRadius } from '../theme';

const SearchScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sentRequests, setSentRequests] = useState(new Set());

  useEffect(() => {
    fetchUsers('');
  }, []);

  const fetchUsers = async (searchQuery) => {
    setLoading(true);
    try {
      const result = await userAPI.getAll(searchQuery);
      setUsers(result.users || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const debouncedSearch = useCallback(
    debounce((q) => fetchUsers(q), 400),
    []
  );

  const handleQueryChange = (text) => {
    setQuery(text);
    debouncedSearch(text);
  };

  const handleSendRequest = async (targetUser) => {
    if (sentRequests.has(targetUser._id)) return;
    try {
      await userAPI.sendRequest(targetUser._id);
      setSentRequests((prev) => new Set([...prev, targetUser._id]));
      Alert.alert('Request Sent', `Chat request sent to ${targetUser.username}`);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Find People</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={Colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by username..."
          placeholderTextColor={Colors.textMuted}
          value={query}
          onChangeText={handleQueryChange}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(''); fetchUsers(''); }}>
            <Ionicons name="close-circle" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={Colors.primary} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <UserListItem
              user={item}
              onPress={() => handleSendRequest(item)}
              requestSent={sentRequests.has(item._id)}
            />
          )}
          contentContainerStyle={{ paddingTop: Spacing.sm }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={70} color={Colors.border} />
              <Text style={styles.emptyTitle}>
                {query ? 'No users found' : 'No users available'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {query ? `Try a different search term` : 'Be the first to invite friends!'}
              </Text>
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
    paddingHorizontal: Spacing.lg, paddingTop: 56, paddingBottom: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 26, fontWeight: '900', color: Colors.text },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.inputBg, borderRadius: BorderRadius.md,
    margin: Spacing.lg, paddingHorizontal: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 14, color: Colors.text, fontSize: 15 },
  emptyContainer: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textMuted, marginTop: 16 },
  emptySubtitle: { fontSize: 13, color: Colors.textMuted, marginTop: 8 },
});

export default SearchScreen;
