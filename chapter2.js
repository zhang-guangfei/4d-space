/**
 * Beyond 3D — Chapter 2: 《折页之间》 —「离开画纸的人」
 *
 * 12-Section Continuous Sci-Fi RPG Campaign featuring:
 *  - First-Person 3D Spatial Exploration (#world) + Always-Live Docked 4D Tactical Console (#labCanvas)
 *  - Volumetric 3D Space Chambers with real thickness (not flat planes!)
 *  - Detailed Minecraft-Style Voxel Astronauts (createVoxelAstronaut) with grounded feet & hand props
 *  - 4 True 4D Geometric Megastructures (4D Hypersphere, Diagonal 4D Hypercube/16-Cell Polytope Morph,
 *    4D Hyper-Torus Split/Merge Islands, and 24-Cell Clifford Isoclinic Double Rotor)
 *  - High-Dimensional Crush Operations ("高维对低维的降维碾压")
 */
import { createVoxelAstronaut } from './voxel-astronaut.js';
import { createColoredTesseract } from './colored-tesseract.js';
import { LookController } from './look.js';
import { GroundMotion, GroundGait } from './grounded-motion.js';
import { SpaceAudio } from './sound.js';
import {
  INTERIOR_L, STAGE1_BEACONS, Stage1Simulation,
  VAULT_SPEC, VaultSimulation,
  RING_SPEC, RingUnlinkSimulation,
  ChiralKeySimulation,
  hypersphereSlice, hyperPolytopeSliceForm, hyperTorusSliceState, cliffordDoubleRotate4D,
  xwTiltedBodyIntersection, CHAPTER2_SECTIONS
} from './chapter2-core.js';

const B = window.BABYLON;
const $ = id => document.getElementById(id);
const SAVE_KEY = 'beyond3d_ch2_save_v3';

const worldCanvas = $('world');
const look = new LookController();
const ground = new GroundMotion();
const gait = new GroundGait();
const audio = new SpaceAudio();

// Core simulations
const sim3Vault = new VaultSimulation();
const sim5Rings = new RingUnlinkSimulation();
const sim6Key = new ChiralKeySimulation();

// Authoritative 4D Player State: [x, y_floor, z, w]
let currentSection = 1;
const completedSections = new Set();
let pos4 = [0, 0, -2.4, 0];
let keys = new Set();
let jumpQueued = false;
let sensitivity = 1.0;
let time = 0;
let gesture = { left: -10, right: -10 };
let compGesture = { left: -10, right: -10 };
let locomotion = { leftLeg: 0, rightLeg: 0 };
let strideSign = 0;
let lastWBeep = 0;
let toastTimer = null;
let consoleExpanded = false;

// Per-Section Gameplay States
let s1Met = false;
const s2Bridges = new Set(); // 'wp' | 'wm' | 'goal'
let s4PassedWall = false;
let s6SwappedMirror = false;
let s6CombinedKey = false;
const s7Crystals = new Set(); // 'south_low' | 'equator_rim' | 'center_high'
const s8Forms = new Set();    // 'tetrahedron' | 'octahedron' | 'cube'
let s9CrossedBridge = false;
let s9MetLin = false;
const s10Cores = new Set();   // 0 | 1 | 2
const s11ShardsRemoved = new Set(); // 0 | 1 | 2
let s11CurveW = 0.0;
let s12Awakened = false;

// Pointer lock state
let ready = false;
let locked = false;
let keyboardCorridor = false;
let ended = false;
let lockTime = 0;

try {
  const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
  if (saved && Array.isArray(saved.completed)) {
    saved.completed.forEach(n => completedSections.add(Number(n)));
  }
} catch {}

function saveProgress() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      section: currentSection,
      completed: [...completedSections].sort()
    }));
  } catch {}
}

function showToast(text) {
  const el = $('ch2Toast');
  if (!el) return;
  el.textContent = text;
  el.classList.remove('hidden');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 4300);
}

function setDialogue(speaker, text) {
  const sEl = $('speakerName');
  const tEl = $('dialogueText');
  if (sEl) sEl.textContent = speaker;
  if (tEl) tEl.textContent = text;
}

function pulseWShift(wVal) {
  const el = $('wShiftFx');
  if (!el) return;
  const color = wVal > 0.45 ? '#f7c346' : wVal < -0.45 ? '#58a6ff' : '#4de6d3';
  el.style.boxShadow = `inset 0 0 85px 16px ${color}48`;
  el.style.opacity = '1';
  requestAnimationFrame(() => {
    setTimeout(() => { el.style.opacity = '0'; }, 120);
  });
}

function completeSection(secId, toastMsg, nextDialogue = null) {
  const isNew = !completedSections.has(secId);
  completedSections.add(secId);
  saveProgress();
  if (nextDialogue) setDialogue('先遣领航员 · 林夏 (07)', nextDialogue);
  updateHUD();
  refreshHighDimConsole();
  if (isNew) {
    audio.evidenceUnlocked();
    showToast(toastMsg);
  }
}

// ============================================================
// Material & Volumetric 3D Chamber Builders
// ============================================================
function makeMat(scene, name, hex, { alpha = 1, emissive = 0.22, wireframe = false, unlit = false } = {}) {
  const m = new B.StandardMaterial(name, scene);
  m.diffuseColor = B.Color3.FromHexString(hex);
  m.emissiveColor = m.diffuseColor.scale(emissive);
  m.specularColor = new B.Color3(0.22, 0.28, 0.34);
  m.alpha = alpha;
  m.wireframe = wireframe;
  m.disableLighting = unlit;
  m.backFaceCulling = false;
  return m;
}

/**
 * Builds a Volumetric 3D Space Chamber with real thickness (floor slab, ceiling ring,
 * 4 corner energy pillars, and translucent 3D side walls) — NEVER a flat 2D plane!
 */
function createVolumetricChamber(scene, name, {
  width = 8.4,
  height = 3.2,
  depth = 8.4,
  color = '#4de6d3',
  wallAlpha = 0.12,
  floorAlpha = 0.88,
  parent = null
} = {}) {
  const root = new B.TransformNode(name, scene);
  if (parent) root.parent = parent;

  const floorMat = makeMat(scene, name + '_floorMat', color, { alpha: floorAlpha, emissive: 0.18 });
  const wallMat = makeMat(scene, name + '_wallMat', color, { alpha: wallAlpha, emissive: 0.24 });
  const rimMat = makeMat(scene, name + '_rimMat', color, { alpha: Math.min(1, floorAlpha + 0.1), emissive: 0.55 });
  const wireMat = makeMat(scene, name + '_wireMat', color, { alpha: 0.48, wireframe: true, unlit: true });

  // Thick floor deck (top surface at y = 0.0)
  const floor = B.MeshBuilder.CreateBox(name + '_floor', { width, height: 0.22, depth }, scene);
  floor.position.set(0, -0.11, 0);
  floor.material = floorMat;
  floor.parent = root;

  // Volumetric 3D translucent outer room shell (shows real 3D thickness!)
  const shell = B.MeshBuilder.CreateBox(name + '_shell', { width, height, depth }, scene);
  shell.position.set(0, height * 0.5, 0);
  shell.material = wallMat;
  shell.parent = root;

  // Crisp glowing wireframe edge cage around the entire 3D room volume
  const cage = B.MeshBuilder.CreateBox(name + '_cage', { width: width + 0.03, height: height + 0.03, depth: depth + 0.03 }, scene);
  cage.position.set(0, height * 0.5, 0);
  cage.material = wireMat;
  cage.parent = root;

  // 4 Corner Energy Pillars giving unmistakable 3D room depth
  const px = width * 0.5 - 0.14;
  const pz = depth * 0.5 - 0.14;
  const pillars = [];
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const col = B.MeshBuilder.CreateBox(name + '_col', { width: 0.18, height, depth: 0.18 }, scene);
    col.position.set(sx * px, height * 0.5, sz * pz);
    col.material = rimMat;
    col.parent = root;
    pillars.push(col);
  }

  return {
    root,
    floor,
    shell,
    cage,
    setLayerOpacity(clarity) {
      // clarity in [0.15 .. 1.0]
      floorMat.alpha = clarity * floorAlpha;
      wallMat.alpha = clarity * wallAlpha;
      rimMat.alpha = clarity * 0.85;
      wireMat.alpha = Math.max(0.16, clarity * 0.65);
    }
  };
}

/** Builds an L-shaped Chiral Key Half prop (can be right-handed or left-handed mirror!) */
function createChiralKeyProp(scene, name, colorHex) {
  const root = new B.TransformNode(name, scene);
  const mat = makeMat(scene, name + '_mat', colorHex, { emissive: 0.55 });
  const stem = B.MeshBuilder.CreateBox(name + '_stem', { width: 0.12, height: 0.48, depth: 0.12 }, scene);
  stem.position.set(0, 0.24, 0);
  stem.material = mat;
  stem.parent = root;
  // Asymmetric teeth in +X and +Z so chirality inversion (flipping X) is visually unmistakable!
  const armX = B.MeshBuilder.CreateBox(name + '_armX', { width: 0.34, height: 0.12, depth: 0.12 }, scene);
  armX.position.set(0.17, 0.42, 0);
  armX.material = mat;
  armX.parent = root;
  const toothZ = B.MeshBuilder.CreateBox(name + '_toothZ', { width: 0.10, height: 0.18, depth: 0.26 }, scene);
  toothZ.position.set(0.28, 0.32, 0.13);
  toothZ.material = mat;
  toothZ.parent = root;
  return { root, mat };
}

// ============================================================
// 1. FIRST-PERSON 3D WORLD SCENE (#world)
// ============================================================
const fpEngine = new B.Engine(worldCanvas, true, { stencil: true, preserveDrawingBuffer: true });
fpEngine.setHardwareScalingLevel(1 / Math.min(Math.max(window.devicePixelRatio || 1, 1), 1.5));
const fpScene = new B.Scene(fpEngine);
fpScene.clearColor = new B.Color4(0.018, 0.048, 0.082, 1);

const fpCamera = new B.UniversalCamera('fpEyes', new B.Vector3(0, 1.68, -2.4), fpScene);
fpCamera.inputs.clear();
fpCamera.fov = 1.12;
fpCamera.minZ = 0.045;
fpCamera.maxZ = 140;

const fpHemi = new B.HemisphericLight('fpHemi', new B.Vector3(0.3, 1, -0.35), fpScene);
fpHemi.intensity = 0.92;
const fpDir = new B.DirectionalLight('fpDir', new B.Vector3(-0.5, -1, 0.4), fpScene);
fpDir.intensity = 0.72;

// Rich Sci-Fi 4D Cosmic Background (Rotating 4D Astrolabe Rings + Starfield + Hyper-Grid)
const fpCosmos = new B.TransformNode('fpCosmos', fpScene);
const cosmicRings = [];
{
  const ringColors = ['#236478', '#785a22', '#264b82'];
  for (let i = 0; i < 3; i++) {
    const r = B.MeshBuilder.CreateTorus('cosmicRing_' + i, {
      diameter: 28 + i * 7,
      thickness: 0.18,
      tessellation: 64
    }, fpScene);
    r.rotation.x = (i * Math.PI) / 3.2;
    r.rotation.z = (i * Math.PI) / 4;
    r.material = makeMat(fpScene, 'cRingMat_' + i, ringColors[i], { alpha: 0.45, emissive: 0.65, unlit: true });
    r.parent = fpCosmos;
    cosmicRings.push(r);
  }

  // Outer 4D Hypercube Cathedral Frame
  const S = 11.5;
  const pts = [
    [-S, -4, -S], [S, -4, -S], [S, 9, -S], [-S, 9, -S],
    [-S, -4, S], [S, -4, S], [S, 9, S], [-S, 9, S]
  ];
  const edges = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
  const cathedral = B.MeshBuilder.CreateLineSystem('cathedral', {
    lines: edges.map(([a, b]) => [new B.Vector3(...pts[a]), new B.Vector3(...pts[b])])
  }, fpScene);
  cathedral.color = B.Color3.FromHexString('#286478');
  cathedral.alpha = 0.55;
  cathedral.parent = fpCosmos;

  // Starfield nodes around the 4D bulk
  const starMat = makeMat(fpScene, 'starMat', '#9be8ff', { emissive: 0.9, unlit: true });
  const starBase = B.MeshBuilder.CreateBox('starBase', { size: 0.14 }, fpScene);
  starBase.material = starMat;
  starBase.setEnabled(false);
  for (let s = 0; s < 120; s++) {
    const inst = starBase.createInstance('star_' + s);
    const theta = (s * 2.39996) % (Math.PI * 2);
    const phi = Math.acos(1 - 2 * ((s + 0.5) / 120));
    const rad = 22 + (s % 5) * 4;
    inst.position.set(
      rad * Math.sin(phi) * Math.cos(theta),
      rad * Math.cos(phi),
      rad * Math.sin(phi) * Math.sin(theta)
    );
    inst.parent = fpCosmos;
  }
}

