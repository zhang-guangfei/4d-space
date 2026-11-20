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
let godFrameCounter = 0;
let lastStatsUpdate = -1;

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
// Procedural Surface Textures, Materials & Sculpted 3D Chambers
// ============================================================
const _texCache = new WeakMap();
function getTexCache(scene) {
  let m = _texCache.get(scene);
  if (!m) { m = new Map(); _texCache.set(scene, m); }
  return m;
}

function createDeckPanelTexture(scene, accentHex) {
  const key = 'deck_' + accentHex;
  const cache = getTexCache(scene);
  if (cache.has(key)) return cache.get(key);
  const dt = new B.DynamicTexture(key, { width: 256, height: 256 }, scene, true);
  const ctx = dt.getContext();
  ctx.fillStyle = '#132535';
  ctx.fillRect(0, 0, 256, 256);
  // Subtle brushed metal micro-stripes
  ctx.fillStyle = 'rgba(255,255,255,0.035)';
  for (let y = 0; y < 256; y += 4) ctx.fillRect(0, y, 256, 1);
  // Chamfered architectural tile grid
  ctx.strokeStyle = 'rgba(0,0,0,0.52)';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 248, 248);
  ctx.strokeRect(4, 128, 248, 124);
  ctx.strokeRect(128, 4, 124, 248);
  // Glowing accent circuit conduit seams
  ctx.strokeStyle = accentHex;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 2;
  ctx.strokeRect(12, 12, 108, 108);
  ctx.strokeRect(136, 136, 108, 108);
  // Corner micro rivets
  ctx.fillStyle = accentHex;
  ctx.globalAlpha = 0.85;
  for (const [rx, ry] of [[18,18],[114,18],[18,114],[114,114],[142,142],[238,142],[142,238],[238,238]]) {
    ctx.fillRect(rx - 2, ry - 2, 4, 4);
  }
  ctx.globalAlpha = 1;
  dt.uScale = 3;
  dt.vScale = 3;
  dt.anisotropicFilteringLevel = 4;
  dt.update(true);
  cache.set(key, dt);
  return dt;
}

function createStoneMonumentTexture(scene, baseHex, lineHex) {
  const key = 'stone_' + baseHex + '_' + lineHex;
  const cache = getTexCache(scene);
  if (cache.has(key)) return cache.get(key);
  const dt = new B.DynamicTexture(key, { width: 256, height: 256 }, scene, true);
  const ctx = dt.getContext();
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 256, 256);
  // Warm carved sandstone bands & recessed architectural border
  ctx.strokeStyle = lineHex;
  ctx.lineWidth = 3;
  ctx.strokeRect(8, 8, 240, 240);
  ctx.strokeRect(24, 24, 208, 208);
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  ctx.fillRect(28, 28, 200, 96);
  ctx.fillStyle = 'rgba(0,0,0,0.06)';
  for (let i = 0; i < 64; i++) {
    ctx.fillRect((i * 47) % 256, (i * 89) % 256, 8, 2);
  }
  dt.uScale = 2;
  dt.vScale = 2;
  dt.update(true);
  cache.set(key, dt);
  return dt;
}

function createArmorPlateTexture(scene, baseHex, accentHex) {
  const key = 'armor_' + baseHex + '_' + accentHex;
  const cache = getTexCache(scene);
  if (cache.has(key)) return cache.get(key);
  const dt = new B.DynamicTexture(key, { width: 256, height: 256 }, scene, true);
  const ctx = dt.getContext();
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 5;
  for (let y = 0; y < 256; y += 64) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke();
  }
  for (let x = 0; x < 256; x += 128) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 256); ctx.stroke();
  }
  ctx.fillStyle = accentHex;
  ctx.globalAlpha = 0.45;
  ctx.fillRect(14, 22, 92, 8);
  ctx.fillRect(142, 150, 92, 8);
  ctx.globalAlpha = 1;
  dt.uScale = 2;
  dt.vScale = 2;
  dt.update(true);
  cache.set(key, dt);
  return dt;
}

