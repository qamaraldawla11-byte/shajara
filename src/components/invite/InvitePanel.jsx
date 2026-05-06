import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { createInvite, getFamilyInvites, deactivateInvite } from '../../services/inviteService';
import { ROLES, ROLE_LABELS } from '../../utils/constants';
import { X, Copy, CheckCircle, Trash2, Plus } from 'lucide-react';

export default function InvitePanel({ familyId, familyName, onClose }) {
  const { user } = useAuth();
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [role, setRole] = useState(ROLES.VIEWER);
  const [copied, setCopied] = useState('');

  useEffect(() => { loadInvites(); }, []);

  async function loadInvites() {
    try {
      const data = await getFamilyInvites(familyId);
      setInvites(data.filter(i => i.isActive));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function handleCreate() {
    setCreating(true);
    try {
      await createInvite(familyId, familyName, user.uid, role);
      await loadInvites();
    } catch (err) { console.error(err); }
    finally { setCreating(false); }
  }

  async function handleDeactivate(code) {
    try { await deactivateInvite(code); await loadInvites(); }
    catch (err) { console.error(err); }
  }

  function handleCopy(code) {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(''), 2000);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <h2>Invite Members</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'flex-end' }}>
            <div className="input-group" style={{ flex: 1 }}>
              <label>Role for new members</label>
              <select className="select" value={role} onChange={e => setRole(e.target.value)}>
                <option value={ROLES.VIEWER}>Viewer</option>
                <option value={ROLES.EDITOR}>Editor</option>
              </select>
            </div>
            <button className="btn btn-primary" onClick={handleCreate} disabled={creating}>
              <Plus size={16} /> {creating ? 'Creating...' : 'Generate Code'}
            </button>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: 'var(--space-sm) 0' }} />

          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', fontWeight: 500 }}>Active Invite Codes</p>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-lg)' }}><div className="spinner"></div></div>
          ) : invites.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 'var(--space-lg)', fontSize: 'var(--font-size-sm)' }}>
              No active invite codes. Generate one above.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {invites.map(inv => (
                <div key={inv.code} className="invite-code-row">
                  <code className="invite-code-text">{inv.code}</code>
                  <span className="badge badge-accent">{ROLE_LABELS[inv.role]}</span>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                    {inv.usedCount}/{inv.maxUses}
                  </span>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleCopy(inv.code)} title="Copy">
                    {copied === inv.code ? <CheckCircle size={14} style={{ color: 'var(--color-success)' }} /> : <Copy size={14} />}
                  </button>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDeactivate(inv.code)} title="Deactivate" style={{ color: 'var(--color-danger)' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
