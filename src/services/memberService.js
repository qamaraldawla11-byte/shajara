// ============================================
// Member Service — Firestore CRUD for family members
// ============================================

import {
  doc,
  collection,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { updateMemberCount } from './familyService';

/**
 * Add a new member to a family
 */
export async function addMember(familyId, memberData, userId) {
  const memberRef = await addDoc(collection(db, 'families', familyId, 'members'), {
    firstName: memberData.firstName,
    lastName: memberData.lastName || '',
    gender: memberData.gender,
    birthDate: memberData.birthDate || null,
    deathDate: memberData.deathDate || null,
    isAlive: memberData.isAlive !== false,
    photoURL: memberData.photoURL || null,
    linkedUserId: memberData.linkedUserId || null,
    relationships: {
      fatherId: memberData.fatherId || null,
      motherId: memberData.motherId || null,
      spouseIds: memberData.spouseIds || [],
    },
    familyId,
    addedBy: userId,
    createdBy: userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Update family member count
  await updateMemberCount(familyId, 1);

  return memberRef.id;
}

/**
 * Get all members of a family
 */
export async function getMembers(familyId) {
  const membersRef = collection(db, 'families', familyId, 'members');
  const membersSnap = await getDocs(membersRef);
  return membersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Get a single member by ID
 */
export async function getMemberById(familyId, memberId) {
  const memberRef = doc(db, 'families', familyId, 'members', memberId);
  const memberSnap = await getDoc(memberRef);
  if (!memberSnap.exists()) return null;
  return { id: memberSnap.id, ...memberSnap.data() };
}

/**
 * Update a member
 */
export async function updateMember(familyId, memberId, data) {
  const memberRef = doc(db, 'families', familyId, 'members', memberId);
  await updateDoc(memberRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a member and clean up relationships
 */
export async function deleteMember(familyId, memberId) {
  // Get all members to clean up references
  const members = await getMembers(familyId);

  // Remove this member from any relationships
  for (const member of members) {
    let needsUpdate = false;
    const updates = {};

    if (member.relationships?.fatherId === memberId) {
      updates['relationships.fatherId'] = null;
      needsUpdate = true;
    }
    if (member.relationships?.motherId === memberId) {
      updates['relationships.motherId'] = null;
      needsUpdate = true;
    }
    if (member.relationships?.spouseIds?.includes(memberId)) {
      updates['relationships.spouseIds'] = member.relationships.spouseIds.filter(
        (id) => id !== memberId
      );
      needsUpdate = true;
    }

    if (needsUpdate) {
      await updateDoc(doc(db, 'families', familyId, 'members', member.id), updates);
    }
  }

  // Delete the member
  await deleteDoc(doc(db, 'families', familyId, 'members', memberId));

  // Decrement family member count
  await updateMemberCount(familyId, -1);
}
