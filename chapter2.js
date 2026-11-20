/**
 * Beyond 3D — Chapter 2: 《折页之间》 —「离开画纸的人」
 *
 * 16-Section 5-Act Continuous Sci-Fi RPG Campaign featuring:
 *  - Act I   (01–03): Volumetric 3D Space Chambers & Monument Valley 4D Rotating Penrose Bridge
 *  - Act II  (04–08): High-Dimensional Crushes, 4×4×2×4 4D Sokoban (XYZ ⇄ XYW Basis Switch),
 *                     Interlocked Rings & Chiral Key Mirror Control Swap
 *  - Act III (09–12): 4 True 4D Geometric Megastructures (Hypersphere, Polytope Morph,
 *                     Hyper-Torus Split/Merge Islands & 24-Cell Clifford Double Rotor)
 *  - Act IV  (13–14): Three-Body 4D Fragment ("魔戒" Tomb Ring & Unfolded 3D Battleship) &
 *                     Yun Tianming's Three Fairy Tales (2D Xue-Lang Canvas, 4D Spinning Umbrella,
 *                     Deep-Water Perspective-Invariant Beacon & Curvature Wake)
 *  - Act V   (15–16): High-Dimensional Non-Invasive Medical Surgery & Awakening the 4D Ark Core
 */
import { createVoxelAstronaut } from './voxel-astronaut.js';
import { createColoredTesseract } from './colored-tesseract.js';
import { LookController } from './look.js';
import { GroundMotion, GroundGait } from './grounded-motion.js';
import { SpaceAudio } from './sound.js';
import {
  INTERIOR_L, STAGE1_BEACONS, Stage1Simulation,
  MonumentBridgeSimulation,
  VAULT_SPEC, VaultSimulation,
  SOKOBAN_4D_SPEC, Sokoban4DSimulation, formatCoord4D,
  RING_SPEC, RingUnlinkSimulation,
  ChiralKeySimulation,
  hypersphereSlice, hyperPolytopeSliceForm, hyperTorusSliceState, cliffordDoubleRotate4D,
  ThreeBodyFragmentSimulation, FairyTaleCanvasSimulation,
  xwTiltedBodyIntersection, CHAPTER2_SECTIONS
} from './chapter2-core.js';

const B = window.BABYLON;
const $ = id => document.getElementById(id);
const TOTAL_SECTIONS = CHAPTER2_SECTIONS.length; // 16
const SAVE_KEY = 'beyond3d_ch2_save_v4';

const worldCanvas = $('world');
const look = new LookController();
const ground = new GroundMotion();
const gait = new GroundGait();
const audio = new SpaceAudio();

// Core Pure-Math 4D Simulations
const sim3Monument = new MonumentBridgeSimulation();
const sim4Vault = new VaultSimulation();
const sim6Sokoban = new Sokoban4DSimulation();
const sim7Rings = new RingUnlinkSimulation();
const sim8Key = new ChiralKeySimulation();
const sim13ThreeBody = new ThreeBodyFragmentSimulation();
const sim14Fairy = new FairyTaleCanvasSimulation();

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
let s5PassedWall = false;
let s8SwappedMirror = false;
let s8CombinedKey = false;
const s9Crystals = new Set(); // 'south_low' | 'equator_rim' | 'center_high'
const s10Forms = new Set();   // 'tetrahedron' | 'octahedron' | 'cube'
let s11CrossedBridge = false;
let s11MetLin = false;
const s12Cores = new Set();   // 0 | 1 | 2
const s15ShardsRemoved = new Set(); // 0 | 1 | 2
let s15CurveW = 0.0;
let s16Awakened = false;

// Pointer lock state
let ready = false;
let locked = false;
let keyboardCorridor = false;
let ended = false;
let lockTime = 0;

// Create dynamic 4D Sokoban Telemetry Strip (shown in Section 06)
const sokobanBadgeEl = document.createElement('div');
sokobanBadgeEl.id = 'sokobanBadge';
sokobanBadgeEl.className = 'ch2-sokoban-badge hidden';
document.body.appendChild(sokobanBadgeEl);

// Inject subtle Theme Quote line inside Left Mission Card
const themeQuoteEl = document.createElement('p');
themeQuoteEl.id = 'secThemeQuote';
themeQuoteEl.className = 'ch2-theme-quote';
const secTitleEl = $('secTitle');
if (secTitleEl && secTitleEl.parentNode) {
  secTitleEl.insertAdjacentElement('afterend', themeQuoteEl);
}

try {
  const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
  if (saved && Array.isArray(saved.completed)) {
    saved.completed.forEach(n => {
      const id = Number(n);
      if (id >= 1 && id <= TOTAL_SECTIONS) completedSections.add(id);
    });
  }
} catch {}

function saveProgress() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      section: currentSection,
      completed: [...completedSections].sort((a, b) => a - b)
    }));
  } catch {}
}

function showToast(text) {
  const el = $('ch2Toast');
  if (!el) return;
  el.textContent = text;
  el.classList.remove('hidden');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 4400);
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

function completeSection(secId, toastMsg, nextDialogue = null, speaker = '先遣领航员 · 林夏 (07)') {
  const isNew = !completedSections.has(secId);
  completedSections.add(secId);
  saveProgress();
  if (nextDialogue) setDialogue(speaker, nextDialogue);
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

  const floor = B.MeshBuilder.CreateBox(name + '_floor', { width, height: 0.22, depth }, scene);
  floor.position.set(0, -0.11, 0);
  floor.material = floorMat;
  floor.parent = root;

  const shell = B.MeshBuilder.CreateBox(name + '_shell', { width, height, depth }, scene);
  shell.position.set(0, height * 0.5, 0);
  shell.material = wallMat;
  shell.parent = root;

  const cage = B.MeshBuilder.CreateBox(name + '_cage', { width: width + 0.03, height: height + 0.03, depth: depth + 0.03 }, scene);
  cage.position.set(0, height * 0.5, 0);
  cage.material = wireMat;
  cage.parent = root;

  const px = width * 0.5 - 0.14;
  const pz = depth * 0.5 - 0.14;
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const col = B.MeshBuilder.CreateBox(name + '_col', { width: 0.18, height, depth: 0.18 }, scene);
    col.position.set(sx * px, height * 0.5, sz * pz);
    col.material = rimMat;
    col.parent = root;
  }

  return {
    root,
    floor,
    shell,
    cage,
    setLayerOpacity(clarity) {
      floorMat.alpha = clarity * floorAlpha;
      wallMat.alpha = clarity * wallAlpha;
      rimMat.alpha = clarity * 0.85;
      wireMat.alpha = Math.max(0.16, clarity * 0.65);
    }
  };
}

