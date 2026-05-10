// ============================================
// Family Service - Supabase CRUD for families
// ============================================

import { supabase } from './supabaseClient';

/**
 * Create a new family and assign the current user as admin atomically.
 */
export async function createFamily(name, description) {
  const { data, error } = await supabase.rpc('create_family_transaction', {
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
  const { data, error } = await supabase
    .from('families')
    .select('*')
    .eq('id', familyId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data ? mapFamilyFromDb(data) : null;
}

/**
 * Get all families for the authenticated user from family_roles.
 */
export async function getUserFamilies() {
  const { data, error } = await supabase.rpc('get_my_families');

  if (error) throw error;
  return (data || []).map(mapFamilyFromDb);
}

/**
 * Get user's role in a family.
 */
export async function getUserRole(familyId, userId) {
  const { data, error } = await supabase
    .from('family_roles')
    .select('role')
    .eq('family_id', familyId)
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data?.role || null;
}

/**
 * Get all roles (members with access) for a family.
 */
export async function getFamilyRoles(familyId) {
  const { data, error } = await supabase
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
  const { error } = await supabase.rpc('update_user_role_transaction', {
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
  const { error } = await supabase.rpc('remove_user_from_family_transaction', {
    p_family_id: familyId,
    p_user_id: userId,
  });

  if (error) throw error;
}

/**
 * Delete a family atomically.
 */
export async function deleteFamily(familyId) {
  const { error } = await supabase.rpc('delete_family_transaction', {
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
