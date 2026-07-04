import AsyncStorage from '@react-native-async-storage/async-storage';

const CHATS_KEY = 'chatzz_chats_cache';
const MESSAGES_KEY = 'chatzz_messages_cache';
const USERS_KEY = 'chatzz_users_cache';

export const chatCache = {
  // Save chats to cache
  saveChats: async (chats) => {
    try {
      await AsyncStorage.setItem(CHATS_KEY, JSON.stringify(chats));
    } catch (err) {
      console.warn('Cache save error:', err.message);
    }
  },

  // Load chats from cache
  loadChats: async () => {
    try {
      const cached = await AsyncStorage.getItem(CHATS_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch (err) {
      console.warn('Cache load error:', err.message);
      return null;
    }
  },

  // Save messages for a chat
  saveMessages: async (chatId, messages) => {
    try {
      const allMessages = await AsyncStorage.getItem(MESSAGES_KEY);
      const parsed = allMessages ? JSON.parse(allMessages) : {};
      parsed[chatId] = messages;
      await AsyncStorage.setItem(MESSAGES_KEY, JSON.stringify(parsed));
    } catch (err) {
      console.warn('Messages cache save error:', err.message);
    }
  },

  // Load messages for a chat
  loadMessages: async (chatId) => {
    try {
      const allMessages = await AsyncStorage.getItem(MESSAGES_KEY);
      const parsed = allMessages ? JSON.parse(allMessages) : {};
      return parsed[chatId] || null;
    } catch (err) {
      console.warn('Messages cache load error:', err.message);
      return null;
    }
  },

  // Save users list
  saveUsers: async (users) => {
    try {
      await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
    } catch (err) {
      console.warn('Users cache save error:', err.message);
    }
  },

  // Load users list
  loadUsers: async () => {
    try {
      const cached = await AsyncStorage.getItem(USERS_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch (err) {
      console.warn('Users cache load error:', err.message);
      return null;
    }
  },

  // Clear all cache
  clearAll: async () => {
    try {
      await AsyncStorage.multiRemove([CHATS_KEY, MESSAGES_KEY, USERS_KEY]);
    } catch (err) {
      console.warn('Cache clear error:', err.message);
    }
  },
};
