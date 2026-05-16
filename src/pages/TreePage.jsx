import { Suspense, lazy, useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getFamilyById, getUserRole } from '../services/familyService';
import { getMembers } from '../services/memberService';
import { reportError } from '../services/errorService';
import { useToast } from '../contexts/ToastContext';
import FamilyTree from '../components/tree/FamilyTree';
import { EmptyState, LoadingState } from '../components/ui/AsyncState';
import { getTreeStats } from '../utils/treeBuilder';
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
  const [viewMode, setViewMode] = useState('classic'); // 'classic' or 'advanced'

  const handlePrint = useReactToPrint({
    contentRef: treeRef,
    documentTitle: `${family?.name || 'Family'} - Family Tree`,
  });

  useEffect(() => {
    loadData();
  }, [familyId]);

  async function loadData() {
    try {
      const [familyData, userRole, membersData] = await Promise.all([
        getFamilyById(familyId),
        getUserRole(familyId, user.id),
        getMembers(familyId),
      ]);

      if (!familyData || !userRole) {
        navigate('/dashboard', { replace: true });
        return;
      }

      setFamily(familyData);
      setMembers(membersData);
    } catch (err) {
      reportError(err, 'Load tree');
      toast.error('Failed to load tree.');
      navigate('/dashboard', { replace: true });
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <LoadingState label="Preparing tree..." />;
  }

  const stats = getTreeStats(members);

  return (
    <div className="tree-page animate-fade-in">
      {/* Header */}
      <div className="tree-header">
        <div className="tree-title-row">
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => navigate(`/family/${familyId}`)}
            aria-label="Back to family"
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
            <button className="btn btn-secondary btn-icon" onClick={() => handlePrint()} title="Print PDF" aria-label="Print tree as PDF">
              <Printer size={18} />
            </button>

            <div className="view-toggle">
              <button 
                className={`toggle-btn ${viewMode === 'classic' ? 'active' : ''}`}
                onClick={() => setViewMode('classic')}
                title="Classic View"
                aria-label="Classic tree view"
                aria-pressed={viewMode === 'classic'}
              >
                <Layout size={18} />
              </button>
              <button 
                className={`toggle-btn ${viewMode === 'advanced' ? 'active' : ''}`}
                onClick={() => setViewMode('advanced')}
                title="Advanced View"
                aria-label="Advanced tree view"
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
              message="Add family members to see the tree visualization."
              action={<button
                className="btn btn-primary"
                onClick={() => navigate(`/family/${familyId}`)}
              >
                Go to Members
              </button>}
            />
          ) : (
            viewMode === 'classic' ? (
              <FamilyTree members={members} />
            ) : (
              <Suspense fallback={<div className="loading-screen tree-loading"><div className="spinner"></div></div>}>
                <AdvancedTree members={members} />
              </Suspense>
            )
          )}
        </div>
      </div>
    </div>
  );
}