/** Builds an L-shaped Chiral Key Half prop (right-handed or left-handed mirror!) */
function createChiralKeyProp(scene, name, colorHex) {
  const root = new B.TransformNode(name, scene);
  const mat = makeMat(scene, name + '_mat', colorHex, { emissive: 0.55 });
  const stem = B.MeshBuilder.CreateBox(name + '_stem', { width: 0.12, height: 0.48, depth: 0.12 }, scene);
  stem.position.set(0, 0.24, 0);
  stem.material = mat;
  stem.parent = root;
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

/**
 * Reusable 4×4×2×4 4D Sokoban Multi-Slice Board Renderer (used in BOTH #world and #labCanvas!).
 * Renders W=1..4 side-by-side 3D volumetric boards in 'XYZ' mode, OR Z=1..2 thick 4×4×4 boards in 'XYW' mode.
 */
function createSokoban4DRig(scene, prefix, { cellSize = 0.54, sliceGap = 0.72, parent = null } = {}) {
  const root = new B.TransformNode(prefix + '_root', scene);
  if (parent) root.parent = parent;

  const boardMats = ['#58a6ff', '#4de6d3', '#c88cff', '#f7c346'].map((hex, i) =>
    makeMat(scene, `${prefix}_bMat_${i}`, hex, { alpha: 0.28, emissive: 0.34 })
  );
  const boardWireMats = ['#58a6ff', '#4de6d3', '#c88cff', '#f7c346'].map((hex, i) =>
    makeMat(scene, `${prefix}_bwMat_${i}`, hex, { alpha: 0.55, wireframe: true, unlit: true })
  );
  const wallMat = makeMat(scene, prefix + '_wallMat', '#8eb4ae', { alpha: 0.78, emissive: 0.22 });
  const playerMat = makeMat(scene, prefix + '_playerMat', '#5d73ff', { alpha: 0.98, emissive: 0.65 });
  const boxMat = makeMat(scene, prefix + '_boxMat', '#59ff6e', { alpha: 0.96, emissive: 0.72 });
  const boxAuraMat = makeMat(scene, prefix + '_boxAuraMat', '#9effa8', { alpha: 0.65, wireframe: true, unlit: true });
  const targetMat = makeMat(scene, prefix + '_targetMat', '#f7c346', { alpha: 0.82, emissive: 0.75 });
  const rampMat = makeMat(scene, prefix + '_rampMat', '#4de6d3', { alpha: 0.68, emissive: 0.55 });

  // Up to 4 slice base decks (W=1..4 in XYZ, or first 2 for Z=1..2 in XYW)
  const sliceBases = [];
  const sliceFrames = [];
  for (let s = 0; s < 4; s++) {
    const base = B.MeshBuilder.CreateBox(`${prefix}_base_${s}`, {
      width: cellSize * 4 + 0.14,
      height: 0.10,
      depth: cellSize * 4 + 0.14
    }, scene);
    base.material = boardMats[s];
    base.parent = root;
    sliceBases.push(base);

    const frame = B.MeshBuilder.CreateBox(`${prefix}_frame_${s}`, {
      width: cellSize * 4 + 0.18,
      height: cellSize * 2 + 0.10,
      depth: cellSize * 4 + 0.18
    }, scene);
    frame.material = boardWireMats[s];
    frame.parent = root;
    sliceFrames.push(frame);
  }

  // Static wall blocks (re-projected whenever basisMode toggles XYZ ⇄ XYW!)
  const wallMeshes = SOKOBAN_4D_SPEC.walls.map((coord, idx) => {
    const m = B.MeshBuilder.CreateBox(`${prefix}_wall_${idx}`, { size: cellSize * 0.82 }, scene);
    m.material = wallMat;
    m.parent = root;
    return { coord, mesh: m };
  });

  // Step-up ramp pad at (3,4,1,4)
  const rampMesh = B.MeshBuilder.CreateBox(`${prefix}_ramp`, {
    width: cellSize * 0.86,
    height: cellSize * 0.36,
    depth: cellSize * 0.86
  }, scene);
  rampMesh.material = rampMat;
  rampMesh.parent = root;

  // Target beacon at (3,4,2,4)
  const targetMesh = B.MeshBuilder.CreateTorus(`${prefix}_target`, {
    diameter: cellSize * 0.88,
    thickness: cellSize * 0.14,
    tessellation: 24
  }, scene);
  targetMesh.material = targetMat;
  targetMesh.parent = root;

  // Pushable lime-green 4D Crate + glowing wireframe aura
  const boxMesh = B.MeshBuilder.CreateBox(`${prefix}_box`, { size: cellSize * 0.84 }, scene);
  boxMesh.material = boxMat;
  boxMesh.parent = root;

  const boxAura = B.MeshBuilder.CreateBox(`${prefix}_boxAura`, { size: cellSize * 1.02 }, scene);
  boxAura.material = boxAuraMat;
  boxAura.parent = boxMesh;

  // Indigo 4D Player Cube + Head Cap
  const playerMesh = B.MeshBuilder.CreateBox(`${prefix}_player`, { size: cellSize * 0.76 }, scene);
  playerMesh.material = playerMat;
  playerMesh.parent = root;

  const playerCap = B.MeshBuilder.CreateSphere(`${prefix}_pCap`, { diameter: cellSize * 0.44, segments: 12 }, scene);
  playerCap.position.y = cellSize * 0.52;
  playerCap.material = makeMat(scene, prefix + '_pCapMat', '#ffffff', { emissive: 0.8 });
  playerCap.parent = playerMesh;

  function cellToLocalPos(sim, coord4) {
    const proj = sim.projectCell(coord4);
    const numSlices = sim.basisMode === 'XYZ' ? 4 : 2;
    const boardSpan = cellSize * 4 + sliceGap;
    const sliceOffsetX = (proj.sliceIndex - (numSlices + 1) * 0.5) * boardSpan;
    const lx = sliceOffsetX + (proj.localX - 2.5) * cellSize;
    const lz = (proj.localY - 2.5) * cellSize;
    const ly = (proj.localZ - 0.5) * cellSize + 0.08;
    return [lx, ly, lz];
  }

  function sync(sim, t = 0) {
    const isXYZ = sim.basisMode === 'XYZ';
    const numSlices = isXYZ ? 4 : 2;
    const boardSpan = cellSize * 4 + sliceGap;
    const activeSlice = isXYZ ? sim.player[3] : sim.player[2];

    for (let s = 0; s < 4; s++) {
      const enabled = s < numSlices;
      sliceBases[s].setEnabled(enabled);
      sliceFrames[s].setEnabled(enabled);
      if (enabled) {
        const sx = (s + 1 - (numSlices + 1) * 0.5) * boardSpan;
        const heightLayers = isXYZ ? 2 : 4;
        sliceBases[s].position.set(sx, 0.0, 0);
        sliceFrames[s].scaling.y = heightLayers / 2;
        sliceFrames[s].position.set(sx, (heightLayers * cellSize) * 0.5 + 0.05, 0);
        const isCurrent = (s + 1) === activeSlice;
        boardMats[s].alpha = isCurrent ? 0.52 : 0.20;
        boardWireMats[s].alpha = isCurrent ? 0.88 : 0.34;
      }
    }

    for (const wItem of wallMeshes) {
      const p = cellToLocalPos(sim, wItem.coord);
      wItem.mesh.position.set(p[0], p[1], p[2]);
    }

    const rp = cellToLocalPos(sim, SOKOBAN_4D_SPEC.rampCell);
    rampMesh.position.set(rp[0], rp[1] - cellSize * 0.22, rp[2]);

    const tp = cellToLocalPos(sim, sim.targets[0]);
    targetMesh.position.set(tp[0], tp[1], tp[2]);
    targetMesh.rotation.y = t * 1.4;

    const bp = cellToLocalPos(sim, sim.boxes[0]);
    boxMesh.position.set(bp[0], bp[1] + Math.sin(t * 3.5) * 0.025, bp[2]);
    boxAura.rotation.y = t * 1.1;

    const pp = cellToLocalPos(sim, sim.player);
    playerMesh.position.set(pp[0], pp[1], pp[2]);
  }

  return { root, sync };
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
fpCamera.maxZ = 160;

const fpHemi = new B.HemisphericLight('fpHemi', new B.Vector3(0.3, 1, -0.35), fpScene);
fpHemi.intensity = 0.94;
const fpDir = new B.DirectionalLight('fpDir', new B.Vector3(-0.5, -1, 0.4), fpScene);
fpDir.intensity = 0.74;

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
const fpChamberW0 = createVolumetricChamber(fpScene, 'fpChW0', { width: 9.2, height: 3.4, depth: 9.2, color: '#4de6d3', wallAlpha: 0.08 });
const fpChamberWP = createVolumetricChamber(fpScene, 'fpChWP', { width: 9.2, height: 3.4, depth: 9.2, color: '#f7c346', wallAlpha: 0.10 });
const fpChamberWM = createVolumetricChamber(fpScene, 'fpChWM', { width: 9.2, height: 3.4, depth: 9.2, color: '#58a6ff', wallAlpha: 0.10 });

// Per-Section First-Person Groups (1..16)
const fpSecGroups = {};
for (let i = 1; i <= TOTAL_SECTIONS; i++) {
  fpSecGroups[i] = new B.TransformNode('fpSecGroup_' + i, fpScene);
}

// --- Section 02: 3-Layer Broken Bridge Segments ---
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

// --- Section 03: Monument Valley 4D Rotating Penrose Bridge & Dual-Switch Sanctuary ---
const fpS3Monument = {};
{
  const root = fpSecGroups[3];
  const coralMat = makeMat(fpScene, 's3m_coral', '#f2a29b', { emissive: 0.25 });
  const ivoryMat = makeMat(fpScene, 's3m_ivory', '#f4ead7', { emissive: 0.22 });
  const goldMat = makeMat(fpScene, 's3m_gold', '#f7c346', { emissive: 0.48 });
  const cyanMat = makeMat(fpScene, 's3m_cyan', '#4de6d3', { emissive: 0.55 });

  // South Start Terrace (W=0)
  const southTerrace = B.MeshBuilder.CreateBox('s3m_south', { width: 3.2, height: 0.36, depth: 2.4 }, fpScene);
  southTerrace.position.set(0, -0.14, -2.0);
  southTerrace.material = ivoryMat;
  southTerrace.parent = root;

  // Middle Switch Terrace (W=0)
  const midTerrace = B.MeshBuilder.CreateBox('s3m_mid', { width: 3.0, height: 0.36, depth: 1.9 }, fpScene);
  midTerrace.position.set(0, -0.14, 1.0);
  midTerrace.material = coralMat;
  midTerrace.parent = root;

  // Cyan Pressure Switch Pad on Middle Terrace
  const cyanSwitch = B.MeshBuilder.CreateCylinder('s3m_cyanSw', { diameter: 0.95, height: 0.14, tessellation: 24 }, fpScene);
  cyanSwitch.position.set(0, 0.08, 0.65);
  cyanSwitch.material = cyanMat;
  cyanSwitch.parent = root;

  // Rotating 4D Penrose L-Bridge Turntable at (0, 0, -0.35)
  const turntableRoot = new B.TransformNode('s3m_turnRoot', fpScene);
  turntableRoot.position.set(0, 0, -0.35);
  turntableRoot.parent = root;

  const bridgeSpan = B.MeshBuilder.CreateBox('s3m_bridge', { width: 1.45, height: 0.28, depth: 2.15 }, fpScene);
  bridgeSpan.position.set(0, -0.10, 0);
  bridgeSpan.material = goldMat;
  bridgeSpan.parent = turntableRoot;

  // Monument Valley ornate turnwheel crank beside bridge
  const crankWheel = B.MeshBuilder.CreateTorus('s3m_crank', { diameter: 1.15, thickness: 0.10, tessellation: 32 }, fpScene);
  crankWheel.position.set(1.25, 0.95, -0.35);
  crankWheel.rotation.y = Math.PI / 2;
  crankWheel.material = goldMat;
  crankWheel.parent = root;

  // Upper W=+1.8 Golden Spire Tower where Lin Xia stands + Golden Switch
  const spireRoot = new B.TransformNode('s3m_spireRoot', fpScene);
  spireRoot.parent = root;
  const upperTower = B.MeshBuilder.CreateBox('s3m_upper', { width: 3.2, height: 0.4, depth: 2.6 }, fpScene);
  upperTower.position.set(0, -0.12, 2.15);
  upperTower.material = goldMat;
  upperTower.parent = spireRoot;

  const spireCone = B.MeshBuilder.CreateCylinder('s3m_cone', { diameterTop: 0.08, diameterBottom: 1.2, height: 2.0, tessellation: 4 }, fpScene);
  spireCone.position.set(0, 2.2, 3.0);
  spireCone.material = coralMat;
  spireCone.parent = spireRoot;

  const goldSwitch = B.MeshBuilder.CreateCylinder('s3m_goldSw', { diameter: 0.95, height: 0.14, tessellation: 24 }, fpScene);
  goldSwitch.position.set(0.6, 0.12, 1.9);
  goldSwitch.material = goldMat;
  goldSwitch.parent = spireRoot;

  // Raised Monument Spire Stairway connecting W=0 -> W=+1.8 once both switches light up!
  const spireStair = B.MeshBuilder.CreateBox('s3m_stair', { width: 1.8, height: 2.4, depth: 1.2 }, fpScene);
  spireStair.position.set(0, 1.1, 1.75);
  spireStair.material = makeMat(fpScene, 's3m_stairMat', '#74f2ce', { alpha: 0.55, emissive: 0.72 });
  spireStair.parent = root;
  spireStair.setEnabled(false);

  Object.assign(fpS3Monument, {
    southTerrace, midTerrace, cyanSwitch, turntableRoot, bridgeSpan, crankWheel,
    spireRoot, goldSwitch, spireStair, cyanMat, goldMat
  });
}

// --- Section 04: Sealed 6-Wall Glass Prison + Core + Pedestal ---
const fpS4Prison = {};
{
  const root = fpSecGroups[4];
  const box = B.MeshBuilder.CreateBox('s4_prison', { width: 2.84, height: 2.7, depth: 2.84 }, fpScene);
  box.position.set(0, 1.35, 0);
  box.material = makeMat(fpScene, 's4_pMat', '#54c1d3', { alpha: 0.42, emissive: 0.24 });
  box.parent = root;

  const frame = B.MeshBuilder.CreateBox('s4_frame', { width: 2.88, height: 2.74, depth: 2.88 }, fpScene);
  frame.position.set(0, 1.35, 0);
  frame.material = makeMat(fpScene, 's4_fMat', '#9bf0ff', { alpha: 0.75, wireframe: true, unlit: true });
  frame.parent = root;

  const core = B.MeshBuilder.CreatePolyhedron('s4_core', { type: 1, size: 0.28 }, fpScene);
  core.material = makeMat(fpScene, 's4_cMat', '#ffd55a', { emissive: 0.75 });
  core.parent = root;

  const ped = B.MeshBuilder.CreateCylinder('s4_ped', { diameter: 1.0, height: 0.9, tessellation: 24 }, fpScene);
  ped.position.set(VAULT_SPEC.pedestalPos[0], 0.45, VAULT_SPEC.pedestalPos[2]);
  ped.material = makeMat(fpScene, 's4_pedMat', '#4de6d3', { emissive: 0.35 });
  ped.parent = root;

  Object.assign(fpS4Prison, { box, frame, core, ped });
}

// --- Section 05: 4D Crimson Hyper-Wall with Bottom W=-1.8 Gap ---
const fpS5Wall = {};
{
  const root = fpSecGroups[5];
  const leftWall = B.MeshBuilder.CreateBox('s5_wallL', { width: 5.8, height: 3.1, depth: 0.35 }, fpScene);
  leftWall.position.set(-1.3, 1.55, 0.2);
  leftWall.material = makeMat(fpScene, 's5_wMat', '#ff5252', { alpha: 0.68, emissive: 0.45 });
  leftWall.parent = root;

  const rightSolid = B.MeshBuilder.CreateBox('s5_wallR', { width: 3.2, height: 3.1, depth: 0.35 }, fpScene);
  rightSolid.position.set(2.8, 1.55, 0.2);
  rightSolid.material = makeMat(fpScene, 's5_wMatR', '#ff5252', { alpha: 0.68, emissive: 0.45 });
  rightSolid.parent = root;

  const goalBeacon = B.MeshBuilder.CreateTorus('s5_goal', { diameter: 1.8, thickness: 0.12, tessellation: 36 }, fpScene);
  goalBeacon.position.set(0, 1.3, 2.6);
  goalBeacon.material = makeMat(fpScene, 's5_gMat', '#4de6d3', { emissive: 0.65 });
  goalBeacon.parent = root;

  Object.assign(fpS5Wall, { leftWall, rightSolid, goalBeacon });
}

// --- Section 06: 4D Sokoban (`4 × 4 × 2 × 4` Hyper-Grid & `XYZ ⇄ XYW` Basis Transpose) ---
const fpS6Sokoban = createSokoban4DRig(fpScene, 'fpSoko', { cellSize: 0.56, sliceGap: 0.68, parent: fpSecGroups[6] });
fpS6Sokoban.root.position.set(0, 0.65, 1.35);

// --- Section 07: Interlocked Giant Metal Rings ---
const fpS7Rings = {};
{
  const root = fpSecGroups[7];
  const SCALE = 1.65;
  const ringA = B.MeshBuilder.CreateTorus('s7_ringA', {
    diameter: RING_SPEC.majorR * 2 * SCALE,
    thickness: RING_SPEC.tubeR * 2 * SCALE,
    tessellation: 52
  }, fpScene);
  ringA.rotation.x = Math.PI / 2;
  ringA.position.set(RING_SPEC.ringACenterX * SCALE, 1.5, 0.4);
  ringA.material = makeMat(fpScene, 's7_rAMat', '#4de6d3', { emissive: 0.35 });
  ringA.parent = root;

  const ringB = B.MeshBuilder.CreateTorus('s7_ringB', {
    diameter: RING_SPEC.majorR * 2 * SCALE,
    thickness: RING_SPEC.tubeR * 2 * SCALE,
    tessellation: 52
  }, fpScene);
  ringB.position.set(RING_SPEC.startBX * SCALE, 1.5, 0.4);
  ringB.material = makeMat(fpScene, 's7_rBMat', '#f7c346', { emissive: 0.4 });
  ringB.parent = root;

  Object.assign(fpS7Rings, { ringA, ringB, SCALE });
}

// --- Section 08: 4D Phase Mirror & Dual-Key Altar (Mirror Self Control Swap + Chiral Key Halves!) ---
const fpS8Mirror = {};
{
  const root = fpSecGroups[8];
  const mirrorGlass = B.MeshBuilder.CreateBox('s8_glass', { width: 2.2, height: 2.7, depth: 0.06 }, fpScene);
  mirrorGlass.position.set(0, 1.35, -0.1);
  mirrorGlass.material = makeMat(fpScene, 's8_gMat', '#64e8de', { alpha: 0.26, emissive: 0.35 });
  mirrorGlass.parent = root;

  const mirrorRim = B.MeshBuilder.CreateTorus('s8_rim', { diameter: 2.8, thickness: 0.1, tessellation: 44 }, fpScene);
  mirrorRim.position.set(0, 1.35, -0.1);
  mirrorRim.rotation.x = Math.PI / 2;
  mirrorRim.material = makeMat(fpScene, 's8_rMat', '#f7c346', { emissive: 0.55 });
  mirrorRim.parent = root;

  const mirrorTwin = createVoxelAstronaut(fpScene, 's8_mirrorTwin', { role: 'player' });
  mirrorTwin.root.parent = root;

  const playerKey = createChiralKeyProp(fpScene, 's8_pKey', '#4de6d3');
  playerKey.root.parent = fpPlayerVoxel.handSocket;

  const mirrorKey = createChiralKeyProp(fpScene, 's8_mKey', '#4de6d3');
  mirrorKey.root.parent = mirrorTwin.handSocket;

  const altar = B.MeshBuilder.CreateCylinder('s8_altar', { diameter: 1.3, height: 1.0, tessellation: 28 }, fpScene);
  altar.position.set(0, 0.5, 2.35);
  altar.material = makeMat(fpScene, 's8_aMat', '#234a5e', { emissive: 0.25 });
  altar.parent = root;

  const linKeyOnAltar = createChiralKeyProp(fpScene, 's8_linKey', '#f7c346');
  linKeyOnAltar.root.position.set(0.22, 1.05, 2.35);
  linKeyOnAltar.root.parent = root;

  const snappedPlayerKey = createChiralKeyProp(fpScene, 's8_snappedKey', '#4de6d3');
  snappedPlayerKey.root.position.set(-0.22, 1.05, 2.35);
  snappedPlayerKey.root.scaling.x = -1;
  snappedPlayerKey.root.parent = root;
  snappedPlayerKey.root.setEnabled(false);

  Object.assign(fpS8Mirror, { mirrorGlass, mirrorRim, mirrorTwin, playerKey, mirrorKey, altar, linKeyOnAltar, snappedPlayerKey });
}

// --- Section 09 (True 4D Object #1): 4D Hypersphere Reactor & 3 Stabilizer Crystals ---
const fpS9Sphere = {};
{
  const root = fpSecGroups[9];
  const sphere = B.MeshBuilder.CreateSphere('s9_sphere', { diameter: 2.0, segments: 36 }, fpScene);
  sphere.position.set(0, 1.65, 0.2);
  sphere.material = makeMat(fpScene, 's9_sMat', '#ff9f43', { alpha: 0.88, emissive: 0.42 });
  sphere.parent = root;

  const ring = B.MeshBuilder.CreateTorus('s9_ring', { diameter: 2.05, thickness: 0.04, tessellation: 44 }, fpScene);
  ring.material = makeMat(fpScene, 's9_rMat', '#4de6d3', { emissive: 0.65 });
  ring.parent = sphere;

  const crystalSpecs = [
    { id: 'south_low', pos: [0, 1.1, 2.35], wTarget: -1.8, color: '#58a6ff' },
    { id: 'equator_rim', pos: [2.45, 1.1, 0.2], wTarget: 0.0, color: '#4de6d3' },
    { id: 'center_high', pos: [0, 1.1, 0.2], wTarget: 2.2, color: '#f7c346' }
  ];
  const crystals = crystalSpecs.map(sp => {
    const m = B.MeshBuilder.CreatePolyhedron('s9_c_' + sp.id, { type: 1, size: 0.26 }, fpScene);
    m.position.set(...sp.pos);
    m.material = makeMat(fpScene, 's9_cMat_' + sp.id, sp.color, { emissive: 0.75 });
    m.parent = root;
    return { ...sp, mesh: m };
  });

  Object.assign(fpS9Sphere, { sphere, crystals });
}

// --- Section 10 (True 4D Object #2): Diagonal 4D Hypercube / 16-Cell Temple ---
const fpS10Temple = {};
{
  const root = fpSecGroups[10];
  const centerPos = new B.Vector3(0, 1.6, 0.3);

  const tetra = B.MeshBuilder.CreatePolyhedron('s10_tetra', { type: 0, size: 1.25 }, fpScene);
  tetra.position.copyFrom(centerPos);
  tetra.material = makeMat(fpScene, 's10_tMat', '#58a6ff', { alpha: 0.88, emissive: 0.38 });
  tetra.parent = root;

  const octa = B.MeshBuilder.CreatePolyhedron('s10_octa', { type: 1, size: 1.35 }, fpScene);
  octa.position.copyFrom(centerPos);
  octa.material = makeMat(fpScene, 's10_oMat', '#4de6d3', { alpha: 0.88, emissive: 0.38 });
  octa.parent = root;

  const cube = B.MeshBuilder.CreateBox('s10_cube', { size: 2.1 }, fpScene);
  cube.position.copyFrom(centerPos);
  cube.material = makeMat(fpScene, 's10_cMat', '#f7c346', { alpha: 0.88, emissive: 0.38 });
  cube.parent = root;

  Object.assign(fpS10Temple, { tetra, octa, cube });
}

// --- Section 11 (True 4D Object #3): 4D Hyper-Torus Split Islands ⇄ Merged Ring Bridge ---
const fpS11Torus = {};
{
  const root = fpSecGroups[11];
  const islandL = B.MeshBuilder.CreateCylinder('s11_islL', { diameter: 2.8, height: 0.36, tessellation: 32 }, fpScene);
  islandL.material = makeMat(fpScene, 's11_iLMat', '#4de6d3', { emissive: 0.3 });
  islandL.parent = root;

  const islandR = B.MeshBuilder.CreateCylinder('s11_islR', { diameter: 2.8, height: 0.36, tessellation: 32 }, fpScene);
  islandR.material = makeMat(fpScene, 's11_iRMat', '#4de6d3', { emissive: 0.3 });
  islandR.parent = root;

  const mergedBridge = B.MeshBuilder.CreateTorus('s11_bridge', { diameter: 4.8, thickness: 1.35, tessellation: 48 }, fpScene);
  mergedBridge.position.set(0, -0.1, 0.2);
  mergedBridge.scaling.y = 0.25;
  mergedBridge.material = makeMat(fpScene, 's11_bMat', '#f7c346', { emissive: 0.38 });
  mergedBridge.parent = root;

  Object.assign(fpS11Torus, { islandL, islandR, mergedBridge });
}

// --- Section 12 (True 4D Object #4): 24-Cell Clifford Isoclinic Double Rotor Star-Wheel ---
const fpS12Rotor = {};
{
  const root = fpSecGroups[12];
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
    const m = B.MeshBuilder.CreatePolyhedron('s12_v_' + idx, { type: 1, size: 0.16 }, fpScene);
    m.material = makeMat(fpScene, 's12_vMat_' + idx, idx % 2 === 0 ? '#4de6d3' : '#f7c346', { emissive: 0.65 });
    m.parent = root;
    return { v4: v, mesh: m };
  });

  const coreTargets = [
    { id: 0, pos: [-1.8, 1.1, 0.4], wTarget: 0.0, color: '#4de6d3' },
    { id: 1, pos: [1.8, 1.1, 0.4], wTarget: 1.8, color: '#f7c346' },
    { id: 2, pos: [0.0, 1.1, 2.0], wTarget: -1.8, color: '#58a6ff' }
  ].map(sp => {
    const m = B.MeshBuilder.CreateSphere('s12_core_' + sp.id, { diameter: 0.48, segments: 18 }, fpScene);
    m.position.set(...sp.pos);
    m.material = makeMat(fpScene, 's12_cMat_' + sp.id, sp.color, { emissive: 0.8 });
    m.parent = root;
    return { ...sp, mesh: m };
  });

  Object.assign(fpS12Rotor, { nodes, coreTargets });
}

