import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getUserRole } from '../services/familyService';
import { ROLES } from '../utils/constants';
import { reportError } from '../services/errorService';

export function usePermissions(familyId) {
  const { user } = useAuth();
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !familyId) {
      setRole(null);
      setLoading(false);
      return;
    }

    let isMounted = true;
    
    async function fetchRole() {
      try {
        const userRole = await getUserRole(familyId, user.id);
        if (isMounted) {
          setRole(userRole);
          setLoading(false);
        }
      } catch (err) {
        reportError(err, 'Fetch permissions');
        if (isMounted) setLoading(false);
      }
    }

    fetchRole();
    return () => { isMounted = false; };
  }, [familyId, user]);

  const permissions = {
    role,
    loading,
    isAdmin: role === ROLES.ADMIN,
    isEditor: role === ROLES.EDITOR || role === ROLES.ADMIN,
    isViewer: !!role,
    canAddMember: role === ROLES.ADMIN || role === ROLES.EDITOR,
    canEditMember: role === ROLES.ADMIN || role === ROLES.EDITOR,
    canDeleteMember: role === ROLES.ADMIN,
    canInvite: role === ROLES.ADMIN,
    canManageLinks: role === ROLES.ADMIN,
    canExport: !!role,
    canManageChat: role === ROLES.ADMIN
  };

  return permissions;
}
