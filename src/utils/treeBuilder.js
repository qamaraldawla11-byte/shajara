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

  const spouseGroupParent = new Map(members.map((member) => [member.id, member.id]));

  function findGroup(id) {
    const current = spouseGroupParent.get(id);
    if (current === id) return current;
    const root = findGroup(current);
    spouseGroupParent.set(id, root);
    return root;
  }

  function unionGroup(a, b) {
    if (!spouseGroupParent.has(a) || !spouseGroupParent.has(b)) return;
    const rootA = findGroup(a);
    const rootB = findGroup(b);
    if (rootA !== rootB) spouseGroupParent.set(rootB, rootA);
  }

  members.forEach((member) => {
    (member.relationships?.spouseIds || []).forEach((spouseId) => unionGroup(member.id, spouseId));
  });

  const groups = new Map();
  members.forEach((member) => {
    const groupId = findGroup(member.id);
    if (!groups.has(groupId)) groups.set(groupId, []);
    groups.get(groupId).push(member);
  });

  const groupList = Array.from(groups.values()).map((groupMembers) => {
    const sortedMembers = [...groupMembers].sort((a, b) => {
      const spouseLinked = (a.relationships?.spouseIds || []).includes(b.id)
        || (b.relationships?.spouseIds || []).includes(a.id);
      if (spouseLinked) return a.gender === 'male' ? -1 : 1;
      return `${a.firstName} ${a.lastName || ''}`.localeCompare(`${b.firstName} ${b.lastName || ''}`);
    });

    const ids = new Set(sortedMembers.map((member) => member.id));
    const hasParentInDataset = sortedMembers.some((member) => {
      const fatherId = member.relationships?.fatherId;
      const motherId = member.relationships?.motherId;
      return (fatherId && memberMap.has(fatherId) && !ids.has(fatherId))
        || (motherId && memberMap.has(motherId) && !ids.has(motherId));
    });

    const earliestCreatedAt = sortedMembers
      .map((member) => member.createdAt || '')
      .filter(Boolean)
      .sort()[0] || '';

    return {
      id: findGroup(sortedMembers[0].id),
      members: sortedMembers,
      ids,
      primary: sortedMembers[0],
      hasParentInDataset,
      earliestCreatedAt,
    };
  });

  // Find root spouse groups (no parent group in the dataset)
  const rootGroups = groupList.filter((group) => !group.hasParentInDataset);

  // If no roots found, use all members as roots (fallback)
  const roots = rootGroups.length > 0 ? rootGroups : groupList;

  // Track processed members to avoid duplicates
  const processedGroups = new Set();

  function buildNode(group, lineage = new Set()) {
    if (processedGroups.has(group.id) || lineage.has(group.id)) return null;
    processedGroups.add(group.id);

    const nextLineage = new Set(lineage);
    nextLineage.add(group.id);

    const childGroups = groupList
      .filter((candidate) => {
        if (candidate.id === group.id || processedGroups.has(candidate.id)) return false;
        return candidate.members.some((member) => (
          group.ids.has(member.relationships?.fatherId)
          || group.ids.has(member.relationships?.motherId)
        ));
      })
      .sort((a, b) => (a.earliestCreatedAt || '').localeCompare(b.earliestCreatedAt || ''));

    const children = childGroups
      .map((childGroup) => buildNode(childGroup, nextLineage))
      .filter(Boolean);

    return {
      member: group.primary,
      spouses: group.members.filter((member) => member.id !== group.primary.id),
      children,
    };
  }

  const tree = roots
    .sort((a, b) => (a.earliestCreatedAt || '').localeCompare(b.earliestCreatedAt || ''))
    .map((root) => buildNode(root))
    .filter(Boolean);

  // Add any unprocessed members as standalone roots
  const remaining = groupList.filter((group) => !processedGroups.has(group.id));
  remaining.forEach((group) => {
    const node = buildNode(group);
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
