import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../utils/constants';

let socket: Socket | null = null;

export const connectSocket = (userId: string): Socket => {
  socket = io(SOCKET_URL, {
    query: { userId },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });
  return socket;
};

export const getSocket = (): Socket | null => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
