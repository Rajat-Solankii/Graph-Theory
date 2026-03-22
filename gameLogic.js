// gameLogic.js — Campus Graph Puzzle Game

class CampusGame {
  constructor(onUpdate) {
    this.onUpdate = onUpdate; // callback(state)
    this.level = 1;
    this.reset();
  }

  reset() {
    this.score = 0;
    this.selectedNodes = [];
    this.selectedEdges = [];
    this.removedEdges = new Set();
    this.message = '';
    this.complete = false;
    this.currentPlayer = 0; // A Block
    this.notify();
  }

  setLevel(lvl) {
    this.level = lvl;
    this.selectedNodes = [];
    this.selectedEdges = [];
    this.removedEdges = new Set();
    this.message = this.getLevelIntro(lvl);
    this.complete = false;
    this.notify();
  }

  getLevelIntro(lvl) {
    const intros = {
      1: '🌲 Level 1: Remove edges to eliminate all cycles. A tree has no cycles!',
      2: '🔢 Level 2: Click nodes in Preorder traversal order (Root → Left → Right)',
      3: '🌐 Level 3: Build a Spanning Tree — connect ALL nodes with minimum edges',
      4: '⚡ Level 4: Build the Minimum Spanning Tree using lowest-weight edges',
      5: '🗺️ Level 5: Find the Shortest Path from A Block to Mini Turf',
    };
    return intros[lvl] || '';
  }

  // Level 1: player clicks an edge to remove it
  removeEdge(edgeIdx) {
    if (this.level !== 1) return;
    if (this.removedEdges.has(edgeIdx)) {
      this.removedEdges.delete(edgeIdx);
      this.message = `Edge restored.`;
    } else {
      this.removedEdges.add(edgeIdx);
      this.message = `Edge removed. Check for cycles...`;
    }

    // Check if remaining graph is a tree (n-1 edges, connected, no cycle)
    const remaining = CAMPUS_EDGES.filter((_, i) => !this.removedEdges.has(i));
    const n = CAMPUS_NODES.length;
    if (remaining.length === n - 1 && isConnected(CAMPUS_NODES, remaining) && !hasCycle(CAMPUS_NODES, remaining)) {
      this.message = '✅ Perfect! You built a tree! No cycles, all connected!';
      this.score += 100;
      this.complete = true;
    }
    this.notify();
  }

  // Level 2: click nodes in preorder order
  clickNode(nodeId) {
    if (this.level !== 2) return;
    const { parent } = buildSpanningTree(0, CAMPUS_NODES, CAMPUS_EDGES);
    const correctOrder = preorderTraversal(0, parent);
    const expected = correctOrder[this.selectedNodes.length];

    if (nodeId === expected) {
      this.selectedNodes.push(nodeId);
      this.message = `✅ Correct! Node ${CAMPUS_NODES[nodeId].name}`;
      if (this.selectedNodes.length === correctOrder.length) {
        this.message = '🎉 Preorder Traversal Complete!';
        this.score += 100;
        this.complete = true;
      }
    } else {
      this.message = `❌ Wrong! Expected ${CAMPUS_NODES[expected].name}`;
      this.score = Math.max(0, this.score - 10);
    }
    this.notify();
  }

  // Level 3 & 4: click edges to add to spanning tree
  addEdge(edgeIdx) {
    if (this.level !== 3 && this.level !== 4) return;
    if (this.selectedEdges.includes(edgeIdx)) {
      this.selectedEdges = this.selectedEdges.filter(i => i !== edgeIdx);
      this.message = `Edge removed from selection.`;
      this.notify();
      return;
    }

    this.selectedEdges.push(edgeIdx);
    const selected = this.selectedEdges.map(i => CAMPUS_EDGES[i]);
    const n = CAMPUS_NODES.length;

    if (hasCycle(CAMPUS_NODES, selected)) {
      this.selectedEdges.pop();
      this.message = '❌ That creates a cycle! Try a different edge.';
      this.notify();
      return;
    }

    this.message = `Edge added. Need ${n - 1 - this.selectedEdges.length} more.`;

    if (this.selectedEdges.length === n - 1 && isConnected(CAMPUS_NODES, selected)) {
      if (this.level === 3) {
        this.message = '🎉 Spanning Tree Complete! All nodes connected!';
        this.score += 100;
        this.complete = true;
      } else {
        // Level 4: Check if it's the MST
        const totalWeight = selected.reduce((s, e) => s + e.weight, 0);
        const mstWeight = getMSTWeight();
        if (totalWeight === mstWeight) {
          this.message = `🏆 Minimum Spanning Tree! Total weight: ${totalWeight}`;
          this.score += 150;
          this.complete = true;
        } else {
          this.message = `Tree built, but not minimum. Weight: ${totalWeight} (MST: ${mstWeight}). Try again!`;
          this.selectedEdges = [];
          this.score = Math.max(0, this.score - 20);
        }
      }
    }
    this.notify();
  }

