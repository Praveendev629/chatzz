import { io } from 'socket.io-client';
import { BASE_URL } from './api';

let socket = null;

export const initSocket = (token) => {
  if (socket?.connected) return socket;

  socket = io(BASE_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 20000,
  });

  socket.on('connect', () => console.log('🔌 Socket connected:', socket.id));
  socket.on('disconnect', (reason) => console.log('❌ Socket disconnected:', reason));
  socket.on('connect_error', (err) => console.error('Socket error:', err.message));

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const emitSendMessage = (data) => socket?.emit('send_message', data);
export const emitTyping = (data) => socket?.emit('typing', data);
export const emitStopTyping = (data) => socket?.emit('stop_typing', data);
export const emitMarkSeen = (data) => socket?.emit('mark_seen', data);
export const emitDeleteMessage = (data) => socket?.emit('delete_message', data);
