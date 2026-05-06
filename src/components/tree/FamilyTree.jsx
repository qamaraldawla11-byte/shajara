import { buildFamilyTree } from '../../utils/treeBuilder';
import TreeNode from './TreeNode';

export default function FamilyTree({ members }) {
  const tree = buildFamilyTree(members);

  if (tree.length === 0) return null;

  return (
    <div className="family-tree">
      <div className="tree-root">
        {tree.map((node, i) => (
          <TreeNode key={node.member.id} node={node} isRoot />
        ))}
      </div>
    </div>
  );
}