function createParchmentTexture(scene) {
  const key = 'parchment_xuelang';
  const cache = getTexCache(scene);
  if (cache.has(key)) return cache.get(key);
  const dt = new B.DynamicTexture(key, { width: 256, height: 256 }, scene, true);
  const ctx = dt.getContext();
  const grad = ctx.createLinearGradient(0, 0, 256, 256);
  grad.addColorStop(0, '#f7f0df');
  grad.addColorStop(0.5, '#ede0c4');
  grad.addColorStop(1, '#f5ebd6');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  // Delicate ink-wash Xue-Lang wave ripples & golden border
  ctx.strokeStyle = 'rgba(130, 108, 72, 0.22)';
  ctx.lineWidth = 2;
  for (let row = 28; row < 240; row += 28) {
    ctx.beginPath();
    for (let x = 12; x <= 244; x += 12) {
      const y = row + Math.sin(x * 0.08 + row) * 6;
      if (x === 12) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.strokeStyle = '#c78c36';
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, 240, 240);
  dt.update(true);
  cache.set(key, dt);
  return dt;
}

function makeMat(scene, name, hex, {
  alpha = 1,
  emissive = 0.20,
  specular = 0.34,
  specPow = 48,
  wireframe = false,
  unlit = false,
  doubleSided = false,
  texture = null
} = {}) {
  const m = new B.StandardMaterial(name, scene);
  m.diffuseColor = B.Color3.FromHexString(hex);
  m.emissiveColor = m.diffuseColor.scale(emissive);
  m.specularColor = new B.Color3(specular, specular * 1.04, specular * 1.08);
  m.specularPower = specPow;
  m.alpha = alpha;
  m.wireframe = wireframe;
  m.disableLighting = unlit;
  m.backFaceCulling = !doubleSided && !wireframe && alpha >= 0.99;
  if (texture) m.diffuseTexture = texture;
  return m;
}

/**
 * Builds a Sculpted Volumetric 3D Space Chamber with real thickness:
 *  - Textured spacecraft circuit deck floor (top at y = 0.0)
 *  - Translucent 3D volumetric glass shell + crisp wireframe cage
 *  - 4 chamfered corner energy buttresses with base plinths, capital rings & glowing vertical light cores
 */
function createVolumetricChamber(scene, name, {
  width = 8.4,
  height = 3.2,
  depth = 8.4,
  color = '#4de6d3',
  wallAlpha = 0.12,
  floorAlpha = 0.88,
  detailed = true,
  parent = null
} = {}) {
  const root = new B.TransformNode(name, scene);
  if (parent) root.parent = parent;

  const deckTex = detailed ? createDeckPanelTexture(scene, color) : null;
  const floorMat = makeMat(scene, name + '_floorMat', detailed ? '#ffffff' : color, {
    alpha: floorAlpha,
    emissive: detailed ? 0.14 : 0.18,
    specular: 0.45,
    specPow: 56,
    texture: deckTex
  });
  const wallMat = makeMat(scene, name + '_wallMat', color, { alpha: wallAlpha, emissive: 0.72, unlit: true, doubleSided: true });
  const rimMat = makeMat(scene, name + '_rimMat', color, { alpha: Math.min(1, floorAlpha + 0.1), emissive: 0.92, unlit: true });
  const darkTrimMat = makeMat(scene, name + '_darkTrim', '#1a2e3e', { alpha: Math.min(1, floorAlpha + 0.1), emissive: 0.14, specular: 0.55 });
  const wireMat = makeMat(scene, name + '_wireMat', color, { alpha: 0.44, wireframe: true, unlit: true });

  const floor = B.MeshBuilder.CreateBox(name + '_floor', { width, height: 0.24, depth }, scene);
  floor.position.set(0, -0.12, 0);
  floor.material = floorMat;
  floor.isPickable = false;
  floor.parent = root;

  const shell = B.MeshBuilder.CreateBox(name + '_shell', { width, height, depth }, scene);
  shell.position.set(0, height * 0.5, 0);
  shell.material = wallMat;
  shell.isPickable = false;
  shell.parent = root;

  const cage = B.MeshBuilder.CreateBox(name + '_cage', { width: width + 0.03, height: height + 0.03, depth: depth + 0.03 }, scene);
  cage.position.set(0, height * 0.5, 0);
  cage.material = wireMat;
  cage.isPickable = false;
  cage.parent = root;

  const px = width * 0.5 - 0.16;
  const pz = depth * 0.5 - 0.16;
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const col = B.MeshBuilder.CreateBox(name + '_col', { width: 0.22, height, depth: 0.22 }, scene);
    col.position.set(sx * px, height * 0.5, sz * pz);
    col.material = detailed ? darkTrimMat : rimMat;
    col.isPickable = false;
    col.parent = root;

    if (detailed) {
      const strip = B.MeshBuilder.CreateBox(name + '_strip', { width: 0.08, height: height - 0.28, depth: 0.25 }, scene);
      strip.position.set(sx * px, height * 0.5, sz * pz);
      strip.material = rimMat;
      strip.isPickable = false;
      strip.parent = root;

      const plinth = B.MeshBuilder.CreateBox(name + '_plinth', { width: 0.42, height: 0.24, depth: 0.42 }, scene);
      plinth.position.set(sx * px, 0.12, sz * pz);
      plinth.material = darkTrimMat;
      plinth.isPickable = false;
      plinth.parent = root;

      const cap = B.MeshBuilder.CreateBox(name + '_cap', { width: 0.42, height: 0.18, depth: 0.42 }, scene);
      cap.position.set(sx * px, height - 0.09, sz * pz);
      cap.material = rimMat;
      cap.isPickable = false;
      cap.parent = root;
    }
  }

  return {
    root,
    floor,
    shell,
    cage,
    deckTex,
    setLayerOpacity(clarity) {
      floorMat.alpha = clarity * floorAlpha;
      wallMat.alpha = clarity * wallAlpha;
      rimMat.alpha = clarity * 0.90;
      darkTrimMat.alpha = clarity * 0.94;
      wireMat.alpha = clarity * 0.62;
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
const fpEngine = new B.Engine(worldCanvas, true, {
  stencil: false,
  preserveDrawingBuffer: false,
  antialias: true,
  audioEngine: false,
  powerPreference: 'high-performance'
});
fpEngine.setHardwareScalingLevel(1 / Math.min(Math.max(window.devicePixelRatio || 1, 1), 1.25));
const fpScene = new B.Scene(fpEngine);
fpScene.clearColor = new B.Color4(0.016, 0.042, 0.075, 1);
fpScene.skipPointerMovePicking = true;
fpScene.autoClearDepthAndStencil = true;
fpScene.fogMode = B.Scene.FOGMODE_EXP2;
fpScene.fogDensity = 0.014;
fpScene.fogColor = new B.Color3(0.024, 0.062, 0.102);

const fpCamera = new B.UniversalCamera('fpEyes', new B.Vector3(0, 1.68, -2.4), fpScene);
fpCamera.inputs.clear();
fpCamera.fov = 1.12;
fpCamera.minZ = 0.045;
fpCamera.maxZ = 160;

// 3-Light High-Performance Cinematic Sci-Fi / Museum Rig (Cool-Warm Hemisphere + Golden Key + Dynamic W-PointLight)
const fpHemi = new B.HemisphericLight('fpHemi', new B.Vector3(0.28, 1, -0.35), fpScene);
fpHemi.diffuse = new B.Color3(0.80, 0.91, 1.0);
fpHemi.groundColor = new B.Color3(0.14, 0.24, 0.36);
fpHemi.intensity = 0.88;

const fpDir = new B.DirectionalLight('fpDir', new B.Vector3(-0.55, -0.85, 0.42), fpScene);
fpDir.diffuse = new B.Color3(1.0, 0.94, 0.84);
fpDir.specular = new B.Color3(1.0, 0.96, 0.88);
fpDir.intensity = 0.92;

const fpAccentLight = new B.PointLight('fpAccentLight', new B.Vector3(0, 2.8, 0.4), fpScene);
fpAccentLight.diffuse = new B.Color3(0.32, 0.92, 0.86);
fpAccentLight.range = 16;
fpAccentLight.intensity = 0.78;

// Rich Sci-Fi 4D Cosmic Background (Rotating 4D Astrolabe Rings + Starfield + Hyper-Grid)
const fpCosmos = new B.TransformNode('fpCosmos', fpScene);
const cosmicRings = [];
{
  const ringColors = ['#236478', '#785a22', '#264b82'];
  for (let i = 0; i < 3; i++) {
    const r = B.MeshBuilder.CreateTorus('cosmicRing_' + i, {
      diameter: 28 + i * 7,
      thickness: 0.18,
      tessellation: 48
    }, fpScene);
    r.rotation.x = (i * Math.PI) / 3.2;
    r.rotation.z = (i * Math.PI) / 4;
    r.material = makeMat(fpScene, 'cRingMat_' + i, ringColors[i], { alpha: 0.45, emissive: 0.65, unlit: true });
    r.isPickable = false;
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
  cathedral.isPickable = false;
  cathedral.parent = fpCosmos;

  const starMat = makeMat(fpScene, 'starMat', '#9be8ff', { emissive: 0.9, unlit: true });
  const starBase = B.MeshBuilder.CreateBox('starBase', { size: 0.14 }, fpScene);
  starBase.material = starMat;
  starBase.isPickable = false;
  starBase.setEnabled(false);
  for (let s = 0; s < 100; s++) {
    const inst = starBase.createInstance('star_' + s);
    const theta = (s * 2.39996) % (Math.PI * 2);
    const phi = Math.acos(1 - 2 * ((s + 0.5) / 100));
    const rad = 22 + (s % 5) * 4;
    inst.position.set(
      rad * Math.sin(phi) * Math.cos(theta),
      rad * Math.cos(phi),
      rad * Math.sin(phi) * Math.sin(theta)
    );
    inst.isPickable = false;
    inst.parent = fpCosmos;
  }
}

// First-Person Local Voxel Astronaut Body + Shared Companion Lin Xia (07)
const fpPlayerVoxel = createVoxelAstronaut(B, fpScene, 'fpPlayer', { role: 'player', isLocalFirstPerson: true });
const fpLinXia = createVoxelAstronaut(B, fpScene, 'fpLinXia', { role: 'companion' });

// 3 Co-Located 3D W-Axis Spatial Slices in First-Person (ALL fixed at Y = 0; cross-faded by W transparency!)
const fpChamberW0 = createVolumetricChamber(fpScene, 'fpChW0', { width: 9.20, height: 3.40, depth: 9.20, color: '#4de6d3', wallAlpha: 0.08, detailed: true });
const fpChamberWP = createVolumetricChamber(fpScene, 'fpChWP', { width: 9.30, height: 3.44, depth: 9.30, color: '#f7c346', wallAlpha: 0.10, detailed: true });
const fpChamberWM = createVolumetricChamber(fpScene, 'fpChWM', { width: 9.10, height: 3.36, depth: 9.10, color: '#58a6ff', wallAlpha: 0.10, detailed: true });
fpChamberW0.root.position.y = 0.000;
fpChamberWP.root.position.y = 0.004;
fpChamberWM.root.position.y = -0.004;

// Per-Section First-Person Groups (1..16) + Lazy On-Demand Section Builders (instant startup!)
const fpSecGroups = {};
for (let i = 1; i <= TOTAL_SECTIONS; i++) {
  fpSecGroups[i] = new B.TransformNode('fpSecGroup_' + i, fpScene);
  fpSecGroups[i].setEnabled(false);
}
const builtSections = new Set([1]);
const sectionBuilders = {};
function ensureSectionBuilt(secId) {
  if (builtSections.has(secId)) return;
  builtSections.add(secId);
  sectionBuilders[secId]?.();
}

// --- Section 02: 3-Layer Broken Bridge Segments ---
const fpS2Bridges = {};
sectionBuilders[2] = () => {
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
};

// --- Section 03: Monument Valley 4D Rotating Penrose Bridge & Dual-Switch Sanctuary ---
const fpS3Monument = {};
sectionBuilders[3] = () => {
  const root = fpSecGroups[3];
  const coralStoneTex = createStoneMonumentTexture(fpScene, '#eab0a6', '#c27a74');
  const ivoryStoneTex = createStoneMonumentTexture(fpScene, '#f4ebd9', '#cbbca4');
  const coralMat = makeMat(fpScene, 's3m_coral', '#ffffff', { emissive: 0.16, specular: 0.25, texture: coralStoneTex });
  const ivoryMat = makeMat(fpScene, 's3m_ivory', '#ffffff', { emissive: 0.14, specular: 0.28, texture: ivoryStoneTex });
  const goldMat = makeMat(fpScene, 's3m_gold', '#f7c346', { emissive: 0.44, specular: 0.72, specPow: 64 });
  const cyanMat = makeMat(fpScene, 's3m_cyan', '#4de6d3', { emissive: 0.62, specular: 0.65 });

  // South Start Terrace (W=0) with carved plinth border
  const southTerrace = B.MeshBuilder.CreateBox('s3m_south', { width: 3.3, height: 0.40, depth: 2.45 }, fpScene);
  southTerrace.position.set(0, -0.16, -2.0);
  southTerrace.material = ivoryMat;
  southTerrace.parent = root;

  // Middle Switch Terrace (W=0) with 2 fluted classical monument columns
  const midTerrace = B.MeshBuilder.CreateBox('s3m_mid', { width: 3.1, height: 0.40, depth: 1.95 }, fpScene);
  midTerrace.position.set(0, -0.16, 1.0);
  midTerrace.material = coralMat;
  midTerrace.parent = root;

  for (const sx of [-1.25, 1.25]) {
    const col = B.MeshBuilder.CreateCylinder('s3m_col_' + sx, { diameter: 0.28, height: 2.35, tessellation: 12 }, fpScene);
    col.position.set(sx, 1.2, 1.55);
    col.material = ivoryMat;
    col.parent = midTerrace;
    const cap = B.MeshBuilder.CreateBox('s3m_cap_' + sx, { width: 0.46, height: 0.18, depth: 0.46 }, fpScene);
    cap.position.set(sx, 2.42, 1.55);
    cap.material = goldMat;
    cap.parent = midTerrace;
  }

  // Cyan Pressure Switch Pad on Middle Terrace
  const cyanSwitch = B.MeshBuilder.CreateCylinder('s3m_cyanSw', { diameter: 1.0, height: 0.16, tessellation: 24 }, fpScene);
  cyanSwitch.position.set(0, 0.08, 0.65);
  cyanSwitch.material = cyanMat;
  cyanSwitch.parent = root;

  // Rotating 4D Penrose L-Bridge Turntable at (0, 0, -0.35) with golden sculpted handrails
  const turntableRoot = new B.TransformNode('s3m_turnRoot', fpScene);
  turntableRoot.position.set(0, 0, -0.35);
  turntableRoot.parent = root;

  const bridgeSpan = B.MeshBuilder.CreateBox('s3m_bridge', { width: 1.5, height: 0.30, depth: 2.2 }, fpScene);
  bridgeSpan.position.set(0, -0.11, 0);
  bridgeSpan.material = goldMat;
  bridgeSpan.parent = turntableRoot;

  for (const sx of [-0.68, 0.68]) {
    const rail = B.MeshBuilder.CreateBox('s3m_rail_' + sx, { width: 0.08, height: 0.28, depth: 2.15 }, fpScene);
    rail.position.set(sx, 0.18, 0);
    rail.material = ivoryMat;
    rail.parent = turntableRoot;
  }

  // Monument Valley ornate 4-spoke turnwheel crank beside bridge
  const crankWheel = B.MeshBuilder.CreateTorus('s3m_crank', { diameter: 1.2, thickness: 0.11, tessellation: 32 }, fpScene);
  crankWheel.position.set(1.3, 0.95, -0.35);
  crankWheel.rotation.y = Math.PI / 2;
  crankWheel.material = goldMat;
  crankWheel.parent = root;
  const spokeA = B.MeshBuilder.CreateBox('s3m_spokeA', { width: 1.15, height: 0.08, depth: 0.08 }, fpScene);
  spokeA.material = ivoryMat; spokeA.parent = crankWheel;
  const spokeB = B.MeshBuilder.CreateBox('s3m_spokeB', { width: 0.08, height: 0.08, depth: 1.15 }, fpScene);
  spokeB.material = ivoryMat; spokeB.parent = crankWheel;

  // W=+1.8 Golden Spire Sanctuary (same elevation, cross-fades in-place via W-axis transparency!)
  const spireGoldMat = makeMat(fpScene, 's3m_spGold', '#f7c346', { emissive: 0.44, specular: 0.72, specPow: 64 });
  const spireCoralMat = makeMat(fpScene, 's3m_spCoral', '#ffffff', { emissive: 0.16, specular: 0.25, texture: coralStoneTex });
  const spireIvoryMat = makeMat(fpScene, 's3m_spIvory', '#ffffff', { emissive: 0.14, specular: 0.28, texture: ivoryStoneTex });

  const spireRoot = new B.TransformNode('s3m_spireRoot', fpScene);
  spireRoot.parent = root;
  const upperTower = B.MeshBuilder.CreateBox('s3m_upper', { width: 3.3, height: 0.44, depth: 2.65 }, fpScene);
  upperTower.position.set(0, -0.14, 2.15);
  upperTower.material = spireGoldMat;
  upperTower.parent = spireRoot;

  const spireCone = B.MeshBuilder.CreateCylinder('s3m_cone', { diameterTop: 0.06, diameterBottom: 1.35, height: 2.2, tessellation: 4 }, fpScene);
  spireCone.position.set(0, 2.35, 3.0);
  spireCone.material = spireCoralMat;
  spireCone.parent = spireRoot;

  const archBeam = B.MeshBuilder.CreateBox('s3m_archBeam', { width: 2.6, height: 0.26, depth: 0.42 }, fpScene);
  archBeam.position.set(0, 2.35, 2.8);
  archBeam.material = spireIvoryMat;
  archBeam.parent = spireRoot;

  const goldSwitch = B.MeshBuilder.CreateCylinder('s3m_goldSw', { diameter: 0.98, height: 0.16, tessellation: 24 }, fpScene);
  goldSwitch.position.set(0.6, 0.12, 1.9);
  goldSwitch.material = spireGoldMat;
  goldSwitch.parent = spireRoot;

  // Phase Resonator Portal connecting W=0 -> W=+1.8 once both switches light up!
  const spireStair = B.MeshBuilder.CreateBox('s3m_stair', { width: 1.85, height: 2.45, depth: 0.45 }, fpScene);
  spireStair.position.set(0, 1.22, 1.45);
  spireStair.material = makeMat(fpScene, 's3m_stairMat', '#74f2ce', { alpha: 0.52, emissive: 0.78 });
  spireStair.parent = root;
  spireStair.setEnabled(false);

  Object.assign(fpS3Monument, {
    southTerrace, midTerrace, cyanSwitch, turntableRoot, bridgeSpan, crankWheel,
    spireRoot, goldSwitch, spireStair, cyanMat, goldMat, coralMat, ivoryMat,
    spireGoldMat, spireCoralMat, spireIvoryMat
  });
};

// --- Section 04: Sealed 6-Wall Glass Prison + Core + Pedestal ---
const fpS4Prison = {};
sectionBuilders[4] = () => {
  const root = fpSecGroups[4];
  const box = B.MeshBuilder.CreateBox('s4_prison', { width: 2.84, height: 2.7, depth: 2.84 }, fpScene);
  box.position.set(0, 1.35, 0);
  box.material = makeMat(fpScene, 's4_pMat', '#54c1d3', { alpha: 0.40, emissive: 0.24, specular: 0.85, specPow: 96 });
  box.parent = root;

  const frame = B.MeshBuilder.CreateBox('s4_frame', { width: 2.88, height: 2.74, depth: 2.88 }, fpScene);
  frame.position.set(0, 1.35, 0);
  frame.material = makeMat(fpScene, 's4_fMat', '#9bf0ff', { alpha: 0.78, wireframe: true, unlit: true });
  frame.parent = root;

  const core = B.MeshBuilder.CreatePolyhedron('s4_core', { type: 1, size: 0.30 }, fpScene);
  core.material = makeMat(fpScene, 's4_cMat', '#ffd55a', { emissive: 0.82, specular: 0.8 });
  core.parent = root;

  const ped = B.MeshBuilder.CreateCylinder('s4_ped', { diameter: 1.08, height: 0.9, tessellation: 24 }, fpScene);
  ped.position.set(VAULT_SPEC.pedestalPos[0], 0.45, VAULT_SPEC.pedestalPos[2]);
  ped.material = makeMat(fpScene, 's4_pedMat', '#4de6d3', { emissive: 0.38, specular: 0.6 });
  ped.parent = root;

  Object.assign(fpS4Prison, { box, frame, core, ped });
};

// --- Section 05: 4D Crimson Hyper-Wall with Bottom W=-1.8 Gap ---
const fpS5Wall = {};
sectionBuilders[5] = () => {
  const root = fpSecGroups[5];
  const leftWall = B.MeshBuilder.CreateBox('s5_wallL', { width: 5.8, height: 3.1, depth: 0.36 }, fpScene);
  leftWall.position.set(-1.3, 1.55, 0.2);
  leftWall.material = makeMat(fpScene, 's5_wMat', '#ff5252', { alpha: 0.68, emissive: 0.52, specular: 0.7 });
  leftWall.parent = root;

  const rightSolid = B.MeshBuilder.CreateBox('s5_wallR', { width: 3.2, height: 3.1, depth: 0.36 }, fpScene);
  rightSolid.position.set(2.8, 1.55, 0.2);
  rightSolid.material = makeMat(fpScene, 's5_wMatR', '#ff5252', { alpha: 0.68, emissive: 0.52, specular: 0.7 });
  rightSolid.parent = root;

  const goalBeacon = B.MeshBuilder.CreateTorus('s5_goal', { diameter: 1.8, thickness: 0.13, tessellation: 36 }, fpScene);
  goalBeacon.position.set(0, 1.3, 2.6);
  goalBeacon.material = makeMat(fpScene, 's5_gMat', '#4de6d3', { emissive: 0.72 });
  goalBeacon.parent = root;

  Object.assign(fpS5Wall, { leftWall, rightSolid, goalBeacon });
};

// --- Section 06: 4D Sokoban (`4 × 4 × 2 × 4` Hyper-Grid & `XYZ ⇄ XYW` Basis Transpose) ---
let fpS6Sokoban = null;
sectionBuilders[6] = () => {
  fpS6Sokoban = createSokoban4DRig(fpScene, 'fpSoko', { cellSize: 0.56, sliceGap: 0.68, parent: fpSecGroups[6] });
  fpS6Sokoban.root.position.set(0, 0.65, 1.35);
};

// --- Section 07: Interlocked Giant Metal Rings ---
const fpS7Rings = {};
sectionBuilders[7] = () => {
  const root = fpSecGroups[7];
  const SCALE = 1.65;
  const ringA = B.MeshBuilder.CreateTorus('s7_ringA', {
    diameter: RING_SPEC.majorR * 2 * SCALE,
    thickness: RING_SPEC.tubeR * 2 * SCALE,
    tessellation: 52
  }, fpScene);
  ringA.rotation.x = Math.PI / 2;
  ringA.position.set(RING_SPEC.ringACenterX * SCALE, 1.5, 0.4);
  ringA.material = makeMat(fpScene, 's7_rAMat', '#4de6d3', { emissive: 0.38, specular: 0.85, specPow: 96 });
  ringA.parent = root;

  const ringB = B.MeshBuilder.CreateTorus('s7_ringB', {
    diameter: RING_SPEC.majorR * 2 * SCALE,
    thickness: RING_SPEC.tubeR * 2 * SCALE,
    tessellation: 52
  }, fpScene);
  ringB.position.set(RING_SPEC.startBX * SCALE, 1.5, 0.4);
  ringB.material = makeMat(fpScene, 's7_rBMat', '#f7c346', { emissive: 0.42, specular: 0.85, specPow: 96 });
  ringB.parent = root;

  Object.assign(fpS7Rings, { ringA, ringB, SCALE });
};

// --- Section 08: 4D Phase Mirror & Dual-Key Altar (Mirror Self Control Swap + Chiral Key Halves!) ---
const fpS8Mirror = {};
sectionBuilders[8] = () => {
  const root = fpSecGroups[8];
  const mirrorGlass = B.MeshBuilder.CreateBox('s8_glass', { width: 2.2, height: 2.7, depth: 0.06 }, fpScene);
  mirrorGlass.position.set(0, 1.35, -0.1);
  mirrorGlass.material = makeMat(fpScene, 's8_gMat', '#64e8de', { alpha: 0.28, emissive: 0.38, specular: 0.9, specPow: 96 });
  mirrorGlass.parent = root;

  const mirrorRim = B.MeshBuilder.CreateTorus('s8_rim', { diameter: 2.8, thickness: 0.11, tessellation: 44 }, fpScene);
  mirrorRim.position.set(0, 1.35, -0.1);
  mirrorRim.rotation.x = Math.PI / 2;
  mirrorRim.material = makeMat(fpScene, 's8_rMat', '#f7c346', { emissive: 0.62, specular: 0.8 });
  mirrorRim.parent = root;

  const mirrorTwin = createVoxelAstronaut(B, fpScene, 's8_mirrorTwin', { role: 'player' });
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
};

// --- Section 09 (True 4D Object #1): 4D Hypersphere Reactor & 3 Stabilizer Crystals ---
const fpS9Sphere = {};
sectionBuilders[9] = () => {
  const root = fpSecGroups[9];
  const sphere = B.MeshBuilder.CreateSphere('s9_sphere', { diameter: 2.0, segments: 32 }, fpScene);
  sphere.position.set(0, 1.65, 0.2);
  sphere.material = makeMat(fpScene, 's9_sMat', '#ff9f43', { alpha: 0.88, emissive: 0.42, specular: 0.72 });
  sphere.parent = root;

  const ring = B.MeshBuilder.CreateTorus('s9_ring', { diameter: 2.05, thickness: 0.04, tessellation: 40 }, fpScene);
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
    m.material = makeMat(fpScene, 's9_cMat_' + sp.id, sp.color, { emissive: 0.78 });
    m.parent = root;
    return { ...sp, mesh: m };
  });

  Object.assign(fpS9Sphere, { sphere, crystals });
};

// --- Section 10 (True 4D Object #2): Diagonal 4D Hypercube / 16-Cell Temple ---
const fpS10Temple = {};
sectionBuilders[10] = () => {
  const root = fpSecGroups[10];
  const centerPos = new B.Vector3(0, 1.6, 0.3);

  const tetra = B.MeshBuilder.CreatePolyhedron('s10_tetra', { type: 0, size: 1.25 }, fpScene);
  tetra.position.copyFrom(centerPos);
  tetra.material = makeMat(fpScene, 's10_tMat', '#58a6ff', { alpha: 0.88, emissive: 0.38, specular: 0.7 });
  tetra.parent = root;

  const octa = B.MeshBuilder.CreatePolyhedron('s10_octa', { type: 1, size: 1.35 }, fpScene);
  octa.position.copyFrom(centerPos);
  octa.material = makeMat(fpScene, 's10_oMat', '#4de6d3', { alpha: 0.88, emissive: 0.38, specular: 0.7 });
  octa.parent = root;

  const cube = B.MeshBuilder.CreateBox('s10_cube', { size: 2.1 }, fpScene);
  cube.position.copyFrom(centerPos);
  cube.material = makeMat(fpScene, 's10_cMat', '#f7c346', { alpha: 0.88, emissive: 0.38, specular: 0.7 });
  cube.parent = root;

  Object.assign(fpS10Temple, { tetra, octa, cube });
};

// --- Section 11 (True 4D Object #3): 4D Hyper-Torus Split Islands ⇄ Merged Ring Bridge ---
const fpS11Torus = {};
sectionBuilders[11] = () => {
  const root = fpSecGroups[11];
  const islandL = B.MeshBuilder.CreateCylinder('s11_islL', { diameter: 2.8, height: 0.36, tessellation: 32 }, fpScene);
  islandL.material = makeMat(fpScene, 's11_iLMat', '#4de6d3', { emissive: 0.3, specular: 0.55 });
  islandL.parent = root;

  const islandR = B.MeshBuilder.CreateCylinder('s11_islR', { diameter: 2.8, height: 0.36, tessellation: 32 }, fpScene);
  islandR.material = makeMat(fpScene, 's11_iRMat', '#4de6d3', { emissive: 0.3, specular: 0.55 });
  islandR.parent = root;

  const mergedBridge = B.MeshBuilder.CreateTorus('s11_bridge', { diameter: 4.8, thickness: 1.35, tessellation: 44 }, fpScene);
  mergedBridge.position.set(0, -0.1, 0.2);
  mergedBridge.scaling.y = 0.25;
  mergedBridge.material = makeMat(fpScene, 's11_bMat', '#f7c346', { emissive: 0.38, specular: 0.65 });
  mergedBridge.parent = root;

  Object.assign(fpS11Torus, { islandL, islandR, mergedBridge });
};

// --- Section 12 (True 4D Object #4): 24-Cell Clifford Isoclinic Double Rotor Star-Wheel ---
const fpS12Rotor = {};
sectionBuilders[12] = () => {
  const root = fpSecGroups[12];
  const matEven = makeMat(fpScene, 's12_vMatEven', '#4de6d3', { emissive: 0.68, specular: 0.7 });
  const matOdd = makeMat(fpScene, 's12_vMatOdd', '#f7c346', { emissive: 0.68, specular: 0.7 });
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
    m.material = idx % 2 === 0 ? matEven : matOdd;
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
    m.material = makeMat(fpScene, 's12_cMat_' + sp.id, sp.color, { emissive: 0.85 });
    m.parent = root;
    return { ...sp, mesh: m };
  });

  Object.assign(fpS12Rotor, { nodes, coreTargets });
};

