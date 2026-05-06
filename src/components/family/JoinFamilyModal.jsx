// ============================================
// Join Family Modal — Via invite code
// ============================================

import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { joinFamily } from '../../services/inviteService';
import { X, UserPlus, CheckCircle } from 'lucide-react';

export default function JoinFamilyModal({ onClose, onJoined }) {
  const { user } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!code.trim()) {
      setError('Please enter an invite code.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await joinFamily(code.trim(), user.uid);
      setSuccess(result);
      onJoined();
    } catch (err) {
      setError(err.message || 'Failed to join family.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Join Family</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {success ? (
          <div className="modal-body" style={{ textAlign: 'center', padding: 'var(--space-xl) 0' }}>
            <CheckCircle size={48} style={{ color: 'var(--color-success)', marginBottom: 'var(--space-md)' }} />
            <h3 style={{ marginBottom: 'var(--space-sm)' }}>Welcome!</h3>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              You've joined <strong>{success.familyName}</strong> as <strong>{success.role}</strong>.
            </p>
            <div className="modal-footer" style={{ justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={onClose}>
                Continue
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {error && <div className="form-error">{error}</div>}

              <div className="input-group">
                <label htmlFor="invite-code">Invite Code</label>
                <input
                  id="invite-code"
                  className="input"
                  type="text"
                  placeholder="Enter 8-character code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  autoFocus
                  maxLength={8}
                  style={{
                    textAlign: 'center',
                    fontSize: 'var(--font-size-xl)',
                    letterSpacing: '0.2em',
                    fontWeight: 600,
                  }}
                />
              </div>

              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                Ask a family admin for their invite code to join.
              </p>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || !code.trim()}
                id="join-family-submit"
              >
                <UserPlus size={18} />
                {loading ? 'Joining...' : 'Join Family'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
