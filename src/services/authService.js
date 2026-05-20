// ============================================
// Auth Service - Supabase Authentication
// ============================================

import { requireSupabase } from './supabaseClient';

/**
 * Sign in with Google OAuth via Supabase.
 */
export async function signInWithGoogle() {
  const client = requireSupabase();
  const { data, error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + '/dashboard',
    },
  });

  if (error) throw error;
  return data;
}

/**
 * Sign in with email and password.
 */
export async function signInWithEmail(email, password) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) throw error;
  return data;
}

/**
 * Create an account with email and password.
 */
export async function signUpWithEmail(email, password, displayName) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        full_name: displayName?.trim() || email.trim(),
      },
      emailRedirectTo: window.location.origin + '/dashboard',
    },
  });

  if (error) throw error;
  return data;
}

/**
 * Send a password reset email.
 */
export async function sendPasswordReset(email) {
  const client = requireSupabase();
  const { data, error } = await client.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: window.location.origin + '/login',
  });

  if (error) throw error;
  return data;
}

/**
 * Sign out current user.
 */
export async function logOut() {
  const client = requireSupabase();
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

/**
 * Create or update the authenticated user's profile through an RPC.
 */
export async function ensureUserProfile(user) {
  const client = requireSupabase();
  if (!user?.id || !user?.email) {
    throw new Error('A valid authenticated user is required to create a profile.');
  }

  const { data, error } = await client.rpc('ensure_profile', {
    p_email: user.email,
    p_display_name: user.user_metadata?.full_name || user.email,
    p_photo_url: user.user_metadata?.avatar_url || null,
  });

  if (!error) return data;

  const fallbackProfile = {
    id: user.id,
    email: user.email,
    display_name: user.user_metadata?.full_name || user.email,
    photo_url: user.user_metadata?.avatar_url || null,
    updated_at: new Date().toISOString(),
  };

  const { data: fallbackData, error: fallbackError } = await client
    .from('profiles')
    .upsert(fallbackProfile, { onConflict: 'id' })
    .select('id, email, display_name, photo_url, created_at, updated_at')
    .single();

  if (fallbackError) throw error;
  return fallbackData;
}

/**
 * Get user profile from profiles table.
 */
export async function getUserDoc(uid) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('profiles')
    .select('id, email, display_name, photo_url, created_at, updated_at')
    .eq('id', uid)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

export async function updateUserProfile(uid, updates) {
  const client = requireSupabase();
  const dbUpdates = {
    updated_at: new Date().toISOString(),
  };

  if (updates.displayName !== undefined) dbUpdates.display_name = updates.displayName.trim();
  if (updates.photoUrl !== undefined) dbUpdates.photo_url = updates.photoUrl;

  const { data, error } = await client
    .from('profiles')
    .update(dbUpdates)
    .eq('id', uid)
    .select('id, email, display_name, photo_url, created_at, updated_at')
    .single();

  if (error) throw error;
  return data;
}

export async function updateAccountPassword(password) {
  const client = requireSupabase();
  const { data, error } = await client.auth.updateUser({ password });
  if (error) throw error;
  return data;
}
