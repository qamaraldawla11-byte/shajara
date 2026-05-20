// ============================================
// Family Service - Supabase CRUD for families
// ============================================

import { requireSupabase } from './supabaseClient';

const RETRY_DELAY_MS = 350;

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function getAuthenticatedUserId(client) {
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  return data.user?.id || null;
}

/**
 * Create a new family and assign the current user as admin atomically.
 */
export async function createFamily(name, description) {
  const client = requireSupabase();
  const { data, error } = await client.rpc('create_family_transaction', {
    p_name: name,
    p_description: description || '',
  });

  if (error) throw error;
  return data;
}

/**
 * Get a single family by ID.
 */
export async function getFamilyById(familyId) {
  if (!familyId) return null;
  const client = requireSupabase();
  const { data, error } = await client
    .from('families')
    .select('*')
    .eq('id', familyId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapFamilyFromDb(data) : null;
}

/**
 * Get all families for the authenticated user from family_roles.
 */
export async function getUserFamilies() {
  const client = requireSupabase();
  const userId = await getAuthenticatedUserId(client);
  if (!userId) return [];

  let rpcError = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { data, error } = await client.rpc('get_my_families');

    if (!error && data?.length) {
      return data.map(mapFamilyFromDb);
    }

    if (!error && attempt === 0) {
      await wait(RETRY_DELAY_MS);
      continue;
    }

    if (!error) break;
    rpcError = error;
    break;
  }

  const { data: fallbackData, error: fallbackError } = await client
    .from('family_roles')
    .select('families(*)')
    .eq('user_id', userId)
    .order('joined_at', { ascending: false });

  if (fallbackError) throw rpcError || fallbackError;
  return (fallbackData || [])
    .map((row) => row.families)
    .filter(Boolean)
    .map(mapFamilyFromDb);
}

/**
 * Get user's role in a family.
 */
export async function getUserRole(familyId, userId) {
  if (!familyId || !userId) return null;
  const client = requireSupabase();
  const authenticatedUserId = await getAuthenticatedUserId(client);
  if (!authenticatedUserId) return null;

  const { data: roleData, error: roleError } = await client.rpc('current_user_role', {
    p_family_id: familyId,
  });

  if (!roleError && roleData) return roleData;

  const { data, error } = await client
    .from('family_roles')
    .select('role')
    .eq('family_id', familyId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw roleError || error;
  return data?.role || null;
}

/**
 * Get all roles (members with access) for a family.
 */
export async function getFamilyRoles(familyId) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('family_roles')
    .select('*')
    .eq('family_id', familyId);

  if (error) throw error;
  return (data || []).map((d) => ({ userId: d.user_id, role: d.role, joinedAt: d.joined_at }));
}

/**
 * Update a user's role in a family.
 */
export async function updateUserRole(familyId, userId, newRole) {
  const client = requireSupabase();
  const { error } = await client.rpc('update_user_role_transaction', {
    p_family_id: familyId,
    p_user_id: userId,
    p_new_role: newRole,
  });

  if (error) throw error;
}

/**
 * Remove a user from a family atomically.
 */
export async function removeUserFromFamily(familyId, userId) {
  const client = requireSupabase();
  const { error } = await client.rpc('remove_user_from_family_transaction', {
    p_family_id: familyId,
    p_user_id: userId,
  });

  if (error) throw error;
}

/**
 * Delete a family atomically.
 */
export async function deleteFamily(familyId) {
  const client = requireSupabase();
  const { error } = await client.rpc('delete_family_transaction', {
    p_family_id: familyId,
  });

  if (error) throw error;
}

function mapFamilyFromDb(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdBy: row.created_by,
    memberCount: row.member_count,
    createdAt: row.created_at ? new Date(row.created_at) : null,
    updatedAt: row.updated_at ? new Date(row.updated_at) : null,
  };
}
