import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

const themeMap = {
  'red-black':   { primary: '#E53935', primaryDark: '#B71C1C', background: '#0A0A0A', sent: '#E53935' },
  'blue-dark':   { primary: '#1565C0', primaryDark: '#0D47A1', background: '#0D0D1A', sent: '#1565C0' },
  'green-dark':  { primary: '#2E7D32', primaryDark: '#1B5E20', background: '#0A0D0A', sent: '#2E7D32' },
  'purple-dark': { primary: '#7B1FA2', primaryDark: '#4A148C', background: '#0D0A12', sent: '#7B1FA2' },
};

const baseColors = {
  primaryLight: '#FF6F60',
  surface: '#1A1A1A',
  surfaceLight: '#242424',
  card: '#1E1E1E',
  border: '#2A2A2A',
  text: '#FFFFFF',
  textSecondary: '#9E9E9E',
  textMuted: '#616161',
  received: '#1E1E1E',
  online: '#4CAF50',
  offline: '#616161',
  danger: '#FF1744',
  success: '#4CAF50',
  warning: '#FF9800',
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0,0,0,0.7)',
  inputBg: '#1A1A1A',
  shadow: '#000000',
};

const ThemeContext = createContext({});

export const ThemeProvider = ({ children }) => {
  const [themeId, setThemeId] = useState('red-black');

  useEffect(() => {
    SecureStore.getItemAsync('chatzz_theme').then((saved) => {
      if (saved && themeMap[saved]) setThemeId(saved);
    }).catch(() => {});
  }, []);

  const applyTheme = async (id) => {
    if (!themeMap[id]) return;
    setThemeId(id);
    try { await SecureStore.setItemAsync('chatzz_theme', id); } catch (_) {}
  };

  const colors = { ...baseColors, ...(themeMap[themeId] || themeMap['red-black']) };

  return (
    <ThemeContext.Provider value={{ colors, themeId, applyTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
export default ThemeContext;