// First-Person Local Voxel Astronaut Body + Shared Companion Lin Xia (07)
const fpPlayerVoxel = createVoxelAstronaut(fpScene, 'fpPlayer', { role: 'player', isLocalFirstPerson: true });
const fpLinXia = createVoxelAstronaut(fpScene, 'fpLinXia', { role: 'companion' });

// 3 Volumetric 3D Space Chambers in First-Person (W = 0 Cyan, W = +1.8 Gold, W = -1.8 Sapphire)
// As you shift W, the chamber you are inside solidifies around you while neighboring W chambers
// appear as volumetric ghosts above/below!
const fpChamberW0 = createVolumetricChamber(fpScene, 'fpChW0', { width: 9.2, height: 3.4, depth: 9.2, color: '#4de6d3', wallAlpha: 0.08 });
const fpChamberWP = createVolumetricChamber(fpScene, 'fpChWP', { width: 9.2, height: 3.4, depth: 9.2, color: '#f7c346', wallAlpha: 0.10 });
const fpChamberWM = createVolumetricChamber(fpScene, 'fpChWM', { width: 9.2, height: 3.4, depth: 9.2, color: '#58a6ff', wallAlpha: 0.10 });

// Per-Section First-Person Groups
const fpSecGroups = {};
for (let i = 1; i <= 12; i++) {
  fpSecGroups[i] = new B.TransformNode('fpSecGroup_' + i, fpScene);
}

// --- Section 2: 3-Layer Broken Bridge Segments ---
const fpS2Bridges = {};
{
  const root = fpSecGroups[2];
  const seg0 = B.MeshBuilder.CreateBox('s2_seg0', { width: 3.2, height: 0.24, depth: 2.6 }, fpScene);
  seg0.position.set(0, 0.02, -2.4);
  seg0.material = makeMat(fpScene, 's2_m0', '#4de6d3', { emissive: 0.3 });
  seg0.parent = root;

  const segWP = B.MeshBuilder.CreateBox('s2_segWP', { width: 3.2, height: 0.24, depth: 2.6 }, fpScene);
  segWP.position.set(0, 0.02, 0.0);
  segWP.material = makeMat(fpScene, 's2_mWP', '#f7c346', { emissive: 0.35 });
  segWP.parent = root;

  const segWM = B.MeshBuilder.CreateBox('s2_segWM', { width: 3.2, height: 0.24, depth: 2.6 }, fpScene);
  segWM.position.set(0, 0.02, 2.2);
  segWM.material = makeMat(fpScene, 's2_mWM', '#58a6ff', { emissive: 0.35 });
  segWM.parent = root;

  Object.assign(fpS2Bridges, { seg0, segWP, segWM });
}

// --- Section 3: Sealed 6-Wall Glass Prison + Core + Pedestal ---
const fpS3Prison = {};
{
  const root = fpSecGroups[3];
  const box = B.MeshBuilder.CreateBox('s3_prison', { width: 2.84, height: 2.7, depth: 2.84 }, fpScene);
  box.position.set(0, 1.35, 0);
  box.material = makeMat(fpScene, 's3_pMat', '#54c1d3', { alpha: 0.42, emissive: 0.24 });
  box.parent = root;

  const frame = B.MeshBuilder.CreateBox('s3_frame', { width: 2.88, height: 2.74, depth: 2.88 }, fpScene);
  frame.position.set(0, 1.35, 0);
  frame.material = makeMat(fpScene, 's3_fMat', '#9bf0ff', { alpha: 0.75, wireframe: true, unlit: true });
  frame.parent = root;

  const core = B.MeshBuilder.CreatePolyhedron('s3_core', { type: 1, size: 0.28 }, fpScene);
  core.material = makeMat(fpScene, 's3_cMat', '#ffd55a', { emissive: 0.75 });
  core.parent = root;

  const ped = B.MeshBuilder.CreateCylinder('s3_ped', { diameter: 1.0, height: 0.9, tessellation: 24 }, fpScene);
  ped.position.set(VAULT_SPEC.pedestalPos[0], 0.45, VAULT_SPEC.pedestalPos[2]);
  ped.material = makeMat(fpScene, 's3_pedMat', '#4de6d3', { emissive: 0.35 });
  ped.parent = root;

  Object.assign(fpS3Prison, { box, frame, core, ped });
}

// --- Section 4: 4D Crimson Hyper-Wall with Bottom W=-1.8 Gap ---
const fpS4Wall = {};
{
  const root = fpSecGroups[4];
  const leftWall = B.MeshBuilder.CreateBox('s4_wallL', { width: 5.8, height: 3.1, depth: 0.35 }, fpScene);
  leftWall.position.set(-1.3, 1.55, 0.2);
  leftWall.material = makeMat(fpScene, 's4_wMat', '#ff5252', { alpha: 0.68, emissive: 0.45 });
  leftWall.parent = root;

  const rightSolid = B.MeshBuilder.CreateBox('s4_wallR', { width: 3.2, height: 3.1, depth: 0.35 }, fpScene);
  rightSolid.position.set(2.8, 1.55, 0.2);
  rightSolid.material = makeMat(fpScene, 's4_wMatR', '#ff5252', { alpha: 0.68, emissive: 0.45 });
  rightSolid.parent = root;

  const goalBeacon = B.MeshBuilder.CreateTorus('s4_goal', { diameter: 1.8, thickness: 0.12, tessellation: 36 }, fpScene);
  goalBeacon.position.set(0, 1.3, 2.6);
  goalBeacon.material = makeMat(fpScene, 's4_gMat', '#4de6d3', { emissive: 0.65 });
  goalBeacon.parent = root;

  Object.assign(fpS4Wall, { leftWall, rightSolid, goalBeacon });
}

// --- Section 5: Interlocked Giant Metal Rings ---
const fpS5Rings = {};
{
  const root = fpSecGroups[5];
  const SCALE = 1.65;
  const ringA = B.MeshBuilder.CreateTorus('s5_ringA', {
    diameter: RING_SPEC.majorR * 2 * SCALE,
    thickness: RING_SPEC.tubeR * 2 * SCALE,
    tessellation: 52
  }, fpScene);
  ringA.rotation.x = Math.PI / 2;
  ringA.position.set(RING_SPEC.ringACenterX * SCALE, 1.5, 0.4);
  ringA.material = makeMat(fpScene, 's5_rAMat', '#4de6d3', { emissive: 0.35 });
  ringA.parent = root;

  const ringB = B.MeshBuilder.CreateTorus('s5_ringB', {
    diameter: RING_SPEC.majorR * 2 * SCALE,
    thickness: RING_SPEC.tubeR * 2 * SCALE,
    tessellation: 52
  }, fpScene);
  ringB.position.set(RING_SPEC.startBX * SCALE, 1.5, 0.4);
  ringB.material = makeMat(fpScene, 's5_rBMat', '#f7c346', { emissive: 0.4 });
  ringB.parent = root;

  Object.assign(fpS5Rings, { ringA, ringB, SCALE });
}

// --- Section 6: 4D Phase Mirror & Dual-Key Altar (Mirror Self Control Swap + Chiral Key Halves!) ---
const fpS6Mirror = {};
{
  const root = fpSecGroups[6];
  // Central 4D Phase Mirror Portal Frame at (0, 1.4, -0.1)
  const mirrorGlass = B.MeshBuilder.CreateBox('s6_glass', { width: 2.2, height: 2.7, depth: 0.06 }, fpScene);
  mirrorGlass.position.set(0, 1.35, -0.1);
  mirrorGlass.material = makeMat(fpScene, 's6_gMat', '#64e8de', { alpha: 0.26, emissive: 0.35 });
  mirrorGlass.parent = root;

  const mirrorRim = B.MeshBuilder.CreateTorus('s6_rim', { diameter: 2.8, thickness: 0.1, tessellation: 44 }, fpScene);
  mirrorRim.position.set(0, 1.35, -0.1);
  mirrorRim.rotation.x = Math.PI / 2;
  mirrorRim.material = makeMat(fpScene, 's6_rMat', '#f7c346', { emissive: 0.55 });
  mirrorRim.parent = root;

  // Your Mirror-Self Voxel Twin standing inside the 4D Phase Mirror!
  const mirrorTwin = createVoxelAstronaut(fpScene, 's6_mirrorTwin', { role: 'player' });
  mirrorTwin.root.parent = root;

  // Held Chiral Key Halves: Player's Key Half, Mirror Twin's Key Half, and Lin Xia's Key Half on the Altar!
  const playerKey = createChiralKeyProp(fpScene, 's6_pKey', '#4de6d3');
  playerKey.root.parent = fpPlayerVoxel.handSocket;

  const mirrorKey = createChiralKeyProp(fpScene, 's6_mKey', '#4de6d3');
  mirrorKey.root.parent = mirrorTwin.handSocket;

  // Dual-Key Altar at North Gate (0, 0.9, 2.35)
  const altar = B.MeshBuilder.CreateCylinder('s6_altar', { diameter: 1.3, height: 1.0, tessellation: 28 }, fpScene);
  altar.position.set(0, 0.5, 2.35);
  altar.material = makeMat(fpScene, 's6_aMat', '#234a5e', { emissive: 0.25 });
  altar.parent = root;

  const linKeyOnAltar = createChiralKeyProp(fpScene, 's6_linKey', '#f7c346');
  linKeyOnAltar.root.position.set(0.22, 1.05, 2.35);
  linKeyOnAltar.root.parent = root;

  const snappedPlayerKey = createChiralKeyProp(fpScene, 's6_snappedKey', '#4de6d3');
  snappedPlayerKey.root.position.set(-0.22, 1.05, 2.35);
  snappedPlayerKey.root.scaling.x = -1; // Left-handed mirror!
  snappedPlayerKey.root.parent = root;
  snappedPlayerKey.root.setEnabled(false);

  Object.assign(fpS6Mirror, { mirrorGlass, mirrorRim, mirrorTwin, playerKey, mirrorKey, altar, linKeyOnAltar, snappedPlayerKey });
}

// --- Section 7 (True 4D Object #1): 4D Hypersphere Reactor & 3 Stabilizer Crystals ---
const fpS7Sphere = {};
{
  const root = fpSecGroups[7];
  const sphere = B.MeshBuilder.CreateSphere('s7_sphere', { diameter: 2.0, segments: 36 }, fpScene);
  sphere.position.set(0, 1.65, 0.2);
  sphere.material = makeMat(fpScene, 's7_sMat', '#ff9f43', { alpha: 0.88, emissive: 0.42 });
  sphere.parent = root;

  const ring = B.MeshBuilder.CreateTorus('s7_ring', { diameter: 2.05, thickness: 0.04, tessellation: 44 }, fpScene);
  ring.material = makeMat(fpScene, 's7_rMat', '#4de6d3', { emissive: 0.65 });
  ring.parent = sphere;

  const crystalSpecs = [
    { id: 'south_low', pos: [0, 1.1, 2.35], wTarget: -1.8, color: '#58a6ff' },
    { id: 'equator_rim', pos: [2.45, 1.1, 0.2], wTarget: 0.0, color: '#4de6d3' },
    { id: 'center_high', pos: [0, 1.1, 0.2], wTarget: 2.2, color: '#f7c346' }
  ];
  const crystals = crystalSpecs.map(sp => {
    const m = B.MeshBuilder.CreatePolyhedron('s7_c_' + sp.id, { type: 1, size: 0.26 }, fpScene);
    m.position.set(...sp.pos);
    m.material = makeMat(fpScene, 's7_cMat_' + sp.id, sp.color, { emissive: 0.75 });
    m.parent = root;
    return { ...sp, mesh: m };
  });

  Object.assign(fpS7Sphere, { sphere, crystals });
}

