import { useState } from 'react';
import { updateMember } from '../../services/memberService';
import { X } from 'lucide-react';

export default function EditMemberModal({ familyId, member, members, onClose, onUpdated }) {
  const [form, setForm] = useState({
    firstName: member.firstName || '', lastName: member.lastName || '',
    gender: member.gender || 'male', birthDate: member.birthDate || '',
    deathDate: member.deathDate || '', isAlive: member.isAlive !== false,
    fatherId: member.relationships?.fatherId || '',
    motherId: member.relationships?.motherId || '',
    spouseIds: member.relationships?.spouseIds || [],
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
      await updateMember(familyId, member.id, {
        firstName: form.firstName.trim(), lastName: form.lastName.trim(),
        gender: form.gender, birthDate: form.birthDate || null,
        deathDate: form.isAlive ? null : form.deathDate || null,
        isAlive: form.isAlive,
        relationships: {
          fatherId: form.fatherId || null,
          motherId: form.motherId || null,
          spouseIds: form.spouseIds,
        },
      });
      onUpdated(); onClose();
    } catch (err) { setError('Failed to update member.'); console.error(err); }
    finally { setLoading(false); }
  }

  const otherMembers = members.filter(m => m.id !== member.id);
  const males = otherMembers.filter(m => m.gender === 'male');
  const females = otherMembers.filter(m => m.gender === 'female');
  const potentialSpouses = otherMembers.filter(m => m.gender !== form.gender);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
        <div className="modal-header">
          <h2>Edit Member</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="form-error">{error}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
              <div className="input-group">
                <label>First Name *</label>
                <input className="input" value={form.firstName} onChange={e => handleChange('firstName', e.target.value)} autoFocus />
              </div>
              <div className="input-group">
                <label>Last Name</label>
                <input className="input" value={form.lastName} onChange={e => handleChange('lastName', e.target.value)} />
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
                <label>Birth Date</label>
                <input className="input" type="date" value={form.birthDate} onChange={e => handleChange('birthDate', e.target.value)} />
              </div>
              <div className="input-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                  <input type="checkbox" checked={form.isAlive} onChange={e => handleChange('isAlive', e.target.checked)} /> Alive
                </label>
                {!form.isAlive && <input className="input" type="date" value={form.deathDate} onChange={e => handleChange('deathDate', e.target.value)} />}
              </div>
            </div>
            {otherMembers.length > 0 && (<>
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
            <button type="submit" className="btn btn-primary" disabled={loading || !form.firstName.trim()}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
