import { AlertTriangle, Inbox } from 'lucide-react';

export function LoadingState({ label = 'Loading...' }) {
  return (
    <div className="state-panel" role="status" aria-live="polite">
      <div className="spinner"></div>
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, message, action }) {
  return (
    <div className="card empty-state">
      <Icon size={64} className="empty-state-icon" aria-hidden="true" />
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ title = 'Unable to load this page', message, action }) {
  return (
    <div className="card empty-state error-state" role="alert">
      <AlertTriangle size={64} className="empty-state-icon" aria-hidden="true" />
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {action}
    </div>
  );
}