// --- Section 8 (True 4D Object #2): Diagonal 4D Hypercube / 16-Cell Temple (Tetrahedron ⇄ Octahedron ⇄ Cube) ---
const fpS8Temple = {};
{
  const root = fpSecGroups[8];
  const centerPos = new B.Vector3(0, 1.6, 0.3);

  const tetra = B.MeshBuilder.CreatePolyhedron('s8_tetra', { type: 0, size: 1.25 }, fpScene);
  tetra.position.copyFrom(centerPos);
  tetra.material = makeMat(fpScene, 's8_tMat', '#58a6ff', { alpha: 0.88, emissive: 0.38 });
  tetra.parent = root;

  const octa = B.MeshBuilder.CreatePolyhedron('s8_octa', { type: 1, size: 1.35 }, fpScene);
  octa.position.copyFrom(centerPos);
  octa.material = makeMat(fpScene, 's8_oMat', '#4de6d3', { alpha: 0.88, emissive: 0.38 });
  octa.parent = root;

  const cube = B.MeshBuilder.CreateBox('s8_cube', { size: 2.1 }, fpScene);
  cube.position.copyFrom(centerPos);
  cube.material = makeMat(fpScene, 's8_cMat', '#f7c346', { alpha: 0.88, emissive: 0.38 });
  cube.parent = root;

  Object.assign(fpS8Temple, { tetra, octa, cube });
}

// --- Section 9 (True 4D Object #3): 4D Hyper-Torus Split Islands ⇄ Merged Ring Bridge ---
const fpS9Torus = {};
{
  const root = fpSecGroups[9];
  const islandL = B.MeshBuilder.CreateCylinder('s9_islL', { diameter: 2.8, height: 0.36, tessellation: 32 }, fpScene);
  islandL.material = makeMat(fpScene, 's9_iLMat', '#4de6d3', { emissive: 0.3 });
  islandL.parent = root;

  const islandR = B.MeshBuilder.CreateCylinder('s9_islR', { diameter: 2.8, height: 0.36, tessellation: 32 }, fpScene);
  islandR.material = makeMat(fpScene, 's9_iRMat', '#4de6d3', { emissive: 0.3 });
  islandR.parent = root;

  const mergedBridge = B.MeshBuilder.CreateTorus('s9_bridge', { diameter: 4.8, thickness: 1.35, tessellation: 48 }, fpScene);
  mergedBridge.position.set(0, -0.1, 0.2);
  mergedBridge.scaling.y = 0.25;
  mergedBridge.material = makeMat(fpScene, 's9_bMat', '#f7c346', { emissive: 0.38 });
  mergedBridge.parent = root;

  Object.assign(fpS9Torus, { islandL, islandR, mergedBridge });
}

// --- Section 10 (True 4D Object #4): 24-Cell Clifford Isoclinic Double Rotor Star-Wheel ---
const fpS10Rotor = {};
{
  const root = fpSecGroups[10];
  // 24 vertices of the 24-Cell (permutations of (±1, ±1, 0, 0))
  const verts24 = [];
  for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) {
      for (const s1 of [-1, 1]) {
        for (const s2 of [-1, 1]) {
          const v = [0, 0, 0, 0];
          v[i] = s1;
          v[j] = s2;
          verts24.push(v);
        }
      }
    }
  }
  const nodes = verts24.map((v, idx) => {
    const m = B.MeshBuilder.CreatePolyhedron('s10_v_' + idx, { type: 1, size: 0.16 }, fpScene);
    m.material = makeMat(fpScene, 's10_vMat_' + idx, idx % 2 === 0 ? '#4de6d3' : '#f7c346', { emissive: 0.65 });
    m.parent = root;
    return { v4: v, mesh: m };
  });

  const coreTargets = [
    { id: 0, pos: [-1.8, 1.1, 0.4], wTarget: 0.0, color: '#4de6d3' },
    { id: 1, pos: [1.8, 1.1, 0.4], wTarget: 1.8, color: '#f7c346' },
    { id: 2, pos: [0.0, 1.1, 2.0], wTarget: -1.8, color: '#58a6ff' }
  ].map(sp => {
    const m = B.MeshBuilder.CreateSphere('s10_core_' + sp.id, { diameter: 0.48, segments: 18 }, fpScene);
    m.position.set(...sp.pos);
    m.material = makeMat(fpScene, 's10_cMat_' + sp.id, sp.color, { emissive: 0.8 });
    m.parent = root;
    return { ...sp, mesh: m };
  });

  Object.assign(fpS10Rotor, { nodes, coreTargets });
}

// --- Section 11: 4D Emergency Medical Table & Voxel Patient Lin Xia with Internal Organs ---
const fpS11Med = {};
{
  const root = fpSecGroups[11];
  const bed = B.MeshBuilder.CreateBox('s11_bed', { width: 1.4, height: 0.72, depth: 2.4 }, fpScene);
  bed.position.set(0, 0.36, 0.5);
  bed.material = makeMat(fpScene, 's11_bedMat', '#1c3f52', { emissive: 0.25 });
  bed.parent = root;

  const patient = createVoxelAstronaut(fpScene, 's11_patient', { role: 'companion', withInternalOrgans: true });
  patient.root.parent = root;
  patient.setSuitXRay(0.22);

  const scanRing = B.MeshBuilder.CreateTorus('s11_scanRing', { diameter: 1.55, thickness: 0.04, tessellation: 40 }, fpScene);
  scanRing.position.set(0, 1.05, 0.5);
  scanRing.material = makeMat(fpScene, 's11_srMat', '#4de6d3', { emissive: 0.75 });
  scanRing.parent = root;

  Object.assign(fpS11Med, { bed, patient, scanRing });
}

// --- Section 12: The 4D Ark Throne & Miniature 8-Cell Chapter 1 Station Below! ---
const fpS12Ark = {};
{
  const root = fpSecGroups[12];
  const throne = B.MeshBuilder.CreateCylinder('s12_throne', { diameter: 3.4, height: 0.3, tessellation: 36 }, fpScene);
  throne.position.set(0, 0.15, 0.8);
  throne.material = makeMat(fpScene, 's12_tMat', '#f7c346', { emissive: 0.45 });
  throne.parent = root;

  const arkTesseract = createColoredTesseract(B, fpScene, { parent: root, scale: 1.15 });
  arkTesseract.root.position.set(0, 1.85, 0.8);

  Object.assign(fpS12Ark, { throne, arkTesseract });
}

// ============================================================
// 2. ALWAYS-LIVE HIGH-DIMENSIONAL TACTICAL CONSOLE (#labCanvas)
// ============================================================
const godCanvas = $('labCanvas');
const godEngine = new B.Engine(godCanvas, true, { preserveDrawingBuffer: true });
godEngine.setHardwareScalingLevel(1 / Math.min(Math.max(window.devicePixelRatio || 1, 1), 1.5));
const godScene = new B.Scene(godEngine);
godScene.clearColor = new B.Color4(0.015, 0.042, 0.072, 1);

const godCamera = new B.ArcRotateCamera('godCam', -Math.PI * 0.62, 1.12, 12.2, new B.Vector3(0, 0.3, 0), godScene);
godCamera.lowerRadiusLimit = 5.0;
godCamera.upperRadiusLimit = 22.0;
godCamera.wheelPrecision = 40;
godCamera.attachControl(godCanvas, true);
godCamera.inputs.removeByType('ArcRotateCameraKeyboardMoveInput');

const godHemi = new B.HemisphericLight('godHemi', new B.Vector3(0.35, 1, -0.3), godScene);
godHemi.intensity = 0.95;

// In the High-Dimensional Console, the 3 W-layers are rendered as 3D VOLUMETRIC SPACE CHAMBERS
// with real height/thickness (height = 1.35 units each, stacked at Y = -2.5, 0.0, +2.5),
// and the Voxel Astronauts stand ON THE FLOOR INSIDE each volumetric 3D box!
const GOD_W_SCALE = 1.38;
const GOD_CHAMBER_H = 1.28;
const GOD_VOXEL_SCALE = 0.56;

const godChambers = [
  { wLv: -1.8, color: '#58a6ff', name: 'godCh_WM' },
  { wLv: 0.0,  color: '#4de6d3', name: 'godCh_W0' },
  { wLv: 1.8,  color: '#f7c346', name: 'godCh_WP' }
].map(cfg => {
  const ch = createVolumetricChamber(godScene, cfg.name, {
    width: 5.2,
    height: GOD_CHAMBER_H,
    depth: 5.2,
    color: cfg.color,
    wallAlpha: 0.14,
    floorAlpha: 0.45
  });
  ch.root.position.y = cfg.wLv * GOD_W_SCALE;
  return { ...cfg, chamber: ch };
});

// Active Highlighted 3D Volumetric Chamber Box that moves continuously with Player's W!
const godActiveChamber = createVolumetricChamber(godScene, 'godActiveCh', {
  width: 5.36,
  height: GOD_CHAMBER_H,
  depth: 5.36,
  color: '#ffffff',
  wallAlpha: 0.16,
  floorAlpha: 0.35
});

// Voxel Astronauts inside the High-Dimensional Console (Feet at floor y = w * GOD_W_SCALE!)
const godPlayerVoxel = createVoxelAstronaut(godScene, 'godPlayer', { role: 'player' });
godPlayerVoxel.root.scaling.setAll(GOD_VOXEL_SCALE);

const godLinVoxel = createVoxelAstronaut(godScene, 'godLin', { role: 'companion', withInternalOrgans: true });
godLinVoxel.root.scaling.setAll(GOD_VOXEL_SCALE);

// High-Dimensional Console Puzzle Props
const godVaultBox = B.MeshBuilder.CreateBox('godVaultBox', { width: 2.2, height: GOD_CHAMBER_H * 0.95, depth: 2.2 }, godScene);
godVaultBox.material = makeMat(godScene, 'godVMat', '#54c1d3', { alpha: 0.45, emissive: 0.25 });

const godHyperWall = B.MeshBuilder.CreateBox('godHWall', { width: 5.0, height: GOD_W_SCALE * 2.6, depth: 0.25 }, godScene);
godHyperWall.material = makeMat(godScene, 'godHWMat', '#ff5252', { alpha: 0.55, emissive: 0.4 });

const godRingA = B.MeshBuilder.CreateTorus('godRingA', { diameter: 1.5, thickness: 0.18, tessellation: 32 }, godScene);
godRingA.rotation.x = Math.PI / 2;
godRingA.material = makeMat(godScene, 'godRAMat', '#4de6d3', { emissive: 0.35 });

const godRingB = B.MeshBuilder.CreateTorus('godRingB', { diameter: 1.5, thickness: 0.18, tessellation: 32 }, godScene);
godRingB.material = makeMat(godScene, 'godRBMat', '#f7c346', { emissive: 0.4 });

const godTrue4DSphere = B.MeshBuilder.CreateSphere('god4DSphere', { diameter: 1.8, segments: 24 }, godScene);
godTrue4DSphere.material = makeMat(godScene, 'god4DSphMat', '#ff9f43', { alpha: 0.75, emissive: 0.35 });

const godTrue4DPillar = B.MeshBuilder.CreateCylinder('god4DPillar', { diameter: 2.2, height: GOD_W_SCALE * 3.2, tessellation: 24 }, godScene);
godTrue4DPillar.material = makeMat(godScene, 'god4DPilMat', '#68a7ff', { alpha: 0.16, wireframe: true, unlit: true });

// ============================================================
// 3. RIGHT-SIDE 3D VOLUMETRIC CHAMBER STACK GAUGE (#volStackCanvas)
// ============================================================
const volCanvas = $('volStackCanvas');
const vctx = volCanvas.getContext('2d');