// --- Section 13: Three-Body 4D Fragment Space ("魔戒" Tomb Ring & Unfolded 3-Hull Battleship) ---
const fpS13Fragment = {};
{
  const root = fpSecGroups[13];
  // Shrinking translucent 4D Fragment Puddle Bubble
  const bubble = B.MeshBuilder.CreateSphere('s13_bubble', { diameter: 9.0, segments: 28 }, fpScene);
  bubble.position.set(0, 1.5, 0.4);
  bubble.material = makeMat(fpScene, 's13_bubMat', '#58b8ff', { alpha: 0.11, wireframe: true, unlit: true });
  bubble.parent = root;

  // Sentient Ancient 4D Relic: "魔戒 (Tomb Ring)" — glowing bronze torus standing on the left
  const tombRing = B.MeshBuilder.CreateTorus('s13_tombRing', { diameter: 2.3, thickness: 0.24, tessellation: 48 }, fpScene);
  tombRing.position.set(-2.35, 1.55, 0.6);
  tombRing.rotation.x = Math.PI / 2;
  tombRing.rotation.y = 0.5;
  tombRing.material = makeMat(fpScene, 's13_trMat', '#e6a850', { emissive: 0.62 });
  tombRing.parent = root;

  const tombEye = B.MeshBuilder.CreatePolyhedron('s13_tombEye', { type: 1, size: 0.28 }, fpScene);
  tombEye.position.set(-2.35, 1.55, 0.6);
  tombEye.material = makeMat(fpScene, 's13_teMat', '#8cf7ff', { emissive: 0.9 });
  tombEye.parent = root;

  // 3-Layer Concentric Armored Derelict Battleship that unfolds along W when inspected in 4D!
  const outerHullMat = makeMat(fpScene, 's13_ohMat', '#3f5266', { alpha: 0.92, emissive: 0.22 });
  const midHullMat = makeMat(fpScene, 's13_mhMat', '#4de6d3', { alpha: 0.85, emissive: 0.32 });
  const innerHullMat = makeMat(fpScene, 's13_ihMat', '#f7c346', { alpha: 0.88, emissive: 0.45 });

  const outerHull = B.MeshBuilder.CreateBox('s13_outerHull', { width: 2.8, height: 1.65, depth: 4.2 }, fpScene);
  outerHull.position.set(0.85, 1.25, 0.85);
  outerHull.material = outerHullMat;
  outerHull.parent = root;

  const midHull = B.MeshBuilder.CreateBox('s13_midHull', { width: 2.1, height: 1.2, depth: 3.1 }, fpScene);
  midHull.position.set(0.85, 1.25, 0.85);
  midHull.material = midHullMat;
  midHull.parent = root;

  const innerHull = B.MeshBuilder.CreateBox('s13_innerHull', { width: 1.35, height: 0.78, depth: 2.0 }, fpScene);
  innerHull.position.set(0.85, 1.25, 0.85);
  innerHull.material = innerHullMat;
  innerHull.parent = root;

  const coreSpecs = [
    { idx: 0, pos: [0.85, 1.25, 0.85], wTarget: -1.8, color: '#58a6ff' },
    { idx: 1, pos: [0.85, 1.25, 0.85], wTarget: 0.0,  color: '#4de6d3' },
    { idx: 2, pos: [0.85, 1.25, 0.85], wTarget: 1.8,  color: '#f7c346' }
  ];
  const cores = coreSpecs.map(sp => {
    const m = B.MeshBuilder.CreatePolyhedron('s13_core_' + sp.idx, { type: 1, size: 0.34 }, fpScene);
    m.material = makeMat(fpScene, 's13_cMat_' + sp.idx, sp.color, { emissive: 0.88 });
    m.parent = root;
    return { ...sp, mesh: m };
  });

  Object.assign(fpS13Fragment, {
    bubble, tombRing, tombEye,
    outerHull, midHull, innerHull,
    outerHullMat, midHullMat, innerHullMat,
    cores
  });
}

// --- Section 14: Yun Tianming's Three Fairy Tales (2D Xue-Lang Canvas + 4D Spinning Umbrella + Deep-Water Beacon) ---
const fpS14Fairy = {};
{
  const root = fpSecGroups[14];

  // Glowing 2D Xue-Lang Paper Canvas (`雪浪画纸`) standing upright at North wall (0, 1.55, 2.55)
  const canvasMesh = B.MeshBuilder.CreateBox('s14_canvas', { width: 3.4, height: 2.7, depth: 0.04 }, fpScene);
  canvasMesh.position.set(0, 1.55, 2.55);
  canvasMesh.material = makeMat(fpScene, 's14_canvMat', '#f6efe0', { alpha: 0.92, emissive: 0.42 });
  canvasMesh.parent = root;

  const rollerTop = B.MeshBuilder.CreateCylinder('s14_rollT', { diameter: 0.16, height: 3.7, tessellation: 18 }, fpScene);
  rollerTop.rotation.z = Math.PI / 2;
  rollerTop.position.set(0, 2.92, 2.55);
  rollerTop.material = makeMat(fpScene, 's14_rTMat', '#c78c36', { emissive: 0.35 });
  rollerTop.parent = root;

  const rollerBot = B.MeshBuilder.CreateCylinder('s14_rollB', { diameter: 0.16, height: 3.7, tessellation: 18 }, fpScene);
  rollerBot.rotation.z = Math.PI / 2;
  rollerBot.position.set(0, 0.18, 2.55);
  rollerBot.material = rollerTop.material;
  rollerBot.parent = root;

  // Gluttonous Sea Curvature Wake Trail (`饕餮海曲率航迹`) glowing ribbon along the floor
  const wakePts = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    wakePts.push(new B.Vector3(Math.sin(t * Math.PI * 1.5) * 1.45, 0.08, -2.5 + t * 4.8));
  }
  const wakeRibbon = B.MeshBuilder.CreateTube('s14_wake', { path: wakePts, radius: 0.08, tessellation: 12 }, fpScene);
  wakeRibbon.material = makeMat(fpScene, 's14_wakeMat', '#78f3ff', { alpha: 0.72, emissive: 0.85 });
  wakeRibbon.parent = root;

  // Deep-Water Prince Perspective-Invariant Beacon (`深水王子信标`) — never shrinks with 3D distance!
  const deepWaterBeacon = B.MeshBuilder.CreatePolyhedron('s14_dwBeacon', { type: 1, size: 0.16 }, fpScene);
  deepWaterBeacon.position.set(2.4, 1.7, 2.2);
  deepWaterBeacon.material = makeMat(fpScene, 's14_dwMat', '#50e8ff', { emissive: 0.92 });
  deepWaterBeacon.parent = root;

  // 4D Clifford Spinning Umbrella (`赫尔辛根默斯肯旋转伞`) floating above the player
  const umbrellaRoot = new B.TransformNode('s14_umbRoot', fpScene);
  umbrellaRoot.parent = root;
  const umbCanopy = B.MeshBuilder.CreateCylinder('s14_umbCanopy', { diameterTop: 0.12, diameterBottom: 1.55, height: 0.42, tessellation: 12 }, fpScene);
  umbCanopy.position.y = 0.25;
  umbCanopy.material = makeMat(fpScene, 's14_umbMat', '#1c2436', { alpha: 0.88, emissive: 0.32 });
  umbCanopy.parent = umbrellaRoot;

  const umbRingA = B.MeshBuilder.CreateTorus('s14_umbRingA', { diameter: 1.68, thickness: 0.05, tessellation: 32 }, fpScene);
  umbRingA.position.y = 0.12;
  umbRingA.material = makeMat(fpScene, 's14_umbRAMat', '#f7c346', { emissive: 0.85 });
  umbRingA.parent = umbrellaRoot;

  const umbRingB = B.MeshBuilder.CreateTorus('s14_umbRingB', { diameter: 1.38, thickness: 0.04, tessellation: 32 }, fpScene);
  umbRingB.position.y = 0.25;
  umbRingB.rotation.x = Math.PI / 3;
  umbRingB.material = makeMat(fpScene, 's14_umbRBMat', '#4de6d3', { emissive: 0.85 });
  umbRingB.parent = umbrellaRoot;

  // 3 Canvas Pins (`定画针`) across W = -1.8, 0.0, +1.8
  const pinSpecs = [
    { idx: 0, pos: [-1.45, 1.25, 1.45], wTarget: -1.8, color: '#58a6ff' },
    { idx: 1, pos: [0.0,   1.25, 1.45], wTarget: 0.0,  color: '#4de6d3' },
    { idx: 2, pos: [1.45,  1.25, 1.45], wTarget: 1.8,  color: '#f7c346' }
  ];
  const pins = pinSpecs.map(sp => {
    const m = B.MeshBuilder.CreateCylinder('s14_pin_' + sp.idx, { diameterTop: 0.26, diameterBottom: 0.04, height: 0.85, tessellation: 12 }, fpScene);
    m.material = makeMat(fpScene, 's14_pinMat_' + sp.idx, sp.color, { emissive: 0.85 });
    m.parent = root;
    return { ...sp, mesh: m };
  });

  Object.assign(fpS14Fairy, {
    canvasMesh, wakeRibbon, deepWaterBeacon,
    umbrellaRoot, umbRingA, umbRingB, pins
  });
}

// --- Section 15: 4D Emergency Medical Table & Voxel Patient Lin Xia with Internal Organs ---
const fpS15Med = {};
{
  const root = fpSecGroups[15];
  const bed = B.MeshBuilder.CreateBox('s15_bed', { width: 1.4, height: 0.72, depth: 2.4 }, fpScene);
  bed.position.set(0, 0.36, 0.5);
  bed.material = makeMat(fpScene, 's15_bedMat', '#1c3f52', { emissive: 0.25 });
  bed.parent = root;

  const patient = createVoxelAstronaut(fpScene, 's15_patient', { role: 'companion', withInternalOrgans: true });
  patient.root.parent = root;
  patient.setSuitXRay(0.22);

  const scanRing = B.MeshBuilder.CreateTorus('s15_scanRing', { diameter: 1.55, thickness: 0.04, tessellation: 40 }, fpScene);
  scanRing.position.set(0, 1.05, 0.5);
  scanRing.material = makeMat(fpScene, 's15_srMat', '#4de6d3', { emissive: 0.75 });
  scanRing.parent = root;

  Object.assign(fpS15Med, { bed, patient, scanRing });
}

// --- Section 16: The 4D Ark Throne & Miniature 8-Cell Chapter 1 Station Below! ---
const fpS16Ark = {};
{
  const root = fpSecGroups[16];
  const throne = B.MeshBuilder.CreateCylinder('s16_throne', { diameter: 3.4, height: 0.3, tessellation: 36 }, fpScene);
  throne.position.set(0, 0.15, 0.8);
  throne.material = makeMat(fpScene, 's16_tMat', '#f7c346', { emissive: 0.45 });
  throne.parent = root;

  const arkTesseract = createColoredTesseract(B, fpScene, { parent: root, scale: 1.15 });
  arkTesseract.root.position.set(0, 1.85, 0.8);

  Object.assign(fpS16Ark, { throne, arkTesseract });
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
godCamera.upperRadiusLimit = 24.0;
godCamera.wheelPrecision = 40;
godCamera.attachControl(godCanvas, true);
godCamera.inputs.removeByType('ArcRotateCameraKeyboardMoveInput');

const godHemi = new B.HemisphericLight('godHemi', new B.Vector3(0.35, 1, -0.3), godScene);
godHemi.intensity = 0.96;

const GOD_W_SCALE = 1.38;
const GOD_CHAMBER_H = 1.28;
const GOD_VOXEL_SCALE = 0.56;

const godStandardRoot = new B.TransformNode('godStandardRoot', godScene);

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
    floorAlpha: 0.45,
    parent: godStandardRoot
  });
  ch.root.position.y = cfg.wLv * GOD_W_SCALE;
  return { ...cfg, chamber: ch };
});

const godActiveChamber = createVolumetricChamber(godScene, 'godActiveCh', {
  width: 5.36,
  height: GOD_CHAMBER_H,
  depth: 5.36,
  color: '#ffffff',
  wallAlpha: 0.16,
  floorAlpha: 0.35,
  parent: godStandardRoot
});

const godPlayerVoxel = createVoxelAstronaut(godScene, 'godPlayer', { role: 'player' });
godPlayerVoxel.root.scaling.setAll(GOD_VOXEL_SCALE);
godPlayerVoxel.root.parent = godStandardRoot;

const godLinVoxel = createVoxelAstronaut(godScene, 'godLin', { role: 'companion', withInternalOrgans: true });
godLinVoxel.root.scaling.setAll(GOD_VOXEL_SCALE);
godLinVoxel.root.parent = godStandardRoot;

// God-View Bespoke Props per Section!
// Sec 03: Monument Valley 4D Rotating Bridge + Spire
const godMonumentBridge = B.MeshBuilder.CreateBox('godMonBr', { width: 1.1, height: 0.18, depth: 1.8 }, godScene);
godMonumentBridge.material = makeMat(godScene, 'godMonBrMat', '#f7c346', { emissive: 0.65 });
godMonumentBridge.parent = godStandardRoot;
const godMonumentStair = B.MeshBuilder.CreateBox('godMonSt', { width: 1.1, height: GOD_W_SCALE * 1.8, depth: 0.7 }, godScene);
godMonumentStair.material = makeMat(godScene, 'godMonStMat', '#74f2ce', { alpha: 0.62, emissive: 0.75 });
godMonumentStair.parent = godStandardRoot;

// Sec 04: Glass Vault Box
const godVaultBox = B.MeshBuilder.CreateBox('godVaultBox', { width: 2.2, height: GOD_CHAMBER_H * 0.95, depth: 2.2 }, godScene);
godVaultBox.material = makeMat(godScene, 'godVMat', '#54c1d3', { alpha: 0.45, emissive: 0.25 });
godVaultBox.parent = godStandardRoot;

// Sec 05: Crimson 4D Hyper-Wall
const godHyperWall = B.MeshBuilder.CreateBox('godHWall', { width: 5.0, height: GOD_W_SCALE * 2.6, depth: 0.25 }, godScene);
godHyperWall.material = makeMat(godScene, 'godHWMat', '#ff5252', { alpha: 0.55, emissive: 0.4 });
godHyperWall.parent = godStandardRoot;

// Sec 06: Bespoke 4×4×2×4 Isometric Multi-Slice Sokoban Board inside God-View Console!
const godSokobanRig = createSokoban4DRig(godScene, 'godSoko', { cellSize: 0.42, sliceGap: 0.50 });
godSokobanRig.root.position.set(0, -0.3, 0);

// Sec 07: Interlocked Rings
const godRingA = B.MeshBuilder.CreateTorus('godRingA', { diameter: 1.5, thickness: 0.18, tessellation: 32 }, godScene);
godRingA.rotation.x = Math.PI / 2;
godRingA.material = makeMat(godScene, 'godRAMat', '#4de6d3', { emissive: 0.35 });
godRingA.parent = godStandardRoot;
const godRingB = B.MeshBuilder.CreateTorus('godRingB', { diameter: 1.5, thickness: 0.18, tessellation: 32 }, godScene);
godRingB.material = makeMat(godScene, 'godRBMat', '#f7c346', { emissive: 0.4 });
godRingB.parent = godStandardRoot;