// --- Section 13: Three-Body 4D Fragment Space ("魔戒" Tomb Ring & Unfolded 3-Hull Battleship) ---
const fpS13Fragment = {};
sectionBuilders[13] = () => {
  const root = fpSecGroups[13];
  const bubble = B.MeshBuilder.CreateSphere('s13_bubble', { diameter: 9.0, segments: 24 }, fpScene);
  bubble.position.set(0, 1.5, 0.4);
  bubble.material = makeMat(fpScene, 's13_bubMat', '#58b8ff', { alpha: 0.11, wireframe: true, unlit: true });
  bubble.parent = root;

  const tombRing = B.MeshBuilder.CreateTorus('s13_tombRing', { diameter: 2.35, thickness: 0.24, tessellation: 44 }, fpScene);
  tombRing.position.set(-2.35, 1.55, 0.6);
  tombRing.rotation.x = Math.PI / 2;
  tombRing.rotation.y = 0.5;
  tombRing.material = makeMat(fpScene, 's13_trMat', '#e6a850', { emissive: 0.58, specular: 0.85, specPow: 96 });
  tombRing.parent = root;

  const tombInnerRing = B.MeshBuilder.CreateTorus('s13_tombInner', { diameter: 1.65, thickness: 0.08, tessellation: 32 }, fpScene);
  tombInnerRing.material = makeMat(fpScene, 's13_tiMat', '#78f3ff', { emissive: 0.85 });
  tombInnerRing.parent = tombRing;

  const tombEye = B.MeshBuilder.CreatePolyhedron('s13_tombEye', { type: 1, size: 0.30 }, fpScene);
  tombEye.position.set(-2.35, 1.55, 0.6);
  tombEye.material = makeMat(fpScene, 's13_teMat', '#8cf7ff', { emissive: 0.95 });
  tombEye.parent = root;

  const armorTex = createArmorPlateTexture(fpScene, '#384b5e', '#6be0f0');
  const outerHullMat = makeMat(fpScene, 's13_ohMat', '#ffffff', { alpha: 0.94, emissive: 0.16, specular: 0.62, texture: armorTex });
  const midHullMat = makeMat(fpScene, 's13_mhMat', '#4de6d3', { alpha: 0.86, emissive: 0.34, specular: 0.68 });
  const innerHullMat = makeMat(fpScene, 's13_ihMat', '#f7c346', { alpha: 0.88, emissive: 0.48, specular: 0.75 });

  const outerHull = B.MeshBuilder.CreateBox('s13_outerHull', { width: 2.8, height: 1.65, depth: 4.2 }, fpScene);
  outerHull.position.set(0.85, 1.25, 0.85);
  outerHull.material = outerHullMat;
  outerHull.parent = root;

  const bridgeTower = B.MeshBuilder.CreateBox('s13_bridge', { width: 1.05, height: 0.58, depth: 1.25 }, fpScene);
  bridgeTower.position.set(0, 1.08, -0.55);
  bridgeTower.material = outerHullMat;
  bridgeTower.parent = outerHull;
  for (const sx of [-1.62, 1.62]) {
    const nacelle = B.MeshBuilder.CreateCylinder('s13_nac_' + sx, { diameter: 0.52, height: 2.4, tessellation: 14 }, fpScene);
    nacelle.rotation.x = Math.PI / 2;
    nacelle.position.set(sx, -0.1, -0.3);
    nacelle.material = outerHullMat;
    nacelle.parent = outerHull;
  }

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
    m.material = makeMat(fpScene, 's13_cMat_' + sp.idx, sp.color, { emissive: 0.92, specular: 0.8 });
    m.parent = root;
    return { ...sp, mesh: m };
  });

  Object.assign(fpS13Fragment, {
    bubble, tombRing, tombEye,
    outerHull, midHull, innerHull,
    outerHullMat, midHullMat, innerHullMat,
    cores
  });
};

// --- Section 14: Yun Tianming's Three Fairy Tales (2D Xue-Lang Canvas + 4D Spinning Umbrella + Deep-Water Beacon) ---
const fpS14Fairy = {};
sectionBuilders[14] = () => {
  const root = fpSecGroups[14];

  const parchTex = createParchmentTexture(fpScene);
  const canvasMesh = B.MeshBuilder.CreateBox('s14_canvas', { width: 3.4, height: 2.7, depth: 0.04 }, fpScene);
  canvasMesh.position.set(0, 1.55, 2.55);
  canvasMesh.material = makeMat(fpScene, 's14_canvMat', '#ffffff', { alpha: 0.95, emissive: 0.32, specular: 0.18, texture: parchTex });
  canvasMesh.parent = root;

  const rollerMat = makeMat(fpScene, 's14_rTMat', '#c78c36', { emissive: 0.32, specular: 0.8, specPow: 80 });
  const rollerTop = B.MeshBuilder.CreateCylinder('s14_rollT', { diameter: 0.16, height: 3.85, tessellation: 18 }, fpScene);
  rollerTop.rotation.z = Math.PI / 2;
  rollerTop.position.set(0, 2.92, 2.55);
  rollerTop.material = rollerMat;
  rollerTop.parent = root;

  const rollerBot = B.MeshBuilder.CreateCylinder('s14_rollB', { diameter: 0.16, height: 3.85, tessellation: 18 }, fpScene);
  rollerBot.rotation.z = Math.PI / 2;
  rollerBot.position.set(0, 0.18, 2.55);
  rollerBot.material = rollerMat;
  rollerBot.parent = root;

  const wakePts = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    wakePts.push(new B.Vector3(Math.sin(t * Math.PI * 1.5) * 1.45, 0.08, -2.5 + t * 4.8));
  }
  const wakeRibbon = B.MeshBuilder.CreateTube('s14_wake', { path: wakePts, radius: 0.08, tessellation: 12 }, fpScene);
  wakeRibbon.material = makeMat(fpScene, 's14_wakeMat', '#78f3ff', { alpha: 0.76, emissive: 0.88 });
  wakeRibbon.parent = root;

  const deepWaterBeacon = B.MeshBuilder.CreatePolyhedron('s14_dwBeacon', { type: 1, size: 0.16 }, fpScene);
  deepWaterBeacon.position.set(2.4, 1.7, 2.2);
  deepWaterBeacon.material = makeMat(fpScene, 's14_dwMat', '#50e8ff', { emissive: 0.95 });
  deepWaterBeacon.parent = root;

  const umbrellaRoot = new B.TransformNode('s14_umbRoot', fpScene);
  umbrellaRoot.parent = root;
  const umbShaft = B.MeshBuilder.CreateCylinder('s14_umbShaft', { diameter: 0.045, height: 0.62, tessellation: 10 }, fpScene);
  umbShaft.position.y = 0.05;
  umbShaft.material = rollerMat;
  umbShaft.parent = umbrellaRoot;

  const umbCanopy = B.MeshBuilder.CreateCylinder('s14_umbCanopy', { diameterTop: 0.12, diameterBottom: 1.62, height: 0.44, tessellation: 12 }, fpScene);
  umbCanopy.position.y = 0.26;
  umbCanopy.material = makeMat(fpScene, 's14_umbMat', '#1c2436', { alpha: 0.92, emissive: 0.28, specular: 0.7 });
  umbCanopy.parent = umbrellaRoot;

  const umbRingA = B.MeshBuilder.CreateTorus('s14_umbRingA', { diameter: 1.72, thickness: 0.05, tessellation: 32 }, fpScene);
  umbRingA.position.y = 0.12;
  umbRingA.material = makeMat(fpScene, 's14_umbRAMat', '#f7c346', { emissive: 0.88 });
  umbRingA.parent = umbrellaRoot;

  const umbRingB = B.MeshBuilder.CreateTorus('s14_umbRingB', { diameter: 1.40, thickness: 0.045, tessellation: 32 }, fpScene);
  umbRingB.position.y = 0.26;
  umbRingB.rotation.x = Math.PI / 3;
  umbRingB.material = makeMat(fpScene, 's14_umbRBMat', '#4de6d3', { emissive: 0.88 });
  umbRingB.parent = umbrellaRoot;

  const pinSpecs = [
    { idx: 0, pos: [-1.45, 1.25, 1.45], wTarget: -1.8, color: '#58a6ff' },
    { idx: 1, pos: [0.0,   1.25, 1.45], wTarget: 0.0,  color: '#4de6d3' },
    { idx: 2, pos: [1.45,  1.25, 1.45], wTarget: 1.8,  color: '#f7c346' }
  ];
  const pins = pinSpecs.map(sp => {
    const m = B.MeshBuilder.CreateCylinder('s14_pin_' + sp.idx, { diameterTop: 0.26, diameterBottom: 0.04, height: 0.85, tessellation: 12 }, fpScene);
    m.material = makeMat(fpScene, 's14_pinMat_' + sp.idx, sp.color, { emissive: 0.88, specular: 0.8 });
    m.parent = root;
    return { ...sp, mesh: m };
  });

  Object.assign(fpS14Fairy, {
    canvasMesh, wakeRibbon, deepWaterBeacon,
    umbrellaRoot, umbRingA, umbRingB, pins
  });
};

// --- Section 15: 4D Emergency Medical Table & Voxel Patient Lin Xia with Internal Organs ---
const fpS15Med = {};
sectionBuilders[15] = () => {
  const root = fpSecGroups[15];
  const bed = B.MeshBuilder.CreateBox('s15_bed', { width: 1.44, height: 0.72, depth: 2.45 }, fpScene);
  bed.position.set(0, 0.36, 0.5);
  bed.material = makeMat(fpScene, 's15_bedMat', '#1c3f52', { emissive: 0.25, specular: 0.65 });
  bed.parent = root;

  const patient = createVoxelAstronaut(B, fpScene, 's15_patient', { role: 'companion', withInternalOrgans: true });
  patient.root.parent = root;
  patient.setSuitXRay(0.22);

  const scanRing = B.MeshBuilder.CreateTorus('s15_scanRing', { diameter: 1.58, thickness: 0.045, tessellation: 40 }, fpScene);
  scanRing.position.set(0, 1.05, 0.5);
  scanRing.material = makeMat(fpScene, 's15_srMat', '#4de6d3', { emissive: 0.85 });
  scanRing.parent = root;

  Object.assign(fpS15Med, { bed, patient, scanRing });
};

