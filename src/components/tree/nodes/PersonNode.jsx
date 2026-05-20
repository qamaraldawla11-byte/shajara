import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Edit3, Heart, Plus, Trash2, UserRound, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const PersonNode = ({ data }) => {
  const { t } = useTranslation();
  const { member, canAdd, canEdit, canDelete, onAddRelative, onEdit, onDelete, isCompactMode, isSelected } = data;
  const fullName = `${member.firstName} ${member.lastName || ''}`.trim();
  const initials = `${member.firstName?.[0] || ''}${member.lastName?.[0] || ''}`.toUpperCase();
  const statusLabel = member.isAlive === false ? t('tree.remembered') : t('tree.living');
  const genderLabel = member.gender === 'female' ? t('tree.female') : t('tree.male');

  const handleAction = (event, callback) => {
    event.stopPropagation();
    callback?.();
  };

  return (
    <div className={`advanced-tree-node tree-node-${member.gender} organic-person-node ${isCompactMode ? 'is-compact' : 'is-detailed'} ${isSelected ? 'is-selected' : ''}`}>
      <Handle type="target" position={Position.Top} className="lineage-handle lineage-handle-top" />
      <Handle id="spouse-left" type="target" position={Position.Left} className="spouse-handle" />
      <Handle id="spouse-right" type="source" position={Position.Right} className="spouse-handle" />
      
      <div className="organic-portrait-wrap">
        {member.photoURL ? (
          <img src={member.photoURL} alt={fullName} className="tree-node-avatar tree-node-photo" />
        ) : (
          <div className="tree-node-avatar">{initials}</div>
        )}
      </div>
      <div className="tree-node-content">
        <div className="tree-node-name organic-name-ribbon" dir="auto">{fullName}</div>
        <div className="tree-node-meta">
          <span><Users size={12} /> {genderLabel}</span>
          <span className={member.isAlive === false ? 'is-remembered' : 'is-living'}>{statusLabel}</span>
        </div>
        <div className="tree-node-hints">
          {member.birthDate && <span>{member.birthDate}</span>}
          {member.deathDate && <span>{member.deathDate}</span>}
          {(member.relationships?.spouseIds || []).length > 0 && <span><Heart size={11} /> {(member.relationships?.spouseIds || []).length}</span>}
          {(member.relationships?.fatherId || member.relationships?.motherId) && <span><UserRound size={11} /> {t('tree.parent_linked')}</span>}
        </div>
      </div>

      {(canAdd || canEdit || canDelete) && (
        <div className="tree-node-actions">
          {canAdd && (
            <button type="button" className="tree-node-action" onClick={(event) => handleAction(event, () => onAddRelative?.(member, 'child'))} title={t('member.add_child')}>
              <Plus size={13} />
            </button>
          )}
          {canEdit && (
            <button type="button" className="tree-node-action" onClick={(event) => handleAction(event, () => onEdit?.(member))} title={t('member.edit_member')}>
              <Edit3 size={13} />
            </button>
          )}
          {canDelete && (
            <button type="button" className="tree-node-action danger-action" onClick={(event) => handleAction(event, () => onDelete?.(member))} title={t('common.remove')}>
              <Trash2 size={13} />
            </button>
          )}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="lineage-handle lineage-handle-bottom" />
    </div>
  );
};

export default memo(PersonNode);
