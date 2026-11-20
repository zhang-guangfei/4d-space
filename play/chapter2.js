/**
 * Beyond 3D — Chapter 2: Inside the 4D Hypercube (-4, 4)^4
 * Full Babylon.js interactive 3D experience + synced 2D Flatlander/Book-Page visualizer
 * + Web Audio harmonic feedback.
 */
import {
  INTERIOR_L, STAGE1_BEACONS, Stage1Simulation,
  VAULT_SPEC, VaultSimulation, vaultClearance4D,
  RING_SPEC, RingUnlinkSimulation,
  CHIRAL_KEY_VERTICES, MIRROR_LOCK_VERTICES, ChiralKeySimulation,
  hypersphereSlice, xwTiltedBodyIntersection
} from './chapter2-core.js';
import { SpaceAudio } from './sound.js';

const B = window.BABYLON;
const $ = id => document.getElementById(id);
const HUB_PROGRESS_KEY = 'beyond3d_hub_progress_v1';

const audio = new SpaceAudio();
const stage1 = new Stage1Simulation();
const stage2 = new VaultSimulation();
const stage3Rings = new RingUnlinkSimulation();
const stage3Key = new ChiralKeySimulation();

let activeStage = 1;
let stage3Sub = 'rings'; // 'rings' | 'key'
let stage4Sub = 'sphere'; // 'sphere' | 'anatomy'
let stage4W = 0.0;
let stage4AnatomyMode = 'cutaway'; // 'cutaway' | 'xw-tilt'
let stage4CutY = 0.0;
let stage4TiltDeg = 35;

let showProjection = true;
let camMode = 'orbit'; // 'orbit' | 'follow'
const completedStages = new Set();
const keys = new Set();
let toastTimer = null;
let lastWBeep = 0;

// Show hub link when hosted under /play/
if (location.pathname.includes('/play/')) {
  $('hubBackLink')?.classList.remove('hidden');
}

function saveHubProgress() {
  try {
    const cur = JSON.parse(localStorage.getItem(HUB_PROGRESS_KEY) || '{}');
    cur.ch2StagesDone = [...completedStages].sort();
    cur.ch2Completed = completedStages.size >= 4;
    localStorage.setItem(HUB_PROGRESS_KEY, JSON.stringify(cur));
  } catch {}
}

