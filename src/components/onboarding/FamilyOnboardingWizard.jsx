import { useMemo, useState } from 'react';
import { Baby, CheckCircle, Heart, Send, TreePine, UserPlus, Users, X } from 'lucide-react';
import { createFamily, getUserFamilies } from '../../services/familyService';
import { addMember, updateMember } from '../../services/memberService';
import { createInvite } from '../../services/inviteService';
import { ROLES } from '../../utils/constants';
import { getErrorMessage, reportError } from '../../services/errorService';
import { useToast } from '../../contexts/ToastContext';

const BLANK_PERSON = { firstName: '', lastName: '', gender: 'male' };

export default function FamilyOnboardingWizard({ onClose, onFinished }) {
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [familyName, setFamilyName] = useState('');
  const [description, setDescription] = useState('');
  const [ancestor, setAncestor] = useState(BLANK_PERSON);
  const [relatives, setRelatives] = useState({
    father: { ...BLANK_PERSON, gender: 'male' },
    mother: { ...BLANK_PERSON, gender: 'female' },
    spouse: { ...BLANK_PERSON, gender: 'female' },
    child: { ...BLANK_PERSON, gender: 'male' },
  });
  const [inviteEmail, setInviteEmail] = useState('');
  const [familyId, setFamilyId] = useState('');
  const [ancestorId, setAncestorId] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canContinue = useMemo(() => {
    if (step === 0) return familyName.trim().length > 1;
    if (step === 1) return ancestor.firstName.trim().length > 0;
    return true;
  }, [ancestor.firstName, familyName, step]);

  function updateRelative(key, field, value) {
    setRelatives((current) => ({ ...current, [key]: { ...current[key], [field]: value } }));
  }

  async function ensureFamily() {
    if (familyId) return familyId;
    const created = await createFamily(familyName.trim(), description.trim());
    const createdId = created?.id || created?.family_id || (typeof created === 'string' ? created : '');
    if (createdId) return createdId;
    const families = await getUserFamilies();
    return families.find((family) => family.name === familyName.trim())?.id || families[0]?.id;
  }

  async function handleCreateCore() {
    setLoading(true);
    setError('');
    try {
      const nextFamilyId = await ensureFamily();
      if (!nextFamilyId) throw new Error('Family was created, but its id could not be resolved.');
      setFamilyId(nextFamilyId);

      if (!ancestorId) {
        const nextAncestorId = await addMember(nextFamilyId, {
          firstName: ancestor.firstName.trim(),
          lastName: ancestor.lastName.trim(),
          gender: ancestor.gender,
          isAlive: true,
          spouseIds: [],
        });
        setAncestorId(nextAncestorId);
      }
      setStep(2);
      toast.success('Family started. Add a few close relatives next.');
    } catch (err) {
      reportError(err, 'Onboarding create family');
      setError(getErrorMessage(err, 'Could not start your family.'));
    } finally {
      setLoading(false);
    }
  }

  async function handleQuickAdd() {
    setLoading(true);
    setError('');
    try {
      const createdRelatives = {};
      for (const key of ['father', 'mother', 'spouse', 'child']) {
        const person = relatives[key];
        if (!person.firstName.trim()) continue;
        createdRelatives[key] = await addMember(familyId, {
          firstName: person.firstName.trim(),
          lastName: person.lastName.trim() || ancestor.lastName.trim(),
          gender: person.gender,
          isAlive: true,
          fatherId: key === 'child' && ancestor.gender === 'male' ? ancestorId : null,
          motherId: key === 'child' && ancestor.gender === 'female' ? ancestorId : null,
          spouseIds: key === 'spouse' ? [ancestorId] : [],
        });
      }

      await updateMember(familyId, ancestorId, {
        fatherId: createdRelatives.father || null,
        motherId: createdRelatives.mother || null,
        spouseIds: createdRelatives.spouse ? [createdRelatives.spouse] : [],
      });

      setStep(3);
      toast.success('Relatives added.');
    } catch (err) {
      reportError(err, 'Onboarding quick add');
      setError(getErrorMessage(err, 'Could not add relatives.'));
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite() {
    setLoading(true);
    setError('');
    try {
      const invite = await createInvite(familyId, ROLES.EDITOR);
      const code = invite?.code || invite;
      const link = `${window.location.origin}/join?code=${code}`;
      setInviteLink(link);
      if (inviteEmail.trim()) {
        window.location.href = `mailto:${encodeURIComponent(inviteEmail.trim())}?subject=${encodeURIComponent('Join my Shajara family tree')}&body=${encodeURIComponent(`I started our family tree on Shajara. Join here: ${link}`)}`;
      }
      setStep(4);
    } catch (err) {
      reportError(err, 'Onboarding invite');
      setError(getErrorMessage(err, 'Could not create invite link.'));
    } finally {
      setLoading(false);
    }
  }

  function finish() {
    onFinished?.(familyId);
    onClose();
  }

  return (
    <div className="modal-overlay onboarding-overlay" onClick={onClose}>
      <div className="modal onboarding-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Start your family tree</h2>
            <p className="modal-subtitle">A guided setup you can finish in a minute.</p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>

        <div className="onboarding-steps" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((item) => <span key={item} className={item <= step ? 'active' : ''} />)}
        </div>

        <div className="modal-body onboarding-body">
          {error && <div className="form-error">{error}</div>}

          {step === 0 && (
            <section className="onboarding-step">
              <TreePine size={42} />
              <h3>Name the family space</h3>
              <input className="input" value={familyName} onChange={(event) => setFamilyName(event.target.value)} placeholder="The Al-Rashid Family" autoFocus />
              <input className="input" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Optional short description" />
            </section>
          )}

          {step === 1 && (
            <section className="onboarding-step">
              <Users size={42} />
              <h3>Add the first ancestor or starting person</h3>
              <div className="form-grid-2">
                <input className="input" value={ancestor.firstName} onChange={(event) => setAncestor({ ...ancestor, firstName: event.target.value })} placeholder="First name" autoFocus />
                <input className="input" value={ancestor.lastName} onChange={(event) => setAncestor({ ...ancestor, lastName: event.target.value })} placeholder="Last name" />
              </div>
              <div className="gender-selector">
                <button type="button" className={`gender-option ${ancestor.gender === 'male' ? 'active male' : ''}`} onClick={() => setAncestor({ ...ancestor, gender: 'male' })}>Male</button>
                <button type="button" className={`gender-option ${ancestor.gender === 'female' ? 'active female' : ''}`} onClick={() => setAncestor({ ...ancestor, gender: 'female' })}>Female</button>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="onboarding-step">
              <UserPlus size={42} />
              <h3>Quick-add close relatives</h3>
              {['father', 'mother', 'spouse', 'child'].map((key) => (
                <div className="quick-relative-row" key={key}>
                  {key === 'child' ? <Baby size={16} /> : key === 'spouse' ? <Heart size={16} /> : <Users size={16} />}
                  <span>{key}</span>
                  <input className="input" value={relatives[key].firstName} onChange={(event) => updateRelative(key, 'firstName', event.target.value)} placeholder="First name" />
                  <input className="input" value={relatives[key].lastName} onChange={(event) => updateRelative(key, 'lastName', event.target.value)} placeholder="Last name" />
                </div>
              ))}
              <p className="field-hint">Leave any row blank to skip it.</p>
            </section>
          )}

          {step === 3 && (
            <section className="onboarding-step">
              <Send size={42} />
              <h3>Invite a trusted relative</h3>
              <input className="input" type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="relative@example.com" />
              <p className="field-hint">This creates a secure join link. Email sending opens your mail app; no new invite-email table was added.</p>
            </section>
          )}

          {step === 4 && (
            <section className="onboarding-step">
              <CheckCircle size={42} />
              <h3>Your family tree is ready</h3>
              {inviteLink && <input className="input" readOnly value={inviteLink} onFocus={(event) => event.target.select()} />}
              <p className="field-hint">Continue building the tree from the family workspace.</p>
            </section>
          )}
        </div>

        <div className="modal-footer">
          {step > 0 && step < 4 && <button className="btn btn-secondary" onClick={() => setStep(step - 1)} disabled={loading}>Back</button>}
          {step === 0 && <button className="btn btn-secondary" onClick={onClose}>Skip</button>}
          {step === 0 && <button className="btn btn-primary" onClick={() => setStep(1)} disabled={!canContinue}>Next</button>}
          {step === 1 && <button className="btn btn-primary" onClick={handleCreateCore} disabled={loading || !canContinue}>{loading ? 'Creating...' : 'Create tree'}</button>}
          {step === 2 && <button className="btn btn-primary" onClick={handleQuickAdd} disabled={loading}>{loading ? 'Adding...' : 'Add relatives'}</button>}
          {step === 3 && <button className="btn btn-primary" onClick={handleInvite} disabled={loading}>{loading ? 'Creating...' : 'Create invite'}</button>}
          {step === 4 && <button className="btn btn-primary" onClick={finish}>Open family</button>}
        </div>
      </div>
    </div>
  );
}
