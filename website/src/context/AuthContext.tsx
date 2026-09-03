import React, { createContext, useContext, useEffect, useState } from 'react';
import { Hub } from 'aws-amplify/utils';
import { 
  getCurrentUser, 
  fetchUserAttributes, 
  signIn, 
  signOut, 
  fetchAuthSession, 
  signUp,
  confirmSignUp,
  resendSignUpCode,
  type AuthUser 
} from 'aws-amplify/auth';

interface AuthContextType {
  user: AuthUser | null;
  attributes: any;
  isAdmin: boolean;
  initializing: boolean;
  login: typeof signIn;
  logout: typeof signOut;
  register: typeof signUp;
  confirmRegister: typeof confirmSignUp;
  resendCode: typeof resendSignUpCode;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [attributes, setAttributes] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    checkUser();

    // Listen for auth events (Sign In, Sign Out, Token Refresh)
    const unsubscribe = Hub.listen('auth', ({ payload }) => {
      switch (payload.event) {
        case 'signedIn':
        case 'tokenRefresh':
          setTimeout(() => checkUser(), 500);
          break;
        case 'signedOut':
          setUser(null);
          setAttributes(null);
          setIsAdmin(false);
          setInitializing(false);
          break;
      }
    });

    return () => unsubscribe();
  }, []);

  const checkUser = async () => {
    setInitializing(true);
    try {
      const session = await fetchAuthSession();
      if (!session.tokens) return;
      const [currentUser, attrs] = await Promise.all([getCurrentUser(), fetchUserAttributes()]);
      const groups = session.tokens.idToken?.payload['cognito:groups'] || [];
      setUser(currentUser);
      setAttributes(attrs);
      setIsAdmin(Array.isArray(groups) ? groups.includes('Admins') : false);
    } catch {
      setUser(null);
      setAttributes(null);
      setIsAdmin(false);
    } finally {
      setInitializing(false);
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
    <AuthContext.Provider value={{ 
      user, 
      attributes, 
      isAdmin, 
      initializing,
      login, 
      logout,
      register: signUp,
      confirmRegister: confirmSignUp,
      resendCode: resendSignUpCode
    }}>
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
