// ============================================
// Family Card — Dashboard family display
// ============================================

import { Users, Calendar, ChevronRight } from 'lucide-react';

export default function FamilyCard({ family, onClick }) {
  const createdDate = family.createdAt?.toDate
    ? family.createdAt.toDate().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Recently';

  return (
    <div className="card family-card" onClick={onClick} id={`family-card-${family.id}`}>
      <div className="family-card-header">
        <div className="family-card-icon">
          <Users size={24} />
        </div>
        <ChevronRight size={18} className="family-card-arrow" />
      </div>

      <h3 className="family-card-name">{family.name}</h3>
      {family.description && (
        <p className="family-card-desc">{family.description}</p>
      )}

      <div className="family-card-footer">
        <div className="family-card-stat">
          <Users size={14} />
          <span>{family.memberCount || 0} members</span>
        </div>
        <div className="family-card-stat">
          <Calendar size={14} />
          <span>{createdDate}</span>
        </div>
      </div>
    </div>
  );
}
