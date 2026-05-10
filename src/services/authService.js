// ============================================
// Auth Service - Supabase Authentication
// ============================================

import { supabase } from './supabaseClient';

/**
 * Sign in with Google OAuth via Supabase.
 */
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + '/dashboard',
    },
  });

  if (error) throw error;
  return data;
}

/**
 * Sign out current user.
 */
export async function logOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Create or update the authenticated user's profile through an RPC.
 */
export async function ensureUserProfile(user) {
  const { data, error } = await supabase.rpc('ensure_profile', {
    p_email: user.email,
    p_display_name: user.user_metadata?.full_name || user.email,
    p_photo_url: user.user_metadata?.avatar_url || null,
  });

  if (error) throw error;
  return data;
}

/**
 * Get user profile from profiles table.
 */
export async function getUserDoc(uid) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, display_name, photo_url, created_at, updated_at')
    .eq('id', uid)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}
