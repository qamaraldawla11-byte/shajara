import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import JoinFamilyModal from '../components/family/JoinFamilyModal';
import { useState } from 'react';
import { LoadingState } from '../components/ui/AsyncState';

export default function JoinPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showJoin, setShowJoin] = useState(false);

  const inviteCode = searchParams.get('code');

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      const redirect = inviteCode ? `/join?code=${encodeURIComponent(inviteCode)}` : '/dashboard';
      navigate(`/login?redirect=${encodeURIComponent(redirect)}`, { replace: true });
      return;
    }

    if (inviteCode) {
      setShowJoin(true);
    } else {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, authLoading, inviteCode]);

  if (authLoading || !isAuthenticated) {
    return <LoadingState label="Preparing your invite..." />;
  }

  if (!showJoin) {
    return <LoadingState label="Opening invite..." />;
  }

  return (
    <JoinFamilyModal
      onClose={() => navigate('/dashboard', { replace: true })}
      onJoined={() => navigate('/dashboard', { replace: true })}
      initialCode={inviteCode || ''}
    />
  );
}