function drawVolumetricStackGauge(currentW) {
  const w = volCanvas.width;
  const h = volCanvas.height;
  vctx.clearRect(0, 0, w, h);

  // Helper to draw a 3D isometric volumetric rectangular chamber box with thickness!
  function draw3DBox(cy, boxH, colorHex, fillAlpha, isCurrent) {
    const cx = w * 0.5;
    const hw = 25;
    const hd = 9;
    const topY = cy - boxH * 0.5;
    const botY = cy + boxH * 0.5;

    vctx.lineWidth = isCurrent ? 2.0 : 1.1;
    vctx.strokeStyle = isCurrent ? '#ffffff' : colorHex;

    // Top parallelogram face
    vctx.fillStyle = colorHex + (isCurrent ? '66' : '28');
    vctx.beginPath();
    vctx.moveTo(cx, topY - hd);
    vctx.lineTo(cx + hw, topY);
    vctx.lineTo(cx, topY + hd);
    vctx.lineTo(cx - hw, topY);
    vctx.closePath();
    vctx.fill();
    vctx.stroke();

    // Left front vertical thickness wall
    vctx.fillStyle = colorHex + (isCurrent ? '88' : '38');
    vctx.beginPath();
    vctx.moveTo(cx - hw, topY);
    vctx.lineTo(cx, topY + hd);
    vctx.lineTo(cx, botY + hd);
    vctx.lineTo(cx - hw, botY);
    vctx.closePath();
    vctx.fill();
    vctx.stroke();

    // Right front vertical thickness wall
    vctx.fillStyle = colorHex + (isCurrent ? '55' : '22');
    vctx.beginPath();
    vctx.moveTo(cx, topY + hd);
    vctx.lineTo(cx + hw, topY);
    vctx.lineTo(cx + hw, botY);
    vctx.lineTo(cx, botY + hd);
    vctx.closePath();
    vctx.fill();
    vctx.stroke();
  }

  const mapY = wVal => h * 0.5 - (wVal / 2.3) * (h * 0.34);

  // Draw the 3 fixed volumetric chambers back-to-front (bottom W=-1.8, middle W=0, top W=+1.8)
  const layers = [
    { wVal: -1.8, color: '#58a6ff', label: '−1.8' },
    { wVal: 0.0,  color: '#4de6d3', label: '0.0' },
    { wVal: 1.8,  color: '#f7c346', label: '+1.8' }
  ];

  for (const ly of layers) {
    const active = Math.abs(currentW - ly.wVal) < 0.35;
    draw3DBox(mapY(ly.wVal), 22, ly.color, 0.3, active);
  }

  // Draw dynamic active voxel astronaut inside the current 3D chamber position!
  const py = mapY(Math.max(-2.3, Math.min(2.3, currentW)));
  vctx.fillStyle = '#ffffff';
  vctx.fillRect(w * 0.5 - 4, py - 7, 8, 7); // Voxel helmet
  vctx.fillStyle = '#f7c346';
  vctx.fillRect(w * 0.5 - 3, py, 6, 8);     // Voxel suit torso
}

// ============================================================
// Section Selection, Movement & High-Dimensional Crush Actions
// ============================================================
function selectSection(secId) {
  currentSection = Math.max(1, Math.min(12, Number(secId) || 1));
  for (let i = 1; i <= 12; i++) {
    fpSecGroups[i].setEnabled(i === currentSection);
  }

  ground.reset();
  gait.reset();
  look.yaw = 0;
  look.pitch = 0;

  if (currentSection === 1) { pos4 = [0, 0, -2.4, 0.0]; }
  else if (currentSection === 2) { pos4 = [0, 0, -2.6, 0.0]; s2Bridges.clear(); }
  else if (currentSection === 3) { sim3Vault.reset(false); pos4 = [...sim3Vault.player]; }
  else if (currentSection === 4) { pos4 = [0, 0, -2.3, 0.0]; s4PassedWall = false; }
  else if (currentSection === 5) { sim5Rings.reset(); pos4 = [0, 0, -1.8, 0.0]; }
  else if (currentSection === 6) { sim6Key.reset(); pos4 = [0, 0, -2.3, 0.0]; s6SwappedMirror = false; s6CombinedKey = false; }
  else if (currentSection === 7) { pos4 = [0, 0, -2.5, 0.0]; s7Crystals.clear(); }
  else if (currentSection === 8) { pos4 = [0, 0, -2.4, -1.8]; s8Forms.clear(); }
  else if (currentSection === 9) { pos4 = [-1.65, 0, 0.2, 0.0]; s9CrossedBridge = false; s9MetLin = false; }
  else if (currentSection === 10) { pos4 = [0, 0, -2.4, 0.0]; s10Cores.clear(); }
  else if (currentSection === 11) { pos4 = [0, 0, -1.9, 0.0]; s11ShardsRemoved.clear(); s11CurveW = 0.0; }
  else if (currentSection === 12) { pos4 = [0, 0, -2.0, 0.0]; s12Awakened = false; }

  const meta = CHAPTER2_SECTIONS[currentSection - 1];
  setDialogue(meta.speaker, meta.dialogue);
  updateHUD();
  refreshHighDimConsole();
  saveProgress();
}

function stepGameplay(dx, dz, dw) {
  const prevW = pos4[3];

  if (currentSection === 1) {
    pos4[0] = Math.max(-3.6, Math.min(3.6, pos4[0] + dx));
    pos4[2] = Math.max(-3.6, Math.min(3.6, pos4[2] + dz));
    pos4[3] = Math.max(-2.3, Math.min(2.3, pos4[3] + dw));
    if (Math.abs(pos4[3] - 1.8) < 0.45 && Math.hypot(pos4[0] + 1.2, pos4[2] - 0.8) < 1.35) {
      s1Met = true;
      compGesture = { left: time, right: time };
      completeSection(1, '第一小节完成！你成功穿梭至上层流金空间舱与林夏汇合！', '“太棒了！你已经掌握了在立体空间舱之间穿梭，快进入第二小节跟上我！”');
    }
  } else if (currentSection === 2) {
    pos4[0] = Math.max(-3.2, Math.min(3.2, pos4[0] + dx));
    pos4[2] = Math.max(-3.2, Math.min(3.4, pos4[2] + dz));
    pos4[3] = Math.max(-2.3, Math.min(2.3, pos4[3] + dw));
    if (Math.abs(pos4[3] - 1.8) < 0.5 && Math.abs(pos4[2]) < 1.1) s2Bridges.add('wp');
    if (Math.abs(pos4[3] + 1.8) < 0.5 && Math.abs(pos4[2] - 2.1) < 1.2) s2Bridges.add('wm');
    if (s2Bridges.has('wp') && s2Bridges.has('wm') && Math.abs(pos4[3]) < 0.45 && pos4[2] > 1.8) {
      s2Bridges.add('goal');
      compGesture = { left: time, right: time };
      completeSection(2, '第二小节完成！你连续穿梭三层立体空间舱越过了折叠断渊！', '“干得漂亮！前面的大厅有方舟启动核心，我们快过去！”');
    }
  } else if (currentSection === 3) {
    const res = sim3Vault.move([dx, 0, dz, dw]);
    pos4 = [...sim3Vault.player];
    if (res.blocked && Math.hypot(dx, dz) > 1e-4 && time - (stepGameplay._hitT || 0) > 1.0) {
      stepGameplay._hitT = time;
      audio.probeBounce(1.8);
      showToast('砰！六面防爆玻璃在 W=0 完全封死！按 E 升入 W=+1.8 舱层从高维空降进去！');
    }
    if (res.picked) {
      compGesture = { left: time, right: time };
      audio.evidenceUnlocked();
      setDialogue('先遣领航员 · 林夏 (07)', '“天哪，你真的从第四维直接空降进密室了！快带核心翻去 W=+1.8 送到右侧接收台！”');
      showToast('已从高维空降进密室拿到启动核心！按 E 升回 W=+1.8 走出密室送到右侧接收台！');
    }
    if (res.delivered) {
      completeSection(3, '第三小节完成！高维对低维的降维碾压：无门密室救援成功！', '“核心已激活！小心，前方升起了连第四维都封死的赤红超墙！”');
    }
  } else if (currentSection === 4) {
    pos4[3] = Math.max(-2.3, Math.min(2.3, pos4[3] + dw));
    const candX = Math.max(-3.6, Math.min(3.6, pos4[0] + dx));
    const candZ = Math.max(-3.4, Math.min(3.4, pos4[2] + dz));
    // Crimson 4D Hyper-Wall at Z ∈ [-0.1, +0.5] blocks ALL W except at W < -1.3 AND X ∈ [0.6, 2.2]!
    const crossingWall = candZ > -0.15 && candZ < 0.55;
    const inBottomGap = pos4[3] < -1.25 && candX > 0.45 && candX < 2.25;
    if (crossingWall && !inBottomGap) {
      if (Math.abs(dz) > 1e-4 && time - (stepGameplay._hitT || 0) > 1.0) {
        stepGameplay._hitT = time;
        audio.probeBounce(2.0);
        showToast('赤红四维超墙拦截！它封死了高维，只有按 Q 潜入 W = −1.8 底层右侧缺口才能钻过去！');
      }
      pos4[0] = candX;
    } else {
      pos4[0] = candX;
      pos4[2] = candZ;
    }
    if (pos4[2] > 1.2) s4PassedWall = true;
    if (s4PassedWall && Math.abs(pos4[3]) < 0.45 && pos4[2] > 1.8) {
      completeSection(4, '第四小节完成！你成功潜入底层唯一的高维裂隙突破了四维封锁线！');
    }
  } else if (currentSection === 5) {
    pos4[0] = Math.max(-3.4, Math.min(3.4, pos4[0] + dx));
    pos4[2] = Math.max(-3.2, Math.min(3.2, pos4[2] + dz));
    const res = sim5Rings.moveTo(sim5Rings.bx + dx * 0.75, sim5Rings.bw + dw);
    pos4[3] = sim5Rings.bw;
    if (res.blocked && time - (stepGameplay._hitT || 0) > 0.9) {
      stepGameplay._hitT = time;
      audio.probeBounce(2.0);
      showToast('两只实心巨环在 W=0 死死相扣！先按 E 把金环升到 W=+1.4 舱层再向右推！');
    }
    if (res.unlinked) {
      completeSection(5, '第五小节完成！两只从未断裂的 4 米合金巨环在第四维彻底解开！');
    }
  } else if (currentSection === 6) {
    pos4[0] = Math.max(-3.4, Math.min(3.4, pos4[0] + dx));
    pos4[2] = Math.max(-3.2, Math.min(3.0, pos4[2] + dz));
    pos4[3] = Math.max(-2.2, Math.min(2.2, pos4[3] + dw));
    // Walking to the North Dual-Key Altar at (0, 0, 2.15) after swapping chirality with Mirror Self
    if (Math.hypot(pos4[0], pos4[2] - 2.0) < 1.25) {
      if (s6SwappedMirror) {
        if (!s6CombinedKey) {
          s6CombinedKey = true;
          fpS6Mirror.snappedPlayerKey.root.setEnabled(true);
          fpS6Mirror.playerKey.root.setEnabled(false);
          compGesture = { left: time, right: time };
          completeSection(6, '第六小节完成！手性反转后的左旋半钥与林夏的右旋半钥完美拼合，内殿大门洞开！', '“咔哒！左右两半圣钥严丝合缝！快看门后——那是真正的四维巨物！”');
        }
      } else if (time - (stepGameplay._keyHint || 0) > 1.6) {
        stepGameplay._keyHint = time;
        showToast('你手里的半钥和林夏同为【右旋】，无法拼合！走近中央四维魔镜按 R 与镜中自己互换手性！');
      }
    }
  } else if (currentSection === 7) {
    pos4[3] = Math.max(-2.4, Math.min(2.4, pos4[3] + dw));
    const sl = hypersphereSlice(pos4[3]);
    const candX = Math.max(-3.6, Math.min(3.6, pos4[0] + dx));
    const candZ = Math.max(-3.4, Math.min(3.4, pos4[2] + dz));
    // Solid 3D sphere slice collision at (0, 0.2) with radius sl.radius!
    const distToSphere = Math.hypot(candX, candZ - 0.2);
    if (sl.exists && distToSphere < sl.radius + 0.25) {
      if (time - (stepGameplay._hitT || 0) > 1.0) {
        stepGameplay._hitT = time;
        audio.probeBounce(1.6);
        showToast(`四维超球在当前层半径达 ${sl.radius.toFixed(1)}m 挡住了路！按 Q/E 切换空间层让它缩小或消失！`);
      }
    } else {
      pos4[0] = candX;
      pos4[2] = candZ;
    }
    for (const c of fpS7Sphere.crystals) {
      if (!s7Crystals.has(c.id) && Math.abs(pos4[3] - c.wTarget) < 0.55 && Math.hypot(pos4[0] - c.pos[0], pos4[2] - c.pos[2]) < 1.1) {
        s7Crystals.add(c.id);
        audio.routeStep(s7Crystals.size);
        showToast(`已采集稳压晶簇 (${s7Crystals.size}/3)！`);
      }
    }
    if (s7Crystals.size === 3) {
      completeSection(7, '第七小节完成！你利用四维超球在不同切面的缩放与消隐集齐了三枚晶簇！');
    }
  } else if (currentSection === 8) {
    pos4[0] = Math.max(-3.5, Math.min(3.5, pos4[0] + dx));
    pos4[2] = Math.max(-3.4, Math.min(3.4, pos4[2] + dz));
    pos4[3] = Math.max(-2.3, Math.min(2.3, pos4[3] + dw));
    const form = hyperPolytopeSliceForm(pos4[3]);
    if (form.exists && Math.hypot(pos4[0], pos4[2] - 0.3) < 2.2) {
      if (!s8Forms.has(form.form)) {
        s8Forms.add(form.form);
        audio.routeStep(s8Forms.size);
        showToast(`已激活四维超方体切面形态：${form.name} (${s8Forms.size}/3)！`);
      }
    }
    if (s8Forms.size === 3) {
      completeSection(8, '第八小节完成！你亲眼见证了同一座四维超方体切出正四面体、正八面体与正立方体三种形态！');
    }
  } else if (currentSection === 9) {
    pos4[3] = Math.max(-2.3, Math.min(2.3, pos4[3] + dw));
    const st = hyperTorusSliceState(pos4[3]);
    const candX = Math.max(-3.4, Math.min(3.4, pos4[0] + dx));
    const candZ = Math.max(-3.0, Math.min(3.0, pos4[2] + dz));
    // If not merged (W near 0), chasm at |X| < 0.75 blocks crossing between Left Island (-1.65) and Right Island (+1.65)!
    if (!st.merged && Math.abs(candX) < 0.72) {
      if (Math.abs(dx) > 1e-4 && time - (stepGameplay._hitT || 0) > 1.0) {
        stepGameplay._hitT = time;
        showToast('在 W=0 层两座浮岛被深渊隔开！按 E 升入 W=+1.8 层，让四维超环面把两岛融合成环形天桥！');
      }
    } else {
      pos4[0] = candX;
      pos4[2] = candZ;
    }
    if (st.merged && pos4[0] > 0.9) s9CrossedBridge = true;
    if (pos4[0] > 0.9 && Math.abs(pos4[3]) < 0.45 && Math.hypot(pos4[0] - 1.65, pos4[2] - 0.2) < 1.3) {
      s9MetLin = true;
      compGesture = { left: time, right: time };
      completeSection(9, '第九小节完成！你借四维超环面在 W=+1.8 的融合天桥跨过深渊，回到 W=0 与林夏汇合！', '“太神奇了！两座孤岛在第四维本来就是连在一起的环面！”');
    }
  } else if (currentSection === 10) {
    pos4[0] = Math.max(-3.5, Math.min(3.5, pos4[0] + dx));
    pos4[2] = Math.max(-3.4, Math.min(3.4, pos4[2] + dz));
    pos4[3] = Math.max(-2.3, Math.min(2.3, pos4[3] + dw));
    for (const c of fpS10Rotor.coreTargets) {
      if (!s10Cores.has(c.id) && Math.abs(pos4[3] - c.wTarget) < 0.55 && Math.hypot(pos4[0] - c.pos[0], pos4[2] - c.pos[2]) < 1.25) {
        s10Cores.add(c.id);
        audio.routeStep(s10Cores.size);
        showToast(`已捕获双旋星轮曲率核心 (${s10Cores.size}/3)！`);
      }
    }
    if (s10Cores.size === 3) {
      completeSection(10, '第十小节完成！你已集齐四维正二十四胞体双旋星轮的三枚曲率核心！');
    }
  } else if (currentSection === 11) {
    pos4[0] = Math.max(-3.2, Math.min(3.2, pos4[0] + dx));
    pos4[2] = Math.max(-3.0, Math.min(3.0, pos4[2] + dz));
    pos4[3] = Math.max(-2.0, Math.min(2.0, pos4[3] + dw));
    s11CurveW = pos4[3];
    // Shifting W across [-1.2, 0.0, +1.2] while near the medical table bends Lin Xia's 4D posture and extracts shards!
    if (Math.hypot(pos4[0], pos4[2] - 0.5) < 2.3) {
      if (pos4[3] < -0.7 && !s11ShardsRemoved.has(0)) {
        s11ShardsRemoved.add(0);
        audio.routeStep(s11ShardsRemoved.size);
        showToast('已从高维取出【心脏起搏核】内的四维碎屑 (1/3)！');
      }
      if (Math.abs(pos4[3]) < 0.35 && !s11ShardsRemoved.has(1)) {
        s11ShardsRemoved.add(1);
        audio.routeStep(s11ShardsRemoved.size);
        showToast('已从高维取出【左肺换气阀】内的四维碎屑 (2/3)！');
      }
      if (pos4[3] > 0.7 && !s11ShardsRemoved.has(2)) {
        s11ShardsRemoved.add(2);
        audio.routeStep(s11ShardsRemoved.size);
        showToast('已从高维取出【脊柱神经束】内的四维碎屑 (3/3)！');
      }
      if (s11ShardsRemoved.size === 3) {
        compGesture = { left: time, right: time };
        completeSection(11, '第十一小节完成！你未伤分毫宇航服外壳，便从第四维取出了林夏体内的全部碎屑！', '“心跳恢复正常了！谢谢你，08号！我们一起去点亮最终的四维方舟之心吧！”');
      }
    }
  } else if (currentSection === 12) {
    pos4[0] = Math.max(-3.4, Math.min(3.4, pos4[0] + dx));
    pos4[2] = Math.max(-3.2, Math.min(3.2, pos4[2] + dz));
    pos4[3] = Math.max(-2.2, Math.min(2.2, pos4[3] + dw));
    if (Math.hypot(pos4[0], pos4[2] - 0.8) < 1.65 && !s12Awakened) {
      s12Awakened = true;
      compGesture = { left: time, right: time };
      completeSection(12, '第十二小节完成！四维方舟之心已觉醒，通往五维星海的星门为你开启！', '“看啊，那就是整座八胞空间站的全貌……我们终于不再是画纸上的人了！”');
    }
  }

  if (Math.abs(pos4[3] - prevW) > 1e-3) {
    pulseWShift(pos4[3]);
    if (performance.now() - lastWBeep > 125) {
      lastWBeep = performance.now();
      audio.wSlideTone(pos4[3]);
    }
  }
}

