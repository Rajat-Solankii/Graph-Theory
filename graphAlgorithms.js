// graphAlgorithms.js — Kruskal, Prim, Dijkstra

// ─── Union-Find for Kruskal ───────────────────────────────────────────────────
class UnionFind {
  constructor(n) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.rank   = new Array(n).fill(0);
  }
  find(x) {
    if (this.parent[x] !== x) this.parent[x] = this.find(this.parent[x]);
    return this.parent[x];
  }
  union(x, y) {
    const px = this.find(x), py = this.find(y);
    if (px === py) return false;
    if (this.rank[px] < this.rank[py]) this.parent[px] = py;
    else if (this.rank[px] > this.rank[py]) this.parent[py] = px;
    else { this.parent[py] = px; this.rank[px]++; }
    return true;
  }
}

// ─── Kruskal's MST ────────────────────────────────────────────────────────────
// Returns array of steps: each step = { edgeIdx, accepted }
function kruskalSteps(nodes, edges) {
  const sorted = [...edges].map((e, i) => ({ ...e, idx: i }))
                           .sort((a, b) => a.weight - b.weight);
  const uf = new UnionFind(nodes.length);
  const steps = [];

  for (const e of sorted) {
    const accepted = uf.union(e.from, e.to);
    steps.push({ edgeIdx: e.idx, accepted });
  }
  return steps;
}

// ─── Prim's MST ───────────────────────────────────────────────────────────────
// Returns array of steps: each step = { edgeIdx, nodeAdded }
function primSteps(nodes, edges, startId = 0) {
  const adj = {};
  nodes.forEach(n => adj[n.id] = []);
  edges.forEach((e, i) => {
    adj[e.from].push({ to: e.to,   weight: e.weight, idx: i });
    adj[e.to  ].push({ to: e.from, weight: e.weight, idx: i });
  });

  const inMST = new Set([startId]);
  const steps = [];

  while (inMST.size < nodes.length) {
    let best = null;
    for (const u of inMST) {
      for (const e of adj[u]) {
        if (!inMST.has(e.to)) {
          if (!best || e.weight < best.weight) best = { ...e, from: u };
        }
      }
    }
    if (!best) break;
    inMST.add(best.to);
    steps.push({ edgeIdx: best.idx, nodeAdded: best.to });
  }
  return steps;
}

// ─── Dijkstra's Shortest Path ─────────────────────────────────────────────────
// Returns { dist, prev, visitOrder }
function dijkstra(nodes, edges, startId) {
  const INF = Infinity;
  const dist = {};
  const prev = {};
  const visited = new Set();
  const visitOrder = [];

  nodes.forEach(n => { dist[n.id] = INF; prev[n.id] = null; });
  dist[startId] = 0;

  const adj = {};
  nodes.forEach(n => adj[n.id] = []);
  edges.forEach((e, i) => {
    adj[e.from].push({ to: e.to,   weight: e.weight, idx: i });
    adj[e.to  ].push({ to: e.from, weight: e.weight, idx: i });
  });

  while (visited.size < nodes.length) {
    // Pick unvisited node with smallest dist
    let u = null;
    nodes.forEach(n => {
      if (!visited.has(n.id) && (u === null || dist[n.id] < dist[u])) u = n.id;
    });
    if (dist[u] === INF) break;

    visited.add(u);
    visitOrder.push(u);

    for (const e of adj[u]) {
      const alt = dist[u] + e.weight;
      if (alt < dist[e.to]) {
        dist[e.to] = alt;
        prev[e.to] = { from: u, edgeIdx: e.idx };
      }
    }
  }

  return { dist, prev, visitOrder };
}

// Reconstruct path from Dijkstra result
function reconstructPath(prev, targetId) {
  const path = [];
  const edgePath = [];
  let curr = targetId;
  while (prev[curr]) {
    path.unshift(curr);
    edgePath.unshift(prev[curr].edgeIdx);
    curr = prev[curr].from;
  }
  path.unshift(curr);
  return { path, edgePath };
}
