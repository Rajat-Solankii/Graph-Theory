// main.js — Three.js Scene, Camera, Lighting, Buildings, Nodes, Edges

let scene, camera, renderer, controls;
let buildingMeshes = [], nodeMeshes = [], edgeMeshes = [], labelSprites = [];
let particleSystem, particles = [];
let clock;
let animationMixer = null;

// State
let activeEdges    = new Set();   // edge indices shown
let highlightNodes = new Map();   // nodeId -> color override
let pulsing        = new Set();   // nodeIds pulsing
let animQueue      = [];
let animPlaying    = false;

// ─── Init ─────────────────────────────────────────────────────────────────────
function initScene() {
  clock = new THREE.Clock();

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050a12);
  scene.fog = new THREE.FogExp2(0x050a12, 0.0012);

  // Renderer
  const container = document.getElementById('canvas-container');
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  container.appendChild(renderer.domElement);

  // Camera
  camera = new THREE.PerspectiveCamera(55, container.clientWidth / container.clientHeight, 1, 3000);
  camera.position.set(0, 500, 200);
  camera.lookAt(0, 0, 0);

  // Create a dedicated interaction div for OrbitControls — behind all UI panels
  const orbitDiv = document.createElement('div');
  orbitDiv.id = 'orbit-target';
  orbitDiv.style.cssText = 'position:fixed;inset:0;z-index:2;cursor:grab;';
  document.getElementById('canvas-container').after(orbitDiv);

  // OrbitControls — attached to orbitDiv, NOT the renderer canvas
  // This means UI buttons (z-index 10+) sit above and receive clicks normally
  controls = new THREE.OrbitControls(camera, orbitDiv);
  controls.enableDamping  = true;
  controls.dampingFactor  = 0.06;
  controls.maxPolarAngle  = Math.PI / 2;
  controls.minDistance    = 80;
  controls.maxDistance    = 900;
  controls.target.set(0, 0, 0);

  // Lights
  const ambient = new THREE.AmbientLight(0x0a1a2e, 3.0);
  scene.add(ambient);

  const dirLight = new THREE.DirectionalLight(0x4080ff, 2.0);
  dirLight.position.set(200, 400, 100);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(2048, 2048);
  dirLight.shadow.camera.near = 1;
  dirLight.shadow.camera.far  = 1000;
  dirLight.shadow.camera.left = dirLight.shadow.camera.bottom = -400;
  dirLight.shadow.camera.right = dirLight.shadow.camera.top   =  400;
  scene.add(dirLight);

  // Ground
  buildGround();
  buildCampusGrid();
  buildBuildings();
  buildNodes();
  buildEdges();
  buildStars();
  buildAmbientParticles();

  // Resize
  window.addEventListener('resize', onResize);

  animate();
}

// ─── Ground ───────────────────────────────────────────────────────────────────
function buildGround() {
  // Main ground
  const geo  = new THREE.PlaneGeometry(900, 900, 40, 40);
  const mat  = new THREE.MeshStandardMaterial({
    color: 0x050e1a, roughness: 0.95, metalness: 0.1
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  scene.add(mesh);

  // Grid overlay
  const grid = new THREE.GridHelper(900, 36, 0x0a2040, 0x071828);
  grid.position.y = 0.2;
  scene.add(grid);

  // Campus boundary glow
  const edgeGeo  = new THREE.EdgesGeometry(new THREE.BoxGeometry(820, 1, 700));
  const edgeMat  = new THREE.LineBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.15 });
  const boundary = new THREE.LineSegments(edgeGeo, edgeMat);
  boundary.position.y = 1;
  scene.add(boundary);
}