// Sec 09-12 & 16: True 4D Objects Pillar + Morph Sphere/Polytope
const godTrue4DSphere = B.MeshBuilder.CreateSphere('god4DSphere', { diameter: 1.8, segments: 24 }, godScene);
godTrue4DSphere.material = makeMat(godScene, 'god4DSphMat', '#ff9f43', { alpha: 0.75, emissive: 0.35 });
godTrue4DSphere.parent = godStandardRoot;
const godTrue4DPillar = B.MeshBuilder.CreateCylinder('god4DPillar', { diameter: 2.2, height: GOD_W_SCALE * 3.2, tessellation: 24 }, godScene);
godTrue4DPillar.material = makeMat(godScene, 'god4DPilMat', '#68a7ff', { alpha: 0.16, wireframe: true, unlit: true });
godTrue4DPillar.parent = godStandardRoot;

// Sec 13: Three-Body 4D Fragment Tomb Ring + Unfolding 3-Hull Cruiser
const godTombRing = B.MeshBuilder.CreateTorus('godTombRing', { diameter: 1.35, thickness: 0.16, tessellation: 28 }, godScene);
godTombRing.position.set(-1.55, 0.55, 0.35);
godTombRing.rotation.x = Math.PI / 2;
godTombRing.material = makeMat(godScene, 'godTRMat', '#e6a850', { emissive: 0.65 });
godTombRing.parent = godStandardRoot;

const godShipHulls = ['#58a6ff', '#4de6d3', '#f7c346'].map((hex, i) => {
  const m = B.MeshBuilder.CreateBox('godShip_' + i, { width: 1.6 - i * 0.3, height: 0.55, depth: 2.3 - i * 0.45 }, godScene);
  m.material = makeMat(godScene, 'godShMat_' + i, hex, { alpha: 0.62, emissive: 0.45 });
  m.parent = godStandardRoot;
  return m;
});

// Sec 14: Yun Tianming Xue-Lang Canvas + Spinning Umbrella in God-View
const godCanvasPlane = B.MeshBuilder.CreateBox('godFairyCanv', { width: 2.2, height: 1.6, depth: 0.05 }, godScene);
godCanvasPlane.position.set(0, 0.85, 1.65);
godCanvasPlane.material = makeMat(godScene, 'godFCanvMat', '#f6efe0', { alpha: 0.88, emissive: 0.4 });
godCanvasPlane.parent = godStandardRoot;

const godUmbrella = B.MeshBuilder.CreateTorus('godFairyUmb', { diameter: 1.25, thickness: 0.08, tessellation: 28 }, godScene);
godUmbrella.material = makeMat(godScene, 'godFUmbMat', '#f7c346', { emissive: 0.8 });
godUmbrella.parent = godStandardRoot;

// ============================================================
// 3. RIGHT-SIDE 3D VOLUMETRIC CHAMBER STACK GAUGE (#volStackCanvas)
// ============================================================
const volCanvas = $('volStackCanvas');
const vctx = volCanvas.getContext('2d');

