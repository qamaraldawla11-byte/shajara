// ============================================
// Tree Page — Full-page family tree view
// ============================================

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getFamilyById, getUserRole } from '../services/familyService';
import { getMembers } from '../services/memberService';
import FamilyTree from '../components/tree/FamilyTree';
import { getTreeStats } from '../utils/treeBuilder';
import { ArrowLeft, Users, GitBranch, Heart } from 'lucide-react';

export default function TreePage() {
  const { familyId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [family, setFamily] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [familyId]);

  async function loadData() {
    try {
      const [familyData, userRole, membersData] = await Promise.all([
        getFamilyById(familyId),
        getUserRole(familyId, user.uid),
        getMembers(familyId),
      ]);

      if (!familyData || !userRole) {
        navigate('/dashboard', { replace: true });
        return;
      }

      setFamily(familyData);
      setMembers(membersData);
    } catch (err) {
      console.error('Failed to load tree data:', err);
      navigate('/dashboard', { replace: true });
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  const stats = getTreeStats(members);

  return (
    <div className="tree-page animate-fade-in">
      {/* Header */}
      <div className="tree-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => navigate(`/family/${familyId}`)}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="page-title" style={{ fontSize: 'var(--font-size-xl)' }}>
              {family?.name} — Family Tree
            </h1>
          </div>
        </div>
        <div className="tree-stats">
          <div className="tree-stat-pill">
            <Users size={14} />
            {stats.total} members
          </div>
          <div className="tree-stat-pill">
            <GitBranch size={14} />
            {stats.generations} generations
          </div>
          <div className="tree-stat-pill">
            <Heart size={14} />
            {stats.alive} alive
          </div>
        </div>
      </div>

      {/* Tree */}
      <div className="tree-container">
        {members.length === 0 ? (
          <div className="empty-state" style={{ padding: 'var(--space-3xl)' }}>
            <GitBranch size={64} className="empty-state-icon" />
            <h3>No members to display</h3>
            <p>Add family members to see the tree visualization.</p>
            <button
              className="btn btn-primary"
              onClick={() => navigate(`/family/${familyId}`)}
            >
              Go to Members
            </button>
          </div>
        ) : (
          <FamilyTree members={members} />
        )}
      </div>
    </div>
  );
}
