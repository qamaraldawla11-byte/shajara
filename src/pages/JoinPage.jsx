import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import JoinFamilyModal from '../components/family/JoinFamilyModal';
import { useState } from 'react';

export default function JoinPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showJoin, setShowJoin] = useState(false);

  const inviteCode = searchParams.get('code');

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }

    if (inviteCode) {
      setShowJoin(true);
    } else {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, authLoading, inviteCode]);

  if (authLoading || !isAuthenticated) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!showJoin) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <JoinFamilyModal
      onClose={() => navigate('/dashboard', { replace: true })}
      onJoined={() => navigate('/dashboard', { replace: true })}
      initialCode={inviteCode || ''}
    />
  );
}