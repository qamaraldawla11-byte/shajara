// ============================================
// Login Page — Landing + Google Sign-In
// ============================================

import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Globe2, Lock, LogIn, Mail, Shield, Share2, TreePine, UserRound, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { reportError } from '../services/errorService';
import { useToast } from '../contexts/ToastContext';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { LoadingState } from '../components/ui/AsyncState';

export default function LoginPage() {
  const { login, loginWithEmail, signupWithEmail, resetPassword, isAuthenticated, loading } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { i18n } = useTranslation();
  const [signingIn, setSigningIn] = useState(false);
  const [mode, setMode] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    displayName: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      navigate(searchParams.get('redirect') || '/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate, searchParams]);

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language?.startsWith('ar') ? 'en' : 'ar');
  };

  const handleGoogleLogin = async () => {
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

  const handleEmailSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!form.email.trim()) {
      setError('Email is required.');
      return;
    }

    if (mode !== 'reset' && form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (mode === 'signup' && !form.displayName.trim()) {
      setError('Your name is required.');
      return;
    }

    setSigningIn(true);

    try {
      if (mode === 'signup') {
        await signupWithEmail(form.email, form.password, form.displayName);
        toast.success('Account created. Check your email if confirmation is required.');
      } else if (mode === 'reset') {
        await resetPassword(form.email);
        toast.success('Password reset email sent.');
        setMode('login');
      } else {
        await loginWithEmail(form.email, form.password);
      }
    } catch (err) {
      const message = err?.message || 'Authentication failed. Please try again.';
      setError(message);
      reportError(err, 'Email auth form');
      toast.error(message);
    } finally {
      setSigningIn(false);
    }
  };

  if (loading) {
    return <LoadingState label="Checking your session..." />;
  }

  return (
    <div className="login-page">
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
            <div className="auth-panel-header">
              <div>
                <h2>{mode === 'signup' ? 'Create account' : mode === 'reset' ? 'Reset password' : 'Welcome back'}</h2>
                <p>{mode === 'signup' ? 'Start your private family workspace' : mode === 'reset' ? 'Receive a secure reset link' : 'Sign in to continue to your dashboard'}</p>
              </div>
              <button type="button" className="btn btn-ghost btn-icon" onClick={toggleLanguage} title="Change language">
                <Globe2 size={18} />
              </button>
            </div>

            {!isSupabaseConfigured && (
              <div className="login-error">
                Supabase is not configured for this deployment.
              </div>
            )}

            {error && (
              <div className="login-error">{error}</div>
            )}

            <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
              <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Sign in</button>
              <button type="button" className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>Create account</button>
            </div>

            <form className="auth-form" onSubmit={handleEmailSubmit}>
              {mode === 'signup' && (
                <div className="input-group auth-input">
                  <label htmlFor="display-name">Full name</label>
                  <UserRound size={17} />
                  <input
                    id="display-name"
                    className="input"
                    value={form.displayName}
                    onChange={(e) => setForm((prev) => ({ ...prev, displayName: e.target.value }))}
                    autoComplete="name"
                    disabled={signingIn}
                  />
                </div>
              )}

              <div className="input-group auth-input">
                <label htmlFor="email">Email</label>
                <Mail size={17} />
                <input
                  id="email"
                  className="input"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  autoComplete="email"
                  disabled={signingIn}
                  required
                />
              </div>

              {mode !== 'reset' && (
                <div className="input-group auth-input">
                  <label htmlFor="password">Password</label>
                  <Lock size={17} />
                  <input
                    id="password"
                    className="input"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    disabled={signingIn}
                    required
                  />
                  <button type="button" className="auth-password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              )}

              <button type="submit" className="btn btn-primary auth-submit" disabled={signingIn || !isSupabaseConfigured}>
                {signingIn ? <div className="spinner" style={{ width: 18, height: 18 }}></div> : <LogIn size={18} />}
                {mode === 'signup' ? 'Create account' : mode === 'reset' ? 'Send reset link' : 'Sign in'}
              </button>
            </form>

            <button type="button" className="auth-link-btn" onClick={() => setMode(mode === 'reset' ? 'login' : 'reset')}>
              {mode === 'reset' ? 'Back to sign in' : 'Forgot your password?'}
            </button>

            <div className="auth-divider"><span>or</span></div>

            <button
              className="btn-google"
              onClick={handleGoogleLogin}
              disabled={signingIn || !isSupabaseConfigured}
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
