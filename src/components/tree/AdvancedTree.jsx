import React, { useMemo, useState } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap,
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

export default function AdvancedTree({ members }) {
  const [selectedMember, setSelectedMember] = useState(null);

  // Convert members to React Flow nodes and edges
  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes = [];
    const edges = [];
    const memberMap = new Map();
    members.forEach(m => memberMap.set(m.id, m));

    // Simple layout: Generations as rows
    const generations = {};
    const processed = new Set();

    function getDepth(memberId, depth = 0) {
      const m = memberMap.get(memberId);
      if (!m || processed.has(memberId)) return depth;
      
      const fatherId = m.relationships?.fatherId;
      const motherId = m.relationships?.motherId;
      
      let maxParentDepth = depth;
      if (fatherId) maxParentDepth = Math.max(maxParentDepth, getDepth(fatherId, depth + 1));
      if (motherId) maxParentDepth = Math.max(maxParentDepth, getDepth(motherId, depth + 1));
      
      return maxParentDepth;
    }

    // Assign depths
    members.forEach(m => {
      const depth = getDepth(m.id);
      if (!generations[depth]) generations[depth] = [];
      generations[depth].push(m);
    });

    // Create nodes
    Object.keys(generations).forEach((depth, dIdx) => {
      generations[depth].forEach((m, mIdx) => {
        nodes.push({
          id: m.id,
          type: 'person',
          data: { member: m },
          position: { x: mIdx * 250, y: dIdx * 200 },
        });

        // Add edges to parents
        if (m.relationships?.fatherId) {
          edges.push({
            id: `e-${m.relationships.fatherId}-${m.id}`,
            source: m.relationships.fatherId,
            target: m.id,
            label: 'Father',
            animated: true,
            style: { stroke: '#3b82f6' },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
          });
        }
        if (m.relationships?.motherId) {
          edges.push({
            id: `e-${m.relationships.motherId}-${m.id}`,
            source: m.relationships.motherId,
            target: m.id,
            label: 'Mother',
            animated: true,
            style: { stroke: '#ec4899' },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#ec4899' },
          });
        }

        // Add edges to spouses
        (m.relationships?.spouseIds || []).forEach(spouseId => {
          if (m.id < spouseId) {
            edges.push({
              id: `s-${m.id}-${spouseId}`,
              source: m.id,
              target: spouseId,
              label: 'Spouse',
              style: { stroke: '#8b5cf6', strokeDasharray: '5,5' },
            });
          }
        });
      });
    });

    return { initialNodes: nodes, initialEdges: edges };
  }, [members]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onNodeClick = (event, node) => {
    setSelectedMember(node.data.member);
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex' }}>
      <div style={{ flex: 1 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background color="#aaa" gap={20} />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>

      {selectedMember && (
        <MemberDetailSidebar 
          member={selectedMember} 
          members={members}
          onClose={() => setSelectedMember(null)} 
        />
      )}
    </div>
  );
}

