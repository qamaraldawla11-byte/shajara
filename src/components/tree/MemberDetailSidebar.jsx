import { X, Calendar, User, Heart, Edit, Plus, Trash2, Baby, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function MemberDetailSidebar({ member, members, onClose, canAdd, canEdit, canDelete, onAddRelative, onEdit, onDelete }) {
  const { t } = useTranslation();
  if (!member) return null;

  const father = members.find(m => m.id === member.relationships?.fatherId);
  const mother = members.find(m => m.id === member.relationships?.motherId);
  const spouses = members.filter(m => (member.relationships?.spouseIds || []).includes(m.id));
  const children = members.filter(m => m.relationships?.fatherId === member.id || m.relationships?.motherId === member.id);
  const fullName = `${member.firstName} ${member.lastName || ''}`.trim();

  return (
    <div className="member-detail-sidebar animate-slide-left">
      <div className="sidebar-header">
        <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={20} /></button>
        <h3>{t('member.details')}</h3>
        {canEdit && onEdit && (
          <button className="btn btn-ghost btn-icon" onClick={() => onEdit(member)} title={t('member.edit_member')} aria-label={t('member.edit_member')}>
            <Edit size={18} />
          </button>
        )}
      </div>

      <div className="sidebar-content">
        <div className="detail-hero">
          <div className={`detail-avatar avatar-${member.gender}`}>
            {member.photoURL ? <img src={member.photoURL} alt={fullName} /> : `${member.firstName?.[0] || ''}${member.lastName?.[0] || ''}`}
          </div>
          <h4 dir="auto">{fullName}</h4>
          <div className="detail-badges">
            <span className="badge badge-secondary">{member.gender === 'female' ? t('tree.female') : t('tree.male')}</span>
            <span className={`badge ${member.isAlive === false ? 'badge-danger' : 'badge-primary'}`}>
              {member.isAlive === false ? t('tree.remembered') : t('tree.living')}
            </span>
          </div>
        </div>

        {(canAdd || canEdit || canDelete) && (
          <div className="detail-actions">
            {canEdit && <button className="btn btn-secondary btn-sm" onClick={() => onEdit?.(member)}><Edit size={14} /> {t('common.edit')}</button>}
            {canAdd && (
              <div className="add-relative-actions">
                <button className="btn btn-secondary btn-sm" onClick={() => onAddRelative?.(member, 'father')}><Plus size={14} /> {t('member.add_father')}</button>
                <button className="btn btn-secondary btn-sm" onClick={() => onAddRelative?.(member, 'mother')}><Plus size={14} /> {t('member.add_mother')}</button>
                <button className="btn btn-secondary btn-sm" onClick={() => onAddRelative?.(member, 'spouse')}><Plus size={14} /> {t('member.add_spouse')}</button>
                <button className="btn btn-secondary btn-sm" onClick={() => onAddRelative?.(member, 'child')}><Plus size={14} /> {t('member.add_child')}</button>
              </div>
            )}
            {canDelete && <button className="btn btn-danger btn-sm" onClick={() => onDelete?.(member)}><Trash2 size={14} /> {t('common.remove')}</button>}
          </div>
        )}

        <div className="detail-section">
          <label><Calendar size={14} /> {t('member.dates')}</label>
          <div className="detail-row">
            <span>{t('member.born')}:</span>
            <span>{member.birthDate || t('common.unknown')}</span>
          </div>
          {member.isAlive === false && (
            <div className="detail-row text-muted">
              <span>{t('member.died')}:</span>
              <span>{member.deathDate || t('common.unknown')}</span>
            </div>
          )}
        </div>

        <div className="detail-section">
          <label><User size={14} /> {t('member.lineage')}</label>
          <div className="detail-row">
            <span>{t('member.father')}:</span>
            <span dir="auto">{father ? `${father.firstName} ${father.lastName}` : t('common.unknown')}</span>
          </div>
          <div className="detail-row">
            <span>{t('member.mother')}:</span>
            <span dir="auto">{mother ? `${mother.firstName} ${mother.lastName}` : t('common.unknown')}</span>
          </div>
        </div>

        <div className="detail-section">
          <label><Heart size={14} /> {t('member.relationships')}</label>
          {spouses.length > 0 ? (
            spouses.map(s => (
              <div key={s.id} className="detail-row">
                <span>{t('member.add_spouse')}:</span>
                <span dir="auto">{s.firstName} {s.lastName}</span>
              </div>
            ))
          ) : (
            <div className="detail-row"><span className="text-muted">{t('member.no_spouses')}</span></div>
          )}
        </div>

        <div className="detail-section">
          <label><Baby size={14} /> {t('member.children')}</label>
          {children.length > 0 ? (
            children.map(child => (
              <div key={child.id} className="detail-row">
                <span>{t('member.child')}:</span>
                <span dir="auto">{child.firstName} {child.lastName || ''}</span>
              </div>
            ))
          ) : (
            <div className="detail-row"><span className="text-muted">{t('member.no_children')}</span></div>
          )}
        </div>

        {(member.bio || member.notes) && (
          <div className="detail-section">
            <label><Users size={14} /> {t('member.notes')}</label>
            <p className="bio-text">{member.bio || member.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
