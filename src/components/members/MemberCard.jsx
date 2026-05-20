import { Edit2, Heart, Trash2, User } from 'lucide-react';

export default function MemberCard({ member, members, canEdit, canDelete, onEdit, onDelete }) {
  const memberMap = new Map();
  members.forEach((candidate) => memberMap.set(candidate.id, candidate));

  const father = member.relationships?.fatherId ? memberMap.get(member.relationships.fatherId) : null;
  const mother = member.relationships?.motherId ? memberMap.get(member.relationships.motherId) : null;
  const spouses = (member.relationships?.spouseIds || [])
    .map((id) => memberMap.get(id))
    .filter(Boolean);

  const fullName = `${member.firstName} ${member.lastName || ''}`.trim();
  const initials = `${member.firstName?.[0] || ''}${member.lastName?.[0] || ''}`.toUpperCase();

  return (
    <div className="card member-card" id={`member-${member.id}`}>
      <div className="member-card-header">
        <div className="member-card-avatar-section">
          {member.photoURL ? (
            <img src={member.photoURL} alt={fullName} className="avatar avatar-lg member-card-photo" />
          ) : (
            <div className={`avatar avatar-lg avatar-placeholder member-avatar-${member.gender}`}>
              {initials || <User size={20} />}
            </div>
          )}
          <div>
            <h3 className="member-card-name">{fullName}</h3>
            <div className="member-card-meta">
              <span className={`badge badge-${member.gender === 'male' ? 'primary' : 'accent'}`}>
                {member.gender === 'male' ? 'Male' : 'Female'}
              </span>
              {member.isAlive === false && (
                <span className="badge badge-danger">Deceased</span>
              )}
            </div>
          </div>
        </div>

        <div className="member-card-actions">
          {canEdit && (
            <button className="btn btn-ghost btn-icon btn-sm" onClick={onEdit} title="Edit">
              <Edit2 size={15} />
            </button>
          )}
          {canDelete && (
            <button className="btn btn-ghost btn-icon btn-sm danger-action" onClick={onDelete} title="Delete">
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      <div className="member-card-relations">
        {father && (
          <div className="member-relation">
            <span className="member-relation-label">Father:</span>
            <span>{father.firstName} {father.lastName || ''}</span>
          </div>
        )}
        {mother && (
          <div className="member-relation">
            <span className="member-relation-label">Mother:</span>
            <span>{mother.firstName} {mother.lastName || ''}</span>
          </div>
        )}
        {spouses.length > 0 && (
          <div className="member-relation">
            <span className="member-relation-label">
              <Heart size={12} /> Spouse{spouses.length > 1 ? 's' : ''}:
            </span>
            <span>{spouses.map((spouse) => `${spouse.firstName} ${spouse.lastName || ''}`).join(', ')}</span>
          </div>
        )}
      </div>

      {member.birthDate && (
        <div className="member-card-date">
          Born: {member.birthDate}
          {member.deathDate && ` - Died: ${member.deathDate}`}
        </div>
      )}
    </div>
  );
}
