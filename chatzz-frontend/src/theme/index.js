export const Colors = {
  primary: '#E53935',
  primaryDark: '#B71C1C',
  primaryLight: '#FF6F60',
  background: '#0A0A0A',
  surface: '#1A1A1A',
  surfaceLight: '#242424',
  card: '#1E1E1E',
  border: '#2A2A2A',
  text: '#FFFFFF',
  textSecondary: '#9E9E9E',
  textMuted: '#616161',
  sent: '#E53935',
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

export const Typography = {
  h1: { fontSize: 28, fontWeight: '700', color: Colors.text },
  h2: { fontSize: 22, fontWeight: '700', color: Colors.text },
  h3: { fontSize: 18, fontWeight: '600', color: Colors.text },
  body: { fontSize: 15, fontWeight: '400', color: Colors.text },
  bodySmall: { fontSize: 13, fontWeight: '400', color: Colors.textSecondary },
  caption: { fontSize: 11, fontWeight: '400', color: Colors.textMuted },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const Shadow = {
  sm: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  md: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
};
