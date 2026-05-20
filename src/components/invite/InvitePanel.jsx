import { useCallback, useEffect, useState } from 'react';
import { createInvite, getFamilyInvites, deactivateInvite } from '../../services/inviteService';
import { ROLES, ROLE_LABELS } from '../../utils/constants';
import { X, Copy, CheckCircle, Trash2, QrCode, Mail, Share2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import { reportError, getErrorMessage } from '../../services/errorService';
import { useToast } from '../../contexts/ToastContext';

export default function InvitePanel({ familyId, familyName, canRevoke = false, onClose }) {
  const toast = useToast();
  const { t } = useTranslation();
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [role, setRole] = useState(ROLES.VIEWER);
  const [email, setEmail] = useState('');
  const [copied, setCopied] = useState('');
  const [showQR, setShowQR] = useState(null);

  const loadInvites = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await getFamilyInvites(familyId);
      setInvites(data.filter(i => i.isActive));
    } catch (err) {
      reportError(err, 'Load invites from invites table');
      const permissionCodes = ['42501', 'PGRST301'];
      const isPermissionError = permissionCodes.includes(err?.code) || err?.status === 401 || err?.status === 403;
      const isNetworkError = !err?.code && !err?.status;
      const message = isPermissionError
        ? t('invite.permission_error')
        : isNetworkError
          ? t('invite.network_error')
          : getErrorMessage(err, t('invite.load_failed'));
      setLoadError(message);
      toast.error(message);
    }
    finally { setLoading(false); }
  }, [familyId, toast]);

  useEffect(() => { loadInvites(); }, [loadInvites]);

  async function handleCreate() {
    setCreating(true);
    try {
      await createInvite(familyId, role);
      await loadInvites();
      toast.success(t('invite.created'));
    } catch (err) {
      reportError(err, 'Create invite');
      toast.error(getErrorMessage(err, t('invite.create_failed')));
    }
    finally { setCreating(false); }
  }

  async function handleCreateEmailInvite() {
    setCreating(true);
    try {
      const invite = await createInvite(familyId, role);
      await loadInvites();
      const code = invite?.code || invite;
      const link = `${window.location.origin}/join?code=${code}`;
      window.location.href = `mailto:${encodeURIComponent(email.trim())}?subject=${encodeURIComponent(`Join ${familyName} on Shajara`)}&body=${encodeURIComponent(`You have been invited to ${familyName} on Shajara as ${ROLE_LABELS[role]}. Join here: ${link}`)}`;
      toast.success(t('invite.created'));
    } catch (err) {
      reportError(err, 'Create email invite');
      toast.error(getErrorMessage(err, t('invite.create_failed')));
    }
    finally { setCreating(false); }
  }

  async function handleDeactivate(code) {
    try {
      await deactivateInvite(code);
      await loadInvites();
      toast.success(t('invite.deactivated'));
    }
    catch (err) {
      reportError(err, 'Deactivate invite');
      toast.error(getErrorMessage(err, t('invite.deactivate_failed')));
    }
  }

  function handleCopy(code) {
    const link = `${window.location.origin}/join?code=${code}`;
    navigator.clipboard.writeText(link);
    setCopied(code);
    toast.success(t('invite.copied'));
    setTimeout(() => setCopied(''), 2000);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <h2>{familyName ? t('invite.title', { familyName }) : t('dashboard.join_family')}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'flex-end' }}>
            <div className="input-group" style={{ flex: 1 }}>
              <label>{t('invite.role_for_new_members')}</label>
              <select className="select" value={role} onChange={e => setRole(e.target.value)}>
                <option value={ROLES.VIEWER}>{t('invite.viewer')}</option>
                <option value={ROLES.EDITOR}>{t('invite.editor')}</option>
                <option value={ROLES.ADMIN}>Admin</option>
              </select>
            </div>
            <button className="btn btn-primary" onClick={handleCreate} disabled={creating}>
              <Share2 size={16} /> {creating ? t('invite.creating') : t('invite.generate_code')}
            </button>
          </div>

          <div className="invite-email-row">
            <div className="input-group">
              <label htmlFor="invite-email">Invite by email</label>
              <input id="invite-email" className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="relative@example.com" />
              <p className="field-hint">Creates a share link and opens your email app. Per-recipient pending email invites need a future schema change.</p>
            </div>
            <button className="btn btn-secondary" onClick={handleCreateEmailInvite} disabled={creating || !email.trim()}>
              <Mail size={16} /> Email invite
            </button>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: 'var(--space-md) 0' }} />

          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', fontWeight: 500, marginBottom: 'var(--space-sm)' }}>
            Pending share links
          </p>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-lg)' }}><div className="spinner"></div></div>
          ) : loadError ? (
            <div className="form-error" role="alert">
              {loadError}
            </div>
          ) : invites.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 'var(--space-lg)', fontSize: 'var(--font-size-sm)' }}>
              {t('invite.empty')}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {invites.map(inv => (
                <div key={inv.code} className="invite-list-item">
                  <div className="invite-code-row">
                    <code className="invite-code-text">{inv.code}</code>
                    <span className={`badge ${ROLE_LABELS[inv.role].toLowerCase()}`}>{ROLE_LABELS[inv.role]}</span>
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                      {inv.usedCount}/{inv.maxUses}
                    </span>
                    <div style={{ display: 'flex', gap: '2px' }}>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowQR(inv.code === showQR ? null : inv.code)} title={t('invite.qr_code')}>
                        <QrCode size={14} />
                      </button>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleCopy(inv.code)} title={t('invite.copy_link')}>
                        {copied === inv.code ? <CheckCircle size={14} style={{ color: 'var(--color-success)' }} /> : <Copy size={14} />}
                      </button>
                      {canRevoke && (
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDeactivate(inv.code)} title={t('invite.deactivate')} style={{ color: 'var(--color-danger)' }}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {showQR === inv.code && (
                    <div className="qr-container animate-fade-in" style={{ padding: 'var(--space-md)', background: 'white', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'center', marginTop: 'var(--space-sm)' }}>
                      <QRCodeSVG 
                        value={`${window.location.origin}/join?code=${inv.code}`} 
                        size={160}
                        includeMargin={true}
                        level="H"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
