import { useEffect, useRef } from 'react';
import { buildFamilyTree } from '../../utils/treeBuilder';
import TreeNode from './TreeNode';

export default function FamilyTree({ members }) {
  const treeRef = useRef(null);
  const tree = buildFamilyTree(members);

  useEffect(() => {
    const container = treeRef.current?.closest('.tree-container');
    if (!container) return;
    container.scrollLeft = Math.max(0, (container.scrollWidth - container.clientWidth) / 2);
  }, [members]);

  if (tree.length === 0) return null;

  return (
    <div ref={treeRef} className="family-tree">
      <div className="tree-root">
        {tree.map((node) => (
          <TreeNode key={node.member.id} node={node} isRoot />
        ))}
      </div>
    </div>
  );
}
