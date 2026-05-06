import { Heart } from 'lucide-react';

export default function TreeNode({ node, isRoot }) {
  const { member, spouses, children } = node;
  const fullName = `${member.firstName} ${member.lastName || ''}`.trim();
  const initials = `${member.firstName?.[0] || ''}${member.lastName?.[0] || ''}`.toUpperCase();

  return (
    <div className="tree-node-wrapper">
      <div className="tree-couple">
        {/* Main person */}
        <div className={`tree-node tree-node-${member.gender}`}>
          <div className="tree-node-avatar">{initials}</div>
          <div className="tree-node-name">{fullName}</div>
          {member.birthDate && <div className="tree-node-date">{member.birthDate}</div>}
          {member.isAlive === false && <div className="tree-node-deceased">✝</div>}
        </div>

        {/* Spouses */}
        {spouses.map(spouse => {
          const sName = `${spouse.firstName} ${spouse.lastName || ''}`.trim();
          const sInitials = `${spouse.firstName?.[0] || ''}${spouse.lastName?.[0] || ''}`.toUpperCase();
          return (
            <div key={spouse.id} className="tree-spouse-connector">
              <Heart size={12} className="tree-heart" />
              <div className={`tree-node tree-node-${spouse.gender}`}>
                <div className="tree-node-avatar">{sInitials}</div>
                <div className="tree-node-name">{sName}</div>
                {spouse.birthDate && <div className="tree-node-date">{spouse.birthDate}</div>}
                {spouse.isAlive === false && <div className="tree-node-deceased">✝</div>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Children */}
      {children && children.length > 0 && (
        <div className="tree-children">
          <div className="tree-connector-line"></div>
          <div className="tree-children-row">
            {children.map(child => (
              <TreeNode key={child.member.id} node={child} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
