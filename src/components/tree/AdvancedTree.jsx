import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap,
  Position,
  useNodesState,
  useEdgesState,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';

import PersonNode from './nodes/PersonNode';
import MemberDetailSidebar from './MemberDetailSidebar';

const nodeTypes = {
  person: PersonNode,
};

const NODE_WIDTH = 280;
const SPOUSE_GAP = 34;
const CLUSTER_GAP = 140;
const GENERATION_GAP = 285;
const COMPACT_ZOOM_THRESHOLD = 0.58;

function getRelationshipHealth(members) {
  const ids = new Set(members.map((member) => member.id));
  const missing = [];
  const cycles = [];

  members.forEach((member) => {
    ['fatherId', 'motherId'].forEach((key) => {
      const parentId = member.relationships?.[key];
      if (parentId && !ids.has(parentId)) missing.push(member.id);
    });
  });

  function visit(member, path = new Set()) {
    if (path.has(member.id)) {
      cycles.push(member.id);
      return;
    }
    const nextPath = new Set(path);
    nextPath.add(member.id);
    [member.relationships?.fatherId, member.relationships?.motherId].forEach((parentId) => {
      const parent = members.find((candidate) => candidate.id === parentId);
      if (parent) visit(parent, nextPath);
    });
  }

  members.forEach((member) => visit(member));
  return { hasIssues: missing.length > 0 || cycles.length > 0 };
}

