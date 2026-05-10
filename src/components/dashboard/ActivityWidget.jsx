import React, { useState, useEffect } from 'react';
import { getActivityLogs } from '../../services/activityService';
import { Clock, UserPlus, Heart, GitBranch, Share2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { reportError } from '../../services/errorService';

export default function ActivityWidget({ families }) {
  const { t } = useTranslation();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (families.length > 0) {
      loadLogs();
    } else {
      setLoading(false);
    }
  }, [families]);

  async function loadLogs() {
    try {
      // For now, just fetch from the first family for simplicity, 
      // or combine if needed. In a real app, we might have a global view.
      const allLogs = await Promise.all(
        families.map(f => getActivityLogs(f.id, 5))
      );
      const flattened = allLogs.flat().sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      ).slice(0, 10);
      
      setLogs(flattened);
    } catch (err) {
      reportError(err, 'Load activity logs');
    } finally {
      setLoading(false);
    }
  }

  const getIcon = (type) => {
    switch (type) {
      case 'member_added': return <UserPlus size={16} className="text-primary" />;
      case 'marriage_added': return <Heart size={16} className="text-danger" />;
      case 'family_linked': return <Share2 size={16} className="text-accent" />;
      default: return <Clock size={16} />;
    }
  };

  if (loading) return <div className="spinner"></div>;
  if (logs.length === 0) return <div className="empty-state-small">No recent activity</div>;

  return (
    <div className="activity-widget">
      <div className="widget-header">
        <h4>Recent Activity</h4>
      </div>
      <div className="activity-list">
        {logs.map(log => (
          <div key={log.id} className="activity-item">
            <div className="activity-icon-wrapper">
              {getIcon(log.type)}
            </div>
            <div className="activity-content">
              <p className="activity-text">
                <strong>{log.user?.display_name || 'Someone'}</strong> {log.type.replace('_', ' ')}
                {log.details?.memberName && <span>: {log.details.memberName}</span>}
              </p>
              <span className="activity-time">
                {new Date(log.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
