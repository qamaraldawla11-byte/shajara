// ============================================
// Tree Builder — Convert flat members to hierarchy
// ============================================

/**
 * Build a hierarchical tree structure from flat member array.
 *
 * Strategy:
 * 1. Find root nodes (members without a fatherId AND motherId)
 * 2. For each root, recursively find children (members whose fatherId or motherId = root.id)
 * 3. Attach spouse information
 *
 * Returns an array of tree nodes, each with:
 * { member, spouses: [member], children: [treeNode] }
 */
export function buildFamilyTree(members) {
  if (!members || members.length === 0) return [];

  // Index members by ID for fast lookup
  const memberMap = new Map();
  members.forEach((m) => memberMap.set(m.id, m));

  // Find root members (no father AND no mother in the dataset)
  const rootMembers = members.filter(
    (m) => !m.relationships?.fatherId && !m.relationships?.motherId
  );

  // If no roots found, use all members as roots (fallback)
  const roots = rootMembers.length > 0 ? rootMembers : members;

  // Track processed members to avoid duplicates
  const processed = new Set();

  function buildNode(member) {
    if (processed.has(member.id)) return null;
    processed.add(member.id);

    // Find spouses
    const spouses = (member.relationships?.spouseIds || [])
      .map((id) => memberMap.get(id))
      .filter(Boolean);

    // Find children (members whose fatherId or motherId = this member's id)
    const children = members
      .filter(
        (m) =>
          !processed.has(m.id) &&
          (m.relationships?.fatherId === member.id ||
            m.relationships?.motherId === member.id)
      )
      .map((child) => buildNode(child))
      .filter(Boolean);

    return {
      member,
      spouses,
      children,
    };
  }

  const tree = roots.map((root) => buildNode(root)).filter(Boolean);

  // Add any unprocessed members as standalone roots
  const remaining = members.filter((m) => !processed.has(m.id));
  remaining.forEach((m) => {
    const node = buildNode(m);
    if (node) tree.push(node);
  });

  return tree;
}

/**
 * Get tree statistics
 */
export function getTreeStats(members) {
  const total = members.length;
  const male = members.filter((m) => m.gender === 'male').length;
  const female = members.filter((m) => m.gender === 'female').length;
  const alive = members.filter((m) => m.isAlive !== false).length;
  const generations = calculateGenerations(members);

  return { total, male, female, alive, generations };
}

/**
 * Calculate approximate number of generations
 */
function calculateGenerations(members) {
  if (members.length === 0) return 0;

  const memberMap = new Map();
  members.forEach((m) => memberMap.set(m.id, m));

  function getDepth(member, visited = new Set()) {
    if (visited.has(member.id)) return 0;
    visited.add(member.id);

    const fatherId = member.relationships?.fatherId;
    const motherId = member.relationships?.motherId;

    let parentDepth = 0;
    if (fatherId && memberMap.has(fatherId)) {
      parentDepth = Math.max(parentDepth, getDepth(memberMap.get(fatherId), visited));
    }
    if (motherId && memberMap.has(motherId)) {
      parentDepth = Math.max(parentDepth, getDepth(memberMap.get(motherId), visited));
    }

    return parentDepth + 1;
  }

  let maxDepth = 0;
  members.forEach((m) => {
    maxDepth = Math.max(maxDepth, getDepth(m));
  });

  return maxDepth;
}