/** One-Click High-Dimensional Crush Action (体现高维操作对低维困境的降维碾压！) */
function executeHighDimCrush() {
  audio.unlock();
  if (currentSection === 1) {
    pos4 = [-1.1, 0, 0.7, 1.8];
    stepGameplay(0, 0, 0);
  } else if (currentSection === 2) {
    s2Bridges.add('wp');
    s2Bridges.add('wm');
    pos4 = [0, 0, 2.2, 0.0];
    stepGameplay(0, 0, 0);
  } else if (currentSection === 3) {
    if (!sim3Vault.carryingCore && !sim3Vault.coreDelivered) {
      sim3Vault.move([0, 0, 0, 1.5 - sim3Vault.player[3]]);
      sim3Vault.move([-sim3Vault.player[0], 0, -sim3Vault.player[2], 0]);
      const r = sim3Vault.move([0, 0, 0, -sim3Vault.player[3]]);
      pos4 = [...sim3Vault.player];
      if (r.picked) showToast('⚡ 高维空降：已直接跨越三维玻璃墙空投进密室中心拿起核心！再点一次高维撤离！');
    } else if (sim3Vault.carryingCore) {
      sim3Vault.move([0, 0, 0, 1.5 - sim3Vault.player[3]]);
      sim3Vault.move([VAULT_SPEC.pedestalPos[0] - sim3Vault.player[0], 0, 0, 0]);
      sim3Vault.move([0, 0, 0, -sim3Vault.player[3]]);
      pos4 = [...sim3Vault.player];
      stepGameplay(0, 0, 0);
    }
  } else if (currentSection === 4) {
    pos4 = [1.4, 0, 0.3, -1.8];
    pos4 = [0, 0, 2.1, 0.0];
    s4PassedWall = true;
    stepGameplay(0, 0, 0);
  } else if (currentSection === 5) {
    sim5Rings.moveTo(sim5Rings.bx, 1.2);
    sim5Rings.moveTo(1.85, 1.2);
    sim5Rings.moveTo(1.85, 0.0);
    pos4[3] = 0;
    stepGameplay(0, 0, 0);
  } else if (currentSection === 6) {
    s6SwappedMirror = !s6SwappedMirror;
    sim6Key.setAngles({ xw: s6SwappedMirror ? 180 : 0 });
    audio.hologramOpen();
    showToast(s6SwappedMirror
      ? '⚡ 四维镜像互换成功！你与镜中自己互换了控制权，手里的圣钥已翻转为【左旋镜像】！快去大门基座拼合！'
      : '已切回原手性。');
  } else if (currentSection === 7) {
    if (!s7Crystals.has('south_low')) { pos4 = [0, 0, 2.35, -1.8]; }
    else if (!s7Crystals.has('equator_rim')) { pos4 = [2.45, 0, 0.2, 0.0]; }
    else { pos4 = [0, 0, 0.2, 2.2]; }
    stepGameplay(0, 0, 0);
  } else if (currentSection === 8) {
    if (!s8Forms.has('tetrahedron')) pos4 = [0, 0, -1.1, -1.8];
    else if (!s8Forms.has('octahedron')) pos4 = [0, 0, -1.1, 0.0];
    else pos4 = [0, 0, -1.1, 1.8];
    stepGameplay(0, 0, 0);
  } else if (currentSection === 9) {
    if (!s9CrossedBridge) {
      pos4 = [1.65, 0, 0.2, 1.8];
      s9CrossedBridge = true;
      showToast('⚡ 已升入 W=+1.8 走过融合后的超环面天桥！再点一次降回右岛与林夏汇合！');
    } else {
      pos4 = [1.65, 0, 0.2, 0.0];
      stepGameplay(0, 0, 0);
    }
  } else if (currentSection === 10) {
    if (!s10Cores.has(0)) pos4 = [-1.8, 0, 0.4, 0.0];
    else if (!s10Cores.has(1)) pos4 = [1.8, 0, 0.4, 1.8];
    else pos4 = [0.0, 0, 2.0, -1.8];
    stepGameplay(0, 0, 0);
  } else if (currentSection === 11) {
    pos4 = [0, 0, -0.8, 0];
    if (!s11ShardsRemoved.has(0)) pos4[3] = -1.0;
    else if (!s11ShardsRemoved.has(1)) pos4[3] = 0.0;
    else pos4[3] = 1.0;
    stepGameplay(0, 0, 0);
  } else if (currentSection === 12) {
    pos4 = [0, 0, 0.6, 0.0];
    stepGameplay(0, 0, 0);
  }
  updateHUD();
  refreshHighDimConsole();
}

