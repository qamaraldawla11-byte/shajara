// ============================================
// Create Family Modal
// ============================================

import { useState } from 'react';
import { createFamily } from '../../services/familyService';
import { reportError, getErrorMessage } from '../../services/errorService';
import { useToast } from '../../contexts/ToastContext';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function CreateFamilyModal({ onClose, onCreated }) {
  const toast = useToast();
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError(t('family_form.family_name_required'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      await createFamily(name.trim(), description.trim());
      await onCreated();
      toast.success(t('family_form.created'));
      onClose();
    } catch (err) {
      reportError(err, 'Create family');
      const message = getErrorMessage(err, t('family_form.create_failed'));
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
          <h2>{t('family_form.create_title')}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="form-error">{error}</div>}

            <div className="input-group">
              <label htmlFor="family-name">{t('family_form.family_name')} *</label>
              <input
                id="family-name"
                className="input"
                type="text"
                placeholder={t('family_form.family_name_placeholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                maxLength={60}
              />
            </div>

            <div className="input-group">
              <label htmlFor="family-desc">{t('family_form.description')}</label>
              <input
                id="family-desc"
                className="input"
                type="text"
                placeholder={t('family_form.description_placeholder')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={200}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !name.trim()}
              id="create-family-submit"
            >
              {loading ? t('family_form.creating') : t('dashboard.create_family')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