export default function AdvancedTree({ members, canAdd, canEdit, canDelete, onAddRelative, onEdit, onDelete }) {
  const [selectedMember, setSelectedMember] = useState(null);
  const [isCompactMode, setIsCompactMode] = useState(false);

  // Convert members to React Flow nodes and edges
  const { initialNodes, initialEdges, relationshipHealth } = useMemo(() => {
    const nodes = [];
    const edges = [];
    const memberMap = new Map(members.map((member) => [member.id, member]));

    const generations = {};
    const spousePairs = new Set();

    const baseDepthCache = new Map();

    function getBaseDepth(memberId, visiting = new Set()) {
      if (baseDepthCache.has(memberId)) return baseDepthCache.get(memberId);
      const m = memberMap.get(memberId);
      if (!m || visiting.has(memberId)) return 0;

      const nextVisiting = new Set(visiting);
      nextVisiting.add(memberId);
      
      const fatherId = m.relationships?.fatherId;
      const motherId = m.relationships?.motherId;
      
      let parentDepth = 0;
      if (fatherId && memberMap.has(fatherId)) parentDepth = Math.max(parentDepth, getBaseDepth(fatherId, nextVisiting) + 1);
      if (motherId && memberMap.has(motherId)) parentDepth = Math.max(parentDepth, getBaseDepth(motherId, nextVisiting) + 1);
      
      const depth = parentDepth;
      baseDepthCache.set(memberId, depth);
      return depth;
    }

    const spouseGroupParent = new Map(members.map((member) => [member.id, member.id]));

    function findSpouseGroup(id) {
      const current = spouseGroupParent.get(id);
      if (current === id) return current;
      const root = findSpouseGroup(current);
      spouseGroupParent.set(id, root);
      return root;
    }

    function unionSpouseGroup(a, b) {
      if (!spouseGroupParent.has(a) || !spouseGroupParent.has(b)) return;
      const rootA = findSpouseGroup(a);
      const rootB = findSpouseGroup(b);
      if (rootA !== rootB) spouseGroupParent.set(rootB, rootA);
    }

    members.forEach((member) => {
      (member.relationships?.spouseIds || []).forEach((spouseId) => unionSpouseGroup(member.id, spouseId));
    });

    const spouseGroupMembers = new Map();
    members.forEach((member) => {
      const groupId = findSpouseGroup(member.id);
      if (!spouseGroupMembers.has(groupId)) spouseGroupMembers.set(groupId, []);
      spouseGroupMembers.get(groupId).push(member);
    });

    const spouseGroupDepths = new Map();
    spouseGroupMembers.forEach((groupMembers, groupId) => {
      spouseGroupDepths.set(groupId, Math.max(...groupMembers.map((member) => getBaseDepth(member.id))));
    });

    // Spouse groups are the visual unit; parent links then push whole groups below ancestors.
    for (let i = 0; i < members.length; i += 1) {
      let changed = false;
      members.forEach((member) => {
        const childGroup = findSpouseGroup(member.id);
        [member.relationships?.fatherId, member.relationships?.motherId].forEach((parentId) => {
          if (!parentId || !memberMap.has(parentId)) return;
          const parentGroup = findSpouseGroup(parentId);
          if (parentGroup === childGroup) return;

          const requiredDepth = (spouseGroupDepths.get(parentGroup) || 0) + 1;
          if (requiredDepth > (spouseGroupDepths.get(childGroup) || 0)) {
            spouseGroupDepths.set(childGroup, requiredDepth);
            changed = true;
          }
        });
      });
      if (!changed) break;
    }

    const visualDepths = new Map();
    members.forEach((member) => {
      visualDepths.set(member.id, spouseGroupDepths.get(findSpouseGroup(member.id)) || 0);
    });

    members.forEach(m => {
      const depth = visualDepths.get(m.id) || 0;
      if (!generations[depth]) generations[depth] = [];
      generations[depth].push(m);
    });

    function createGenerationClusters(generation) {
      const parent = new Map(generation.map((member) => [member.id, member.id]));

      function find(id) {
        const current = parent.get(id);
        if (current === id) return current;
        const root = find(current);
        parent.set(id, root);
        return root;
      }

      function union(a, b) {
        if (!parent.has(a) || !parent.has(b)) return;
        const rootA = find(a);
        const rootB = find(b);
        if (rootA !== rootB) parent.set(rootB, rootA);
      }

      generation.forEach((member) => {
        (member.relationships?.spouseIds || []).forEach((spouseId) => {
          if (parent.has(spouseId)) union(member.id, spouseId);
        });
      });

      const groups = new Map();
      generation.forEach((member) => {
        const root = find(member.id);
        if (!groups.has(root)) groups.set(root, []);
        groups.get(root).push(member);
      });

      return Array.from(groups.values()).map((clusterMembers) => {
        const sortedMembers = [...clusterMembers].sort((a, b) => {
          const spouseLinked = (a.relationships?.spouseIds || []).includes(b.id)
            || (b.relationships?.spouseIds || []).includes(a.id);
          if (spouseLinked) return a.gender === 'male' ? -1 : 1;
          return `${a.firstName} ${a.lastName || ''}`.localeCompare(`${b.firstName} ${b.lastName || ''}`);
        });

        const parentIds = sortedMembers.flatMap((member) => [
          member.relationships?.fatherId,
          member.relationships?.motherId,
        ]).filter((id) => id && memberMap.has(id));

        return {
          members: sortedMembers,
          width: sortedMembers.length * NODE_WIDTH + Math.max(0, sortedMembers.length - 1) * SPOUSE_GAP,
          parentIds,
          anchor: 0,
          hasParentAnchor: false,
        };
      });
    }

    const previousPositions = new Map();

    Object.keys(generations).sort((a, b) => Number(a) - Number(b)).forEach((depth, dIdx) => {
      const clusters = createGenerationClusters(generations[depth]);
      clusters.forEach((cluster) => {
        const anchors = cluster.parentIds.map((id) => previousPositions.get(id)?.x).filter((value) => Number.isFinite(value));
        cluster.anchor = anchors.length ? anchors.reduce((sum, value) => sum + value, 0) / anchors.length : 0;
        cluster.hasParentAnchor = anchors.length > 0;
      });

      clusters.sort((a, b) => a.anchor - b.anchor || (a.members[0].createdAt || '').localeCompare(b.members[0].createdAt || ''));

      const usesParentAnchors = clusters.some((cluster) => cluster.hasParentAnchor);
      const totalWidth = clusters.reduce((sum, cluster) => sum + cluster.width, 0) + Math.max(0, clusters.length - 1) * CLUSTER_GAP;
      let cursor = usesParentAnchors && clusters.length
        ? Math.min(...clusters.map((cluster) => cluster.anchor - cluster.width / 2))
        : -totalWidth / 2;

      clusters.forEach((cluster) => {
        const desiredStart = usesParentAnchors ? cluster.anchor - cluster.width / 2 : cursor;
        const clusterStart = Math.max(cursor, desiredStart);
        cluster.members.forEach((m, mIdx) => {
          const x = clusterStart + mIdx * (NODE_WIDTH + SPOUSE_GAP);
          const y = dIdx * GENERATION_GAP;
          previousPositions.set(m.id, { x, y });

          nodes.push({
            id: m.id,
            type: 'person',
            data: {
              member: m,
              canAdd,
              canEdit,
              canDelete,
              onAddRelative,
              onEdit,
              onDelete,
            },
            position: { x, y },
            sourcePosition: Position.Bottom,
            targetPosition: Position.Top,
          });
        });

        cursor += cluster.width + CLUSTER_GAP;
      });
    });

    members.forEach((m) => {
        if (m.relationships?.fatherId && memberMap.has(m.relationships.fatherId)) {
          edges.push({
            id: `e-${m.relationships.fatherId}-${m.id}`,
            source: m.relationships.fatherId,
            target: m.id,
            type: 'smoothstep',
            animated: false,
            className: 'lineage-edge lineage-edge-father branch-edge',
            style: { stroke: 'var(--tree-edge-father)', strokeWidth: 1.6 },
            markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--tree-edge-father-marker)', width: 9, height: 9 },
          });
        }
        if (m.relationships?.motherId && memberMap.has(m.relationships.motherId)) {
          edges.push({
            id: `e-${m.relationships.motherId}-${m.id}`,
            source: m.relationships.motherId,
            target: m.id,
            type: 'smoothstep',
            animated: false,
            className: 'lineage-edge lineage-edge-mother branch-edge',
            style: { stroke: 'var(--tree-edge-mother)', strokeWidth: 1.6 },
            markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--tree-edge-mother-marker)', width: 9, height: 9 },
          });
        }

        (m.relationships?.spouseIds || []).forEach(spouseId => {
          const pairId = [m.id, spouseId].sort().join('-');
          if (memberMap.has(spouseId) && !spousePairs.has(pairId)) {
            spousePairs.add(pairId);
            const memberPosition = previousPositions.get(m.id);
            const spousePosition = previousPositions.get(spouseId);
            const memberIsLeft = (memberPosition?.x || 0) <= (spousePosition?.x || 0);
            const sourceId = memberIsLeft ? m.id : spouseId;
            const targetId = memberIsLeft ? spouseId : m.id;
            edges.push({
              id: `s-${m.id}-${spouseId}`,
              source: sourceId,
              target: targetId,
              type: 'straight',
              sourceHandle: 'spouse-right',
              targetHandle: 'spouse-left',
              className: 'spouse-edge branch-edge-spouse',
              style: { stroke: 'var(--tree-edge-spouse)', strokeDasharray: '3 8', strokeWidth: 1.35 },
            });
          }
        });
    });

    return { initialNodes: nodes, initialEdges: edges, relationshipHealth: getRelationshipHealth(members) };
  }, [members, canAdd, canEdit, canDelete, onAddRelative, onEdit, onDelete]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  useEffect(() => {
    if (!selectedMember) return;
    const current = members.find((member) => member.id === selectedMember.id);
    setSelectedMember(current || null);
  }, [members, selectedMember]);

  const onNodeClick = useCallback((event, node) => {
    setSelectedMember(node.data.member);
  }, []);

  const handleMove = useCallback((event, viewport) => {
    setIsCompactMode((currentMode) => {
      const nextMode = viewport.zoom < COMPACT_ZOOM_THRESHOLD;
      return currentMode === nextMode ? currentMode : nextMode;
    });
  }, []);

  const highlightedIds = useMemo(() => {
    if (!selectedMember) return new Set();
    const ids = new Set([selectedMember.id]);

    function visitAncestors(member) {
      [member.relationships?.fatherId, member.relationships?.motherId].forEach((parentId) => {
        if (!parentId || ids.has(parentId)) return;
        const parent = members.find((candidate) => candidate.id === parentId);
        if (!parent) return;
        ids.add(parentId);
        visitAncestors(parent);
      });
    }

    function visitDescendants(memberId) {
      members.forEach((candidate) => {
        if (candidate.relationships?.fatherId === memberId || candidate.relationships?.motherId === memberId) {
          if (ids.has(candidate.id)) return;
          ids.add(candidate.id);
          visitDescendants(candidate.id);
        }
      });
    }

    visitAncestors(selectedMember);
    visitDescendants(selectedMember.id);
    return ids;
  }, [members, selectedMember]);

  const displayedNodes = useMemo(() => nodes.map((node) => ({
    ...node,
    className: highlightedIds.has(node.id) ? 'lineage-node-active' : '',
    data: {
      ...node.data,
      isCompactMode,
      isSelected: selectedMember?.id === node.id,
    },
  })), [nodes, highlightedIds, isCompactMode, selectedMember?.id]);

  const displayedEdges = useMemo(() => edges.map((edge) => {
    const isActive = highlightedIds.has(edge.source) && highlightedIds.has(edge.target);
    return {
      ...edge,
      className: `${edge.className || ''} ${isActive ? 'lineage-edge-active' : ''}`.trim(),
      style: {
        ...edge.style,
        strokeWidth: isActive ? 2.35 : edge.style?.strokeWidth,
        opacity: isActive ? 1 : edge.style?.opacity,
      },
    };
  }), [edges, highlightedIds]);

  return (
    <div className={`advanced-tree-shell ${isCompactMode ? 'tree-compact-mode' : 'tree-detailed-mode'}`}>
      <div className="advanced-tree-atmosphere" aria-hidden="true" />
      {relationshipHealth.hasIssues && (
        <div className="tree-data-hint">
          Relationship data incomplete. Some parent links point to missing members or circular ancestry, so this layout uses the safest available branches.
        </div>
      )}
      <div className="advanced-tree-canvas">
        <ReactFlow
          nodes={displayedNodes}
          edges={displayedEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onMove={handleMove}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.22, duration: 650 }}
          minZoom={0.28}
          maxZoom={1.35}
          defaultEdgeOptions={{ type: 'smoothstep' }}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="rgba(148, 163, 184, 0.18)" gap={34} size={1} />
          <Controls />
          <MiniMap pannable zoomable className="tree-minimap" />
        </ReactFlow>
      </div>

      {selectedMember && (
        <MemberDetailSidebar 
          member={selectedMember} 
          members={members}
          canAdd={canAdd}
          canEdit={canEdit}
          canDelete={canDelete}
          onAddRelative={onAddRelative}
          onEdit={onEdit}
          onDelete={onDelete}
          onClose={() => setSelectedMember(null)} 
        />
      )}
    </div>
  );
}