  // Level 5: click nodes to build path
  selectPathNode(nodeId) {
    if (this.level !== 5) return;
    if (this.selectedNodes.length === 0 && nodeId !== 0) {
      this.message = '⚠️ Start from A Block (node 0)!';
      this.notify();
      return;
    }

    const last = this.selectedNodes[this.selectedNodes.length - 1] ?? 0;
    // Check adjacency
    const edge = CAMPUS_EDGES.findIndex(e =>
      (e.from === last && e.to === nodeId) || (e.from === nodeId && e.to === last)
    );
    if (edge === -1) {
      this.message = `❌ No direct path from ${CAMPUS_NODES[last].name} to ${CAMPUS_NODES[nodeId].name}`;
      this.notify();
      return;
    }

    this.selectedNodes.push(nodeId);
    this.selectedEdges.push(edge);

    if (nodeId === 12) { // Mini Turf
      const { dist } = dijkstra(CAMPUS_NODES, CAMPUS_EDGES, 0);
      const pathWeight = this.selectedEdges.reduce((s, i) => s + CAMPUS_EDGES[i].weight, 0);
      if (pathWeight === dist[12]) {
        this.message = `🏆 Shortest Path Found! Distance: ${pathWeight}`;
        this.score += 200;
        this.complete = true;
      } else {
        this.message = `Path found (${pathWeight}), but not shortest (${dist[12]}). Reset and try again.`;
        this.selectedNodes = [];
        this.selectedEdges = [];
      }
    } else {
      this.message = `At ${CAMPUS_NODES[nodeId].name}. Keep going to Mini Turf!`;
    }
    this.notify();
  }

  notify() {
    this.onUpdate({
      level: this.level,
      score: this.score,
      selectedNodes: [...this.selectedNodes],
      selectedEdges: [...this.selectedEdges],
      removedEdges: new Set(this.removedEdges),
      message: this.message,
      complete: this.complete,
    });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isConnected(nodes, edges) {
  if (nodes.length === 0) return true;
  const adj = {};
  nodes.forEach(n => adj[n.id] = []);
  edges.forEach(e => {
    if (adj[e.from] !== undefined) adj[e.from].push(e.to);
    if (adj[e.to]   !== undefined) adj[e.to  ].push(e.from);
  });
  const visited = new Set();
  const start = nodes[0].id;
  const stack = [start];
  while (stack.length) {
    const u = stack.pop();
    if (visited.has(u)) continue;
    visited.add(u);
    (adj[u] || []).forEach(v => stack.push(v));
  }
  return visited.size === nodes.length;
}

function hasCycle(nodes, edges) {
  const uf = new UnionFind2(nodes.length);
  // Map node id to index
  const idxMap = {};
  nodes.forEach((n, i) => idxMap[n.id] = i);
  for (const e of edges) {
    const a = idxMap[e.from], b = idxMap[e.to];
    if (a === undefined || b === undefined) continue;
    if (!uf.union(a, b)) return true;
  }
  return false;
}

class UnionFind2 {
  constructor(n) {
    this.parent = Array.from({ length: n }, (_, i) => i);
  }
  find(x) {
    if (this.parent[x] !== x) this.parent[x] = this.find(this.parent[x]);
    return this.parent[x];
  }
  union(x, y) {
    const px = this.find(x), py = this.find(y);
    if (px === py) return false;
    this.parent[px] = py;
    return true;
  }
}

function getMSTWeight() {
  const steps = kruskalSteps(CAMPUS_NODES, CAMPUS_EDGES);
  return steps.filter(s => s.accepted)
              .reduce((s, step) => s + CAMPUS_EDGES[step.edgeIdx].weight, 0);
}
