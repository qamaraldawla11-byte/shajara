// ============================================
// App Constants
// ============================================

export const ROLES = {
  ADMIN: 'admin',
  EDITOR: 'editor',
  VIEWER: 'viewer',
};

export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Admin',
  [ROLES.EDITOR]: 'Editor',
  [ROLES.VIEWER]: 'Viewer',
};

export const ROLE_COLORS = {
  [ROLES.ADMIN]: 'badge-primary',
  [ROLES.EDITOR]: 'badge-accent',
  [ROLES.VIEWER]: 'badge-warning',
};

export const GENDERS = {
  MALE: 'male',
  FEMALE: 'female',
};

export const GENDER_LABELS = {
  [GENDERS.MALE]: 'Male',
  [GENDERS.FEMALE]: 'Female',
};

// Permissions matrix
export const PERMISSIONS = {
  viewTree: [ROLES.ADMIN, ROLES.EDITOR, ROLES.VIEWER],
  addMember: [ROLES.ADMIN, ROLES.EDITOR],
  editMember: [ROLES.ADMIN, ROLES.EDITOR],
  deleteMember: [ROLES.ADMIN, ROLES.EDITOR],
  generateInvite: [ROLES.ADMIN, ROLES.EDITOR],
  manageRoles: [ROLES.ADMIN],
  deleteFamily: [ROLES.ADMIN],
};

/**
 * Check if a role has permission for an action
 */
export function hasPermission(role, action) {
  return PERMISSIONS[action]?.includes(role) ?? false;
}

/**
 * Generate a random invite code (8 characters)
 */
export function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No confusing chars (0/O, 1/I)
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
