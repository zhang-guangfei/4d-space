/**
 * Beyond 3D — Chapter 2: 《折页之间》——「离开画纸的人」
 *
 * Upgraded 8-Section Large-Arena Interactive 4D Puzzle Campaign:
 *  - Grand 20m × 20m × 7.6m co-located W-axis halls (stationary XYZ + opacity phase morphing!)
 *  - Mouse-Wheel-First W-axis shifting everywhere (zero Q/E prompts; Q/E kept silently as fallback)
 *  - Built-in Mandarin Chinese Character Voiceover (Lin Xia 07 + Narrator via voice.js)
 *  - Dedicated Tab / Alt mouse pointer release ⇄ capture toggle
 *  - Sec 01: 隔页的呼救 (20m hall stationary-XYZ W-axis intro)
 *  - Sec 02: 六阶跨维天梯 (Fixed invisible cyan bridge bug! 6 elevated jumping steps with always-visible holographic frames)
 *  - Sec 03: 折页棱镜 (Brand-new 3-slice 4D laser beam & W-Well optical puzzle)
 *  - Sec 04: 绝密玻璃牢笼 (20m hall sealed glass vault bypass along W)
 *  - Sec 05: 四维多墙立体迷宫 (5×5 3-slice multi-wall 4D labyrinth — impossible in any single W slice!)
 *  - Sec 06: 四维吃豆 & 四维推箱子 7 关合集 (BV1yY9AYxEGp?p=3: 3 Eat-Dots + 4 Sokoban, WASD+Space+Ctrl/Shift+Wheel+MouseOrbit)
 *  - Sec 07: 三环拓扑解链阵 (Dual movable rings + W-phase lock pillars brain-teaser)
 *  - Sec 08: 手性反转：四维 XW 翻面锁 (True rigid 4D XW 180° flip + 2D paper-cutout flip analogy + 3D rotation impossibility proof)
 */
import { LookController } from './look.js';
import { GroundGait } from './grounded-motion.js';
import { SpaceAudio } from './sound.js';
import { CharacterVoice } from './voice.js';
import { createVoxelAstronaut } from './voxel-astronaut.js';
import {
  CHAMBER_SIZE, CHAMBER_H, ARENA_HALF, PLAYER_RADIUS,
  formatCoord4D, phaseClarity,
  SEC2_STEPS, SixStepAscentSimulation,
  PRISM_SPEC, PrismLaserSimulation,
  VAULT_SPEC, VaultSimulation,
  MAZE4D_SPEC, mazeCellCenter, HyperMaze4DSimulation,
  ARCADE_4D_LEVELS, HyperGridArcadeSimulation,
  TRIPLE_RING_SPEC, TripleRingUnlinkSimulation,
  CHIRAL_KEY_VERTICES, CHIRAL_LOCK_VERTICES, ChiralFlip4DSimulation,
  CHAPTER2_SECTIONS
} from './chapter2-core.js';

const B = window.BABYLON;
const $ = id => document.getElementById(id);
const worldCanvas = $('world');
const labCanvas = $('labCanvas');
const volStackCanvas = $('volStackCanvas');
const volCtx = volStackCanvas?.getContext('2d');

const look = new LookController();
const gait = new GroundGait();
const audio = new SpaceAudio();
const voice = new CharacterVoice(audio);

const TOTAL_SECTIONS = CHAPTER2_SECTIONS.length; // 8 core puzzle sections

// ============================================================
// Global Campaign & Physics State
// ============================================================
let ready = false;
let locked = false;
let keyboardCorridor = false;
let manualPauseRequested = false;
let rightDraggingLook = false;
let ended = false;
let consoleExpanded = false;
let sensitivity = 1.0;
let time = 0;
let lockTime = 0;
let lastStatsUpdate = -1;
let godFrameCounter = 0;

let currentSection = 1;
const completedSections = new Set();
let pos4 = [0, 0, -6.2, 0.0]; // [x, footY, z, w]
let targetW = 0.0;
let playerVy = 0.0;
let playerGrounded = true;
let keys = new Set();
let jumpQueued = false;
let gesture = { left: -10, right: -10 };
let compGesture = { left: -10, right: -10 };
let locomotion = { leftLeg: 0, rightLeg: 0 };

// Section 06 dedicated 3D orbit camera angles (drag mouse to rotate view!)
let arcadeCamYaw = -0.45;
let arcadeCamPitch = 0.72;
let arcadeCamRadius = 15.8;
let arcadeDragging = false;
let lastWheelStepMs = 0;

// Section-specific simulations
let s1Met = false;
const sim2Steps = new SixStepAscentSimulation();
const sim3Prism = new PrismLaserSimulation();
const sim4Vault = new VaultSimulation();
const sim5Maze = new HyperMaze4DSimulation();
const sim6Arcade = new HyperGridArcadeSimulation('pac1');
const sim7Rings = new TripleRingUnlinkSimulation();
const sim8Chiral = new ChiralFlip4DSimulation();

// Inject theme quote, Sec 06 7-level switcher bar, and telemetry strip cleanly
const themeQuoteEl = document.createElement('p');
themeQuoteEl.id = 'secThemeQuote';
themeQuoteEl.className = 'ch2-theme-quote';
const secTitleEl = $('secTitle');
if (secTitleEl && secTitleEl.parentNode) {
  secTitleEl.insertAdjacentElement('afterend', themeQuoteEl);
}

const arcadeBarEl = document.createElement('div');
arcadeBarEl.id = 'arcadeLevelBar';
arcadeBarEl.className = 'ch2-arcade-bar hidden';
document.body.appendChild(arcadeBarEl);

const telemetryBadgeEl = document.createElement('div');
telemetryBadgeEl.id = 'sokobanCoordBadge';
telemetryBadgeEl.className = 'ch2-sokoban-badge hidden';
document.body.appendChild(telemetryBadgeEl);

// ============================================================
// UI Feedback Helpers (Toasts, Dialogue + Voiceover, Phase Flash)
// ============================================================
let toastTimer = null;
function showToast(msg, duration = 4200) {
  const el = $('ch2Toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), duration);
}

function setDialogue(speaker, text, { speak = true, forceVoice = false } = {}) {
  $('speakerName').textContent = speaker;
  $('dialogueText').textContent = text;
  if (speak) {
    const persona = /林夏/.test(speaker) ? 'linxia' : 'narrator';
    voice.speak(text, { persona, force: forceVoice });
  }
}

let wFxTimer = null;
function pulseWShiftFx(w) {
  const fx = $('wShiftFx');
  if (!fx) return;
  const col = w > 0.6 ? 'rgba(247, 195, 70, 0.34)' : w < -0.6 ? 'rgba(88, 166, 255, 0.34)' : 'rgba(77, 230, 211, 0.30)';
  fx.style.boxShadow = `inset 0 0 85px 14px ${col}`;
  fx.classList.add('active');
  if (wFxTimer) clearTimeout(wFxTimer);
  wFxTimer = setTimeout(() => fx.classList.remove('active'), 260);
}

// ============================================================
// Procedural PBR Textures & Reusable Materials
// ============================================================
function createGridDeckTexture(scene, primaryHex, bgHex, accentHex) {
  const tex = new B.DynamicTexture(`deck_${primaryHex}`, { width: 512, height: 512 }, scene, true);
  const ctx = tex.getContext();
  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, 512, 512);

  // Subtle architectural panel grid
  ctx.strokeStyle = primaryHex;
  ctx.globalAlpha = 0.24;
  ctx.lineWidth = 2;
  for (let i = 0; i <= 512; i += 64) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke();
  }
  ctx.strokeStyle = accentHex;
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 3;
  ctx.strokeRect(4, 4, 504, 504);
  ctx.globalAlpha = 1;
  tex.update();
  tex.wrapU = B.Texture.WRAP_ADDRESSMODE;
  tex.wrapV = B.Texture.WRAP_ADDRESSMODE;
  tex.uScale = 5;
  tex.vScale = 5;
  return tex;
}

function makeMat(scene, name, hex, { alpha = 1, emissive = 0.16, specular = 0.32, specPow = 42, unlit = false, wireframe = false, depthPrePass = false } = {}) {
  const m = new B.StandardMaterial(name, scene);
  m.diffuseColor = B.Color3.FromHexString(hex);
  m.emissiveColor = m.diffuseColor.scale(emissive);
  m.specularColor = new B.Color3(specular, specular, specular);
  m.specularPower = specPow;
  m.alpha = alpha;
  m.disableLighting = unlit;
  m.wireframe = wireframe;
  m.needDepthPrePass = depthPrePass;
  m.backFaceCulling = alpha >= 0.99;
  return m;
}

