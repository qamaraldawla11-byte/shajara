import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';

const PersonNode = ({ data }) => {
  const { member } = data;
  const fullName = `${member.firstName} ${member.lastName || ''}`.trim();
  const initials = `${member.firstName?.[0] || ''}${member.lastName?.[0] || ''}`.toUpperCase();

  return (
    <div className={`advanced-tree-node tree-node-${member.gender}`}>
      <Handle type="target" position={Position.Top} />
      
      <div className="tree-node-avatar">{initials}</div>
      <div className="tree-node-content">
        <div className="tree-node-name">{fullName}</div>
        {member.birthDate && <div className="tree-node-date">{member.birthDate}</div>}
      </div>

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

export default memo(PersonNode);