// --- Section 16: The 4D Ark Throne & Lazy-Loaded 8-Cell Chapter 1 Station (saves 7.1MB on startup!) ---
const fpS16Ark = { arkTesseract: null, loading: false };
sectionBuilders[16] = () => {
  const root = fpSecGroups[16];
  const throne = B.MeshBuilder.CreateCylinder('s16_throne', { diameter: 3.4, height: 0.32, tessellation: 36 }, fpScene);
  throne.position.set(0, 0.16, 0.8);
  throne.material = makeMat(fpScene, 's16_tMat', '#f7c346', { emissive: 0.45, specular: 0.78 });
  throne.parent = root;

  const fallbackOuter = B.MeshBuilder.CreateBox('s16_fbOuter', { size: 1.65 }, fpScene);
  fallbackOuter.position.set(0, 1.85, 0.8);
  fallbackOuter.material = makeMat(fpScene, 's16_fbOMat', '#4de6d3', { alpha: 0.65, wireframe: true, unlit: true });
  fallbackOuter.parent = root;

  const fallbackInner = B.MeshBuilder.CreateBox('s16_fbInner', { size: 0.85 }, fpScene);
  fallbackInner.position.set(0, 1.85, 0.8);
  fallbackInner.material = makeMat(fpScene, 's16_fbIMat', '#f7c346', { alpha: 0.85, wireframe: true, unlit: true });
  fallbackInner.parent = root;

  Object.assign(fpS16Ark, { throne, fallbackOuter, fallbackInner });
};

function ensureArkTesseract() {
  if (fpS16Ark.arkTesseract || fpS16Ark.loading) return;
  fpS16Ark.loading = true;
  import('./colored-tesseract.js').then(({ createColoredTesseract }) => {
    const t = createColoredTesseract(B, fpScene, { parent: fpSecGroups[16], scale: 1.15 });
    t.root.position.set(0, 1.85, 0.8);
    fpS16Ark.arkTesseract = t;
    fpS16Ark.fallbackOuter.setEnabled(false);
    fpS16Ark.fallbackInner.setEnabled(false);
  }).catch(() => { fpS16Ark.loading = false; });
}

// ============================================================
// 2. ALWAYS-LIVE HIGH-DIMENSIONAL TACTICAL CONSOLE (#labCanvas)
// ============================================================
const godCanvas = $('labCanvas');
const godEngine = new B.Engine(godCanvas, true, {
  stencil: false,
  preserveDrawingBuffer: false,
  antialias: true,
  audioEngine: false,
  powerPreference: 'high-performance'
});
godEngine.setHardwareScalingLevel(1);
const godScene = new B.Scene(godEngine);
godScene.clearColor = new B.Color4(0.015, 0.042, 0.072, 1);
godScene.skipPointerMovePicking = true;

const godCamera = new B.ArcRotateCamera('godCam', -Math.PI * 0.62, 1.12, 12.2, new B.Vector3(0, 0.3, 0), godScene);
godCamera.lowerRadiusLimit = 5.0;
godCamera.upperRadiusLimit = 24.0;
godCamera.wheelPrecision = 40;
godCamera.attachControl(godCanvas, true);
godCamera.inputs.removeByType('ArcRotateCameraKeyboardMoveInput');
godScene._forceRender = true;
godCanvas.addEventListener('pointerdown', () => { godScene._forceRender = true; }, { passive: true });
godCanvas.addEventListener('pointermove', (e) => { if (e.buttons) godScene._forceRender = true; }, { passive: true });
godCanvas.addEventListener('wheel', () => { godScene._forceRender = true; }, { passive: true });

const godHemi = new B.HemisphericLight('godHemi', new B.Vector3(0.35, 1, -0.3), godScene);
godHemi.diffuse = new B.Color3(0.85, 0.94, 1.0);
godHemi.groundColor = new B.Color3(0.12, 0.22, 0.32);
godHemi.intensity = 0.88;
const godDir = new B.DirectionalLight('godDir', new B.Vector3(-0.5, -1, 0.4), godScene);
godDir.diffuse = new B.Color3(1.0, 0.95, 0.85);
godDir.intensity = 0.65;

const GOD_W_SCALE = 2.05; // Horizontal X-axis W-expansion spacing (NOT vertical elevator!)
const GOD_CHAMBER_H = 1.45;
const GOD_VOXEL_SCALE = 0.50;

const godStandardRoot = new B.TransformNode('godStandardRoot', godScene);

// Horizontal W-Axis Expansion Rail connecting W=-1.8 (Sapphire) ◀── W=0.0 (Cyan) ──▶ W=+1.8 (Gold)
const godWRail = B.MeshBuilder.CreateBox('godWRail', { width: 10.6, height: 0.06, depth: 0.14 }, godScene);
godWRail.position.set(0, -0.22, -1.95);
godWRail.material = makeMat(godScene, 'godWRailMat', '#4de6d3', { alpha: 0.72, emissive: 0.85, unlit: true });
godWRail.parent = godStandardRoot;

const godChambers = [
  { wLv: -1.8, color: '#58a6ff', name: 'godCh_WM' },
  { wLv: 0.0,  color: '#4de6d3', name: 'godCh_W0' },
  { wLv: 1.8,  color: '#f7c346', name: 'godCh_WP' }
].map(cfg => {
  const ch = createVolumetricChamber(godScene, cfg.name, {
    width: 3.1,
    height: GOD_CHAMBER_H,
    depth: 3.1,
    color: cfg.color,
    wallAlpha: 0.14,
    floorAlpha: 0.48,
    detailed: false,
    parent: godStandardRoot
  });
  ch.root.position.set(cfg.wLv * GOD_W_SCALE, 0, 0);
  return { ...cfg, chamber: ch };
});

const godActiveChamber = createVolumetricChamber(godScene, 'godActiveCh', {
  width: 3.28,
  height: GOD_CHAMBER_H + 0.06,
  depth: 3.28,
  color: '#ffffff',
  wallAlpha: 0.18,
  floorAlpha: 0.34,
  detailed: false,
  parent: godStandardRoot
});

const godPlayerVoxel = createVoxelAstronaut(B, godScene, 'godPlayer', { role: 'player' });
godPlayerVoxel.root.scaling.setAll(GOD_VOXEL_SCALE);
godPlayerVoxel.root.parent = godStandardRoot;

const godLinVoxel = createVoxelAstronaut(B, godScene, 'godLin', { role: 'companion', withInternalOrgans: true });
godLinVoxel.root.scaling.setAll(GOD_VOXEL_SCALE);
godLinVoxel.root.parent = godStandardRoot;

// God-View Bespoke Props per Section (arranged along horizontal W-expansion axis!)
// Sec 03: Monument Valley 4D Rotating Bridge + Phase Resonator
const godMonumentBridge = B.MeshBuilder.CreateBox('godMonBr', { width: 0.78, height: 0.16, depth: 1.35 }, godScene);
godMonumentBridge.material = makeMat(godScene, 'godMonBrMat', '#f7c346', { emissive: 0.65 });
godMonumentBridge.parent = godStandardRoot;
const godMonumentStair = B.MeshBuilder.CreateBox('godMonSt', { width: GOD_W_SCALE * 1.8, height: 0.16, depth: 0.55 }, godScene);
godMonumentStair.material = makeMat(godScene, 'godMonStMat', '#74f2ce', { alpha: 0.65, emissive: 0.78 });
godMonumentStair.parent = godStandardRoot;

// Sec 04: Glass Vault Box (confined strictly to W=0 slice!)
const godVaultBox = B.MeshBuilder.CreateBox('godVaultBox', { width: 1.65, height: GOD_CHAMBER_H * 0.9, depth: 1.65 }, godScene);
godVaultBox.material = makeMat(godScene, 'godVMat', '#54c1d3', { alpha: 0.45, emissive: 0.25 });
godVaultBox.parent = godStandardRoot;

// Sec 05: Crimson 4D Hyper-Wall (spans W=0 and W=+1.8, leaving gap at W=-1.8!)
const godHyperWall = B.MeshBuilder.CreateBox('godHWall', { width: GOD_W_SCALE * 2.5, height: GOD_CHAMBER_H * 0.85, depth: 0.22 }, godScene);
godHyperWall.material = makeMat(godScene, 'godHWMat', '#ff5252', { alpha: 0.58, emissive: 0.45 });
godHyperWall.parent = godStandardRoot;

// Sec 06: Bespoke 4×4×2×4 Isometric Multi-Slice Sokoban Board inside God-View Console!
const godSokobanRig = createSokoban4DRig(godScene, 'godSoko', { cellSize: 0.42, sliceGap: 0.50 });
godSokobanRig.root.position.set(0, -0.3, 0);

// Sec 07: Interlocked Rings (same elevation Y, separated horizontally along W!)
const godRingA = B.MeshBuilder.CreateTorus('godRingA', { diameter: 1.25, thickness: 0.16, tessellation: 32 }, godScene);
godRingA.rotation.x = Math.PI / 2;
godRingA.material = makeMat(godScene, 'godRAMat', '#4de6d3', { emissive: 0.35 });
godRingA.parent = godStandardRoot;
const godRingB = B.MeshBuilder.CreateTorus('godRingB', { diameter: 1.25, thickness: 0.16, tessellation: 32 }, godScene);
godRingB.material = makeMat(godScene, 'godRBMat', '#f7c346', { emissive: 0.4 });
godRingB.parent = godStandardRoot;

// Sec 09-12 & 16: True 4D Objects Horizontal W-Tube + Morph Sphere/Polytope
const godTrue4DSphere = B.MeshBuilder.CreateSphere('god4DSphere', { diameter: 1.45, segments: 24 }, godScene);
godTrue4DSphere.material = makeMat(godScene, 'god4DSphMat', '#ff9f43', { alpha: 0.75, emissive: 0.35 });
godTrue4DSphere.parent = godStandardRoot;
const godTrue4DPillar = B.MeshBuilder.CreateCylinder('god4DPillar', { diameter: 1.8, height: GOD_W_SCALE * 3.6, tessellation: 24 }, godScene);
godTrue4DPillar.rotation.z = Math.PI / 2;
godTrue4DPillar.position.y = 0.65;
godTrue4DPillar.material = makeMat(godScene, 'god4DPilMat', '#68a7ff', { alpha: 0.16, wireframe: true, unlit: true });
godTrue4DPillar.parent = godStandardRoot;

// Sec 13: Three-Body 4D Fragment Tomb Ring + Unfolding 3-Hull Cruiser along W!
const godTombRing = B.MeshBuilder.CreateTorus('godTombRing', { diameter: 1.15, thickness: 0.14, tessellation: 28 }, godScene);
godTombRing.position.set(-1.0, 0.55, 0.25);
godTombRing.rotation.x = Math.PI / 2;
godTombRing.material = makeMat(godScene, 'godTRMat', '#e6a850', { emissive: 0.65 });
godTombRing.parent = godStandardRoot;

const godShipHulls = ['#58a6ff', '#4de6d3', '#f7c346'].map((hex, i) => {
  const m = B.MeshBuilder.CreateBox('godShip_' + i, { width: 1.25 - i * 0.22, height: 0.55, depth: 1.85 - i * 0.35 }, godScene);
  m.material = makeMat(godScene, 'godShMat_' + i, hex, { alpha: 0.62, emissive: 0.45 });
  m.parent = godStandardRoot;
  return m;
});

// Sec 14: Yun Tianming Xue-Lang Canvas + Spinning Umbrella in God-View
const godCanvasPlane = B.MeshBuilder.CreateBox('godFairyCanv', { width: 1.8, height: 1.35, depth: 0.05 }, godScene);
godCanvasPlane.position.set(0, 0.72, 1.15);
godCanvasPlane.material = makeMat(godScene, 'godFCanvMat', '#f6efe0', { alpha: 0.88, emissive: 0.4 });
godCanvasPlane.parent = godStandardRoot;

const godUmbrella = B.MeshBuilder.CreateTorus('godFairyUmb', { diameter: 1.05, thickness: 0.08, tessellation: 28 }, godScene);
godUmbrella.material = makeMat(godScene, 'godFUmbMat', '#f7c346', { emissive: 0.8 });
godUmbrella.parent = godStandardRoot;

// ============================================================
// 3. RIGHT-SIDE W-AXIS PHASE TRANSPARENCY GAUGE (#volStackCanvas)
// ============================================================
const volCanvas = $('volStackCanvas');
const vctx = volCanvas.getContext('2d');

