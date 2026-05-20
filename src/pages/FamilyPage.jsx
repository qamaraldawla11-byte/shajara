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
import { EmptyState, ErrorState, LoadingState } from '../components/ui/AsyncState';
import { hasPermission, ROLE_LABELS, ROLE_COLORS } from '../utils/constants';
import { withTimeout } from '../utils/asyncTimeout';
import {
  ArrowLeft,
  Plus,
  TreePine,
  Users,
  Trash2,
  Share2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function FamilyPage() {
  const { familyId } = useParams();
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [family, setFamily] = useState(null);
  const [members, setMembers] = useState([]);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [showInvites, setShowInvites] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let isMounted = true;
    if (!authLoading) {
      loadFamily(isMounted);
    }
    return () => { isMounted = false; };
  }, [authLoading, familyId, user?.id]);

  async function loadFamily(isMounted = true) {
    if (authLoading) return;

    if (!familyId || !user?.id) {
      if (isMounted) {
        setLoadError('Missing family or user session.');
        setLoading(false);
      }
      return;
    }

    try {
      if (isMounted) setLoadError('');
      if (isMounted && !family) setLoading(true);
      const [familyData, userRole, membersData] = await withTimeout(Promise.all([
        getFamilyById(familyId),
        getUserRole(familyId, user.id),
        getMembers(familyId),
      ]), 12000, 'Loading family workspace');

      if (!isMounted) return;

      if (!familyData || !userRole) {
        setLoadError(!familyData ? 'Family was not found or is not accessible.' : 'You do not have access to this family.');
        setFamily(null);
        setRole(null);
        setMembers([]);
        return;
      }

      setFamily(familyData);
      setRole(userRole);
      setMembers(membersData);
    } catch (err) {
      reportError(err, 'Load family');
      if (isMounted) {
        setLoadError(getErrorMessage(err, 'Failed to load family.'));
        toast.error(getErrorMessage(err, 'Failed to load family.'));
      }
    } finally {
      if (isMounted) setLoading(false);
    }
  }

  async function handleDeleteMember(memberId) {
    if (!confirm('Are you sure you want to delete this member? This cannot be undone.')) return;
    try {
      await deleteMember(familyId, memberId);
      await refreshMembers();
      toast.success('Member deleted.');
    } catch (err) {
      reportError(err, 'Delete member');
      toast.error(getErrorMessage(err, 'Failed to delete member.'));
    }
  }

  async function refreshMembers() {
    try {
      const membersData = await withTimeout(
        getMembers(familyId),
        10000,
        'Refreshing family members'
      );
      setMembers(membersData);
    } catch (err) {
      reportError(err, 'Refresh family members after save');
      console.error('[FamilyPage] Member reload failed after save/delete', err);
      throw err;
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
    return <LoadingState label="Loading family workspace..." />;
  }

  if (loadError) {
    return (
      <ErrorState
        title="Family could not be loaded"
        message={loadError}
        action={(
          <button className="btn btn-primary" onClick={() => navigate('/dashboard', { replace: true })}>
            Back to dashboard
          </button>
        )}
      />
    );
  }

  if (!family) return null;

  return (
    <div className="family-page animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div className="page-title-row">
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => navigate('/dashboard')}
            aria-label={t('common.back_to_dashboard')}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="page-title">{family.name}</h1>
            <div className="page-meta-row">
              <p className="page-subtitle">{family.description || t('family.family_tree')}</p>
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
              {t('family.invite')}
            </button>
          )}
          <Link to={`/family/${familyId}/tree`} className="btn btn-secondary">
            <TreePine size={18} />
            {t('family.view_tree')}
          </Link>
          {hasPermission(role, 'addMember') && (
            <button
              className="btn btn-primary"
              onClick={() => setShowAddMember(true)}
              id="add-member-btn"
            >
              <Plus size={18} />
              {t('family.add_member')}
            </button>
          )}
        </div>
      </div>

      {/* Stats bar */}
      <div className="family-stats-bar">
        <div className="family-stat">
          <Users size={16} />
          <span>{members.length} {t('family.members')}</span>
        </div>
        {hasPermission(role, 'deleteFamily') && (
          <button
            onClick={handleDeleteFamily}
            disabled={deleting}
            className="btn btn-ghost btn-sm danger-action"
          >
            <Trash2 size={14} />
            {deleting ? t('family.deleting') : t('family.delete_family')}
          </button>
        )}
      </div>

      {/* Members Grid */}
      {members.length === 0 ? (
        <EmptyState
          icon={Users}
          title={t('family.no_members')}
          message={t('family.no_members_message')}
          action={hasPermission(role, 'addMember') && (
            <button className="btn btn-primary" onClick={() => setShowAddMember(true)}>
              <Plus size={18} /> {t('family.add_first_member')}
            </button>
          )}
        />
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
          onAdded={refreshMembers}
        />
      )}

      {editingMember && (
        <EditMemberModal
          familyId={familyId}
          member={editingMember}
          members={members}
          onClose={() => setEditingMember(null)}
          onUpdated={refreshMembers}
        />
      )}

      {showInvites && (
        <InvitePanel
          familyId={familyId}
          familyName={family.name}
          canRevoke={hasPermission(role, 'deleteMember')}
          onClose={() => setShowInvites(false)}
        />
      )}
    </div>
  );
}