// ============================================================
// Shared Grand 20m Observatory Chamber Builder (Co-Located W Slices)
// ============================================================
function createGrandChamberSlice(scene, prefix, { size = CHAMBER_SIZE, height = CHAMBER_H, primaryHex, bgHex, accentHex, isGod = false } = {}) {
  const root = new B.TransformNode(`${prefix}_root`, scene);
  const deckTex = isGod ? null : createGridDeckTexture(scene, primaryHex, bgHex, accentHex);

  const deckMat = new B.StandardMaterial(`${prefix}_deckMat`, scene);
  deckMat.diffuseColor = B.Color3.FromHexString(isGod ? primaryHex : '#d4ecec');
  if (deckTex) deckMat.diffuseTexture = deckTex;
  deckMat.emissiveColor = B.Color3.FromHexString(primaryHex).scale(isGod ? 0.22 : 0.10);
  deckMat.specularColor = new B.Color3(0.28, 0.34, 0.38);
  deckMat.alpha = isGod ? 0.38 : 0.95;
  deckMat.backFaceCulling = !isGod;

  const deck = B.MeshBuilder.CreateBox(`${prefix}_deck`, { width: size, height: isGod ? 0.12 : 0.16, depth: size }, scene);
  deck.position.y = isGod ? -0.06 : -0.08;
  deck.material = deckMat;
  deck.parent = root;
  deck.isPickable = false;

  const rimMat = makeMat(scene, `${prefix}_rimMat`, accentHex, { alpha: isGod ? 0.78 : 0.85, emissive: 0.72, unlit: true });
  const wallMat = makeMat(scene, `${prefix}_wallMat`, primaryHex, { alpha: isGod ? 0.10 : 0.08, emissive: 0.25, unlit: true });

  const half = size * 0.5;
  const railThick = isGod ? 0.08 : 0.18;
  const colThick = isGod ? 0.11 : 0.34;
  const frames = [];

  // 4 Floor + 4 Ceiling glowing perimeter beams
  for (const yPos of [0.05, height]) {
    for (const side of [-1, 1]) {
      const bx = B.MeshBuilder.CreateBox(`${prefix}_bx`, { width: size, height: railThick, depth: railThick }, scene);
      bx.position.set(0, yPos, side * half);
      bx.material = rimMat;
      bx.parent = root;
      frames.push(bx);

      const bz = B.MeshBuilder.CreateBox(`${prefix}_bz`, { width: railThick, height: railThick, depth: size }, scene);
      bz.position.set(side * half, yPos, 0);
      bz.material = rimMat;
      bz.parent = root;
      frames.push(bz);
    }
  }

  // 4 Grand Corner Columns + 4 Mid-Wall Architectural Pilasters (in FP mode)
  const colCoords = isGod
    ? [[-half, -half], [half, -half], [-half, half], [half, half]]
    : [[-half, -half], [half, -half], [-half, half], [half, half], [0, -half], [0, half], [-half, 0], [half, 0]];
  for (const [cx, cz] of colCoords) {
    const col = B.MeshBuilder.CreateBox(`${prefix}_col`, { width: colThick, height, depth: colThick }, scene);
    col.position.set(cx, height * 0.5, cz);
    col.material = rimMat;
    col.parent = root;
    frames.push(col);
  }

  // Subtle translucent glass perimeter walls
  const walls = [];
  for (const [wx, wz, sx, sz] of [
    [0, half, size, 0.06],
    [0, -half, size, 0.06],
    [half, 0, 0.06, size],
    [-half, 0, 0.06, size]
  ]) {
    const wMesh = B.MeshBuilder.CreateBox(`${prefix}_wall`, { width: sx, height, depth: sz }, scene);
    wMesh.position.set(wx, height * 0.5, wz);
    wMesh.material = wallMat;
    wMesh.parent = root;
    wMesh.isPickable = false;
    walls.push(wMesh);
  }

  function setLayerOpacity(clarity, { hideDeck = false } = {}) {
    deck.setEnabled(!hideDeck);
    deckMat.alpha = isGod ? (0.22 + 0.45 * clarity) : (0.04 + 0.92 * clarity);
    rimMat.alpha = isGod ? (0.35 + 0.55 * clarity) : (0.12 + 0.84 * clarity);
    wallMat.alpha = isGod ? (0.05 + 0.12 * clarity) : (0.02 + 0.08 * clarity);
  }

  return { root, deck, deckTex, deckMat, rimMat, wallMat, setLayerOpacity };
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
fpScene.fogMode = B.Scene.FOGMODE_EXP2;
fpScene.fogDensity = 0.0085;
fpScene.fogColor = new B.Color3(0.024, 0.062, 0.102);

const fpCamera = new B.UniversalCamera('fpEyes', new B.Vector3(0, 1.65, -6.2), fpScene);
fpCamera.inputs.clear();
fpCamera.fov = 1.15;
fpCamera.minZ = 0.08;
fpCamera.maxZ = 180;

// Clean 3-light rig (fast GPU FPS + crisp architectural contrast)
const fpHemi = new B.HemisphericLight('fpHemi', new B.Vector3(0.15, 1, 0.2), fpScene);
fpHemi.intensity = 0.72;
fpHemi.diffuse = new B.Color3(0.84, 0.94, 0.98);
fpHemi.groundColor = new B.Color3(0.14, 0.22, 0.30);

const fpKeyLight = new B.DirectionalLight('fpKey', new B.Vector3(-0.35, -0.82, 0.44), fpScene);
fpKeyLight.intensity = 0.92;
fpKeyLight.diffuse = new B.Color3(1.0, 0.97, 0.90);

const fpAccentLight = new B.PointLight('fpAccent', new B.Vector3(0, 5.2, 0), fpScene);
fpAccentLight.intensity = 1.15;
fpAccentLight.range = 32;
fpAccentLight.diffuse = new B.Color3(0.30, 0.92, 0.84);

// Distant deep-space cosmic horizon rings (spin subtly with W phase for visceral 4D drift!)
const fpCosmos = new B.TransformNode('fpCosmos', fpScene);
const cosmicRings = [];
{
  const cColors = ['#4de6d3', '#f7c346', '#58a6ff'];
  for (let i = 0; i < 3; i++) {
    const r = B.MeshBuilder.CreateTorus(`cosmicRing_${i}`, {
      diameter: 56 + i * 18,
      thickness: 0.22,
      tessellation: 48
    }, fpScene);
    r.material = makeMat(fpScene, `cRingMat_${i}`, cColors[i], { alpha: 0.24, emissive: 0.85, unlit: true });
    r.rotation.set(0.32 * (i + 1), i * 1.1, 0.18 * i);
    r.parent = fpCosmos;
    cosmicRings.push(r);
  }
}

// 3 Co-Located 20m × 20m Grand Chambers anchored strictly at Y = 0!
const fpChamberW0 = createGrandChamberSlice(fpScene, 'fpW0', {
  size: CHAMBER_SIZE, height: CHAMBER_H, primaryHex: '#4de6d3', bgHex: '#0a1c28', accentHex: '#5ef2e4'
});
const fpChamberWP = createGrandChamberSlice(fpScene, 'fpWP', {
  size: CHAMBER_SIZE + 0.14, height: CHAMBER_H, primaryHex: '#f7c346', bgHex: '#231b0b', accentHex: '#ffd866'
});
const fpChamberWM = createGrandChamberSlice(fpScene, 'fpWM', {
  size: CHAMBER_SIZE - 0.14, height: CHAMBER_H, primaryHex: '#58a6ff', bgHex: '#0c182c', accentHex: '#7cc0ff'
});

// Sculpted Voxel Astronauts: Local Player + Companion Lin Xia (07)
const fpPlayerVoxel = createVoxelAstronaut(B, fpScene, 'fpPlayer', { role: 'player', isLocalFirstPerson: true });
const fpLinXia = createVoxelAstronaut(B, fpScene, 'fpLinXia', { role: 'companion' });

// ============================================================
// Lazy Section 3D Scene Builders (Built on First Visit for Instant Startup!)
// ============================================================
const fpSectionRoots = {};

function ensureSection1() {
  if (fpSectionRoots[1]) return fpSectionRoots[1];
  const root = new B.TransformNode('sec1_root', fpScene);
  const beaconMat = makeMat(fpScene, 's1BeaconMat', '#f7c346', { alpha: 0.85, emissive: 0.9, unlit: true });
  const beaconRing = B.MeshBuilder.CreateTorus('s1BeaconRing', { diameter: 2.8, thickness: 0.10, tessellation: 36 }, fpScene);
  beaconRing.position.set(-2.2, 0.12, 3.8);
  beaconRing.rotation.x = Math.PI / 2;
  beaconRing.material = beaconMat;
  beaconRing.parent = root;

  const beaconPillar = B.MeshBuilder.CreateCylinder('s1Pillar', { diameter: 0.18, height: 6.4, tessellation: 16 }, fpScene);
  beaconPillar.position.set(-2.2, 3.2, 3.8);
  beaconPillar.material = makeMat(fpScene, 's1PillarMat', '#ffd666', { alpha: 0.25, emissive: 0.9, unlit: true });
  beaconPillar.parent = root;

  // Landmark reference arches in W=0 vs W=+1.8 vs W=-1.8 so stationary XYZ W-shifting looks dramatic!
  const arch0 = B.MeshBuilder.CreateTorus('s1Arch0', { diameter: 7.4, thickness: 0.22, tessellation: 32 }, fpScene);
  arch0.position.set(0, 3.6, 0.0);
  arch0.material = makeMat(fpScene, 's1Arch0Mat', '#4de6d3', { alpha: 0.85, emissive: 0.6 });
  arch0.parent = root;

  const archP = B.MeshBuilder.CreateTorus('s1ArchP', { diameter: 9.2, thickness: 0.24, tessellation: 32 }, fpScene);
  archP.position.set(0, 3.8, 2.2);
  archP.material = makeMat(fpScene, 's1ArchPMat', '#f7c346', { alpha: 0.85, emissive: 0.6 });
  archP.parent = root;

  const archM = B.MeshBuilder.CreateTorus('s1ArchM', { diameter: 8.2, thickness: 0.22, tessellation: 32 }, fpScene);
  archM.position.set(0, 3.7, -1.6);
  archM.material = makeMat(fpScene, 's1ArchMMat', '#58a6ff', { alpha: 0.85, emissive: 0.6 });
  archM.parent = root;

  fpSectionRoots[1] = { root, beaconRing, beaconPillar, arch0, archP, archM };
  return fpSectionRoots[1];
}

function ensureSection2() {
  if (fpSectionRoots[2]) return fpSectionRoots[2];
  const root = new B.TransformNode('sec2_root', fpScene);
  const steps = [];

  // Deep chasm glowing grid far below (Y = -5.5) so there's ZERO z-fighting or alpha occlusion with ANY floating step!
  const abyssGrid = B.MeshBuilder.CreateGround('s2Abyss', { width: 28, height: 28, subdivisions: 8 }, fpScene);
  abyssGrid.position.y = -5.5;
  abyssGrid.material = makeMat(fpScene, 's2AbyssMat', '#1d4c68', { alpha: 0.35, emissive: 0.45, unlit: true, wireframe: true });
  abyssGrid.parent = root;

  for (const s of SEC2_STEPS) {
    const node = new B.TransformNode(`s2Step_${s.id}`, fpScene);
    node.position.set(s.x, s.y, s.z);
    node.parent = root;

    // 1) Translucent-to-solid deck slab (renderingGroupId=1 & needDepthPrePass=true -> NEVER invisible!)
    const deckMat = makeMat(fpScene, `s2DeckMat_${s.id}`, s.color, { alpha: 0.85, emissive: 0.32, depthPrePass: true });
    const deck = B.MeshBuilder.CreateBox(`s2Deck_${s.id}`, { width: s.w, height: 0.24, depth: s.d }, sceneOr(fpScene));
    deck.position.y = -0.12;
    deck.material = deckMat;
    deck.renderingGroupId = 1;
    deck.parent = node;

    // 2) ALWAYS-VISIBLE bright holographic perimeter rails (fixes the invisible cyan/star-rail bridge bug 100%!)
    const railMat = makeMat(fpScene, `s2RailMat_${s.id}`, s.color, { alpha: 0.96, emissive: 0.95, unlit: true });
    const hw = s.w * 0.5, hd = s.d * 0.5;
    for (const [rx, rz, sw, sd] of [
      [0,  hd, s.w, 0.11],
      [0, -hd, s.w, 0.11],
      [ hw, 0, 0.11, s.d],
      [-hw, 0, 0.11, s.d]
    ]) {
      const r = B.MeshBuilder.CreateBox(`s2Rail_${s.id}`, { width: sw, height: 0.11, depth: sd }, fpScene);
      r.position.set(rx, 0.04, rz);
      r.material = railMat;
      r.renderingGroupId = 1;
      r.parent = node;
    }

    // 3) Corner beacon posts + floating step indicator crystal
    for (const sx of [-hw + 0.15, hw - 0.15]) {
      for (const sz of [-hd + 0.15, hd - 0.15]) {
        const post = B.MeshBuilder.CreateCylinder(`s2Post_${s.id}`, { diameter: 0.10, height: 0.85, tessellation: 8 }, fpScene);
        post.position.set(sx, 0.42, sz);
        post.material = railMat;
        post.renderingGroupId = 1;
        post.parent = node;
      }
    }

    // Floating holographic step label plate
    const labelTex = new B.DynamicTexture(`s2Lbl_${s.id}`, { width: 256, height: 96 }, fpScene, false);
    const lctx = labelTex.getContext();
    lctx.fillStyle = 'rgba(6, 18, 28, 0.92)';
    lctx.fillRect(0, 0, 256, 96);
    lctx.strokeStyle = s.color;
    lctx.lineWidth = 6;
    lctx.strokeRect(4, 4, 248, 88);
    lctx.fillStyle = s.color;
    lctx.font = 'bold 34px sans-serif';
    lctx.textAlign = 'center';
    lctx.textBaseline = 'middle';
    const wTag = s.wTarget > 0 ? 'W=+1.8' : s.wTarget < 0 ? 'W=−1.8' : 'W=0.0';
    lctx.fillText(`第 ${s.index} 阶 · ${wTag}`, 128, 48);
    labelTex.update();

    const lblMat = new B.StandardMaterial(`s2LblMat_${s.id}`, fpScene);
    lblMat.diffuseTexture = labelTex;
    lblMat.emissiveTexture = labelTex;
    lblMat.disableLighting = true;
    lblMat.backFaceCulling = false;
    const lblPlane = B.MeshBuilder.CreatePlane(`s2LblPlane_${s.id}`, { width: 1.55, height: 0.52 }, fpScene);
    lblPlane.position.set(0, 1.05, 0);
    lblPlane.billboardMode = B.Mesh.BILLBOARDMODE_Y;
    lblPlane.material = lblMat;
    lblPlane.renderingGroupId = 1;
    lblPlane.parent = node;

    steps.push({ spec: s, node, deck, deckMat, railMat });
  }

  fpSectionRoots[2] = { root, steps };
  return fpSectionRoots[2];
}

function sceneOr(s) { return s; }

function ensureSection3() {
  if (fpSectionRoots[3]) return fpSectionRoots[3];
  const root = new B.TransformNode('sec3_root', fpScene);

  // 1) South Emitter Cannon (W = 0.0)
  const emitter = B.MeshBuilder.CreateBox('s3Emitter', { width: 1.5, height: 2.2, depth: 1.2 }, fpScene);
  emitter.position.set(PRISM_SPEC.emitter.x, 1.1, PRISM_SPEC.emitter.z);
  emitter.material = makeMat(fpScene, 's3EmitMat', '#f7c346', { emissive: 0.55 });
  emitter.parent = root;

  // 2) Two Massive Titanium Blocking Walls (one in W=0, one in W=+1.8)
  const walls = PRISM_SPEC.walls.map(w => {
    const m = B.MeshBuilder.CreateBox(`s3_${w.id}`, { width: w.width, height: w.height, depth: w.depth }, fpScene);
    m.position.set(w.x, w.height * 0.5, w.z);
    const mat = makeMat(fpScene, `s3Mat_${w.id}`, w.w === 0 ? '#3a6678' : '#7a5a26', { alpha: 0.92, emissive: 0.18, depthPrePass: true });
    m.material = mat;
    m.parent = root;
    return { spec: w, mesh: m, mat };
  });

  // 3) Two Vertical Glowing W-Axis Light Wells (transfer beams across W slices!)
  const makeWell = (name, x, z, hex) => {
    const wn = new B.TransformNode(name, fpScene);
    wn.position.set(x, 0, z);
    wn.parent = root;
    const mat = makeMat(fpScene, `${name}_mat`, hex, { alpha: 0.42, emissive: 0.85, unlit: true });
    const tube = B.MeshBuilder.CreateCylinder(`${name}_tube`, { diameter: 1.35, height: 7.0, tessellation: 24 }, fpScene);
    tube.position.y = 3.5;
    tube.material = mat;
    tube.parent = wn;
    const ring = B.MeshBuilder.CreateTorus(`${name}_ring`, { diameter: 2.0, thickness: 0.12, tessellation: 28 }, fpScene);
    ring.position.y = 1.45;
    ring.rotation.x = Math.PI / 2;
    ring.material = makeMat(fpScene, `${name}_rmat`, hex, { emissive: 0.95, unlit: true });
    ring.parent = wn;
    return { node: wn, tube, ring, mat };
  };
  const wellA = makeWell('s3WellA', PRISM_SPEC.wellA.x, PRISM_SPEC.wellA.z, '#f7c346');
  const wellB = makeWell('s3WellB', PRISM_SPEC.wellB.x, PRISM_SPEC.wellB.z, '#58a6ff');

  // 4) Three Interactive Rotatable Crystal Prisms (1 in each W slice!)
  const sliceColors = { '0': '#4de6d3', '1.8': '#f7c346', '-1.8': '#58a6ff' };
  const prisms = PRISM_SPEC.prisms.map((p, idx) => {
    const col = sliceColors[String(p.w)] || '#4de6d3';
    const pn = new B.TransformNode(`s3Prism_${idx}`, fpScene);
    pn.position.set(p.x, 0, p.z);
    pn.parent = root;

    const baseMat = makeMat(fpScene, `s3PBase_${idx}`, col, { alpha: 0.9, emissive: 0.25 });
    const base = B.MeshBuilder.CreateCylinder(`s3PB_${idx}`, { diameter: 1.4, height: 1.0, tessellation: 8 }, fpScene);
    base.position.y = 0.5;
    base.material = baseMat;
    base.parent = pn;

    const headPivot = new B.TransformNode(`s3PHead_${idx}`, fpScene);
    headPivot.position.y = 1.5;
    headPivot.parent = pn;

    const crystalMat = makeMat(fpScene, `s3PCrys_${idx}`, col, { alpha: 0.92, emissive: 0.65 });
    const crystal = B.MeshBuilder.CreateBox(`s3PC_${idx}`, { width: 0.85, height: 0.85, depth: 0.85 }, fpScene);
    crystal.material = crystalMat;
    crystal.parent = headPivot;

    // Bright nozzle arrow pointing in the prism's current output direction (+Z local)
    const arrowMat = makeMat(fpScene, `s3PArr_${idx}`, '#ffffff', { emissive: 0.95, unlit: true });
    const nozzle = B.MeshBuilder.CreateCylinder(`s3PNoz_${idx}`, { diameterTop: 0.04, diameterBottom: 0.42, height: 0.9, tessellation: 12 }, fpScene);
    nozzle.rotation.x = Math.PI / 2;
    nozzle.position.z = 0.72;
    nozzle.material = arrowMat;
    nozzle.parent = headPivot;

    return { spec: p, node: pn, headPivot, baseMat, crystalMat, arrowMat };
  });

  // 5) North Receiver Core (W = -1.8)
  const recMat = makeMat(fpScene, 's3RecMat', '#58a6ff', { alpha: 0.9, emissive: 0.55 });
  const receiver = B.MeshBuilder.CreateSphere('s3Receiver', { diameter: 1.65, segments: 18 }, fpScene);
  receiver.position.set(PRISM_SPEC.receiver.x, 1.5, PRISM_SPEC.receiver.z);
  receiver.material = recMat;
  receiver.parent = root;

  // 6) Dynamic Laser Beam Cylinders (4 reusable beams)
  const beams = [];
  for (let i = 0; i < 4; i++) {
    const bm = B.MeshBuilder.CreateBox(`s3Beam_${i}`, { width: 0.18, height: 0.18, depth: 1.0 }, fpScene);
    const bMat = makeMat(fpScene, `s3BeamMat_${i}`, '#ffd84d', { alpha: 0.95, emissive: 1.0, unlit: true });
    bm.material = bMat;
    bm.renderingGroupId = 1;
    bm.parent = root;
    bm.setEnabled(false);
    beams.push({ mesh: bm, mat: bMat });
  }

  fpSectionRoots[3] = { root, walls, wellA, wellB, prisms, receiver, recMat, beams };
  return fpSectionRoots[3];
}

function ensureSection4() {
  if (fpSectionRoots[4]) return fpSectionRoots[4];
  const root = new B.TransformNode('sec4_root', fpScene);
  const H = VAULT_SPEC.halfSize;
  const vh = 4.6;
  const glassMat = makeMat(fpScene, 's4GlassMat', '#59e8ff', { alpha: 0.34, emissive: 0.28, unlit: true });
  const frameMat = makeMat(fpScene, 's4FrameMat', '#4de6d3', { alpha: 0.92, emissive: 0.78, unlit: true });

  const vaultGroup = new B.TransformNode('s4Vault', fpScene);
  vaultGroup.parent = root;
  for (const [x, z, sx, sz] of [
    [0, H, H * 2, 0.22],
    [0, -H, H * 2, 0.22],
    [H, 0, 0.22, H * 2],
    [-H, 0, 0.22, H * 2]
  ]) {
    const pane = B.MeshBuilder.CreateBox('s4Pane', { width: sx, height: vh, depth: sz }, fpScene);
    pane.position.set(x, vh * 0.5, z);
    pane.material = glassMat;
    pane.parent = vaultGroup;
  }
  const roof = B.MeshBuilder.CreateBox('s4Roof', { width: H * 2, height: 0.16, depth: H * 2 }, fpScene);
  roof.position.y = vh;
  roof.material = glassMat;
  roof.parent = vaultGroup;

  for (const sx of [-H, H]) {
    for (const sz of [-H, H]) {
      const p = B.MeshBuilder.CreateBox('s4Col', { width: 0.26, height: vh, depth: 0.26 }, fpScene);
      p.position.set(sx, vh * 0.5, sz);
      p.material = frameMat;
      p.parent = vaultGroup;
    }
  }

  const coreMat = makeMat(fpScene, 's4CoreMat', '#ffd666', { emissive: 0.92, unlit: true });
  const core = B.MeshBuilder.CreatePolyhedron('s4Core', { type: 1, size: 0.65 }, fpScene);
  core.position.set(0, 1.45, 0);
  core.material = coreMat;
  core.parent = root;

  const targetRing = B.MeshBuilder.CreateTorus('s4Target', { diameter: 2.6, thickness: 0.14, tessellation: 32 }, fpScene);
  targetRing.position.set(VAULT_SPEC.targetPedestal[0], 0.14, VAULT_SPEC.targetPedestal[2]);
  targetRing.rotation.x = Math.PI / 2;
  targetRing.material = makeMat(fpScene, 's4TargetMat', '#69f0ae', { emissive: 0.85, unlit: true });
  targetRing.parent = root;

  fpSectionRoots[4] = { root, glassMat, frameMat, core, targetRing };
  return fpSectionRoots[4];
}

function ensureSection5() {
  if (fpSectionRoots[5]) return fpSectionRoots[5];
  const root = new B.TransformNode('sec5_root', fpScene);
  const sliceGroups = [];
  const wallH = 4.2;

  for (let s = 0; s < sim5Maze.wallBoxes.length; s++) {
    const sl = MAZE4D_SPEC.slices[s];
    const gNode = new B.TransformNode(`s5Slice_${s}`, fpScene);
    gNode.parent = root;
    const mat = makeMat(fpScene, `s5WallMat_${s}`, sl.color, { alpha: 0.92, emissive: 0.26, depthPrePass: true });
    const capMat = makeMat(fpScene, `s5CapMat_${s}`, sl.color, { alpha: 0.95, emissive: 0.85, unlit: true });

    const meshes = [];
    for (const b of sim5Maze.wallBoxes[s]) {
      const m = B.MeshBuilder.CreateBox('s5Wall', { width: b.sx, height: wallH, depth: b.sz }, fpScene);
      m.position.set(b.x, wallH * 0.5, b.z);
      m.material = mat;
      m.parent = gNode;
      meshes.push(m);

      const cap = B.MeshBuilder.CreateBox('s5Cap', { width: b.sx + 0.04, height: 0.12, depth: b.sz + 0.04 }, fpScene);
      cap.position.set(b.x, wallH + 0.06, b.z);
      cap.material = capMat;
      cap.parent = gNode;
      meshes.push(cap);
    }
    sliceGroups.push({ w: sl.w, node: gNode, mat, capMat, meshes });
  }

  // Two Phase Beacons + North-East Exit Gate
  const beacons = MAZE4D_SPEC.beacons.map(b => {
    const [bx, bz] = mazeCellCenter(b.col, b.row);
    const mat = makeMat(fpScene, `s5BMat_${b.id}`, b.color, { alpha: 0.95, emissive: 0.92, unlit: true });
    const crystal = B.MeshBuilder.CreatePolyhedron(`s5B_${b.id}`, { type: 1, size: 0.65 }, fpScene);
    crystal.position.set(bx, 1.5, bz);
    crystal.material = mat;
    crystal.parent = root;
    return { spec: b, mesh: crystal, mat };
  });

  const [ex, ez] = mazeCellCenter(MAZE4D_SPEC.exitCell[0], MAZE4D_SPEC.exitCell[1]);
  const exitRing = B.MeshBuilder.CreateTorus('s5ExitRing', { diameter: 2.5, thickness: 0.14, tessellation: 32 }, fpScene);
  exitRing.position.set(ex, 1.6, ez);
  exitRing.material = makeMat(fpScene, 's5ExitMat', '#69f0ae', { emissive: 0.9, unlit: true });
  exitRing.parent = root;

  fpSectionRoots[5] = { root, sliceGroups, beacons, exitRing };
  return fpSectionRoots[5];
}

// Section 06: Reusable Dynamic 4D Eat-Dots & 4D Sokoban 3D Board Builder (for BOTH #world and #labCanvas!)
function createArcadeBoardRig(scene, prefix, { cellSize = 0.92, sliceGap = 0.72 } = {}) {
  const root = new B.TransformNode(`${prefix}_root`, scene);
  const dynamicRoot = new B.TransformNode(`${prefix}_dyn`, scene);
  dynamicRoot.parent = root;

  const sliceColors = ['#58a6ff', '#4de6d3', '#a78bfa', '#f7c346'];
  const boardMats = sliceColors.map((hex, i) => makeMat(scene, `${prefix}_bm_${i}`, hex, { alpha: 0.34, emissive: 0.22, unlit: true }));
  const frameMats = sliceColors.map((hex, i) => makeMat(scene, `${prefix}_fm_${i}`, hex, { alpha: 0.85, emissive: 0.80, unlit: true, wireframe: true }));
  const wallMat = makeMat(scene, `${prefix}_wallMat`, '#dce9ef', { alpha: 0.96, emissive: 0.14, specular: 0.42 });
  const dotMat = makeMat(scene, `${prefix}_dotMat`, '#ffd84d', { alpha: 0.98, emissive: 0.95, unlit: true });
  const boxMat = makeMat(scene, `${prefix}_boxMat`, '#5ef082', { alpha: 0.95, emissive: 0.45 });
  const targetMat = makeMat(scene, `${prefix}_tgtMat`, '#f7c346', { alpha: 0.88, emissive: 0.92, unlit: true });
  const playerMat = makeMat(scene, `${prefix}_plrMat`, '#939aff', { alpha: 0.98, emissive: 0.58 });
  const cursorMat = makeMat(scene, `${prefix}_curMat`, '#ffe14d', { alpha: 0.95, emissive: 0.95, unlit: true, wireframe: true });

  let builtLevelId = null;
  let sliceBases = [];
  let sliceFrames = [];
  let wallMeshes = [];
  let dotMeshes = new Map();
  let boxMeshes = [];
  let targetMeshes = [];
  let playerMesh = null;
  let cursorMesh = null;

  function rebuildForLevel(sim) {
    builtLevelId = sim.spec.id;
    for (const child of dynamicRoot.getChildMeshes()) child.dispose();
    sliceBases = [];
    sliceFrames = [];
    wallMeshes = [];
    dotMeshes = new Map();
    boxMeshes = [];
    targetMeshes = [];

    const [dx, dy, dz, dw] = sim.dims;
    const maxSlices = Math.max(dw, dz);
    for (let s = 0; s < maxSlices; s++) {
      const base = B.MeshBuilder.CreateBox(`${prefix}_sb_${s}`, { width: dx * cellSize + 0.18, height: 0.10, depth: dy * cellSize + 0.18 }, scene);
      base.material = boardMats[s % 4];
      base.parent = dynamicRoot;
      sliceBases.push(base);

      const frame = B.MeshBuilder.CreateBox(`${prefix}_sf_${s}`, { width: dx * cellSize + 0.20, height: dz * cellSize + 0.16, depth: dy * cellSize + 0.20 }, scene);
      frame.material = frameMats[s % 4];
      frame.parent = dynamicRoot;
      sliceFrames.push(frame);
    }

    for (const wc of sim.spec.walls) {
      const m = B.MeshBuilder.CreateBox(`${prefix}_w`, { size: cellSize * 0.86 }, scene);
      m.material = wallMat;
      m.parent = dynamicRoot;
      wallMeshes.push({ coord: wc, mesh: m });
    }

    for (const dc of sim.spec.dots) {
      const m = B.MeshBuilder.CreateSphere(`${prefix}_dot`, { diameter: cellSize * 0.42, segments: 12 }, scene);
      m.material = dotMat;
      m.parent = dynamicRoot;
      dotMeshes.set(dc.join(','), { coord: dc, mesh: m });
    }

    for (let i = 0; i < sim.spec.boxes.length; i++) {
      const m = B.MeshBuilder.CreateBox(`${prefix}_box_${i}`, { size: cellSize * 0.82 }, scene);
      m.material = boxMat;
      m.parent = dynamicRoot;
      boxMeshes.push(m);
    }

    for (let i = 0; i < sim.spec.targets.length; i++) {
      const m = B.MeshBuilder.CreateTorus(`${prefix}_tgt_${i}`, { diameter: cellSize * 0.84, thickness: cellSize * 0.11, tessellation: 20 }, scene);
      m.rotation.x = Math.PI / 2;
      m.material = targetMat;
      m.parent = dynamicRoot;
      targetMeshes.push(m);
    }

    playerMesh = B.MeshBuilder.CreateBox(`${prefix}_plr`, { size: cellSize * 0.78 }, scene);
    playerMesh.material = playerMat;
    playerMesh.parent = dynamicRoot;

    cursorMesh = B.MeshBuilder.CreateBox(`${prefix}_cur`, { size: cellSize * 0.96 }, scene);
    cursorMesh.material = cursorMat;
    cursorMesh.parent = dynamicRoot;
  }

  function cellPos(sim, coord) {
    const [dx, dy, dz, dw] = sim.dims;
    const proj = sim.projectCell(coord);
    const numSlices = sim.basisMode === 'XYZ' ? dw : dz;
    const span = dx * cellSize + sliceGap;
    const sx = (proj.sliceIndex - (numSlices + 1) * 0.5) * span;
    const lx = sx + (proj.localX - (dx + 1) * 0.5) * cellSize;
    const lz = (proj.localY - (dy + 1) * 0.5) * cellSize;
    const ly = (proj.localZ - 0.5) * cellSize + 0.10;
    return [lx, ly, lz];
  }

  function sync(sim, t = 0) {
    if (builtLevelId !== sim.spec.id) rebuildForLevel(sim);
    const [dx, dy, dz, dw] = sim.dims;
    const isXYZ = sim.basisMode === 'XYZ';
    const numSlices = isXYZ ? dw : dz;
    const stackH = isXYZ ? dz : dw;
    const activeSlice = isXYZ ? sim.player[3] : sim.player[2];
    const span = dx * cellSize + sliceGap;

    for (let s = 0; s < sliceBases.length; s++) {
      const vis = s < numSlices;
      sliceBases[s].setEnabled(vis);
      sliceFrames[s].setEnabled(vis);
      if (vis) {
        const sx = (s + 1 - (numSlices + 1) * 0.5) * span;
        sliceBases[s].position.set(sx, 0, 0);
        sliceFrames[s].scaling.y = stackH / Math.max(1, dz);
        sliceFrames[s].position.set(sx, stackH * cellSize * 0.5 + 0.08, 0);
        const cur = (s + 1) === activeSlice;
        boardMats[s % 4].alpha = cur ? 0.58 : 0.22;
        frameMats[s % 4].alpha = cur ? 0.95 : 0.35;
      }
    }

    for (const w of wallMeshes) {
      const p = cellPos(sim, w.coord);
      w.mesh.position.set(p[0], p[1], p[2]);
    }
    for (const [key, item] of dotMeshes.entries()) {
      const alive = sim.dotsRemaining.has(key);
      item.mesh.setEnabled(alive);
      if (alive) {
        const p = cellPos(sim, item.coord);
        item.mesh.position.set(p[0], p[1] + Math.sin(t * 4 + p[0]) * 0.06, p[2]);
      }
    }
    sim.boxes.forEach((b, i) => {
      const p = cellPos(sim, b);
      boxMeshes[i].position.set(p[0], p[1] + Math.sin(t * 3.2 + i) * 0.03, p[2]);
    });
    sim.targets.forEach((tg, i) => {
      const p = cellPos(sim, tg);
      targetMeshes[i].position.set(p[0], p[1] - cellSize * 0.22, p[2]);
      targetMeshes[i].rotation.z = t * 1.5;
    });

    const pp = cellPos(sim, sim.player);
    playerMesh.position.set(pp[0], pp[1], pp[2]);
    cursorMesh.position.set(pp[0], pp[1], pp[2]);
    const pulse = 1.0 + Math.sin(t * 5) * 0.05;
    cursorMesh.scaling.setAll(pulse);
  }

  return { root, sync };
}

function ensureSection6() {
  if (fpSectionRoots[6]) return fpSectionRoots[6];
  const rig = createArcadeBoardRig(fpScene, 'fpArcade', { cellSize: 1.05, sliceGap: 0.85 });
  rig.root.position.set(0, 0.2, 0);
  fpSectionRoots[6] = rig;
  return rig;
}

function ensureSection7() {
  if (fpSectionRoots[7]) return fpSectionRoots[7];
  const root = new B.TransformNode('sec7_root', fpScene);
  const ringY = 2.55;

  // Fixed Cyan Anchor Ring A (X=0, W=0, lying in YZ plane so movable rings thread through it!)
  const ringAMat = makeMat(fpScene, 's7RingAMat', '#4de6d3', { alpha: 0.94, emissive: 0.45, depthPrePass: true });
  const ringA = B.MeshBuilder.CreateTorus('s7RingA', { diameter: 4.4, thickness: 0.34, tessellation: 42 }, fpScene);
  ringA.position.set(0, ringY, 0);
  ringA.rotation.z = Math.PI / 2;
  ringA.material = ringAMat;
  ringA.parent = root;

  // Movable Golden Ring B (lying in XY plane, interlocked with Ring A!)
  const ringBMat = makeMat(fpScene, 's7RingBMat', '#f7c346', { alpha: 0.96, emissive: 0.55, depthPrePass: true });
  const ringB = B.MeshBuilder.CreateTorus('s7RingB', { diameter: 4.2, thickness: 0.32, tessellation: 42 }, fpScene);
  ringB.position.set(TRIPLE_RING_SPEC.startB.x, ringY, 0);
  ringB.rotation.x = Math.PI / 2;
  ringB.material = ringBMat;
  ringB.parent = root;

  // Movable Violet Ring C (interlocked on the left!)
  const ringCMat = makeMat(fpScene, 's7RingCMat', '#c084fc', { alpha: 0.96, emissive: 0.55, depthPrePass: true });
  const ringC = B.MeshBuilder.CreateTorus('s7RingC', { diameter: 4.2, thickness: 0.32, tessellation: 42 }, fpScene);
  ringC.position.set(TRIPLE_RING_SPEC.startC.x, ringY, 0);
  ringC.rotation.x = Math.PI / 2;
  ringC.material = ringCMat;
  ringC.parent = root;

  // Active selection glowing ring halo
  const selHalo = B.MeshBuilder.CreateTorus('s7SelHalo', { diameter: 4.85, thickness: 0.08, tessellation: 42 }, fpScene);
  selHalo.rotation.x = Math.PI / 2;
  selHalo.material = makeMat(fpScene, 's7SelMat', '#ffffff', { emissive: 1.0, unlit: true });
  selHalo.parent = root;

  // Two W-Phase Lock Pillars (Right Crimson blocks W=+1.8; Left Sapphire blocks W=-1.8!)
  const pRightMat = makeMat(fpScene, 's7PRMat', '#ff5c6c', { alpha: 0.85, emissive: 0.65, depthPrePass: true });
  const pillarRight = B.MeshBuilder.CreateBox('s7PillarRight', { width: 1.6, height: 6.0, depth: 2.8 }, fpScene);
  pillarRight.position.set(2.8, 3.0, 0);
  pillarRight.material = pRightMat;
  pillarRight.parent = root;

  const pLeftMat = makeMat(fpScene, 's7PLMat', '#58a6ff', { alpha: 0.85, emissive: 0.65, depthPrePass: true });
  const pillarLeft = B.MeshBuilder.CreateBox('s7PillarLeft', { width: 1.6, height: 6.0, depth: 2.8 }, fpScene);
  pillarLeft.position.set(-2.8, 3.0, 0);
  pillarLeft.material = pLeftMat;
  pillarLeft.parent = root;

  // Left & Right W=0 Target Docking Pedestals
  const dockB = B.MeshBuilder.CreateTorus('s7DockB', { diameter: 3.4, thickness: 0.14, tessellation: 32 }, fpScene);
  dockB.position.set(TRIPLE_RING_SPEC.startB.dockX, 0.15, 0);
  dockB.rotation.x = Math.PI / 2;
  dockB.material = makeMat(fpScene, 's7DockBMat', '#f7c346', { emissive: 0.85, unlit: true });
  dockB.parent = root;

  const dockC = B.MeshBuilder.CreateTorus('s7DockC', { diameter: 3.4, thickness: 0.14, tessellation: 32 }, fpScene);
  dockC.position.set(TRIPLE_RING_SPEC.startC.dockX, 0.15, 0);
  dockC.rotation.x = Math.PI / 2;
  dockC.material = makeMat(fpScene, 's7DockCMat', '#c084fc', { emissive: 0.85, unlit: true });
  dockC.parent = root;

  fpSectionRoots[7] = { root, ringA, ringAMat, ringB, ringBMat, ringC, ringCMat, selHalo, pillarRight, pRightMat, pillarLeft, pLeftMat, dockB, dockC };
  return fpSectionRoots[7];
}

function buildChiralArmRig(scene, prefix, parent, { isSocket = false } = {}) {
  const root = new B.TransformNode(prefix, scene);
  root.parent = parent;
  const alpha = isSocket ? 0.34 : 0.98;
  const hubMat = makeMat(scene, `${prefix}_hub`, '#f7c346', { alpha, emissive: isSocket ? 0.75 : 0.45, unlit: isSocket });
  const aMat = makeMat(scene, `${prefix}_a`, '#ff5c6c', { alpha, emissive: isSocket ? 0.85 : 0.45, unlit: isSocket });
  const bMat = makeMat(scene, `${prefix}_b`, '#58a6ff', { alpha, emissive: isSocket ? 0.85 : 0.45, unlit: isSocket });
  const cMat = makeMat(scene, `${prefix}_c`, '#5ef082', { alpha, emissive: isSocket ? 0.85 : 0.45, unlit: isSocket });

  const hub = B.MeshBuilder.CreateSphere(`${prefix}_O`, { diameter: isSocket ? 0.55 : 0.48, segments: 16 }, scene);
  hub.material = hubMat;
  hub.parent = root;

  const makeBranch = (name, mat) => {
    const shaft = B.MeshBuilder.CreateCylinder(`${prefix}_s_${name}`, { diameter: isSocket ? 0.24 : 0.18, height: 1.0, tessellation: 12 }, scene);
    shaft.material = mat;
    shaft.parent = root;
    const tip = B.MeshBuilder.CreateBox(`${prefix}_t_${name}`, { size: isSocket ? 0.46 : 0.38 }, scene);
    tip.material = mat;
    tip.parent = root;
    return { shaft, tip };
  };
  const armA = makeBranch('A', aMat);
  const armB = makeBranch('B', bMat);
  const armC = makeBranch('C', cMat);

  function setFromVertices(verts4) {
    const [O, A, Bm, C] = verts4;
    hub.position.set(O[0], O[1], O[2]);
    const orientBranch = (branch, target) => {
      const dx = target[0] - O[0], dy = target[1] - O[1], dz = target[2] - O[2];
      const len = Math.hypot(dx, dy, dz);
      branch.tip.position.set(target[0], target[1], target[2]);
      if (len < 0.04) {
        branch.shaft.setEnabled(false);
        return;
      }
      branch.shaft.setEnabled(true);
      branch.shaft.scaling.set(1, len, 1);
      branch.shaft.position.set(O[0] + dx * 0.5, O[1] + dy * 0.5, O[2] + dz * 0.5);
      const up = new B.Vector3(0, 1, 0);
      const dir = new B.Vector3(dx / len, dy / len, dz / len);
      const dotVal = B.Vector3.Dot(up, dir);
      if (dotVal > 0.9999) {
        branch.shaft.rotationQuaternion = B.Quaternion.Identity();
      } else if (dotVal < -0.9999) {
        branch.shaft.rotationQuaternion = B.Quaternion.RotationAxis(new B.Vector3(1, 0, 0), Math.PI);
      } else {
        const axis = B.Vector3.Cross(up, dir).normalize();
        branch.shaft.rotationQuaternion = B.Quaternion.RotationAxis(axis, Math.acos(dotVal));
      }
    };
    orientBranch(armA, A);
    orientBranch(armB, Bm);
    orientBranch(armC, C);
  }

  return { root, setFromVertices };
}

function ensureSection8() {
  if (fpSectionRoots[8]) return fpSectionRoots[8];
  const root = new B.TransformNode('sec8_root', fpScene);

  // 1) Center Pedestal + Interactive 4-Prong Asymmetric 3D Chiral Key!
  const keyPed = B.MeshBuilder.CreateCylinder('s8KeyPed', { diameter: 2.2, height: 0.4, tessellation: 24 }, fpScene);
  keyPed.position.set(0, 0.2, 0.2);
  keyPed.material = makeMat(fpScene, 's8PedMat', '#3a687a', { emissive: 0.25 });
  keyPed.parent = root;

  const keyAnchor = new B.TransformNode('s8KeyAnchor', fpScene);
  keyAnchor.position.set(0, 2.0, 0.2);
  keyAnchor.parent = root;
  const keyRig = buildChiralArmRig(fpScene, 's8Key', keyAnchor, { isSocket: false });

  // Glowing 4D XW Flip Gimbal Halo around the key
  const xwHalo = B.MeshBuilder.CreateTorus('s8XWHalo', { diameter: 3.6, thickness: 0.08, tessellation: 42 }, fpScene);
  xwHalo.position.set(0, 2.0, 0.2);
  xwHalo.material = makeMat(fpScene, 's8HaloMat', '#f7c346', { alpha: 0.72, emissive: 0.9, unlit: true });
  xwHalo.parent = root;

  // 2) North Left-Handed Lock Socket Gate (shows exact target (-X, +Y, +Z) mirror shape!)
  const lockGate = B.MeshBuilder.CreateBox('s8Gate', { width: 5.4, height: 4.8, depth: 0.4 }, fpScene);
  lockGate.position.set(0, 2.4, 5.2);
  lockGate.material = makeMat(fpScene, 's8GateMat', '#1c3b4c', { alpha: 0.85, emissive: 0.2 });
  lockGate.parent = root;

  const lockAnchor = new B.TransformNode('s8LockAnchor', fpScene);
  lockAnchor.position.set(0, 2.0, 4.6);
  lockAnchor.parent = root;
  const lockRig = buildChiralArmRig(fpScene, 's8Lock', lockAnchor, { isSocket: true });
  lockRig.setFromVertices(CHIRAL_LOCK_VERTICES);

  // 3) Side-by-Side 2D Paper-Cutout Flip Analogy Rig (X = -2.85): Asymmetric "F" cutout flipping 0°→180° out of table!
  const paperTable = B.MeshBuilder.CreateBox('s8PaperTable', { width: 2.4, height: 0.12, depth: 2.4 }, fpScene);
  paperTable.position.set(-2.85, 1.15, 1.4);
  paperTable.material = makeMat(fpScene, 's8TableMat', '#4de6d3', { alpha: 0.36, emissive: 0.42, unlit: true });
  paperTable.parent = root;

  const paperPivot = new B.TransformNode('s8PaperPivot', fpScene);
  paperPivot.position.set(-2.85, 1.48, 1.4);
  paperPivot.parent = root;

  // Asymmetric "F" paper cutout: teal TOP face (front), coral BOTTOM face (back)!
  const frontMat = makeMat(fpScene, 's8PaperFront', '#4de6d3', { emissive: 0.55 });
  const backMat = makeMat(fpScene, 's8PaperBack', '#ff6b6b', { emissive: 0.55 });
  const fParts = [
    [-0.45, 0, 0.28, 1.6], // vertical spine
    [ 0.10, 0.65, 1.0, 0.28], // top bar
    [-0.05, 0.05, 0.72, 0.26] // mid bar
  ];
  for (const [fx, fz, fw, fd] of fParts) {
    const top = B.MeshBuilder.CreateBox('s8FTop', { width: fw, height: 0.04, depth: fd }, fpScene);
    top.position.set(fx, 0.025, fz);
    top.material = frontMat;
    top.parent = paperPivot;

    const bot = B.MeshBuilder.CreateBox('s8FBot', { width: fw, height: 0.04, depth: fd }, fpScene);
    bot.position.set(fx, -0.025, fz);
    bot.material = backMat;
    bot.parent = paperPivot;
  }

  fpSectionRoots[8] = { root, keyAnchor, keyRig, xwHalo, lockRig, lockGate, paperPivot };
  return fpSectionRoots[8];
}

function ensureSection(secId) {
  if (secId === 1) return ensureSection1();
  if (secId === 2) return ensureSection2();
  if (secId === 3) return ensureSection3();
  if (secId === 4) return ensureSection4();
  if (secId === 5) return ensureSection5();
  if (secId === 6) return ensureSection6();
  if (secId === 7) return ensureSection7();
  if (secId === 8) return ensureSection8();
  return null;
}

// ============================================================
// 2. RIGHT HIGH-DIMENSIONAL TACTICAL CONSOLE (#labCanvas)
// Horizontal W-Axis Expansion: W=-1.8 (left), W=0 (center), W=+1.8 (right)
// ============================================================
const godEngine = new B.Engine(labCanvas, true, {
  stencil: false,
  preserveDrawingBuffer: false,
  antialias: true,
  audioEngine: false
});
godEngine.setHardwareScalingLevel(1 / Math.min(Math.max(window.devicePixelRatio || 1, 1), 1.25));
const godScene = new B.Scene(godEngine);
godScene.clearColor = new B.Color4(0.022, 0.055, 0.095, 1);

const godCamera = new B.ArcRotateCamera('godCam', -Math.PI * 0.5, 1.02, 14.5, new B.Vector3(0, 0.4, 0), godScene);
godCamera.attachControl(labCanvas, true);
godCamera.wheelPrecision = 30;
godCamera.lowerRadiusLimit = 7.0;
godCamera.upperRadiusLimit = 28.0;

const godHemi = new B.HemisphericLight('godHemi', new B.Vector3(0.2, 1, 0.3), godScene);
godHemi.intensity = 1.05;

const GOD_W_SCALE = 2.08; // Horizontal X separation between W=-1.8, W=0, W=+1.8 slices
const GOD_POS_SCALE = 0.145; // Maps 20m world [-8.6, 8.6] cleanly onto 2.9m god chamber!
const GOD_CHAMBER_SIZE = 2.95;
const GOD_CHAMBER_H = 1.45;
const GOD_VOXEL_SCALE = 0.30;

const godStandardRoot = new B.TransformNode('godStdRoot', godScene);
const godChambers = [
  { w: -1.8, ch: createGrandChamberSlice(godScene, 'godWM', { size: GOD_CHAMBER_SIZE, height: GOD_CHAMBER_H, primaryHex: '#58a6ff', accentHex: '#7cc0ff', isGod: true }) },
  { w:  0.0, ch: createGrandChamberSlice(godScene, 'godW0', { size: GOD_CHAMBER_SIZE, height: GOD_CHAMBER_H, primaryHex: '#4de6d3', accentHex: '#5ef2e4', isGod: true }) },
  { w:  1.8, ch: createGrandChamberSlice(godScene, 'godWP', { size: GOD_CHAMBER_SIZE, height: GOD_CHAMBER_H, primaryHex: '#f7c346', accentHex: '#ffd866', isGod: true }) }
];
for (const item of godChambers) {
  item.ch.root.parent = godStandardRoot;
  item.ch.root.position.set(item.w * GOD_W_SCALE, 0, 0);
}

// Glowing horizontal W-axis rail connecting all 3 slices
const godWRail = B.MeshBuilder.CreateCylinder('godWRail', { diameter: 0.06, height: 8.6, tessellation: 10 }, godScene);
godWRail.rotation.z = Math.PI / 2;
godWRail.position.set(0, -0.14, 0);
godWRail.material = makeMat(godScene, 'godRailMat', '#74f2ce', { alpha: 0.72, emissive: 0.9, unlit: true });
godWRail.parent = godStandardRoot;

// Active W-slice highlight frame gliding horizontally along W
const godActiveFrame = B.MeshBuilder.CreateBox('godActiveFrame', { width: GOD_CHAMBER_SIZE + 0.14, height: GOD_CHAMBER_H + 0.1, depth: GOD_CHAMBER_SIZE + 0.14 }, godScene);
godActiveFrame.position.y = GOD_CHAMBER_H * 0.5;
godActiveFrame.material = makeMat(godScene, 'godActMat', '#ffffff', { alpha: 0.62, emissive: 0.95, unlit: true, wireframe: true });
godActiveFrame.parent = godStandardRoot;

const godPlayerVoxel = createVoxelAstronaut(B, godScene, 'godPlayer', { role: 'player' });
godPlayerVoxel.root.scaling.setAll(GOD_VOXEL_SCALE);
godPlayerVoxel.root.parent = godStandardRoot;

const godLinVoxel = createVoxelAstronaut(B, godScene, 'godLin', { role: 'companion' });
godLinVoxel.root.scaling.setAll(GOD_VOXEL_SCALE);
godLinVoxel.root.parent = godStandardRoot;

// God-view compact prop indicators (Vault, Rings, Chiral Key)
const godVaultBox = B.MeshBuilder.CreateBox('godVault', { width: 1.0, height: 0.9, depth: 1.0 }, godScene);
godVaultBox.position.set(0, 0.45, 0);
godVaultBox.material = makeMat(godScene, 'godVaultMat', '#59e8ff', { alpha: 0.42, emissive: 0.65, unlit: true });
godVaultBox.parent = godStandardRoot;

const godRingA = B.MeshBuilder.CreateTorus('godRingA', { diameter: 0.9, thickness: 0.09, tessellation: 20 }, godScene);
godRingA.rotation.z = Math.PI / 2;
godRingA.material = makeMat(godScene, 'godRAMat', '#4de6d3', { emissive: 0.8 });
godRingA.parent = godStandardRoot;

const godRingB = B.MeshBuilder.CreateTorus('godRingB', { diameter: 0.85, thickness: 0.08, tessellation: 20 }, godScene);
godRingB.rotation.x = Math.PI / 2;
godRingB.material = makeMat(godScene, 'godRBMat', '#f7c346', { emissive: 0.8 });
godRingB.parent = godStandardRoot;

const godRingC = B.MeshBuilder.CreateTorus('godRingC', { diameter: 0.85, thickness: 0.08, tessellation: 20 }, godScene);
godRingC.rotation.x = Math.PI / 2;
godRingC.material = makeMat(godScene, 'godRCMat', '#c084fc', { emissive: 0.8 });
godRingC.parent = godStandardRoot;

const godArcadeRig = createArcadeBoardRig(godScene, 'godArcade', { cellSize: 0.46, sliceGap: 0.34 });

// ============================================================
// Right-Side W-Axis Phase Transparency Indicator Gauge
// ============================================================
function drawWPhaseGauge(pw) {
  if (!volCtx) return;
  const w = volStackCanvas.width;
  const h = volStackCanvas.height;
  volCtx.clearRect(0, 0, w, h);

  volCtx.fillStyle = 'rgba(7, 20, 32, 0.95)';
  volCtx.fillRect(0, 0, w, h);

  const cx = w * 0.5;
  const cy = 78;
  const slices = [
    { targetW: -1.8, color: '#58a6ff', dx: -8, dy: 5 },
    { targetW:  0.0, color: '#4de6d3', dx:  0, dy: 0 },
    { targetW:  1.8, color: '#f7c346', dx:  8, dy: -5 }
  ];

  for (const sl of slices) {
    const c = phaseClarity(pw, sl.targetW, 1.55);
    volCtx.save();
    volCtx.globalAlpha = 0.22 + 0.78 * c;
    volCtx.fillStyle = sl.color + '44';
    volCtx.strokeStyle = sl.color;
    volCtx.lineWidth = c > 0.5 ? 2.4 : 1.1;
    volCtx.fillRect(cx - 18 + sl.dx, cy - 18 + sl.dy, 36, 36);
    volCtx.strokeRect(cx - 18 + sl.dx, cy - 18 + sl.dy, 36, 36);
    volCtx.restore();
  }

  // Stationary XYZ center dot
  volCtx.fillStyle = '#ffffff';
  volCtx.beginPath();
  volCtx.arc(cx, cy, 3.6, 0, Math.PI * 2);
  volCtx.fill();

  // Horizontal W slider bar
  const barY = 152;
  const barX = 10;
  const barW = w - 20;
  const grad = volCtx.createLinearGradient(barX, barY, barX + barW, barY);
  grad.addColorStop(0, '#58a6ff');
  grad.addColorStop(0.5, '#4de6d3');
  grad.addColorStop(1, '#f7c346');
  volCtx.fillStyle = grad;
  volCtx.fillRect(barX, barY - 2, barW, 4);

  const norm = Math.max(0, Math.min(1, (pw + 2.2) / 4.4));
  const px = barX + norm * barW;
  volCtx.fillStyle = '#ffffff';
  volCtx.fillRect(px - 2.5, barY - 9, 5, 18);

  volCtx.fillStyle = '#d4eef2';
  volCtx.font = 'bold 10px ui-monospace, monospace';
  volCtx.textAlign = 'center';
  volCtx.fillText(`W=${pw >= 0 ? '+' : ''}${pw.toFixed(1)}`, cx, barY + 24);
}

// ============================================================
// Section Switching, Completion & Mouse Capture ⇄ Release
// ============================================================
function clearKeys() {
  keys.clear();
  jumpQueued = false;
}

function updateMouseModeUI() {
  const btn = $('mouseModeBtn');
  const ch = $('crosshair');
  const isFree = keyboardCorridor && !locked;
  if (btn) {
    btn.textContent = locked ? '🔒 Tab · 释放鼠标' : '🖱️ Tab · 掌控视角';
    btn.classList.toggle('cursor-free', isFree);
  }
  if (ch) ch.classList.toggle('cursor-free', isFree || currentSection === 6);
}

function pause(showMenu = true) {
  manualPauseRequested = true;
  locked = false;
  keyboardCorridor = false;
  rightDraggingLook = false;
  clearKeys();
  look.transition();
  try { if (document.pointerLockElement) document.exitPointerLock?.(); } catch {}
  if (showMenu && !ended) $('menu').classList.remove('hidden');
  updateMouseModeUI();
}

function releaseMouseCursor({ announce = true } = {}) {
  if (!ready || ended) return;
  manualPauseRequested = false;
  locked = false;
  keyboardCorridor = true;
  rightDraggingLook = false;
  look.transition();
  $('menu').classList.add('hidden');
  try { if (document.pointerLockElement) document.exitPointerLock?.(); } catch {}
  updateMouseModeUI();
  if (announce) {
    showToast('🖱️ 已释放鼠标指针 — 可自由点击「下一小节」与高维操作台（再按 Tab 或点画面掌控视角）');
  }
}

function resumeFirstPerson({ keyboardFallback = true } = {}) {
  if (!ready || ended) return;
  manualPauseRequested = false;
  audio.unlock();
  voice.unlock();
  keyboardCorridor = keyboardFallback;
  rightDraggingLook = false;
  clearKeys();
  look.transition();
  $('menu').classList.add('hidden');
  // In Section 06 (3D board arcade), keep cursor free so player can click the 7-level buttons & drag-orbit smoothly!
  if (currentSection !== 6) {
    try {
      worldCanvas.focus();
      const res = worldCanvas.requestPointerLock?.();
      Promise.resolve(res).catch(() => {});
    } catch {}
  }
  updateHUD();
  updateMouseModeUI();
  // Speak current section intro voice line when first entering from menu!
  const meta = CHAPTER2_SECTIONS[currentSection - 1];
  if (meta) setDialogue(meta.speaker, meta.dialogue, { speak: true });
}

function toggleMouseControl() {
  if (!ready || ended) return;
  if (!$('menu').classList.contains('hidden')) {
    resumeFirstPerson({ keyboardFallback: true });
    return;
  }
  if (locked) releaseMouseCursor({ announce: true });
  else resumeFirstPerson({ keyboardFallback: true });
}

function completeSection(secId, toastMsg, linReply = '') {
  if (completedSections.has(secId)) return;
  completedSections.add(secId);
  audio.evidenceUnlocked();
  showToast(toastMsg, 5200);
  if (linReply) {
    setDialogue('先遣领航员 · 林夏 (07)', linReply, { speak: true, forceVoice: true });
  } else {
    voice.speak(toastMsg, { persona: 'linxia', force: true });
  }
  updateHUD();
  refreshHighDimConsole();
}

function rebuildArcadeLevelBar() {
  arcadeBarEl.replaceChildren();
  for (const lvl of ARCADE_4D_LEVELS) {
    const b = document.createElement('button');
    b.className = `ch2-arcade-btn ${lvl.mode}${sim6Arcade.spec.id === lvl.id ? ' active' : ''}${sim6Arcade.completedLevels.has(lvl.id) ? ' done' : ''}`;
    b.textContent = lvl.badge;
    b.title = `${lvl.title}\n${lvl.subtitle}`;
    b.onclick = e => {
      e.stopPropagation();
      audio.unlock();
      voice.unlock();
      sim6Arcade.loadLevel(lvl.id);
      showToast(`已切换至：${lvl.title} — ${lvl.tip}`, 5200);
      voice.speak(`${lvl.badge}。${lvl.subtitle}`, { persona: 'linxia', force: true });
      rebuildArcadeLevelBar();
      godScene._forceRender = true;
      updateHUD();
      refreshHighDimConsole();
    };
    arcadeBarEl.appendChild(b);
  }
}

function selectSection(secId, { speakIntro = true } = {}) {
  const id = Math.max(1, Math.min(TOTAL_SECTIONS, secId));
  currentSection = id;
  ensureSection(id);

  // Show only active section meshes
  for (let i = 1; i <= TOTAL_SECTIONS; i++) {
    if (fpSectionRoots[i]?.root) fpSectionRoots[i].root.setEnabled(i === id);
  }

  playerVy = 0;
  playerGrounded = true;
  look.reset();
  gait.reset();

  if (id === 1) {
    pos4 = [0, 0, -6.2, 0.0];
    targetW = 0.0;
    s1Met = false;
  } else if (id === 2) {
    sim2Steps.reset();
    const s1 = SEC2_STEPS[0];
    pos4 = [s1.x, s1.y, s1.z, 0.0];
    targetW = 0.0;
  } else if (id === 3) {
    sim3Prism.reset();
    pos4 = [-2.8, 0, -6.8, 0.0];
    look.yaw = 0.30;
    targetW = 0.0;
  } else if (id === 4) {
    sim4Vault.reset();
    pos4 = [...sim4Vault.player];
    targetW = 0.0;
  } else if (id === 5) {
    sim5Maze.reset();
    const [sx, sz] = mazeCellCenter(MAZE4D_SPEC.startCell[0], MAZE4D_SPEC.startCell[1]);
    pos4 = [sx, 0, sz, 0.0];
    targetW = 0.0;
  } else if (id === 6) {
    pos4 = [0, 0, -6.0, 0.0];
    targetW = 0.0;
    if (locked) releaseMouseCursor({ announce: false });
    rebuildArcadeLevelBar();
  } else if (id === 7) {
    sim7Rings.reset();
    pos4 = [0, 0, -6.8, 0.0];
    targetW = 0.0;
  } else if (id === 8) {
    sim8Chiral.reset();
    pos4 = [-0.5, 0, -6.8, 0.0];
    targetW = 0.0;
  }

  const meta = CHAPTER2_SECTIONS[id - 1];
  setDialogue(meta.speaker, meta.dialogue, { speak: speakIntro && ready && $('menu').classList.contains('hidden') });
  godScene._forceRender = true;
  updateHUD();
  refreshHighDimConsole();
  updateMouseModeUI();
}

// ============================================================
// Gameplay Physics & Puzzle Stepper
// ============================================================
function stepGameplay(dx, dz, dw, dt = 0.016) {
  const prevW = pos4[3];

  if (currentSection === 1) {
    pos4[0] = Math.max(-ARENA_HALF, Math.min(ARENA_HALF, pos4[0] + dx));
    pos4[2] = Math.max(-ARENA_HALF, Math.min(ARENA_HALF, pos4[2] + dz));
    pos4[3] = Math.max(-2.2, Math.min(2.2, pos4[3] + dw));
    if (Math.abs(pos4[3] - 1.8) < 0.55 && Math.hypot(pos4[0] + 2.2, pos4[2] - 3.8) < 2.1) {
      s1Met = true;
      compGesture = { left: time, right: time };
      completeSection(1, '第一小节完成！你站在原地用滚轮沿第四维透明穿梭，成功与流金折页的林夏汇合！', '“太棒了 08号！你已经掌握了不用上下移动、直接用滚轮改变四周 W 折页透明度的诀窍！我们去六阶天梯！”');
    }
  } else if (currentSection === 2) {
    pos4[0] = Math.max(-ARENA_HALF, Math.min(ARENA_HALF, pos4[0] + dx));
    pos4[2] = Math.max(-ARENA_HALF, Math.min(ARENA_HALF, pos4[2] + dz));
    pos4[3] = Math.max(-2.2, Math.min(2.2, pos4[3] + dw));

    // Real 6-step vertical elevation & jumping physics!
    if (jumpQueued && playerGrounded) {
      playerVy = 6.6;
      playerGrounded = false;
      audio.jump();
    }
    jumpQueued = false;

    const sup = sim2Steps.findSupportingStep(pos4[0], pos4[2], pos4[1], pos4[3]);
    if (!playerGrounded || !sup || pos4[1] > sup.y + 0.04) {
      playerVy -= 13.5 * dt;
      pos4[1] += playerVy * dt;
      const landSup = sim2Steps.findSupportingStep(pos4[0], pos4[2], pos4[1], pos4[3]);
      if (landSup && playerVy <= 0 && pos4[1] <= landSup.y + 0.08) {
        pos4[1] = landSup.y;
        playerVy = 0;
        if (!playerGrounded) audio.land(2.0);
        playerGrounded = true;
        if (!sim2Steps.visited.has(landSup.id)) {
          audio.routeStep(sim2Steps.visited.size + 1);
          showToast(`已登上【${landSup.label}】(${sim2Steps.visited.size + 1}/6)！`);
        }
        if (sim2Steps.recordLanding(landSup)) {
          compGesture = { left: time, right: time };
          completeSection(2, '第二小节完成！你翻越 20 米深渊的六级跨维天梯，与顶台上的林夏汇合！', '“漂亮的跨维跳跃！连星轨折页的悬空蓝阶都被你稳稳踩住了，前面就是折页棱镜大厅！”');
        }
      } else if (pos4[1] < -3.6) {
        // Gentle respawn on last safe reached step
        const safe = sim2Steps.lastSafeStep;
        pos4 = [safe.x, safe.y, safe.z, safe.wTarget];
        targetW = safe.wTarget;
        playerVy = 0;
        playerGrounded = true;
        showToast(`跌入深渊，已安全拉回【${safe.label}】！先滚动滚轮让下一阶变实再起跳！`);
      }
    } else if (sup) {
      pos4[1] = sup.y;
      playerVy = 0;
      playerGrounded = true;
      if (sim2Steps.recordLanding(sup)) {
        compGesture = { left: time, right: time };
        completeSection(2, '第二小节完成！你翻越 20 米深渊的六级跨维天梯，与顶台上的林夏汇合！', '“漂亮的跨维跳跃！连星轨折页的悬空蓝阶都被你稳稳踩住了，前面就是折页棱镜大厅！”');
      }
    }
  } else if (currentSection === 3) {
    const candX = Math.max(-ARENA_HALF, Math.min(ARENA_HALF, pos4[0] + dx));
    const candZ = Math.max(-ARENA_HALF, Math.min(ARENA_HALF, pos4[2] + dz));
    const candW = Math.max(-2.2, Math.min(2.2, pos4[3] + dw));

    // Check blocking against Titanium Wall 1 (W=0) and Titanium Wall 2 (W=+1.8)
    let hitWall = false;
    for (const w of PRISM_SPEC.walls) {
      if (Math.abs(candW - w.w) < 0.72) {
        if (Math.abs(candX - w.x) < w.width * 0.5 + PLAYER_RADIUS && Math.abs(candZ - w.z) < w.depth * 0.5 + PLAYER_RADIUS) {
          hitWall = true;
          break;
        }
      }
    }
    if (!hitWall) {
      pos4[0] = candX;
      pos4[2] = candZ;
    } else if (time - (stepGameplay._w3T || 0) > 1.1) {
      stepGameplay._w3T = time;
      showToast('眼前是当前折页的钛合金隔墙！滚动鼠标滚轮切入另一折页即可穿墙绕行！');
    }
    pos4[3] = candW;
  } else if (currentSection === 4) {
    const res = sim4Vault.move([dx, 0, dz, dw]);
    pos4 = [...sim4Vault.player];
    if (res.blocked && Math.hypot(dx, dz) > 1e-4 && time - (stepGameplay._w4T || 0) > 1.0) {
      stepGameplay._w4T = time;
      audio.probeBounce(1.2);
      showToast('W=0 的六面防爆玻璃墙挡住了去路！滚动鼠标滚轮切入 W=+1.8 折页让玻璃透明淡出！');
    }
    if (sim4Vault.carryingCore && !stepGameplay._gotCore) {
      stepGameplay._gotCore = true;
      audio.routeStep(2);
      showToast('已拾取启动核心！再滚轮切入 W=+1.8 穿出玻璃墙，送至右侧绿色接收台！');
    }
    if (sim4Vault.coreDelivered) {
      completeSection(4, '第四小节完成！你借助第四维轻松穿入无门玻璃密室并送出核心！', '“完美！这就是高维对三维封闭牢笼的降维碾压！前方是 5×5 四维多墙迷宫，小心别迷路！”');
    }
  } else if (currentSection === 5) {
    const candW = Math.max(-2.2, Math.min(2.2, pos4[3] + dw));
    const candX = Math.max(-ARENA_HALF, Math.min(ARENA_HALF, pos4[0] + dx));
    const candZ = Math.max(-ARENA_HALF, Math.min(ARENA_HALF, pos4[2] + dz));

    // Axis-separated smooth sliding against multi-wall 4D maze!
    if (!sim5Maze.collides(candX, pos4[2], candW)) pos4[0] = candX;
    if (!sim5Maze.collides(pos4[0], candZ, candW)) pos4[2] = candZ;
    if (!sim5Maze.collides(pos4[0], pos4[2], candW)) {
      pos4[3] = candW;
    } else {
      // Allow scrolling even if close to wall by gently accepting W change when wall thickness is thin
      pos4[3] = candW;
    }

    const prog = sim5Maze.updateProgress(pos4[0], pos4[2], pos4[3]);
    if (prog.newlyFound) {
      audio.routeStep(prog.beaconsCount);
      showToast(`已激活【${prog.newlyFound.label}】(${prog.beaconsCount}/2)！继续穿越迷宫前往东北出口！`);
      voice.speak(`已激活${prog.newlyFound.label}。`, { persona: 'linxia' });
    }
    if (prog.complete) {
      completeSection(5, '第五小节完成！你在任意单页均无解的 5×5 多墙四维迷宫中成功突围！', '“漂亮！三张死路迷宫叠在第四维里就成了坦途！准备好迎接七关四维吃豆与推箱子了吗？”');
    }
  } else if (currentSection === 7) {
    // WASD moves player in hall AND A/D pushes the active ring horizontally when moving!
    pos4[0] = Math.max(-ARENA_HALF, Math.min(ARENA_HALF, pos4[0] + dx * 0.45));
    pos4[2] = Math.max(-ARENA_HALF, Math.min(ARENA_HALF, pos4[2] + dz));
    if (Math.abs(dx) > 1e-5 || Math.abs(dw) > 1e-5) {
      const res = sim7Rings.moveActive(dx * 1.15, dw);
      if (res.blocked && time - (stepGameplay._w7T || 0) > 1.1) {
        stepGameplay._w7T = time;
        audio.probeBounce(1.5);
        showToast(res.message);
      }
      const activeR = sim7Rings.activeRing === 'B' ? sim7Rings.ringB : sim7Rings.ringC;
      pos4[3] = activeR.w;
      targetW = activeR.w;
      if (res.complete) {
        completeSection(7, '第七小节完成！你巧妙避开左右折页的相位锁柱，成功解开三环四维死结！', '“干得漂亮！流金环走星轨折页、星紫环走流金折页，逻辑滴水不漏！最后一关就在眼前——真正的手性反转！”');
      }
    }
  } else if (currentSection === 8) {
    pos4[0] = Math.max(-ARENA_HALF, Math.min(ARENA_HALF, pos4[0] + dx));
    pos4[2] = Math.max(-ARENA_HALF, Math.min(ARENA_HALF, pos4[2] + dz));
    if (Math.abs(dw) > 1e-5) {
      sim8Chiral.stepXWFlip(dw * 52);
      pos4[3] = 0;
      targetW = 0;
    }
  }

  if (Math.abs(pos4[3] - prevW) > 0.35) {
    pulseWShiftFx(pos4[3]);
  }
}

// Section 06 Discrete 4D Grid Move Helper (supports WASD camera-relative, Space +Z, Ctrl/Shift -Z, Mouse Wheel W±1)
function arcadeStep(dx, dy, dz, dw) {
  audio.unlock();
  voice.unlock();
  const res = sim6Arcade.step(dx, dy, dz, dw);
  if (res.blocked) {
    audio.probeBounce(1.3);
    showToast('前方被四维实体方块挡住！试试 Space 上 / Ctrl 下 / 鼠标滚轮切 W 切片！', 2200);
    return;
  }
  if (res.ateDot) audio.routeStep(sim6Arcade.spec.dots.length - sim6Arcade.dotsRemaining.size);
  else if (res.crossWPush) {
    audio.airlockUnlock();
    pulseWShiftFx(1.8);
    showToast('✨ 精彩！你刚刚沿第四维 W 轴成功推箱破局！', 3400);
  } else if (res.pushed) {
    audio.seamCross('W+', false);
  } else {
    audio.footstep(false);
  }

  if (res.complete) {
    rebuildArcadeLevelBar();
    const nextIdx = (sim6Arcade.levelIndex + 1) % ARCADE_4D_LEVELS.length;
    const isFinale = sim6Arcade.spec.id === 'soko4';
    completeSection(6, `🎉 恭喜通关【${sim6Arcade.spec.badge}】！你已掌握四维网格与跨 W 轴推箱！可继续挑战其余关卡或前往第七节！`, isFinale ? '“太神了！你用向 W 轴推箱的绝招攻破了终极关！”' : '“漂亮通关！点击上方按钮可以挑战下一关吃豆或四维推箱子！”');
    if (sim6Arcade.levelIndex < ARCADE_4D_LEVELS.length - 1) {
      showToast(`🎉 通关【${sim6Arcade.spec.badge}】！点击上方「${ARCADE_4D_LEVELS[nextIdx].badge}」继续下一关，或按 N 进入第七节！`, 5000);
    }
  }

  godScene._forceRender = true;
  updateHUD();
  refreshHighDimConsole();
}

// Primary R-key / Console Action per Section
function executeSectionAction() {
  audio.unlock();
  voice.unlock();

  if (currentSection === 1) {
    targetW = 1.8;
    pos4 = [-1.8, 0, 2.8, 1.8];
    stepGameplay(0, 0, 0);
  } else if (currentSection === 2) {
    // Advance to next unvisited step cleanly
    const nextStep = SEC2_STEPS.find(s => !sim2Steps.visited.has(s.id)) || SEC2_STEPS[5];
    pos4 = [nextStep.x, nextStep.y, nextStep.z, nextStep.wTarget];
    targetW = nextStep.wTarget;
    playerVy = 0;
    playerGrounded = true;
    stepGameplay(0, 0, 0);
  } else if (currentSection === 3) {
    // Rotate whichever prism player is standing near (or next unaligned prism!)
    let idx = sim3Prism.nearestPrism(pos4[0], pos4[2], pos4[3], 3.8);
    if (idx < 0) {
      idx = PRISM_SPEC.prisms.findIndex((p, i) => sim3Prism.dirs[i] !== p.targetDir);
      if (idx >= 0) {
        const p = PRISM_SPEC.prisms[idx];
        targetW = p.w;
        pos4[3] = p.w;
      }
    }
    if (idx >= 0) {
      const tr = sim3Prism.rotatePrism(idx, 1);
      audio.seamCross('W+', false);
      const p = PRISM_SPEC.prisms[idx];
      if (tr.complete) {
        completeSection(3, '第三小节完成！金色光束穿越三张折页与两座跨维光井，完美击中北侧核心！', '“三层折页光路全线贯通！原来绕过三维钛墙最优雅的方式，就是让光束钻进第四维光井！”');
      } else if (idx === 0 && tr.wellAActive) {
        showToast('⚡ 棱镜 ① 对准光井 A！请向上滚动鼠标滚轮进入 W=+1.8 流金折页调整棱镜 ②！');
      } else if (idx === 1 && tr.wellBActive) {
        showToast('⚡ 棱镜 ② 对准光井 B！请向下滚动鼠标滚轮进入 W=−1.8 星轨折页调整棱镜 ③！');
      } else {
        showToast(`已旋转【${p.label}】90°！观察激光束落点继续校准！`);
      }
    }
  } else if (currentSection === 4) {
    if (!sim4Vault.carryingCore) {
      targetW = 0.0;
      sim4Vault.player = [0, 0, 0, 0];
      sim4Vault.enteredVault = true;
      sim4Vault.carryingCore = true;
      pos4 = [0, 0, 0, 0];
      audio.routeStep(2);
      showToast('⚡ 已穿入玻璃牢笼拿到核心！滚轮切相穿出玻璃，送至东侧绿色接收台！');
    } else {
      targetW = 0.0;
      sim4Vault.player = [...VAULT_SPEC.targetPedestal];
      sim4Vault.carryingCore = false;
      sim4Vault.coreDelivered = true;
      pos4 = [...sim4Vault.player];
      stepGameplay(0, 0, 0);
    }
  } else if (currentSection === 5) {
    // Helpful phase jump to next uncollected beacon or exit
    const nextB = MAZE4D_SPEC.beacons.find(b => !sim5Maze.beaconsFound.has(b.id));
    if (nextB) {
      const [bx, bz] = mazeCellCenter(nextB.col, nextB.row);
      pos4 = [bx, 0, bz, nextB.w];
      targetW = nextB.w;
      stepGameplay(0, 0, 0);
    } else {
      const [ex, ez] = mazeCellCenter(MAZE4D_SPEC.exitCell[0], MAZE4D_SPEC.exitCell[1]);
      pos4 = [ex, 0, ez, 0.0];
      targetW = 0.0;
      stepGameplay(0, 0, 0);
    }
  } else if (currentSection === 6) {
    const mv = sim6Arcade.findNextStepMove();
    if (mv) arcadeStep(mv[0], mv[1], mv[2], mv[3]);
    else showToast('当前关卡已完成或无可行步，可点「重置本关」重试！');
  } else if (currentSection === 7) {
    if (!sim7Rings.ringB.docked) {
      sim7Rings.selectRing('B');
      sim7Rings.ringB = { x: TRIPLE_RING_SPEC.startB.dockX, w: 0.0, freed: true, docked: true };
      pos4[3] = 0.0; targetW = 0.0;
      audio.routeStep(1);
      showToast('⚡ 流金环 B 已借 W=−1.8 星轨折页绕过右侧锁柱并归位！现在解开星紫环 C！');
    } else {
      sim7Rings.selectRing('C');
      sim7Rings.ringC = { x: TRIPLE_RING_SPEC.startC.dockX, w: 0.0, freed: true, docked: true };
      sim7Rings.complete = true;
      pos4[3] = 0.0; targetW = 0.0;
      completeSection(7, '第七小节完成！两枚活环分别经相反 W 折页绕过锁柱，三环死结彻底解开！', '“漂亮解链！现在前往最后一关——用真正的四维 XW 旋转完成手性反转！”');
    }
  } else if (currentSection === 8) {
    const res = sim8Chiral.attemptInsert();
    if (res.unlocked) {
      compGesture = { left: time, right: time };
      completeSection(8, '🎉 第八小节通关！你在 XW 平面完成 180° 刚性翻面，三维右旋钥匙化为左旋镜像开启终极锁孔！', '“太震撼了 08号！所有边长一丝未变，但三维有向体积从正变负，右手真的变成了左手！我们成功走出了画纸！”');
    } else if (res.reason === 'align3D') {
      sim8Chiral.reset3DRotations();
      showToast('钥匙已完成手性反转，已帮你把三维角度归正——再按一次 R 即可严丝合缝插入左旋锁孔！');
    } else {
      showToast(`❌ 无法插入！当前仍是右旋手性（det = ${res.ev.det.toFixed(2)} > 0），请向上滚动鼠标滚轮将钥匙沿 XW 平面翻转至 180°！`, 4400);
      audio.probeBounce(1.4);
    }
  }

  godScene._forceRender = true;
  updateHUD();
  refreshHighDimConsole();
}

// ============================================================
// HUD & High-Dimensional Tactical Console Synchronization
// ============================================================
function updateHUD() {
  const meta = CHAPTER2_SECTIONS[currentSection - 1];
  const w = pos4[3];

  $('secCode').textContent = `${meta.code} · ${meta.act}`;
  $('secTitle').textContent = meta.title;
  themeQuoteEl.textContent = meta.themeQuote || '';
  $('objective').textContent = meta.goal;

  if (currentSection === 6) {
    $('wPageReadout').textContent = `切片 W = ${sim6Arcade.player[3]} / ${sim6Arcade.dims[3]}`;
    $('wPageTag').textContent = `${sim6Arcade.spec.badge} · 基底 ${sim6Arcade.basisMode} · 步数 ${sim6Arcade.moves}`;
  } else if (currentSection === 8) {
    const ev = sim8Chiral.evaluate();
    $('wPageReadout').textContent = `XW 翻转 = ${Math.round(ev.xwDeg)}°`;
    $('wPageTag').textContent = ev.det > 0.2 ? `右旋手性 (det +${ev.det.toFixed(2)})` : ev.det < -0.2 ? `左旋镜像 (det ${ev.det.toFixed(2)}) ✓` : `90° 侧立穿过第四维`;
  } else {
    $('wPageReadout').textContent = `W = ${w >= 0 ? '+' : ''}${w.toFixed(1)} 空间折页`;
    let tag = '青苍三维切片 · XYZ 同位叠映';
    if (w > 0.65) tag = '流金三维切片 · XYZ 同位叠映';
    else if (w < -0.65) tag = '星轨三维切片 · XYZ 同位叠映';
    $('wPageTag').textContent = tag;
  }

  // Toggle Sec 06 7-Level Arcade Bar & Telemetry Strip
  arcadeBarEl.classList.toggle('hidden', currentSection !== 6);
  if (currentSection === 6) {
    const modeInfo = sim6Arcade.spec.mode === 'eat'
      ? `<span class="sk-pill target">剩余能量豆 ${sim6Arcade.dotsRemaining.size}/${sim6Arcade.spec.dots.length}</span>`
      : `<span class="sk-pill box">箱子 ${sim6Arcade.boxes.map(formatCoord4D).join(' ')}</span><span class="sk-pill target">目标 ${sim6Arcade.targets.map(formatCoord4D).join(' ')}</span>`;
    telemetryBadgeEl.innerHTML = `
      <span class="sk-pill player">位置 ${formatCoord4D(sim6Arcade.player)}</span>
      ${modeInfo}
      <span class="sk-pill basis">基底 ${sim6Arcade.basisMode}(X) · 滚轮 W±1 · Space↑ · Ctrl↓</span>
    `;
    telemetryBadgeEl.classList.remove('hidden');
  } else if (currentSection === 8) {
    const ev = sim8Chiral.evaluate();
    telemetryBadgeEl.innerHTML = `
      <span class="sk-pill basis">三维转角 XY:${ev.xyDeg}° XZ:${ev.xzDeg}° YZ:${ev.yzDeg}°</span>
      <span class="sk-pill target">四维 XW 翻面：${Math.round(ev.xwDeg)}° / 180°</span>
      <span class="sk-pill ${ev.det < -1.3 ? 'box' : 'deadlock'}">有向体积 det = ${ev.det >= 0 ? '+' : ''}${ev.det.toFixed(2)}</span>
    `;
    telemetryBadgeEl.classList.remove('hidden');
  } else {
    telemetryBadgeEl.classList.add('hidden');
  }

  // Section Checklists (1..8)
  let checks = [];
  if (currentSection === 1) {
    checks = [
      { done: pos4[3] > 1.2 || s1Met, text: '向上滚动【鼠标滚轮】切入 W=+1.8 流金折页（XYZ不动）' },
      { done: completedSections.has(1), text: '走向由半透明渐实的林夏完成汇合' }
    ];
  } else if (currentSection === 2) {
    checks = [
      { done: sim2Steps.visited.has('s2'), text: '滚轮切流金(+1.8) 跳上第 2 阶（高度 +0.55m）' },
      { done: sim2Steps.visited.has('s3'), text: '滚轮切星轨(−1.8) 跳上第 3 阶（高度 +1.15m）' },
      { done: sim2Steps.visited.has('s4') && sim2Steps.visited.has('s5'), text: '交替滚轮跃过第 4 阶与第 5 阶' },
      { done: sim2Steps.complete, text: '滚回青苍(0.0) 跳上第 6 阶顶台与林夏汇合' }
    ];
  } else if (currentSection === 3) {
    const tr = sim3Prism.trace();
    checks = [
      { done: tr.wellAActive, text: 'W=0 旋转棱镜 ① 朝东射入【光井 A】绕开钛墙' },
      { done: tr.wellBActive, text: '滚轮切 W=+1.8 旋转棱镜 ② 朝北射入【光井 B】' },
      { done: tr.receiverLit, text: '滚轮切 W=−1.8 旋转棱镜 ③ 朝西直击北侧核心' }
    ];
  } else if (currentSection === 4) {
    checks = [
      { done: Math.abs(pos4[3]) > 0.9 || sim4Vault.enteredVault, text: '滚动滚轮切入 W=+1.8 使玻璃墙透明淡出' },
      { done: sim4Vault.carryingCore || sim4Vault.coreDelivered, text: '步入牢笼中央后滚回 W=0 拿起能量核心' },
      { done: sim4Vault.coreDelivered, text: '再切相穿出玻璃墙送至东侧绿色接收台' }
    ];
  } else if (currentSection === 5) {
    checks = [
      { done: sim5Maze.beaconsFound.has('b1'), text: '穿越多墙迷宫在 W=+1.8 激活【流金信标 ①】' },
      { done: sim5Maze.beaconsFound.has('b2'), text: '滚轮切相在 W=−1.8 激活【星轨信标 ②】' },
      { done: sim5Maze.complete, text: '在 W=0.0 抵达东北角绿环出口' }
    ];
  } else if (currentSection === 6) {
    const eatDone = ['pac1', 'pac2', 'pac3'].filter(id => sim6Arcade.completedLevels.has(id)).length;
    const sokoDone = ['soko1', 'soko2', 'soko3', 'soko4'].filter(id => sim6Arcade.completedLevels.has(id)).length;
    checks = [
      { done: eatDone > 0, text: `四维吃豆关卡（已通 ${eatDone}/3 关：WASD + 空格/Ctrl + 滚轮）` },
      { done: sokoDone > 0, text: `四维推箱关卡（已通 ${sokoDone}/4 关：巧用滚轮向 W 轴推箱）` },
      { done: sim6Arcade.completedLevels.has('soko4'), text: '通关「推箱 终关」（精简障碍 W 轴推箱破围墙）' }
    ];
  } else if (currentSection === 7) {
    checks = [
      { done: sim7Rings.ringB.docked, text: '选流金环 B(1)：避开 W=+1.8 锁柱，经 W=−1.8 滑向右底座归位' },
      { done: sim7Rings.ringC.docked, text: '选星紫环 C(2)：避开 W=−1.8 锁柱，经 W=+1.8 滑向左底座归位' }
    ];
  } else if (currentSection === 8) {
    const ev = sim8Chiral.evaluate();
    checks = [
      { done: sim8Chiral.tried3DRotation, text: '（可选）尝试三维旋转 XY/XZ/YZ，验证有向体积恒为正无法匹配' },
      { done: ev.isFlippedLeftHanded, text: '向上滚动【鼠标滚轮】将钥匙沿 XW 平面翻转至 180°（纸片翻面！）' },
      { done: sim8Chiral.complete, text: '按 R 将左旋镜像钥匙插入北侧锁孔通关第二章' }
    ];
  }

  const html = checks.map(c => `<div class="ch2-check-item ${c.done ? 'done' : ''}"><span>${c.done ? '✓' : '○'}</span><span>${c.text}</span></div>`).join('');
  const el = $('secChecklist');
  if (el._lastHtml !== html) {
    el._lastHtml = html;
    el.innerHTML = html;
  }

  const nextBtn = $('nextSecHudBtn');
  const isDone = completedSections.has(currentSection);
  nextBtn.classList.toggle('hidden', !isDone);
  nextBtn.textContent = currentSection < TOTAL_SECTIONS
    ? `进入${CHAPTER2_SECTIONS[currentSection].code}：${CHAPTER2_SECTIONS[currentSection].title} (N) →`
    : '查看第二章终幕结局 (N) →';

  document.querySelectorAll('#sectionTabs button').forEach(btn => {
    const n = Number(btn.dataset.sec);
    btn.classList.toggle('active', n === currentSection);
    btn.classList.toggle('done', completedSections.has(n));
  });
}

function refreshHighDimConsole() {
  const meta = CHAPTER2_SECTIONS[currentSection - 1];
  const w = pos4[3];

  $('godTitle').textContent = `高维展开 · ${meta.title}`;
  $('godWValue').textContent = currentSection === 6
    ? `${sim6Arcade.spec.badge} · W=${sim6Arcade.player[3]}`
    : currentSection === 8
      ? `XW = ${Math.round(sim8Chiral.xwDeg)}°`
      : `W = ${w >= 0 ? '+' : ''}${w.toFixed(1)}`;
  $('godWSlider').value = currentSection === 8
    ? String(-2.4 + (sim8Chiral.xwDeg / 180) * 4.8)
    : String(Math.max(-2.4, Math.min(2.4, w)));
  $('godSliderLabel').textContent = currentSection === 8
    ? `四维 XW 翻面角度 (${Math.round(sim8Chiral.xwDeg)}° / 180° · 滚轮控制)`
    : '第四维相位（鼠标滚轮 / 拖动滑块）';
  $('godLiveStatus').textContent = currentSection === 6 ? sim6Arcade.spec.tip : meta.godHint;

  document.querySelectorAll('[data-jump-w]').forEach(btn => {
    const target = Number(btn.getAttribute('data-jump-w'));
    btn.classList.toggle('active', Math.abs(w - target) < 0.45);
  });

  const extra = $('godExtraControls');
  let extraHtml = '';
  if (currentSection === 3) {
    extraHtml = `
      <button id="crushActionBtn">⚡ 旋转当前/下一座棱镜 90° (R)</button>
      <div class="ch2-hc-subbtns">
        <button id="pBtn0">转棱镜 ① (W=0)</button>
        <button id="pBtn1">转棱镜 ② (W=+1.8)</button>
        <button id="pBtn2">转棱镜 ③ (W=−1.8)</button>
      </div>
    `;
  } else if (currentSection === 6) {
    extraHtml = `
      <button id="crushActionBtn">💡 演示最优一步 (R)</button>
      <div class="ch2-hc-subbtns">
        <button id="sokoBtnUp">Space · 上(+Z)</button>
        <button id="sokoBtnDn">Ctrl · 下(−Z)</button>
        <button id="sokoBtnWm">滚轮↓ · W−1</button>
        <button id="sokoBtnWp">滚轮↑ · W+1</button>
        <button id="sokoBtnSwap">X · 切 ${sim6Arcade.basisMode === 'XYZ' ? 'XYW' : 'XYZ'}</button>
        <button id="sokoBtnUndo">Z · 撤销一步</button>
      </div>
    `;
  } else if (currentSection === 7) {
    extraHtml = `
      <button id="crushActionBtn">⚡ 一键辅助归位当前环 (R)</button>
      <div class="ch2-hc-subbtns">
        <button id="ringSelB" style="${sim7Rings.activeRing === 'B' ? 'border-color:#f7c346;color:#ffe799;' : ''}">1 · 操控流金环 B</button>
        <button id="ringSelC" style="${sim7Rings.activeRing === 'C' ? 'border-color:#c084fc;color:#ebd5ff;' : ''}">2 · 操控星紫环 C</button>
      </div>
    `;
  } else if (currentSection === 8) {
    const ev = sim8Chiral.evaluate();
    extraHtml = `
      <button id="crushActionBtn">${ev.matchesLock ? '🔓 插入左旋锁孔通关！(R)' : '⚡ 尝试插入左旋锁孔 (R)'}</button>
      <div class="ch2-hc-subbtns">
        <button id="rotXY">三维转 XY 90°</button>
        <button id="rotXZ">三维转 XZ 90°</button>
        <button id="rotYZ">三维转 YZ 90°</button>
        <button id="flipXW180">✨ 四维 XW 翻面 180°</button>
      </div>
    `;
  } else {
    const labels = {
      1: '⚡ 切入 W=+1.8 流金折页与林夏汇合 (R)',
      2: '⚡ 辅助跃上下一级跨维阶梯 (R)',
      4: sim4Vault.carryingCore ? '⚡ 穿墙送出能量核心至接收台 (R)' : '⚡ 切相穿入玻璃牢笼拾取核心 (R)',
      5: '⚡ 定位并跳转至下一枚迷宫相位信标 (R)'
    };
    extraHtml = `<button id="crushActionBtn">${labels[currentSection] || '⚡ 执行高维交互 (R)'}</button>`;
  }

  if (extra._lastHtml !== extraHtml) {
    extra._lastHtml = extraHtml;
    extra.innerHTML = extraHtml;
    $('crushActionBtn').onclick = executeSectionAction;
    if (currentSection === 3) {
      $('pBtn0').onclick = () => { targetW = 0; pos4[3] = 0; sim3Prism.rotatePrism(0, 1); checkPrismWin(); };
      $('pBtn1').onclick = () => { targetW = 1.8; pos4[3] = 1.8; sim3Prism.rotatePrism(1, 1); checkPrismWin(); };
      $('pBtn2').onclick = () => { targetW = -1.8; pos4[3] = -1.8; sim3Prism.rotatePrism(2, 1); checkPrismWin(); };
    } else if (currentSection === 6) {
      $('sokoBtnUp').onclick = () => arcadeStep(0, 0, 1, 0);
      $('sokoBtnDn').onclick = () => arcadeStep(0, 0, -1, 0);
      $('sokoBtnWm').onclick = () => arcadeStep(0, 0, 0, -1);
      $('sokoBtnWp').onclick = () => arcadeStep(0, 0, 0, 1);
      $('sokoBtnSwap').onclick = () => { sim6Arcade.toggleBasisMode(); godScene._forceRender = true; updateHUD(); refreshHighDimConsole(); };
      $('sokoBtnUndo').onclick = () => { if (sim6Arcade.undo()) { godScene._forceRender = true; updateHUD(); refreshHighDimConsole(); } };
    } else if (currentSection === 7) {
      $('ringSelB').onclick = () => { sim7Rings.selectRing('B'); targetW = sim7Rings.ringB.w; pos4[3] = targetW; showToast('已选中【流金环 B】— 避开 W=+1.8 锁柱，从 W=−1.8 滑向右底座！'); updateHUD(); refreshHighDimConsole(); };
      $('ringSelC').onclick = () => { sim7Rings.selectRing('C'); targetW = sim7Rings.ringC.w; pos4[3] = targetW; showToast('已选中【星紫环 C】— 避开 W=−1.8 锁柱，从 W=+1.8 滑向左底座！'); updateHUD(); refreshHighDimConsole(); };
    } else if (currentSection === 8) {
      const try3D = (plane) => {
        audio.unlock();
        const ev = sim8Chiral.rotate3D(plane, 90);
        audio.seamCross('W+', false);
        showToast(`三维 ${plane} 旋转 90°：有向体积仍为 +${ev.det.toFixed(2)}（永远无法变成左旋镜像！）`, 3600);
        updateHUD();
        refreshHighDimConsole();
      };
      $('rotXY').onclick = () => try3D('XY');
      $('rotXZ').onclick = () => try3D('XZ');
      $('rotYZ').onclick = () => try3D('YZ');
      $('flipXW180').onclick = () => {
        audio.unlock();
        sim8Chiral.reset3DRotations();
        sim8Chiral.setXWFlip(sim8Chiral.xwDeg < 170 ? 180 : 0);
        audio.airlockUnlock();
        pulseWShiftFx(1.8);
        showToast('✨ 钥匙已沿第四维 XW 平面完成 180° 刚性翻面！有向体积反转，现在按 R 插入左旋锁孔！', 4500);
        updateHUD();
        refreshHighDimConsole();
      };
    }
  }
}

function checkPrismWin() {
  audio.unlock();
  const tr = sim3Prism.trace();
  audio.seamCross('W+', false);
  if (tr.complete) {
    completeSection(3, '第三小节完成！三页激光回路经两座光井全线接通！', '“三层折页光路全线贯通！我们继续前进！”');
  }
  godScene._forceRender = true;
  updateHUD();
  refreshHighDimConsole();
}

// ============================================================
// Event Listeners (Mouse Wheel W-Shift, Tab/Alt Cursor Toggle, Voice, Arcade)
// ============================================================
function toggleConsoleExpand() {
  consoleExpanded = !consoleExpanded;
  $('hyperConsole').classList.toggle('expanded', consoleExpanded);
  $('expandConsoleBtn').textContent = consoleExpanded ? 'F · 收起' : 'F · 展开';
  $('toggleConsoleSizeBtn').textContent = consoleExpanded ? 'F · 标准台' : 'F · 操作台';
  setTimeout(() => { godEngine.resize(); godScene._forceRender = true; }, 60);
}

$('start').onclick = () => resumeFirstPerson({ keyboardFallback: true });
$('pause').onclick = () => pause(true);
$('resetSecBtn').onclick = () => {
  if (currentSection === 6) {
    sim6Arcade.reset();
    rebuildArcadeLevelBar();
    updateHUD();
    refreshHighDimConsole();
  } else {
    selectSection(currentSection);
  }
  resumeFirstPerson({ keyboardFallback: true });
};
$('toggleConsoleSizeBtn').onclick = toggleConsoleExpand;
$('expandConsoleBtn').onclick = toggleConsoleExpand;
$('mouseModeBtn').onclick = () => { audio.unlock(); voice.unlock(); toggleMouseControl(); };

$('voiceBtn').onclick = () => {
  audio.unlock();
  voice.unlock();
  const on = voice.toggle();
  $('voiceBtn').textContent = on ? '🎙️ 配音 开' : '🎙️ 配音 关';
  $('voiceBtn').classList.toggle('active', on);
  if (on) voice.speak('林夏通讯语音已重新接通，08号请指示。', { persona: 'linxia', force: true });
};

$('audioBtn').onclick = () => {
  audio.unlock();
  const muted = audio.toggleMute();
  $('audioBtn').textContent = muted ? 'V · 音效 关' : 'V · 音效 开';
};

$('nextSecHudBtn').onclick = () => {
  audio.unlock();
  voice.unlock();
  if (currentSection < TOTAL_SECTIONS) selectSection(currentSection + 1);
  else {
    ended = true;
    pause(false);
    $('ending').classList.remove('hidden');
    audio.evidenceUnlocked();
    voice.speak('恭喜通关第二章折页之间！我们终于一起走出了三维画纸！', { persona: 'linxia', force: true });
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
    voice.unlock();
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
      voice.unlock();
      selectSection(s.id);
      resumeFirstPerson({ keyboardFallback: true });
    };
    list.appendChild(b);
  }
}