function drawVolumetricStackGauge(currentW) {
  const w = volCanvas.width;
  const h = volCanvas.height;
  vctx.clearRect(0, 0, w, h);

  // Section 06 (4D Sokoban): draw 4 W=1..4 slice opacity cards (or 2 Z=1..2 cards in XYW mode)
  if (currentSection === 6) {
    const isXYZ = sim6Sokoban.basisMode === 'XYZ';
    const slices = isXYZ
      ? [
          { idx: 1, label: 'W1', color: '#58a6ff', y: h * 0.82 },
          { idx: 2, label: 'W2', color: '#4de6d3', y: h * 0.61 },
          { idx: 3, label: 'W3', color: '#c88cff', y: h * 0.40 },
          { idx: 4, label: 'W4', color: '#f7c346', y: h * 0.19 }
        ]
      : [
          { idx: 1, label: 'Z1', color: '#4de6d3', y: h * 0.66 },
          { idx: 2, label: 'Z2', color: '#f7c346', y: h * 0.34 }
        ];
    const activeIdx = isXYZ ? sim6Sokoban.player[3] : sim6Sokoban.player[2];
    for (const s of slices) {
      const act = s.idx === activeIdx;
      vctx.fillStyle = s.color + (act ? '55' : '1a');
      vctx.strokeStyle = act ? '#ffffff' : s.color;
      vctx.lineWidth = act ? 2 : 1;
      vctx.fillRect(10, s.y - 16, w - 20, 32);
      vctx.strokeRect(10, s.y - 16, w - 20, 32);
      vctx.fillStyle = act ? '#ffffff' : s.color;
      vctx.font = 'bold 11px ui-monospace, monospace';
      vctx.textAlign = 'center';
      vctx.fillText(s.label, w * 0.5, s.y + 4);
    }
    return;
  }

  // Draw W-Axis Phase Opacity Gauge: concentric overlapping frames showing transparency materialization (NOT floors!)
  const cx = w * 0.5;
  const cy = h * 0.42;
  const slices = [
    { wVal: -1.8, tag: 'W−', color: '#58a6ff', dx: -9, dy: 9 },
    { wVal: 0.0,  tag: 'W0', color: '#4de6d3', dx: 0,  dy: 0 },
    { wVal: 1.8,  tag: 'W+', color: '#f7c346', dx: 9,  dy: -9 }
  ];

  for (const s of slices) {
    const dist = Math.abs(currentW - s.wVal);
    const clarity = Math.max(0.08, Math.max(0, 1 - dist / 1.65));
    const alphaHex = Math.round(clarity * 190).toString(16).padStart(2, '0');
    const size = 34 + clarity * 8;
    const x0 = cx + s.dx - size * 0.5;
    const y0 = cy + s.dy - size * 0.5;

    vctx.fillStyle = s.color + alphaHex;
    vctx.strokeStyle = clarity > 0.72 ? '#ffffff' : s.color;
    vctx.lineWidth = clarity > 0.72 ? 2.2 : 1.1;
    vctx.fillRect(x0, y0, size, size);
    vctx.strokeRect(x0, y0, size, size);
  }

  // Fixed XYZ Anchor dot at center (proving player XYZ stays stationary while W opacity shifts!)
  vctx.fillStyle = '#ffffff';
  vctx.beginPath();
  vctx.arc(cx, cy, 3.8, 0, Math.PI * 2);
  vctx.fill();

  // Bottom W-phase bar (W-1.8 ← 0 → W+1.8)
  const barY = h - 40;
  const barW = w - 16;
  const grad = vctx.createLinearGradient(8, 0, 8 + barW, 0);
  grad.addColorStop(0, '#58a6ff');
  grad.addColorStop(0.5, '#4de6d3');
  grad.addColorStop(1, '#f7c346');
  vctx.fillStyle = grad;
  vctx.fillRect(8, barY, barW, 6);

  const norm = Math.max(0, Math.min(1, (currentW + 2.2) / 4.4));
  const mx = 8 + norm * barW;
  vctx.fillStyle = '#ffffff';
  vctx.fillRect(mx - 2.5, barY - 4, 5, 14);

  vctx.fillStyle = '#c9e8ec';
  vctx.font = 'bold 10px ui-monospace, monospace';
  vctx.textAlign = 'center';
  vctx.fillText(`W=${currentW >= 0 ? '+' : ''}${currentW.toFixed(1)}`, cx, h - 14);
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
  ensureSectionBuilt(currentSection);
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
  else if (currentSection === 16) { pos4 = [0, 0, -2.0, 0.0]; s16Awakened = false; ensureArkTesseract(); }

  // Per-Act Atmospheric Sky & Fog Grading for distinct visual identity
  if (currentSection === 3) {
    fpScene.clearColor.set(0.09, 0.08, 0.16, 1);
    fpScene.fogColor.set(0.14, 0.12, 0.22);
  } else if (currentSection === 13) {
    fpScene.clearColor.set(0.025, 0.032, 0.055, 1);
    fpScene.fogColor.set(0.04, 0.055, 0.09);
  } else if (currentSection === 14) {
    fpScene.clearColor.set(0.055, 0.048, 0.032, 1);
    fpScene.fogColor.set(0.09, 0.075, 0.05);
  } else if (currentSection === 16) {
    fpScene.clearColor.set(0.035, 0.055, 0.095, 1);
    fpScene.fogColor.set(0.055, 0.085, 0.13);
  } else {
    fpScene.clearColor.set(0.016, 0.042, 0.075, 1);
    fpScene.fogColor.set(0.024, 0.062, 0.102);
  }

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
      completeSection(1, '第一小节完成！你在原地沿 W 轴切入流金折页，成功与林夏汇合！', '“太棒了！你已经掌握了沿 W 轴改变空间透明度的穿梭方式，按 Tab 释放鼠标点下一小节（或按 N）跟上我！”');
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
      completeSection(2, '第二小节完成！你连续切换三个 W 折页让断桥实体化通过！', '“干得漂亮！前方出现了纪念碑谷般的四维圣殿，我们快过去！”');
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
        showToast('四维旋转天桥当前偏向第四维！按 R（或按 Tab 释放鼠标点右侧按钮）将天桥在 XW 平面旋转 90° 接通断渊！');
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
      setDialogue('先遣领航员 · 林夏 (07)', '“我这边也同步踩下金色踏板了！通往 W=+1.8 流金折页的跨维光桥已开启，按 E 切相过来汇合！”');
      showToast('青色与金色双踏板共鸣！跨维光桥已开启，按 E 切入 W=+1.8 流金折页汇合！');
    }
    if (post.complete) {
      compGesture = { left: time, right: time };
      completeSection(3, '第三小节完成！你旋转四维纪念碑天桥并与林夏双人共鸣汇合！', '“视错觉在第四维里完全是真实的几何旋转！快走，前面就是方舟核心大厅！”');
    }
  } else if (currentSection === 4) {
    const res = sim4Vault.move([dx, 0, dz, dw]);
    pos4 = [...sim4Vault.player];
    if (res.blocked && Math.hypot(dx, dz) > 1e-4 && time - (stepGameplay._hitT || 0) > 1.0) {
      stepGameplay._hitT = time;
      audio.probeBounce(1.8);
      showToast('砰！六面防爆玻璃在 W=0 完全封死！按 E 切入 W=+1.8 折页让玻璃墙透明淡出后直接走入！');
    }
    if (res.picked) {
      compGesture = { left: time, right: time };
      audio.evidenceUnlocked();
      setDialogue('先遣领航员 · 林夏 (07)', '“天哪，你直接从第四维穿墙进密室了！快按 E 切入 W=+1.8 穿出玻璃送到右侧接收台！”');
      showToast('已拿到启动核心！按 E 切入 W=+1.8 使玻璃墙透明淡出，送往右侧接收台！');
    }
    if (res.delivered) {
      completeSection(4, '第四小节完成！高维对低维的降维碾压：无门密室透明穿入救援成功！', '“核心已激活！小心，前方升起了横跨多切片的赤红超墙！”');
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
        showToast('赤红四维超墙拦截！它封死了 W=0 与 W=+1.8，按 Q 切入 W = −1.8 星轨折页让右侧缺口淡出！');
      }
      pos4[0] = candX;
    } else {
      pos4[0] = candX;
      pos4[2] = candZ;
    }
    if (pos4[2] > 1.2) s5PassedWall = true;
    if (s5PassedWall && Math.abs(pos4[3]) < 0.45 && pos4[2] > 1.8) {
      completeSection(5, '第五小节完成！你切入星轨折页穿过唯一裂隙，突破了四维封锁线！');
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
      showToast('两只实心巨环在 W=0 死死相扣！先按 E 将金环沿 W 轴切入 W=+1.4（青环变透明）再向右推！');
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
        showToast(`四维超球在当前折页半径达 ${sl.radius.toFixed(1)}m 挡住了路！按 Q/E 沿 W 轴切相让它缩小或消隐！`);
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
        showToast('在 W=0 折页两座浮岛被深渊隔开！按 E 沿 W 轴切入 W=+1.8 折页，让四维超环面把两岛原地融合成环形天桥！');
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
      showToast('⚡ 已沿 W 轴切入 W=+1.8 折页走过融合后的超环面天桥！再点一次切回右岛与林夏汇合！');
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
    $('wPageReadout').textContent = `W = ${w >= 0 ? '+' : ''}${w.toFixed(1)} 空间折页`;
    let tagText = '青苍三维切片 · XYZ 同位叠映';
    if (w > 0.65) tagText = '流金三维切片 · XYZ 同位叠映';
    else if (w < -0.65) tagText = '星轨三维切片 · XYZ 同位叠映';
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
      { done: pos4[3] > 1.2 || s1Met, text: '按 E 沿 W 轴切入 W = +1.8 流金折页（XYZ 不动）' },
      { done: completedSections.has(1), text: '走向由半透明渐实的同伴林夏汇合' }
    ];
  } else if (currentSection === 2) {
    checks = [
      { done: s2Bridges.has('wp'), text: '切入 W = +1.8 使中段流金桥实体化并走过' },
      { done: s2Bridges.has('wm'), text: '切入 W = −1.8 使北段星轨桥实体化并走过' },
      { done: completedSections.has(2), text: '切回 W = 0 与对岸的林夏汇合' }
    ];
  } else if (currentSection === 3) {
    checks = [
      { done: sim3Monument.isBridgeAligned || sim3Monument.spireStairRaised, text: '按 R 在 XW 平面旋转四维天桥 90° 接通断渊' },
      { done: sim3Monument.cyanSwitchPressed, text: '踩下中央【青色踏板】触发林夏共鸣开启跨维光桥' },
      { done: sim3Monument.complete, text: '按 E 切入 W=+1.8 流金折页与尖塔内的林夏汇合' }
    ];
  } else if (currentSection === 4) {
    checks = [
      { done: Math.abs(pos4[3]) > 0.9 || sim4Vault.enteredVault, text: '按 E 切入 W = +1.8 使三维防爆玻璃墙透明淡出' },
      { done: sim4Vault.carryingCore || sim4Vault.coreDelivered, text: '走入牢笼中央后按 Q 切回 W=0 拿起核心' },
      { done: sim4Vault.coreDelivered, text: '再切相穿出玻璃墙将核心放上右侧接收台' }
    ];
  } else if (currentSection === 5) {
    checks = [
      { done: pos4[3] < -1.2 || s5PassedWall, text: '按 Q 切入 W = −1.8 星轨折页' },
      { done: s5PassedWall, text: '从右侧淡出的唯一裂隙穿过赤红四维超墙' },
      { done: completedSections.has(5), text: '按 E 切回 W = 0 抵达北侧终端' }
    ];
  } else if (currentSection === 6) {
    checks = [
      { done: sim6Sokoban.crossWPushes > 0 || sim6Sokoban.boxes[0][3] === 4, text: '用 Q/C 切至 W=2 并按 E 把翠绿箱跨第四维推入 W=4' },
      { done: sim6Sokoban.basisSwaps > 0 || sim6Sokoban.complete, text: '（推荐）按 X 切换 XYZ ⇄ XYW 切片视角观察跨维路径' },
      { done: sim6Sokoban.complete, text: '沿 W=4 推箱踏上 (3,4,1,4) 坡道归位至高台 (3,4,2,4)' }
    ];
  } else if (currentSection === 7) {
    checks = [
      { done: Math.abs(sim7Rings.bw) > 0.5 || sim7Rings.unlinked, text: '按 E 把金色巨环沿 W 轴切入 W = +1.4 折页' },
      { done: sim7Rings.bx >= RING_SPEC.unlinkedBX || sim7Rings.unlinked, text: '推着金环毫无碰撞地穿过半透明青环边缘' },
      { done: sim7Rings.unlinked, text: '按 Q 切回 W = 0 完成无损解链' }
    ];
  } else if (currentSection === 8) {
    checks = [
      { done: s8SwappedMirror, text: '在四维魔镜前按 R 与镜中自己互换（圣钥变左旋）' },
      { done: s8CombinedKey, text: '走向大门基座与林夏的右旋半钥完美拼合' }
    ];
  } else if (currentSection === 9) {
    checks = [
      { done: s9Crystals.has('south_low'), text: '在 W=−1.8 缩球相位绕过星核采集蓝晶 ①' },
      { done: s9Crystals.has('equator_rim'), text: '在 W=0.0 最大赤道外缘采集青晶 ②' },
      { done: s9Crystals.has('center_high'), text: '在 W=+2.2 巨球消失相位中心采集金晶 ③' }
    ];
  } else if (currentSection === 10) {
    checks = [
      { done: s10Forms.has('tetrahedron'), text: '在 W=−1.8 激活【正四面体】切面形态' },
      { done: s10Forms.has('octahedron'), text: '在 W=0.0 激活【正八面体】钻石圣殿切面' },
      { done: s10Forms.has('cube'), text: '在 W=+1.8 激活【正立方体】切面形态' }
    ];
  } else if (currentSection === 11) {
    checks = [
      { done: hyperTorusSliceState(pos4[3]).merged || s11CrossedBridge, text: '按 E 切入 W=+1.8 让两座孤岛原地融合成环形天桥' },
      { done: s11CrossedBridge, text: '沿融合天桥走到右侧浮岛区域' },
      { done: s11MetLin, text: '按 Q 切回 W=0 右岛与同伴林夏汇合' }
    ];
  } else if (currentSection === 12) {
    checks = [
      { done: s12Cores.has(0), text: '在 W=0 捕获双旋星轮内环核心 ①' },
      { done: s12Cores.has(1), text: '在 W=+1.8 捕获翻入流金折页的外环核心 ②' },
      { done: s12Cores.has(2), text: '在 W=−1.8 捕获翻入星轨折页的星轮核心 ③' }
    ];
  } else if (currentSection === 13) {
    const extCount = sim13ThreeBody.coresExtracted.filter(Boolean).length;
    checks = [
      { done: sim13ThreeBody.ringContacted, text: '走近左侧青铜巨环【魔戒】聆听四维墓地遗言' },
      { done: sim13ThreeBody.hullUnfolded4D, text: '按 R 开启三层封闭战舰四维原位透视相位' },
      { done: sim13ThreeBody.complete, text: `按 Q/E 在 W=−1.8 / 0.0 / +1.8 原位取核 (${extCount}/3)` }
    ];
  } else if (currentSection === 14) {
    const pinCount = sim14Fairy.pinsUnlocked.filter(Boolean).length;
    checks = [
      { done: sim14Fairy.umbrellaSpinning, text: '按 R 撑开【四维克利福德旋转伞】抵御降维打击' },
      { done: pinCount === 3, text: `在三个 W 折页拔除雪浪画纸定画针 (${pinCount}/3)` },
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

  const checklistHtml = checks.map(c =>
    `<div class="ch2-check-item ${c.done ? 'done' : ''}"><span>${c.done ? '✓' : '○'}</span><span>${c.text}</span></div>`
  ).join('');
  const checklistEl = $('secChecklist');
  if (checklistEl._lastHtml !== checklistHtml) {
    checklistEl._lastHtml = checklistHtml;
    checklistEl.innerHTML = checklistHtml;
  }

  const nextBtn = $('nextSecHudBtn');
  const isDone = completedSections.has(currentSection);
  nextBtn.classList.toggle('hidden', !isDone);
  const nextLabel = currentSection < TOTAL_SECTIONS
    ? `进入${CHAPTER2_SECTIONS[currentSection].code}：${CHAPTER2_SECTIONS[currentSection].title} (N) →`
    : '查看第二章终幕结局 (N) →';
  if (nextBtn.textContent !== nextLabel) nextBtn.textContent = nextLabel;

  document.querySelectorAll('#sectionTabs button').forEach(btn => {
    const n = Number(btn.dataset.sec);
    btn.classList.toggle('active', n === currentSection);
    btn.classList.toggle('done', completedSections.has(n));
  });
}

function refreshHighDimConsole() {
  const meta = CHAPTER2_SECTIONS[currentSection - 1];
  const w = pos4[3];

  const titleTxt = `高维展开 · ${meta.title}`;
  if ($('godTitle').textContent !== titleTxt) $('godTitle').textContent = titleTxt;
  const wValTxt = currentSection === 6
    ? `${sim6Sokoban.basisMode} · 玩家${formatCoord4D(sim6Sokoban.player)}`
    : `W = ${w >= 0 ? '+' : ''}${w.toFixed(1)}`;
  if ($('godWValue').textContent !== wValTxt) $('godWValue').textContent = wValTxt;
  $('godWSlider').value = String(Math.max(-2.4, Math.min(2.4, w)));
  if ($('godLiveStatus').textContent !== meta.godHint) $('godLiveStatus').textContent = meta.godHint;

  document.querySelectorAll('[data-jump-w]').forEach(btn => {
    const target = Number(btn.getAttribute('data-jump-w'));
    btn.classList.toggle('active', Math.abs(w - target) < 0.45);
  });

  const ext13 = sim13ThreeBody.coresExtracted.filter(Boolean).length;
  const pin14 = sim14Fairy.pinsUnlocked.filter(Boolean).length;

  const crushLabels = {
    1: '⚡ 高维切相：直接切入 W=+1.8 流金折页与林夏汇合',
    2: '⚡ 高维连切：一键切相通过三段断桥抵达对岸',
    3: !sim3Monument.isBridgeAligned
      ? '⚡ 旋转纪念碑四维天桥 (XW 90°) (R)'
      : !sim3Monument.cyanSwitchPressed
        ? '⚡ 走上中央踩下青色踏板激活跨维光桥'
        : '⚡ 切入 W=+1.8 流金折页与尖塔林夏汇合',
    4: sim4Vault.carryingCore ? '⚡ 高维撤离：切相穿出玻璃墙送达接收台' : '⚡ 高维穿墙：切入 W=+1.8 绕过密室玻璃直取核心',
    5: '⚡ 高维切隙：切入 W=−1.8 星轨折页穿过超墙缺口',
    6: sim6Sokoban.complete ? '✓ 4×4×2×4 四维推箱已归位 (3,4,2,4)' : '⚡ 高维推箱解算：自动执行下一步 (R)',
    7: '⚡ 高维解链：将金环错开 W 相位无损解开死结',
    8: s8SwappedMirror ? '✓ 已与镜中自己互换（圣钥已变左旋）' : '⚡ 四维镜像互换：与镜中自己互换翻转圣钥手性 (R)',
    9: `⚡ 高维采能：切入下一枚超球晶簇所在相位 (${s9Crystals.size}/3)`,
    10: `⚡ 高维相变：切换超方体切面形态 (${s10Forms.size}/3)`,
    11: s11CrossedBridge ? '⚡ 切回 W=0 右侧浮岛与林夏汇合' : '⚡ 切入 W=+1.8 让两座孤岛原地融合成环形天桥',
    12: `⚡ 捕捉双旋星轮高维曲率核心 (${s12Cores.size}/3)`,
    13: !sim13ThreeBody.ringContacted
      ? '⚡ 接入四维遗迹【魔戒】通讯 (R)'
      : !sim13ThreeBody.hullUnfolded4D
        ? '⚡ 开启战舰四维原位透视相位 (R)'
        : `⚡ 从第四维提取下一枚战舰量子核心 (${ext13}/3)`,
    14: !sim14Fairy.umbrellaSpinning
      ? '⚡ 撑开【四维克利福德旋转伞】防降维 (R)'
      : `⚡ 拔除下一枚雪浪画纸定画针救出林夏 (${pin14}/3)`,
    15: `⚡ 高维无创弯曲：摘除林夏体内下一处碎屑 (${s15ShardsRemoved.size}/3)`,
    16: '⚡ 觉醒四维方舟之心 · 折叠八胞空间站 (R)'
  };

  const extra = $('godExtraControls');
  const nextExtraHtml = currentSection === 6
    ? `
      <button id="crushActionBtn">${crushLabels[6]}</button>
      <div class="ch2-hc-subbtns">
        <button id="sokoBtnWm">Q/C · 退向 W−1</button>
        <button id="sokoBtnWp">E · 推向 W+1</button>
        <button id="sokoBtnSwap">X · 切 ${sim6Sokoban.basisMode === 'XYZ' ? 'XYW' : 'XYZ'} 基底</button>
        <button id="sokoBtnUndo">Z · 撤销一步</button>
      </div>
    `
    : `<button id="crushActionBtn">${crushLabels[currentSection]}</button>`;

  if (extra._lastHtml !== nextExtraHtml) {
    extra._lastHtml = nextExtraHtml;
    extra.innerHTML = nextExtraHtml;
    $('crushActionBtn').onclick = executeHighDimCrush;
    if (currentSection === 6) {
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
    }
  }
}

// ============================================================
// Input & Control Wiring (with Tab / Alt Mouse Release ⇄ Capture Toggle!)
// ============================================================
let manualPauseRequested = false;
let rightDraggingLook = false;

function clearKeys() {
  keys.clear();
  jumpQueued = false;
  ground.releaseJumpControl();
}

function updateMouseModeUI() {
  const btn = $('mouseModeBtn');
  const ch = $('crosshair');
  const isFree = !locked && keyboardCorridor && !ended;
  if (btn) {
    btn.textContent = locked ? '🔒 Tab · 释放鼠标' : '🖱️ Tab · 掌控视角';
    btn.classList.toggle('cursor-free', isFree);
    btn.classList.toggle('accent', locked);
  }
  if (ch) {
    ch.classList.toggle('cursor-free', !locked);
  }
}

function pause(showMenu = true) {
  manualPauseRequested = true;
  locked = false;
  keyboardCorridor = false;
  rightDraggingLook = false;
  clearKeys();
  look.transition();
  document.exitPointerLock?.();
  if (showMenu && !ended) $('menu').classList.remove('hidden');
  updateMouseModeUI();
}

/** Releases pointer lock WITHOUT opening the blocking #menu so player can freely click Next Section & High-Dim Console! */
function releaseMouseCursor({ announce = true } = {}) {
  if (!ready || ended) return;
  manualPauseRequested = false;
  locked = false;
  keyboardCorridor = true;
  rightDraggingLook = false;
  look.transition();
  $('menu').classList.add('hidden');
  try {
    if (document.pointerLockElement) document.exitPointerLock?.();
  } catch {}
  updateMouseModeUI();
  if (announce) {
    showToast('🖱️ 已释放鼠标指针 — 可直接点击「下一小节」与右侧高维操作台（再按 Tab 或点画面恢复掌控视角）');
  }
}

function resumeFirstPerson({ keyboardFallback = true } = {}) {
  if (!ready || ended) return;
  manualPauseRequested = false;
  audio.unlock();
  keyboardCorridor = keyboardFallback;
  rightDraggingLook = false;
  clearKeys();
  look.transition();
  $('menu').classList.add('hidden');
  try {
    worldCanvas.focus();
    const res = worldCanvas.requestPointerLock?.();
    Promise.resolve(res).catch(() => {});
  } catch {}
  updateHUD();
  updateMouseModeUI();
}

function toggleMouseControl() {
  if (!ready || ended) return;
  const menuVisible = !$('menu').classList.contains('hidden');
  if (menuVisible) {
    resumeFirstPerson({ keyboardFallback: true });
    return;
  }
  if (locked) {
    releaseMouseCursor({ announce: true });
  } else {
    resumeFirstPerson({ keyboardFallback: true });
  }
}

function toggleConsoleExpand() {
  consoleExpanded = !consoleExpanded;
  $('hyperConsole').classList.toggle('expanded', consoleExpanded);
  $('expandConsoleBtn').textContent = consoleExpanded ? 'F · 收起' : 'F · 展开';
  $('toggleConsoleSizeBtn').textContent = consoleExpanded ? 'F · 标准台' : 'F · 操作台';
  setTimeout(() => { godEngine.resize(); godScene._forceRender = true; }, 60);
}

$('start').onclick = () => resumeFirstPerson({ keyboardFallback: true });
$('pause').onclick = () => pause(true);
$('resetSecBtn').onclick = () => { selectSection(currentSection); resumeFirstPerson({ keyboardFallback: true }); };
$('toggleConsoleSizeBtn').onclick = toggleConsoleExpand;
$('expandConsoleBtn').onclick = toggleConsoleExpand;
if ($('mouseModeBtn')) $('mouseModeBtn').onclick = () => { audio.unlock(); toggleMouseControl(); };

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
  godCamera.alpha = -Math.PI * 0.5;
  godCamera.beta = currentSection === 6 ? 0.92 : 1.02;
  godCamera.radius = currentSection === 6 ? 12.4 : 13.6;
  godCamera.target.set(0, 0.45, 0);
  godScene._forceRender = true;
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
    godScene._forceRender = true;
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
  godScene._forceRender = true;
  updateHUD();
  refreshHighDimConsole();
};
$('godMoveFwd').onclick = () => {
  audio.unlock();
  if (currentSection === 6) { sokobanMove(0, 1, 0, 0); return; }
  stepGameplay(0, 0.55, 0);
  gait.step(0.55, 0.16, 2.8, false, false);
  godScene._forceRender = true;
  updateHUD();
  refreshHighDimConsole();
};
$('godMoveBack').onclick = () => {
  audio.unlock();
  if (currentSection === 6) { sokobanMove(0, -1, 0, 0); return; }
  stepGameplay(0, -0.55, 0);
  gait.step(0.55, 0.16, 2.8, false, false);
  godScene._forceRender = true;
  updateHUD();
  refreshHighDimConsole();
};
$('godMoveLeft').onclick = () => {
  audio.unlock();
  if (currentSection === 6) { sokobanMove(-1, 0, 0, 0); return; }
  stepGameplay(-0.55, 0, 0);
  gait.step(0.55, 0.16, 2.8, false, false);
  godScene._forceRender = true;
  updateHUD();
  refreshHighDimConsole();
};
$('godMoveRight').onclick = () => {
  audio.unlock();
  if (currentSection === 6) { sokobanMove(1, 0, 0, 0); return; }
  stepGameplay(0.55, 0, 0);
  gait.step(0.55, 0.16, 2.8, false, false);
  godScene._forceRender = true;
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
    updateMouseModeUI();
    return;
  }
  const wasLocked = locked;
  locked = acquired;
  if (locked) {
    keyboardCorridor = true;
    manualPauseRequested = false;
  } else if (wasLocked && !manualPauseRequested && !ended) {
    // Exiting pointer lock via Tab or Esc drops smoothly into Free-Cursor Mode (NO blocking #menu popup!)
    keyboardCorridor = true;
  }
  clearKeys();
  look.transition();
  lockTime = time;
  $('menu').classList.toggle('hidden', locked || keyboardCorridor || ended);
  updateMouseModeUI();
});