function buildCampusGrid() {
  // Glowing campus paths between buildings
  const pathMat = new THREE.MeshBasicMaterial({ color: 0x0d2540, transparent: true, opacity: 0.8 });
  const paths = [
    { sx: -350, sz: 0,   ex: 350,  ez: 0   },
    { sx: 0,    sz: -350, ex: 0,   ez: 350  },
    { sx: -350, sz: -150, ex: 350, ez: -150 },
    { sx: -350, sz: 120,  ex: 350, ez: 120  },
  ];
  paths.forEach(p => {
    const len = Math.hypot(p.ex - p.sx, p.ez - p.sz);
    const geo = new THREE.PlaneGeometry(len, 12);
    const m   = new THREE.Mesh(geo, pathMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set((p.sx + p.ex) / 2, 0.3, (p.sz + p.ez) / 2);
    m.rotation.z = Math.atan2(p.ez - p.sz, p.ex - p.sx);
    scene.add(m);
  });
}

// ─── Buildings ────────────────────────────────────────────────────────────────
function buildBuildings() {
  CAMPUS_NODES.forEach((node, i) => {
    const h = 10 + Math.random() * 20;
    const w = 18 + Math.random() * 14;
    const d = 14 + Math.random() * 12;

    // Building body
    const geo = new THREE.BoxGeometry(w, h, d);
    const col = new THREE.Color(node.color);
    col.multiplyScalar(0.18);
    const mat = new THREE.MeshStandardMaterial({
      color: col, roughness: 0.7, metalness: 0.3,
      emissive: new THREE.Color(node.color).multiplyScalar(0.04),
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(node.x, h / 2, node.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { nodeId: i, type: 'building' };
    scene.add(mesh);
    buildingMeshes.push(mesh);

    // Rooftop glow line
    const roofGeo = new THREE.BoxGeometry(w + 0.5, 0.4, d + 0.5);
    const roofMat = new THREE.MeshBasicMaterial({
      color: node.color, transparent: true, opacity: 0.4
    });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(node.x, h + 0.2, node.z);
    scene.add(roof);

    // Edge glow
    const edges = new THREE.EdgesGeometry(geo);
    const lineMat = new THREE.LineBasicMaterial({
      color: node.color, transparent: true, opacity: 0.25
    });
    const wireframe = new THREE.LineSegments(edges, lineMat);
    wireframe.position.copy(mesh.position);
    scene.add(wireframe);

    // Label
    createLabel(node.name, node.x, h + 18, node.z, node.color);
  });
}

// ─── Nodes (spheres above buildings) ─────────────────────────────────────────
function buildNodes() {
  CAMPUS_NODES.forEach((node, i) => {
    const h = getBuildingHeight(i);

    const geo = new THREE.SphereGeometry(5, 16, 16);
    const mat = new THREE.MeshStandardMaterial({
      color: node.color,
      emissive: new THREE.Color(node.color),
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.6,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(node.x, h + 28, node.z);
    mesh.userData = { nodeId: i, type: 'node' };
    mesh.castShadow = false;
    scene.add(mesh);
    nodeMeshes.push(mesh);

    // Glow halo
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(7.5, 16, 16),
      new THREE.MeshBasicMaterial({
        color: node.color, transparent: true, opacity: 0.15, side: THREE.BackSide
      })
    );
    halo.position.copy(mesh.position);
    halo.userData = { type: 'halo', nodeId: i };
    scene.add(halo);

    // Point light per node (subtle)
    const light = new THREE.PointLight(node.color, 0.5, 80);
    light.position.set(node.x, h + 28, node.z);
    scene.add(light);
    mesh.userData.light = light;
  });
}

// ─── Edges ────────────────────────────────────────────────────────────────────
function buildEdges() {
  CAMPUS_EDGES.forEach((edge, i) => {
    const a = CAMPUS_NODES[edge.from];
    const b = CAMPUS_NODES[edge.to];
    const ha = getBuildingHeight(edge.from) + 28;
    const hb = getBuildingHeight(edge.to)   + 28;

    const start = new THREE.Vector3(a.x, ha, a.z);
    const end   = new THREE.Vector3(b.x, hb, b.z);

    // Curved line via quadratic bezier
    const mid = new THREE.Vector3(
      (a.x + b.x) / 2,
      Math.max(ha, hb) + 20,
      (a.z + b.z) / 2
    );
    const curve  = new THREE.QuadraticBezierCurve3(start, mid, end);
    const points = curve.getPoints(24);
    const geo    = new THREE.BufferGeometry().setFromPoints(points);

    const mat = new THREE.LineBasicMaterial({
      color: 0x1a4060, transparent: true, opacity: 0.25, linewidth: 1
    });
    const line = new THREE.Line(geo, mat);
    line.userData = { edgeIdx: i, type: 'edge', active: false, curve };
    scene.add(line);
    edgeMeshes.push(line);

    // Weight label
    const mid3d = curve.getPoint(0.5);
    createWeightLabel(edge.weight, mid3d.x, mid3d.y + 4, mid3d.z);
  });
}

// ─── Label Sprites ────────────────────────────────────────────────────────────
function createLabel(text, x, y, z, color = 0x00e5ff) {
  const canvas  = document.createElement('canvas');
  canvas.width  = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 256, 64);
  ctx.font = 'bold 20px Rajdhani, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Glow
  ctx.shadowBlur  = 10;
  ctx.shadowColor = `#${color.toString(16).padStart(6,'0')}`;
  ctx.fillStyle   = `#${color.toString(16).padStart(6,'0')}`;
  ctx.fillText(text, 128, 32);

  const tex  = new THREE.CanvasTexture(canvas);
  const mat  = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(50, 12, 1);
  sprite.position.set(x, y, z);
  sprite.userData = { type: 'label' };
  scene.add(sprite);
  labelSprites.push(sprite);
}

function createWeightLabel(weight, x, y, z) {
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 32;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 64, 32);
  ctx.font = 'bold 16px Rajdhani, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffd740';
  ctx.shadowBlur = 6;
  ctx.shadowColor = '#ffd740';
  ctx.fillText(weight, 32, 16);
  const tex    = new THREE.CanvasTexture(canvas);
  const mat    = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(14, 7, 1);
  sprite.position.set(x, y, z);
  scene.add(sprite);
}

// ─── Stars ────────────────────────────────────────────────────────────────────
function buildStars() {
  const geo  = new THREE.BufferGeometry();
  const verts = [];
  for (let i = 0; i < 800; i++) {
    verts.push(
      (Math.random() - 0.5) * 3000,
      200 + Math.random() * 600,
      (Math.random() - 0.5) * 3000
    );
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  const mat  = new THREE.PointsMaterial({ color: 0x4080ff, size: 1.2, transparent: true, opacity: 0.6 });
  scene.add(new THREE.Points(geo, mat));
}

// ─── Ambient particles ────────────────────────────────────────────────────────
function buildAmbientParticles() {
  const geo  = new THREE.BufferGeometry();
  const verts = [];
  for (let i = 0; i < 200; i++) {
    verts.push(
      (Math.random() - 0.5) * 800,
      5 + Math.random() * 60,
      (Math.random() - 0.5) * 700
    );
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  const mat  = new THREE.PointsMaterial({ color: 0x00e5ff, size: 0.8, transparent: true, opacity: 0.3 });
  particleSystem = new THREE.Points(geo, mat);
  scene.add(particleSystem);
}

// ─── Helper ───────────────────────────────────────────────────────────────────
function getBuildingHeight(nodeId) {
  if (!buildingMeshes[nodeId]) return 12;
  return buildingMeshes[nodeId].geometry.parameters.height;
}

// ─── Edge activation ─────────────────────────────────────────────────────────
function setEdgeActive(idx, active, color = null) {
  const line = edgeMeshes[idx];
  if (!line) return;
  line.userData.active = active;
  if (active) {
    const c = color || 0x00e5ff;
    line.material.color.setHex(c);
    line.material.opacity = 0.85;
  } else {
    line.material.color.setHex(0x1a4060);
    line.material.opacity = 0.25;
  }
}

function setAllEdges(active, color = null) {
  CAMPUS_EDGES.forEach((_, i) => setEdgeActive(i, active, color));
}

function setNodeHighlight(nodeId, colorHex) {
  const mesh = nodeMeshes[nodeId];
  if (!mesh) return;
  if (colorHex === null) {
    mesh.material.color.setHex(CAMPUS_NODES[nodeId].color);
    mesh.material.emissive.setHex(CAMPUS_NODES[nodeId].color);
    mesh.material.emissiveIntensity = 0.8;
  } else {
    mesh.material.color.setHex(colorHex);
    mesh.material.emissive.setHex(colorHex);
    mesh.material.emissiveIntensity = 1.5;
  }
}

function resetAllHighlights() {
  CAMPUS_NODES.forEach((_, i) => setNodeHighlight(i, null));
  setAllEdges(false);
}

// ─── Traversal particle animation ─────────────────────────────────────────────
let travelParticle = null;
function animateTravelParticle(fromId, toId, color, onDone) {
  if (travelParticle) { scene.remove(travelParticle); travelParticle = null; }

  const a = nodeMeshes[fromId].position.clone();
  const b = nodeMeshes[toId].position.clone();
  const mid = new THREE.Vector3((a.x+b.x)/2, Math.max(a.y,b.y)+20, (a.z+b.z)/2);
  const curve = new THREE.QuadraticBezierCurve3(a, mid, b);

  const geo = new THREE.SphereGeometry(4, 10, 10);
  const mat = new THREE.MeshBasicMaterial({ color: color || 0xffffff });
  travelParticle = new THREE.Mesh(geo, mat);
  scene.add(travelParticle);

  let t = 0;
  const speed = 0.025;
  function tick() {
    t += speed;
    if (t >= 1) {
      t = 1;
      travelParticle.position.copy(b);
      scene.remove(travelParticle);
      travelParticle = null;
      if (onDone) onDone();
      return;
    }
    travelParticle.position.copy(curve.getPoint(t));
    requestAnimationFrame(tick);
  }
  tick();
}

// ─── Animate sequence helper ──────────────────────────────────────────────────
function runSequence(steps, delay = 600) {
  let i = 0;
  function next() {
    if (i >= steps.length) { animPlaying = false; return; }
    steps[i++]();
    setTimeout(next, delay);
  }
  animPlaying = true;
  next();
}

// ─── Resize ───────────────────────────────────────────────────────────────────
function onResize() {
  const c = document.getElementById('canvas-container');
  camera.aspect = c.clientWidth / c.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(c.clientWidth, c.clientHeight);
}

// ─── Raycasting for node picking ──────────────────────────────────────────────
const raycaster  = new THREE.Raycaster();
const mouseVec   = new THREE.Vector2();
let   onNodeClick = null;
let   onEdgeClick = null;


function setupPickingListeners() {
  const target = document.getElementById('orbit-target');

  target.addEventListener('click', (e) => {
    const rect = renderer.domElement.getBoundingClientRect();
    mouseVec.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
    mouseVec.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouseVec, camera);

    // Check nodes
    if (onNodeClick) {
      const hits = raycaster.intersectObjects(nodeMeshes);
      if (hits.length) {
        const nodeId = hits[0].object.userData.nodeId;
        onNodeClick(nodeId);
        return;
      }
    }
    // Check edges
    if (onEdgeClick) {
      const hits = raycaster.intersectObjects(edgeMeshes, false);
      if (hits.length) {
        const edgeIdx = hits[0].object.userData.edgeIdx;
        onEdgeClick(edgeIdx);
      }
    }
  });

  // Hover tooltip
  target.addEventListener('mousemove', (e) => {
    const rect = renderer.domElement.getBoundingClientRect();
    mouseVec.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
    mouseVec.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouseVec, camera);
    const hits = raycaster.intersectObjects(nodeMeshes);
    const tt   = document.getElementById('tooltip');
    if (hits.length) {
      const nid  = hits[0].object.userData.nodeId;
      tt.style.display = 'block';
      tt.style.left    = (e.clientX + 12) + 'px';
      tt.style.top     = (e.clientY - 30) + 'px';
      tt.textContent   = CAMPUS_NODES[nid].name;
      target.style.cursor = 'pointer';
    } else {
      tt.style.display = 'none';
      target.style.cursor = 'grab';
    }
  });
}

// ─── Render Loop ──────────────────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  controls.update();

  // Pulse nodes
  nodeMeshes.forEach((mesh, i) => {
    const scale = 1 + 0.12 * Math.sin(t * 2.5 + i * 0.7);
    mesh.scale.setScalar(scale);
  });

  // Ambient particle drift
  if (particleSystem) {
    const pos = particleSystem.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, pos.getY(i) + 0.05 * Math.sin(t + i));
    }
    pos.needsUpdate = true;
    particleSystem.rotation.y += 0.0003;
  }

  renderer.render(scene, camera);
}
