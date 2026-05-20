// ============================================
// Auth Context - Global auth state management
// ============================================

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
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
  const initializedRef = useRef(false);
  const userRef = useRef(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    let isMounted = true;

    async function syncSessionUser(sessionUser, context = 'Profile synchronization') {
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
          context
        );
        if (!isMounted) return;
        setUserDoc(profile || createFallbackProfile(sessionUser));
      } catch (error) {
        if (!isMounted) return;
        reportError(error, context);
        console.error(`[AuthContext] ${context} failed`, error);
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
        await syncSessionUser(session?.user || null, 'Initial profile synchronization');
      } catch (error) {
        if (!isMounted) return;
        reportError(error, 'Auth initialization');
        console.error('[AuthContext] Auth initialization failed', error);
        setAuthError(error);
        setUser(null);
        setUserDoc(null);
      } finally {
        if (isMounted) {
          initializedRef.current = true;
          setLoading(false);
        }
      }
    }

    initializeAuth();

    if (!isSupabaseConfigured) {
      return () => {
        isMounted = false;
      };
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;

        window.setTimeout(async () => {
          if (!isMounted) return;

          const hasExistingSession = !!userRef.current;
          const shouldBlockRoute = !initializedRef.current || (event === 'SIGNED_IN' && !hasExistingSession);
          if (shouldBlockRoute) setLoading(true);
          setAuthError(null);

          try {
            if (event === 'SIGNED_OUT') {
              setUser(null);
              setUserDoc(null);
              return;
            }

            await syncSessionUser(session?.user || null, `Auth ${event.toLowerCase()} profile refresh`);
          } catch (error) {
            if (!isMounted) return;
            reportError(error, 'Auth state change');
            console.error(`[AuthContext] Auth state change failed (${event})`, error);
            setAuthError(error);
          } finally {
            if (isMounted) {
              initializedRef.current = true;
              if (shouldBlockRoute) setLoading(false);
            }
          }
        }, 0);
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

  const refreshUserDoc = useCallback(async () => {
    if (!user) return null;

    try {
      const profile = await withTimeout(
        getUserDoc(user.id),
        PROFILE_TIMEOUT_MS,
        'Refresh profile'
      );
      if (profile) setUserDoc(profile);
      return profile;
    } catch (error) {
      reportError(error, 'Refresh profile');
      console.error('[AuthContext] Profile reload failed', error);
      setAuthError(error);
      return null;
    }
  }, [user]);

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
  }), [user, userDoc, loading, authError, refreshUserDoc]);

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