// ============================================================
// HUD & Docked High-Dimensional Console UI Updates
// ============================================================
function updateHUD() {
  const meta = CHAPTER2_SECTIONS[currentSection - 1];
  const w = pos4[3];

  $('secCode').textContent = `${meta.code} / ACT ${String(currentSection).padStart(2, '0')}`;
  $('secTitle').textContent = `${meta.title}`;
  $('objective').textContent = meta.goal;
  $('wPageReadout').textContent = `W = ${w >= 0 ? '+' : ''}${w.toFixed(1)} 舱层`;

  let tagText = '青苍基准舱 · 立体厚度 3.4m';
  if (w > 0.65) tagText = '流金上层舱 · 立体厚度 3.4m';
  else if (w < -0.65) tagText = '星轨深层舱 · 立体厚度 3.4m';
  $('wPageTag').textContent = tagText;

  // Section Checklist
  let checks = [];
  if (currentSection === 1) {
    checks = [
      { done: pos4[3] > 1.2 || s1Met, text: '穿梭至 W = +1.8 流金立体空间舱' },
      { done: completedSections.has(1), text: '走向挥手的同伴林夏汇合' }
    ];
  } else if (currentSection === 2) {
    checks = [
      { done: s2Bridges.has('wp'), text: '切入 W = +1.8 踏上中段流金桥' },
      { done: s2Bridges.has('wm'), text: '切入 W = −1.8 踏上北段星轨桥' },
      { done: completedSections.has(2), text: '切回 W = 0 与对岸的林夏汇合' }
    ];
  } else if (currentSection === 3) {
    checks = [
      { done: Math.abs(pos4[3]) > 0.9 || sim3Vault.enteredVault, text: '升入 W = +1.8 越过三维防爆玻璃墙' },
      { done: sim3Vault.carryingCore || sim3Vault.coreDelivered, text: '在林夏正上方按 Q 空降入室拿起核心' },
      { done: sim3Vault.coreDelivered, text: '带核心翻出牢笼放上右侧接收台' }
    ];
  } else if (currentSection === 4) {
    checks = [
      { done: pos4[3] < -1.2 || s4PassedWall, text: '按 Q 潜入 W = −1.8 深蓝底层' },
      { done: s4PassedWall, text: '从底层右侧唯一缺口钻过赤红四维超墙' },
      { done: completedSections.has(4), text: '升回 W = 0 抵达北侧终端' }
    ];
  } else if (currentSection === 5) {
    checks = [
      { done: Math.abs(sim5Rings.bw) > 0.5 || sim5Rings.unlinked, text: '按 E 把金色巨环升入 W = +1.4 舱层' },
      { done: sim5Rings.bx >= RING_SPEC.unlinkedBX || sim5Rings.unlinked, text: '推着金环毫无碰撞地穿过青环位置' },
      { done: sim5Rings.unlinked, text: '按 Q 放回 W = 0 完成无损解链' }
    ];
  } else if (currentSection === 6) {
    checks = [
      { done: s6SwappedMirror, text: '在四维魔镜前按 R 与镜中自己互换（圣钥变左旋）' },
      { done: s6CombinedKey, text: '走向大门基座与林夏的右旋半钥完美拼合' }
    ];
  } else if (currentSection === 7) {
    checks = [
      { done: s7Crystals.has('south_low'), text: '在 W=−1.8 缩球层绕过星核采集蓝晶 ①' },
      { done: s7Crystals.has('equator_rim'), text: '在 W=0.0 最大赤道外缘采集青晶 ②' },
      { done: s7Crystals.has('center_high'), text: '在 W=+2.2 巨球消失层中心采集金晶 ③' }
    ];
  } else if (currentSection === 8) {
    checks = [
      { done: s8Forms.has('tetrahedron'), text: '在 W=−1.8 激活【正四面体】尖顶切面' },
      { done: s8Forms.has('octahedron'), text: '在 W=0.0 激活【正八面体】钻石圣殿切面' },
      { done: s8Forms.has('cube'), text: '在 W=+1.8 激活【正立方体】上翼切面' }
    ];
  } else if (currentSection === 9) {
    checks = [
      { done: hyperTorusSliceState(pos4[3]).merged || s9CrossedBridge, text: '升入 W=+1.8 让两座孤岛融合成环形天桥' },
      { done: s9CrossedBridge, text: '沿融合天桥走到右侧浮岛上方' },
      { done: s9MetLin, text: '降回 W=0 右岛与同伴林夏汇合' }
    ];
  } else if (currentSection === 10) {
    checks = [
      { done: s10Cores.has(0), text: '在 W=0 捕获双旋星轮内环核心 ①' },
      { done: s10Cores.has(1), text: '在 W=+1.8 捕获翻出第四维的外环核心 ②' },
      { done: s10Cores.has(2), text: '在 W=−1.8 捕获深层星轮核心 ③' }
    ];
  } else if (currentSection === 11) {
    checks = [
      { done: s11ShardsRemoved.has(0), text: '弯曲至 W=−1.0 取出【心脏】四维碎屑 ①' },
      { done: s11ShardsRemoved.has(1), text: '在 W=0.0 透视取出【左肺】四维碎屑 ②' },
      { done: s11ShardsRemoved.has(2), text: '弯曲至 W=+1.0 取出【脊柱】四维碎屑 ③' }
    ];
  } else if (currentSection === 12) {
    checks = [
      { done: s12Awakened, text: '与林夏并肩登上主控台点亮四维方舟之心' }
    ];
  }

  $('secChecklist').innerHTML = checks.map(c =>
    `<div class="ch2-check-item ${c.done ? 'done' : ''}"><span>${c.done ? '✓' : '○'}</span><span>${c.text}</span></div>`
  ).join('');

  const nextBtn = $('nextSecHudBtn');
  const isDone = completedSections.has(currentSection);
  nextBtn.classList.toggle('hidden', !isDone);
  nextBtn.textContent = currentSection < 12
    ? `进入${CHAPTER2_SECTIONS[currentSection].code}：${CHAPTER2_SECTIONS[currentSection].title} →`
    : '查看第二章终幕结局 →';

  document.querySelectorAll('#sectionTabs button').forEach(btn => {
    const n = Number(btn.dataset.sec);
    btn.classList.toggle('active', n === currentSection);
    btn.classList.toggle('done', completedSections.has(n));
  });
}

function refreshHighDimConsole() {
  const meta = CHAPTER2_SECTIONS[currentSection - 1];
  const w = pos4[3];

  $('godTitle').textContent = `高维俯瞰 · ${meta.title}`;
  $('godWValue').textContent = `W = ${w >= 0 ? '+' : ''}${w.toFixed(1)}`;
  $('godWSlider').value = String(w);
  $('godLiveStatus').textContent = meta.godHint;

  // Highlight active layer jump button
  document.querySelectorAll('[data-jump-w]').forEach(btn => {
    const target = Number(btn.dataset.jump-w || btn.getAttribute('data-jump-w'));
    btn.classList.toggle('active', Math.abs(w - target) < 0.45);
  });

  // High-Dimensional Crush Button text per section
  const crushLabels = {
    1: '⚡ 高维跃迁：直接升入 W=+1.8 与林夏汇合',
    2: '⚡ 高维连跃：一键穿梭三层断桥抵达对岸',
    3: sim3Vault.carryingCore ? '⚡ 高维撤离：携核心翻出密室送达接收台' : '⚡ 高维空降：越过三维玻璃墙空投进密室中心',
    4: '⚡ 高维潜行：从 W=−1.8 底层缺口钻过超墙',
    5: '⚡ 高维解链：把金环升入上层无损解开死结',
    6: s6SwappedMirror ? '✓ 已与镜中自己互换（圣钥已变左旋）' : '⚡ 四维镜像互换：与镜中自己互换翻转圣钥手性 (R)',
    7: `⚡ 高维采能：跃迁至下一枚超球晶簇层 (${s7Crystals.size}/3)`,
    8: `⚡ 高维相变：切换超方体切面形态 (${s8Forms.size}/3)`,
    9: s9CrossedBridge ? '⚡ 降回 W=0 右侧浮岛与林夏汇合' : '⚡ 升入 W=+1.8 让两座孤岛融合成环形天桥',
    10: `⚡ 捕捉双旋星轮高维曲率核心 (${s10Cores.size}/3)`,
    11: `⚡ 高维无创弯曲：摘除林夏体内下一处碎屑 (${s11ShardsRemoved.size}/3)`,
    12: '⚡ 觉醒四维方舟之心 · 折叠八胞空间站 (R)'
  };
  const extra = $('godExtraControls');
  extra.innerHTML = `<button id="crushActionBtn">${crushLabels[currentSection]}</button>`;
  $('crushActionBtn').onclick = executeHighDimCrush;
}

// ============================================================
// Input & Control Wiring
// ============================================================
function clearKeys() {
  keys.clear();
  jumpQueued = false;
  ground.releaseJumpControl();
}

function pause(showMenu = true) {
  locked = false;
  keyboardCorridor = false;
  clearKeys();
  look.transition();
  document.exitPointerLock?.();
  if (showMenu && !ended) $('menu').classList.remove('hidden');
}

function resumeFirstPerson({ keyboardFallback = true } = {}) {
  if (!ready || ended) return;
  audio.unlock();
  keyboardCorridor = keyboardFallback;
  clearKeys();
  look.transition();
  $('menu').classList.add('hidden');
  try {
    worldCanvas.focus();
    const res = worldCanvas.requestPointerLock?.();
    Promise.resolve(res).catch(() => {});
  } catch {}
  updateHUD();
}

function toggleConsoleExpand() {
  consoleExpanded = !consoleExpanded;
  $('hyperConsole').classList.toggle('expanded', consoleExpanded);
  $('expandConsoleBtn').textContent = consoleExpanded ? 'F · 收起' : 'F · 展开';
  $('toggleConsoleSizeBtn').textContent = consoleExpanded ? 'F · 标准高维操作台' : 'F · 放大高维操作台';
  setTimeout(() => { godEngine.resize(); }, 60);
}

$('start').onclick = () => resumeFirstPerson({ keyboardFallback: true });
$('pause').onclick = () => pause(true);
$('resetSecBtn').onclick = () => { selectSection(currentSection); resumeFirstPerson({ keyboardFallback: true }); };
$('toggleConsoleSizeBtn').onclick = toggleConsoleExpand;
$('expandConsoleBtn').onclick = toggleConsoleExpand;

$('nextSecHudBtn').onclick = () => {
  audio.unlock();
  if (currentSection < 12) selectSection(currentSection + 1);
  else {
    ended = true;
    pause(false);
    $('ending').classList.remove('hidden');
    audio.evidenceUnlocked();
  }
};
$('returnExplore').onclick = () => {
  ended = false;
  $('ending').classList.add('hidden');
  resumeFirstPerson({ keyboardFallback: true });
};

document.querySelectorAll('#sectionTabs button').forEach(btn => {
  btn.onclick = () => {
    audio.unlock();
    selectSection(Number(btn.dataset.sec));
  };
});

{
  const list = $('menuSecList');
  for (const s of CHAPTER2_SECTIONS) {
    const b = document.createElement('button');
    b.textContent = `${s.code} · ${s.title}`;
    b.onclick = () => {
      audio.unlock();
      selectSection(s.id);
      resumeFirstPerson({ keyboardFallback: true });
    };
    list.appendChild(b);
  }
}

$('audioBtn').onclick = () => {
  audio.unlock();
  const muted = audio.toggleMute();
  $('audioBtn').textContent = muted ? 'V · 音效 关' : 'V · 音效 开';
};
$('sensitivity').oninput = e => {
  sensitivity = Number(e.target.value);
  $('sensvalue').textContent = sensitivity.toFixed(1) + '×';
};

// High-Dimensional Console Controls
$('godResetView').onclick = () => {
  godCamera.alpha = -Math.PI * 0.62;
  godCamera.beta = 1.12;
  godCamera.radius = 12.2;
  godCamera.target.set(0, 0.3, 0);
};
document.querySelectorAll('[data-jump-w]').forEach(btn => {
  btn.onclick = () => {
    audio.unlock();
    const targetW = Number(btn.getAttribute('data-jump-w'));
    stepGameplay(0, 0, targetW - pos4[3]);
    updateHUD();
    refreshHighDimConsole();
  };
});
$('godWSlider').oninput = e => {
  audio.unlock();
  const targetW = Number(e.target.value);
  stepGameplay(0, 0, targetW - pos4[3]);
  updateHUD();
  refreshHighDimConsole();
};
$('godMoveFwd').onclick = () => { audio.unlock(); stepGameplay(0, 0.55, 0); gait.step(0.55, 0.16, 2.8, false, false); updateHUD(); refreshHighDimConsole(); };
$('godMoveBack').onclick = () => { audio.unlock(); stepGameplay(0, -0.55, 0); gait.step(0.55, 0.16, 2.8, false, false); updateHUD(); refreshHighDimConsole(); };
$('godMoveLeft').onclick = () => { audio.unlock(); stepGameplay(-0.55, 0, 0); gait.step(0.55, 0.16, 2.8, false, false); updateHUD(); refreshHighDimConsole(); };
$('godMoveRight').onclick = () => { audio.unlock(); stepGameplay(0.55, 0, 0); gait.step(0.55, 0.16, 2.8, false, false); updateHUD(); refreshHighDimConsole(); };
$('godWaveBtn').onclick = () => {
  audio.unlock();
  gesture.left = time;
  gesture.right = time;
  compGesture.left = time;
  compGesture.right = time;
  audio.wave(true);
};

