import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import { connectSocket, disconnectSocket } from '../services/socket';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  onlineUsers: Record<string, boolean>;
}

const SocketContext = createContext<SocketContextType>({ socket: null, onlineUsers: {} });

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!user?._id) {
      disconnectSocket();
      setSocket(null);
      return;
    }

    const s = connectSocket(user._id);
    setSocket(s);

    s.on('user_status', ({ userId, isOnline }: { userId: string; isOnline: boolean }) => {
      setOnlineUsers((prev) => ({ ...prev, [userId]: isOnline }));
    });

    return () => {
      disconnectSocket();
    };
  }, [user?._id]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
