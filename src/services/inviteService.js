// ============================================
// Invite Service - Generate and redeem invite codes
// ============================================

import { requireSupabase } from './supabaseClient';
import { generateInviteCode, ROLES } from '../utils/constants';

function logInviteSupabaseError(operation, tableName, error) {
  console.error(`[InviteService:${operation}]`, {
    tableName,
    code: error?.code,
    status: error?.status,
    statusCode: error?.statusCode,
    message: error?.message,
    details: error?.details,
    hint: error?.hint,
  }, error);
}

/**
 * Generate an invite code for a family atomically.
 */
export async function createInvite(familyId, role = ROLES.VIEWER) {
  const client = requireSupabase();
  let lastError = null;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateInviteCode();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await client.rpc('create_invite_transaction', {
      p_family_id: familyId,
      p_code: code,
      p_role: role,
      p_max_uses: 10,
      p_expires_at: expiresAt,
    });

    if (!error) return data;
    lastError = error;
    logInviteSupabaseError('createInvite', 'invites', error);

    if (error.code !== '23505') break;
  }

  throw lastError || new Error('Failed to create invite.');
}

/**
 * Join a family via invite code atomically.
 */
export async function joinFamily(inviteCode) {
  const client = requireSupabase();
  const { data, error } = await client.rpc('join_family_with_invite', {
    p_code: inviteCode.trim().toUpperCase(),
  });

  if (error) throw error;

  const result = Array.isArray(data) ? data[0] : data;
  return {
    familyId: result.family_id,
    familyName: result.family_name,
    role: result.role,
  };
}

/**
 * Get all invites for a family.
 */
export async function getFamilyInvites(familyId) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('invites')
    .select('*')
    .eq('family_id', familyId)
    .order('created_at', { ascending: false });

  if (error) {
    logInviteSupabaseError('getFamilyInvites', 'invites', error);
    throw error;
  }

  return (data || []).map((d) => ({
    code: d.code,
    familyId: d.family_id,
    familyName: d.family_name,
    createdBy: d.created_by,
    role: d.role,
    maxUses: d.max_uses,
    usedCount: d.used_count,
    expiresAt: new Date(d.expires_at),
    createdAt: new Date(d.created_at),
    isActive: d.is_active,
  }));
}

/**
 * Deactivate an invite code atomically.
 */
export async function deactivateInvite(code) {
  const client = requireSupabase();
  const { error } = await client.rpc('deactivate_invite_transaction', {
    p_code: code,
  });

  if (error) {
    logInviteSupabaseError('deactivateInvite', 'invites', error);
    throw error;
  }
}
