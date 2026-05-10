// ============================================
// Login Page — Landing + Google Sign-In
// ============================================

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, TreePine, Users, Shield, Share2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { reportError } from '../services/errorService';
import { useToast } from '../contexts/ToastContext';

export default function LoginPage() {
  const { login, isAuthenticated, loading } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async () => {
    setSigningIn(true);
    setError('');
    try {
      await login();
      // OAuth redirects the browser, so we don't need to navigate here
    } catch (err) {
      setError('Failed to sign in. Please try again.');
      reportError(err, 'Login page');
      toast.error('Failed to sign in. Please try again.');
    } finally {
      setSigningIn(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="login-page">
      {/* Decorative background orbs */}
      <div className="login-orb login-orb-1"></div>
      <div className="login-orb login-orb-2"></div>
      <div className="login-orb login-orb-3"></div>

      <div className="login-container animate-fade-in">
        {/* Left panel — Hero */}
        <div className="login-hero">
          <div className="login-logo">
            <TreePine size={40} />
            <span>Shajara</span>
          </div>

          <h1 className="login-title">
            Your Family's
            <br />
            <span className="login-title-accent">Digital Roots</span>
          </h1>

          <p className="login-subtitle">
            Build, connect, and preserve your family tree. 
            A private network where your family's story lives on.
          </p>

          <div className="login-features">
            <div className="login-feature">
              <div className="login-feature-icon">
                <TreePine size={20} />
              </div>
              <div>
                <strong>Family Trees</strong>
                <p>Create and visualize your ancestry</p>
              </div>
            </div>
            <div className="login-feature">
              <div className="login-feature-icon">
                <Users size={20} />
              </div>
              <div>
                <strong>Connect Relatives</strong>
                <p>Invite family members to collaborate</p>
              </div>
            </div>
            <div className="login-feature">
              <div className="login-feature-icon">
                <Shield size={20} />
              </div>
              <div>
                <strong>Private & Secure</strong>
                <p>Your family data stays protected</p>
              </div>
            </div>
            <div className="login-feature">
              <div className="login-feature-icon">
                <Share2 size={20} />
              </div>
              <div>
                <strong>Easy Sharing</strong>
                <p>Share access via invite codes</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right panel — Sign In */}
        <div className="login-form-panel">
          <div className="login-form-content">
            <h2>Welcome</h2>
            <p>Sign in to start building your family tree</p>

            {error && (
              <div className="login-error">{error}</div>
            )}

            <button
              className="btn-google"
              onClick={handleLogin}
              disabled={signingIn}
              id="google-sign-in-btn"
            >
              {signingIn ? (
                <div className="spinner" style={{ width: 20, height: 20 }}></div>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              )}
              {signingIn ? 'Signing in...' : 'Continue with Google'}
            </button>



            <p className="login-terms">
              By signing in, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
