import { useEffect, useState } from 'react';
import { Bell, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getNotifications, markNotificationRead } from '../services/activityService';
import { reportError } from '../services/errorService';
import { useToast } from '../contexts/ToastContext';

export default function NotificationsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadNotifications() {
      try {
        const data = await getNotifications(user.id);
        if (isMounted) setNotifications(data || []);
      } catch (err) {
        reportError(err, 'Load notifications');
        toast.error('Failed to load notifications.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadNotifications();
    return () => { isMounted = false; };
  }, [toast, user.id]);

  async function handleMarkRead(notificationId) {
    try {
      await markNotificationRead(notificationId);
      setNotifications((items) =>
        items.map((item) => item.id === notificationId ? { ...item, is_read: true } : item)
      );
    } catch (err) {
      reportError(err, 'Mark notification read');
      toast.error('Failed to update notification.');
    }
  }

  return (
    <div className="notifications-page animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">Recent family updates and invites.</p>
        </div>
      </div>

      {loading ? (
        <div className="loading-panel">
          <div className="spinner"></div>
        </div>
      ) : notifications.length === 0 ? (
        <div className="card empty-state">
          <Bell size={64} className="empty-state-icon" />
          <h3>No notifications yet</h3>
          <p>New family activity will appear here.</p>
        </div>
      ) : (
        <div className="notifications-list">
          {notifications.map((notification) => (
            <article
              key={notification.id}
              className={`notification-card ${notification.is_read ? '' : 'unread'}`}
            >
              <div className="notification-icon">
                <Bell size={18} />
              </div>
              <div className="notification-content">
                <h2>{notification.title}</h2>
                <p>{notification.content}</p>
                <time dateTime={notification.created_at}>
                  {new Date(notification.created_at).toLocaleString()}
                </time>
              </div>
              {!notification.is_read && (
                <button
                  className="btn btn-ghost btn-icon"
                  onClick={() => handleMarkRead(notification.id)}
                  aria-label="Mark notification as read"
                  title="Mark as read"
                >
                  <CheckCircle2 size={18} />
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
