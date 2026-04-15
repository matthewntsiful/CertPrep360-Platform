import React, { createContext, useContext, useEffect, useState } from 'react';
import { getCurrentUser, fetchUserAttributes, signIn, signOut, type AuthUser } from 'aws-amplify/auth';

interface AuthContextType {
  user: AuthUser | null;
  attributes: any;
  loading: boolean;
  login: typeof signIn;
  logout: typeof signOut;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [attributes, setAttributes] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    // DEV MODE MOCK: Automatically log in for local preview
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      setUser({ username: 'MockCandidate', userId: 'dev-123' });
      setAttributes({ name: 'Cloud Architect (Preview)' });
      setLoading(false);
      return;
    }

    try {
      const currentUser = await getCurrentUser();
      const attrs = await fetchUserAttributes();
      setUser(currentUser);
      setAttributes(attrs);
    } catch (err) {
      setUser(null);
      setAttributes(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (...args: Parameters<typeof signIn>) => {
    const res = await signIn(...args);
    await checkUser();
    return res;
  };

  const logout = async () => {
    await signOut();
    setUser(null);
    setAttributes(null);
  };

  return (
    <AuthContext.Provider value={{ user, attributes, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
