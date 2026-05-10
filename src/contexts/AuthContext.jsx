// ============================================
// Auth Context - Global auth state management
// ============================================

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { signInWithGoogle, logOut, ensureUserProfile, getUserDoc } from '../services/authService';
import { reportError } from '../services/errorService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userDoc, setUserDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function syncSessionUser(sessionUser) {
      if (!sessionUser) {
        setUser(null);
        setUserDoc(null);
        return;
      }

      setUser(sessionUser);
      const profile = await ensureUserProfile(sessionUser);
      setUserDoc(profile);
    }

    async function initializeAuth() {
      setLoading(true);
      setAuthError(null);

      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!isMounted) return;
        await syncSessionUser(session?.user || null);
      } catch (error) {
        if (!isMounted) return;
        reportError(error, 'Auth initialization');
        setAuthError(error);
        setUser(null);
        setUserDoc(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        setLoading(true);
        setAuthError(null);

        try {
          if (event === 'SIGNED_OUT') {
            setUser(null);
            setUserDoc(null);
            return;
          }

          await syncSessionUser(session?.user || null);
        } catch (error) {
          if (!isMounted) return;
          reportError(error, 'Auth state change');
          setAuthError(error);
        } finally {
          if (isMounted) setLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async () => {
    try {
      setAuthError(null);
      await signInWithGoogle();
    } catch (error) {
      reportError(error, 'Login');
      setAuthError(error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      setAuthError(null);
      await logOut();
      setUser(null);
      setUserDoc(null);
    } catch (error) {
      reportError(error, 'Logout');
      setAuthError(error);
      throw error;
    }
  };

  const refreshUserDoc = async () => {
    if (!user) return null;

    try {
      const profile = await getUserDoc(user.id);
      if (profile) setUserDoc(profile);
      return profile;
    } catch (error) {
      reportError(error, 'Refresh profile');
      setAuthError(error);
      return null;
    }
  };

  const value = useMemo(() => ({
    user,
    userDoc,
    loading,
    authError,
    login,
    logout,
    refreshUserDoc,
    isAuthenticated: !!user,
  }), [user, userDoc, loading, authError]);

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