document.addEventListener('pointerlockchange', () => {
  const acquired = document.pointerLockElement === worldCanvas;
  if (acquired && (ended || document.hidden)) {
    locked = false;
    document.exitPointerLock?.();
    return;
  }
  locked = acquired;
  if (locked) keyboardCorridor = false;
  clearKeys();
  look.transition();
  lockTime = time;
  $('menu').classList.toggle('hidden', locked || keyboardCorridor || ended);
});

document.addEventListener('mousemove', e => {
  if (!locked && (!keyboardCorridor || e.target !== worldCanvas || document.hidden)) {
    look.transition();
    return;
  }
  look.push(e.movementX, e.movementY, sensitivity);
});

worldCanvas.addEventListener('mousedown', e => {
  audio.unlock();
  if (keyboardCorridor && !locked && e.target === worldCanvas) {
    resumeFirstPerson({ keyboardFallback: true });
    return;
  }
  if ((!locked && !keyboardCorridor) || time - lockTime < 0.15) return;
  if (e.button === 0) {
    gesture.left = time;
    compGesture.right = time;
    audio.wave(true);
  }
  if (e.button === 2) {
    gesture.right = time;
    compGesture.left = time;
    audio.wave(true);
  }
});
worldCanvas.addEventListener('contextmenu', e => e.preventDefault());

worldCanvas.addEventListener('wheel', e => {
  if ((!locked && !keyboardCorridor) || ended) return;
  e.preventDefault();
  audio.unlock();
  const dw = -Math.sign(e.deltaY) * 0.22;
  stepGameplay(0, 0, dw);
  updateHUD();
  refreshHighDimConsole();
}, { passive: false });

document.addEventListener('keydown', e => {
  const tag = e.target?.tagName;
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;

  if (e.code === 'Escape') {
    e.preventDefault();
    if (e.repeat) return;
    pause(true);
    return;
  }
  if (e.code === 'KeyF' && !e.repeat && !ended) {
    e.preventDefault();
    toggleConsoleExpand();
    return;
  }
  if (e.code === 'KeyV' && !e.repeat) {
    $('audioBtn').click();
    return;
  }
  if (e.code === 'KeyR' && !e.repeat && !ended) {
    e.preventDefault();
    executeHighDimCrush();
    return;
  }
  if (!locked && !keyboardCorridor) return;
  if (e.code === 'Space' && !e.repeat && !keys.has('Space')) jumpQueued = true;
  if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'Space', 'ShiftLeft', 'ShiftRight'].includes(e.code)) {
    e.preventDefault();
    audio.unlock();
    keys.add(e.code);
  }
});

document.addEventListener('keyup', e => {
  keys.delete(e.code);
  if (e.code === 'Space') ground.releaseJumpControl();
});

window.addEventListener('blur', () => pause(true));
window.addEventListener('resize', () => { fpEngine.resize(); godEngine.resize(); });

// ============================================================
// Main Dual-Scene Render Loop
// ============================================================
function waveVal(startT) {
  const elapsed = time - startT;
  return elapsed >= 0 && elapsed < 1.35 ? Math.sin((elapsed * Math.PI) / 1.35) : 0;
}

fpScene.executeWhenReady(() => {
  ready = true;
  audio.setMode('chapter2');
  selectSection(1);
});

