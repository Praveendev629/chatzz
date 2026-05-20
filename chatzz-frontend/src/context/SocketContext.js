import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { getSocket } from '../services/socket';

const SocketContext = createContext({});

export const SocketProvider = ({ children }) => {
  const { token } = useAuth();
  const listenersRef = useRef({});

  const on = (event, callback) => {
    const socket = getSocket();
    if (!socket) return;
    socket.on(event, callback);
    if (!listenersRef.current[event]) listenersRef.current[event] = [];
    listenersRef.current[event].push(callback);
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
    <SocketContext.Provider value={{ on, off, emit }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
