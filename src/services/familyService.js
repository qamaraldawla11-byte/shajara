// ============================================
// Family Service — Firestore CRUD for families
// ============================================

import {
  doc,
  collection,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  setDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  query,
  where,
  increment,
} from 'firebase/firestore';
import { db } from './firebase';
import { ROLES } from '../utils/constants';

/**
 * Create a new family and set the creator as admin
 */
export async function createFamily(name, description, userId) {
  // 1. Create the family document
  const familyRef = await addDoc(collection(db, 'families'), {
    name,
    description: description || '',
    createdBy: userId,
    memberCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // 2. Set the creator as admin in the roles subcollection
  await setDoc(doc(db, 'families', familyRef.id, 'roles', userId), {
    role: ROLES.ADMIN,
    joinedAt: serverTimestamp(),
  });

  // 3. Add familyId to the user's families array
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    families: arrayUnion(familyRef.id),
    updatedAt: serverTimestamp(),
  });

  return familyRef.id;
}

/**
 * Get a single family by ID
 */
export async function getFamilyById(familyId) {
  const familyRef = doc(db, 'families', familyId);
  const familySnap = await getDoc(familyRef);
  if (!familySnap.exists()) return null;
  return { id: familySnap.id, ...familySnap.data() };
}

/**
 * Get all families for a user (by their families array)
 */
export async function getUserFamilies(familyIds) {
  if (!familyIds || familyIds.length === 0) return [];

  const families = [];
  for (const id of familyIds) {
    const family = await getFamilyById(id);
    if (family) families.push(family);
  }
  return families;
}

/**
 * Get user's role in a family
 */
export async function getUserRole(familyId, userId) {
  const roleRef = doc(db, 'families', familyId, 'roles', userId);
  const roleSnap = await getDoc(roleRef);
  if (!roleSnap.exists()) return null;
  return roleSnap.data().role;
}

/**
 * Get all roles (members with access) for a family
 */
export async function getFamilyRoles(familyId) {
  const rolesRef = collection(db, 'families', familyId, 'roles');
  const rolesSnap = await getDocs(rolesRef);
  return rolesSnap.docs.map((d) => ({ userId: d.id, ...d.data() }));
}

/**
 * Update a user's role in a family
 */
export async function updateUserRole(familyId, userId, newRole) {
  const roleRef = doc(db, 'families', familyId, 'roles', userId);
  await updateDoc(roleRef, { role: newRole });
}

/**
 * Remove a user from a family
 */
export async function removeUserFromFamily(familyId, userId) {
  // Remove role
  await deleteDoc(doc(db, 'families', familyId, 'roles', userId));

  // Remove from user's families array
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    families: arrayRemove(familyId),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a family entirely
 */
export async function deleteFamily(familyId, userId) {
  // Delete all members in subcollection
  const membersSnap = await getDocs(collection(db, 'families', familyId, 'members'));
  for (const memberDoc of membersSnap.docs) {
    await deleteDoc(memberDoc.ref);
  }

  // Delete all roles in subcollection
  const rolesSnap = await getDocs(collection(db, 'families', familyId, 'roles'));
  const userIds = rolesSnap.docs.map((d) => d.id);
  for (const roleDoc of rolesSnap.docs) {
    await deleteDoc(roleDoc.ref);
  }

  // Remove family from all users' families arrays
  for (const uid of userIds) {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      families: arrayRemove(familyId),
      updatedAt: serverTimestamp(),
    });
  }

  // Delete the family document
  await deleteDoc(doc(db, 'families', familyId));
}

/**
 * Increment or decrement the member count
 */
export async function updateMemberCount(familyId, delta) {
  const familyRef = doc(db, 'families', familyId);
  await updateDoc(familyRef, {
    memberCount: increment(delta),
    updatedAt: serverTimestamp(),
  });
}
