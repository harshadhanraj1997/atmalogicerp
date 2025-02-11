'use client';
import { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  username: string;
  status: string;
  // Add any other user properties
}

interface SessionContextType {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check localStorage on initial load
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    // You could also set a session expiry time
    localStorage.setItem('sessionExpiry', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('sessionExpiry');
    window.location.href = '/login';
  };

  return (
    <SessionContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}; 