import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Image,
  ActivityIndicator, StatusBar, Alert, Modal, TextInput, Dimensions,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { statusAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Spacing, BorderRadius } from '../theme';

const { width, height } = Dimensions.get('window');

const StatusScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { colors: C } = useTheme();
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [statusImage, setStatusImage] = useState(null);
  const [posting, setPosting] = useState(false);
  const [viewingStatus, setViewingStatus] = useState(null);

  useEffect(() => {
    fetchStatuses();
  }, []);

  const fetchStatuses = async () => {
    setLoading(true);
    try {
      const result = await statusAPI.getAll();
      const allStatuses = [
        // Include own statuses from ownStatuses field
        ...(result.ownStatuses || []).map((s) => ({ ...s, user: { _id: user._id, username: user.username, profilePicture: user.profilePicture } })),
        // Include other users' statuses from the grouped statuses array
        ...(result.statuses || []).flatMap((group) => group.statuses || []),
      ];
      setStatuses(allStatuses);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo access in settings');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    });
    if (!result.canceled) {
      setStatusImage(result.assets[0].uri);
    }
  };

  const postStatus = async () => {
    if (!statusText.trim() && !statusImage) {
      Alert.alert('Error', 'Add text or image to your status');
      return;
    }
    setPosting(true);
    try {
      const formData = new FormData();
      formData.append('content', statusText.trim());
      if (statusImage) {
        const filename = statusImage.split('/').pop();
        const ext = filename.split('.').pop().toLowerCase();
        const type = ext === 'png' ? 'image/png' : 'image/jpeg';
        formData.append('media', { uri: statusImage, name: filename, type });
      }
      await statusAPI.create(formData);
      setShowCreate(false);
      setStatusText('');
      setStatusImage(null);
      fetchStatuses();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setPosting(false);
    }
  };

  const viewStatus = async (status) => {
    setViewingStatus(status);
    try {
      await statusAPI.view(status._id);
    } catch (err) {}
  };

  const deleteStatus = async (statusId) => {
    Alert.alert('Delete Status', 'Remove this status?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await statusAPI.delete(statusId);
            setStatuses((prev) => prev.filter((s) => s._id !== statusId));
            setViewingStatus(null);
          } catch (err) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  const getTimeRemaining = (expiresAt) => {
    const diff = new Date(expiresAt) - new Date();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m left`;
  };

  // Group statuses by user
  const groupedStatuses = statuses.reduce((acc, status) => {
    const userId = status.user._id;
    if (!acc[userId]) {
      acc[userId] = { user: status.user, statuses: [], hasUnviewed: false };
    }
    acc[userId].statuses.push(status);
    if (!status.viewedBy?.includes(user._id)) {
      acc[userId].hasUnviewed = true;
    }
    return acc;
  }, {});

  const groupedArray = Object.values(groupedStatuses);

  // Separate own status and others
  const myStatus = groupedArray.find((g) => g.user._id === user._id);
  const otherStatuses = groupedArray.filter((g) => g.user._id !== user._id);

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={C.background} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: C.text }]}>Status</Text>
        <TouchableOpacity onPress={() => setShowCreate(true)}>
          <Ionicons name="camera" size={24} color={C.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} size="large" color={C.primary} />
      ) : (
        <FlatList
          data={otherStatuses}
          keyExtractor={(item) => item.user._id}
          ListHeaderComponent={
            <>
              {/* My Status */}
              <TouchableOpacity
                style={[styles.statusRow, { borderBottomColor: C.border }]}
                onPress={() => myStatus ? viewStatus(myStatus.statuses[0]) : setShowCreate(true)}
              >
                <View style={styles.myStatusAvatar}>
                  {user.profilePicture ? (
                    <Image source={{ uri: user.profilePicture }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: C.primary }]}>
                      <Ionicons name="person" size={24} color="#fff" />
                    </View>
                  )}
                  <View style={[styles.addIcon, { backgroundColor: C.primary }]}>
                    <Ionicons name="add" size={14} color="#fff" />
                  </View>
                </View>
                <View style={styles.statusInfo}>
                  <Text style={[styles.statusName, { color: C.text }]}>My Status</Text>
                  <Text style={[styles.statusTime, { color: C.textMuted }]}>
                    {myStatus ? `${myStatus.statuses.length} status(es)` : 'Tap to add status'}
                  </Text>
                </View>
              </TouchableOpacity>

              {otherStatuses.length > 0 && (
                <Text style={[styles.sectionTitle, { color: C.textMuted }]}>Recent Updates</Text>
              )}
            </>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.statusRow, { borderBottomColor: C.border }]}
              onPress={() => viewStatus(item.statuses[0])}
            >
              <View style={[
                styles.avatarRing,
                { borderColor: item.hasUnviewed ? C.primary : C.border }
              ]}>
                {item.user.profilePicture ? (
                  <Image source={{ uri: item.user.profilePicture }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatarPlaceholder, { backgroundColor: C.primary }]}>
                    <Ionicons name="person" size={24} color="#fff" />
                  </View>
                )}
              </View>
              <View style={styles.statusInfo}>
                <Text style={[styles.statusName, { color: C.text }]}>{item.user.username}</Text>
                <Text style={[styles.statusTime, { color: C.textMuted }]}>
                  {getTimeRemaining(item.statuses[0].expiresAt)}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="ellipse-outline" size={60} color={C.border} />
              <Text style={[styles.emptyTitle, { color: C.textMuted }]}>No status updates</Text>
              <Text style={[styles.emptySubtitle, { color: C.textMuted }]}>
                Be the first to share a status!
              </Text>
            </View>
          }
        />
      )}

      {/* Create Status FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: C.primary }]}
        onPress={() => setShowCreate(true)}
      >
        <Ionicons name="camera" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Create Status Modal */}
      <Modal visible={showCreate} transparent animationType="slide">
        <View style={styles.createOverlay}>
          <View style={[styles.createSheet, { backgroundColor: C.surface }]}>
            <View style={[styles.createHeader, { borderBottomColor: C.border }]}>
              <TouchableOpacity onPress={() => { setShowCreate(false); setStatusText(''); setStatusImage(null); }}>
                <Ionicons name="close" size={24} color={C.text} />
              </TouchableOpacity>
              <Text style={[styles.createTitle, { color: C.text }]}>New Status</Text>
              <TouchableOpacity onPress={postStatus} disabled={posting}>
                {posting ? (
                  <ActivityIndicator size="small" color={C.primary} />
                ) : (
                  <Text style={[styles.postBtn, { color: C.primary }]}>Post</Text>
                )}
              </TouchableOpacity>
            </View>

            {statusImage ? (
              <View style={styles.imagePreview}>
                <Image source={{ uri: statusImage }} style={styles.previewImage} />
                <TouchableOpacity
                  style={styles.removeImage}
                  onPress={() => setStatusImage(null)}
                >
                  <Ionicons name="close-circle" size={28} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.pickImageBtn} onPress={pickImage}>
                <Ionicons name="image" size={40} color={C.primary} />
                <Text style={[styles.pickImageText, { color: C.textMuted }]}>Add Photo</Text>
              </TouchableOpacity>
            )}

            <TextInput
              style={[styles.statusInput, { color: C.text, borderColor: C.border }]}
              placeholder="What's on your mind?"
              placeholderTextColor={C.textMuted}
              value={statusText}
              onChangeText={setStatusText}
              multiline
              textAlignVertical="top"
            />

            <Text style={[styles.expiryText, { color: C.textMuted }]}>
              Status will be automatically deleted after 24 hours
            </Text>
          </View>
        </View>
      </Modal>

      {/* View Status Modal */}
      <Modal visible={!!viewingStatus} transparent animationType="fade">
        <View style={styles.viewOverlay}>
          {viewingStatus && (
            <>
              <TouchableOpacity style={styles.viewClose} onPress={() => setViewingStatus(null)}>
                <Ionicons name="close" size={30} color="#fff" />
              </TouchableOpacity>

              {/* Header */}
              <View style={styles.viewHeader}>
                <View style={styles.viewUserInfo}>
                  {viewingStatus.user.profilePicture ? (
                    <Image source={{ uri: viewingStatus.user.profilePicture }} style={styles.viewAvatar} />
                  ) : (
                    <View style={[styles.viewAvatarPlaceholder, { backgroundColor: C.primary }]}>
                      <Ionicons name="person" size={16} color="#fff" />
                    </View>
                  )}
                  <View>
                    <Text style={styles.viewUsername}>{viewingStatus.user.username}</Text>
                    <Text style={styles.viewTime}>{getTimeRemaining(viewingStatus.expiresAt)}</Text>
                  </View>
                </View>
                {viewingStatus.user._id === user._id && (
                  <TouchableOpacity onPress={() => deleteStatus(viewingStatus._id)}>
                    <Ionicons name="trash" size={24} color="#FF1744" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Content */}
              <View style={[styles.viewContent, { backgroundColor: viewingStatus.backgroundColor || '#1a1a2e' }]}>
                {viewingStatus.mediaType === 'video' && viewingStatus.mediaUrl ? (
                  <Video
                    source={{ uri: viewingStatus.mediaUrl }}
                    style={styles.viewVideo}
                    resizeMode={ResizeMode.CONTAIN}
                    shouldPlay
                    isLooping
                    useNativeControls
                  />
                ) : viewingStatus.mediaUrl ? (
                  <Image source={{ uri: viewingStatus.mediaUrl }} style={styles.viewImage} resizeMode="contain" />
                ) : null}
                {viewingStatus.content ? (
                  <Text style={[styles.viewText, (viewingStatus.mediaUrl) && styles.viewTextOverMedia]}>
                    {viewingStatus.content}
                  </Text>
                ) : null}
              </View>

              {/* Viewed by */}
              <View style={styles.viewedByContainer}>
                <Ionicons name="eye" size={16} color="#9E9E9E" />
                <Text style={styles.viewedByText}>
                  Viewed by {viewingStatus.viewedBy?.length || 0}
                </Text>
              </View>
            </>
          )}
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
  headerTitle: { fontSize: 24, fontWeight: '900' },
  statusRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: 14,
    borderBottomWidth: 1,
  },
  myStatusAvatar: { position: 'relative' },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  avatarPlaceholder: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  addIcon: {
    position: 'absolute', bottom: 0, right: 0,
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#1A1A1A',
  },
  avatarRing: { width: 60, height: 60, borderRadius: 30, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  statusInfo: { flex: 1, marginLeft: 14 },
  statusName: { fontSize: 16, fontWeight: '600' },
  statusTime: { fontSize: 13, marginTop: 2 },
  sectionTitle: { fontSize: 13, fontWeight: '600', letterSpacing: 0.5, paddingHorizontal: Spacing.lg, paddingTop: 20, paddingBottom: 8 },
  emptyContainer: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 16 },
  emptySubtitle: { fontSize: 13, marginTop: 8 },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 60, height: 60, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center',
    elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 4,
  },
  createOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  createSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: height * 0.8 },
  createHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: 14, borderBottomWidth: 1,
  },
  createTitle: { fontSize: 18, fontWeight: '700' },
  postBtn: { fontSize: 16, fontWeight: '700' },
  imagePreview: { height: 250, margin: Spacing.lg, borderRadius: 12, overflow: 'hidden' },
  previewImage: { width: '100%', height: '100%' },
  removeImage: { position: 'absolute', top: 8, right: 8 },
  pickImageBtn: {
    height: 120, margin: Spacing.lg, borderRadius: 12,
    borderWidth: 2, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
  pickImageText: { fontSize: 14, marginTop: 8 },
  statusInput: {
    marginHorizontal: Spacing.lg, marginTop: 8,
    padding: Spacing.md, fontSize: 16, minHeight: 100,
    borderWidth: 1, borderRadius: 12,
  },
  expiryText: { fontSize: 12, textAlign: 'center', marginTop: 12, marginBottom: 24 },
  viewOverlay: { flex: 1, backgroundColor: '#000' },
  viewClose: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 8 },
  viewHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 50,
  },
  viewUserInfo: { flexDirection: 'row', alignItems: 'center' },
  viewAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  viewAvatarPlaceholder: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  viewUsername: { color: '#fff', fontSize: 16, fontWeight: '700' },
  viewTime: { color: '#9E9E9E', fontSize: 12 },
  viewContent: { flex: 1, margin: 20, borderRadius: 12, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  viewImage: { width: '100%', height: '100%' },
  viewVideo: { width: '100%', height: '80%' },
  viewText: { color: '#fff', fontSize: 22, fontWeight: '600', textAlign: 'center', padding: 20 },
  viewTextOverMedia: { position: 'absolute', bottom: 20, left: 0, right: 0, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  viewedByContainer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, paddingBottom: 30,
  },
  viewedByText: { color: '#9E9E9E', fontSize: 13, marginLeft: 6 },
});

export default StatusScreen;
