// ============================================
// Dashboard Page — Family overview + stats
// ============================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUserFamilies } from '../services/familyService';
import FamilyCard from '../components/family/FamilyCard';
import CreateFamilyModal from '../components/family/CreateFamilyModal';
import JoinFamilyModal from '../components/family/JoinFamilyModal';
import { Plus, UserPlus, TreePine, Users, FolderTree } from 'lucide-react';

export default function DashboardPage() {
  const { user, userDoc } = useAuth();
  const navigate = useNavigate();
  const [families, setFamilies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  useEffect(() => {
    loadFamilies();
  }, [userDoc]);

  async function loadFamilies() {
    if (user?.isDev) {
      setFamilies([
        {
          id: 'dev-family-1',
          name: 'The Al-Farsi Family',
          description: 'A mock family tree for development purposes.',
          memberCount: 12,
          createdAt: new Date()
        }
      ]);
      setLoading(false);
      return;
    }

    if (!userDoc?.families?.length) {
      setFamilies([]);
      setLoading(false);
      return;
    }

    try {
      const data = await getUserFamilies(userDoc.families);
      setFamilies(data);
    } catch (err) {
      console.error('Failed to load families:', err);
    } finally {
      setLoading(false);
    }
  }

  const totalMembers = families.reduce((sum, f) => sum + (f.memberCount || 0), 0);

  return (
    <div className="dashboard-page animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Welcome back, {user?.displayName?.split(' ')[0] || 'there'}
          </p>
        </div>
        <div className="page-actions">
          <button
            className="btn btn-secondary"
            onClick={() => setShowJoin(true)}
            id="join-family-btn"
          >
            <UserPlus size={18} />
            Join Family
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setShowCreate(true)}
            id="create-family-btn"
          >
            <Plus size={18} />
            Create Family
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-3" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="card stat-card">
          <div className="stat-icon" style={{ color: 'var(--color-primary)' }}>
            <FolderTree size={24} />
          </div>
          <div className="stat-value">{families.length}</div>
          <div className="stat-label">Families</div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon" style={{ color: 'var(--color-accent)' }}>
            <Users size={24} />
          </div>
          <div className="stat-value">{totalMembers}</div>
          <div className="stat-label">Total Members</div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon" style={{ color: 'var(--color-warning)' }}>
            <TreePine size={24} />
          </div>
          <div className="stat-value">{families.length}</div>
          <div className="stat-label">Trees</div>
        </div>
      </div>

      {/* Family list */}
      {loading ? (
        <div className="loading-screen" style={{ height: '40vh' }}>
          <div className="spinner"></div>
        </div>
      ) : families.length === 0 ? (
        <div className="card empty-state">
          <TreePine size={64} className="empty-state-icon" />
          <h3>No families yet</h3>
          <p>Create your first family tree or join an existing one with an invite code.</p>
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              <Plus size={18} /> Create Family
            </button>
            <button className="btn btn-secondary" onClick={() => setShowJoin(true)}>
              <UserPlus size={18} /> Join Family
            </button>
          </div>
        </div>
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

      {/* Modals */}
      {showCreate && (
        <CreateFamilyModal
          onClose={() => setShowCreate(false)}
          onCreated={loadFamilies}
        />
      )}
      {showJoin && (
        <JoinFamilyModal
          onClose={() => setShowJoin(false)}
          onJoined={loadFamilies}
        />
      )}
    </div>
  );
}
