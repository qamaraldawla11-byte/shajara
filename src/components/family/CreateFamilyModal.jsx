// ============================================
// Create Family Modal
// ============================================

import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { createFamily } from '../../services/familyService';
import { X } from 'lucide-react';

export default function CreateFamilyModal({ onClose, onCreated }) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Family name is required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await createFamily(name.trim(), description.trim(), user.uid);
      onCreated();
      onClose();
    } catch (err) {
      setError('Failed to create family. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Family</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="form-error">{error}</div>}

            <div className="input-group">
              <label htmlFor="family-name">Family Name *</label>
              <input
                id="family-name"
                className="input"
                type="text"
                placeholder="e.g., The Al-Rashid Family"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                maxLength={60}
              />
            </div>

            <div className="input-group">
              <label htmlFor="family-desc">Description (optional)</label>
              <input
                id="family-desc"
                className="input"
                type="text"
                placeholder="A brief description of this family"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={200}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !name.trim()}
              id="create-family-submit"
            >
              {loading ? 'Creating...' : 'Create Family'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
