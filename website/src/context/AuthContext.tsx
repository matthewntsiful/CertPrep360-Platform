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
  loading: boolean;
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();

    // Listen for auth events (Sign In, Sign Out, Token Refresh)
    const unsubscribe = Hub.listen('auth', ({ payload }) => {
      switch (payload.event) {
        case 'signedIn':
        case 'tokenRefresh':
          console.log('Auth Event Detected:', payload.event, '- waiting 500ms to settle...');
          // Delay briefly to allow tokens to be persisted
          setTimeout(() => {
            checkUser();
          }, 500);
          break;
        case 'signedOut':
          setUser(null);
          setAttributes(null);
          setIsAdmin(false);
          setLoading(false);
          break;
      }
    });

    return () => unsubscribe();
  }, []);

  const checkUser = async () => {
    try {
      console.log('Checking Auth status...');
      const currentUser = await getCurrentUser();
      console.log('User identity confirmed:', currentUser.username);
      
      const attrs = await fetchUserAttributes();
      console.log('User attributes fetched successfully');
      
      const session = await fetchAuthSession();
      const groups = session.tokens?.idToken?.payload['cognito:groups'] || [];
      const adminStatus = Array.isArray(groups) ? groups.includes('Admins') : false;
      
      setUser(currentUser);
      setAttributes(attrs);
      setIsAdmin(adminStatus);
    } catch (err: any) {
      console.error('Auth check failed:', err.name, err.message);
      setUser(null);
      setAttributes(null);
      setIsAdmin(false);
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
    <AuthContext.Provider value={{ 
      user, 
      attributes, 
      isAdmin, 
      loading, 
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
