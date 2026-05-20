// ============================================
// Member Service - Supabase CRUD for family members
// ============================================

import { requireSupabase } from './supabaseClient';
import { withTimeout } from '../utils/asyncTimeout';

const MEMBER_REQUEST_TIMEOUT_MS = 10000;

function logMemberSupabaseError(operation, error) {
  console.error(`[MemberService:${operation}]`, {
    tableName: 'members',
    code: error?.code,
    status: error?.status,
    statusCode: error?.statusCode,
    message: error?.message,
    details: error?.details,
    hint: error?.hint,
  }, error);
}

/**
 * Add a new member to a family atomically.
 */
export async function addMember(familyId, memberData) {
  const client = requireSupabase();
  const { data, error } = await withTimeout(
    client.rpc('add_member_transaction', {
      p_family_id: familyId,
      p_first_name: memberData.firstName,
      p_last_name: memberData.lastName || '',
      p_gender: memberData.gender,
      p_birth_date: memberData.birthDate || null,
      p_death_date: memberData.deathDate || null,
      p_is_alive: memberData.isAlive !== false,
      p_photo_url: memberData.photoURL || null,
      p_linked_user_id: memberData.linkedUserId || null,
      p_father_id: memberData.fatherId || null,
      p_mother_id: memberData.motherId || null,
      p_spouse_ids: memberData.spouseIds || [],
    }),
    MEMBER_REQUEST_TIMEOUT_MS,
    'Adding member'
  );

  if (error) {
    logMemberSupabaseError('addMember', error);
    throw error;
  }
  return data;
}

/**
 * Get all members of a family.
 */
export async function getMembers(familyId) {
  if (!familyId) return [];
  const client = requireSupabase();
  const { data, error } = await withTimeout(
    client
      .from('members')
      .select('*')
      .eq('family_id', familyId)
      .order('created_at', { ascending: true }),
    MEMBER_REQUEST_TIMEOUT_MS,
    'Loading members'
  );

  if (error) {
    logMemberSupabaseError('getMembers', error);
    throw error;
  }
  return (data || []).map(mapMemberFromDb);
}

/**
 * Get a single member by ID.
 */
export async function getMemberById(familyId, memberId) {
  if (!familyId || !memberId) return null;
  const client = requireSupabase();
  const { data, error } = await withTimeout(
    client
      .from('members')
      .select('*')
      .eq('id', memberId)
      .eq('family_id', familyId)
      .maybeSingle(),
    MEMBER_REQUEST_TIMEOUT_MS,
    'Loading member'
  );

  if (error) {
    logMemberSupabaseError('getMemberById', error);
    throw error;
  }
  if (!data) return null;
  return mapMemberFromDb(data);
}

/**
 * Update a member.
 */
export async function updateMember(familyId, memberId, updates) {
  const client = requireSupabase();
  const dbUpdates = {};
  if (updates.firstName !== undefined) dbUpdates.first_name = updates.firstName;
  if (updates.lastName !== undefined) dbUpdates.last_name = updates.lastName;
  if (updates.gender !== undefined) dbUpdates.gender = updates.gender;
  if (updates.birthDate !== undefined) dbUpdates.birth_date = updates.birthDate;
  if (updates.deathDate !== undefined) dbUpdates.death_date = updates.deathDate;
  if (updates.isAlive !== undefined) dbUpdates.is_alive = updates.isAlive;
  if (updates.photoURL !== undefined) dbUpdates.photo_url = updates.photoURL;
  if (updates.linkedUserId !== undefined) dbUpdates.linked_user_id = updates.linkedUserId;
  if (updates.fatherId !== undefined) dbUpdates.father_id = updates.fatherId;
  if (updates.motherId !== undefined) dbUpdates.mother_id = updates.motherId;
  if (updates.spouseIds !== undefined) dbUpdates.spouse_ids = updates.spouseIds;

  if (updates.relationships) {
    if (updates.relationships.fatherId !== undefined) dbUpdates.father_id = updates.relationships.fatherId;
    if (updates.relationships.motherId !== undefined) dbUpdates.mother_id = updates.relationships.motherId;
    if (updates.relationships.spouseIds !== undefined) dbUpdates.spouse_ids = updates.relationships.spouseIds;
  }

  dbUpdates.updated_at = new Date().toISOString();

  const { error } = await withTimeout(
    client
      .from('members')
      .update(dbUpdates)
      .eq('id', memberId)
      .eq('family_id', familyId),
    MEMBER_REQUEST_TIMEOUT_MS,
    'Updating member'
  );

  if (error) {
    logMemberSupabaseError('updateMember', error);
    throw error;
  }
}

/**
 * Delete a member and clean up relationships atomically.
 */
export async function deleteMember(familyId, memberId) {
  const client = requireSupabase();
  const { error } = await withTimeout(
    client.rpc('delete_member_transaction', {
      p_family_id: familyId,
      p_member_id: memberId,
    }),
    MEMBER_REQUEST_TIMEOUT_MS,
    'Deleting member'
  );

  if (error) {
    logMemberSupabaseError('deleteMember', error);
    throw error;
  }
}

function mapMemberFromDb(row) {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    gender: row.gender,
    birthDate: row.birth_date,
    deathDate: row.death_date,
    isAlive: row.is_alive,
    photoURL: row.photo_url,
    linkedUserId: row.linked_user_id,
    familyId: row.family_id,
    addedBy: row.added_by,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    relationships: {
      fatherId: row.father_id || null,
      motherId: row.mother_id || null,
      spouseIds: row.spouse_ids || [],
    },
  };
}