function drawVolumetricStackGauge(currentW) {
  const w = volCanvas.width;
  const h = volCanvas.height;
  vctx.clearRect(0, 0, w, h);

  function draw3DBox(cy, boxH, colorHex, isCurrent) {
    const cx = w * 0.5;
    const hw = 25;
    const hd = 8;
    const topY = cy - boxH * 0.5;
    const botY = cy + boxH * 0.5;

    vctx.lineWidth = isCurrent ? 2.0 : 1.1;
    vctx.strokeStyle = isCurrent ? '#ffffff' : colorHex;

    vctx.fillStyle = colorHex + (isCurrent ? '66' : '28');
    vctx.beginPath();
    vctx.moveTo(cx, topY - hd);
    vctx.lineTo(cx + hw, topY);
    vctx.lineTo(cx, topY + hd);
    vctx.lineTo(cx - hw, topY);
    vctx.closePath();
    vctx.fill();
    vctx.stroke();

    vctx.fillStyle = colorHex + (isCurrent ? '88' : '38');
    vctx.beginPath();
    vctx.moveTo(cx - hw, topY);
    vctx.lineTo(cx, topY + hd);
    vctx.lineTo(cx, botY + hd);
    vctx.lineTo(cx - hw, botY);
    vctx.closePath();
    vctx.fill();
    vctx.stroke();

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

  // Section 06 (4D Sokoban): draw 4 volumetric W=1..4 slice boxes (or 2 Z=1..2 boxes in XYW mode)!
  if (currentSection === 6) {
    const isXYZ = sim6Sokoban.basisMode === 'XYZ';
    const slices = isXYZ
      ? [
          { idx: 1, color: '#58a6ff', y: h * 0.80 },
          { idx: 2, color: '#4de6d3', y: h * 0.60 },
          { idx: 3, color: '#c88cff', y: h * 0.40 },
          { idx: 4, color: '#f7c346', y: h * 0.20 }
        ]
      : [
          { idx: 1, color: '#4de6d3', y: h * 0.68 },
          { idx: 2, color: '#f7c346', y: h * 0.32 }
        ];
    const activeIdx = isXYZ ? sim6Sokoban.player[3] : sim6Sokoban.player[2];
    for (const s of slices) {
      draw3DBox(s.y, isXYZ ? 18 : 26, s.color, s.idx === activeIdx);
    }
    const activeSliceObj = slices.find(s => s.idx === activeIdx) || slices[0];
    vctx.fillStyle = '#59ff6e';
    vctx.fillRect(w * 0.5 - 5, activeSliceObj.y - 5, 10, 10);
    return;
  }

  const mapY = wVal => h * 0.5 - (wVal / 2.3) * (h * 0.34);
  const layers = [
    { wVal: -1.8, color: '#58a6ff' },
    { wVal: 0.0,  color: '#4de6d3' },
    { wVal: 1.8,  color: '#f7c346' }
  ];

  for (const ly of layers) {
    const active = Math.abs(currentW - ly.wVal) < 0.35;
    draw3DBox(mapY(ly.wVal), 22, ly.color, active);
  }

  const py = mapY(Math.max(-2.3, Math.min(2.3, currentW)));
  vctx.fillStyle = '#ffffff';
  vctx.fillRect(w * 0.5 - 4, py - 7, 8, 7);
  vctx.fillStyle = '#f7c346';
  vctx.fillRect(w * 0.5 - 3, py, 6, 8);
}

// ============================================================
// Section 06 Discrete 4D Sokoban Helper
// ============================================================
function sokobanMove(dx, dy, dz, dw) {
  const res = sim6Sokoban.step(dx, dy, dz, dw);
  if (res.moved) {
    if (res.crossWPush) {
      audio.airlockUnlock();
      pulseWShift(sim6Sokoban.player[3] - 2.5);
      showToast(`⚡ 跨维推箱成功！翠绿箱跨越第四维进入 W = ${sim6Sokoban.boxes[0][3]} → ${formatCoord4D(sim6Sokoban.boxes[0])}`);
    } else if (res.pushed) {
      audio.routeStep(sim6Sokoban.moves);
      if (sim6Sokoban.is3DDeadlocked(0)) {
        showToast(`⚠ 箱子在 W=3 墙角 ${formatCoord4D(sim6Sokoban.boxes[0])} 三维死锁！按 Q/C 退至 W=2 再按 E 跨维推入 W=4！`);
      }
    } else if (dw !== 0) {
      audio.wSlideTone((sim6Sokoban.player[3] - 2.5) * 1.1);
      pulseWShift(sim6Sokoban.player[3] - 2.5);
    } else {
      audio.footstep(false);
    }
    pos4[3] = (sim6Sokoban.player[3] - 2.5) * 1.15;
    if (res.complete) {
      completeSection(
        6,
        '第六小节完成！4×4×2×4 四维推箱矩阵归位 (3,4,2,4)，主塔动力锁彻底解除！',
        '“完美！三维墙角里的死局，从第四维推一格就迎刃而解了！”'
      );
    }
  } else if (res.blocked && time - (sokobanMove._hitT || 0) > 0.45) {
    sokobanMove._hitT = time;
    audio.probeBounce(1.2);
    if (sim6Sokoban.is3DDeadlocked(0)) {
      showToast('三维死角阻挡！按 Q/C 切换去 W=2 层，绕到箱子 W 维后方按 E 把它跨维推入 W=4！');
    }
  }
  updateHUD();
  refreshHighDimConsole();
  return res;
}

// ============================================================
// Section Selection, Movement & High-Dimensional Crush Actions
// ============================================================
function selectSection(secId) {
  currentSection = Math.max(1, Math.min(TOTAL_SECTIONS, Number(secId) || 1));
  for (let i = 1; i <= TOTAL_SECTIONS; i++) {
    fpSecGroups[i].setEnabled(i === currentSection);
  }

  ground.reset();
  gait.reset();
  look.yaw = 0;
  look.pitch = 0;

  if (currentSection === 1) { pos4 = [0, 0, -2.4, 0.0]; }
  else if (currentSection === 2) { pos4 = [0, 0, -2.6, 0.0]; s2Bridges.clear(); }
  else if (currentSection === 3) { sim3Monument.reset(); pos4 = [0, 0, -2.0, 0.0]; }
  else if (currentSection === 4) { sim4Vault.reset(false); pos4 = [...sim4Vault.player]; }
  else if (currentSection === 5) { pos4 = [0, 0, -2.3, 0.0]; s5PassedWall = false; }
  else if (currentSection === 6) {
    sim6Sokoban.reset();
    pos4 = [0, 0, -3.55, (sim6Sokoban.player[3] - 2.5) * 1.15];
    look.pitch = 0.24;
    godCamera.alpha = -Math.PI * 0.5;
    godCamera.beta = 0.92;
    godCamera.radius = 12.6;
  }
  else if (currentSection === 7) { sim7Rings.reset(); pos4 = [0, 0, -1.8, 0.0]; }
  else if (currentSection === 8) { sim8Key.reset(); pos4 = [0, 0, -2.3, 0.0]; s8SwappedMirror = false; s8CombinedKey = false; }
  else if (currentSection === 9) { pos4 = [0, 0, -2.5, 0.0]; s9Crystals.clear(); }
  else if (currentSection === 10) { pos4 = [0, 0, -2.4, -1.8]; s10Forms.clear(); }
  else if (currentSection === 11) { pos4 = [-1.65, 0, 0.2, 0.0]; s11CrossedBridge = false; s11MetLin = false; }
  else if (currentSection === 12) { pos4 = [0, 0, -2.4, 0.0]; s12Cores.clear(); }
  else if (currentSection === 13) { sim13ThreeBody.reset(); pos4 = [0, 0, -2.5, 0.0]; }
  else if (currentSection === 14) { sim14Fairy.reset(); pos4 = [0, 0, -2.5, 0.0]; }
  else if (currentSection === 15) { pos4 = [0, 0, -1.9, 0.0]; s15ShardsRemoved.clear(); s15CurveW = 0.0; }
  else if (currentSection === 16) { pos4 = [0, 0, -2.0, 0.0]; s16Awakened = false; }

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
      completeSection(2, '第二小节完成！你连续穿梭三层立体空间舱越过了折叠断渊！', '“干得漂亮！前方出现了纪念碑谷般的四维圣殿，我们快过去！”');
    }
  } else if (currentSection === 3) {
    pos4[3] = Math.max(-2.2, Math.min(2.3, pos4[3] + dw));
    const candX = Math.max(-3.2, Math.min(3.2, pos4[0] + dx));
    const candZ = Math.max(-3.2, Math.min(3.2, pos4[2] + dz));
    const prevSw = sim3Monument.cyanSwitchPressed;
    const probe = sim3Monument.updateProgress([candX, 0, candZ, pos4[3]]);
    if (probe.blockedByAbyss) {
      if (Math.abs(dz) > 1e-4 && time - (stepGameplay._hitT || 0) > 1.0) {
        stepGameplay._hitT = time;
        audio.probeBounce(1.5);
        showToast('四维旋转天桥当前偏向第四维！按 R（或点右侧转盘按钮）将天桥在 XW 平面旋转 90° 接通断渊！');
      }
      pos4[0] = candX;
    } else {
      pos4[0] = candX;
      pos4[2] = candZ;
    }
    const post = sim3Monument.updateProgress(pos4);
    if (!prevSw && post.cyanSwitchPressed) {
      audio.airlockUnlock();
      compGesture = { left: time, right: time };
      setDialogue('先遣领航员 · 林夏 (07)', '“我这边也同步踩下金色踏板了！通往 W=+1.8 圣殿尖塔的立体光梯已经升起，按 E 上来汇合！”');
      showToast('青色与金色双踏板共鸣！登顶圣殿光梯已升起，按 E 升入 W=+1.8 汇合！');
    }
    if (post.complete) {
      compGesture = { left: time, right: time };
      completeSection(3, '第三小节完成！你旋转四维纪念碑天桥并与林夏双人共鸣登顶！', '“视错觉在第四维里完全是真实的几何旋转！快走，前面就是方舟核心大厅！”');
    }
  } else if (currentSection === 4) {
    const res = sim4Vault.move([dx, 0, dz, dw]);
    pos4 = [...sim4Vault.player];
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
      completeSection(4, '第四小节完成！高维对低维的降维碾压：无门密室救援成功！', '“核心已激活！小心，前方升起了连第四维都封死的赤红超墙！”');
    }
  } else if (currentSection === 5) {
    pos4[3] = Math.max(-2.3, Math.min(2.3, pos4[3] + dw));
    const candX = Math.max(-3.6, Math.min(3.6, pos4[0] + dx));
    const candZ = Math.max(-3.4, Math.min(3.4, pos4[2] + dz));
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
    if (pos4[2] > 1.2) s5PassedWall = true;
    if (s5PassedWall && Math.abs(pos4[3]) < 0.45 && pos4[2] > 1.8) {
      completeSection(5, '第五小节完成！你成功潜入底层唯一的高维裂隙突破了四维封锁线！');
    }
  } else if (currentSection === 6) {
    // Section 06 (4D Sokoban): discrete steps handled by sokobanMove(); slider/wheel W shift moves player slice!
    if (Math.abs(dw) > 0.25) {
      sokobanMove(0, 0, 0, Math.sign(dw));
    }
  } else if (currentSection === 7) {
    pos4[0] = Math.max(-3.4, Math.min(3.4, pos4[0] + dx));
    pos4[2] = Math.max(-3.2, Math.min(3.2, pos4[2] + dz));
    const res = sim7Rings.moveTo(sim7Rings.bx + dx * 0.75, sim7Rings.bw + dw);
    pos4[3] = sim7Rings.bw;
    if (res.blocked && time - (stepGameplay._hitT || 0) > 0.9) {
      stepGameplay._hitT = time;
      audio.probeBounce(2.0);
      showToast('两只实心巨环在 W=0 死死相扣！先按 E 把金环升到 W=+1.4 舱层再向右推！');
    }
    if (res.unlinked) {
      completeSection(7, '第七小节完成！两只从未断裂的 4 米合金巨环在第四维彻底解开！');
    }
  } else if (currentSection === 8) {
    pos4[0] = Math.max(-3.4, Math.min(3.4, pos4[0] + dx));
    pos4[2] = Math.max(-3.2, Math.min(3.0, pos4[2] + dz));
    pos4[3] = Math.max(-2.2, Math.min(2.2, pos4[3] + dw));
    if (Math.hypot(pos4[0], pos4[2] - 2.0) < 1.25) {
      if (s8SwappedMirror) {
        if (!s8CombinedKey) {
          s8CombinedKey = true;
          fpS8Mirror.snappedPlayerKey.root.setEnabled(true);
          fpS8Mirror.playerKey.root.setEnabled(false);
          compGesture = { left: time, right: time };
          completeSection(8, '第八小节完成！手性反转后的左旋半钥与林夏的右旋半钥完美拼合，内殿大门洞开！', '“咔哒！左右两半圣钥严丝合缝！快看门后——那是真正的四维巨物！”');
        }
      } else if (time - (stepGameplay._keyHint || 0) > 1.6) {
        stepGameplay._keyHint = time;
        showToast('你手里的半钥和林夏同为【右旋】，无法拼合！走近中央四维魔镜按 R 与镜中自己互换手性！');
      }
    }
  } else if (currentSection === 9) {
    pos4[3] = Math.max(-2.4, Math.min(2.4, pos4[3] + dw));
    const sl = hypersphereSlice(pos4[3]);
    const candX = Math.max(-3.6, Math.min(3.6, pos4[0] + dx));
    const candZ = Math.max(-3.4, Math.min(3.4, pos4[2] + dz));
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
    for (const c of fpS9Sphere.crystals) {
      if (!s9Crystals.has(c.id) && Math.abs(pos4[3] - c.wTarget) < 0.55 && Math.hypot(pos4[0] - c.pos[0], pos4[2] - c.pos[2]) < 1.15) {
        s9Crystals.add(c.id);
        audio.routeStep(s9Crystals.size);
        showToast(`已采集稳压晶簇 (${s9Crystals.size}/3)！`);
      }
    }
    if (s9Crystals.size === 3) {
      completeSection(9, '第九小节完成！你利用四维超球在不同切面的缩放与消隐集齐了三枚晶簇！');
    }
  } else if (currentSection === 10) {
    pos4[0] = Math.max(-3.5, Math.min(3.5, pos4[0] + dx));
    pos4[2] = Math.max(-3.4, Math.min(3.4, pos4[2] + dz));
    pos4[3] = Math.max(-2.3, Math.min(2.3, pos4[3] + dw));
    const form = hyperPolytopeSliceForm(pos4[3]);
    if (form.exists && Math.hypot(pos4[0], pos4[2] - 0.3) < 2.2) {
      if (!s10Forms.has(form.form)) {
        s10Forms.add(form.form);
        audio.routeStep(s10Forms.size);
        showToast(`已激活四维超方体切面形态：${form.name} (${s10Forms.size}/3)！`);
      }
    }
    if (s10Forms.size === 3) {
      completeSection(10, '第十小节完成！你亲眼见证了同一座四维超方体切出正四面体、正八面体与正立方体三种形态！');
    }
  } else if (currentSection === 11) {
    pos4[3] = Math.max(-2.3, Math.min(2.3, pos4[3] + dw));
    const st = hyperTorusSliceState(pos4[3]);
    const candX = Math.max(-3.4, Math.min(3.4, pos4[0] + dx));
    const candZ = Math.max(-3.0, Math.min(3.0, pos4[2] + dz));
    if (!st.merged && Math.abs(candX) < 0.72) {
      if (Math.abs(dx) > 1e-4 && time - (stepGameplay._hitT || 0) > 1.0) {
        stepGameplay._hitT = time;
        showToast('在 W=0 层两座浮岛被深渊隔开！按 E 升入 W=+1.8 层，让四维超环面把两岛融合成环形天桥！');
      }
    } else {
      pos4[0] = candX;
      pos4[2] = candZ;
    }
    if (st.merged && pos4[0] > 0.9) s11CrossedBridge = true;
    if (pos4[0] > 0.9 && Math.abs(pos4[3]) < 0.45 && Math.hypot(pos4[0] - 1.65, pos4[2] - 0.2) < 1.3) {
      s11MetLin = true;
      compGesture = { left: time, right: time };
      completeSection(11, '第十一小节完成！你借四维超环面在 W=+1.8 的融合天桥跨过深渊，回到 W=0 与林夏汇合！', '“太神奇了！两座孤岛在第四维本来就是连在一起的环面！”');
    }
  } else if (currentSection === 12) {
    pos4[0] = Math.max(-3.5, Math.min(3.5, pos4[0] + dx));
    pos4[2] = Math.max(-3.4, Math.min(3.4, pos4[2] + dz));
    pos4[3] = Math.max(-2.3, Math.min(2.3, pos4[3] + dw));
    for (const c of fpS12Rotor.coreTargets) {
      if (!s12Cores.has(c.id) && Math.abs(pos4[3] - c.wTarget) < 0.55 && Math.hypot(pos4[0] - c.pos[0], pos4[2] - c.pos[2]) < 1.25) {
        s12Cores.add(c.id);
        audio.routeStep(s12Cores.size);
        showToast(`已捕获双旋星轮曲率核心 (${s12Cores.size}/3)！`);
      }
    }
    if (s12Cores.size === 3) {
      completeSection(12, '第十二小节完成！你已集齐四维正二十四胞体双旋星轮的三枚曲率核心！');
    }
  } else if (currentSection === 13) {
    // Section 13: Three-Body 4D Fragment Space ("魔戒" Tomb Ring & Unfolded 3-Hull Battleship)
    pos4[0] = Math.max(-3.6, Math.min(3.6, pos4[0] + dx));
    pos4[2] = Math.max(-3.4, Math.min(3.4, pos4[2] + dz));
    pos4[3] = Math.max(-2.3, Math.min(2.3, pos4[3] + dw));

    // Approach ancient 4D Tomb Ring ("魔戒") on the left
    if (!sim13ThreeBody.ringContacted && Math.hypot(pos4[0] + 2.35, pos4[2] - 0.6) < 1.8) {
      const talk = sim13ThreeBody.contactTombRing();
      audio.hologramOpen();
      setDialogue('四维遗迹 · 魔戒 (Tomb Ring)', talk.dialogue);
      showToast('已与古老四维遗迹【魔戒】建立通讯！按 R 展开三层封闭战舰的四维全透视视图！');
    }

    // Approach the derelict cruiser cores across W = -1.8, 0.0, +1.8
    if (Math.hypot(pos4[0] - 0.85, pos4[2] - 0.85) < 2.0) {
      if (!sim13ThreeBody.hullUnfolded4D && Math.abs(pos4[3]) < 0.85) {
        if (time - (stepGameplay._hitT || 0) > 1.2) {
          stepGameplay._hitT = time;
          audio.probeBounce(1.7);
          showToast('战舰三层装甲在三维完全封死！按 R（或点右侧「四维全透视拆解」）沿第四维展开全部内舱！');
        }
      } else {
        for (const c of fpS13Fragment.cores) {
          if (!sim13ThreeBody.coresExtracted[c.idx] && Math.abs(pos4[3] - c.wTarget) < 0.65) {
            const r = sim13ThreeBody.extractCore(c.idx, pos4);
            if (r.extracted) {
              audio.routeStep(r.count);
              showToast(`从第四维无损取出战舰内层量子核心 (${r.count}/3)！`);
              if (r.complete) {
                compGesture = { left: time, right: time };
                completeSection(
                  13,
                  '第十三小节完成！你听见了「魔戒」的遗言，并从第四维透视拆解了整艘三层封闭战舰！',
                  '“四维水洼快干涸了！不好——前方掀起了『针眼画师』的二维降维浪潮！”'
                );
              }
            }
          }
        }
      }
    }
  } else if (currentSection === 14) {
    // Section 14: Yun Tianming's Three Fairy Tales (2D Xue-Lang Canvas + 4D Umbrella + Deep-Water Beacon)
    pos4[0] = Math.max(-3.6, Math.min(3.6, pos4[0] + dx));
    pos4[2] = Math.max(-3.4, Math.min(3.2, pos4[2] + dz));
    pos4[3] = Math.max(-2.3, Math.min(2.3, pos4[3] + dw));

    for (const p of fpS14Fairy.pins) {
      if (!sim14Fairy.pinsUnlocked[p.idx] && Math.abs(pos4[3] - p.wTarget) < 0.65 && Math.hypot(pos4[0] - p.pos[0], pos4[2] - p.pos[2]) < 1.45) {
        const res = sim14Fairy.unlockPin(p.idx, pos4);
        if (res.blockedByFlatteningField) {
          if (time - (stepGameplay._hitT || 0) > 1.2) {
            stepGameplay._hitT = time;
            audio.probeBounce(1.8);
            showToast('二维降维场阻挡！必须先按 R 撑开并旋转【四维克利福德旋转伞】护住自己，才能拔除定画针！');
          }
        } else if (res.unlocked) {
          audio.routeStep(res.count);
          showToast(`已拔除雪浪画纸定画针 (${res.count}/3)！`);
          if (res.complete) {
            compGesture = { left: time, right: time };
            completeSection(
              14,
              '第十四小节完成！旋转伞抵御了降维打击，你成功把林夏从二维雪浪画纸中重新折回三维立体世界！',
              '“呼……我重新拥有厚度了！但刚才被压进画卷时有三块高维碎屑卡进了我体内……快带我去四维医疗台！”'
            );
          }
        }
      }
    }
  } else if (currentSection === 15) {
    pos4[0] = Math.max(-3.2, Math.min(3.2, pos4[0] + dx));
    pos4[2] = Math.max(-3.0, Math.min(3.0, pos4[2] + dz));
    pos4[3] = Math.max(-2.0, Math.min(2.0, pos4[3] + dw));
    s15CurveW = pos4[3];
    if (Math.hypot(pos4[0], pos4[2] - 0.5) < 2.3) {
      if (pos4[3] < -0.7 && !s15ShardsRemoved.has(0)) {
        s15ShardsRemoved.add(0);
        audio.routeStep(s15ShardsRemoved.size);
        showToast('已从高维取出【心脏起搏核】内的四维碎屑 (1/3)！');
      }
      if (Math.abs(pos4[3]) < 0.35 && !s15ShardsRemoved.has(1)) {
        s15ShardsRemoved.add(1);
        audio.routeStep(s15ShardsRemoved.size);
        showToast('已从高维取出【左肺换气阀】内的四维碎屑 (2/3)！');
      }
      if (pos4[3] > 0.7 && !s15ShardsRemoved.has(2)) {
        s15ShardsRemoved.add(2);
        audio.routeStep(s15ShardsRemoved.size);
        showToast('已从高维取出【脊柱神经束】内的四维碎屑 (3/3)！');
      }
      if (s15ShardsRemoved.size === 3) {
        compGesture = { left: time, right: time };
        completeSection(15, '第十五小节完成！你未伤分毫宇航服外壳，便从第四维取出了林夏体内的全部碎屑！', '“心跳恢复正常了！谢谢你，08号！我们一起去点亮最终的四维方舟之心吧！”');
      }
    }
  } else if (currentSection === 16) {
    pos4[0] = Math.max(-3.4, Math.min(3.4, pos4[0] + dx));
    pos4[2] = Math.max(-3.2, Math.min(3.2, pos4[2] + dz));
    pos4[3] = Math.max(-2.2, Math.min(2.2, pos4[3] + dw));
    if (Math.hypot(pos4[0], pos4[2] - 0.8) < 1.65 && !s16Awakened) {
      s16Awakened = true;
      compGesture = { left: time, right: time };
      completeSection(16, '第十六小节完成！四维方舟之心已觉醒，通往五维星海的星门为你开启！', '“看啊，那就是整座八胞空间站的全貌……我们终于不再是画纸上的人了！”');
    }
  }

  if (Math.abs(pos4[3] - prevW) > 1e-3 && currentSection !== 6) {
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
    if (!sim3Monument.isBridgeAligned) {
      sim3Monument.rotateBridge(90);
      audio.hologramOpen();
      showToast(`⚡ 纪念碑谷四维转盘旋转至 ${sim3Monument.bridgeAngleDeg}°！天桥已严丝合缝接通，快走上中央踩下青色踏板！`);
    } else if (!sim3Monument.cyanSwitchPressed) {
      pos4 = [0, 0, 0.65, 0.0];
      stepGameplay(0, 0, 0);
    } else {
      pos4 = [0, 0, 1.85, 1.8];
      stepGameplay(0, 0, 0);
    }
  } else if (currentSection === 4) {
    if (!sim4Vault.carryingCore && !sim4Vault.coreDelivered) {
      sim4Vault.move([0, 0, 0, 1.5 - sim4Vault.player[3]]);
      sim4Vault.move([-sim4Vault.player[0], 0, -sim4Vault.player[2], 0]);
      const r = sim4Vault.move([0, 0, 0, -sim4Vault.player[3]]);
      pos4 = [...sim4Vault.player];
      if (r.picked) showToast('⚡ 高维空降：已直接跨越三维玻璃墙空投进密室中心拿起核心！再点一次高维撤离！');
    } else if (sim4Vault.carryingCore) {
      sim4Vault.move([0, 0, 0, 1.5 - sim4Vault.player[3]]);
      sim4Vault.move([VAULT_SPEC.pedestalPos[0] - sim4Vault.player[0], 0, 0, 0]);
      sim4Vault.move([0, 0, 0, -sim4Vault.player[3]]);
      pos4 = [...sim4Vault.player];
      stepGameplay(0, 0, 0);
    }
  } else if (currentSection === 5) {
    pos4 = [1.4, 0, 0.3, -1.8];
    pos4 = [0, 0, 2.1, 0.0];
    s5PassedWall = true;
    stepGameplay(0, 0, 0);
  } else if (currentSection === 6) {
    const res = sim6Sokoban.solveStep();
    if (res.moved) {
      audio.routeStep(sim6Sokoban.moves);
      pos4[3] = (sim6Sokoban.player[3] - 2.5) * 1.15;
      if (res.crossWPush) {
        audio.airlockUnlock();
        showToast(`⚡ 高维解算跨维推箱！箱子推入 W=${sim6Sokoban.boxes[0][3]} → ${formatCoord4D(sim6Sokoban.boxes[0])}`);
      }
      if (res.complete) {
        completeSection(
          6,
          '第六小节完成！4×4×2×4 四维推箱矩阵归位 (3,4,2,4)，主塔动力锁彻底解除！',
          '“完美！三维墙角里的死局，从第四维推一格就迎刃而解了！”'
        );
      }
    }
  } else if (currentSection === 7) {
    sim7Rings.moveTo(sim7Rings.bx, 1.2);
    sim7Rings.moveTo(1.85, 1.2);
    sim7Rings.moveTo(1.85, 0.0);
    pos4[3] = 0;
    stepGameplay(0, 0, 0);
  } else if (currentSection === 8) {
    s8SwappedMirror = !s8SwappedMirror;
    sim8Key.setAngles({ xw: s8SwappedMirror ? 180 : 0 });
    audio.hologramOpen();
    showToast(s8SwappedMirror
      ? '⚡ 四维镜像互换成功！你与镜中自己互换了控制权，手里的圣钥已翻转为【左旋镜像】！快去大门基座拼合！'
      : '已切回原手性。');
  } else if (currentSection === 9) {
    if (!s9Crystals.has('south_low')) { pos4 = [0, 0, 2.35, -1.8]; }
    else if (!s9Crystals.has('equator_rim')) { pos4 = [2.45, 0, 0.2, 0.0]; }
    else { pos4 = [0, 0, 0.2, 2.2]; }
    stepGameplay(0, 0, 0);
  } else if (currentSection === 10) {
    if (!s10Forms.has('tetrahedron')) pos4 = [0, 0, -1.1, -1.8];
    else if (!s10Forms.has('octahedron')) pos4 = [0, 0, -1.1, 0.0];
    else pos4 = [0, 0, -1.1, 1.8];
    stepGameplay(0, 0, 0);
  } else if (currentSection === 11) {
    if (!s11CrossedBridge) {
      pos4 = [1.65, 0, 0.2, 1.8];
      s11CrossedBridge = true;
      showToast('⚡ 已升入 W=+1.8 走过融合后的超环面天桥！再点一次降回右岛与林夏汇合！');
    } else {
      pos4 = [1.65, 0, 0.2, 0.0];
      stepGameplay(0, 0, 0);
    }
  } else if (currentSection === 12) {
    if (!s12Cores.has(0)) pos4 = [-1.8, 0, 0.4, 0.0];
    else if (!s12Cores.has(1)) pos4 = [1.8, 0, 0.4, 1.8];
    else pos4 = [0.0, 0, 2.0, -1.8];
    stepGameplay(0, 0, 0);
  } else if (currentSection === 13) {
    if (!sim13ThreeBody.ringContacted) {
      const talk = sim13ThreeBody.contactTombRing();
      audio.hologramOpen();
      setDialogue('四维遗迹 · 魔戒 (Tomb Ring)', talk.dialogue);
      showToast('⚡ 已接入四维遗迹【魔戒】通讯！再按 R 展开战舰四维全透视视图！');
    } else if (!sim13ThreeBody.hullUnfolded4D) {
      sim13ThreeBody.toggleHullUnfold4D(true);
      audio.airlockUnlock();
      showToast('⚡ 战舰三层装甲已沿 W 维全透视展开！走近战舰并切换 W=−1.8 / 0.0 / +1.8（或再按 R）直接取核！');
    } else {
      const nextIdx = sim13ThreeBody.coresExtracted.findIndex(v => !v);
      if (nextIdx >= 0) {
        pos4 = [0.85, 0, 0.85, sim13ThreeBody.coreLayersW[nextIdx]];
        stepGameplay(0, 0, 0);
      }
    }
  } else if (currentSection === 14) {
    if (!sim14Fairy.umbrellaSpinning) {
      sim14Fairy.toggleUmbrella(true);
      audio.airlockUnlock();
      showToast('⚡ 【四维克利福德旋转伞】高速展开！二维降维场已被护盾弹开，快按 Q/E 去拔除 3 枚雪浪画纸定画针！');
    } else {
      const nextPin = sim14Fairy.pinsUnlocked.findIndex(v => !v);
      if (nextPin >= 0) {
        const spec = fpS14Fairy.pins[nextPin];
        pos4 = [spec.pos[0], 0, spec.pos[2], spec.wTarget];
        stepGameplay(0, 0, 0);
      }
    }
  } else if (currentSection === 15) {
    pos4 = [0, 0, -0.8, 0];
    if (!s15ShardsRemoved.has(0)) pos4[3] = -1.0;
    else if (!s15ShardsRemoved.has(1)) pos4[3] = 0.0;
    else pos4[3] = 1.0;
    stepGameplay(0, 0, 0);
  } else if (currentSection === 16) {
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

  $('secCode').textContent = `${meta.code} · ${meta.act}`;
  $('secTitle').textContent = meta.title;
  if (themeQuoteEl) themeQuoteEl.textContent = meta.themeQuote || '';
  $('objective').textContent = meta.goal;

  if (currentSection === 6) {
    $('wPageReadout').textContent = `切片 W = ${sim6Sokoban.player[3]} / 4`;
    $('wPageTag').textContent = `4×4×2×4 矩阵 · 视图基底 ${sim6Sokoban.basisMode} · 步数 ${sim6Sokoban.moves}`;
  } else {
    $('wPageReadout').textContent = `W = ${w >= 0 ? '+' : ''}${w.toFixed(1)} 舱层`;
    let tagText = '青苍基准舱 · 立体厚度 3.4m';
    if (w > 0.65) tagText = '流金上层舱 · 立体厚度 3.4m';
    else if (w < -0.65) tagText = '星轨深层舱 · 立体厚度 3.4m';
    $('wPageTag').textContent = tagText;
  }

  // Update Floating 4D Sokoban Coordinate Badge in Section 06
  if (currentSection === 6) {
    const pStr = formatCoord4D(sim6Sokoban.player);
    const bStr = formatCoord4D(sim6Sokoban.boxes[0]);
    const tStr = formatCoord4D(sim6Sokoban.targets[0]);
    const deadlocked = sim6Sokoban.is3DDeadlocked(0);
    sokobanBadgeEl.innerHTML = `
      <span class="sk-pill player">玩家 ${pStr}</span>
      <span class="sk-pill box">翠绿箱 ${bStr}</span>
      <span class="sk-pill target">目标 ${tStr}</span>
      <span class="sk-pill basis">基底：${sim6Sokoban.basisMode}（按 X 切换）</span>
      ${deadlocked ? '<span class="sk-pill deadlock">⚠ W=3 三维墙角死锁 → 切至 W=2 按 E 跨维推箱!</span>' : ''}
    `;
    sokobanBadgeEl.classList.remove('hidden');
  } else {
    sokobanBadgeEl.classList.add('hidden');
  }

  // Section Checklist (1..16)
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
      { done: sim3Monument.isBridgeAligned || sim3Monument.spireStairRaised, text: '按 R 在 XW 平面旋转四维天桥 90° 接通断渊' },
      { done: sim3Monument.cyanSwitchPressed, text: '踩下中央【青色踏板】触发林夏共鸣升起圣殿光梯' },
      { done: sim3Monument.complete, text: '按 E 升入 W=+1.8 纪念碑尖塔与林夏汇合' }
    ];
  } else if (currentSection === 4) {
    checks = [
      { done: Math.abs(pos4[3]) > 0.9 || sim4Vault.enteredVault, text: '升入 W = +1.8 越过三维防爆玻璃墙' },
      { done: sim4Vault.carryingCore || sim4Vault.coreDelivered, text: '在林夏正上方按 Q 空降入室拿起核心' },
      { done: sim4Vault.coreDelivered, text: '带核心翻出牢笼放上右侧接收台' }
    ];
  } else if (currentSection === 5) {
    checks = [
      { done: pos4[3] < -1.2 || s5PassedWall, text: '按 Q 潜入 W = −1.8 深蓝底层' },
      { done: s5PassedWall, text: '从底层右侧唯一缺口钻过赤红四维超墙' },
      { done: completedSections.has(5), text: '升回 W = 0 抵达北侧终端' }
    ];
  } else if (currentSection === 6) {
    checks = [
      { done: sim6Sokoban.crossWPushes > 0 || sim6Sokoban.boxes[0][3] === 4, text: '用 Q/C 切至 W=2 并按 E 把翠绿箱跨第四维推入 W=4' },
      { done: sim6Sokoban.basisSwaps > 0 || sim6Sokoban.complete, text: '（推荐）按 X 切换 XYZ ⇄ XYW 切片视角观察跨维路径' },
      { done: sim6Sokoban.complete, text: '沿 W=4 推箱踏上 (3,4,1,4) 坡道归位至目标 (3,4,2,4)' }
    ];
  } else if (currentSection === 7) {
    checks = [
      { done: Math.abs(sim7Rings.bw) > 0.5 || sim7Rings.unlinked, text: '按 E 把金色巨环升入 W = +1.4 舱层' },
      { done: sim7Rings.bx >= RING_SPEC.unlinkedBX || sim7Rings.unlinked, text: '推着金环毫无碰撞地穿过青环位置' },
      { done: sim7Rings.unlinked, text: '按 Q 放回 W = 0 完成无损解链' }
    ];
  } else if (currentSection === 8) {
    checks = [
      { done: s8SwappedMirror, text: '在四维魔镜前按 R 与镜中自己互换（圣钥变左旋）' },
      { done: s8CombinedKey, text: '走向大门基座与林夏的右旋半钥完美拼合' }
    ];
  } else if (currentSection === 9) {
    checks = [
      { done: s9Crystals.has('south_low'), text: '在 W=−1.8 缩球层绕过星核采集蓝晶 ①' },
      { done: s9Crystals.has('equator_rim'), text: '在 W=0.0 最大赤道外缘采集青晶 ②' },
      { done: s9Crystals.has('center_high'), text: '在 W=+2.2 巨球消失层中心采集金晶 ③' }
    ];
  } else if (currentSection === 10) {
    checks = [
      { done: s10Forms.has('tetrahedron'), text: '在 W=−1.8 激活【正四面体】尖顶切面' },
      { done: s10Forms.has('octahedron'), text: '在 W=0.0 激活【正八面体】钻石圣殿切面' },
      { done: s10Forms.has('cube'), text: '在 W=+1.8 激活【正立方体】上翼切面' }
    ];
  } else if (currentSection === 11) {
    checks = [
      { done: hyperTorusSliceState(pos4[3]).merged || s11CrossedBridge, text: '升入 W=+1.8 让两座孤岛融合成环形天桥' },
      { done: s11CrossedBridge, text: '沿融合天桥走到右侧浮岛上方' },
      { done: s11MetLin, text: '降回 W=0 右岛与同伴林夏汇合' }
    ];
  } else if (currentSection === 12) {
    checks = [
      { done: s12Cores.has(0), text: '在 W=0 捕获双旋星轮内环核心 ①' },
      { done: s12Cores.has(1), text: '在 W=+1.8 捕获翻出第四维的外环核心 ②' },
      { done: s12Cores.has(2), text: '在 W=−1.8 捕获深层星轮核心 ③' }
    ];
  } else if (currentSection === 13) {
    const extCount = sim13ThreeBody.coresExtracted.filter(Boolean).length;
    checks = [
      { done: sim13ThreeBody.ringContacted, text: '走近左侧青铜巨环【魔戒】聆听四维墓地遗言' },
      { done: sim13ThreeBody.hullUnfolded4D, text: '按 R 沿第四维全透视展开三层封闭战舰装甲' },
      { done: sim13ThreeBody.complete, text: `穿梭 W=−1.8 / 0.0 / +1.8 无损取出三枚量子核心 (${extCount}/3)` }
    ];
  } else if (currentSection === 14) {
    const pinCount = sim14Fairy.pinsUnlocked.filter(Boolean).length;
    checks = [
      { done: sim14Fairy.umbrellaSpinning, text: '按 R 撑开【四维克利福德旋转伞】抵御降维打击' },
      { done: pinCount === 3, text: `沿曲率航迹在三层空间拔除雪浪画纸定画针 (${pinCount}/3)` },
      { done: sim14Fairy.linUnfoldedFromCanvas, text: '见证林夏从二维雪浪画纸重新折回三维立体形态！' }
    ];
  } else if (currentSection === 15) {
    checks = [
      { done: s15ShardsRemoved.has(0), text: '弯曲至 W=−1.0 取出【心脏】四维碎屑 ①' },
      { done: s15ShardsRemoved.has(1), text: '在 W=0.0 透视取出【左肺】四维碎屑 ②' },
      { done: s15ShardsRemoved.has(2), text: '弯曲至 W=+1.0 取出【脊柱】四维碎屑 ③' }
    ];
  } else if (currentSection === 16) {
    checks = [
      { done: s16Awakened, text: '与林夏并肩登上主控台点亮四维方舟之心' }
    ];
  }

  $('secChecklist').innerHTML = checks.map(c =>
    `<div class="ch2-check-item ${c.done ? 'done' : ''}"><span>${c.done ? '✓' : '○'}</span><span>${c.text}</span></div>`
  ).join('');

  const nextBtn = $('nextSecHudBtn');
  const isDone = completedSections.has(currentSection);
  nextBtn.classList.toggle('hidden', !isDone);
  nextBtn.textContent = currentSection < TOTAL_SECTIONS
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
  $('godWValue').textContent = currentSection === 6
    ? `${sim6Sokoban.basisMode} · 玩家${formatCoord4D(sim6Sokoban.player)}`
    : `W = ${w >= 0 ? '+' : ''}${w.toFixed(1)}`;
  $('godWSlider').value = String(Math.max(-2.4, Math.min(2.4, w)));
  $('godLiveStatus').textContent = meta.godHint;

  document.querySelectorAll('[data-jump-w]').forEach(btn => {
    const target = Number(btn.getAttribute('data-jump-w'));
    btn.classList.toggle('active', Math.abs(w - target) < 0.45);
  });

  const ext13 = sim13ThreeBody.coresExtracted.filter(Boolean).length;
  const pin14 = sim14Fairy.pinsUnlocked.filter(Boolean).length;

  const crushLabels = {
    1: '⚡ 高维跃迁：直接升入 W=+1.8 与林夏汇合',
    2: '⚡ 高维连跃：一键穿梭三层断桥抵达对岸',
    3: !sim3Monument.isBridgeAligned
      ? '⚡ 旋转纪念碑四维天桥 (XW 90°) (R)'
      : !sim3Monument.cyanSwitchPressed
        ? '⚡ 走上中央踩下青色踏板激活双人光梯'
        : '⚡ 沿光梯升入 W=+1.8 纪念碑尖塔汇合',
    4: sim4Vault.carryingCore ? '⚡ 高维撤离：携核心翻出密室送达接收台' : '⚡ 高维空降：越过三维玻璃墙空投进密室中心',
    5: '⚡ 高维潜行：从 W=−1.8 底层缺口钻过超墙',
    6: sim6Sokoban.complete ? '✓ 4×4×2×4 四维推箱已归位 (3,4,2,4)' : '⚡ 高维推箱解算：自动执行下一步 (R)',
    7: '⚡ 高维解链：把金环升入上层无损解开死结',
    8: s8SwappedMirror ? '✓ 已与镜中自己互换（圣钥已变左旋）' : '⚡ 四维镜像互换：与镜中自己互换翻转圣钥手性 (R)',
    9: `⚡ 高维采能：跃迁至下一枚超球晶簇层 (${s9Crystals.size}/3)`,
    10: `⚡ 高维相变：切换超方体切面形态 (${s10Forms.size}/3)`,
    11: s11CrossedBridge ? '⚡ 降回 W=0 右侧浮岛与林夏汇合' : '⚡ 升入 W=+1.8 让两座孤岛融合成环形天桥',
    12: `⚡ 捕捉双旋星轮高维曲率核心 (${s12Cores.size}/3)`,
    13: !sim13ThreeBody.ringContacted
      ? '⚡ 接入四维遗迹【魔戒】通讯 (R)'
      : !sim13ThreeBody.hullUnfolded4D
        ? '⚡ 四维全透视展开三层封闭战舰 (R)'
        : `⚡ 从第四维提取下一枚战舰量子核心 (${ext13}/3)`,
    14: !sim14Fairy.umbrellaSpinning
      ? '⚡ 撑开【四维克利福德旋转伞】防降维 (R)'
      : `⚡ 拔除下一枚雪浪画纸定画针救出林夏 (${pin14}/3)`,
    15: `⚡ 高维无创弯曲：摘除林夏体内下一处碎屑 (${s15ShardsRemoved.size}/3)`,
    16: '⚡ 觉醒四维方舟之心 · 折叠八胞空间站 (R)'
  };

  const extra = $('godExtraControls');
  if (currentSection === 6) {
    extra.innerHTML = `
      <button id="crushActionBtn">${crushLabels[6]}</button>
      <div class="ch2-hc-subbtns">
        <button id="sokoBtnWm">Q/C · 退向 W−1</button>
        <button id="sokoBtnWp">E · 推向 W+1</button>
        <button id="sokoBtnSwap">X · 切 ${sim6Sokoban.basisMode === 'XYZ' ? 'XYW' : 'XYZ'} 基底</button>
        <button id="sokoBtnUndo">Z · 撤销一步</button>
      </div>
    `;
    $('crushActionBtn').onclick = executeHighDimCrush;
    $('sokoBtnWm').onclick = () => { audio.unlock(); sokobanMove(0, 0, 0, -1); };
    $('sokoBtnWp').onclick = () => { audio.unlock(); sokobanMove(0, 0, 0, 1); };
    $('sokoBtnSwap').onclick = () => {
      audio.unlock();
      const mode = sim6Sokoban.toggleBasisMode();
      audio.hologramOpen();
      showToast(`已切换四维推箱视图基底为 ${mode}（${mode === 'XYZ' ? 'W=1..4 四张三维棋盘' : 'Z=1..2 两张跨 W 立体棋盘'}）！`);
      updateHUD();
      refreshHighDimConsole();
    };
    $('sokoBtnUndo').onclick = () => {
      audio.unlock();
      if (sim6Sokoban.undo()) {
        pos4[3] = (sim6Sokoban.player[3] - 2.5) * 1.15;
        showToast('已撤销一步四维推箱操作。');
        updateHUD();
        refreshHighDimConsole();
      }
    };
  } else {
    extra.innerHTML = `<button id="crushActionBtn">${crushLabels[currentSection]}</button>`;
    $('crushActionBtn').onclick = executeHighDimCrush;
  }
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
  if (currentSection < TOTAL_SECTIONS) selectSection(currentSection + 1);
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
  godCamera.alpha = currentSection === 6 ? -Math.PI * 0.5 : -Math.PI * 0.62;
  godCamera.beta = currentSection === 6 ? 0.92 : 1.12;
  godCamera.radius = 12.4;
  godCamera.target.set(0, 0.3, 0);
};
document.querySelectorAll('[data-jump-w]').forEach(btn => {
  btn.onclick = () => {
    audio.unlock();
    const targetW = Number(btn.getAttribute('data-jump-w'));
    if (currentSection === 6) {
      const targetSlice = targetW < -0.5 ? 2 : targetW > 0.5 ? 4 : 3;
      const diff = targetSlice - sim6Sokoban.player[3];
      if (diff !== 0) sokobanMove(0, 0, 0, Math.sign(diff));
    } else {
      stepGameplay(0, 0, targetW - pos4[3]);
    }
    updateHUD();
    refreshHighDimConsole();
  };
});
$('godWSlider').oninput = e => {
  audio.unlock();
  const targetW = Number(e.target.value);
  if (currentSection === 6) {
    const targetSlice = Math.max(1, Math.min(4, Math.round(((targetW + 2.4) / 4.8) * 3) + 1));
    const diff = targetSlice - sim6Sokoban.player[3];
    if (diff !== 0) sokobanMove(0, 0, 0, Math.sign(diff));
  } else {
    stepGameplay(0, 0, targetW - pos4[3]);
  }
  updateHUD();
  refreshHighDimConsole();
};
$('godMoveFwd').onclick = () => {
  audio.unlock();
  if (currentSection === 6) { sokobanMove(0, 1, 0, 0); return; }
  stepGameplay(0, 0.55, 0);
  gait.step(0.55, 0.16, 2.8, false, false);
  updateHUD();
  refreshHighDimConsole();
};
$('godMoveBack').onclick = () => {
  audio.unlock();
  if (currentSection === 6) { sokobanMove(0, -1, 0, 0); return; }
  stepGameplay(0, -0.55, 0);
  gait.step(0.55, 0.16, 2.8, false, false);
  updateHUD();
  refreshHighDimConsole();
};
$('godMoveLeft').onclick = () => {
  audio.unlock();
  if (currentSection === 6) { sokobanMove(-1, 0, 0, 0); return; }
  stepGameplay(-0.55, 0, 0);
  gait.step(0.55, 0.16, 2.8, false, false);
  updateHUD();
  refreshHighDimConsole();
};
$('godMoveRight').onclick = () => {
  audio.unlock();
  if (currentSection === 6) { sokobanMove(1, 0, 0, 0); return; }
  stepGameplay(0.55, 0, 0);
  gait.step(0.55, 0.16, 2.8, false, false);
  updateHUD();
  refreshHighDimConsole();
};
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
  if (currentSection === 6) {
    sokobanMove(0, 0, 0, -Math.sign(e.deltaY));
    return;
  }
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

  // Section 06 (4D Sokoban) dedicated crisp discrete grid keys (works even without pointer lock!)
  if (currentSection === 6 && !ended && !e.repeat) {
    if (e.code === 'KeyX') {
      e.preventDefault();
      audio.unlock();
      const mode = sim6Sokoban.toggleBasisMode();
      audio.hologramOpen();
      showToast(`已切换 4D 推箱视图基底 → ${mode}（${mode === 'XYZ' ? 'W=1..4 四张三维棋盘' : 'Z=1..2 两张跨 W 棋盘'}）！`);
      updateHUD();
      refreshHighDimConsole();
      return;
    }
    if (e.code === 'KeyZ') {
      e.preventDefault();
      audio.unlock();
      if (sim6Sokoban.undo()) {
        pos4[3] = (sim6Sokoban.player[3] - 2.5) * 1.15;
        showToast('已撤销一步 4D 推箱。');
        updateHUD();
        refreshHighDimConsole();
      }
      return;
    }
    if (locked || keyboardCorridor) {
      if (e.code === 'KeyW' || e.code === 'ArrowUp') { e.preventDefault(); audio.unlock(); sokobanMove(0, 1, 0, 0); return; }
      if (e.code === 'KeyS' || e.code === 'ArrowDown') { e.preventDefault(); audio.unlock(); sokobanMove(0, -1, 0, 0); return; }
      if (e.code === 'KeyD' || e.code === 'ArrowRight') { e.preventDefault(); audio.unlock(); sokobanMove(1, 0, 0, 0); return; }
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') { e.preventDefault(); audio.unlock(); sokobanMove(-1, 0, 0, 0); return; }
      if (e.code === 'KeyE') { e.preventDefault(); audio.unlock(); sokobanMove(0, 0, 0, 1); return; }
      if (e.code === 'KeyQ' || e.code === 'KeyC') { e.preventDefault(); audio.unlock(); sokobanMove(0, 0, 0, -1); return; }
      if (e.code === 'Space' || e.code === 'KeyU') { e.preventDefault(); audio.unlock(); sokobanMove(0, 0, 1, 0); return; }
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyJ') { e.preventDefault(); audio.unlock(); sokobanMove(0, 0, -1, 0); return; }
    }
  }

  if (!locked && !keyboardCorridor) return;
  if (e.code === 'Space' && !e.repeat && !keys.has('Space')) jumpQueued = true;
  if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'KeyC', 'Space', 'ShiftLeft', 'ShiftRight'].includes(e.code)) {
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

    if (currentSection !== 6) {
      const strafe = Number(keys.has('KeyD')) - Number(keys.has('KeyA'));
      const forward = Number(keys.has('KeyW')) - Number(keys.has('KeyS'));
      const shiftW = Number(keys.has('KeyE')) - Number(keys.has('KeyQ') || keys.has('KeyC'));
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
  }

  const px = pos4[0], pz = pos4[2], pw = pos4[3];
  const footY = ground.footLift;
  const eyeY = (currentSection === 6 ? 2.45 : 1.65) + footY;
  const wL = waveVal(gesture.left);
  const wR = waveVal(gesture.right);
  const cWL = waveVal(compGesture.left);
  const cWR = waveVal(compGesture.right);

  // Update First-Person Camera & Local Voxel Astronaut Body
  look.applyCamera(B, fpCamera);
  fpCamera.position.set(px, eyeY, pz);
  fpPlayerVoxel.root.setEnabled(currentSection !== 6);
  fpPlayerVoxel.pose({
    position: [px, eyeY, pz],
    yaw: look.yaw,
    pitch: look.pitch,
    leftLegAngle: locomotion.leftLeg,
    rightLegAngle: locomotion.rightLeg,
    waveLeft: wL,
    waveRight: wR,
    holdRight: currentSection === 8 && !s8CombinedKey ? 1 : 0,
    mirrorX: currentSection === 8 && s8SwappedMirror
  });
  fpS8Mirror.playerKey.root.setEnabled(currentSection === 8 && !s8CombinedKey);
  fpS8Mirror.playerKey.root.scaling.x = s8SwappedMirror ? -1 : 1;

  // Volumetric 3D Space Chambers in First-Person (hidden in Sec 06 4D Sokoban gallery so all 4 boards shine clearly)
  const showStdChambers = currentSection !== 6;
  fpChamberW0.root.setEnabled(showStdChambers);
  fpChamberWP.root.setEnabled(showStdChambers);
  fpChamberWM.root.setEnabled(showStdChambers);

  const c0 = Math.max(0.16, 1 - Math.abs(pw - 0.0) / 1.4);
  const cP = Math.max(0.16, 1 - Math.abs(pw - 1.8) / 1.4);
  const cM = Math.max(0.16, 1 - Math.abs(pw + 1.8) / 1.4);
  if (showStdChambers) {
    fpChamberW0.setLayerOpacity(c0);
    fpChamberWP.setLayerOpacity(cP);
    fpChamberWM.setLayerOpacity(cM);
    fpChamberW0.root.position.y = (0.0 - pw) * 1.35;
    fpChamberWP.root.position.y = (1.8 - pw) * 1.35;
    fpChamberWM.root.position.y = (-1.8 - pw) * 1.35;
  }

  // Companion Lin Xia (07) Presence Rule: NEVER show a meaningless figurine when hasCompanion is false!
  const meta = CHAPTER2_SECTIONS[currentSection - 1];
  fpLinXia.root.setEnabled(meta.hasCompanion && currentSection !== 15);
  // Restore normal 3D thickness whenever leaving Section 14 (2D Xue-Lang canvas flattening!)
  if (currentSection !== 14) {
    fpLinXia.root.scaling.set(1, 1, 1);
  }

  let promptHtml = `按 <kbd>Q</kbd> / <kbd>E</kbd> 穿梭立体空间舱 · 右侧高维操作台实时俯瞰`;

  if (currentSection === 1) {
    const linY = (1.8 - pw) * 1.35;
    fpLinXia.setAlpha(Math.max(0.28, cP));
    fpLinXia.pose({
      position: [-1.2, linY, 0.8],
      yaw: Math.atan2(px + 1.2, pz - 0.8),
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
    // Monument Valley 4D Rotating Bridge & Dual-Switch Sanctuary
    const baseY0 = (0.0 - pw) * 1.35;
    const baseYP = (1.8 - pw) * 1.35;
    fpS3Monument.southTerrace.position.y = baseY0 - 0.14;
    fpS3Monument.midTerrace.position.y = baseY0 - 0.14;
    fpS3Monument.cyanSwitch.position.y = baseY0 + 0.08;
    fpS3Monument.turntableRoot.position.y = baseY0;
    fpS3Monument.crankWheel.position.y = baseY0 + 0.95;
    fpS3Monument.crankWheel.rotation.x = (sim3Monument.bridgeAngleDeg * Math.PI) / 180;
    fpS3Monument.spireRoot.position.y = baseYP;

    // Smooth visual rotation of the 4D Penrose bridge: 0° = sticking across W (sideways/ghost), 90° = solid aligned!
    const targetRotY = sim3Monument.isBridgeAligned ? 0 : Math.PI / 2;
    fpS3Monument.turntableRoot.rotation.y += (targetRotY - fpS3Monument.turntableRoot.rotation.y) * Math.min(1, dt * 8);
    fpS3Monument.goldMat.alpha = sim3Monument.isBridgeAligned ? 1.0 : 0.42;
    fpS3Monument.spireStair.setEnabled(sim3Monument.spireStairRaised);
    fpS3Monument.spireStair.position.y = baseY0 + 1.15;

    fpLinXia.setAlpha(Math.max(0.32, cP));
    fpLinXia.pose({
      position: [0.55, baseYP, 1.95],
      yaw: Math.atan2(px - 0.55, pz - 1.95),
      waveLeft: sim3Monument.spireStairRaised ? 0.85 : 0.45 + Math.sin(time * 4) * 0.25,
      breatheTime: time
    });
    promptHtml = !sim3Monument.isBridgeAligned
      ? `按 <kbd>R</kbd> 旋转【纪念碑谷四维转盘】90°（XW 平面）接通眼前断渊`
      : !sim3Monument.cyanSwitchPressed
        ? `天桥已接通！向前走踩下中央【青色踏板】触发林夏共鸣`
        : `圣殿光梯已升起！按 <kbd>E</kbd> 升入 W = +1.8 与林夏在尖塔汇合`;
  } else if (currentSection === 4) {
    const inW0 = Math.abs(pw) <= VAULT_SPEC.wallHalfW + 0.25;
    fpS4Prison.box.material.alpha = inW0 ? 0.42 : 0.07;
    fpS4Prison.frame.material.alpha = inW0 ? 0.78 : 0.18;
    fpLinXia.setAlpha(Math.max(0.28, c0));
    fpLinXia.pose({
      position: [-0.4, (0.0 - pw) * 1.35, 0.3],
      yaw: Math.atan2(px + 0.4, pz - 0.3),
      waveLeft: sim4Vault.coreDelivered ? 0.8 : 0.45 + Math.sin(time * 5) * 0.3,
      breatheTime: time
    });
    if (sim4Vault.carryingCore) {
      fpS4Prison.core.position.set(px + Math.sin(look.yaw) * 0.6, eyeY - 0.3, pz + Math.cos(look.yaw) * 0.6);
    } else {
      fpS4Prison.core.position.set(sim4Vault.corePos[0], (0.0 - pw) * 1.35 + 1.0 + Math.sin(time * 3) * 0.08, sim4Vault.corePos[2]);
    }
    fpS4Prison.core.rotation.y = time * 1.8;
    promptHtml = !sim4Vault.carryingCore && !sim4Vault.coreDelivered
      ? (Math.abs(pw) < 0.85
          ? `玻璃牢笼在 W=0 六面封死 · 按 <kbd>E</kbd> 升入 W=+1.8（或点右侧 <kbd>⚡ 高维空降</kbd>）`
          : `走到林夏头顶正中央，按 <kbd>Q</kbd> 空降进玻璃牢笼拿起核心`)
      : `已拿到核心！按 <kbd>E</kbd> 翻出牢笼送到右侧接收台 (X = +2.5)`;
  } else if (currentSection === 5) {
    const inBottom = pw < -1.25;
    fpS5Wall.rightSolid.setEnabled(!inBottom);
    fpS5Wall.goalBeacon.rotation.z = time * 0.9;
    promptHtml = !s5PassedWall
      ? (inBottom ? `右侧缺口已打开！从右侧钻过赤红超墙` : `赤红超墙封死了高维 · 按住 <kbd>Q</kbd> 潜入 W = −1.8 深蓝底层寻找右侧缺口`)
      : `已穿过超墙！按 <kbd>E</kbd> 升回 W = 0.0 走向北侧光环`;
  } else if (currentSection === 6) {
    fpS6Sokoban.sync(sim6Sokoban, time);
    promptHtml = sim6Sokoban.complete
      ? `4×4×2×4 四维推箱已归位至 (3,4,2,4)！点击左侧按钮进入下一小节`
      : sim6Sokoban.is3DDeadlocked(0)
        ? `⚠ W=3 墙角死锁！按 <kbd>Q</kbd>/<kbd>C</kbd> 切至 W=2 绕后，按 <kbd>E</kbd> 跨维推箱 · 按 <kbd>X</kbd> 切 XYZ⇄XYW`
        : `<kbd>WASD</kbd> 推箱 · <kbd>E</kbd>/<kbd>Q</kbd>(<kbd>C</kbd>) 跨第四维 W · <kbd>X</kbd> 切换 XYZ⇄XYW · <kbd>Z</kbd> 撤销 · <kbd>R</kbd> 智能提示`;
  } else if (currentSection === 7) {
    const S = fpS7Rings.SCALE;
    fpS7Rings.ringB.position.x = sim7Rings.bx * S;
    fpS7Rings.ringB.position.y = 1.5 + sim7Rings.bw * 0.45;
    fpS7Rings.ringA.material.alpha = Math.max(0.2, 1 - Math.abs(sim7Rings.bw) * 0.55);
    promptHtml = Math.abs(sim7Rings.bw) < 0.45
      ? `两只实心巨环在 W=0 互扣 · 先按 <kbd>E</kbd> 把金色巨环升入 W = +1.4 舱层`
      : sim7Rings.bx < RING_SPEC.unlinkedBX
        ? `按 <kbd>D</kbd> 推着金色巨环向右穿过青环位置`
        : `已越过青环！按 <kbd>Q</kbd> 放回 W = 0.0 完成无损解链`;
  } else if (currentSection === 8) {
    fpS8Mirror.mirrorRim.rotation.z = time * 0.5;
    fpS8Mirror.mirrorTwin.pose({
      position: [-px * 0.7, 0, 0.35],
      yaw: Math.PI - look.yaw,
      leftLegAngle: locomotion.rightLeg,
      rightLegAngle: locomotion.leftLeg,
      waveLeft: wR,
      waveRight: wL,
      holdRight: 1,
      mirrorX: !s8SwappedMirror,
      breatheTime: time
    });
    fpS8Mirror.mirrorKey.root.scaling.x = s8SwappedMirror ? 1 : -1;
    fpLinXia.setAlpha(1);
    fpLinXia.pose({
      position: [0.85, 0, 2.25],
      yaw: Math.atan2(px - 0.85, pz - 2.25),
      waveLeft: s8CombinedKey ? 0.8 : 0.35,
      breatheTime: time
    });
    promptHtml = !s8SwappedMirror
      ? `走近中央四维魔镜，按 <kbd>R</kbd> 与镜中的自己互换（将手中圣钥翻转为左旋镜像）`
      : `手中的圣钥已翻转为【左旋镜像】！走向前方基座与林夏的右旋半钥拼合`;
  } else if (currentSection === 9) {
    const sl = hypersphereSlice(pw);
    fpS9Sphere.sphere.setEnabled(sl.exists);
    if (sl.exists) {
      fpS9Sphere.sphere.scaling.setAll(sl.radius);
      fpS9Sphere.sphere.rotation.y = time * 0.45;
    }
    for (const c of fpS9Sphere.crystals) {
      c.mesh.setEnabled(!s9Crystals.has(c.id));
      c.mesh.rotation.y = time * 1.8;
      c.mesh.material.alpha = Math.max(0.22, 1 - Math.abs(pw - c.wTarget) * 0.5);
    }
    promptHtml = `四维超球切面半径 ${sl.radius.toFixed(1)}m · 穿梭 W=−1.8 / 0.0 / +2.2 采集三枚晶簇 (${s9Crystals.size}/3)`;
  } else if (currentSection === 10) {
    const f = hyperPolytopeSliceForm(pw);
    fpS10Temple.tetra.setEnabled(f.form === 'tetrahedron');
    fpS10Temple.octa.setEnabled(f.form === 'octahedron');
    fpS10Temple.cube.setEnabled(f.form === 'cube');
    for (const m of [fpS10Temple.tetra, fpS10Temple.octa, fpS10Temple.cube]) {
      m.scaling.setAll(f.scale);
      m.rotation.y = time * 0.5;
      m.rotation.x = Math.sin(time * 0.4) * 0.25;
    }
    promptHtml = `当前切面形态：【${f.name}】 · 按 <kbd>Q</kbd> / <kbd>E</kbd> 穿梭三层激活三种多面体 (${s10Forms.size}/3)`;
  } else if (currentSection === 11) {
    const st = hyperTorusSliceState(pw);
    fpS11Torus.islandL.setEnabled(!st.merged);
    fpS11Torus.islandR.setEnabled(!st.merged);
    fpS11Torus.mergedBridge.setEnabled(st.merged);
    if (!st.merged) {
      fpS11Torus.islandL.position.set(-st.islandOffset, -0.05, 0.2);
      fpS11Torus.islandR.position.set(st.islandOffset, -0.05, 0.2);
    }
    fpLinXia.setAlpha(Math.max(0.3, c0));
    fpLinXia.pose({
      position: [1.65, (0.0 - pw) * 1.35, 0.2],
      yaw: Math.atan2(px - 1.65, pz - 0.2),
      waveLeft: 0.6 + Math.sin(time * 4) * 0.3,
      breatheTime: time
    });
    promptHtml = !st.merged
      ? (s11CrossedBridge ? `已抵达右岛！走近林夏完成汇合` : `两座浮岛在 W=0 被深渊隔开 · 按 <kbd>E</kbd> 升入 W=+1.8 让超环面融合成桥`)
      : `两岛已融合成环形天桥！走到右侧 (X > +1.2) 再按 <kbd>Q</kbd> 降回 W=0 与林夏汇合`;
  } else if (currentSection === 12) {
    for (const n of fpS12Rotor.nodes) {
      const r4 = cliffordDoubleRotate4D(n.v4, time * 0.75);
      const d = 3.2 / (3.2 - r4[3]);
      n.mesh.position.set(r4[0] * d * 1.45, 1.55 + r4[1] * d * 0.95, 0.4 + r4[2] * d * 1.45);
      n.mesh.rotation.y = time * 1.4;
    }
    for (const c of fpS12Rotor.coreTargets) {
      c.mesh.setEnabled(!s12Cores.has(c.id));
      c.mesh.material.alpha = Math.max(0.22, 1 - Math.abs(pw - c.wTarget) * 0.55);
    }
    promptHtml = `四维双旋星轮由内向外翻滚中 · 穿梭 W=0 / +1.8 / −1.8 捕获三枚曲率核心 (${s12Cores.size}/3)`;
  } else if (currentSection === 13) {
    // Three-Body 4D Fragment Bubble + Tomb Ring + 3-Hull Unfolded Battleship
    sim13ThreeBody.stepBubbleDrain(dt * 0.15);
    const bubScale = sim13ThreeBody.bubbleRadius / 4.2;
    fpS13Fragment.bubble.scaling.setAll(bubScale);
    fpS13Fragment.bubble.rotation.y = time * 0.12;
    fpS13Fragment.tombRing.rotation.z = time * 0.35;
    fpS13Fragment.tombEye.rotation.y = -time * 1.4;

    const unfolded = sim13ThreeBody.hullUnfolded4D;
    fpS13Fragment.outerHullMat.wireframe = unfolded;
    fpS13Fragment.outerHullMat.alpha = unfolded ? 0.36 : 0.92;
    fpS13Fragment.midHullMat.wireframe = unfolded;
    fpS13Fragment.midHullMat.alpha = unfolded ? 0.40 : 0.85;
    fpS13Fragment.innerHullMat.alpha = unfolded ? 0.55 : 0.88;

    const y0 = (0.0 - pw) * 1.35;
    const yM = (-1.8 - pw) * 1.35;
    const yP = (1.8 - pw) * 1.35;
    fpS13Fragment.outerHull.position.y = unfolded ? yM + 1.15 : y0 + 1.25;
    fpS13Fragment.midHull.position.y = y0 + 1.25;
    fpS13Fragment.innerHull.position.y = unfolded ? yP + 1.15 : y0 + 1.25;

    for (const c of fpS13Fragment.cores) {
      const done = sim13ThreeBody.coresExtracted[c.idx];
      c.mesh.setEnabled(!done);
      c.mesh.position.set(c.pos[0], (unfolded ? (c.wTarget - pw) * 1.35 : y0) + 1.25, c.pos[2]);
      c.mesh.rotation.y = time * 2.1;
      c.mesh.material.alpha = unfolded ? Math.max(0.25, 1 - Math.abs(pw - c.wTarget) * 0.45) : 0.4;
    }

    fpLinXia.setAlpha(Math.max(0.32, c0));
    fpLinXia.pose({
      position: [-1.15, y0, -1.25],
      yaw: Math.atan2(px + 1.15, pz + 1.25),
      waveLeft: 0.4 + Math.sin(time * 3.5) * 0.25,
      breatheTime: time
    });

    const cnt13 = sim13ThreeBody.coresExtracted.filter(Boolean).length;
    promptHtml = !sim13ThreeBody.ringContacted
      ? `走近左侧发光青铜巨环【魔戒】聆听四维墓地遗言 · 或按 <kbd>R</kbd> 通讯`
      : !unfolded
        ? `战舰三层装甲封死 · 按 <kbd>R</kbd> 开启【四维全透视展开】，直视战舰所有内舱！`
        : `三层战舰已沿 W 维摊开！走近战舰并穿梭 W=−1.8 / 0.0 / +1.8 提取量子核心 (${cnt13}/3)`;
  } else if (currentSection === 14) {
    // Yun Tianming's Three Fairy Tales: 2D Xue-Lang Canvas + 4D Clifford Umbrella + Deep-Water Beacon
    const y0 = (0.0 - pw) * 1.35;
    fpS14Fairy.canvasMesh.position.y = y0 + 1.55;
    fpS14Fairy.wakeRibbon.position.y = y0;

    // Deep-Water Prince Perspective-Invariant Law: scale linearly with 3D camera distance!
    const dwPos = fpS14Fairy.deepWaterBeacon.position;
    const dist3D = Math.max(0.8, Math.hypot(px - dwPos.x, eyeY - dwPos.y, pz - dwPos.z));
    const apparentFactor = sim14Fairy.deepWaterConstantApparentSize(dist3D, Math.abs(pw));
    fpS14Fairy.deepWaterBeacon.scaling.setAll(dist3D * 0.22 * apparentFactor);
    fpS14Fairy.deepWaterBeacon.rotation.y = time * 1.2;

    // 4D Clifford Spinning Umbrella floats directly over player's head
    fpS14Fairy.umbrellaRoot.position.set(px, eyeY + 0.58, pz + 0.28);
    if (sim14Fairy.umbrellaSpinning) {
      sim14Fairy.umbrellaPhaseRad += dt * 4.5;
      fpS14Fairy.umbrellaRoot.scaling.setAll(1.0);
      fpS14Fairy.umbRingA.rotation.y = sim14Fairy.umbrellaPhaseRad;
      fpS14Fairy.umbRingB.rotation.z = -sim14Fairy.umbrellaPhaseRad * 1.25;
      fpS14Fairy.umbRingB.rotation.x = Math.PI / 3 + Math.sin(time * 2.5) * 0.4;
    } else {
      fpS14Fairy.umbrellaRoot.scaling.setAll(0.42);
    }

    // 3 Canvas Pins across W = -1.8, 0.0, +1.8
    for (const p of fpS14Fairy.pins) {
      const unlocked = sim14Fairy.pinsUnlocked[p.idx];
      p.mesh.setEnabled(!unlocked);
      p.mesh.position.set(p.pos[0], (p.wTarget - pw) * 1.35 + 1.25 + Math.sin(time * 3 + p.idx) * 0.08, p.pos[2]);
      p.mesh.rotation.y = time * 1.7;
      p.mesh.material.alpha = Math.max(0.24, 1 - Math.abs(pw - p.wTarget) * 0.48);
    }

    // Companion Lin Xia: visually flattened onto 2D Xue-Lang canvas (`scaling.z = 0.02`) until unfolded!
    fpLinXia.setAlpha(1);
    if (!sim14Fairy.linUnfoldedFromCanvas) {
      fpLinXia.root.scaling.set(1, 1, sim14Fairy.linCanvasThickness); // 0.02 paper-thin 2D!
      fpLinXia.pose({
        position: [0, y0 + 0.45, 2.48],
        yaw: Math.PI,
        waveLeft: 0.75 + Math.sin(time * 6) * 0.2,
        waveRight: 0.75 + Math.cos(time * 6) * 0.2,
        breatheTime: time
      });
    } else {
      const curZ = fpLinXia.root.scaling.z;
      fpLinXia.root.scaling.set(1, 1, curZ + (1.0 - curZ) * Math.min(1, dt * 4));
      fpLinXia.pose({
        position: [0, y0, 1.85],
        yaw: Math.atan2(px, pz - 1.85),
        waveLeft: 0.85,
        waveRight: 0.85,
        breatheTime: time
      });
    }

    const pCnt14 = sim14Fairy.pinsUnlocked.filter(Boolean).length;
    promptHtml = !sim14Fairy.umbrellaSpinning
      ? `林夏被压扁在二维雪浪画纸里！先按 <kbd>R</kbd> 撑开并旋转【四维克利福德旋转伞】护住自己！`
      : !sim14Fairy.linUnfoldedFromCanvas
        ? `旋转伞已张开！追随不随距离缩小的【深水信标】，在 W=−1.8 / 0.0 / +1.8 拔除定画针 (${pCnt14}/3)`
        : `林夏已成功离开二维画纸重回三维立体世界！点击左侧按钮前往四维医疗台`;
  } else if (currentSection === 15) {
    const p = fpS15Med.patient;
    const beat = 1 + Math.sin(time * 5.8) * 0.14;
    p.organs.heart.scaling.setAll(beat);
    p.organs.shards.forEach((sh, idx) => sh.setEnabled(!s15ShardsRemoved.has(idx)));

    if (s15ShardsRemoved.size < 3) {
      p.root.position.set(0, 0.82, -0.35);
      p.body.rotationQuaternion = B.Quaternion.RotationYawPitchRoll(0, -Math.PI / 2, s15CurveW * 0.32);
      fpS15Med.scanRing.position.z = 0.5 + s15CurveW * 0.45;
      promptHtml = `走近医疗台上的林夏 · 按 <kbd>Q</kbd> / <kbd>E</kbd> 弯曲她的四维姿态，无创取出体内碎屑 (${s15ShardsRemoved.size}/3)`;
    } else {
      p.pose({
        position: [1.1, 0, 0.5],
        yaw: Math.atan2(px - 1.1, pz - 0.5),
        waveRight: 0.85,
        breatheTime: time
      });
      promptHtml = `林夏已完全康复！点击左侧「进入下一小节」前往最终的四维方舟之心`;
    }
  } else if (currentSection === 16) {
    fpS16Ark.arkTesseract.set4DAngle(-time * 0.55);
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
  const isSokoban = currentSection === 6;
  godStandardRoot.setEnabled(!isSokoban);
  godSokobanRig.root.setEnabled(isSokoban);

  if (isSokoban) {
    godSokobanRig.sync(sim6Sokoban, time);
  } else {
    const godFloorY = pw * GOD_W_SCALE;
    godActiveChamber.root.position.y = godFloorY;

    godPlayerVoxel.pose({
      position: [px * 0.62, godFloorY, pz * 0.62],
      yaw: look.yaw,
      leftLegAngle: locomotion.leftLeg,
      rightLegAngle: locomotion.rightLeg,
      waveLeft: wL,
      waveRight: wR,
      mirrorX: currentSection === 8 && s8SwappedMirror,
      breatheTime: time
    });

    // Companion Lin Xia Voxel Astronaut in God-View (ONLY when hasCompanion is true!)
    godLinVoxel.root.setEnabled(meta.hasCompanion);
    if (meta.hasCompanion) {
      let linPos = [0.9, 0, 0.8];
      if (currentSection === 1) linPos = [-0.75, 1.8 * GOD_W_SCALE, 0.5];
      else if (currentSection === 2) linPos = [0, 0, 1.65];
      else if (currentSection === 3) linPos = [0.35, 1.8 * GOD_W_SCALE, 1.25];
      else if (currentSection === 4) linPos = [-0.25, 0, 0.2];
      else if (currentSection === 8) linPos = [0.55, 0, 1.4];
      else if (currentSection === 11) linPos = [1.05, 0, 0.15];
      else if (currentSection === 13) linPos = [-0.75, 0, -0.85];
      else if (currentSection === 14) linPos = [0, 0.25, 1.55];
      else if (currentSection === 15) linPos = [0, 0.25, 0.2];
      else if (currentSection === 16) linPos = [0.75, 0, 0.5];

      godLinVoxel.root.scaling.set(
        GOD_VOXEL_SCALE,
        GOD_VOXEL_SCALE,
        currentSection === 14 && !sim14Fairy.linUnfoldedFromCanvas ? GOD_VOXEL_SCALE * 0.04 : GOD_VOXEL_SCALE
      );
      godLinVoxel.pose({
        position: linPos,
        yaw: Math.PI,
        waveLeft: 0.5 + Math.sin(time * 4) * 0.25,
        tiltZRad: currentSection === 15 ? s15CurveW * 0.35 : 0,
        breatheTime: time
      });
    }

    // Bespoke God-View section props
    godMonumentBridge.setEnabled(currentSection === 3);
    godMonumentStair.setEnabled(currentSection === 3 && sim3Monument.spireStairRaised);
    if (currentSection === 3) {
      godMonumentBridge.position.set(0, 0.12, -0.25);
      godMonumentBridge.rotation.y = sim3Monument.isBridgeAligned ? 0 : Math.PI / 2;
      godMonumentStair.position.set(0, GOD_W_SCALE * 0.9, 1.1);
    }

    godVaultBox.setEnabled(currentSection === 4);
    if (currentSection === 4) godVaultBox.position.set(0, GOD_CHAMBER_H * 0.48, 0);

    godHyperWall.setEnabled(currentSection === 5);
    if (currentSection === 5) godHyperWall.position.set(-0.4, 0.4, 0.15);

    godRingA.setEnabled(currentSection === 7);
    godRingB.setEnabled(currentSection === 7);
    if (currentSection === 7) {
      godRingA.position.set(-0.35, 0.55, 0);
      godRingB.position.set(sim7Rings.bx * 0.75, sim7Rings.bw * GOD_W_SCALE + 0.55, 0);
    }

    const showTrue4D = [9, 10, 11, 12, 16].includes(currentSection);
    godTrue4DPillar.setEnabled(showTrue4D);
    godTrue4DSphere.setEnabled(showTrue4D);
    if (showTrue4D) {
      const sl = hypersphereSlice(pw);
      godTrue4DSphere.position.set(0, godFloorY + 0.6, 0);
      godTrue4DSphere.scaling.setAll(Math.max(0.25, sl.exists ? sl.radius * 0.55 : 0.3));
      godTrue4DSphere.rotation.y = time * 0.8;
    }

    godTombRing.setEnabled(currentSection === 13);
    godShipHulls.forEach((hull, idx) => {
      hull.setEnabled(currentSection === 13);
      if (currentSection === 13) {
        const yOff = sim13ThreeBody.hullUnfolded4D ? (idx - 1) * 1.8 * GOD_W_SCALE : 0;
        hull.position.set(0.55, yOff + 0.45, 0.45);
      }
    });

    godCanvasPlane.setEnabled(currentSection === 14);
    godUmbrella.setEnabled(currentSection === 14);
    if (currentSection === 14) {
      godUmbrella.position.set(px * 0.62, godFloorY + 1.15, pz * 0.62);
      godUmbrella.rotation.y = time * (sim14Fairy.umbrellaSpinning ? 5.0 : 0.6);
      godUmbrella.scaling.setAll(sim14Fairy.umbrellaSpinning ? 1.0 : 0.45);
    }
  }

  godScene.render();
  drawVolumetricStackGauge(pw);

  $('stats').textContent = `${Math.round(fpEngine.getFps())} FPS · ${locked ? '第一人称锁定' : keyboardCorridor ? '第一人称自由鼠标 · 点击锁定' : '暂停'} · 高维操作台实时联动`;
});