fpEngine.runRenderLoop(() => {
  const dt = Math.min(fpEngine.getDeltaTime() / 1000, 0.05);
  time += dt;

  // Slowly rotate deep 4D cosmic astrolabe rings
  cosmicRings.forEach((r, idx) => {
    r.rotation.y = time * (0.08 + idx * 0.03) * (idx % 2 === 0 ? 1 : -1);
    r.rotation.x += dt * 0.03;
  });

  if ((locked || keyboardCorridor) && ready && !ended) {
    look.frame(dt, 0);
    const strafe = Number(keys.has('KeyD')) - Number(keys.has('KeyA'));
    const forward = Number(keys.has('KeyW')) - Number(keys.has('KeyS'));
    const shiftW = Number(keys.has('KeyE')) - Number(keys.has('KeyQ'));
    const sprinting = keys.has('ShiftLeft') || keys.has('ShiftRight');

    const len = Math.hypot(strafe, forward) || 1;
    const speed = sprinting ? 4.4 : 2.85;
    const vx = (Math.cos(look.yaw) * (strafe / len) + Math.sin(look.yaw) * (forward / len)) * (strafe || forward ? speed : 0);
    const vz = (-Math.sin(look.yaw) * (strafe / len) + Math.cos(look.yaw) * (forward / len)) * (strafe || forward ? speed : 0);

    const fall = ground.step(dt, jumpQueued, false, keys.has('Space'));
    jumpQueued = false;
    if (fall.jumped) audio.jump();
    if (fall.landed) audio.land(2.0);

    const dx = vx * dt;
    const dz = vz * dt;
    const dw = shiftW * 1.75 * dt;

    if (Math.hypot(dx, dz, dw) > 1e-6) {
      stepGameplay(dx, dz, dw);
      updateHUD();
      refreshHighDimConsole();
    }

    const distMoved = Math.hypot(dx, dz);
    locomotion = gait.step(distMoved, dt, distMoved / Math.max(dt, 0.001), ground.airborne, false);
    if (!ground.airborne && Math.abs(gait.leftLeg) > 0.08) {
      const s = Math.sign(gait.leftLeg);
      if (s !== 0 && s !== strideSign) {
        strideSign = s;
        audio.footstep(sprinting);
      }
    } else if (Math.abs(gait.leftLeg) < 0.03) {
      strideSign = 0;
    }
  }

  const px = pos4[0], pz = pos4[2], pw = pos4[3];
  const footY = ground.footLift;
  const eyeY = 1.65 + footY;
  const wL = waveVal(gesture.left);
  const wR = waveVal(gesture.right);
  const cWL = waveVal(compGesture.left);
  const cWR = waveVal(compGesture.right);

  // Update First-Person Camera & Local Voxel Astronaut Body
  look.applyCamera(B, fpCamera);
  fpCamera.position.set(px, eyeY, pz);
  fpPlayerVoxel.pose({
    position: [px, eyeY, pz],
    yaw: look.yaw,
    pitch: look.pitch,
    leftLegAngle: locomotion.leftLeg,
    rightLegAngle: locomotion.rightLeg,
    waveLeft: wL,
    waveRight: wR,
    holdRight: currentSection === 6 && !s6CombinedKey ? 1 : 0,
    mirrorX: currentSection === 6 && s6SwappedMirror
  });
  fpS6Mirror.playerKey.root.setEnabled(currentSection === 6 && !s6CombinedKey);
  fpS6Mirror.playerKey.root.scaling.x = s6SwappedMirror ? -1 : 1;

  // Volumetric 3D Space Chambers in First-Person shift vertically relative to your current W
  // so you physically feel yourself ascending/descending between 3D rooms with thickness!
  const c0 = Math.max(0.16, 1 - Math.abs(pw - 0.0) / 1.4);
  const cP = Math.max(0.16, 1 - Math.abs(pw - 1.8) / 1.4);
  const cM = Math.max(0.16, 1 - Math.abs(pw + 1.8) / 1.4);
  fpChamberW0.setLayerOpacity(c0);
  fpChamberWP.setLayerOpacity(cP);
  fpChamberWM.setLayerOpacity(cM);
  fpChamberW0.root.position.y = (0.0 - pw) * 1.35;
  fpChamberWP.root.position.y = (1.8 - pw) * 1.35;
  fpChamberWM.root.position.y = (-1.8 - pw) * 1.35;

  // Companion Lin Xia (07) Presence Rule: NEVER show a meaningless figurine when hasCompanion is false!
  const meta = CHAPTER2_SECTIONS[currentSection - 1];
  fpLinXia.root.setEnabled(meta.hasCompanion && currentSection !== 11);

  let promptHtml = `按 <kbd>Q</kbd> / <kbd>E</kbd> 穿梭立体空间舱 · 右侧高维操作台实时俯瞰`;

  if (currentSection === 1) {
    const linY = (1.8 - pw) * 1.35;
    fpLinXia.setAlpha(Math.max(0.28, cP));
    const toPlayerYaw = Math.atan2(px + 1.2, pz - 0.8);
    fpLinXia.pose({
      position: [-1.2, linY, 0.8],
      yaw: toPlayerYaw,
      waveLeft: 0.6 + Math.sin(time * 4.5) * 0.35,
      waveRight: cWR,
      breatheTime: time
    });
    promptHtml = Math.abs(pw - 1.8) > 0.45
      ? `按住 <kbd>E</kbd>（或点右侧高维操作台）升入 W = +1.8 流金舱层与林夏汇合`
      : `已抵达 W = +1.8 流金舱层！走向挥手的林夏与她汇合`;
  } else if (currentSection === 2) {
    fpS2Bridges.seg0.position.y = (0.0 - pw) * 1.35;
    fpS2Bridges.segWP.position.y = (1.8 - pw) * 1.35;
    fpS2Bridges.segWM.position.y = (-1.8 - pw) * 1.35;
    fpLinXia.setAlpha(Math.max(0.3, c0));
    fpLinXia.pose({
      position: [0, (0.0 - pw) * 1.35, 2.7],
      yaw: Math.atan2(px, pz - 2.7),
      waveRight: 0.65 + Math.sin(time * 4) * 0.3,
      breatheTime: time
    });
    promptHtml = !s2Bridges.has('wp')
      ? `按 <kbd>E</kbd> 切入 W = +1.8 踏上中段流金桥并向前走`
      : !s2Bridges.has('wm')
        ? `按 <kbd>Q</kbd> 切入 W = −1.8 踏上北段深蓝桥继续前进`
        : `按 <kbd>E</kbd> 切回 W = 0.0 走上终点甲板与林夏汇合`;
  } else if (currentSection === 3) {
    const inW0 = Math.abs(pw) <= VAULT_SPEC.wallHalfW + 0.25;
    fpS3Prison.box.material.alpha = inW0 ? 0.42 : 0.07;
    fpS3Prison.frame.material.alpha = inW0 ? 0.78 : 0.18;
    fpLinXia.setAlpha(Math.max(0.28, c0));
    fpLinXia.pose({
      position: [-0.4, (0.0 - pw) * 1.35, 0.3],
      yaw: Math.atan2(px + 0.4, pz - 0.3),
      waveLeft: sim3Vault.coreDelivered ? 0.8 : 0.45 + Math.sin(time * 5) * 0.3,
      breatheTime: time
    });
    if (sim3Vault.carryingCore) {
      fpS3Prison.core.position.set(px + Math.sin(look.yaw) * 0.6, eyeY - 0.3, pz + Math.cos(look.yaw) * 0.6);
    } else {
      fpS3Prison.core.position.set(sim3Vault.corePos[0], (0.0 - pw) * 1.35 + 1.0 + Math.sin(time * 3) * 0.08, sim3Vault.corePos[2]);
    }
    fpS3Prison.core.rotation.y = time * 1.8;
    promptHtml = !sim3Vault.carryingCore && !sim3Vault.coreDelivered
      ? (Math.abs(pw) < 0.85
          ? `玻璃牢笼在 W=0 六面封死 · 按 <kbd>E</kbd> 升入 W=+1.8（或点右侧 <kbd>⚡ 高维空降</kbd>）`
          : `走到林夏头顶正中央，按 <kbd>Q</kbd> 空降进玻璃牢笼拿起核心`)
      : `已拿到核心！按 <kbd>E</kbd> 翻出牢笼送到右侧接收台 (X = +2.5)`;
  } else if (currentSection === 4) {
    // Bottom gap at W = -1.8 right side
    const inBottom = pw < -1.25;
    fpS4Wall.rightSolid.setEnabled(!inBottom);
    fpS4Wall.goalBeacon.rotation.z = time * 0.9;
    promptHtml = !s4PassedWall
      ? (inBottom ? `右侧缺口已打开！从右侧钻过赤红超墙` : `赤红超墙封死了高维 · 按住 <kbd>Q</kbd> 潜入 W = −1.8 深蓝底层寻找右侧缺口`)
      : `已穿过超墙！按 <kbd>E</kbd> 升回 W = 0.0 走向北侧光环`;
  } else if (currentSection === 5) {
    const S = fpS5Rings.SCALE;
    fpS5Rings.ringB.position.x = sim5Rings.bx * S;
    fpS5Rings.ringB.position.y = 1.5 + sim5Rings.bw * 0.45;
    fpS5Rings.ringA.material.alpha = Math.max(0.2, 1 - Math.abs(sim5Rings.bw) * 0.55);
    promptHtml = Math.abs(sim5Rings.bw) < 0.45
      ? `两只实心巨环在 W=0 互扣 · 先按 <kbd>E</kbd> 把金色巨环升入 W = +1.4 舱层`
      : sim5Rings.bx < RING_SPEC.unlinkedBX
        ? `按 <kbd>D</kbd> 推着金色巨环向右穿过青环位置`
        : `已越过青环！按 <kbd>Q</kbd> 放回 W = 0.0 完成无损解链`;
  } else if (currentSection === 6) {
    fpS6Mirror.mirrorRim.rotation.z = time * 0.5;
    // Mirror Twin mirrors your movements and holds the opposite-chirality key!
    fpS6Mirror.mirrorTwin.pose({
      position: [-px * 0.7, 0, 0.35],
      yaw: Math.PI - look.yaw,
      leftLegAngle: locomotion.rightLeg,
      rightLegAngle: locomotion.leftLeg,
      waveLeft: wR,
      waveRight: wL,
      holdRight: 1,
      mirrorX: !s6SwappedMirror,
      breatheTime: time
    });
    fpS6Mirror.mirrorKey.root.scaling.x = s6SwappedMirror ? 1 : -1;
    // Companion Lin Xia waiting beside Dual-Key Altar at (0.85, 0, 2.25)
    fpLinXia.setAlpha(1);
    fpLinXia.pose({
      position: [0.85, 0, 2.25],
      yaw: Math.atan2(px - 0.85, pz - 2.25),
      waveLeft: s6CombinedKey ? 0.8 : 0.35,
      breatheTime: time
    });
    promptHtml = !s6SwappedMirror
      ? `走近中央四维魔镜，按 <kbd>R</kbd> 与镜中的自己互换（将手中圣钥翻转为左旋镜像）`
      : `手中的圣钥已翻转为【左旋镜像】！走向前方基座与林夏的右旋半钥拼合`;
  } else if (currentSection === 7) {
    const sl = hypersphereSlice(pw);
    fpS7Sphere.sphere.setEnabled(sl.exists);
    if (sl.exists) {
      fpS7Sphere.sphere.scaling.setAll(sl.radius);
      fpS7Sphere.sphere.rotation.y = time * 0.45;
    }
    for (const c of fpS7Sphere.crystals) {
      c.mesh.setEnabled(!s7Crystals.has(c.id));
      c.mesh.rotation.y = time * 1.8;
      c.mesh.material.alpha = Math.max(0.22, 1 - Math.abs(pw - c.wTarget) * 0.5);
    }
    promptHtml = `四维超球切面半径 ${sl.radius.toFixed(1)}m · 穿梭 W=−1.8 / 0.0 / +2.2 采集三枚晶簇 (${s7Crystals.size}/3)`;
  } else if (currentSection === 8) {
    const f = hyperPolytopeSliceForm(pw);
    fpS8Temple.tetra.setEnabled(f.form === 'tetrahedron');
    fpS8Temple.octa.setEnabled(f.form === 'octahedron');
    fpS8Temple.cube.setEnabled(f.form === 'cube');
    for (const m of [fpS8Temple.tetra, fpS8Temple.octa, fpS8Temple.cube]) {
      m.scaling.setAll(f.scale);
      m.rotation.y = time * 0.5;
      m.rotation.x = Math.sin(time * 0.4) * 0.25;
    }
    promptHtml = `当前切面形态：【${f.name}】 · 按 <kbd>Q</kbd> / <kbd>E</kbd> 穿梭三层激活三种多面体 (${s8Forms.size}/3)`;
  } else if (currentSection === 9) {
    const st = hyperTorusSliceState(pw);
    fpS9Torus.islandL.setEnabled(!st.merged);
    fpS9Torus.islandR.setEnabled(!st.merged);
    fpS9Torus.mergedBridge.setEnabled(st.merged);
    if (!st.merged) {
      fpS9Torus.islandL.position.set(-st.islandOffset, -0.05, 0.2);
      fpS9Torus.islandR.position.set(st.islandOffset, -0.05, 0.2);
    }
    fpLinXia.setAlpha(Math.max(0.3, c0));
    fpLinXia.pose({
      position: [1.65, (0.0 - pw) * 1.35, 0.2],
      yaw: Math.atan2(px - 1.65, pz - 0.2),
      waveLeft: 0.6 + Math.sin(time * 4) * 0.3,
      breatheTime: time
    });
    promptHtml = !st.merged
      ? (s9CrossedBridge ? `已抵达右岛！走近林夏完成汇合` : `两座浮岛在 W=0 被深渊隔开 · 按 <kbd>E</kbd> 升入 W=+1.8 让超环面融合成桥`)
      : `两岛已融合成环形天桥！走到右侧 (X > +1.2) 再按 <kbd>Q</kbd> 降回 W=0 与林夏汇合`;
  } else if (currentSection === 10) {
    // Clifford Isoclinic Double Rotation (simultaneous XW + YZ rotation!)
    for (const n of fpS10Rotor.nodes) {
      const r4 = cliffordDoubleRotate4D(n.v4, time * 0.75);
      const d = 3.2 / (3.2 - r4[3]);
      n.mesh.position.set(r4[0] * d * 1.45, 1.55 + r4[1] * d * 0.95, 0.4 + r4[2] * d * 1.45);
      n.mesh.rotation.y = time * 1.4;
    }
    for (const c of fpS10Rotor.coreTargets) {
      c.mesh.setEnabled(!s10Cores.has(c.id));
      c.mesh.material.alpha = Math.max(0.22, 1 - Math.abs(pw - c.wTarget) * 0.55);
    }
    promptHtml = `四维双旋星轮由内向外翻滚中 · 穿梭 W=0 / +1.8 / −1.8 捕获三枚曲率核心 (${s10Cores.size}/3)`;
  } else if (currentSection === 11) {
    const p = fpS11Med.patient;
    const beat = 1 + Math.sin(time * 5.8) * 0.14;
    p.organs.heart.scaling.setAll(beat);
    p.organs.shards.forEach((sh, idx) => sh.setEnabled(!s11ShardsRemoved.has(idx)));

    if (s11ShardsRemoved.size < 3) {
      // Patient Lin Xia lying on medical table, gently curved in 4D by s11CurveW!
      p.root.position.set(0, 0.82, -0.35);
      p.body.rotationQuaternion = B.Quaternion.RotationYawPitchRoll(0, -Math.PI / 2, s11CurveW * 0.32);
      fpS11Med.scanRing.position.z = 0.5 + s11CurveW * 0.45;
      promptHtml = `走近医疗台上的林夏 · 按 <kbd>Q</kbd> / <kbd>E</kbd> 弯曲她的四维姿态，无创取出体内碎屑 (${s11ShardsRemoved.size}/3)`;
    } else {
      // Healed! Lin Xia stands up beside the medical table and salutes you!
      p.pose({
        position: [1.1, 0, 0.5],
        yaw: Math.atan2(px - 1.1, pz - 0.5),
        waveRight: 0.85,
        breatheTime: time
      });
      promptHtml = `林夏已完全康复！点击左侧「进入下一小节」前往最终的四维方舟之心`;
    }
  } else if (currentSection === 12) {
    fpS12Ark.arkTesseract.set4DAngle(-time * 0.55);
    fpLinXia.setAlpha(1);
    fpLinXia.pose({
      position: [1.15, 0.3, 0.8],
      yaw: Math.atan2(px - 1.15, pz - 0.8),
      waveLeft: 0.65,
      waveRight: 0.65,
      breatheTime: time
    });
    promptHtml = `与林夏并肩走上前方主控台（或按 <kbd>R</kbd>），折叠脚下的八胞空间站，觉醒四维方舟之心！`;
  }

  const promptEl = $('ch2Prompt');
  if (promptEl) {
    promptEl.innerHTML = promptHtml;
    promptEl.classList.toggle('show', (locked || keyboardCorridor) && !ended);
  }

  fpScene.render();

  // ============================================================
  // Update Always-Live High-Dimensional Tactical Console (#labCanvas)
  // ============================================================
  const godFloorY = pw * GOD_W_SCALE;
  godActiveChamber.root.position.y = godFloorY;

  // Player Voxel Astronaut stands ON THE FLOOR INSIDE the active volumetric 3D chamber!
  godPlayerVoxel.pose({
    position: [px * 0.62, godFloorY, pz * 0.62],
    yaw: look.yaw,
    leftLegAngle: locomotion.leftLeg,
    rightLegAngle: locomotion.rightLeg,
    waveLeft: wL,
    waveRight: wR,
    mirrorX: currentSection === 6 && s6SwappedMirror,
    breatheTime: time
  });

  // Companion Lin Xia Voxel Astronaut in God-View (ONLY when hasCompanion is true!)
  godLinVoxel.root.setEnabled(meta.hasCompanion);
  if (meta.hasCompanion) {
    let linPos = [0.9, 0, 0.8];
    if (currentSection === 1) linPos = [-0.75, 1.8 * GOD_W_SCALE, 0.5];
    else if (currentSection === 2) linPos = [0, 0, 1.65];
    else if (currentSection === 3) linPos = [-0.25, 0, 0.2];
    else if (currentSection === 6) linPos = [0.55, 0, 1.4];
    else if (currentSection === 9) linPos = [1.05, 0, 0.15];
    else if (currentSection === 11) linPos = [0, 0.25, 0.2];
    else if (currentSection === 12) linPos = [0.75, 0, 0.5];

    godLinVoxel.pose({
      position: linPos,
      yaw: Math.PI,
      waveLeft: 0.5 + Math.sin(time * 4) * 0.25,
      tiltZRad: currentSection === 11 ? s11CurveW * 0.35 : 0,
      breatheTime: time
    });
  }

  // Toggle section-specific volumetric props inside High-Dimensional Console
  godVaultBox.setEnabled(currentSection === 3);
  if (currentSection === 3) godVaultBox.position.set(0, GOD_CHAMBER_H * 0.48, 0);

  godHyperWall.setEnabled(currentSection === 4);
  if (currentSection === 4) godHyperWall.position.set(-0.4, 0.4, 0.15);

  godRingA.setEnabled(currentSection === 5);
  godRingB.setEnabled(currentSection === 5);
  if (currentSection === 5) {
    godRingA.position.set(-0.35, 0.55, 0);
    godRingB.position.set(sim5Rings.bx * 0.75, sim5Rings.bw * GOD_W_SCALE + 0.55, 0);
  }

  const showTrue4D = [7, 8, 9, 10, 12].includes(currentSection);
  godTrue4DPillar.setEnabled(showTrue4D);
  godTrue4DSphere.setEnabled(showTrue4D);
  if (showTrue4D) {
    const sl = hypersphereSlice(pw);
    godTrue4DSphere.position.set(0, godFloorY + 0.6, 0);
    godTrue4DSphere.scaling.setAll(Math.max(0.25, sl.exists ? sl.radius * 0.55 : 0.3));
    godTrue4DSphere.rotation.y = time * 0.8;
  }

  godScene.render();
  drawVolumetricStackGauge(pw);

  $('stats').textContent = `${Math.round(fpEngine.getFps())} FPS · ${locked ? '第一人称锁定' : keyboardCorridor ? '第一人称自由鼠标 · 点击锁定' : '暂停'} · 高维操作台实时联动`;
});
