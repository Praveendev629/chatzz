import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { getSocket, initSocket } from '../services/socket';

const SocketContext = createContext({});

export const SocketProvider = ({ children }) => {
  const { token } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const listenersRef = useRef({});

  useEffect(() => {
    if (!token) return;

    // Ensure socket is initialised and connected
    const socket = initSocket(token);

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    if (socket.connected) setIsConnected(true);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [token]);

  const on = (event, callback) => {
    const socket = getSocket();
    if (!socket) return;
    // Avoid duplicate listeners
    socket.off(event, callback);
    socket.on(event, callback);
  };

  const off = (event, callback) => {
    const socket = getSocket();
    if (!socket) return;
    socket.off(event, callback);
  };

  const emit = (event, data) => {
    const socket = getSocket();
    socket?.emit(event, data);
  };

  return (
    <SocketContext.Provider value={{ on, off, emit, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
