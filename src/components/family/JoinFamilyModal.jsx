// ============================================
// Join Family Modal — Via invite code
// ============================================

import { useState, useEffect } from 'react';
import { joinFamily } from '../../services/inviteService';
import { reportError, getErrorMessage } from '../../services/errorService';
import { useToast } from '../../contexts/ToastContext';
import { X, UserPlus, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function JoinFamilyModal({ onClose, onJoined, initialCode = '' }) {
  const toast = useToast();
  const { t } = useTranslation();
  const [code, setCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (initialCode) {
      setCode(initialCode);
      if (initialCode.trim()) {
        setTimeout(() => {
          document.getElementById('join-family-submit')?.click();
        }, 300);
      }
    }
  }, [initialCode]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!code.trim()) {
      setError(t('join.code_required'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await joinFamily(code.trim());
      setSuccess(result);
      await onJoined();
      toast.success(t('join.joined', { familyName: result.familyName }));
    } catch (err) {
      reportError(err, 'Join family');
      const message = getErrorMessage(err, t('join.failed'));
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t('join.title')}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {success ? (
          <div className="modal-body" style={{ textAlign: 'center', padding: 'var(--space-xl) 0' }}>
            <CheckCircle size={48} style={{ color: 'var(--color-success)', marginBottom: 'var(--space-md)' }} />
            <h3 style={{ marginBottom: 'var(--space-sm)' }}>{t('join.welcome')}</h3>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              {t('join.joined', { familyName: success.familyName })} <strong>{success.role}</strong>
            </p>
            <div className="modal-footer" style={{ justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={onClose}>
                {t('join.continue')}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {error && <div className="form-error">{error}</div>}

              <div className="input-group">
                <label htmlFor="invite-code">{t('join.invite_code')}</label>
                <input
                  id="invite-code"
                  className="input"
                  type="text"
                  placeholder={t('join.invite_placeholder')}
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
                {t('join.hint')}
              </p>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || !code.trim()}
                id="join-family-submit"
              >
                <UserPlus size={18} />
                {loading ? t('join.joining') : t('join.title')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