function showToast(msg) {
  const el = $('ch2Toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 4200);
}

function markStageComplete(stageNum, message) {
  const isNew = !completedStages.has(stageNum);
  completedStages.add(stageNum);
  saveHubProgress();
  document.querySelectorAll('#stageNav button').forEach(btn => {
    const n = Number(btn.dataset.stage);
    btn.classList.toggle('done', completedStages.has(n));
  });
  if (isNew) {
    audio.evidenceUnlocked();
    showToast(message);
  }
}

// ============================================================
// Babylon.js 3D Scene Setup
// ============================================================
const canvas = $('ch2Canvas');
const engine = new B.Engine(canvas, true, { preserveDrawingBuffer: true });
engine.setHardwareScalingLevel(1 / Math.min(Math.max(window.devicePixelRatio || 1, 1), 1.5));
const scene = new B.Scene(engine);
scene.clearColor = new B.Color4(0.024, 0.062, 0.095, 1);

const camera = new B.ArcRotateCamera('ch2Cam', -Math.PI * 0.62, 1.12, 9.2, new B.Vector3(0, 0, 0), scene);
camera.lowerRadiusLimit = 2.6;
camera.upperRadiusLimit = 18;
camera.wheelPrecision = 36;
camera.attachControl(canvas, true);
camera.inputs.removeByType('ArcRotateCameraKeyboardMoveInput');

const hemi = new B.HemisphericLight('hemi', new B.Vector3(0.3, 1, -0.4), scene);
hemi.intensity = 0.82;
const keyLight = new B.DirectionalLight('key', new B.Vector3(-0.6, -1, 0.4), scene);
keyLight.intensity = 0.72;

function makeMat(name, hex, { alpha = 1, emissive = 0.16, wireframe = false, unlit = false } = {}) {
  const m = new B.StandardMaterial(name, scene);
  m.diffuseColor = B.Color3.FromHexString(hex);
  m.emissiveColor = m.diffuseColor.scale(emissive);
  m.specularColor = new B.Color3(0.25, 0.35, 0.4);
  m.alpha = alpha;
  m.wireframe = wireframe;
  m.disableLighting = unlit;
  m.backFaceCulling = false;
  if (alpha < 1) m.needDepthPrePass = false;
  return m;
}

// Outer 4D interior boundary cage (-4, 4)^3 wireframe + subtle floor grid
const cageRoot = new B.TransformNode('interiorCage', scene);
{
  const L = INTERIOR_L;
  const pts = [
    [-L, -L, -L], [L, -L, -L], [L, L, -L], [-L, L, -L],
    [-L, -L, L], [L, -L, L], [L, L, L], [-L, L, L]
  ];
  const edges = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
  const cageLines = B.MeshBuilder.CreateLineSystem('cageEdges', {
    lines: edges.map(([a, b]) => [new B.Vector3(...pts[a]), new B.Vector3(...pts[b])])
  }, scene);
  cageLines.color = B.Color3.FromHexString('#2f5e6e');
  cageLines.alpha = 0.55;
  cageLines.parent = cageRoot;

  // Floor reference lines at y = -1.6
  const gridLines = [];
  for (let i = -3; i <= 3; i++) {
    gridLines.push([new B.Vector3(i, -1.6, -3.6), new B.Vector3(i, -1.6, 3.6)]);
    gridLines.push([new B.Vector3(-3.6, -1.6, i), new B.Vector3(3.6, -1.6, i)]);
  }
  const floorGrid = B.MeshBuilder.CreateLineSystem('floorGrid', { lines: gridLines }, scene);
  floorGrid.color = B.Color3.FromHexString('#1d3d4a');
  floorGrid.alpha = 0.45;
  floorGrid.parent = cageRoot;
}

// ============================================================
// Stage 1 Group: Book Pages & W-Axis Beacons
// ============================================================
const g1 = new B.TransformNode('stage1Group', scene);
const s1Player = B.MeshBuilder.CreateSphere('s1Player', { diameter: 0.5, segments: 20 }, scene);
s1Player.material = makeMat('s1PlayerMat', '#e6f1ef', { emissive: 0.28 });
s1Player.parent = g1;

// Distinct 3D environmental landmarks at different W slices!
const s1Beacons = STAGE1_BEACONS.map(b => {
  const node = new B.TransformNode('s1B_' + b.id, scene);
  node.parent = g1;
  node.position.set(b.pos[0], b.pos[1], b.pos[2]);

  const core = B.MeshBuilder.CreatePolyhedron('s1Core_' + b.id, { type: 1, size: 0.36 }, scene);
  core.parent = node;
  core.material = makeMat('s1CoreMat_' + b.id, b.color, { emissive: 0.42 });

  // Architectural ring unique to each W-layer
  const ring = B.MeshBuilder.CreateTorus('s1Ring_' + b.id, { diameter: b.id === 'w0' ? 2.4 : b.id === 'wp' ? 3.2 : 1.7, thickness: 0.06, tessellation: 36 }, scene);
  ring.parent = node;
  ring.rotation.x = b.id === 'wp' ? Math.PI / 2 : b.id === 'wm' ? Math.PI / 4 : 0;
  ring.material = makeMat('s1RingMat_' + b.id, b.color, { alpha: 0.75, emissive: 0.3 });

  // Extra pillars on W = +1.8 and arch on W = -1.8 so switching W transforms the room around the exact same (X,Y,Z)!
  const extras = [];
  if (b.id === 'wp') {
    for (const [px, pz] of [[-1.6, -1.6], [1.6, -1.6], [1.6, 1.6], [-1.6, 1.6]]) {
      const col = B.MeshBuilder.CreateCylinder('s1Col', { diameter: 0.18, height: 2.8 }, scene);
      col.position.set(px, -0.2, pz);
      col.parent = node;
      col.material = makeMat('s1ColMat', '#dfbb73', { alpha: 0.72, emissive: 0.18 });
      extras.push(col);
    }
  } else if (b.id === 'wm') {
    for (const ang of [0, Math.PI / 3, (2 * Math.PI) / 3]) {
      const arch = B.MeshBuilder.CreateTorus('s1Arch', { diameter: 3.6, thickness: 0.05, tessellation: 40 }, scene);
      arch.rotation.y = ang;
      arch.rotation.x = Math.PI / 2;
      arch.parent = node;
      arch.material = makeMat('s1ArchMat', '#68a7ff', { alpha: 0.65, emissive: 0.22 });
      extras.push(arch);
    }
  }
  return { spec: b, node, core, ring, extras };
});

// ============================================================
// Stage 2 Group: Sealed 3D Vault Heist (Finite-W vs Hyper-Wall)
// ============================================================
const g2 = new B.TransformNode('stage2Group', scene);
const s2Player = B.MeshBuilder.CreateSphere('s2Player', { diameter: VAULT_SPEC.playerRadius * 2, segments: 20 }, scene);
s2Player.material = makeMat('s2PlayerMat', '#80ccb9', { emissive: 0.35 });
s2Player.parent = g2;

// Sealed 6-faced 3D glass/steel vault at (0,0,0)
const s2VaultSolidMat = makeMat('s2VaultMat', '#4ea7bc', { alpha: 0.42, emissive: 0.16 });
const s2VaultHyperMat = makeMat('s2VaultHyperMat', '#ee786c', { alpha: 0.48, emissive: 0.24 });
const s2VaultGhostMat = makeMat('s2VaultGhost', '#4ea7bc', { alpha: 0.12, emissive: 0.1, wireframe: true });

const s2VaultOuter = B.MeshBuilder.CreateBox('s2VaultOuter', { size: VAULT_SPEC.outerHalf * 2 }, scene);
s2VaultOuter.parent = g2;
s2VaultOuter.material = s2VaultSolidMat;

const s2VaultWire = B.MeshBuilder.CreateBox('s2VaultWire', { size: VAULT_SPEC.outerHalf * 2 + 0.02 }, scene);
s2VaultWire.parent = g2;
s2VaultWire.material = makeMat('s2VaultWireMat', '#8be4f5', { alpha: 0.7, wireframe: true, unlit: true });

const s2Core = B.MeshBuilder.CreatePolyhedron('s2Core', { type: 3, size: 0.32 }, scene);
s2Core.parent = g2;
s2Core.material = makeMat('s2CoreMat', '#ffd566', { emissive: 0.6 });

const s2Pedestal = B.MeshBuilder.CreateCylinder('s2Pedestal', { diameter: 0.9, height: 0.16, tessellation: 24 }, scene);
s2Pedestal.position.set(VAULT_SPEC.pedestalPos[0], -0.42, VAULT_SPEC.pedestalPos[2]);
s2Pedestal.parent = g2;
s2Pedestal.material = makeMat('s2PedMat', '#80ccb9', { alpha: 0.85, emissive: 0.25 });

const s2PedRing = B.MeshBuilder.CreateTorus('s2PedRing', { diameter: 1.0, thickness: 0.05, tessellation: 28 }, scene);
s2PedRing.position.set(VAULT_SPEC.pedestalPos[0], 0, VAULT_SPEC.pedestalPos[2]);
s2PedRing.parent = g2;
s2PedRing.material = makeMat('s2PedRingMat', '#dfbb73', { alpha: 0.75, emissive: 0.35 });

// ============================================================
// Stage 3 Group: (A) Interlocked Rings & (B) Chiral Mirror Key
// ============================================================
const g3 = new B.TransformNode('stage3Group', scene);
const g3Rings = new B.TransformNode('stage3Rings', scene);
g3Rings.parent = g3;
const ringAMesh = B.MeshBuilder.CreateTorus('ringA', { diameter: RING_SPEC.majorR * 2, thickness: RING_SPEC.tubeR * 2, tessellation: 48 }, scene);
ringAMesh.rotation.x = Math.PI / 2;
ringAMesh.position.x = RING_SPEC.ringACenterX;
ringAMesh.material = makeMat('ringAMat', '#5cd5e5', { emissive: 0.28 });
ringAMesh.parent = g3Rings;

const ringBMesh = B.MeshBuilder.CreateTorus('ringB', { diameter: RING_SPEC.majorR * 2, thickness: RING_SPEC.tubeR * 2, tessellation: 48 }, scene);
ringBMesh.position.x = RING_SPEC.startBX;
ringBMesh.material = makeMat('ringBMat', '#dfbb73', { emissive: 0.3 });
ringBMesh.parent = g3Rings;

const g3Key = new B.TransformNode('stage3Key', scene);
g3Key.parent = g3;
const KEY_COLORS = ['#ffffff', '#ed5555', '#f2c15a', '#4fdbe8'];
const keyHubs = [];
const lockHubs = [];
const keyEdgeMeshes = [];
const lockEdgeMeshes = [];

function updateCylBetween(cyl, a, b) {
  const va = new B.Vector3(a[0], a[1], a[2]);
  const vb = new B.Vector3(b[0], b[1], b[2]);
  const diff = vb.subtract(va);
  const len = diff.length();
  cyl.setEnabled(len > 1e-4);
  if (len <= 1e-4) return;
  cyl.position.copyFrom(va.add(vb).scale(0.5));
  cyl.scaling.set(1, len, 1);
  const up = new B.Vector3(0, 1, 0);
  const dir = diff.scale(1 / len);
  const axis = B.Vector3.Cross(up, dir);
  const cosA = Math.max(-1, Math.min(1, B.Vector3.Dot(up, dir)));
  if (axis.lengthSquared() > 1e-8) {
    cyl.rotationQuaternion = B.Quaternion.RotationAxis(axis.normalize(), Math.acos(cosA));
  } else {
    cyl.rotationQuaternion = cosA < 0 ? B.Quaternion.RotationAxis(new B.Vector3(1, 0, 0), Math.PI) : B.Quaternion.Identity();
  }
}

for (let i = 0; i < 4; i++) {
  const ks = B.MeshBuilder.CreateSphere('keyV' + i, { diameter: i === 0 ? 0.22 : 0.28, segments: 14 }, scene);
  ks.material = makeMat('keyVMat' + i, KEY_COLORS[i], { emissive: 0.35 });
  ks.parent = g3Key;
  keyHubs.push(ks);

  const ls = B.MeshBuilder.CreateSphere('lockV' + i, { diameter: 0.36, segments: 12 }, scene);
  ls.material = makeMat('lockVMat' + i, KEY_COLORS[i], { alpha: 0.26, wireframe: true, unlit: true });
  ls.position.set(MIRROR_LOCK_VERTICES[i][0] * 1.45, MIRROR_LOCK_VERTICES[i][1] * 1.45, MIRROR_LOCK_VERTICES[i][2] * 1.45);
  ls.parent = g3Key;
  lockHubs.push(ls);
}

const TET_EDGES = [[0,1],[0,2],[0,3],[1,2],[2,3],[3,1]];
for (let e = 0; e < TET_EDGES.length; e++) {
  const [i, j] = TET_EDGES[e];
  const kc = B.MeshBuilder.CreateCylinder('keyE' + e, { diameter: e < 3 ? 0.08 : 0.04, height: 1, tessellation: 10 }, scene);
  kc.material = makeMat('keyEMat' + e, e < 3 ? KEY_COLORS[j] : '#98c2ca', { emissive: 0.22 });
  kc.parent = g3Key;
  keyEdgeMeshes.push({ mesh: kc, i, j });

  const lc = B.MeshBuilder.CreateCylinder('lockE' + e, { diameter: 0.03, height: 1, tessellation: 8 }, scene);
  lc.material = makeMat('lockEMat' + e, '#80ccb9', { alpha: 0.22, emissive: 0.2 });
  lc.parent = g3Key;
  const a = MIRROR_LOCK_VERTICES[i].map(v => v * 1.45);
  const b = MIRROR_LOCK_VERTICES[j].map(v => v * 1.45);
  updateCylBetween(lc, a, b);
  lockEdgeMeshes.push(lc);
}

// ============================================================
// Stage 4 Group: (A) 4D Hypersphere Slicing & (B) Educational Anatomy/XW Cross-Section
// ============================================================
const g4 = new B.TransformNode('stage4Group', scene);
const g4Sphere = new B.TransformNode('stage4Sphere', scene);
g4Sphere.parent = g4;

const hyperSliceBall = B.MeshBuilder.CreateSphere('hyperSliceBall', { diameter: 2, segments: 36 }, scene);
hyperSliceBall.material = makeMat('hyperSliceMat', '#64d8cb', { alpha: 0.86, emissive: 0.24 });
hyperSliceBall.parent = g4Sphere;

const hyperEquators = [0, Math.PI / 2, Math.PI / 4].map((rot, idx) => {
  const t = B.MeshBuilder.CreateTorus('hyperEq' + idx, { diameter: 2.02, thickness: 0.025, tessellation: 48 }, scene);
  if (idx === 1) t.rotation.x = Math.PI / 2;
  if (idx === 2) t.rotation.z = Math.PI / 2;
  t.material = makeMat('hyperEqMat' + idx, '#dfbb73', { alpha: 0.65, emissive: 0.4 });
  t.parent = hyperSliceBall;
  return t;
});

const hyperGhostOuter = B.MeshBuilder.CreateSphere('hyperGhostOuter', { diameter: 4.2, segments: 24 }, scene);
hyperGhostOuter.material = makeMat('hyperGhostMat', '#68a7ff', { alpha: 0.14, wireframe: true, unlit: true });
hyperGhostOuter.parent = g4Sphere;

// Stage 4B: Non-gory Sci-Fi Holographic Blueprint Anatomy (Torso + Organs + Vascular Conduits + XW 2D Intersection Plane)
const g4Anatomy = new B.TransformNode('stage4Anatomy', scene);
g4Anatomy.parent = g4;

const anatShellMat = makeMat('anatShellMat', '#78c9d4', { alpha: 0.18, emissive: 0.18 });
const anatHeartMat = makeMat('anatHeartMat', '#ee786c', { alpha: 0.9, emissive: 0.45 });
const anatLungMat = makeMat('anatLungMat', '#73c6e3', { alpha: 0.52, emissive: 0.22 });
const anatVeinMat = makeMat('anatVeinMat', '#dfbb73', { alpha: 0.85, emissive: 0.35 });
const anatSpineMat = makeMat('anatSpineMat', '#e5e3d9', { alpha: 0.82, emissive: 0.2 });

const anatBodyRoot = new B.TransformNode('anatBodyRoot', scene);
anatBodyRoot.parent = g4Anatomy;

// Stylized non-gory holographic torso blueprint
const anatTorso = B.MeshBuilder.CreateCylinder('anatTorso', { diameterTop: 1.24, diameterBottom: 0.96, height: 2.2, tessellation: 28 }, scene);
anatTorso.material = anatShellMat;
anatTorso.parent = anatBodyRoot;

const anatHead = B.MeshBuilder.CreateSphere('anatHead', { diameter: 0.68, segments: 18 }, scene);
anatHead.position.y = 1.52;
anatHead.material = anatShellMat;
anatHead.parent = anatBodyRoot;

// Spine column + rib rings
const anatSpine = B.MeshBuilder.CreateCylinder('anatSpine', { diameter: 0.13, height: 2.05, tessellation: 12 }, scene);
anatSpine.position.z = -0.24;
anatSpine.material = anatSpineMat;
anatSpine.parent = anatBodyRoot;

const anatRibs = [];
for (let r = 0; r < 5; r++) {
  const rib = B.MeshBuilder.CreateTorus('anatRib' + r, { diameter: 0.92 - r * 0.04, thickness: 0.032, tessellation: 28 }, scene);
  rib.position.y = 0.62 - r * 0.24;
  rib.scaling.z = 0.72;
  rib.material = anatSpineMat;
  rib.parent = anatBodyRoot;
  anatRibs.push(rib);
}

// Stylized heart core & lungs
const anatHeart = B.MeshBuilder.CreateSphere('anatHeart', { diameterX: 0.28, diameterY: 0.34, diameterZ: 0.26, segments: 16 }, scene);
anatHeart.position.set(0.08, 0.24, 0.05);
anatHeart.material = anatHeartMat;
anatHeart.parent = anatBodyRoot;

const anatLungL = B.MeshBuilder.CreateSphere('anatLungL', { diameterX: 0.34, diameterY: 0.68, diameterZ: 0.38, segments: 16 }, scene);
anatLungL.position.set(-0.28, 0.28, -0.02);
anatLungL.material = anatLungMat;
anatLungL.parent = anatBodyRoot;

const anatLungR = B.MeshBuilder.CreateSphere('anatLungR', { diameterX: 0.34, diameterY: 0.68, diameterZ: 0.38, segments: 16 }, scene);
anatLungR.position.set(0.28, 0.28, -0.02);
anatLungR.material = anatLungMat;
anatLungR.parent = anatBodyRoot;

// Major vascular light-conduits (aorta + branching arcs)
const vesselPath1 = [
  new B.Vector3(0.08, 0.36, 0.04),
  new B.Vector3(0.04, 0.62, -0.05),
  new B.Vector3(-0.04, 0.56, -0.14),
  new B.Vector3(-0.04, -0.82, -0.14)
];
const vesselAorta = B.MeshBuilder.CreateTube('anatAorta', { path: vesselPath1, radius: 0.04, tessellation: 12 }, scene);
vesselAorta.material = anatVeinMat;
vesselAorta.parent = anatBodyRoot;

const vesselPath2 = [
  new B.Vector3(-0.42, -0.75, 0.08),
  new B.Vector3(-0.22, -0.15, 0.1),
  new B.Vector3(0.06, 0.26, 0.08),
  new B.Vector3(0.24, 0.78, 0.04)
];
const vesselVena = B.MeshBuilder.CreateTube('anatVena', { path: vesselPath2, radius: 0.032, tessellation: 12 }, scene);
vesselVena.material = makeMat('anatVenaMat', '#68a7ff', { alpha: 0.85, emissive: 0.35 });
vesselVena.parent = anatBodyRoot;

// Glowing holographic scan / 2D intersection plane!
const scanPlane = B.MeshBuilder.CreatePlane('scanPlane', { width: 2.3, height: 2.6 }, scene);
scanPlane.material = makeMat('scanPlaneMat', '#80ccb9', { alpha: 0.24, emissive: 0.55 });
scanPlane.parent = g4Anatomy;

const scanBorder = B.MeshBuilder.CreateLines('scanBorder', {
  points: [
    new B.Vector3(-1.15, -1.3, 0),
    new B.Vector3(1.15, -1.3, 0),
    new B.Vector3(1.15, 1.3, 0),
    new B.Vector3(-1.15, 1.3, 0),
    new B.Vector3(-1.15, -1.3, 0)
  ]
}, scene);
scanBorder.color = B.Color3.FromHexString('#80ccb9');
scanBorder.parent = scanPlane;

// 2D intersection silhouette ring drawn right on the scanPlane when XW-tilted or cutaway!
const sliceContourRing = B.MeshBuilder.CreateTorus('sliceContourRing', { diameter: 0.92, thickness: 0.035, tessellation: 36 }, scene);
sliceContourRing.material = makeMat('sliceContourMat', '#ffd566', { emissive: 0.7 });
sliceContourRing.parent = scanPlane;

// ============================================================
// Stage Configurations & Side-Panel Builder
// ============================================================
const STAGE_META = {
  1: {
    eyebrow: 'STAGE 01 / 常规 → 破界 · 难度 ★☆☆☆',
    title: '书页与 W 轴穿越',
    subtitle: '保持熟悉的 X、Y、Z 不动，首次主动沿第四个空间方向 W 连续平移。',
    objective: '按 Q / E 或拖动右侧 W 轴滑块，在几乎相同的 (X, Y, Z) 处先后穿过三层切片，收集 W = 0、W = +1.8、W = −1.8 的三枚信标，最后返回 W = 0。',
    hint: 'WASD 移动 (X/Z) · Q/E 或右侧滑块改变 W · 拖动旋转视角'
  },
  2: {
    eyebrow: 'STAGE 02 / 突破直觉 · 难度 ★★☆☆',
    title: '隔墙取物：封闭三维金库',
    subtitle: '一座六面严丝合缝的三维立方体金库位于 W = 0。在三维里绝无入口，但它在第四维的厚度有限。',
    objective: '先试着在 W = 0 撞击金库确认墙体坚固；再沿 W 移至 |W| > 0.90 绕过墙体 W 范围，走到中心并降回 W = 0 拾取黄金星核，再携核沿 W 绕出送到右侧接收台！',
    hint: 'WASD 移动 · Q/E 改变 W（绕过 W ∈ [−0.55,+0.55] 墙带） · 体验后再试「全 W 超墙反例」'
  },
  3: {
    eyebrow: 'STAGE 03 / 反直觉震撼 · 难度 ★★★☆',
    title: '维度魔术：双环解链与手性镜像',
    subtitle: '在三维空间中绝对无法改变的拓扑连接与左右手性，在四维刚体运动下变得自然而严密。',
    objective: '依次完成两个实验：① 将琥珀环抬入 W 维并无碰撞解开互套双环；② 对手性钥匙执行 XW 平面 180° 四维刚性旋转，使其镜像翻转并精确插入锁槽！',
    hint: '使用右侧实验滑块精准操纵双环 W/X 位移与四维 XW 旋转角'
  },
  4: {
    eyebrow: 'STAGE 04 / 终极震撼 · 难度 ★★★★',
    title: '四维超球切片与身体截面透视',
    subtitle: '分清“物体本体”“当前切片交集”与“三维投影”三件不同的事。',
    objective: '先滑动 W 轴穿过四维超球观察球体凭空浮现、胀大、消失；再切换至宇航员截面观察仪，对比「教学三维剖面」与「真实 XW 倾斜二维交集」。',
    hint: '拖动右侧 W 滑块或模式滑块，结合左下 2D 对照图观察切片与投影的区别'
  }
};

function renderStageControls() {
  const meta = STAGE_META[activeStage];
  $('stageEyebrow').textContent = meta.eyebrow;
  $('stageTitle').textContent = meta.title;
  $('stageSubtitle').textContent = meta.subtitle;
  $('objectiveText').textContent = meta.objective;
  $('controlsHint').textContent = meta.hint;

  document.querySelectorAll('#stageNav button').forEach(btn => {
    const n = Number(btn.dataset.stage);
    btn.classList.toggle('active', n === activeStage);
    btn.classList.toggle('done', completedStages.has(n));
  });

  $('prevStageBtn').disabled = activeStage === 1;
  $('nextStageBtn').textContent = activeStage === 4 ? '返回第一章 / 自由重玩' : '下一阶段 →';

  const box = $('stageControls');
  const wRail = $('wRail');
  wRail.classList.toggle('hidden', activeStage === 3);

  if (activeStage === 1) {
    box.innerHTML = `
      <div class="ch2-card-head"><span>快速 W 层书签（连续滑行）</span><small>BOOK STACK</small></div>
      <div class="ch2-btn-row">
        <button class="ch2-btn-sec" data-w-jump="-1.8">前往 W = −1.8</button>
        <button class="ch2-btn-sec" data-w-jump="0">回到 W = 0.0</button>
        <button class="ch2-btn-sec" data-w-jump="1.8">前往 W = +1.8</button>
      </div>
    `;
    box.querySelectorAll('[data-w-jump]').forEach(b => {
      b.onclick = () => {
        audio.unlock();
        const target = Number(b.dataset.wJump);
        stage1.move([0, 0, 0, target - stage1.player[3]]);
        audio.wSlideTone(stage1.player[3]);
        syncWSlider(stage1.player[3]);
      };
    });
  } else if (activeStage === 2) {
    box.innerHTML = `
      <div class="ch2-card-head"><span>金库物理边界实验</span><small>JORDAN–BROUWER</small></div>
      <div class="ch2-btn-row">
        <button id="vaultNormalBtn" class="ch2-btn-sec ${!stage2.hyperWall ? 'active' : ''}">正例：有限 W 墙 (|W|≤0.55)</button>
        <button id="vaultHyperBtn" class="ch2-btn-warn ${stage2.hyperWall ? 'active' : ''}">反例：全 W 封闭超墙</button>
      </div>
      <div class="ch2-btn-row">
        <button id="vaultAutoLift" class="ch2-btn-sec">沿 W 升至 +1.40</button>
        <button id="vaultAutoZero" class="ch2-btn-sec">降回 W = 0.00</button>
      </div>
    `;
    $('vaultNormalBtn').onclick = () => {
      audio.unlock();
      stage2.setHyperWall(false);
      syncWSlider(0);
      showToast('已切换正例：三维金库只占据 W ∈ [−0.55, +0.55]，可在高 W 层连续无碰撞绕入！');
      renderStageControls();
    };
    $('vaultHyperBtn').onclick = () => {
      audio.unlock();
      stage2.setHyperWall(true);
      syncWSlider(0);
      showToast('反例启动：墙体延伸至整个 [−4, +4] W 边界！现在无论如何改变 W 都无法绕过。');
      renderStageControls();
    };
    $('vaultAutoLift').onclick = () => {
      audio.unlock();
      const res = stage2.move([0, 0, 0, 1.4 - stage2.player[3]]);
      syncWSlider(stage2.player[3]);
      audio.wSlideTone(stage2.player[3]);
      if (res.blocked) showToast('在当前位置改变 W 被墙体阻挡！请先退离墙体边界。');
    };
    $('vaultAutoZero').onclick = () => {
      audio.unlock();
      const res = stage2.move([0, 0, 0, -stage2.player[3]]);
      syncWSlider(stage2.player[3]);
      audio.wSlideTone(stage2.player[3]);
      if (res.blocked) showToast('无法直接降回 W = 0：你正处在金库实心墙体正上方，请走到正中心或墙外再降！');
    };
  } else if (activeStage === 3) {
    box.innerHTML = `
      <div class="ch2-card-head"><span>选择第三阶段实验</span><small>TOPOLOGY & CHIRALITY</small></div>
      <div class="ch2-btn-row" style="margin-bottom:10px">
        <button id="sub3Rings" class="ch2-btn-sec ${stage3Sub === 'rings' ? 'active' : ''}">3A · 互套双环解链 ${stage3Rings.unlinked ? '✓' : ''}</button>
        <button id="sub3Key" class="ch2-btn-sec ${stage3Sub === 'key' ? 'active' : ''}">3B · 手性镜像钥匙 ${stage3Key.unlocked ? '✓' : ''}</button>
      </div>
      <div id="sub3Body"></div>
    `;
    $('sub3Rings').onclick = () => { stage3Sub = 'rings'; renderStageControls(); };
    $('sub3Key').onclick = () => { stage3Sub = 'key'; renderStageControls(); };
    const sub = $('sub3Body');
    if (stage3Sub === 'rings') {
      sub.innerHTML = `
        <div class="ch2-ctrl-row">
          <div class="ch2-ctrl-label"><span>琥珀环 W 轴抬升（避开 W=0 碰撞）</span><output id="ringWOut">${stage3Rings.bw.toFixed(2)}</output></div>
          <input id="ringWSlider" type="range" min="-1.6" max="1.6" step="0.02" value="${stage3Rings.bw}">
        </div>
        <div class="ch2-ctrl-row">
          <div class="ch2-ctrl-label"><span>琥珀环 X 轴横向分离（目标 ≥ +1.60）</span><output id="ringXOut">${stage3Rings.bx.toFixed(2)}</output></div>
          <input id="ringXSlider" type="range" min="0.1" max="2.1" step="0.02" value="${stage3Rings.bx}">
        </div>
      `;
      const onRingInput = () => {
        audio.unlock();
        const tx = Number($('ringXSlider').value);
        const tw = Number($('ringWSlider').value);
        const res = stage3Rings.moveTo(tx, tw);
        $('ringXSlider').value = String(res.bx);
        $('ringWSlider').value = String(res.bw);
        $('ringXOut').textContent = res.bx.toFixed(2);
        $('ringWOut').textContent = res.bw.toFixed(2);
        if (res.blocked) audio.probeBounce(1.8);
        if (res.unlinked) {
          audio.evidenceUnlocked();
          showToast('双环无碰撞完整解链！全程零断裂、零穿透。继续试试 3B 手性镜像钥匙！');
          if (stage3Key.unlocked) markStageComplete(3, '第三阶段全部完成！你已掌握四维解链与刚性手性翻转！');
          renderStageControls();
        }
      };
      $('ringWSlider').oninput = onRingInput;
      $('ringXSlider').oninput = onRingInput;
    } else {
      sub.innerHTML = `
        <div class="ch2-ctrl-row">
          <div class="ch2-ctrl-label"><span>三维旋转 XY（无法翻转手性）</span><output id="kXYOut">${stage3Key.rotXY}°</output></div>
          <input id="kXY" type="range" min="-180" max="180" step="1" value="${stage3Key.rotXY}">
        </div>
        <div class="ch2-ctrl-row">
          <div class="ch2-ctrl-label"><span>三维旋转 XZ（无法翻转手性）</span><output id="kXZOut">${stage3Key.rotXZ}°</output></div>
          <input id="kXZ" type="range" min="-180" max="180" step="1" value="${stage3Key.rotXZ}">
        </div>
        <div class="ch2-ctrl-row">
          <div class="ch2-ctrl-label"><span style="color:#dfbb73">★ 四维旋转 XW（180° 刚性镜像翻转！）</span><output id="kXWOut">${stage3Key.rotXW}°</output></div>
          <input id="kXW" type="range" min="0" max="180" step="1" value="${stage3Key.rotXW}">
        </div>
        <div class="ch2-btn-row">
          <button id="kReset3D" class="ch2-btn-sec">归零三维角</button>
          <button id="kDemo180" class="ch2-btn-pri">演示 XW → 180°</button>
        </div>
      `;
      const updateKey = () => {
        audio.unlock();
        const xy = Number($('kXY').value);
        const xz = Number($('kXZ').value);
        const xw = Number($('kXW').value);
        $('kXYOut').textContent = xy + '°';
        $('kXZOut').textContent = xz + '°';
        $('kXWOut').textContent = xw + '°';
        const res = stage3Key.setAngles({ xy, xz, yz: 0, xw });
        if (res.matchesLock) {
          audio.evidenceUnlocked();
          showToast('咔哒！四维刚性旋转 180° 将左手钥匙无形变翻转为右手镜像，精准开锁！');
          markStageComplete(3, '第三阶段完成！手性镜像锁已打开，随时进入第四阶段终极震撼！');
        }
      };
      $('kXY').oninput = updateKey;
      $('kXZ').oninput = updateKey;
      $('kXW').oninput = updateKey;
      $('kReset3D').onclick = () => {
        $('kXY').value = '0'; $('kXZ').value = '0'; updateKey();
      };
      $('kDemo180').onclick = () => {
        audio.unlock();
        $('kXY').value = '0'; $('kXZ').value = '0';
        let angle = Number($('kXW').value);
        const step = () => {
          if (activeStage !== 3 || stage3Sub !== 'key') return;
          angle = Math.min(180, angle + 3);
          $('kXW').value = String(angle);
          updateKey();
          if (angle < 180) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      };
    }
  } else if (activeStage === 4) {
    box.innerHTML = `
      <div class="ch2-card-head"><span>选择第四阶段震撼观察</span><small>SLICE VS PROJECTION</small></div>
      <div class="ch2-btn-row" style="margin-bottom:10px">
        <button id="sub4Sphere" class="ch2-btn-sec ${stage4Sub === 'sphere' ? 'active' : ''}">4A · 四维超球切片</button>
        <button id="sub4Anatomy" class="ch2-btn-sec ${stage4Sub === 'anatomy' ? 'active' : ''}">4B · 宇航员内部截面仪</button>
      </div>
      <div id="sub4Body"></div>
    `;
    $('sub4Sphere').onclick = () => { stage4Sub = 'sphere'; renderStageControls(); };
    $('sub4Anatomy').onclick = () => {
      stage4Sub = 'anatomy';
      markStageComplete(4, '恭喜通关第二章四维内部全部四阶段实验！');
      renderStageControls();
    };
    const sub = $('sub4Body');
    if (stage4Sub === 'sphere') {
      sub.innerHTML = `
        <p style="margin:0 0 8px;font-size:12px;color:#b8d1d5">拖动右侧 <b>W 轴滑块</b>（或按 Q/E），穿越半径 R = 2.1 的四维实心超球。超球本身并未呼吸缩放，变化的是你的三维切片位置！</p>
        <div class="ch2-btn-row">
          <button id="s4Sweep" class="ch2-btn-pri">▶ 自动穿层扫描 (−2.6 → +2.6)</button>
        </div>
      `;
      $('s4Sweep').onclick = () => {
        audio.unlock();
        stage4W = -2.6;
        const tick = () => {
          if (activeStage !== 4 || stage4Sub !== 'sphere') return;
          stage4W += 0.04;
          syncWSlider(stage4W);
          if (stage4W < 2.6) requestAnimationFrame(tick);
          else markStageComplete(4, '已完整观测四维超球从无到有、膨胀再消失的精确切片对称性！');
        };
        requestAnimationFrame(tick);
      };
    } else {
      sub.innerHTML = `
        <div class="ch2-btn-row" style="margin-bottom:10px">
          <button id="anatModeCut" class="ch2-btn-sec ${stage4AnatomyMode === 'cutaway' ? 'active' : ''}">方案 A · 教学三维剖切</button>
          <button id="anatModeTilt" class="ch2-btn-sec ${stage4AnatomyMode === 'xw-tilt' ? 'active' : ''}">方案 B · 真实 XW 倾斜交集</button>
        </div>
        ${stage4AnatomyMode === 'cutaway' ? `
          <div class="ch2-ctrl-row">
            <div class="ch2-ctrl-label"><span>教学扫描剖面高度 Y</span><output id="cutYOut">${stage4CutY.toFixed(2)}</output></div>
            <input id="cutYSlider" type="range" min="-1.0" max="1.0" step="0.02" value="${stage4CutY}">
          </div>
          <small style="color:#98b4bc;font-size:11px">标注：教学剖面示意，用于观察心脏、肺叶、脊柱与血管回路的内部结构，不代表身体被真实切开。</small>
        ` : `
          <div class="ch2-ctrl-row">
            <div class="ch2-ctrl-label"><span>三维躯体 XW 平面倾斜角 θ</span><output id="tiltOut">${stage4TiltDeg}°</output></div>
            <input id="tiltSlider" type="range" min="0" max="90" step="1" value="${stage4TiltDeg}">
          </div>
          <small style="color:#98b4bc;font-size:11px">标注：零 W 厚度三维刚体倾斜后与 W=c 超平面只产生无厚度的<b>二维截面交集</b>，并非立体残肢！拖动右侧 W 滑块扫描整具躯体。</small>
        `}
      `;
      if (stage4AnatomyMode === 'cutaway') {
        $('cutYSlider').oninput = e => {
          stage4CutY = Number(e.target.value);
          $('cutYOut').textContent = stage4CutY.toFixed(2);
        };
      } else {
        $('tiltSlider').oninput = e => {
          stage4TiltDeg = Number(e.target.value);
          $('tiltOut').textContent = stage4TiltDeg + '°';
        };
      }
      $('anatModeCut').onclick = () => { stage4AnatomyMode = 'cutaway'; renderStageControls(); };
      $('anatModeTilt').onclick = () => { stage4AnatomyMode = 'xw-tilt'; renderStageControls(); };
    }
  }
}

function getCurrentW() {
  if (activeStage === 1) return stage1.player[3];
  if (activeStage === 2) return stage2.player[3];
  if (activeStage === 3) return stage3Sub === 'rings' ? stage3Rings.bw : 0;
  return stage4W;
}

function syncWSlider(w) {
  const clamped = Math.max(-3.4, Math.min(3.4, w));
  $('wSlider').value = String(clamped);
  $('wReadout').textContent = (clamped >= 0 ? '+' : '') + clamped.toFixed(2);
}

function selectStage(num) {
  activeStage = Math.max(1, Math.min(4, num));
  g1.setEnabled(activeStage === 1);
  g2.setEnabled(activeStage === 2);
  g3.setEnabled(activeStage === 3);
  g4.setEnabled(activeStage === 4);
  syncWSlider(getCurrentW());
  camera.target.set(0, 0, 0);
  camera.radius = activeStage === 2 ? 9.6 : activeStage === 3 ? 6.6 : 8.2;
  renderStageControls();
}

// ============================================================
// Synchronized 2D Flatlander / Book-Page Analogy Renderer
// ============================================================
const analogyCanvas = $('analogyCanvas');
const actx = analogyCanvas.getContext('2d');

function drawAnalogy(time) {
  const w = analogyCanvas.width;
  const h = analogyCanvas.height;
  actx.clearRect(0, 0, w, h);
  actx.fillStyle = '#06111c';
  actx.fillRect(0, 0, w, h);

  if (activeStage === 1) {
    $('analogyTag').textContent = '书本叠页 · 2D ⊂ 3D';
    $('analogyCaption').textContent = '二维纸片人从书本的第 0 页垂直抬起进入第 +1.8 / −1.8 页：纸面 (x, y) 不变，环境却换了整整一页。';
    const curW = stage1.player[3];
    // Draw 5 stacked isometric book pages
    const levels = [-1.8, -0.9, 0, 0.9, 1.8];
    levels.forEach(lv => {
      const y = h * 0.54 - lv * 22;
      const isNear = Math.abs(curW - lv) < 0.35;
      actx.fillStyle = isNear ? 'rgba(128, 204, 185, 0.24)' : 'rgba(80, 126, 145, 0.08)';
      actx.strokeStyle = isNear ? '#80ccb9' : 'rgba(128, 204, 185, 0.25)';
      actx.lineWidth = isNear ? 1.8 : 1;
      actx.beginPath();
      actx.moveTo(64, y);
      actx.lineTo(160, y - 16);
      actx.lineTo(256, y);
      actx.lineTo(160, y + 16);
      actx.closePath();
      actx.fill();
      actx.stroke();
      if (lv === 0 || Math.abs(lv) === 1.8) {
        actx.fillStyle = lv === 0 ? '#80ccb9' : lv > 0 ? '#dfbb73' : '#68a7ff';
        actx.font = '10px monospace';
        actx.fillText(`W=${lv > 0 ? '+' : ''}${lv}`, 262, y + 3);
      }
    });
    // Vertical W spine line & flatlander dot
    const py = h * 0.54 - curW * 22;
    actx.strokeStyle = 'rgba(223, 187, 115, 0.45)';
    actx.setLineDash([3, 3]);
    actx.beginPath();
    actx.moveTo(160, 18);
    actx.lineTo(160, h - 14);
    actx.stroke();
    actx.setLineDash([]);
    actx.fillStyle = '#ffffff';
    actx.beginPath();
    actx.arc(160, py, 5.5, 0, Math.PI * 2);
    actx.fill();
  } else if (activeStage === 2) {
    $('analogyTag').textContent = stage2.hyperWall ? '全厚壁反例' : '离面跨圈取宝';
    $('analogyCaption').textContent = stage2.hyperWall
      ? '反例：围墙沿额外维度一路封到容器顶底，纸片人再怎么抬升也绕不过去！'
      : '正例：纸片人向上离开纸面，越过画在纸上的封闭方框，落回框内拿走星星再飞出！';
    // Side-elevation X vs W diagram (exact 2D cross-section of our 4D vault!)
    const mapX = x => w * 0.5 + x * 40;
    const mapW = ww => h * 0.54 - ww * 24;
    // Draw W=0 paper line
    actx.strokeStyle = 'rgba(128, 204, 185, 0.25)';
    actx.beginPath();
    actx.moveTo(18, mapW(0));
    actx.lineTo(w - 18, mapW(0));
    actx.stroke();
    // Draw left & right vault walls in (X, W) plane
    const wallH = stage2.hyperWall ? h - 16 : VAULT_SPEC.wallHalfW * 48;
    const wallTop = stage2.hyperWall ? 8 : mapW(VAULT_SPEC.wallHalfW);
    actx.fillStyle = stage2.hyperWall ? 'rgba(238, 120, 108, 0.55)' : 'rgba(78, 167, 188, 0.55)';
    const xL1 = mapX(-VAULT_SPEC.outerHalf), xL2 = mapX(-VAULT_SPEC.innerHalf);
    const xR1 = mapX(VAULT_SPEC.innerHalf), xR2 = mapX(VAULT_SPEC.outerHalf);
    actx.fillRect(xL1, wallTop, xL2 - xL1, wallH);
    actx.fillRect(xR1, wallTop, xR2 - xR1, wallH);
    // Core & Pedestal
    actx.fillStyle = '#ffd566';
    actx.beginPath();
    actx.arc(mapX(stage2.corePos[0]), mapW(stage2.corePos[3]), 4.5, 0, Math.PI * 2);
    actx.fill();
    actx.strokeStyle = '#80ccb9';
    actx.strokeRect(mapX(VAULT_SPEC.pedestalPos[0]) - 6, mapW(0) - 6, 12, 12);
    // Player 4D trail in (X, W)
    if (stage2.trail.length > 1) {
      actx.strokeStyle = 'rgba(223, 187, 115, 0.65)';
      actx.lineWidth = 1.6;
      actx.beginPath();
      stage2.trail.forEach((pt, idx) => {
        const px = mapX(pt[0]), pw = mapW(pt[3]);
        if (idx === 0) actx.moveTo(px, pw);
        else actx.lineTo(px, pw);
      });
      actx.stroke();
    }
    // Player dot
    actx.fillStyle = '#ffffff';
    actx.beginPath();
    actx.arc(mapX(stage2.player[0]), mapW(stage2.player[3]), 5, 0, Math.PI * 2);
    actx.fill();
    actx.fillStyle = '#98b4bc';
    actx.font = '10px monospace';
    actx.fillText('X 轴 →', w - 48, mapW(0) - 5);
    actx.fillText('W↑', 12, 18);
  } else if (activeStage === 3) {
    if (stage3Sub === 'rings') {
      $('analogyTag').textContent = 'X–W 分离轨迹';
      $('analogyCaption').textContent = '青环固定在 W=0；只有把琥珀环先抬离 W=0（绕过截面交点），再沿 X 滑出，最后落回 W=0，双环才能完整分离。';
      const mx = x => 62 + x * 92;
      const mw = ww => h * 0.54 - ww * 34;
      actx.strokeStyle = 'rgba(128,204,185,0.22)';
      actx.beginPath(); actx.moveTo(16, mw(0)); actx.lineTo(w - 16, mw(0)); actx.stroke();
      // Ring A cross points at x = -0.45 ± 0.90 = -1.35 and +0.45 -> show +0.45 barrier!
      actx.fillStyle = '#5cd5e5';
      actx.beginPath(); actx.arc(mx(0.45), mw(0), 8, 0, Math.PI * 2); actx.fill();
      actx.fillStyle = '#dfbb73';
      actx.strokeStyle = '#dfbb73';
      actx.lineWidth = 3;
      actx.beginPath();
      actx.moveTo(mx(stage3Rings.bx - RING_SPEC.majorR), mw(stage3Rings.bw));
      actx.lineTo(mx(stage3Rings.bx + RING_SPEC.majorR), mw(stage3Rings.bw));
      actx.stroke();
      actx.fillStyle = '#98b4bc';
      actx.font = '10px monospace';
      actx.fillText('青环壁', mx(0.45) - 16, mw(0) + 20);
      actx.fillText(`琥珀环 (W=${stage3Rings.bw.toFixed(2)})`, 14, 18);
    } else {
      $('analogyTag').textContent = '二维三角形翻转镜像';
      $('analogyCaption').textContent = '纸面上的不对称三角形，在纸内怎么转都无法变成镜像；但借第三维翻转 180° 落回纸面，便成精确镜像。';
      const theta = (stage3Key.rotXW * Math.PI) / 180;
      const cosT = Math.cos(theta);
      const cx = w * 0.5, cy = h * 0.56;
      // Target mirror triangle (dashed)
      actx.strokeStyle = 'rgba(128, 204, 185, 0.5)';
      actx.setLineDash([4, 3]);
      actx.beginPath();
      actx.moveTo(cx, cy); actx.lineTo(cx - 64, cy + 16); actx.lineTo(cx - 18, cy - 42); actx.closePath();
      actx.stroke();
      actx.setLineDash([]);
      // Flipping triangle
      actx.fillStyle = 'rgba(223, 187, 115, 0.25)';
      actx.strokeStyle = '#dfbb73';
      actx.lineWidth = 2;
      actx.beginPath();
      actx.moveTo(cx, cy);
      actx.lineTo(cx + 64 * cosT, cy + 16);
      actx.lineTo(cx + 18 * cosT, cy - 42);
      actx.closePath();
      actx.fill();
      actx.stroke();
      actx.fillStyle = '#cfe3e5';
      actx.font = '10px monospace';
      actx.fillText(`翻转角 θ = ${stage3Key.rotXW}°`, 12, 18);
      actx.fillText(cosT < 0 ? '手性：镜像 (−)' : '手性：原样 (+)', w - 102, 18);
    }
  } else {
    if (stage4Sub === 'sphere') {
      $('analogyTag').textContent = '三维球穿二维纸面';
      $('analogyCaption').textContent = '三维实心球穿过一张二维纸，纸上只见到圆盘从小变大再缩小消失。升一维即见四维超球的三维球切片！';
      const R = 48;
      const cy = h * 0.52;
      const sliceY = cy - (stage4W / 2.1) * R;
      // Draw 3D sphere side-view circle
      actx.strokeStyle = 'rgba(104, 167, 255, 0.55)';
      actx.lineWidth = 1.6;
      actx.beginPath(); actx.arc(92, cy, R, 0, Math.PI * 2); actx.stroke();
      // Slice plane line
      actx.strokeStyle = '#dfbb73';
      actx.beginPath(); actx.moveTo(24, sliceY); actx.lineTo(164, sliceY); actx.stroke();
      // Resulting 2D disk on right
      const s = hypersphereSlice(stage4W);
      if (s.exists) {
        const rr = s.fraction * R;
        actx.fillStyle = 'rgba(100, 216, 203, 0.35)';
        actx.strokeStyle = '#64d8cb';
        actx.beginPath(); actx.arc(240, cy, rr, 0, Math.PI * 2); actx.fill(); actx.stroke();
      }
      actx.fillStyle = '#98b4bc';
      actx.font = '10px monospace';
      actx.fillText('超球全貌', 68, 16);
      actx.fillText(`切片半径 r=${s.radius.toFixed(2)}`, 192, 16);
    } else {
      $('analogyTag').textContent = stage4AnatomyMode === 'cutaway' ? '教学剖切示意' : '纸面倾斜交线';
      $('analogyCaption').textContent = stage4AnatomyMode === 'cutaway'
        ? '正如我们在三维中一眼看清二维纸片人的“内脏”，沿额外维度观察可越过封闭三维皮肤（教学示意，非物理切割）。'
        : '一张倾斜的二维纸穿过水平桌面，交集只是一条一维线段；同理，倾斜的三维身体与固定 W 切片只相交为二维截面！';
      const cx = w * 0.5, cy = h * 0.54;
      // Horizontal slice line W = stage4W
      const wy = cy - stage4W * 24;
      actx.strokeStyle = '#80ccb9';
      actx.beginPath(); actx.moveTo(26, wy); actx.lineTo(w - 26, wy); actx.stroke();
      // Tilted segment representing 3D body in XW plane
      const rad = ((stage4AnatomyMode === 'xw-tilt' ? stage4TiltDeg : 0) * Math.PI) / 180;
      const half = 58;
      actx.strokeStyle = '#dfbb73';
      actx.lineWidth = 4;
      actx.beginPath();
      actx.moveTo(cx - Math.cos(rad) * half, cy + Math.sin(rad) * half);
      actx.lineTo(cx + Math.cos(rad) * half, cy - Math.sin(rad) * half);
      actx.stroke();
      const inter = xwTiltedBodyIntersection(stage4AnatomyMode === 'xw-tilt' ? stage4TiltDeg : 0, stage4W);
      if (inter.intersects && inter.dimension === 2) {
        const ix = cx + (inter.worldX / 0.62) * half;
        actx.fillStyle = '#ff6d6d';
        actx.beginPath(); actx.arc(ix, wy, 5.5, 0, Math.PI * 2); actx.fill();
      }
      actx.fillStyle = '#98b4bc';
      actx.font = '10px monospace';
      actx.fillText(`交集维数：${inter.dimension}D`, 14, 18);
    }
  }
}

// ============================================================
// Input & UI Wiring
// ============================================================
$('stageNav').querySelectorAll('button').forEach(btn => {
  btn.onclick = () => { audio.unlock(); selectStage(Number(btn.dataset.stage)); };
});
$('prevStageBtn').onclick = () => { audio.unlock(); selectStage(activeStage - 1); };
$('nextStageBtn').onclick = () => {
  audio.unlock();
  if (activeStage < 4) selectStage(activeStage + 1);
  else location.href = 'chapter.html';
};
$('resetStageBtn').onclick = () => {
  audio.unlock();
  if (activeStage === 1) stage1.reset();
  if (activeStage === 2) stage2.reset(stage2.hyperWall);
  if (activeStage === 3) { stage3Rings.reset(); stage3Key.reset(); }
  if (activeStage === 4) { stage4W = 0; stage4CutY = 0; stage4TiltDeg = 35; }
  syncWSlider(getCurrentW());
  renderStageControls();
  showToast('已重置当前实验状态。');
};
$('toggleProjection').onclick = () => {
  showProjection = !showProjection;
  $('toggleProjection').classList.toggle('active', showProjection);
  $('toggleProjection').setAttribute('aria-pressed', String(showProjection));
  $('toggleProjection').textContent = showProjection ? '4D 投影虚影 开 (P)' : '4D 投影虚影 关 (P)';
};
$('toggleCamMode').onclick = () => {
  camMode = camMode === 'orbit' ? 'follow' : 'orbit';
  $('toggleCamMode').textContent = camMode === 'orbit' ? '视角：环绕观察' : '视角：跟随代理';
};
$('toggleAudio').onclick = () => {
  audio.unlock();
  const m = audio.toggleMute();
  $('toggleAudio').textContent = m ? '音效 关' : '音效 开';
};
$('togglePhysicsNote').onclick = () => $('physicsModal').classList.remove('hidden');
$('closePhysicsModal').onclick = () => $('physicsModal').classList.add('hidden');

$('wSlider').oninput = e => {
  audio.unlock();
  const targetW = Number(e.target.value);
  if (activeStage === 1) {
    const res = stage1.move([0, 0, 0, targetW - stage1.player[3]]);
    if (res.newlyCollected) { audio.routeStep(stage1.collected.size); showToast(`已采集 ${res.newlyCollected.label}！`); }
    if (res.complete) markStageComplete(1, '第一阶段完成！你已掌握独立改变第四坐标 W，可进入第二阶段「隔墙取物」！');
  } else if (activeStage === 2) {
    const res = stage2.move([0, 0, 0, targetW - stage2.player[3]]);
    if (res.blocked) audio.probeBounce(1.5);
    if (res.picked) { audio.evidenceUnlocked(); showToast('已拾取黄金星核！现在沿 W 抬出金库，送到右侧接收台！'); }
    if (res.delivered) markStageComplete(2, '隔墙取物成功！你全程零穿墙、零拆壁地从封闭三维盒内取出了星核！');
  } else if (activeStage === 4) {
    stage4W = targetW;
  }
  const realW = getCurrentW();
  syncWSlider(realW);
  if (performance.now() - lastWBeep > 120) {
    lastWBeep = performance.now();
    audio.wSlideTone(realW);
  }
};

document.addEventListener('keydown', e => {
  if (e.code === 'Escape') {
    $('physicsModal').classList.add('hidden');
    return;
  }
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName)) return;
  if (e.code === 'KeyP' && !e.repeat) { $('toggleProjection').click(); return; }
  if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'Space', 'ShiftLeft', 'ShiftRight'].includes(e.code)) {
    audio.unlock();
    keys.add(e.code);
  }
});
document.addEventListener('keyup', e => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());
window.addEventListener('resize', () => engine.resize());

