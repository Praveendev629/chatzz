import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

const api = axios.create({ baseURL: API_BASE_URL });

export const registerUser = (formData: FormData) =>
  api.post('/auth/register', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const getUser = (id: string) => api.get(`/auth/user/${id}`);

export const updateUser = (id: string, formData: FormData) =>
  api.put(`/auth/user/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const fetchAllUsers = (params?: { search?: string; exclude?: string }) =>
  api.get('/users', { params });

export const getMessages = (userId: string, otherId: string) =>
  api.get(`/messages/${userId}/${otherId}`);

export const deleteMessageEveryone = (messageId: string) =>
  api.put(`/messages/delete-everyone/${messageId}`);

export const deleteMessageForMe = (messageId: string, userId: string) =>
  api.put(`/messages/delete-me/${messageId}`, { userId });

export const uploadFile = (formData: FormData) =>
  api.post('/messages/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const sendChatRequest = (senderId: string, receiverId: string) =>
  api.post('/chat-requests/send', { senderId, receiverId });

export const respondChatRequest = (requestId: string, status: 'accepted' | 'rejected') =>
  api.put(`/chat-requests/respond/${requestId}`, { status });

export const getPendingRequests = (userId: string) =>
  api.get(`/chat-requests/pending/${userId}`);

export const getAcceptedChats = (userId: string) =>
  api.get(`/chat-requests/accepted/${userId}`);
