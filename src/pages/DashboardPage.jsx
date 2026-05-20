// ============================================
// Dashboard Page — Family overview + stats
// ============================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUserFamilies } from '../services/familyService';
import { reportError } from '../services/errorService';
import { useToast } from '../contexts/ToastContext';
import FamilyCard from '../components/family/FamilyCard';
import CreateFamilyModal from '../components/family/CreateFamilyModal';
import JoinFamilyModal from '../components/family/JoinFamilyModal';
import ActivityWidget from '../components/dashboard/ActivityWidget';
import { EmptyState, LoadingState } from '../components/ui/AsyncState';
import { Plus, UserPlus, TreePine, Users, FolderTree, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function DashboardPage() {
  const { user, userDoc, loading: authLoading, refreshUserDoc } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [families, setFamilies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (!authLoading) {
      loadFamilies(isMounted);
    }
    return () => { isMounted = false; };
  }, [authLoading, user?.id, userDoc?.updated_at]);

  async function loadFamilies(isMounted = true) {
    if (authLoading) return;

    if (!user) {
      if (isMounted) {
        setFamilies([]);
        setLoading(false);
      }
      return;
    }

    try {
      if (isMounted) setLoading(true);
      const data = await getUserFamilies();
      if (isMounted) setFamilies(data);
    } catch (err) {
      reportError(err, 'Load dashboard families');
      toast.error('Failed to load families.');
      if (isMounted) setFamilies([]);
    } finally {
      if (isMounted) setLoading(false);
    }
  }

  async function handleFamilyChange() {
    if (refreshUserDoc) {
      await refreshUserDoc();
    }
    await loadFamilies();
  }

  const totalMembers = families.reduce((sum, f) => sum + (f.memberCount || 0), 0);

  return (
    <div className="dashboard-page animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('common.dashboard')}</h1>
          <p className="page-subtitle">
            {t('dashboard.welcome', { name: userDoc?.display_name?.split(' ')[0] || user?.user_metadata?.full_name?.split(' ')[0] || 'there' })}
          </p>
        </div>
        <div className="page-actions">
          <button
            className="btn btn-secondary"
            onClick={() => setShowJoin(true)}
            id="join-family-btn"
          >
            <UserPlus size={18} />
            {t('dashboard.join_family')}
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setShowCreate(true)}
            id="create-family-btn"
          >
            <Plus size={18} />
            {t('dashboard.create_family')}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-3 stats-grid">
        <div className="card stat-card">
          <div className="stat-icon stat-icon-primary">
            <FolderTree size={24} />
          </div>
          <div className="stat-value">{families.length}</div>
          <div className="stat-label">{t('dashboard.families')}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon stat-icon-accent">
            <Users size={24} />
          </div>
          <div className="stat-value">{totalMembers}</div>
          <div className="stat-label">{t('dashboard.total_members')}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon stat-icon-warning">
            <TreePine size={24} />
          </div>
          <div className="stat-value">{families.length}</div>
          <div className="stat-label">{t('dashboard.trees')}</div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-main">
          {!loading && families.length > 0 && (
            <section className="dashboard-guidance" aria-label="Recommended next step">
              <div>
                <span className="dashboard-guidance-label">{t('dashboard.next_step')}</span>
                <h2>{t('dashboard.invite_relative_story')}</h2>
                <p>{t('dashboard.family_growth_hint')}</p>
              </div>
              <button className="btn btn-secondary" onClick={() => setShowJoin(true)}>
                <UserPlus size={18} />
                {t('dashboard.join_another_family')}
              </button>
            </section>
          )}

          {/* Family list */}
          {loading ? (
            <LoadingState label="Loading your families..." />
          ) : families.length === 0 ? (
            <EmptyState
              icon={TreePine}
              title={t('dashboard.no_families')}
              message={t('dashboard.empty_message')}
              action={(
                <div className="empty-state-actions">
                <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                  <Plus size={18} /> {t('dashboard.create_family')}
                </button>
                <button className="btn btn-secondary" onClick={() => setShowJoin(true)}>
                  <UserPlus size={18} /> {t('dashboard.join_family')}
                </button>
                </div>
              )}
            />
          ) : (
            <div className="grid grid-2">
              {families.map((family) => (
                <FamilyCard
                  key={family.id}
                  family={family}
                  onClick={() => navigate(`/family/${family.id}`)}
                />
              ))}
            </div>
          )}
        </div>

        <aside className="dashboard-sidebar">
          <ActivityWidget families={families} />
          <div className="dashboard-trust-card">
            <ShieldCheck size={22} />
            <div>
              <h3>{t('dashboard.private_by_default')}</h3>
              <p>{t('dashboard.private_by_default_text')}</p>
            </div>
          </div>
        </aside>
      </div>

      {/* Modals */}
      {showCreate && (
        <CreateFamilyModal
          onClose={() => setShowCreate(false)}
          onCreated={handleFamilyChange}
        />
      )}
      {showJoin && (
        <JoinFamilyModal
          onClose={() => setShowJoin(false)}
          onJoined={handleFamilyChange}
        />
      )}
    </div>
  );
}
