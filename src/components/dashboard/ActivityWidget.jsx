import { useEffect, useState } from 'react';
import { getActivityLogs } from '../../services/activityService';
import { Clock, Heart, Share2, UserPlus } from 'lucide-react';
import { reportError } from '../../services/errorService';

export default function ActivityWidget({ families }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadLogs() {
      if (!families.length) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const allLogs = await Promise.all(
          families.map((family) => getActivityLogs(family.id, 5))
        );
        const flattened = allLogs
          .flat()
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 10);

        if (isMounted) setLogs(flattened);
      } catch (err) {
        reportError(err, 'Load activity logs');
        if (isMounted) setLogs([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    setLogs([]);
    if (families.length > 0) {
      loadLogs();
    } else {
      setLoading(false);
    }

    return () => { isMounted = false; };
  }, [families]);

  const getIcon = (type) => {
    switch (type) {
      case 'member_added': return <UserPlus size={16} className="text-primary" />;
      case 'marriage_added': return <Heart size={16} className="text-danger" />;
      case 'family_linked': return <Share2 size={16} className="text-accent" />;
      default: return <Clock size={16} />;
    }
  };

  return (
    <div className="activity-widget">
      <div className="widget-header">
        <h4>Recent Activity</h4>
      </div>
      {loading ? (
        <div className="activity-loading">
          <div className="spinner"></div>
          <span>Loading activity...</span>
        </div>
      ) : logs.length === 0 ? (
        <div className="empty-state-small">No recent activity yet</div>
      ) : (
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
      )}
    </div>
  );
}
