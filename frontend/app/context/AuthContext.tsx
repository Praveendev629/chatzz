import React, { createContext, useContext, useEffect, useState } from 'react';
import { saveUser, getUser, clearUser } from '../utils/storage';

interface User {
  _id: string;
  name: string;
  profileImage: string;
  isOnline: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (user: User) => Promise<void>;
  logout: () => Promise<void>;
  updateUserData: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restore = async () => {
      const stored = await getUser();
      if (stored) setUser(stored);
      setLoading(false);
    };
    restore();
  }, []);

  const login = async (userData: User) => {
    setUser(userData);
    await saveUser(userData);
  };

  const logout = async () => {
    setUser(null);
    await clearUser();
  };

  const updateUserData = (data: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...data };
      saveUser(updated);
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUserData }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