// ============================================================
// Main Simulation & Render Loop
// ============================================================
let time = 0;
let lastBlockToast = 0;
selectStage(1);
audio.setMode('chapter2');

engine.runRenderLoop(() => {
  const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
  time += dt;

  // Camera-relative horizontal movement for Stages 1 & 2
  const moveF = Number(keys.has('KeyW')) - Number(keys.has('KeyS'));
  const moveR = Number(keys.has('KeyD')) - Number(keys.has('KeyA'));
  const moveY = Number(keys.has('Space')) - Number(keys.has('ShiftLeft') || keys.has('ShiftRight'));
  const moveW = Number(keys.has('KeyE')) - Number(keys.has('KeyQ'));

  const fwd = camera.getForwardRay().direction;
  const fx = fwd.x, fz = fwd.z;
  const fl = Math.hypot(fx, fz) || 1;
  const dirF = [fx / fl, fz / fl];
  const dirR = [fz / fl, -fx / fl];
  const speed = 2.6;
  const dx = (dirF[0] * moveF + dirR[0] * moveR) * speed * dt;
  const dz = (dirF[1] * moveF + dirR[1] * moveR) * speed * dt;
  const dy = moveY * 2.0 * dt;
  const dw = moveW * 1.9 * dt;

  if (activeStage === 1) {
    if (Math.hypot(dx, dy, dz, dw) > 1e-6) {
      const res = stage1.move([dx, dy, dz, dw]);
      if (Math.abs(dw) > 1e-4) {
        syncWSlider(stage1.player[3]);
        if (performance.now() - lastWBeep > 150) { lastWBeep = performance.now(); audio.wSlideTone(stage1.player[3]); }
      }
      if (res.newlyCollected) {
        audio.routeStep(stage1.collected.size);
        showToast(`已抵达并采集 ${res.newlyCollected.label}！`);
      }
      if (res.complete) {
        markStageComplete(1, '第一阶段完成！你已掌握独立改变 W 坐标，点击「下一阶段」挑战隔墙取物！');
      }
    }
    const p = stage1.player;
    s1Player.position.set(p[0], p[1], p[2]);
    if (camMode === 'follow') camera.target.set(p[0], p[1], p[2]);

    // Update cross-W beacons visibility based on distance in W (true slice vs ghost projection!)
    for (const b of s1Beacons) {
      const dwB = Math.abs(p[3] - b.spec.pos[3]);
      const inSlice = dwB < 0.45;
      const vis = inSlice ? Math.max(0.25, 1 - dwB / 0.5) : (showProjection ? 0.14 : 0);
      b.node.setEnabled(vis > 0.01);
      b.core.rotation.y = time * 1.1;
      b.core.scaling.setAll(stage1.collected.has(b.spec.id) ? 0.55 : 1);
      b.core.material.alpha = vis;
      b.ring.material.alpha = vis * 0.78;
      for (const ex of b.extras) ex.material.alpha = vis * 0.65;
    }

    $('viewModeText').textContent = `当前三维切片交集 · W = ${p[3].toFixed(2)}`;
    $('coordReadout').textContent = `X ${p[0] >= 0 ? '+' : ''}${p[0].toFixed(2)} · Y ${p[1] >= 0 ? '+' : ''}${p[1].toFixed(2)} · Z ${p[2] >= 0 ? '+' : ''}${p[2].toFixed(2)} · W ${p[3] >= 0 ? '+' : ''}${p[3].toFixed(2)}`;
    $('stageStatusTag').textContent = stage1.isComplete ? '已完成 ✓' : `已采集 ${stage1.collected.size}/3`;
    $('stageStatusTag').classList.toggle('done', stage1.isComplete);
    $('stageProgressMeta').innerHTML = STAGE1_BEACONS.map(b =>
      `<span class="ch2-pill-tag ${stage1.collected.has(b.id) ? 'lit' : ''}">${b.label} ${stage1.collected.has(b.id) ? '✓' : '·'}</span>`
    ).join('') + `<span class="ch2-pill-tag ${stage1.returnedToZero ? 'lit' : ''}">返回 W=0 ${stage1.returnedToZero ? '✓' : '·'}</span>`;
    $('invariantReadout').innerHTML = `
      容器内腔：<b>(-4, +4)⁴</b>（代理半径 0.25 全程严格在内）<br>
      三维本体尺寸：<span class="ok">恒定 0.50m（未拉伸未增厚）</span><br>
      W 层偏移：<b>${p[3].toFixed(2)}</b>（与 X/Y/Z 完全正交独立）
    `;
  } else if (activeStage === 2) {
    if (Math.hypot(dx, dy, dz, dw) > 1e-6) {
      const res = stage2.move([dx, dy, dz, dw]);
      if (Math.abs(dw) > 1e-4) {
        syncWSlider(stage2.player[3]);
        if (performance.now() - lastWBeep > 150) { lastWBeep = performance.now(); audio.wSlideTone(stage2.player[3]); }
      }
      if (res.blocked && performance.now() - lastBlockToast > 1100) {
        lastBlockToast = performance.now();
        audio.probeBounce(2.0);
        showToast(stage2.hyperWall
          ? '全 W 超墙拦截！这座墙封死了所有 W 通道，连四维绕行也无路可走。'
          : '三维实心墙阻挡！按 E 或上拉右侧 W 滑块超过 +0.90 即可离开墙体所在 W 层绕入。');
      }
      if (res.picked) {
        audio.evidenceUnlocked();
        showToast('已成功从封闭三维金库内部拾取黄金星核！现在按 E 抬升 W，携核绕出金库并送到右侧接收台！');
      }
      if (res.delivered) {
        markStageComplete(2, '隔墙取物大功告成！全程保持四维真实碰撞、零穿墙！');
      }
    }
    const p = stage2.player;
    s2Player.position.set(p[0], p[1], p[2]);
    if (camMode === 'follow') camera.target.set(p[0], p[1], p[2]);

    const inWallBand = stage2.hyperWall || Math.abs(p[3]) <= VAULT_SPEC.wallHalfW + stage2.activeRadius();
    s2VaultOuter.setEnabled(inWallBand || showProjection);
    s2VaultOuter.material = inWallBand
      ? (stage2.hyperWall ? s2VaultHyperMat : s2VaultSolidMat)
      : s2VaultGhostMat;
    s2VaultWire.setEnabled(inWallBand || showProjection);
    s2VaultWire.material.alpha = inWallBand ? 0.72 : 0.16;

    s2Core.position.set(stage2.corePos[0], stage2.corePos[1] + Math.sin(time * 3) * 0.08, stage2.corePos[2]);
    s2Core.rotation.y = time * 1.5;
    const coreVisible = Math.abs(p[3] - stage2.corePos[3]) < 0.55 || stage2.carryingCore || showProjection;
    s2Core.setEnabled(coreVisible);
    s2Core.material.alpha = Math.abs(p[3] - stage2.corePos[3]) < 0.55 || stage2.carryingCore ? 1 : 0.22;

    const pedInSlice = Math.abs(p[3]) < 0.55;
    s2Pedestal.setEnabled(pedInSlice || showProjection);
    s2PedRing.setEnabled(pedInSlice || showProjection);
    s2Pedestal.material.alpha = pedInSlice ? 0.88 : 0.15;
    s2PedRing.material.alpha = pedInSlice ? 0.8 : 0.15;

    const clear = vaultClearance4D(p, stage2.activeRadius(), stage2.hyperWall);
    $('viewModeText').textContent = `${inWallBand ? '实心墙体内层' : '安全绕行层（墙外 W 带）'} · W = ${p[3].toFixed(2)}`;
    $('coordReadout').textContent = `X ${p[0] >= 0 ? '+' : ''}${p[0].toFixed(2)} · Y ${p[1] >= 0 ? '+' : ''}${p[1].toFixed(2)} · Z ${p[2] >= 0 ? '+' : ''}${p[2].toFixed(2)} · W ${p[3] >= 0 ? '+' : ''}${p[3].toFixed(2)}`;
    $('stageStatusTag').textContent = stage2.coreDelivered ? '取物成功 ✓' : stage2.carryingCore ? '携核撤离中' : stage2.enteredVault ? '已进入金库' : '墙外侦察';
    $('stageStatusTag').classList.toggle('done', stage2.coreDelivered);
    $('stageProgressMeta').innerHTML = `
      <span class="ch2-pill-tag ${stage2.enteredVault ? 'lit' : ''}">无穿墙入盒 ${stage2.enteredVault ? '✓' : '·'}</span>
      <span class="ch2-pill-tag ${stage2.carryingCore || stage2.coreDelivered ? 'lit' : ''}">拾取星核 ${stage2.carryingCore || stage2.coreDelivered ? '✓' : '·'}</span>
      <span class="ch2-pill-tag ${stage2.coreDelivered ? 'lit' : ''}">送回接收台 ${stage2.coreDelivered ? '✓' : '·'}</span>
    `;
    $('invariantReadout').innerHTML = `
      墙体模式：<b>${stage2.hyperWall ? '全 W 超墙（不可绕行）' : '有限 W 墙 |W|≤0.55'}</b><br>
      四维最小净空：<span class="${clear > 0 ? 'ok' : 'bad'}">${clear.toFixed(3)} m（全程禁止穿墙）</span><br>
      当前碰撞半径：<b>${stage2.activeRadius().toFixed(2)} m</b>（含携物包络）
    `;
  } else if (activeStage === 3) {
    g3Rings.setEnabled(stage3Sub === 'rings');
    g3Key.setEnabled(stage3Sub === 'key');

    if (stage3Sub === 'rings') {
      ringBMesh.position.x = stage3Rings.bx;
      // Subtle visual lift / tint so W separation is readable in 3D projection
      ringBMesh.position.y = showProjection ? stage3Rings.bw * 0.42 : 0;
      const inSlice = Math.abs(stage3Rings.bw) < 0.25;
      ringBMesh.material.alpha = inSlice ? 1 : (showProjection ? 0.48 : 0.08);
      const clear = stage3Rings.minObservedClearance;
      $('viewModeText').textContent = `3A 双环解链 · 琥珀环 W = ${stage3Rings.bw.toFixed(2)}`;
      $('coordReadout').textContent = `Ring B: X = ${stage3Rings.bx.toFixed(2)} · W = ${stage3Rings.bw.toFixed(2)}`;
      $('stageStatusTag').textContent = stage3Rings.unlinked ? '解链成功 ✓' : '拓扑互锁中';
      $('stageStatusTag').classList.toggle('done', stage3Rings.unlinked);
      $('stageProgressMeta').innerHTML = `
        <span class="ch2-pill-tag ${Math.abs(stage3Rings.bw) > 0.35 ? 'lit' : ''}">抬离 W=0</span>
        <span class="ch2-pill-tag ${stage3Rings.bx >= RING_SPEC.unlinkedBX ? 'lit' : ''}">横向分离</span>
        <span class="ch2-pill-tag ${stage3Rings.unlinked ? 'lit' : ''}">归回 W=0 ✓</span>
      `;
      $('invariantReadout').innerHTML = `
        双环拓扑状态：<b>${stage3Rings.unlinked ? '已分离（零断裂）' : '三维互套中'}</b><br>
        历史最小 4D 间距：<span class="ok">+${Math.max(0, clear).toFixed(3)} m（从未相交）</span><br>
        双环闭合完整性：<span class="ok">100% 闭合刚体</span>
      `;
    } else {
      const ev = stage3Key.evaluate();
      const s = 1.45;
      ev.vertices.forEach((v, i) => {
        // 4D perspective projection into 3D display space
        const d = 4.2;
        const k = (d / (d - v[3])) * s;
        keyHubs[i].position.set(v[0] * k, v[1] * k, v[2] * k);
      });
      for (const e of keyEdgeMeshes) {
        const va = keyHubs[e.i].position;
        const vb = keyHubs[e.j].position;
        updateCylBetween(e.mesh, [va.x, va.y, va.z], [vb.x, vb.y, vb.z]);
      }
      $('viewModeText').textContent = `3B 手性镜像钥匙 · XW = ${stage3Key.rotXW}°`;
      $('coordReadout').textContent = `XY ${stage3Key.rotXY}° · XZ ${stage3Key.rotXZ}° · XW ${stage3Key.rotXW}° · max|W|=${ev.maxW.toFixed(2)}`;
      $('stageStatusTag').textContent = ev.unlocked ? '镜像开锁 ✓' : '手性不匹配';
      $('stageStatusTag').classList.toggle('done', ev.unlocked);
      $('stageProgressMeta').innerHTML = `
        <span class="ch2-pill-tag ${ev.volumeRatio < -0.95 ? 'lit' : ''}">有向体积反转 (−1.00)</span>
        <span class="ch2-pill-tag ${ev.maxW < 0.08 && stage3Key.rotXW > 90 ? 'lit' : ''}">回到 W=0</span>
        <span class="ch2-pill-tag ${ev.unlocked ? 'lit' : ''}">精准啮合锁槽 ✓</span>
      `;
      $('invariantReadout').innerHTML = `
        四维六棱长误差：<span class="ok">${(ev.maxEdgeError * 100).toFixed(4)}%（绝对刚体）</span><br>
        三维有向体积比（手性）：<b class="${ev.volumeRatio < 0 ? 'ok' : ''}">${ev.volumeRatio >= 0 ? '+' : ''}${ev.volumeRatio.toFixed(3)}</b><br>
        与镜像锁槽偏差：<b>${ev.maxSocketError.toFixed(3)} m</b>
      `;
    }
  } else if (activeStage === 4) {
    if (Math.abs(dw) > 1e-6) {
      stage4W = Math.max(-3.2, Math.min(3.2, stage4W + dw));
      syncWSlider(stage4W);
      if (performance.now() - lastWBeep > 150) { lastWBeep = performance.now(); audio.wSlideTone(stage4W); }
    }
    g4Sphere.setEnabled(stage4Sub === 'sphere');
    g4Anatomy.setEnabled(stage4Sub === 'anatomy');

    if (stage4Sub === 'sphere') {
      const sl = hypersphereSlice(stage4W);
      hyperSliceBall.setEnabled(sl.exists);
      if (sl.exists) {
        hyperSliceBall.scaling.setAll(sl.radius);
        hyperSliceBall.rotation.y = time * 0.35;
      }
      hyperGhostOuter.setEnabled(showProjection);

      $('viewModeText').textContent = `4A 四维超球切片 · W = ${stage4W.toFixed(2)}`;
      $('coordReadout').textContent = `W = ${stage4W.toFixed(2)} · 切片半径 r(W) = ${sl.radius.toFixed(3)} m`;
      $('stageStatusTag').textContent = completedStages.has(4) ? '已完成 ✓' : '实时切片中';
      $('stageStatusTag').classList.toggle('done', completedStages.has(4));
      $('stageProgressMeta').innerHTML = `
        <span class="ch2-pill-tag ${sl.exists ? 'lit' : ''}">r = √(2.1² − W²) = ${sl.radius.toFixed(2)}</span>
        <span class="ch2-pill-tag">3D 体积 ${sl.volume3D.toFixed(1)} m³</span>
      `;
      $('invariantReadout').innerHTML = `
        超球方程：<b>x² + y² + z² + w² ≤ 2.1²</b><br>
        当前切片状态：<span class="${sl.exists ? 'ok' : 'bad'}">${sl.exists ? '三维实心球交集' : '空集（超球在当前层之外）'}</span><br>
        说明：四维超球本体恒定，变化的是观察切片 W。
      `;
    } else {
      // Heartbeat & gentle lung breath pulse for educational clarity
      const beat = 1 + Math.sin(time * 5.2) * 0.06;
      anatHeart.scaling.setAll(beat);
      const breath = 1 + Math.sin(time * 1.8) * 0.04;
      anatLungL.scaling.set(breath, 1, breath);
      anatLungR.scaling.set(breath, 1, breath);

      if (stage4AnatomyMode === 'cutaway') {
        anatBodyRoot.setEnabled(true);
        anatBodyRoot.scaling.set(1, 1, 1);
        anatTorso.material.alpha = 0.16;
        scanPlane.setEnabled(true);
        scanPlane.rotation.set(Math.PI / 2, 0, 0);
        scanPlane.position.set(0, stage4CutY, 0);
        sliceContourRing.setEnabled(true);
        sliceContourRing.scaling.setAll(1 - Math.abs(stage4CutY) * 0.14);

        $('viewModeText').textContent = `4B 教学三维剖面示意 · 扫描高度 Y = ${stage4CutY.toFixed(2)}`;
        $('coordReadout').textContent = `教学剖面 · 心肺与血管内部结构（非真实物理切割）`;
        $('invariantReadout').innerHTML = `
          显示约定：<b>方案 A · 教学三维剖切示意</b><br>
          观察要点：无需破坏外表面即可从高维外部审视封闭三维壳内结构。<br>
          边界声明：<span class="ok">教育模型，非真实切割或生理可行性证明</span>
        `;
      } else {
        const inter = xwTiltedBodyIntersection(stage4TiltDeg, stage4W, 0.62);
        const rad = (stage4TiltDeg * Math.PI) / 180;
        // Show 3D projection ghost foreshortened by cos(theta) along X!
        anatBodyRoot.setEnabled(showProjection || inter.coincides);
        anatBodyRoot.scaling.set(Math.max(0.06, Math.cos(rad)), 1, 1);
        anatTorso.material.alpha = inter.coincides ? 0.25 : 0.10;

        scanPlane.rotation.set(0, Math.PI / 2, 0);
        scanPlane.position.set(inter.intersects ? inter.worldX : 0, 0, 0);
        scanPlane.setEnabled(inter.dimension === 2);
        sliceContourRing.setEnabled(inter.dimension === 2);
        if (inter.dimension === 2) {
          const factor = Math.sqrt(Math.max(0.05, 1 - (inter.bodyX / 0.62) ** 2));
          sliceContourRing.scaling.set(factor * 0.9, 1.5 * factor, 1);
        }

        $('viewModeText').textContent = `4B 真实 XW 倾斜交集 · θ = ${stage4TiltDeg}° · W = ${stage4W.toFixed(2)}`;
        $('coordReadout').textContent = `交集维数 ${inter.dimension}D · 局部 x = ${inter.bodyX === null ? '全躯体' : inter.bodyX.toFixed(2)}`;
        $('invariantReadout').innerHTML = `
          显示约定：<b>方案 B · 真实 XW 倾斜几何交集</b><br>
          交集维数：<span class="${inter.intersects ? 'ok' : 'bad'}">${inter.dimension}D</span><br>
          ${inter.description}
        `;
      }
      $('stageStatusTag').textContent = completedStages.has(4) ? '已完成 ✓' : '观察中';
      $('stageStatusTag').classList.toggle('done', completedStages.has(4));
      $('stageProgressMeta').innerHTML = `
        <span class="ch2-pill-tag lit">${stage4AnatomyMode === 'cutaway' ? '教学剖面模式' : 'XW 倾斜 2D 交集'}</span>
        <span class="ch2-pill-tag">${showProjection ? '投影参考开' : '仅当前切片'}</span>
      `;
    }
  }

  drawAnalogy(time);
  scene.render();
});
