import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// ⚠️ Change this to your backend URL
export const BASE_URL = 'http://YOUR_SERVER_IP:5000';
export const API_URL = `${BASE_URL}/api`;

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

// Request interceptor – attach JWT
api.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('chatzz_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.message || error.message || 'Network Error';
    return Promise.reject(new Error(message));
  }
);

// ─── Auth ───────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (formData) =>
    api.post('/auth/register', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  checkDevice: (deviceId) => api.post('/auth/check-device', { deviceId }),
  updateFcmToken: (fcmToken) => api.put('/auth/fcm-token', { fcmToken }),
};

// ─── Users ──────────────────────────────────────────────────────────────────
export const userAPI = {
  getAll: (search = '') => api.get(`/users?search=${search}`),
  getProfile: (id) => api.get(`/users/${id}`),
  updateProfile: (formData) =>
    api.put('/users/profile', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  sendRequest: (userId) => api.post(`/users/${userId}/request`),
  respondRequest: (userId, action) => api.put(`/users/request/${userId}/respond`, { action }),
  blockUser: (userId) => api.post(`/users/${userId}/block`),
  unblockUser: (userId) => api.delete(`/users/${userId}/block`),
  getRequests: () => api.get('/users/requests'),
};

// ─── Chats ──────────────────────────────────────────────────────────────────
export const chatAPI = {
  getAll: () => api.get('/chats'),
  getOrCreate: (participantId) => api.post('/chats', { participantId }),
  delete: (chatId) => api.delete(`/chats/${chatId}`),
};

// ─── Messages ───────────────────────────────────────────────────────────────
export const messageAPI = {
  getMessages: (chatId, page = 1) => api.get(`/messages/${chatId}?page=${page}&limit=50`),
  send: (formData) =>
    api.post('/messages', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  markSeen: (chatId) => api.put(`/messages/${chatId}/seen`),
  delete: (messageId, deleteForEveryone) =>
    api.delete(`/messages/${messageId}`, { data: { deleteForEveryone } }),
};

export default api;
