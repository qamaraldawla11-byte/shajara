// ============================================
// Protected Route — Auth guard component
// ============================================

import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const ROUTE_LOADING_TIMEOUT_MS = 10000;

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading, authError } = useAuth();
  const [routeTimedOut, setRouteTimedOut] = useState(false);

  useEffect(() => {
    if (!loading) {
      setRouteTimedOut(false);
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      setRouteTimedOut(true);
    }, ROUTE_LOADING_TIMEOUT_MS);

    return () => clearTimeout(timeoutId);
  }, [loading]);

  if (loading && isAuthenticated) {
    return children;
  }

  if (loading && !routeTimedOut) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p style={{ color: 'var(--color-text-muted)' }}>Loading Shajara...</p>
      </div>
    );
  }

  if (loading && routeTimedOut) {
    if (isAuthenticated) return children;
    return <Navigate to="/login" replace />;
  }

  if (authError && isAuthenticated) {
    return children;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
