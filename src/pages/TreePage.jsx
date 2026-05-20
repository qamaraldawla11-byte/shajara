import { Suspense, lazy, useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getFamilyById, getUserRole } from '../services/familyService';
import { deleteMember, getMembers } from '../services/memberService';
import { getErrorMessage, reportError } from '../services/errorService';
import { useToast } from '../contexts/ToastContext';
import FamilyTree from '../components/tree/FamilyTree';
import AddMemberModal from '../components/members/AddMemberModal';
import EditMemberModal from '../components/members/EditMemberModal';
import { EmptyState, LoadingState } from '../components/ui/AsyncState';
import { getTreeStats } from '../utils/treeBuilder';
import { withTimeout } from '../utils/asyncTimeout';
import { hasPermission } from '../utils/constants';
import { ArrowLeft, Users, GitBranch, Heart, Layout, Maximize2, Printer } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useReactToPrint } from 'react-to-print';

const AdvancedTree = lazy(() => import('../components/tree/AdvancedTree'));

export default function TreePage() {
  const { familyId } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const treeRef = useRef();

  const [family, setFamily] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [viewMode, setViewMode] = useState('classic'); // 'classic' or 'advanced'
  const [role, setRole] = useState(null);
  const [editingMember, setEditingMember] = useState(null);
  const [addingRelative, setAddingRelative] = useState(null);

  const handlePrint = useReactToPrint({
    contentRef: treeRef,
    documentTitle: `${family?.name || t('common.family')} - ${t('family.family_tree')}`,
  });

  useEffect(() => {
    loadData();
  }, [familyId]);

  async function loadData() {
    if (!familyId || !user?.id) {
      setLoadError(t('tree.missing_session'));
      setLoading(false);
      return;
    }

    try {
      setLoadError('');
      const [familyData, userRole, membersData] = await withTimeout(Promise.all([
        getFamilyById(familyId),
        getUserRole(familyId, user.id),
        getMembers(familyId),
      ]), 12000, 'Preparing tree');

      if (!familyData || !userRole) {
        navigate('/dashboard', { replace: true });
        return;
      }

      setFamily(familyData);
      setRole(userRole);
      setMembers(membersData);
    } catch (err) {
      reportError(err, 'Load tree');
      const message = getErrorMessage(err, t('tree.load_failed'));
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function refreshMembers() {
    const membersData = await withTimeout(getMembers(familyId), 10000, 'Refreshing tree members');
    setMembers(membersData);
  }

  function handleAddRelative(member, relationType = 'child') {
    setAddingRelative({ member, relationType });
  }

  async function handleDeleteMember(member) {
    const fullName = `${member.firstName} ${member.lastName || ''}`.trim();
    if (!confirm(t('tree.remove_confirm', { name: fullName || t('common.unknown') }))) return;

    try {
      await deleteMember(familyId, member.id);
      await refreshMembers();
      toast.success(t('tree.member_removed'));
    } catch (err) {
      reportError(err, 'Delete member from tree');
      toast.error(getErrorMessage(err, t('tree.remove_failed')));
    }
  }

  if (loading) {
    return <LoadingState label={t('tree.preparing')} />;
  }

  if (loadError) {
    return (
      <EmptyState
        icon={GitBranch}
        title={t('tree.could_not_load')}
        message={loadError}
        action={(
          <button className="btn btn-primary" onClick={() => navigate(`/family/${familyId}`)}>
            {t('common.back_to_family')}
          </button>
        )}
      />
    );
  }

  const stats = getTreeStats(members);
  const canAddMember = hasPermission(role, 'addMember');
  const canEditMember = hasPermission(role, 'editMember');
  const canDeleteMember = hasPermission(role, 'deleteMember');

  return (
    <div className="tree-page animate-fade-in">
      {/* Header */}
      <div className="tree-header">
        <div className="tree-title-row">
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => navigate(`/family/${familyId}`)}
            aria-label={t('common.back_to_family')}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="page-title tree-page-title">
              {family?.name} - {t('common.tree')}
            </h1>
          </div>
        </div>

        <div className="tree-toolbar">
          <div className="tree-stats">
            <div className="tree-stat-pill">
              <Users size={14} />
              {stats.total} {t('tree.members')}
            </div>
            <div className="tree-stat-pill">
              <GitBranch size={14} />
              {stats.generations} {t('tree.generations')}
            </div>
            <div className="tree-stat-pill">
              <Heart size={14} />
              {stats.alive} {t('tree.alive')}
            </div>
          </div>

          <div className="tree-actions">
            <button className="btn btn-secondary btn-icon" onClick={() => handlePrint()} title={t('tree.print')} aria-label={t('tree.print')}>
              <Printer size={18} />
            </button>

            <div className="view-toggle">
              <button 
                className={`toggle-btn ${viewMode === 'classic' ? 'active' : ''}`}
                onClick={() => setViewMode('classic')}
                title={t('tree.classic_view')}
                aria-label={t('tree.classic_view')}
                aria-pressed={viewMode === 'classic'}
              >
                <Layout size={18} />
              </button>
              <button 
                className={`toggle-btn ${viewMode === 'advanced' ? 'active' : ''}`}
                onClick={() => setViewMode('advanced')}
                title={t('tree.advanced_view')}
                aria-label={t('tree.advanced_view')}
                aria-pressed={viewMode === 'advanced'}
              >
                <Maximize2 size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tree */}
      <div className={`tree-container ${viewMode === 'advanced' ? 'tree-container-advanced' : ''}`}>
        <div ref={treeRef} className="print-area">
          {members.length === 0 ? (
            <EmptyState
              icon={GitBranch}
              title={t('tree.no_members')}
              message={t('tree.no_members_message')}
              action={<button
                className="btn btn-primary"
                onClick={() => navigate(`/family/${familyId}`)}
              >
                {t('tree.go_to_members')}
              </button>}
            />
          ) : (
            viewMode === 'classic' ? (
              <FamilyTree members={members} />
            ) : (
              <Suspense fallback={<div className="loading-screen tree-loading"><div className="spinner"></div></div>}>
                <AdvancedTree
                  members={members}
                  canAdd={canAddMember}
                  canEdit={canEditMember}
                  canDelete={canDeleteMember}
                  onAddRelative={handleAddRelative}
                  onEdit={setEditingMember}
                  onDelete={handleDeleteMember}
                />
              </Suspense>
            )
          )}
        </div>
      </div>

      {addingRelative && (
        <AddMemberModal
          familyId={familyId}
          members={members}
          relationContext={addingRelative}
          onClose={() => setAddingRelative(null)}
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
    </div>
  );
}
