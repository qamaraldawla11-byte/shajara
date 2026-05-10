import React from 'react';
import { X, Calendar, User, Heart, Shield, Edit } from 'lucide-react';

export default function MemberDetailSidebar({ member, members, onClose, onEdit }) {
  if (!member) return null;

  const father = members.find(m => m.id === member.relationships?.fatherId);
  const mother = members.find(m => m.id === member.relationships?.motherId);
  const spouses = members.filter(m => (member.relationships?.spouseIds || []).includes(m.id));

  return (
    <div className="member-detail-sidebar animate-slide-left">
      <div className="sidebar-header">
        <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={20} /></button>
        <h3>Member Details</h3>
        {onEdit && (
          <button className="btn btn-ghost btn-icon" onClick={() => onEdit(member)}>
            <Edit size={18} />
          </button>
        )}
      </div>

      <div className="sidebar-content">
        <div className="detail-hero">
          <div className={`detail-avatar avatar-${member.gender}`}>
            {member.firstName?.[0]}{member.lastName?.[0]}
          </div>
          <h4>{member.firstName} {member.lastName}</h4>
          <span className="badge badge-secondary">{member.gender}</span>
        </div>

        <div className="detail-section">
          <label><Calendar size={14} /> Dates</label>
          <div className="detail-row">
            <span>Born:</span>
            <span>{member.birthDate || 'Unknown'}</span>
          </div>
          {member.isDeceased && (
            <div className="detail-row text-muted">
              <span>Died:</span>
              <span>{member.deathDate || 'Unknown'}</span>
            </div>
          )}
        </div>

        <div className="detail-section">
          <label><User size={14} /> Lineage</label>
          <div className="detail-row">
            <span>Father:</span>
            <span>{father ? `${father.firstName} ${father.lastName}` : 'Unknown'}</span>
          </div>
          <div className="detail-row">
            <span>Mother:</span>
            <span>{mother ? `${mother.firstName} ${mother.lastName}` : 'Unknown'}</span>
          </div>
        </div>

        <div className="detail-section">
          <label><Heart size={14} /> Relationships</label>
          {spouses.length > 0 ? (
            spouses.map(s => (
              <div key={s.id} className="detail-row">
                <span>Spouse:</span>
                <span>{s.firstName} {s.lastName}</span>
              </div>
            ))
          ) : (
            <div className="detail-row"><span className="text-muted">No spouses recorded</span></div>
          )}
        </div>

        {member.bio && (
          <div className="detail-section">
            <label>Biography</label>
            <p className="bio-text">{member.bio}</p>
          </div>
        )}
      </div>
    </div>
  );
}
