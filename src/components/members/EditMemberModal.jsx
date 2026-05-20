import { useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { updateMember } from '../../services/memberService';
import { uploadMemberPhoto } from '../../services/storageService';
import { reportError, getErrorMessage } from '../../services/errorService';
import { useToast } from '../../contexts/ToastContext';
import { useTranslation } from 'react-i18next';

export default function EditMemberModal({ familyId, member, members, onClose, onUpdated }) {
  const toast = useToast();
  const { t } = useTranslation();
  const [form, setForm] = useState({
    firstName: member.firstName || '',
    lastName: member.lastName || '',
    gender: member.gender || 'male',
    birthDate: member.birthDate || '',
    deathDate: member.deathDate || '',
    isAlive: member.isAlive !== false,
    fatherId: member.relationships?.fatherId || '',
    motherId: member.relationships?.motherId || '',
    spouseIds: member.relationships?.spouseIds || [],
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(member.photoURL || '');
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
    setPhotoPreview(file ? URL.createObjectURL(file) : member.photoURL || '');
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
      const photoURL = photoFile ? await uploadMemberPhoto({ familyId, file: photoFile }) : member.photoURL;

      await updateMember(familyId, member.id, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        gender: form.gender,
        birthDate: form.birthDate || null,
        deathDate: form.isAlive ? null : form.deathDate || null,
        isAlive: form.isAlive,
        photoURL,
        relationships: {
          fatherId: form.fatherId || null,
          motherId: form.motherId || null,
          spouseIds: form.spouseIds,
        },
      });

      await onUpdated();
      toast.success(t('member.member_updated'));
      onClose();
    } catch (err) {
      reportError(err, 'Update member');
      const message = getErrorMessage(err, t('member.update_failed'));
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  const otherMembers = members.filter((candidate) => candidate.id !== member.id);
  const males = otherMembers.filter((candidate) => candidate.gender === 'male');
  const females = otherMembers.filter((candidate) => candidate.gender === 'female');
  const potentialSpouses = otherMembers.filter((candidate) => candidate.gender !== form.gender);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>{t('member.edit_member_title')}</h2>
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
                <label htmlFor="edit-photo">{t('member.profile_image')}</label>
                <input id="edit-photo" className="input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handlePhotoChange} />
                <p className="field-hint">{t('member.photo_hint')}</p>
              </div>
            </div>

            <div className="form-grid-2">
              <div className="input-group">
                <label>{t('member.first_name')} *</label>
                <input className="input" value={form.firstName} onChange={(event) => handleChange('firstName', event.target.value)} autoFocus />
              </div>
              <div className="input-group">
                <label>{t('member.last_name')}</label>
                <input className="input" value={form.lastName} onChange={(event) => handleChange('lastName', event.target.value)} />
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
                <label>{t('member.birth_date')}</label>
                <input className="input" type="date" value={form.birthDate} onChange={(event) => handleChange('birthDate', event.target.value)} />
              </div>
              <div className="input-group">
                <label className="checkbox-label">
                  <input type="checkbox" checked={form.isAlive} onChange={(event) => handleChange('isAlive', event.target.checked)} /> {t('member.alive')}
                </label>
                {!form.isAlive && <input className="input" type="date" value={form.deathDate} onChange={(event) => handleChange('deathDate', event.target.value)} />}
              </div>
            </div>

            {otherMembers.length > 0 && (
              <>
                <hr className="form-separator" />
                <p className="form-section-label">{t('member.relationships')}</p>
                <div className="form-grid-2">
                  <div className="input-group">
                    <label>{t('member.father')}</label>
                    <select className="select" value={form.fatherId} onChange={(event) => handleChange('fatherId', event.target.value)}>
                      <option value="">{t('member.none')}</option>
                      {males.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.firstName} {candidate.lastName || ''}</option>)}
                    </select>
                  </div>
                  <div className="input-group">
                    <label>{t('member.mother')}</label>
                    <select className="select" value={form.motherId} onChange={(event) => handleChange('motherId', event.target.value)}>
                      <option value="">{t('member.none')}</option>
                      {females.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.firstName} {candidate.lastName || ''}</option>)}
                    </select>
                  </div>
                </div>
                {potentialSpouses.length > 0 && (
                  <div className="input-group">
                    <label>{t('member.spouses')}</label>
                    <div className="spouse-list">
                      {potentialSpouses.map((candidate) => (
                        <label key={candidate.id} className="spouse-checkbox">
                          <input type="checkbox" checked={form.spouseIds.includes(candidate.id)} onChange={() => toggleSpouse(candidate.id)} />
                          <span>{candidate.firstName} {candidate.lastName || ''}</span>
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
            <button type="submit" className="btn btn-primary" disabled={loading || !form.firstName.trim()}>
              {loading ? t('member.saving') : t('member.save_changes')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