$('sensitivity').oninput = e => {
  sensitivity = Number(e.target.value);
  $('sensvalue').textContent = sensitivity.toFixed(1) + '×';
};

$('godResetView').onclick = () => {
  godCamera.alpha = -Math.PI * 0.5;
  godCamera.beta = 1.02;
  godCamera.radius = 14.5;
  godCamera.target.set(0, 0.4, 0);
  godScene._forceRender = true;
};

document.querySelectorAll('[data-jump-w]').forEach(btn => {
  btn.onclick = () => {
    audio.unlock();
    voice.unlock();
    const wVal = Number(btn.getAttribute('data-jump-w'));
    if (currentSection === 6) {
      const targetSlice = wVal < -0.5 ? 1 : wVal > 0.5 ? sim6Arcade.dims[3] : Math.min(2, sim6Arcade.dims[3]);
      const diff = targetSlice - sim6Arcade.player[3];
      if (diff !== 0) arcadeStep(0, 0, 0, Math.sign(diff));
    } else if (currentSection === 8) {
      sim8Chiral.setXWFlip(wVal > 0.5 ? 180 : wVal < -0.5 ? 0 : 90);
      godScene._forceRender = true;
      updateHUD();
      refreshHighDimConsole();
    } else {
      targetW = wVal;
      stepGameplay(0, 0, wVal - pos4[3]);
      godScene._forceRender = true;
      updateHUD();
      refreshHighDimConsole();
    }
  };
});