document.addEventListener('mousemove', e => {
  if (document.hidden) { look.transition(); return; }
  // When pointer-locked -> full 360° FPS mouse look.
  // When cursor is free -> NEVER spin camera on casual hover (so player can click UI/Console cleanly);
  // holding Right Mouse Button on #world lets player gently drag-pan camera without locking!
  if (locked || (keyboardCorridor && rightDraggingLook)) {
    look.push(e.movementX, e.movementY, sensitivity);
  } else {
    look.transition();
  }
});

document.addEventListener('mouseup', () => { rightDraggingLook = false; });

worldCanvas.addEventListener('mousedown', e => {
  audio.unlock();
  if (keyboardCorridor && !locked && e.target === worldCanvas) {
    if (e.button === 2) {
      rightDraggingLook = true;
      look.transition();
      return;
    }
    if (e.button === 0) {
      resumeFirstPerson({ keyboardFallback: true });
      return;
    }
  }
  if (!locked || time - lockTime < 0.15) return;
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
  godScene._forceRender = true;
  updateHUD();
  refreshHighDimConsole();
}, { passive: false });

document.addEventListener('keydown', e => {
  const tag = e.target?.tagName;
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;

  // Dedicated Tab / Alt key: instant toggle between Mouse-Look & Free Mouse Pointer!
  if ((e.code === 'Tab' || e.code === 'AltLeft' || e.code === 'AltRight') && !ended) {
    e.preventDefault();
    if (e.repeat) return;
    audio.unlock();
    toggleMouseControl();
    return;
  }

  if (e.code === 'Escape') {
    e.preventDefault();
    if (e.repeat) return;
    const menuVisible = !$('menu').classList.contains('hidden');
    if (menuVisible) {
      resumeFirstPerson({ keyboardFallback: true });
    } else if (locked) {
      releaseMouseCursor({ announce: true });
    } else {
      pause(true);
    }
    return;
  }
  if (e.code === 'KeyN' && !e.repeat && !ended && completedSections.has(currentSection)) {
    e.preventDefault();
    $('nextSecHudBtn').click();
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

window.addEventListener('blur', () => {
  rightDraggingLook = false;
  clearKeys();
});
window.addEventListener('resize', () => { fpEngine.resize(); godEngine.resize(); });

// ============================================================
// Main Dual-Scene Render Loop
// ============================================================
function waveVal(startT) {
  const elapsed = time - startT;
  return elapsed >= 0 && elapsed < 1.35 ? Math.sin((elapsed * Math.PI) / 1.35) : 0;
}

// Initialize Section 1 immediately (Sections 2..16 are lazily constructed on first visit!)
godCamera.alpha = -Math.PI * 0.5;
godCamera.beta = 1.02;
godCamera.radius = 13.6;
godCamera.target.set(0, 0.45, 0);
selectSection(1);
ready = true;
updateMouseModeUI();
window.__CH2_STATE__ = () => ({
  ready,
  locked,
  keyboardCorridor,
  currentSection,
  pos4: [...pos4],
  camY: fpCamera.position.y,
  linY: fpLinXia.root.position.y,
  chamberW0Y: fpChamberW0.root.position.y,
  chamberWPY: fpChamberWP.root.position.y,
  chamberWMY: fpChamberWM.root.position.y,
  w0Alpha: phaseClarity(pos4[3], 0.0, 1.55),
  wpAlpha: phaseClarity(pos4[3], 1.8, 1.55),
  wmAlpha: phaseClarity(pos4[3], -1.8, 1.55),
  w0Enabled: fpChamberW0.root.isEnabled(),
  wpEnabled: fpChamberWP.root.isEnabled()
});

function phaseClarity(pw, targetW, span = 1.55) {
  const t = Math.max(0, 1 - Math.abs(pw - targetW) / span);
  return t * t * (3 - 2 * t);
}

fpEngine.runRenderLoop(() => {
  const dt = Math.min(fpEngine.getDeltaTime() / 1000, 0.05);
  time += dt;

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
        godScene._forceRender = true;
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

  // Surrounding 4D cosmos dynamically sweeps & refracts as W changes (while player XYZ stays stationary!)
  fpCosmos.rotation.y = pw * 0.52 + time * 0.04;
  fpCosmos.rotation.z = pw * 0.22;
  cosmicRings.forEach((r, idx) => {
    r.rotation.y = time * (0.08 + idx * 0.03) * (idx % 2 === 0 ? 1 : -1) + pw * (0.45 + idx * 0.25);
    r.rotation.x = (idx * Math.PI) / 3.2 + pw * 0.35 + time * 0.03;
  });

  // Update First-Person Camera & Local Voxel Astronaut Body (XYZ strictly untouched by W!)
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
  if (fpS8Mirror.playerKey) {
    fpS8Mirror.playerKey.root.setEnabled(currentSection === 8 && !s8CombinedKey);
    fpS8Mirror.playerKey.root.scaling.x = s8SwappedMirror ? -1 : 1;
  }

  // Co-Located 3D W-Axis Spatial Slices: ALL anchored at Y = 0; morph & cross-fade by W opacity in-place!
  const showStdChambers = currentSection !== 6;
  const c0 = phaseClarity(pw, 0.0, 1.55);
  const cP = phaseClarity(pw, 1.8, 1.55);
  const cM = phaseClarity(pw, -1.8, 1.55);

  const applySliceChamber = (ch, clarity, yBias) => {
    const visible = showStdChambers && clarity > 0.02;
    ch.root.setEnabled(visible);
    if (!visible) return;
    ch.setLayerOpacity(clarity);
    // Keep Y strictly fixed at 0; subtle horizontal phase ripple gives physical sensation of surrounding W-slice drifting!
    ch.root.position.y = yBias;
    const ripple = 1 + (1 - clarity) * 0.045;
    ch.root.scaling.set(ripple, 1, ripple);
    if (ch.deckTex) {
      ch.deckTex.uOffset = pw * 0.14;
      ch.deckTex.vOffset = pw * 0.08;
    }
  };
  applySliceChamber(fpChamberW0, c0, 0.000);
  applySliceChamber(fpChamberWP, cP, 0.004);
  applySliceChamber(fpChamberWM, cM, -0.004);

  // Companion Lin Xia (07) Presence Rule: NEVER show a meaningless figurine when hasCompanion is false!
  const meta = CHAPTER2_SECTIONS[currentSection - 1];
  fpLinXia.root.setEnabled(meta.hasCompanion && currentSection !== 15);
  if (currentSection !== 14) {
    fpLinXia.root.scaling.set(1, 1, 1);
  }

  let promptHtml = `按 <kbd>Q</kbd> / <kbd>E</kbd> 沿 W 轴透明穿梭（XYZ 不动） · 按 <kbd>Tab</kbd> 释放鼠标点操作台/下一节`;

  if (currentSection === 1) {
    // Lin Xia stands at the EXACT same Y = 0 elevation in front of you, phasing from faint ghost into solid!
    fpLinXia.setAlpha(Math.max(0.14, cP));
    fpLinXia.pose({
      position: [-1.2, 0, 0.8],
      yaw: Math.atan2(px + 1.2, pz - 0.8),
      waveLeft: 0.6 + Math.sin(time * 4.5) * 0.35,
      waveRight: cWR,
      breatheTime: time
    });
    promptHtml = Math.abs(pw - 1.8) > 0.45
      ? `原地保持 XYZ 不动 · 按住 <kbd>E</kbd> 沿 W 轴切入 W = +1.8 流金折页，看林夏由透明渐实（<kbd>Tab</kbd> 释放鼠标）`
      : `已切入 W = +1.8 流金折页！走向身前的林夏与她汇合`;
  } else if (currentSection === 2) {
    // All 3 bridge segments stay at fixed floor elevation Y = 0.02 and materialize/fade by W opacity!
    fpS2Bridges.seg0.position.y = 0.02;
    fpS2Bridges.segWP.position.y = 0.02;
    fpS2Bridges.segWM.position.y = 0.02;
    fpS2Bridges.seg0.material.alpha = 0.14 + 0.86 * c0;
    fpS2Bridges.segWP.material.alpha = 0.14 + 0.86 * cP;
    fpS2Bridges.segWM.material.alpha = 0.14 + 0.86 * cM;
    fpLinXia.setAlpha(Math.max(0.16, c0));
    fpLinXia.pose({
      position: [0, 0, 2.7],
      yaw: Math.atan2(px, pz - 2.7),
      waveRight: 0.65 + Math.sin(time * 4) * 0.3,
      breatheTime: time
    });
    promptHtml = !s2Bridges.has('wp')
      ? `按 <kbd>E</kbd> 切入 W = +1.8 使前方透明流金桥实体化并向前走`
      : !s2Bridges.has('wm')
        ? `按 <kbd>Q</kbd> 切入 W = −1.8 使北段星轨桥实体化继续前进`
        : `按 <kbd>E</kbd> 切回 W = 0.0 走上终点甲板与林夏汇合`;
  } else if (currentSection === 3) {
    // Monument Valley 4D Rotating Bridge & Dual-Switch Sanctuary (ALL fixed at true elevation; W fades opacity!)
    fpS3Monument.southTerrace.position.y = -0.16;
    fpS3Monument.midTerrace.position.y = -0.16;
    fpS3Monument.cyanSwitch.position.y = 0.08;
    fpS3Monument.turntableRoot.position.y = 0;
    fpS3Monument.crankWheel.position.y = 0.95;
    fpS3Monument.crankWheel.rotation.x = (sim3Monument.bridgeAngleDeg * Math.PI) / 180;
    fpS3Monument.spireRoot.position.y = 0;

    // Cross-fade W=0 sanctuary vs W=+1.8 spire sanctuary in-place!
    const w0Alpha = 0.16 + 0.84 * c0;
    const wPAlpha = 0.18 + 0.82 * cP;
    fpS3Monument.coralMat.alpha = w0Alpha;
    fpS3Monument.ivoryMat.alpha = w0Alpha;
    fpS3Monument.cyanMat.alpha = w0Alpha;
    fpS3Monument.spireGoldMat.alpha = wPAlpha;
    fpS3Monument.spireCoralMat.alpha = wPAlpha;
    fpS3Monument.spireIvoryMat.alpha = wPAlpha;

    const targetRotY = sim3Monument.isBridgeAligned ? 0 : Math.PI / 2;
    fpS3Monument.turntableRoot.rotation.y += (targetRotY - fpS3Monument.turntableRoot.rotation.y) * Math.min(1, dt * 8);
    fpS3Monument.goldMat.alpha = sim3Monument.isBridgeAligned ? w0Alpha : w0Alpha * 0.42;
    fpS3Monument.spireStair.setEnabled(sim3Monument.spireStairRaised);
    fpS3Monument.spireStair.position.y = 1.22;

    fpLinXia.setAlpha(Math.max(0.18, cP));
    fpLinXia.pose({
      position: [0.55, 0, 1.95],
      yaw: Math.atan2(px - 0.55, pz - 1.95),
      waveLeft: sim3Monument.spireStairRaised ? 0.85 : 0.45 + Math.sin(time * 4) * 0.25,
      breatheTime: time
    });
    promptHtml = !sim3Monument.isBridgeAligned
      ? `按 <kbd>R</kbd> 旋转【纪念碑谷四维转盘】90°（XW 平面）接通眼前断渊`
      : !sim3Monument.cyanSwitchPressed
        ? `天桥已接通！向前走踩下中央【青色踏板】触发林夏共鸣`
        : `跨维光桥已开启！按 <kbd>E</kbd> 沿 W 轴切入 W = +1.8 流金折页与林夏汇合`;
  } else if (currentSection === 4) {
    // Glass cage, Lin Xia & Core remain strictly at Y = 0; W-phase dissolves the glass walls transparently!
    const inW0 = Math.abs(pw) <= VAULT_SPEC.wallHalfW + 0.25;
    fpS4Prison.box.material.alpha = 0.06 + 0.42 * c0;
    fpS4Prison.frame.material.alpha = 0.14 + 0.68 * c0;
    fpLinXia.setAlpha(Math.max(0.16, c0));
    fpLinXia.pose({
      position: [-0.4, 0, 0.3],
      yaw: Math.atan2(px + 0.4, pz - 0.3),
      waveLeft: sim4Vault.coreDelivered ? 0.8 : 0.45 + Math.sin(time * 5) * 0.3,
      breatheTime: time
    });
    if (sim4Vault.carryingCore) {
      fpS4Prison.core.position.set(px + Math.sin(look.yaw) * 0.6, eyeY - 0.3, pz + Math.cos(look.yaw) * 0.6);
      fpS4Prison.core.material.alpha = 1.0;
    } else {
      fpS4Prison.core.position.set(sim4Vault.corePos[0], 1.0 + Math.sin(time * 3) * 0.08, sim4Vault.corePos[2]);
      fpS4Prison.core.material.alpha = 0.22 + 0.78 * c0;
    }
    fpS4Prison.core.rotation.y = time * 1.8;
    promptHtml = !sim4Vault.carryingCore && !sim4Vault.coreDelivered
      ? (inW0
          ? `玻璃牢笼在 W=0 六面封死 · 按 <kbd>E</kbd> 切入 W=+1.8 让玻璃墙透明淡出后直接走入`
          : `玻璃墙已在 W=+1.8 虚化！走到林夏身旁按 <kbd>Q</kbd> 切回 W=0 拿起核心`)
      : `已拿到核心！按 <kbd>E</kbd> 切相穿过玻璃墙送到右侧接收台 (X = +2.5)`;
  } else if (currentSection === 5) {
    const inGap = pw < -1.25;
    fpS5Wall.rightSolid.setEnabled(!inGap);
    if (fpS5Wall.rightSolid.material) fpS5Wall.rightSolid.material.alpha = Math.max(0.10, 1 - cM * 0.92);
    fpS5Wall.goalBeacon.rotation.z = time * 0.9;
    promptHtml = !s5PassedWall
      ? (inGap ? `右侧屏障已在 W=−1.8 淡出！从右侧缺口穿过赤红超墙` : `赤红超墙横跨 W=0 与 W=+1.8 · 按住 <kbd>Q</kbd> 切入 W = −1.8 星轨折页让右侧缺口显现`)
      : `已穿过超墙！按 <kbd>E</kbd> 切回 W = 0.0 走向北侧光环`;
  } else if (currentSection === 6) {
    fpS6Sokoban.sync(sim6Sokoban, time);
    promptHtml = sim6Sokoban.complete
      ? `4×4×2×4 四维推箱已归位至 (3,4,2,4)！按 <kbd>Tab</kbd> 释放鼠标点下一小节或按 <kbd>N</kbd>`
      : sim6Sokoban.is3DDeadlocked(0)
        ? `⚠ W=3 墙角死锁！按 <kbd>Q</kbd>/<kbd>C</kbd> 切至 W=2 绕后，按 <kbd>E</kbd> 跨维推箱 · 按 <kbd>X</kbd> 切 XYZ⇄XYW`
        : `<kbd>WASD</kbd> 推箱 · <kbd>E</kbd>/<kbd>Q</kbd>(<kbd>C</kbd>) 跨第四维 W · <kbd>X</kbd> 切换 XYZ⇄XYW · <kbd>Z</kbd> 撤销 · <kbd>Tab</kbd> 释放鼠标`;
  } else if (currentSection === 7) {
    // Interlocked Rings stay at the EXACT same Y = 1.5 height; Ring A fades as Ring B shifts along W!
    const S = fpS7Rings.SCALE;
    fpS7Rings.ringB.position.x = sim7Rings.bx * S;
    fpS7Rings.ringB.position.y = 1.5;
    fpS7Rings.ringA.material.alpha = Math.max(0.14, 1 - Math.abs(sim7Rings.bw) * 0.62);
    promptHtml = Math.abs(sim7Rings.bw) < 0.45
      ? `两只实心巨环在 W=0 互扣 · 先按 <kbd>E</kbd> 将金色巨环沿 W 轴切入 W = +1.4（青环变透明）`
      : sim7Rings.bx < RING_SPEC.unlinkedBX
        ? `青环已透明错相！按 <kbd>D</kbd> 推着金色巨环直接穿过青环边缘`
        : `已无损穿过青环！按 <kbd>Q</kbd> 切回 W = 0.0 完成解链`;
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
      c.mesh.material.alpha = 0.14 + 0.86 * phaseClarity(pw, c.wTarget, 1.6);
    }
    promptHtml = `四维超球原地切面半径 ${sl.radius.toFixed(1)}m · 切入 W=−1.8 / 0.0 / +2.2 采集三枚晶簇 (${s9Crystals.size}/3)`;
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
    promptHtml = `当前切面形态：【${f.name}】 · 原地按 <kbd>Q</kbd> / <kbd>E</kbd> 切过三个 W 折页激活三种多面体 (${s10Forms.size}/3)`;
  } else if (currentSection === 11) {
    const st = hyperTorusSliceState(pw);
    fpS11Torus.islandL.setEnabled(!st.merged);
    fpS11Torus.islandR.setEnabled(!st.merged);
    fpS11Torus.mergedBridge.setEnabled(st.merged);
    if (!st.merged) {
      fpS11Torus.islandL.position.set(-st.islandOffset, -0.05, 0.2);
      fpS11Torus.islandR.position.set(st.islandOffset, -0.05, 0.2);
    }
    fpLinXia.setAlpha(Math.max(0.18, c0));
    fpLinXia.pose({
      position: [1.65, 0, 0.2],
      yaw: Math.atan2(px - 1.65, pz - 0.2),
      waveLeft: 0.6 + Math.sin(time * 4) * 0.3,
      breatheTime: time
    });
    promptHtml = !st.merged
      ? (s11CrossedBridge ? `已抵达右岛！走近林夏完成汇合` : `两座浮岛在 W=0 被深渊隔开 · 按 <kbd>E</kbd> 切入 W=+1.8 让超环面原地融合成桥`)
      : `两岛已原地融合成环形天桥！走到右侧 (X > +1.2) 再按 <kbd>Q</kbd> 切回 W=0 与林夏汇合`;
  } else if (currentSection === 12) {
    for (const n of fpS12Rotor.nodes) {
      const r4 = cliffordDoubleRotate4D(n.v4, time * 0.75);
      const d = 3.2 / (3.2 - r4[3]);
      n.mesh.position.set(r4[0] * d * 1.45, 1.55 + r4[1] * d * 0.95, 0.4 + r4[2] * d * 1.45);
      n.mesh.rotation.y = time * 1.4;
    }
    for (const c of fpS12Rotor.coreTargets) {
      c.mesh.setEnabled(!s12Cores.has(c.id));
      c.mesh.material.alpha = 0.14 + 0.86 * phaseClarity(pw, c.wTarget, 1.6);
    }
    promptHtml = `四维双旋星轮由内向外翻滚中 · 切入 W=0 / +1.8 / −1.8 捕获三枚曲率核心 (${s12Cores.size}/3)`;
  } else if (currentSection === 13) {
    // Three-Body 4D Fragment: ALL 3 nested cruiser hulls stay at Y = 1.25; W-phase cross-fades outer→mid→inner in-place!
    sim13ThreeBody.stepBubbleDrain(dt * 0.15);
    const bubScale = sim13ThreeBody.bubbleRadius / 4.2;
    fpS13Fragment.bubble.scaling.setAll(bubScale);
    fpS13Fragment.bubble.rotation.y = time * 0.12;
    fpS13Fragment.tombRing.rotation.z = time * 0.35;
    fpS13Fragment.tombEye.rotation.y = -time * 1.4;

    const unfolded = sim13ThreeBody.hullUnfolded4D;
    fpS13Fragment.outerHull.position.y = 1.25;
    fpS13Fragment.midHull.position.y = 1.25;
    fpS13Fragment.innerHull.position.y = 1.25;
    fpS13Fragment.outerHullMat.wireframe = unfolded && cM < 0.45;
    fpS13Fragment.midHullMat.wireframe = unfolded && c0 < 0.45;
    fpS13Fragment.outerHullMat.alpha = unfolded ? 0.10 + 0.65 * cM : 0.92;
    fpS13Fragment.midHullMat.alpha = unfolded ? 0.12 + 0.68 * c0 : 0.85;
    fpS13Fragment.innerHullMat.alpha = unfolded ? 0.16 + 0.78 * cP : 0.88;

    for (const c of fpS13Fragment.cores) {
      const done = sim13ThreeBody.coresExtracted[c.idx];
      c.mesh.setEnabled(!done);
      c.mesh.position.set(c.pos[0], 1.25 + Math.sin(time * 2.6 + c.idx) * 0.08, c.pos[2]);
      c.mesh.rotation.y = time * 2.1;
      c.mesh.material.alpha = unfolded ? 0.14 + 0.86 * phaseClarity(pw, c.wTarget, 1.55) : 0.32;
    }

    fpLinXia.setAlpha(Math.max(0.22, c0));
    fpLinXia.pose({
      position: [-1.15, 0, -1.25],
      yaw: Math.atan2(px + 1.15, pz + 1.25),
      waveLeft: 0.4 + Math.sin(time * 3.5) * 0.25,
      breatheTime: time
    });

    const cnt13 = sim13ThreeBody.coresExtracted.filter(Boolean).length;
    promptHtml = !sim13ThreeBody.ringContacted
      ? `走近左侧发光青铜巨环【魔戒】聆听四维墓地遗言 · 或按 <kbd>R</kbd> 通讯`
      : !unfolded
        ? `战舰三层装甲封死 · 按 <kbd>R</kbd> 开启【四维原位全透视】，随 W 相位逐层淡出装甲！`
        : `战舰已进入四维原位透视！按 <kbd>Q</kbd>/<kbd>E</kbd> 切过 W=−1.8 / 0.0 / +1.8 提取量子核心 (${cnt13}/3)`;
  } else if (currentSection === 14) {
    // Yun Tianming's Three Fairy Tales: Canvas, wake, Lin Xia & 3 pins stay at true Y; pins fade by W phase!
    fpS14Fairy.canvasMesh.position.y = 1.55;
    fpS14Fairy.wakeRibbon.position.y = 0;

    const dwPos = fpS14Fairy.deepWaterBeacon.position;
    const dist3D = Math.max(0.8, Math.hypot(px - dwPos.x, eyeY - dwPos.y, pz - dwPos.z));
    const apparentFactor = sim14Fairy.deepWaterConstantApparentSize(dist3D, Math.abs(pw));
    fpS14Fairy.deepWaterBeacon.scaling.setAll(dist3D * 0.22 * apparentFactor);
    fpS14Fairy.deepWaterBeacon.rotation.y = time * 1.2;

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

    for (const p of fpS14Fairy.pins) {
      const unlocked = sim14Fairy.pinsUnlocked[p.idx];
      p.mesh.setEnabled(!unlocked);
      p.mesh.position.set(p.pos[0], 1.25 + Math.sin(time * 3 + p.idx) * 0.08, p.pos[2]);
      p.mesh.rotation.y = time * 1.7;
      p.mesh.material.alpha = 0.14 + 0.86 * phaseClarity(pw, p.wTarget, 1.55);
    }

    fpLinXia.setAlpha(Math.max(0.32, c0));
    if (!sim14Fairy.linUnfoldedFromCanvas) {
      fpLinXia.root.scaling.set(1, 1, sim14Fairy.linCanvasThickness); // 0.02 paper-thin 2D!
      fpLinXia.pose({
        position: [0, 0.45, 2.48],
        yaw: Math.PI,
        waveLeft: 0.75 + Math.sin(time * 6) * 0.2,
        waveRight: 0.75 + Math.cos(time * 6) * 0.2,
        breatheTime: time
      });
    } else {
      const curZ = fpLinXia.root.scaling.z;
      fpLinXia.root.scaling.set(1, 1, curZ + (1.0 - curZ) * Math.min(1, dt * 4));
      fpLinXia.pose({
        position: [0, 0, 1.85],
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
        ? `旋转伞已张开！追随不随距离缩小的【深水信标】，在 W=−1.8 / 0.0 / +1.8 折页拔除定画针 (${pCnt14}/3)`
        : `林夏已成功离开二维画纸重回三维立体世界！按 <kbd>Tab</kbd> 释放鼠标点下一节或按 <kbd>N</kbd>`;
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
      promptHtml = `林夏已完全康复！按 <kbd>Tab</kbd> 释放鼠标点下一小节（或按 <kbd>N</kbd>）前往最终方舟之心`;
    }
  } else if (currentSection === 16) {
    if (fpS16Ark.arkTesseract) {
      fpS16Ark.arkTesseract.set4DAngle(-time * 0.55);
    } else {
      fpS16Ark.fallbackOuter.rotation.y = time * 0.55;
      fpS16Ark.fallbackInner.rotation.y = -time * 0.85;
      fpS16Ark.fallbackInner.rotation.x = time * 0.45;
    }
    fpLinXia.setAlpha(1);
    fpLinXia.pose({
      position: [1.15, 0.3, 0.8],
      yaw: Math.atan2(px - 1.15, pz - 0.8),
      waveLeft: 0.65,
      waveRight: 0.65,
      breatheTime: time
    });
    promptHtml = `与林夏并肩走上前方主控台（或按 <kbd>R</kbd>），折叠八胞空间站，觉醒四维方舟之心！`;
  }

  // Smooth continuous W-phase lighting & atmospheric fog morphing (Sapphire ↔ Cyan ↔ Gold)
  const wNorm = Math.max(-1, Math.min(1, pw / 1.8));
  if (wNorm >= 0) {
    fpAccentLight.diffuse.set(0.30 + wNorm * 0.68, 0.92 - wNorm * 0.14, 0.84 - wNorm * 0.52);
    fpScene.fogColor.set(0.024 + wNorm * 0.056, 0.062 + wNorm * 0.008, 0.102 - wNorm * 0.054);
  } else {
    const m = -wNorm;
    fpAccentLight.diffuse.set(0.30 + m * 0.06, 0.92 - m * 0.26, 0.84 + m * 0.16);
    fpScene.fogColor.set(0.024 - m * 0.010, 0.062 - m * 0.020, 0.102 + m * 0.038);
  }
  fpAccentLight.position.set(px * 0.4, 2.7, pz * 0.4 + 0.5);

  const promptEl = $('ch2Prompt');
  if (promptEl) {
    if (promptEl._lastHtml !== promptHtml) {
      promptEl._lastHtml = promptHtml;
      promptEl.innerHTML = promptHtml;
    }
    promptEl.classList.toggle('show', (locked || keyboardCorridor) && !ended);
  }

  fpScene.render();

  // ============================================================
  // Update Always-Live High-Dimensional Tactical Console (#labCanvas) — Horizontal W-Axis Expansion!
  // ============================================================
  godFrameCounter = (godFrameCounter + 1) % 3;
  const shouldRenderGod = (godFrameCounter === 0 && (locked || keyboardCorridor)) || !ready || godScene._forceRender;
  if (shouldRenderGod) {
    godScene._forceRender = false;
    const isSokoban = currentSection === 6;
    godStandardRoot.setEnabled(!isSokoban);
    godSokobanRig.root.setEnabled(isSokoban);

    if (isSokoban) {
      godSokobanRig.sync(sim6Sokoban, time);
    } else {
      const godWX = pw * GOD_W_SCALE;
      godActiveChamber.root.position.set(godWX, 0, 0);

      godPlayerVoxel.pose({
        position: [godWX + px * 0.34, 0, pz * 0.34],
        yaw: look.yaw,
        leftLegAngle: locomotion.leftLeg,
        rightLegAngle: locomotion.rightLeg,
        waveLeft: wL,
        waveRight: wR,
        mirrorX: currentSection === 8 && s8SwappedMirror,
        breatheTime: time
      });

      godLinVoxel.root.setEnabled(meta.hasCompanion);
      if (meta.hasCompanion) {
        let linW = 0.0, linX = 0.5, linZ = 0.5, linY = 0;
        if (currentSection === 1) { linW = 1.8; linX = -0.45; linZ = 0.3; }
        else if (currentSection === 2) { linW = 0.0; linX = 0; linZ = 0.95; }
        else if (currentSection === 3) { linW = 1.8; linX = 0.25; linZ = 0.72; }
        else if (currentSection === 4) { linW = 0.0; linX = -0.18; linZ = 0.15; }
        else if (currentSection === 8) { linW = 0.0; linX = 0.35; linZ = 0.85; }
        else if (currentSection === 11) { linW = 0.0; linX = 0.65; linZ = 0.12; }
        else if (currentSection === 13) { linW = 0.0; linX = -0.45; linZ = -0.55; }
        else if (currentSection === 14) { linW = 0.0; linX = 0; linY = 0.20; linZ = 0.95; }
        else if (currentSection === 15) { linW = 0.0; linX = 0; linY = 0.20; linZ = 0.15; }
        else if (currentSection === 16) { linW = 0.0; linX = 0.45; linZ = 0.35; }

        godLinVoxel.root.scaling.set(
          GOD_VOXEL_SCALE,
          GOD_VOXEL_SCALE,
          currentSection === 14 && !sim14Fairy.linUnfoldedFromCanvas ? GOD_VOXEL_SCALE * 0.04 : GOD_VOXEL_SCALE
        );
        godLinVoxel.pose({
          position: [linW * GOD_W_SCALE + linX, linY, linZ],
          yaw: Math.PI,
          waveLeft: 0.5 + Math.sin(time * 4) * 0.25,
          tiltZRad: currentSection === 15 ? s15CurveW * 0.35 : 0,
          breatheTime: time
        });
      }

      godMonumentBridge.setEnabled(currentSection === 3);
      godMonumentStair.setEnabled(currentSection === 3 && sim3Monument.spireStairRaised);
      if (currentSection === 3) {
        godMonumentBridge.position.set(0, 0.12, -0.18);
        godMonumentBridge.rotation.y = sim3Monument.isBridgeAligned ? 0 : Math.PI / 2;
        godMonumentStair.position.set(GOD_W_SCALE * 0.9, 0.16, 0.65);
      }

      godVaultBox.setEnabled(currentSection === 4);
      if (currentSection === 4) godVaultBox.position.set(0, GOD_CHAMBER_H * 0.45, 0);

      godHyperWall.setEnabled(currentSection === 5);
      if (currentSection === 5) godHyperWall.position.set(GOD_W_SCALE * 0.9, GOD_CHAMBER_H * 0.45, 0.15);

      godRingA.setEnabled(currentSection === 7);
      godRingB.setEnabled(currentSection === 7);
      if (currentSection === 7) {
        godRingA.position.set(0, 0.65, 0);
        godRingB.position.set(sim7Rings.bw * GOD_W_SCALE + sim7Rings.bx * 0.38, 0.65, 0);
      }

      const showTrue4D = [9, 10, 11, 12, 16].includes(currentSection);
      godTrue4DPillar.setEnabled(showTrue4D);
      godTrue4DSphere.setEnabled(showTrue4D);
      if (showTrue4D) {
        const sl = hypersphereSlice(pw);
        godTrue4DSphere.position.set(godWX, 0.65, 0);
        godTrue4DSphere.scaling.setAll(Math.max(0.25, sl.exists ? sl.radius * 0.48 : 0.28));
        godTrue4DSphere.rotation.y = time * 0.8;
      }

      godTombRing.setEnabled(currentSection === 13);
      godShipHulls.forEach((hull, idx) => {
        hull.setEnabled(currentSection === 13);
        if (currentSection === 13) {
          const wX = sim13ThreeBody.hullUnfolded4D ? (idx - 1) * 1.8 * GOD_W_SCALE : 0;
          hull.position.set(wX + 0.35, 0.48, 0.35);
        }
      });

      godCanvasPlane.setEnabled(currentSection === 14);
      godUmbrella.setEnabled(currentSection === 14);
      if (currentSection === 14) {
        godUmbrella.position.set(godWX + px * 0.34, 1.15, pz * 0.34);
        godUmbrella.rotation.y = time * (sim14Fairy.umbrellaSpinning ? 5.0 : 0.6);
        godUmbrella.scaling.setAll(sim14Fairy.umbrellaSpinning ? 1.0 : 0.45);
      }
    }

    godScene.render();
    drawVolumetricStackGauge(pw);
  }

  if (time - lastStatsUpdate > 0.25) {
    lastStatsUpdate = time;
    const rawFps = fpEngine.getFps();
    const fps = Number.isFinite(rawFps) ? Math.min(240, Math.round(rawFps)) : 60;
    $('stats').textContent = `${fps} FPS · ${locked ? '🔒 视角锁定（按 Tab 释放鼠标）' : keyboardCorridor ? '🖱️ 鼠标已释放（按 Tab 掌控视角）' : '暂停'} · W 轴折页联动`;
  }
});
