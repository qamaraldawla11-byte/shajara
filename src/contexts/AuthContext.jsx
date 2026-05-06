// ============================================
// Auth Context — Global auth state management
// ============================================

import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { signInWithGoogle, logOut } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userDoc, setUserDoc] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setUserDoc(null);
        setLoading(false);
      }
    });

    return () => unsubAuth();
  }, []);

  // Listen to user document in Firestore
  useEffect(() => {
    if (!user) return;

    const unsubDoc = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) {
        setUserDoc({ id: snap.id, ...snap.data() });
      }
      setLoading(false);
    });

    return () => unsubDoc();
  }, [user]);

  const login = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (user?.isDev) {
        setUser(null);
        setUserDoc(null);
        return;
      }
      await logOut();
      setUser(null);
      setUserDoc(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const devLogin = () => {
    const fakeUser = { uid: 'dev-user-123', email: 'dev@shajara.local', displayName: 'Dev User', isDev: true };
    setUser(fakeUser);
    setUserDoc({
      id: 'dev-user-123',
      ...fakeUser,
      families: ['dev-family-1']
    });
    setLoading(false);
  };

  const value = {
    user,
    userDoc,
    loading,
    login,
    logout,
    devLogin,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
