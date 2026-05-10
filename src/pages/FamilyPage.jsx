// ============================================
// Family Page — Members + Tree + Invites
// ============================================

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getFamilyById, getUserRole, deleteFamily } from '../services/familyService';
import { getMembers, deleteMember } from '../services/memberService';
import { reportError, getErrorMessage } from '../services/errorService';
import { useToast } from '../contexts/ToastContext';
import AddMemberModal from '../components/members/AddMemberModal';
import EditMemberModal from '../components/members/EditMemberModal';
import MemberCard from '../components/members/MemberCard';
import InvitePanel from '../components/invite/InvitePanel';
import { hasPermission, ROLE_LABELS, ROLE_COLORS } from '../utils/constants';
import {
  ArrowLeft,
  Plus,
  TreePine,
  Users,
  Trash2,
  Share2,
} from 'lucide-react';

export default function FamilyPage() {
  const { familyId } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [family, setFamily] = useState(null);
  const [members, setMembers] = useState([]);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [showInvites, setShowInvites] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    loadFamily(isMounted);
    return () => { isMounted = false; };
  }, [familyId]);

  async function loadFamily(isMounted = true) {
    try {
      const [familyData, userRole, membersData] = await Promise.all([
        getFamilyById(familyId),
        getUserRole(familyId, user.id),
        getMembers(familyId),
      ]);

      if (!isMounted) return;

      if (!familyData || !userRole) {
        navigate('/dashboard', { replace: true });
        return;
      }

      setFamily(familyData);
      setRole(userRole);
      setMembers(membersData);
    } catch (err) {
      reportError(err, 'Load family');
      toast.error('Failed to load family.');
      if (isMounted) navigate('/dashboard', { replace: true });
    } finally {
      if (isMounted) setLoading(false);
    }
  }

  async function handleDeleteMember(memberId) {
    if (!confirm('Are you sure you want to delete this member? This cannot be undone.')) return;
    try {
      await deleteMember(familyId, memberId);
      await loadFamily();
      toast.success('Member deleted.');
    } catch (err) {
      reportError(err, 'Delete member');
      toast.error(getErrorMessage(err, 'Failed to delete member.'));
    }
  }

  async function handleDeleteFamily() {
    if (!confirm(`Are you sure you want to delete "${family.name}"? ALL data will be lost. This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await deleteFamily(familyId);
      toast.success('Family deleted.');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      reportError(err, 'Delete family');
      toast.error(getErrorMessage(err, 'Failed to delete family.'));
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!family) return null;

  return (
    <div className="family-page animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="page-title">{family.name}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <p className="page-subtitle">{family.description || 'Family tree'}</p>
              <span className={`badge ${ROLE_COLORS[role]}`}>{ROLE_LABELS[role]}</span>
            </div>
          </div>
        </div>
        <div className="page-actions">
          {hasPermission(role, 'generateInvite') && (
            <button
              className="btn btn-secondary"
              onClick={() => setShowInvites(true)}
              id="invite-btn"
            >
              <Share2 size={18} />
              Invite
            </button>
          )}
          <Link to={`/family/${familyId}/tree`} className="btn btn-secondary">
            <TreePine size={18} />
            View Tree
          </Link>
          {hasPermission(role, 'addMember') && (
            <button
              className="btn btn-primary"
              onClick={() => setShowAddMember(true)}
              id="add-member-btn"
            >
              <Plus size={18} />
              Add Member
            </button>
          )}
        </div>
      </div>

      {/* Stats bar */}
      <div className="family-stats-bar">
        <div className="family-stat">
          <Users size={16} />
          <span>{members.length} members</span>
        </div>
        {hasPermission(role, 'deleteFamily') && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleDeleteFamily}
            disabled={deleting}
            style={{ color: 'var(--color-danger)' }}
          >
            <Trash2 size={14} />
            {deleting ? 'Deleting...' : 'Delete Family'}
          </button>
        )}
      </div>

      {/* Members Grid */}
      {members.length === 0 ? (
        <div className="card empty-state">
          <Users size={64} className="empty-state-icon" />
          <h3>No members yet</h3>
          <p>Start building your family tree by adding the first member.</p>
          {hasPermission(role, 'addMember') && (
            <button className="btn btn-primary" onClick={() => setShowAddMember(true)}>
              <Plus size={18} /> Add First Member
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-2">
          {members.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              members={members}
              canEdit={hasPermission(role, 'editMember')}
              canDelete={hasPermission(role, 'deleteMember')}
              onEdit={() => setEditingMember(member)}
              onDelete={() => handleDeleteMember(member.id)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showAddMember && (
        <AddMemberModal
          familyId={familyId}
          members={members}
          onClose={() => setShowAddMember(false)}
          onAdded={loadFamily}
        />
      )}

      {editingMember && (
        <EditMemberModal
          familyId={familyId}
          member={editingMember}
          members={members}
          onClose={() => setEditingMember(null)}
          onUpdated={loadFamily}
        />
      )}

      {showInvites && (
        <InvitePanel
          familyId={familyId}
          familyName={family.name}
          onClose={() => setShowInvites(false)}
        />
      )}
    </div>
  );
}
