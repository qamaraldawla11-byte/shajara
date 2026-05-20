import { Heart, UserRound, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

function PersonCard({ member, relationHint }) {
  const { t } = useTranslation();
  const fullName = `${member.firstName} ${member.lastName || ''}`.trim();
  const initials = `${member.firstName?.[0] || ''}${member.lastName?.[0] || ''}`.toUpperCase();
  const genderLabel = member.gender === 'female' ? t('tree.female') : t('tree.male');

  return (
    <div className={`tree-node tree-node-${member.gender} organic-person-node`}>
      <div className="organic-portrait-wrap">
        {member.photoURL ? (
          <img src={member.photoURL} alt={fullName} className="tree-node-avatar tree-node-photo" />
        ) : (
          <div className="tree-node-avatar">{initials}</div>
        )}
      </div>
      <div className="tree-node-name organic-name-ribbon" dir="auto">{fullName}</div>
      <div className="tree-node-meta">
        <span><Users size={12} /> {genderLabel}</span>
        <span className={member.isAlive === false ? 'is-remembered' : 'is-living'}>
          {member.isAlive === false ? t('tree.remembered') : t('tree.living')}
        </span>
      </div>
      <div className="tree-node-hints">
        {relationHint && <span><UserRound size={11} /> {relationHint}</span>}
        {member.birthDate && <span>{member.birthDate}{member.deathDate ? ` - ${member.deathDate}` : ''}</span>}
      </div>
    </div>
  );
}

export default function TreeNode({ node, isRoot }) {
  const { t } = useTranslation();
  const { member, spouses, children } = node;

  return (
    <div className="tree-node-wrapper">
      <div className="tree-couple">
        <PersonCard member={member} relationHint={isRoot ? t('tree.root_branch') : t('tree.descendant')} />

        {spouses.map((spouse) => (
          <div key={spouse.id} className="tree-spouse-connector">
            <Heart size={12} className="tree-heart" />
            <PersonCard member={spouse} relationHint={t('tree.spouse')} />
          </div>
        ))}
      </div>

      {children && children.length > 0 && (
        <div className="tree-children">
          <div className="tree-connector-line"></div>
          <div className="tree-children-row">
            {children.map((child) => (
              <TreeNode key={child.member.id} node={child} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
