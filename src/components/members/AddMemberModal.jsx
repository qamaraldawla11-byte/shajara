import { useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { addMember, updateMember } from '../../services/memberService';
import { uploadMemberPhoto } from '../../services/storageService';
import { reportError, getErrorMessage } from '../../services/errorService';
import { useToast } from '../../contexts/ToastContext';
import { useTranslation } from 'react-i18next';

function getInitialForm(relationContext) {
  const base = {
    firstName: '',
    lastName: '',
    gender: 'male',
    birthDate: '',
    deathDate: '',
    isAlive: true,
    fatherId: '',
    motherId: '',
    spouseIds: [],
  };

  if (!relationContext?.member) return base;

  const { member, relationType } = relationContext;
  if (relationType === 'father') return { ...base, gender: 'male', spouseIds: member.relationships?.motherId ? [member.relationships.motherId] : [] };
  if (relationType === 'mother') return { ...base, gender: 'female', spouseIds: member.relationships?.fatherId ? [member.relationships.fatherId] : [] };
  if (relationType === 'spouse') return { ...base, gender: member.gender === 'female' ? 'male' : 'female', spouseIds: [member.id] };
  if (relationType === 'child') {
    return {
      ...base,
      lastName: member.lastName || '',
      fatherId: member.gender === 'male' ? member.id : '',
      motherId: member.gender === 'female' ? member.id : '',
    };
  }
  return base;
}

export default function AddMemberModal({ familyId, members, onClose, onAdded, relationContext }) {
  const toast = useToast();
  const { t } = useTranslation();
  const [form, setForm] = useState(() => getInitialForm(relationContext));
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field, value) => setForm((previous) => ({ ...previous, [field]: value }));
  const toggleSpouse = (id) => setForm((previous) => ({
    ...previous,
    spouseIds: previous.spouseIds.includes(id)
      ? previous.spouseIds.filter((spouseId) => spouseId !== id)
      : [...previous.spouseIds, id],
  }));

  function handlePhotoChange(event) {
    const file = event.target.files?.[0] || null;
    setPhotoFile(file);
    setPhotoPreview(file ? URL.createObjectURL(file) : '');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.firstName.trim()) {
      setError(t('member.first_name_required'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const photoURL = photoFile ? await uploadMemberPhoto({ familyId, file: photoFile }) : null;

      const newMemberId = await addMember(familyId, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        gender: form.gender,
        birthDate: form.birthDate || null,
        deathDate: form.isAlive ? null : form.deathDate || null,
        isAlive: form.isAlive,
        fatherId: form.fatherId || null,
        motherId: form.motherId || null,
        spouseIds: form.spouseIds,
        photoURL,
      });

      if (relationContext?.member && newMemberId) {
        const selected = relationContext.member;
        if (relationContext.relationType === 'father') {
          await updateMember(familyId, selected.id, { fatherId: newMemberId });
        }
        if (relationContext.relationType === 'mother') {
          await updateMember(familyId, selected.id, { motherId: newMemberId });
        }
        if (relationContext.relationType === 'spouse') {
          await updateMember(familyId, selected.id, {
            spouseIds: Array.from(new Set([...(selected.relationships?.spouseIds || []), newMemberId])),
          });
        }
      }

      await onAdded();
      toast.success(t('member.member_added'));
      onClose();
    } catch (err) {
      reportError(err, 'Add member');
      const message = getErrorMessage(err, t('member.add_failed'));
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  const males = members.filter((member) => member.gender === 'male');
  const females = members.filter((member) => member.gender === 'female');
  const potentialSpouses = members.filter((member) => member.gender !== form.gender);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>{relationContext ? t('member.add_relative', { relation: t(`member.add_${relationContext.relationType}`) }) : t('member.add_member')}</h2>
          <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label={t('common.close')}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="form-error">{error}</div>}

            <div className="photo-upload-row">
              <div className="member-photo-preview">
                {photoPreview ? <img src={photoPreview} alt="" /> : <ImagePlus size={24} />}
              </div>
              <div className="input-group">
                <label htmlFor="add-photo">{t('member.profile_image')}</label>
                <input id="add-photo" className="input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handlePhotoChange} />
                <p className="field-hint">{t('member.photo_hint')}</p>
              </div>
            </div>

            <div className="form-grid-2">
              <div className="input-group">
                <label htmlFor="add-fn">{t('member.first_name')} *</label>
                <input id="add-fn" className="input" value={form.firstName} onChange={(event) => handleChange('firstName', event.target.value)} autoFocus />
              </div>
              <div className="input-group">
                <label htmlFor="add-ln">{t('member.last_name')}</label>
                <input id="add-ln" className="input" value={form.lastName} onChange={(event) => handleChange('lastName', event.target.value)} />
              </div>
            </div>

            <div className="input-group">
              <label>{t('member.gender')} *</label>
              <div className="gender-selector">
                <button type="button" className={`gender-option ${form.gender === 'male' ? 'active male' : ''}`} onClick={() => handleChange('gender', 'male')}>{t('tree.male')}</button>
                <button type="button" className={`gender-option ${form.gender === 'female' ? 'active female' : ''}`} onClick={() => handleChange('gender', 'female')}>{t('tree.female')}</button>
              </div>
            </div>

            <div className="form-grid-2">
              <div className="input-group">
                <label htmlFor="add-bd">{t('member.birth_date')}</label>
                <input id="add-bd" className="input" type="date" value={form.birthDate} onChange={(event) => handleChange('birthDate', event.target.value)} />
              </div>
              <div className="input-group">
                <label className="checkbox-label">
                  <input type="checkbox" checked={form.isAlive} onChange={(event) => handleChange('isAlive', event.target.checked)} /> {t('member.alive')}
                </label>
                {!form.isAlive && <input className="input" type="date" value={form.deathDate} onChange={(event) => handleChange('deathDate', event.target.value)} />}
              </div>
            </div>

            {members.length > 0 && (
              <>
                <hr className="form-separator" />
                <p className="form-section-label">{t('member.relationships')}</p>
                <div className="form-grid-2">
                  <div className="input-group">
                    <label>{t('member.father')}</label>
                    <select className="select" value={form.fatherId} onChange={(event) => handleChange('fatherId', event.target.value)}>
                      <option value="">{t('member.none')}</option>
                      {males.map((member) => <option key={member.id} value={member.id}>{member.firstName} {member.lastName || ''}</option>)}
                    </select>
                  </div>
                  <div className="input-group">
                    <label>{t('member.mother')}</label>
                    <select className="select" value={form.motherId} onChange={(event) => handleChange('motherId', event.target.value)}>
                      <option value="">{t('member.none')}</option>
                      {females.map((member) => <option key={member.id} value={member.id}>{member.firstName} {member.lastName || ''}</option>)}
                    </select>
                  </div>
                </div>
                {potentialSpouses.length > 0 && (
                  <div className="input-group">
                    <label>{t('member.spouses')}</label>
                    <div className="spouse-list">
                      {potentialSpouses.map((member) => (
                        <label key={member.id} className="spouse-checkbox">
                          <input type="checkbox" checked={form.spouseIds.includes(member.id)} onChange={() => toggleSpouse(member.id)} />
                          <span>{member.firstName} {member.lastName || ''}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
            <button type="submit" className="btn btn-primary" disabled={loading || !form.firstName.trim()} id="add-member-submit">
              {loading ? t('member.saving') : t('family.add_member')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