$('godWSlider').oninput = e => {
  audio.unlock();
  const val = Number(e.target.value);
  if (currentSection === 6) {
    const targetSlice = Math.max(1, Math.min(sim6Arcade.dims[3], Math.round(((val + 2.4) / 4.8) * (sim6Arcade.dims[3] - 1)) + 1));
    const diff = targetSlice - sim6Arcade.player[3];
    if (diff !== 0) arcadeStep(0, 0, 0, Math.sign(diff));
  } else if (currentSection === 8) {
    sim8Chiral.setXWFlip(((val + 2.4) / 4.8) * 180);
    godScene._forceRender = true;
    updateHUD();
    refreshHighDimConsole();
  } else {
    targetW = val;
    stepGameplay(0, 0, val - pos4[3]);
    godScene._forceRender = true;
    updateHUD();
    refreshHighDimConsole();
  }
};

$('godMoveFwd').onclick = () => { if (currentSection === 6) arcadeStep(0, 1, 0, 0); else stepGameplay(0, 1.2, 0); updateHUD(); };
$('godMoveBack').onclick = () => { if (currentSection === 6) arcadeStep(0, -1, 0, 0); else stepGameplay(0, -1.2, 0); updateHUD(); };
$('godMoveLeft').onclick = () => { if (currentSection === 6) arcadeStep(-1, 0, 0, 0); else stepGameplay(-1.2, 0, 0); updateHUD(); };
$('godMoveRight').onclick = () => { if (currentSection === 6) arcadeStep(1, 0, 0, 0); else stepGameplay(1.2, 0, 0); updateHUD(); };
$('godWaveBtn').onclick = () => { audio.unlock(); gesture.left = time; gesture.right = time; compGesture.left = time; compGesture.right = time; audio.wave(true); };

