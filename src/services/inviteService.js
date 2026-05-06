// ============================================
// Invite Service — Generate & redeem invite codes
// ============================================

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  getDocs,
  collection,
  query,
  where,
  arrayUnion,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { generateInviteCode, ROLES } from '../utils/constants';

/**
 * Generate an invite code for a family
 */
export async function createInvite(familyId, familyName, userId, role = ROLES.VIEWER) {
  let code = generateInviteCode();

  // Ensure code is unique
  let exists = true;
  while (exists) {
    const inviteRef = doc(db, 'invites', code);
    const inviteSnap = await getDoc(inviteRef);
    if (!inviteSnap.exists()) {
      exists = false;
    } else {
      code = generateInviteCode();
    }
  }

  // Expires in 7 days
  const expiresAt = Timestamp.fromDate(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  );

  await setDoc(doc(db, 'invites', code), {
    familyId,
    familyName,
    createdBy: userId,
    role,
    maxUses: 10,
    usedCount: 0,
    expiresAt,
    createdAt: serverTimestamp(),
    isActive: true,
  });

  return code;
}

/**
 * Join a family via invite code
 */
export async function joinFamily(inviteCode, userId) {
  const code = inviteCode.trim().toUpperCase();
  const inviteRef = doc(db, 'invites', code);
  const inviteSnap = await getDoc(inviteRef);

  if (!inviteSnap.exists()) {
    throw new Error('Invalid invite code.');
  }

  const invite = inviteSnap.data();

  // Validate invite
  if (!invite.isActive) {
    throw new Error('This invite code has been deactivated.');
  }

  if (invite.usedCount >= invite.maxUses) {
    throw new Error('This invite code has reached its maximum uses.');
  }

  const now = new Date();
  if (invite.expiresAt.toDate() < now) {
    throw new Error('This invite code has expired.');
  }

  // Check if user is already in the family
  const roleRef = doc(db, 'families', invite.familyId, 'roles', userId);
  const roleSnap = await getDoc(roleRef);
  if (roleSnap.exists()) {
    throw new Error('You are already a member of this family.');
  }

  // Add user role to family
  await setDoc(roleRef, {
    role: invite.role,
    joinedAt: serverTimestamp(),
  });

  // Add family to user's families array
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    families: arrayUnion(invite.familyId),
    updatedAt: serverTimestamp(),
  });

  // Increment used count
  await updateDoc(inviteRef, {
    usedCount: invite.usedCount + 1,
  });

  return {
    familyId: invite.familyId,
    familyName: invite.familyName,
    role: invite.role,
  };
}

/**
 * Get all invites for a family
 */
export async function getFamilyInvites(familyId) {
  const invitesRef = collection(db, 'invites');
  const q = query(invitesRef, where('familyId', '==', familyId));
  const invitesSnap = await getDocs(q);
  return invitesSnap.docs.map((d) => ({ code: d.id, ...d.data() }));
}

/**
 * Deactivate an invite code
 */
export async function deactivateInvite(code) {
  const inviteRef = doc(db, 'invites', code);
  await updateDoc(inviteRef, { isActive: false });
}
