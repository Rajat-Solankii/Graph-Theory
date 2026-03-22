// campusData.js — CHRIST University Delhi NCR Campus Graph Data

const CAMPUS_NODES = [
  { id: 0,  name: "A Block",               x: -180, z: -120, color: 0x00e5ff },
  { id: 1,  name: "Library",               x: -80,  z: -180, color: 0x7c4dff },
  { id: 2,  name: "Cafeteria",             x: -100, z: -60,  color: 0xff6d00 },
  { id: 3,  name: "Main Auditorium",       x: -40,  z: -130, color: 0xff1744 },
  { id: 4,  name: "Dominos",              x: -200, z: 20,   color: 0xffea00 },
  { id: 5,  name: "B Block",              x: -100, z: 80,   color: 0x00e676 },
  { id: 6,  name: "CCD",                  x: -20,  z: 60,   color: 0xff80ab },
  { id: 7,  name: "Rooftop Cafeteria",    x: -60,  z: 140,  color: 0x40c4ff },
  { id: 8,  name: "Mini Auditorium",      x: 60,   z: 100,  color: 0xf50057 },
  { id: 9,  name: "Synergy Square",       x: 60,   z: -20,  color: 0x69f0ae },
  { id: 10, name: "Gazebo",               x: 140,  z: -60,  color: 0xffd740 },
  { id: 11, name: "Main Turf",            x: 180,  z: 60,   color: 0x76ff03 },
  { id: 12, name: "Mini Turf",            x: 200,  z: 130,  color: 0x18ffff },
  { id: 13, name: "Basketball Court L",   x: -220, z: -200, color: 0xff9100 },
  { id: 14, name: "Basketball Court R",   x: -120, z: -230, color: 0xe040fb },
  { id: 15, name: "Badminton Court",      x: -280, z: -280, color: 0x80d8ff },
];

const CAMPUS_EDGES = [
  { from: 0,  to: 1,  weight: 40 },
  { from: 0,  to: 2,  weight: 30 },
  { from: 0,  to: 3,  weight: 50 },
  { from: 0,  to: 4,  weight: 60 },
  { from: 4,  to: 5,  weight: 80 },
  { from: 5,  to: 6,  weight: 20 },
  { from: 5,  to: 7,  weight: 25 },
  { from: 5,  to: 8,  weight: 35 },
  { from: 5,  to: 9,  weight: 70 },
  { from: 9,  to: 10, weight: 30 },
  { from: 9,  to: 11, weight: 60 },
  { from: 11, to: 12, weight: 40 },
  { from: 0,  to: 13, weight: 45 },
  { from: 0,  to: 14, weight: 45 },
  { from: 13, to: 15, weight: 35 },
];

// Adjacency list for algorithms
function buildAdjacencyList(nodes, edges) {
  const adj = {};
  nodes.forEach(n => adj[n.id] = []);
  edges.forEach(e => {
    adj[e.from].push({ node: e.to,   weight: e.weight, edgeIdx: CAMPUS_EDGES.indexOf(e) });
    adj[e.to  ].push({ node: e.from, weight: e.weight, edgeIdx: CAMPUS_EDGES.indexOf(e) });
  });
  return adj;
}

// Build tree starting from A Block (id=0) using BFS
function buildSpanningTree(rootId, nodes, edges) {
  const adj = buildAdjacencyList(nodes, edges);
  const visited = new Set([rootId]);
  const treeEdges = [];
  const queue = [rootId];
  const parent = {};

  while (queue.length) {
    const curr = queue.shift();
    for (const neighbor of adj[curr]) {
      if (!visited.has(neighbor.node)) {
        visited.add(neighbor.node);
        treeEdges.push(neighbor.edgeIdx);
        parent[neighbor.node] = curr;
        queue.push(neighbor.node);
      }
    }
  }
  return { treeEdges, parent };
}

// Preorder traversal on tree
function preorderTraversal(rootId, parent) {
  // Build children map from parent
  const children = {};
  CAMPUS_NODES.forEach(n => children[n.id] = []);
  Object.entries(parent).forEach(([child, par]) => {
    children[par].push(parseInt(child));
  });

  const order = [];
  function dfs(node) {
    order.push(node);
    (children[node] || []).forEach(c => dfs(c));
  }
  dfs(rootId);
  return order;
}

// Inorder: treat tree as binary (left-most as left, rest as right)
function inorderTraversal(rootId, parent) {
  const children = {};
  CAMPUS_NODES.forEach(n => children[n.id] = []);
  Object.entries(parent).forEach(([child, par]) => {
    children[par].push(parseInt(child));
  });

  const order = [];
  function dfs(node) {
    const ch = children[node] || [];
    if (ch.length > 0) dfs(ch[0]);
    order.push(node);
    for (let i = 1; i < ch.length; i++) dfs(ch[i]);
  }
  dfs(rootId);
  return order;
}

// Postorder
function postorderTraversal(rootId, parent) {
  const children = {};
  CAMPUS_NODES.forEach(n => children[n.id] = []);
  Object.entries(parent).forEach(([child, par]) => {
    children[par].push(parseInt(child));
  });

  const order = [];
  function dfs(node) {
    (children[node] || []).forEach(c => dfs(c));
    order.push(node);
  }
  dfs(rootId);
  return order;
}
