import { useState } from 'react';
import { addMember } from '../../services/memberService';
import { X } from 'lucide-react';
import { reportError, getErrorMessage } from '../../services/errorService';
import { useToast } from '../../contexts/ToastContext';

export default function AddMemberModal({ familyId, members, onClose, onAdded }) {
  const toast = useToast();
  const [form, setForm] = useState({
    firstName: '', lastName: '', gender: 'male',
    birthDate: '', deathDate: '', isAlive: true,
    fatherId: '', motherId: '', spouseIds: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (f, v) => setForm(p => ({ ...p, [f]: v }));
  const toggleSpouse = (id) => setForm(p => ({
    ...p, spouseIds: p.spouseIds.includes(id) ? p.spouseIds.filter(i => i !== id) : [...p.spouseIds, id]
  }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.firstName.trim()) { setError('First name is required.'); return; }
    setLoading(true); setError('');
    try {
      await addMember(familyId, {
        firstName: form.firstName.trim(), lastName: form.lastName.trim(),
        gender: form.gender, birthDate: form.birthDate || null,
        deathDate: form.isAlive ? null : form.deathDate || null,
        isAlive: form.isAlive, fatherId: form.fatherId || null,
        motherId: form.motherId || null, spouseIds: form.spouseIds,
      });
      await onAdded();
      toast.success('Member added.');
      onClose();
    } catch (err) {
      reportError(err, 'Add member');
      const message = getErrorMessage(err, 'Failed to add member.');
      setError(message);
      toast.error(message);
    }
    finally { setLoading(false); }
  }

  const males = members.filter(m => m.gender === 'male');
  const females = members.filter(m => m.gender === 'female');
  const potentialSpouses = members.filter(m => m.gender !== form.gender);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
        <div className="modal-header">
          <h2>Add Family Member</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="form-error">{error}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
              <div className="input-group">
                <label htmlFor="add-fn">First Name *</label>
                <input id="add-fn" className="input" value={form.firstName} onChange={e => handleChange('firstName', e.target.value)} autoFocus />
              </div>
              <div className="input-group">
                <label htmlFor="add-ln">Last Name</label>
                <input id="add-ln" className="input" value={form.lastName} onChange={e => handleChange('lastName', e.target.value)} />
              </div>
            </div>
            <div className="input-group">
              <label>Gender *</label>
              <div className="gender-selector">
                <button type="button" className={`gender-option ${form.gender === 'male' ? 'active male' : ''}`} onClick={() => handleChange('gender', 'male')}>♂ Male</button>
                <button type="button" className={`gender-option ${form.gender === 'female' ? 'active female' : ''}`} onClick={() => handleChange('gender', 'female')}>♀ Female</button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
              <div className="input-group">
                <label htmlFor="add-bd">Birth Date</label>
                <input id="add-bd" className="input" type="date" value={form.birthDate} onChange={e => handleChange('birthDate', e.target.value)} />
              </div>
              <div className="input-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                  <input type="checkbox" checked={form.isAlive} onChange={e => handleChange('isAlive', e.target.checked)} /> Alive
                </label>
                {!form.isAlive && <input className="input" type="date" value={form.deathDate} onChange={e => handleChange('deathDate', e.target.value)} />}
              </div>
            </div>
            {members.length > 0 && (<>
              <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)' }} />
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', fontWeight: 500 }}>Relationships</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                <div className="input-group">
                  <label>Father</label>
                  <select className="select" value={form.fatherId} onChange={e => handleChange('fatherId', e.target.value)}>
                    <option value="">— None —</option>
                    {males.map(m => <option key={m.id} value={m.id}>{m.firstName} {m.lastName||''}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label>Mother</label>
                  <select className="select" value={form.motherId} onChange={e => handleChange('motherId', e.target.value)}>
                    <option value="">— None —</option>
                    {females.map(m => <option key={m.id} value={m.id}>{m.firstName} {m.lastName||''}</option>)}
                  </select>
                </div>
              </div>
              {potentialSpouses.length > 0 && (
                <div className="input-group">
                  <label>Spouse(s)</label>
                  <div className="spouse-list">
                    {potentialSpouses.map(m => (
                      <label key={m.id} className="spouse-checkbox">
                        <input type="checkbox" checked={form.spouseIds.includes(m.id)} onChange={() => toggleSpouse(m.id)} />
                        <span>{m.firstName} {m.lastName||''}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </>)}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading || !form.firstName.trim()} id="add-member-submit">
              {loading ? 'Adding...' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