// Pointer Lock + Mouse Orbit (Sec 06) + Right-Drag Look
document.addEventListener('pointerlockchange', () => {
  const acquired = document.pointerLockElement === worldCanvas;
  if (acquired && (ended || document.hidden || currentSection === 6)) {
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
  // Section 06: Smooth mouse sliding / dragging rotates the 3D 4D-grid orbit camera!
  if (currentSection === 6 && keyboardCorridor && !ended) {
    if (arcadeDragging || e.target === worldCanvas) {
      const factor = arcadeDragging ? 0.008 : 0.0028;
      arcadeCamYaw -= e.movementX * factor * sensitivity;
      arcadeCamPitch = Math.max(0.28, Math.min(1.42, arcadeCamPitch + e.movementY * factor * sensitivity));
    }
    return;
  }
  if (locked || (keyboardCorridor && rightDraggingLook)) {
    look.push(e.movementX, e.movementY, sensitivity);
  } else {
    look.transition();
  }
});

document.addEventListener('mouseup', () => { rightDraggingLook = false; arcadeDragging = false; });

worldCanvas.addEventListener('mousedown', e => {
  audio.unlock();
  voice.unlock();
  if (currentSection === 6) {
    arcadeDragging = true;
    return;
  }
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
  if (e.button === 0) { gesture.left = time; compGesture.right = time; audio.wave(true); }
  if (e.button === 2) { gesture.right = time; compGesture.left = time; audio.wave(true); }
});
worldCanvas.addEventListener('contextmenu', e => e.preventDefault());

// Global Smooth Mouse-Wheel W-Axis Control!
window.addEventListener('wheel', e => {
  if ((!locked && !keyboardCorridor) || ended) return;
  if (!$('menu').classList.contains('hidden')) return;
  // Let user scroll inside right console / labCanvas without hijacking
  if (e.target && (e.target.closest?.('#labCanvas') || e.target.closest?.('#menu'))) return;

  e.preventDefault();
  audio.unlock();
  voice.unlock();
  const dir = -Math.sign(e.deltaY); // Scroll UP -> W+ / Scroll DOWN -> W-
  if (!dir) return;

  if (currentSection === 6) {
    const now = performance.now();
    if (now - lastWheelStepMs < 110) return;
    lastWheelStepMs = now;
    arcadeStep(0, 0, 0, dir);
    return;
  }
  if (currentSection === 8) {
    sim8Chiral.stepXWFlip(dir * 18);
    pulseWShiftFx(sim8Chiral.xwDeg > 90 ? 1.8 : 0);
    godScene._forceRender = true;
    updateHUD();
    refreshHighDimConsole();
    return;
  }
  if (currentSection === 7) {
    stepGameplay(0, 0, dir * 0.45);
    godScene._forceRender = true;
    updateHUD();
    refreshHighDimConsole();
    return;
  }

  targetW = Math.max(-2.2, Math.min(2.2, targetW + dir * 0.45));
  pulseWShiftFx(targetW);
  godScene._forceRender = true;
}, { passive: false });

// Keyboard Controls (WASD, Space, Ctrl/Shift, Tab/Alt, R, X, Z, F, N, 1/2, plus silent Q/E fallback)
document.addEventListener('keydown', e => {
  const tag = e.target?.tagName;
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;

  if ((e.code === 'Tab' || e.code === 'AltLeft' || e.code === 'AltRight') && !ended) {
    e.preventDefault();
    if (e.repeat) return;
    audio.unlock();
    voice.unlock();
    toggleMouseControl();
    return;
  }
  if (e.code === 'Escape') {
    e.preventDefault();
    if (e.repeat) return;
    if (!$('menu').classList.contains('hidden')) resumeFirstPerson({ keyboardFallback: true });
    else if (locked) releaseMouseCursor({ announce: true });
    else pause(true);
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
    executeSectionAction();
    return;
  }

  // Section 07 quick ring switcher (1 / 2)
  if (currentSection === 7 && !e.repeat && (e.code === 'Digit1' || e.code === 'Digit2')) {
    const which = e.code === 'Digit1' ? 'B' : 'C';
    sim7Rings.selectRing(which);
    targetW = which === 'B' ? sim7Rings.ringB.w : sim7Rings.ringC.w;
    pos4[3] = targetW;
    showToast(which === 'B' ? '已切换操控【流金环 B】' : '已切换操控【星紫环 C】');
    updateHUD();
    refreshHighDimConsole();
    return;
  }

  // Section 06 Discrete 4D Eat-Dots & Sokoban Controls (WASD camera-relative, Space +Z, Ctrl/Shift -Z, X basis, Z undo)
  if (currentSection === 6 && !ended && $('menu').classList.contains('hidden')) {
    if (['KeyW', 'KeyS', 'KeyA', 'KeyD', 'Space', 'ControlLeft', 'ControlRight', 'ShiftLeft', 'ShiftRight', 'KeyX', 'KeyZ', 'KeyE', 'KeyQ', 'KeyC', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
      if (e.repeat) return;
      if (e.code === 'KeyX') { sim6Arcade.toggleBasisMode(); godScene._forceRender = true; updateHUD(); refreshHighDimConsole(); return; }
      if (e.code === 'KeyZ') { if (sim6Arcade.undo()) { godScene._forceRender = true; updateHUD(); refreshHighDimConsole(); } return; }
      if (e.code === 'Space') { arcadeStep(0, 0, 1, 0); return; }
      if (e.code === 'ControlLeft' || e.code === 'ControlRight' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') { arcadeStep(0, 0, -1, 0); return; }
      if (e.code === 'KeyE') { arcadeStep(0, 0, 0, 1); return; }
      if (e.code === 'KeyQ' || e.code === 'KeyC') { arcadeStep(0, 0, 0, -1); return; }

      // Camera-aligned WASD snapping to nearest 90° grid axis!
      const fwdX = -Math.sin(arcadeCamYaw);
      const fwdY = -Math.cos(arcadeCamYaw);
      let vx = 0, vy = 0;
      if (e.code === 'KeyW' || e.code === 'ArrowUp') { vx = fwdX; vy = fwdY; }
      else if (e.code === 'KeyS' || e.code === 'ArrowDown') { vx = -fwdX; vy = -fwdY; }
      else if (e.code === 'KeyD' || e.code === 'ArrowRight') { vx = -fwdY; vy = fwdX; }
      else if (e.code === 'KeyA' || e.code === 'ArrowLeft') { vx = fwdY; vy = -fwdX; }
      if (Math.abs(vx) >= Math.abs(vy)) arcadeStep(Math.sign(vx), 0, 0, 0);
      else arcadeStep(0, Math.sign(vy), 0, 0);
      return;
    }
  }

  if (!locked && !keyboardCorridor) return;
  if (e.code === 'Space' && !e.repeat) {
    e.preventDefault();
    jumpQueued = true;
  }
  if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'KeyC', 'ShiftLeft', 'ShiftRight', 'Space'].includes(e.code)) {
    e.preventDefault();
    keys.add(e.code);
  }
});

document.addEventListener('keyup', e => { keys.delete(e.code); });
window.addEventListener('blur', () => { clearKeys(); rightDraggingLook = false; arcadeDragging = false; });
window.addEventListener('resize', () => { fpEngine.resize(); godEngine.resize(); });

// ============================================================
// Initialize Section 1 & Expose Read-Only Telemetry for E2E Tests
// ============================================================
selectSection(1, { speakIntro: false });
ready = true;
updateMouseModeUI();

window.__CH2_STATE__ = () => ({
  ready,
  locked,
  keyboardCorridor,
  currentSection,
  totalSections: TOTAL_SECTIONS,
  chamberSize: CHAMBER_SIZE,
  pos4: [...pos4],
  targetW,
  camY: fpCamera.position.y,
  linY: fpLinXia.root.position.y,
  w0Alpha: phaseClarity(pos4[3], 0.0, 1.55),
  wpAlpha: phaseClarity(pos4[3], 1.8, 1.55),
  wmAlpha: phaseClarity(pos4[3], -1.8, 1.55),
  sec2Step3Alpha: fpSectionRoots[2]?.steps?.[2]?.deckMat?.alpha ?? null,
  sec2Step3Visible: fpSectionRoots[2]?.steps?.[2]?.deck?.isEnabled() ?? null,
  arcadeLevel: sim6Arcade.spec.id,
  chiralXW: sim8Chiral.xwDeg,
  chiralDet: sim8Chiral.evaluate().det,
  voiceEnabled: voice.enabled
});

// ============================================================
// Main Render Loop (60 FPS FP Scene + 20 Hz God Console)
// ============================================================
function waveVal(startT) {
  const e = time - startT;
  return e >= 0 && e < 1.35 ? Math.sin((e * Math.PI) / 1.35) : 0;
}

fpEngine.runRenderLoop(() => {
  const dt = Math.min(fpEngine.getDeltaTime() / 1000, 0.05);
  time += dt;

  if ((locked || keyboardCorridor) && ready && !ended && $('menu').classList.contains('hidden')) {
    if (currentSection !== 6) {
      look.frame(dt, 0);
      const strafe = Number(keys.has('KeyD')) - Number(keys.has('KeyA'));
      const forward = Number(keys.has('KeyW')) - Number(keys.has('KeyS'));
      const keyW = Number(keys.has('KeyE')) - Number(keys.has('KeyQ') || keys.has('KeyC'));
      const sprinting = keys.has('ShiftLeft') || keys.has('ShiftRight');

      if (keyW !== 0) {
        if (currentSection === 8) {
          sim8Chiral.stepXWFlip(keyW * 95 * dt);
        } else {
          targetW = Math.max(-2.2, Math.min(2.2, targetW + keyW * 2.1 * dt));
        }
      }

      const len = Math.hypot(strafe, forward) || 1;
      const speed = sprinting ? 7.2 : 4.6;
      const vx = (Math.cos(look.yaw) * (strafe / len) + Math.sin(look.yaw) * (forward / len)) * (strafe || forward ? speed : 0);
      const vz = (-Math.sin(look.yaw) * (strafe / len) + Math.cos(look.yaw) * (forward / len)) * (strafe || forward ? speed : 0);

      // Smoothly glide pos4[3] toward targetW (buttery smooth mouse wheel!)
      const dw = (targetW - pos4[3]) * Math.min(1, dt * 11);
      const dx = vx * dt;
      const dz = vz * dt;

      if (Math.hypot(dx, dz, dw) > 1e-5 || jumpQueued || !playerGrounded || currentSection === 2) {
        stepGameplay(dx, dz, dw, dt);
        godScene._forceRender = true;
        updateHUD();
        refreshHighDimConsole();
      }
      const distMoved = Math.hypot(dx, dz);
      locomotion = gait.step(distMoved, dt, distMoved / Math.max(dt, 0.001), !playerGrounded, false);
    }
  }

  const [px, footY, pz, pw] = pos4;
  const eyeY = footY + 1.65;
  const wL = waveVal(gesture.left);
  const wR = waveVal(gesture.right);
  const cWR = waveVal(compGesture.right);

  // Camera & Local Voxel Body
  if (currentSection === 6) {
    // Dedicated 3D Orbital Camera framing all 4D Eat-Dots / Sokoban boards cleanly!
    const camX = Math.sin(arcadeCamYaw) * Math.cos(arcadeCamPitch) * arcadeCamRadius;
    const camY = 1.6 + Math.sin(arcadeCamPitch) * arcadeCamRadius;
    const camZ = Math.cos(arcadeCamYaw) * Math.cos(arcadeCamPitch) * arcadeCamRadius;
    fpCamera.position.set(camX, camY, camZ);
    fpCamera.setTarget(new B.Vector3(0, 1.0, 0));
    fpPlayerVoxel.root.setEnabled(false);
  } else {
    look.applyCamera(B, fpCamera);
    fpCamera.position.set(px, eyeY, pz);
    fpPlayerVoxel.root.setEnabled(true);
    fpPlayerVoxel.pose({
      position: [px, eyeY, pz],
      yaw: look.yaw,
      pitch: look.pitch,
      leftLegAngle: locomotion.leftLeg,
      rightLegAngle: locomotion.rightLeg,
      waveLeft: wL,
      waveRight: wR
    });
  }

  // Co-Located 20m W-Axis Slices (STRICTLY anchored at Y=0, cross-fading opacity in place!)
  const showChambers = currentSection !== 6;
  const hideDeckInSec2 = currentSection === 2; // Abyss chasm -> ZERO alpha occlusion on floating steps!
  const c0 = phaseClarity(pw, 0.0, 1.55);
  const cP = phaseClarity(pw, 1.8, 1.55);
  const cM = phaseClarity(pw, -1.8, 1.55);

  const applyChamber = (ch, clarity, yBias) => {
    const vis = showChambers && clarity > 0.02;
    ch.root.setEnabled(vis);
    if (!vis) return;
    ch.setLayerOpacity(clarity, { hideDeck: hideDeckInSec2 });
    ch.root.position.y = yBias;
    const ripple = 1 + (1 - clarity) * 0.035;
    ch.root.scaling.set(ripple, 1, ripple);
    if (ch.deckTex) {
      ch.deckTex.uOffset = pw * 0.16;
      ch.deckTex.vOffset = pw * 0.09;
    }
  };
  applyChamber(fpChamberW0, c0, 0.000);
  applyChamber(fpChamberWP, cP, 0.004);
  applyChamber(fpChamberWM, cM, -0.004);

  // Subtle surrounding cosmic drift with W
  fpCosmos.rotation.y = pw * 0.34 + time * 0.025;
  cosmicRings.forEach((r, idx) => { r.rotation.z = pw * (0.25 + idx * 0.14); });

  // Companion Lin Xia visibility & section updates
  const meta = CHAPTER2_SECTIONS[currentSection - 1];
  fpLinXia.root.setEnabled(meta.hasCompanion);

  let promptHtml = '';

  if (currentSection === 1 && fpSectionRoots[1]) {
    const s1 = fpSectionRoots[1];
    s1.arch0.material.alpha = 0.10 + 0.85 * c0;
    s1.archP.material.alpha = 0.10 + 0.85 * cP;
    s1.archM.material.alpha = 0.10 + 0.85 * cM;
    s1.beaconRing.rotation.z = time * 1.4;
    s1.beaconRing.material.alpha = 0.25 + 0.75 * cP;
    fpLinXia.setAlpha(0.24 + 0.76 * cP);
    fpLinXia.pose({ position: [-2.2, 0, 3.8], yaw: Math.atan2(px + 2.2, pz - 3.8), waveLeft: 0.65 + Math.sin(time * 4) * 0.3, waveRight: cWR, breatheTime: time });
    promptHtml = Math.abs(pw - 1.8) > 0.45
      ? `原地保持 XYZ 不动 · 向上滚动 <kbd>鼠标滚轮</kbd> 切入 W=+1.8 流金折页，看林夏从半透明渐实`
      : `已切入 W=+1.8 流金折页！走向前方大厅的林夏汇合`;
  } else if (currentSection === 2 && fpSectionRoots[2]) {
    const s2 = fpSectionRoots[2];
    for (const item of s2.steps) {
      const alpha = sim2Steps.stepVisualOpacity(item.spec, pw);
      const solid = sim2Steps.isStepSolid(item.spec, pw);
      item.deckMat.alpha = alpha;
      item.railMat.alpha = solid ? 1.0 : 0.78;
      item.deck.scaling.y = solid ? 1.0 : 0.65;
    }
    const topStep = SEC2_STEPS[5];
    fpLinXia.setAlpha(0.28 + 0.72 * c0);
    fpLinXia.pose({ position: [topStep.x, topStep.y, topStep.z + 0.5], yaw: Math.atan2(px - topStep.x, pz - topStep.z), waveRight: 0.7 + Math.sin(time * 4) * 0.25, breatheTime: time });
    const nextStep = SEC2_STEPS.find(s => !sim2Steps.visited.has(s.id)) || topStep;
    const wLbl = nextStep.wTarget > 0 ? 'W=+1.8 流金' : nextStep.wTarget < 0 ? 'W=−1.8 星轨' : 'W=0.0 青苍';
    promptHtml = `当前已登 ${sim2Steps.visited.size}/6 阶 · 滚动 <kbd>鼠标滚轮</kbd> 切入【${wLbl}】使第 ${nextStep.index} 阶变实，按 <kbd>Space</kbd> 跳上去！`;
  } else if (currentSection === 3 && fpSectionRoots[3]) {
    const s3 = fpSectionRoots[3];
    const tr = sim3Prism.trace();
    for (const w of s3.walls) {
      const cw = phaseClarity(pw, w.spec.w, 1.55);
      w.mat.alpha = 0.12 + 0.84 * cw;
    }
    s3.wellA.ring.position.y = 1.5 + Math.sin(time * 3.5) * 0.6;
    s3.wellA.mat.alpha = tr.wellAActive ? 0.68 : 0.26;
    s3.wellB.ring.position.y = 1.5 + Math.cos(time * 3.5) * 0.6;
    s3.wellB.mat.alpha = tr.wellBActive ? 0.68 : 0.26;

    s3.prisms.forEach((p, idx) => {
      const cp = phaseClarity(pw, p.spec.w, 1.55);
      p.baseMat.alpha = 0.25 + 0.72 * cp;
      p.crystalMat.alpha = 0.28 + 0.70 * cp;
      const targetAngle = sim3Prism.dirs[idx] * (Math.PI / 2);
      p.headPivot.rotation.y = targetAngle;
    });

    // Update live 3D glowing laser beam tubes across all 3 slices
    s3.beams.forEach((b, i) => {
      const seg = tr.segments[i];
      if (!seg) { b.mesh.setEnabled(false); return; }
      b.mesh.setEnabled(true);
      const dx = seg.to[0] - seg.from[0];
      const dz = seg.to[1] - seg.from[1];
      const len = Math.max(0.1, Math.hypot(dx, dz));
      b.mesh.position.set(seg.from[0] + dx * 0.5, 1.5, seg.from[1] + dz * 0.5);
      b.mesh.scaling.set(1, 1, len);
      b.mesh.rotation.y = Math.atan2(dx, dz);
      const cs = phaseClarity(pw, seg.w, 1.55);
      b.mat.alpha = 0.22 + 0.78 * cs;
    });
    s3.recMat.emissiveColor = B.Color3.FromHexString(tr.receiverLit ? '#69f0ae' : '#58a6ff').scale(tr.receiverLit ? 0.95 : 0.45);
    fpLinXia.setAlpha(0.26 + 0.74 * cM);
    fpLinXia.pose({ position: [-6.4, 0, 5.2], yaw: Math.atan2(px + 6.4, pz - 5.2), waveRight: 0.7, breatheTime: time });

    const nearIdx = sim3Prism.nearestPrism(px, pz, pw, 3.6);
    promptHtml = tr.complete
      ? `三折页激光回路已全线打通！按 <kbd>N</kbd> 进入第四小节`
      : nearIdx >= 0
        ? `按 <kbd>R</kbd> 旋转【${PRISM_SPEC.prisms[nearIdx].label}】90° 瞄准目标光井！`
        : !tr.wellAActive
          ? `在 W=0 走近【棱镜 ①】按 <kbd>R</kbd> 朝东射入光井 A 绕开前方钛墙`
          : !tr.wellBActive
            ? `向上滚动 <kbd>鼠标滚轮</kbd> 切入 W=+1.8 流金折页，走近【棱镜 ②】按 <kbd>R</kbd> 朝北射入光井 B`
            : `向下滚动 <kbd>鼠标滚轮</kbd> 切入 W=−1.8 星轨折页，走近【棱镜 ③】按 <kbd>R</kbd> 朝西直击核心！`;
  } else if (currentSection === 4 && fpSectionRoots[4]) {
    const s4 = fpSectionRoots[4];
    s4.glassMat.alpha = 0.05 + 0.34 * c0;
    s4.frameMat.alpha = 0.14 + 0.82 * c0;
    s4.core.setEnabled(!sim4Vault.carryingCore && !sim4Vault.coreDelivered);
    s4.core.rotation.y = time * 1.8;
    s4.core.position.y = 1.45 + Math.sin(time * 3) * 0.14;
    fpLinXia.setAlpha(0.24 + 0.76 * c0);
    fpLinXia.pose({ position: [-1.4, 0, 1.4], yaw: Math.atan2(px + 1.4, pz - 1.4), waveLeft: 0.65, breatheTime: time });
    promptHtml = !sim4Vault.carryingCore && !sim4Vault.coreDelivered
      ? `滚动 <kbd>鼠标滚轮</kbd> 切入 W=+1.8 让玻璃墙透明淡出，走入中央再滚回 W=0 拾取核心`
      : !sim4Vault.coreDelivered
        ? `已拿到核心！再滚轮切入 W=+1.8 穿出玻璃墙，送往右侧绿色接收台`
        : `玻璃牢笼已攻破！按 <kbd>N</kbd> 进入第五小节多墙四维迷宫`;
  } else if (currentSection === 5 && fpSectionRoots[5]) {
    const s5 = fpSectionRoots[5];
    for (const g of s5.sliceGroups) {
      const cs = phaseClarity(pw, g.w, 1.55);
      g.mat.alpha = 0.08 + 0.86 * cs;
      g.capMat.alpha = 0.16 + 0.82 * cs;
    }
    for (const b of s5.beacons) {
      const done = sim5Maze.beaconsFound.has(b.spec.id);
      b.mesh.setEnabled(!done);
      b.mesh.rotation.y = time * 2.2;
      b.mat.alpha = 0.28 + 0.72 * phaseClarity(pw, b.spec.w, 1.55);
    }
    s5.exitRing.rotation.y = time * 1.6;
    promptHtml = `5×5 多墙四维迷宫 · 已激活信标 ${sim5Maze.beaconsFound.size}/2 · 遇到死墙时滚动 <kbd>鼠标滚轮</kbd> 切换折页穿墙绕行！`;
  } else if (currentSection === 6 && fpSectionRoots[6]) {
    fpSectionRoots[6].sync(sim6Arcade, time);
    promptHtml = `<kbd>WASD</kbd> 平面 · <kbd>Space</kbd> 上(+Z) · <kbd>Ctrl/Shift</kbd> 下(−Z) · <kbd>滚轮</kbd> W 轴移动/推箱 · 拖动鼠标转视角 · <kbd>X</kbd> 切基底 · <kbd>Z</kbd> 撤销`;
  } else if (currentSection === 7 && fpSectionRoots[7]) {
    const s7 = fpSectionRoots[7];
    s7.ringAMat.alpha = 0.24 + 0.72 * c0;
    s7.ringB.position.x = sim7Rings.ringB.x;
    s7.ringBMat.alpha = 0.28 + 0.72 * phaseClarity(pw, sim7Rings.ringB.w, 1.55);
    s7.ringC.position.x = sim7Rings.ringC.x;
    s7.ringCMat.alpha = 0.28 + 0.72 * phaseClarity(pw, sim7Rings.ringC.w, 1.55);
    const activeR = sim7Rings.activeRing === 'B' ? s7.ringB : s7.ringC;
    s7.selHalo.position.copyFrom(activeR.position);
    s7.pRightMat.alpha = 0.16 + 0.78 * cP;
    s7.pLeftMat.alpha = 0.16 + 0.78 * cM;
    const actName = sim7Rings.activeRing === 'B' ? '流金环 B（需经 W=−1.8 避开右锁柱）' : '星紫环 C（需经 W=+1.8 避开左锁柱）';
    promptHtml = `当前操控：<b>${actName}</b> · <kbd>1</kbd>/<kbd>2</kbd> 换环 · <kbd>鼠标滚轮</kbd> 调 W 相位 · <kbd>A</kbd>/<kbd>D</kbd> 推入对应底座！`;
  } else if (currentSection === 8 && fpSectionRoots[8]) {
    const s8 = fpSectionRoots[8];
    const ev = sim8Chiral.evaluate();
    s8.keyRig.setFromVertices(ev.verts);
    // Synchronize the side-by-side 2D paper-cutout flip analogy 1:1 with XW flip angle!
    const flipRad = (ev.xwDeg * Math.PI) / 180;
    s8.paperPivot.rotation.z = flipRad;
    s8.paperPivot.position.y = 1.35 + Math.sin(flipRad) * 0.85;
    s8.xwHalo.rotation.y = flipRad;
    s8.keyAnchor.position.z = sim8Chiral.complete ? 4.6 : 0.2;
    fpLinXia.setAlpha(1.0);
    fpLinXia.pose({ position: [3.2, 0, 3.6], yaw: Math.atan2(px - 3.2, pz - 3.6), waveRight: 0.75, breatheTime: time });
    promptHtml = ev.matchesLock
      ? `✨ 钥匙已在 XW 平面翻转 180° 为左旋镜像（det = ${ev.det.toFixed(2)}）！按 <kbd>R</kbd> 插入北侧锁孔通关！`
      : `滚动 <kbd>鼠标滚轮</kbd> 沿第四维 XW 平面连续翻转钥匙至 180°（当前 ${Math.round(ev.xwDeg)}°，观察左侧二维纸片人同步翻面！）`;
  }

  // Smooth continuous W-phase lighting & fog morphing
  const wNorm = Math.max(-1, Math.min(1, pw / 1.8));
  if (wNorm >= 0) {
    fpAccentLight.diffuse.set(0.30 + wNorm * 0.68, 0.92 - wNorm * 0.14, 0.84 - wNorm * 0.52);
    fpScene.fogColor.set(0.024 + wNorm * 0.056, 0.062 + wNorm * 0.008, 0.102 - wNorm * 0.054);
  } else {
    const m = -wNorm;
    fpAccentLight.diffuse.set(0.30 + m * 0.06, 0.92 - m * 0.26, 0.84 + m * 0.16);
    fpScene.fogColor.set(0.024 - m * 0.010, 0.062 - m * 0.020, 0.102 + m * 0.038);
  }
  fpAccentLight.position.set(px * 0.35, 5.2, pz * 0.35);

  const promptEl = $('ch2Prompt');
  if (promptEl) {
    if (promptEl._lastHtml !== promptHtml) {
      promptEl._lastHtml = promptHtml;
      promptEl.innerHTML = promptHtml;
    }
    promptEl.classList.toggle('show', (locked || keyboardCorridor) && !ended && $('menu').classList.contains('hidden'));
  }

  fpScene.render();

  // ============================================================
  // Update Always-Live High-Dimensional Tactical Console (#labCanvas) at 20Hz
  // ============================================================
  godFrameCounter = (godFrameCounter + 1) % 3;
  if ((godFrameCounter === 0 && (locked || keyboardCorridor)) || !ready || godScene._forceRender) {
    godScene._forceRender = false;
    const isArcade = currentSection === 6;
    godStandardRoot.setEnabled(!isArcade);
    godArcadeRig.root.setEnabled(isArcade);

    if (isArcade) {
      godArcadeRig.sync(sim6Arcade, time);
    } else {
      const godWX = pw * GOD_W_SCALE;
      godActiveFrame.position.x = godWX;
      godPlayerVoxel.pose({
        position: [godWX + px * GOD_POS_SCALE, footY * 0.25, pz * GOD_POS_SCALE],
        yaw: look.yaw,
        leftLegAngle: locomotion.leftLeg,
        rightLegAngle: locomotion.rightLeg,
        waveLeft: wL,
        waveRight: wR,
        breatheTime: time
      });

      godLinVoxel.root.setEnabled(meta.hasCompanion);
      if (meta.hasCompanion) {
        let lw = 0, lx = 0, ly = 0, lz = 0.8;
        if (currentSection === 1) { lw = 1.8; lx = -2.2 * GOD_POS_SCALE; lz = 3.8 * GOD_POS_SCALE; }
        else if (currentSection === 2) { lw = 0.0; lx = 0; ly = 0.78; lz = 6.9 * GOD_POS_SCALE; }
        else if (currentSection === 3) { lw = -1.8; lx = -6.4 * GOD_POS_SCALE; lz = 5.2 * GOD_POS_SCALE; }
        else if (currentSection === 4) { lw = 0.0; lx = -0.2; lz = 0.2; }
        else if (currentSection === 8) { lw = 0.0; lx = 0.5; lz = 0.5; }
        godLinVoxel.pose({ position: [lw * GOD_W_SCALE + lx, ly, lz], yaw: Math.PI, waveRight: 0.65, breatheTime: time });
      }

      godVaultBox.setEnabled(currentSection === 4);
      godRingA.setEnabled(currentSection === 7);
      godRingB.setEnabled(currentSection === 7);
      godRingC.setEnabled(currentSection === 7);
      if (currentSection === 7) {
        godRingA.position.set(0, 0.7, 0);
        godRingB.position.set(sim7Rings.ringB.w * GOD_W_SCALE + sim7Rings.ringB.x * GOD_POS_SCALE, 0.7, 0);
        godRingC.position.set(sim7Rings.ringC.w * GOD_W_SCALE + sim7Rings.ringC.x * GOD_POS_SCALE, 0.7, 0);
      }
    }

    godScene.render();
    drawWPhaseGauge(pw);
  }

  if (time - lastStatsUpdate > 0.25) {
    lastStatsUpdate = time;
    const rawFps = fpEngine.getFps();
    const fps = Number.isFinite(rawFps) ? Math.min(240, Math.round(rawFps)) : 60;
    $('stats').textContent = `${fps} FPS · ${locked ? '🔒 视角锁定(Tab 释放)' : keyboardCorridor ? '🖱️ 鼠标自由(Tab 掌控)' : '暂停'} · 滚轮 W 折页`;
  }
});
