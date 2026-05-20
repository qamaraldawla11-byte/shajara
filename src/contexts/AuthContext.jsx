// ============================================
// Auth Context - Global auth state management
// ============================================

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../services/supabaseClient';
import {
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  sendPasswordReset,
  logOut,
  ensureUserProfile,
  getUserDoc,
} from '../services/authService';
import { reportError } from '../services/errorService';
import { withTimeout } from '../utils/asyncTimeout';

const AuthContext = createContext(null);
const AUTH_TIMEOUT_MS = 8000;
const PROFILE_TIMEOUT_MS = 6000;

function createFallbackProfile(sessionUser) {
  if (!sessionUser) return null;

  return {
    id: sessionUser.id,
    email: sessionUser.email,
    display_name: sessionUser.user_metadata?.full_name || sessionUser.email || 'Family member',
    photo_url: sessionUser.user_metadata?.avatar_url || null,
    created_at: sessionUser.created_at || null,
    updated_at: new Date().toISOString(),
    isFallback: true,
  };
}

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
      try {
        const profile = await withTimeout(
          ensureUserProfile(sessionUser),
          PROFILE_TIMEOUT_MS,
          'Profile synchronization'
        );
        if (!isMounted) return;
        setUserDoc(profile || createFallbackProfile(sessionUser));
      } catch (error) {
        if (!isMounted) return;
        reportError(error, 'Profile synchronization');
        setAuthError(error);
        setUserDoc(createFallbackProfile(sessionUser));
      }
    }

    async function initializeAuth() {
      setLoading(true);
      setAuthError(null);

      try {
        if (!isSupabaseConfigured) {
          throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
        }

        const { data: { session }, error } = await withTimeout(
          supabase.auth.getSession(),
          AUTH_TIMEOUT_MS,
          'Auth session loading'
        );
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

    if (!isSupabaseConfigured) {
      return () => {
        isMounted = false;
      };
    }

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

  const loginWithEmail = async (email, password) => {
    try {
      setAuthError(null);
      await signInWithEmail(email, password);
    } catch (error) {
      reportError(error, 'Email login');
      setAuthError(error);
      throw error;
    }
  };

  const signupWithEmail = async (email, password, displayName) => {
    try {
      setAuthError(null);
      await signUpWithEmail(email, password, displayName);
    } catch (error) {
      reportError(error, 'Email sign up');
      setAuthError(error);
      throw error;
    }
  };

  const resetPassword = async (email) => {
    try {
      setAuthError(null);
      await sendPasswordReset(email);
    } catch (error) {
      reportError(error, 'Password reset');
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
    loginWithEmail,
    signupWithEmail,
    resetPassword,
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
