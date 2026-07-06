import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// ⚠️ Change this to your backend URL
export const BASE_URL = 'https://chatzz-1.onrender.com';
export const API_URL = `${BASE_URL}/api`;

const api = axios.create({
  baseURL: API_URL,
  timeout: 20000,
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

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (formData) => api.post('/auth/register', formData),
  checkDevice: (deviceId) => api.post('/auth/check-device', { deviceId }),
  updateFcmToken: (fcmToken) => api.put('/auth/fcm-token', { fcmToken }),
};

// ─── Users ───────────────────────────────────────────────────────────────────
export const userAPI = {
  getAll: (search = '') => api.get(`/users?search=${search}`),
  getProfile: (id) => api.get(`/users/${id}`),
  updateProfile: (formData) => api.put('/users/profile', formData),
  sendRequest: (userId) => api.post(`/users/${userId}/request`),
  respondRequest: (userId, action) => api.put(`/users/request/${userId}/respond`, { action }),
  blockUser: (userId) => api.post(`/users/${userId}/block`),
  unblockUser: (userId) => api.delete(`/users/${userId}/block`),
  getRequests: () => api.get('/users/requests'),
  deleteAccount: () => api.delete('/users/account'),
  deleteCloudinary: (url) => api.post('/users/delete-cloudinary', { url }),
  // Admin endpoints (password protected on frontend, called with admin key)
  adminGetAllUsers: (password) => api.post('/users/admin/list', { password }),
  adminDeleteUser: (userId, password) => api.delete(`/users/admin/${userId}`, { data: { password } }),
};

// ─── Chats ───────────────────────────────────────────────────────────────────
export const chatAPI = {
  getAll: () => api.get('/chats'),
  getOrCreate: (participantId) => api.post('/chats', { participantId }),
  delete: (chatId) => api.delete(`/chats/${chatId}`),
};

// ─── Messages ────────────────────────────────────────────────────────────────
export const messageAPI = {
  getMessages: (chatId, page = 1) => api.get(`/messages/${chatId}?page=${page}&limit=50`),
  send: (formData) => api.post('/messages', formData),
  quickReply: (chatId, receiverId, content) =>
    api.post('/messages/reply', { chatId, receiverId, content }),
  markSeen: (chatId) => api.put(`/messages/${chatId}/seen`),
  delete: (messageId, deleteForEveryone) =>
    api.delete(`/messages/${messageId}`, { data: { deleteForEveryone } }),
};

// ─── Status ──────────────────────────────────────────────────────────────────
export const statusAPI = {
  getAll: () => api.get('/status'),
  getUserStatuses: (userId) => api.get(`/status/user/${userId}`),
  create: (formData) => api.post('/status', formData),
  view: (statusId) => api.post(`/status/${statusId}/view`),
  delete: (statusId) => api.delete(`/status/${statusId}`),
};

export default api;
