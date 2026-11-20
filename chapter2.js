/**
 * Beyond 3D — Chapter 2: 《折页之间》 (Between the Pages)
 *
 * Full First-Person 3D Experience (#world) + God-View 4D Hypercube Laboratory (#labCanvas via F).
 * Both views share the same authoritative 4D Astronaut state and feature living 3D Astronaut
 * models (createAstronautSuit) so the player always experiences human-scale presence and
 * God's-eye spatial revelation across 6 independent story sections.
 */
import { createAstronautSuit, SUIT_COLORS } from './astronaut.js';
import { LookController } from './look.js';
import { GroundMotion, GroundGait } from './grounded-motion.js';
import { SpaceAudio } from './sound.js';
import {
  INTERIOR_L, STAGE1_BEACONS, Stage1Simulation,
  VAULT_SPEC, VaultSimulation, vaultClearance4D,
  RING_SPEC, RingUnlinkSimulation,
  ChiralKeySimulation,
  hypersphereSlice, xwTiltedBodyIntersection,
  CHAPTER2_SECTIONS
} from './chapter2-core.js';

const B = window.BABYLON;
const $ = id => document.getElementById(id);
const SAVE_KEY = 'beyond3d_ch2_save_v2';

const worldCanvas = $('world');
const look = new LookController();
const ground = new GroundMotion();
const gait = new GroundGait();
const audio = new SpaceAudio();

// Core simulations for the 6 independent sections
const sim1 = new Stage1Simulation();
const sim2 = new VaultSimulation();
const sim3 = new RingUnlinkSimulation();
const sim4 = new ChiralKeySimulation();

// Shared 4D astronaut state: [x, y_eye, z, w]
let currentSection = 1;
const completedSections = new Set();
let player4 = [0, 0, -2.2, 0];
let velocity = [0, 0, 0];
let keys = new Set();
let jumpQueued = false;
let sensitivity = 1.0;
let time = 0;
let gesture = { left: -10, right: -10 };
let companionGesture = { left: -10, right: -10 };
let locomotion = { leftLeg: 0, rightLeg: 0, crouchScale: 1 };
let strideSign = 0;
let lastWBeep = 0;
let toastTimer = null;

// Section-specific interactive states
let sec3Grabbed = false;
let sec4PlayerPos = [0, 0, -2.0];
let sec4HandshakeDone = false;
let sec5Pos = [0, 0, -2.0, -2.2];
const sec5Phases = new Set(); // 'birth' | 'equator' | 'vanish'
let sec5MetCompanion = false;
let sec6Pos = [0, 0, -2.1, 0];
let sec6Mode = 'xray'; // 'xray' | 'tilt'
let sec6TiltDeg = 38;
const sec6Observed = new Set(); // 'xray' | 'tilt'

// Pointer lock & lab modal state (mirrors Chapter 1's battle-tested lifecycle)
let ready = false;
let locked = false;
let keyboardCorridor = false;
let escapeReturnPending = false;
let godOpen = false;
let ended = false;
let lockTime = 0;

// Restore saved progress
try {
  const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
  if (saved && Array.isArray(saved.completed)) {
    saved.completed.forEach(s => completedSections.add(Number(s)));
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
  toastTimer = setTimeout(() => el.classList.add('hidden'), 4200);
}

function pulseWShift(wVal) {
  const el = $('wShiftFx');
  if (!el) return;
  const color = wVal > 0.35 ? '#dfbb73' : wVal < -0.35 ? '#68a7ff' : '#80ccb9';
  el.style.boxShadow = `inset 0 0 70px 12px ${color}40`;
  el.style.opacity = '1';
  requestAnimationFrame(() => {
    setTimeout(() => { el.style.opacity = '0'; }, 110);
  });
}

function markSectionDone(secId, msg) {
  const isNew = !completedSections.has(secId);
  completedSections.add(secId);
  saveProgress();
  updateHUD();
  if (isNew) {
    audio.evidenceUnlocked();
    showToast(msg);
  }
}

// ============================================================
// Helper: Build Standard Materials & 3D Astronaut Suits
// ============================================================
function createStdMat(scene, name, hex, { alpha = 1, emissive = 0.18, wireframe = false, unlit = false } = {}) {
  const m = new B.StandardMaterial(name, scene);
  m.diffuseColor = B.Color3.FromHexString(hex);
  m.emissiveColor = m.diffuseColor.scale(emissive);
  m.specularColor = new B.Color3(0.22, 0.3, 0.35);
  m.alpha = alpha;
  m.wireframe = wireframe;
  m.disableLighting = unlit;
  m.backFaceCulling = false;
  return m;
}

function buildAstronautAvatar(scene, prefix, { isLocalFirstPerson = false, tintSuit = null } = {}) {
  const matCache = new Map();
  const matFactory = kind => {
    if (matCache.has(kind)) return matCache.get(kind);
    const hex = (kind === 'suit' && tintSuit) ? tintSuit : (SUIT_COLORS[kind] || '#e8ece5');
    const m = createStdMat(scene, `${prefix}_suit_${kind}`, hex, { emissive: 0.15 });
    matCache.set(kind, m);
    return m;
  };
  const parent = new B.TransformNode(`${prefix}_parent`, scene);
  const suit = createAstronautSuit(B, scene, { parent, material: matFactory });
  for (const part of suit.parts) {
    if (isLocalFirstPerson && part.metadata?.hideLocal) {
      part.setEnabled(false);
    }
    if (isLocalFirstPerson && part.name === 'torso') {
      part.scaling.set(0.50, 0.72, 0.45);
      part.position.z = -0.28;
    }
  }
  return {
    parent,
    ...suit,
    materials: [...matCache.values()],
    setAlpha(alpha) {
      for (const m of matCache.values()) m.alpha = alpha;
      parent.setEnabled(alpha > 0.02);
    }
  };
}

function poseAstronaut(avatar, pos3, yaw, pitch = 0, {
  leftLeg = 0, rightLeg = 0, waveLeft = 0, waveRight = 0,
  mirrorX = false, tiltZRad = 0, isLocalFirstPerson = false
} = {}) {
  avatar.body.position.set(pos3[0], pos3[1], pos3[2]);
  avatar.body.scaling.set(mirrorX ? -1 : 1, 1, 1);
  avatar.legs.left.rotation.x = leftLeg;
  avatar.legs.right.rotation.x = rightLeg;
  const qYawPitch = B.Quaternion.RotationYawPitchRoll(yaw, isLocalFirstPerson ? 0 : pitch, tiltZRad);
  avatar.body.rotationQuaternion = qYawPitch;
  if (isLocalFirstPerson) {
    const back = new B.Vector3(0, 0, -0.28).rotateByQuaternionToRef(qYawPitch, new B.Vector3());
    avatar.body.position.addInPlace(back);
  }
  avatar.arms.left.rotation.x = -waveLeft * 2.2;
  avatar.arms.left.rotation.z = waveLeft * 0.22;
  avatar.arms.right.rotation.x = -waveRight * 2.2;
  avatar.arms.right.rotation.z = -waveRight * 0.22;
}

// ============================================================
// 1. FIRST-PERSON 3D SCENE (#world)
// ============================================================
const fpEngine = new B.Engine(worldCanvas, true, { stencil: true, preserveDrawingBuffer: true });
fpEngine.setHardwareScalingLevel(1 / Math.min(Math.max(window.devicePixelRatio || 1, 1), 1.5));
const fpScene = new B.Scene(fpEngine);
fpScene.clearColor = new B.Color4(0.03, 0.075, 0.115, 1);

const fpCamera = new B.UniversalCamera('fpEyes', new B.Vector3(0, 1.68, -2.2), fpScene);
fpCamera.inputs.clear();
fpCamera.fov = 1.12;
fpCamera.minZ = 0.045;
fpCamera.maxZ = 90;

const fpHemi = new B.HemisphericLight('fpHemi', new B.Vector3(0.25, 1, -0.35), fpScene);
fpHemi.intensity = 0.85;
const fpDir = new B.DirectionalLight('fpDir', new B.Vector3(-0.5, -1, 0.4), fpScene);
fpDir.intensity = 0.65;

// First-person local astronaut body (visible when looking down / waving hands!)
const fpLocalAvatar = buildAstronautAvatar(fpScene, 'fpLocal', { isLocalFirstPerson: true });

// Ambient 4D Hypercube outer frame around the station deck
const fpAmbientRoot = new B.TransformNode('fpAmbient', fpScene);
{
  const S = 5.4;
  const pts = [
    [-S, -0.5, -S], [S, -0.5, -S], [S, 4.5, -S], [-S, 4.5, -S],
    [-S, -0.5, S], [S, -0.5, S], [S, 4.5, S], [-S, 4.5, S]
  ];
  const edges = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
  const cage = B.MeshBuilder.CreateLineSystem('fpOuterCage', {
    lines: edges.map(([a, b]) => [new B.Vector3(...pts[a]), new B.Vector3(...pts[b])])
  }, fpScene);
  cage.color = B.Color3.FromHexString('#264f5e');
  cage.alpha = 0.5;
  cage.parent = fpAmbientRoot;
}

// Build First-Person Section Groups
const fpGroups = {};
for (let i = 1; i <= 6; i++) {
  fpGroups[i] = new B.TransformNode('fpSec' + i, fpScene);
}

// ---- FP SECTION 1: 看不见的同路人 (3 W-Page Decks + 2 Companion Astronauts + Exit Portal) ----
const fpS1 = {};
{
  const root = fpGroups[1];
  // W=0 Broken White Deck (South platform + North platform with gap in middle)
  const deckW0 = new B.TransformNode('fpS1_w0', fpScene);
  deckW0.parent = root;
  const matW0 = createStdMat(fpScene, 'fpS1_matW0', '#d8e4e2', { emissive: 0.12 });
  const southPlat = B.MeshBuilder.CreateBox('sPlat', { width: 4.8, height: 0.16, depth: 2.4 }, fpScene);
  southPlat.position.set(0, -0.08, -2.0);
  southPlat.material = matW0;
  southPlat.parent = deckW0;
  const northPlat = B.MeshBuilder.CreateBox('nPlat', { width: 4.8, height: 0.16, depth: 2.2 }, fpScene);
  northPlat.position.set(0, -0.08, 2.3);
  northPlat.material = matW0;
  northPlat.parent = deckW0;

  // W=+1.8 Golden Bridge Deck + Golden Companion Astronaut
  const deckWP = new B.TransformNode('fpS1_wp', fpScene);
  deckWP.parent = root;
  const matWP = createStdMat(fpScene, 'fpS1_matWP', '#dfbb73', { emissive: 0.25 });
  const bridgeWP = B.MeshBuilder.CreateBox('bridgeWP', { width: 3.8, height: 0.14, depth: 6.4 }, fpScene);
  bridgeWP.position.set(-0.8, -0.07, 0.2);
  bridgeWP.material = matWP;
  bridgeWP.parent = deckWP;
  const archWP = B.MeshBuilder.CreateTorus('archWP', { diameter: 3.6, thickness: 0.1, tessellation: 36 }, fpScene);
  archWP.position.set(-1.4, 1.4, 0.4);
  archWP.material = matWP;
  archWP.parent = deckWP;
  const compWP = buildAstronautAvatar(fpScene, 'fpS1_compWP', { tintSuit: '#f5e2b8' });
  compWP.parent.parent = deckWP;

  // W=-1.8 Sapphire Sky-Bridge + Sapphire Companion Astronaut
  const deckWM = new B.TransformNode('fpS1_wm', fpScene);
  deckWM.parent = root;
  const matWM = createStdMat(fpScene, 'fpS1_matWM', '#68a7ff', { emissive: 0.25 });
  const bridgeWM = B.MeshBuilder.CreateBox('bridgeWM', { width: 3.8, height: 0.14, depth: 6.4 }, fpScene);
  bridgeWM.position.set(0.8, -0.07, 0.2);
  bridgeWM.material = matWM;
  bridgeWM.parent = deckWM;
  const archWM = B.MeshBuilder.CreateTorus('archWM', { diameter: 3.6, thickness: 0.1, tessellation: 36 }, fpScene);
  archWM.position.set(1.4, 1.4, 1.8);
  archWM.material = matWM;
  archWM.parent = deckWM;
  const compWM = buildAstronautAvatar(fpScene, 'fpS1_compWM', { tintSuit: '#cce0ff' });
  compWM.parent.parent = deckWM;

  // North Exit Portal Ring on W=0
  const exitRing = B.MeshBuilder.CreateTorus('fpS1_exit', { diameter: 2.2, thickness: 0.12, tessellation: 40 }, fpScene);
  exitRing.position.set(0, 1.2, 2.6);
  exitRing.material = createStdMat(fpScene, 'fpS1_exitMat', '#80ccb9', { emissive: 0.55 });
  exitRing.parent = deckW0;

  fpS1.deckW0 = deckW0; fpS1.matW0 = matW0;
  fpS1.deckWP = deckWP; fpS1.matWP = matWP; fpS1.compWP = compWP;
  fpS1.deckWM = deckWM; fpS1.matWM = matWM; fpS1.compWM = compWM;
  fpS1.exitRing = exitRing;
}

// ---- FP SECTION 2: 密室里的求救者 (Sealed 6-Wall Glass Vault + Trapped Companion + Core + Pedestal) ----
const fpS2 = {};
{
  const root = fpGroups[2];
  const floor = B.MeshBuilder.CreateBox('fpS2_floor', { width: 7.4, height: 0.16, depth: 6.4 }, fpScene);
  floor.position.set(0, -0.08, 0);
  floor.material = createStdMat(fpScene, 'fpS2_floorMat', '#162d3c', { emissive: 0.15 });
  floor.parent = root;

  const vaultMat = createStdMat(fpScene, 'fpS2_vaultMat', '#54c1d3', { alpha: 0.36, emissive: 0.2 });
  const vaultBox = B.MeshBuilder.CreateBox('fpS2_vault', { width: VAULT_SPEC.outerHalf * 2, height: 2.7, depth: VAULT_SPEC.outerHalf * 2 }, fpScene);
  vaultBox.position.set(0, 1.35, 0);
  vaultBox.material = vaultMat;
  vaultBox.parent = root;

  const vaultFrame = B.MeshBuilder.CreateBox('fpS2_vaultFrame', { width: VAULT_SPEC.outerHalf * 2 + 0.02, height: 2.72, depth: VAULT_SPEC.outerHalf * 2 + 0.02 }, fpScene);
  vaultFrame.position.set(0, 1.35, 0);
  vaultFrame.material = createStdMat(fpScene, 'fpS2_vfMat', '#93e9f7', { alpha: 0.65, wireframe: true, unlit: true });
  vaultFrame.parent = root;

  // Floor footprint outline (always visible across W pages so player knows where the room is!)
  const footprint = B.MeshBuilder.CreateBox('fpS2_foot', { width: VAULT_SPEC.outerHalf * 2, height: 0.03, depth: VAULT_SPEC.outerHalf * 2 }, fpScene);
  footprint.position.set(0, 0.02, 0);
  footprint.material = createStdMat(fpScene, 'fpS2_footMat', '#dfbb73', { alpha: 0.5, wireframe: true, unlit: true });
  footprint.parent = root;

  const trappedComp = buildAstronautAvatar(fpScene, 'fpS2_comp');
  trappedComp.parent.parent = root;

  const core = B.MeshBuilder.CreatePolyhedron('fpS2_core', { type: 3, size: 0.26 }, fpScene);
  core.material = createStdMat(fpScene, 'fpS2_coreMat', '#ffd566', { emissive: 0.65 });
  core.parent = root;

  const pedestal = B.MeshBuilder.CreateCylinder('fpS2_ped', { diameter: 0.9, height: 0.9, tessellation: 24 }, fpScene);
  pedestal.position.set(VAULT_SPEC.pedestalPos[0], 0.45, VAULT_SPEC.pedestalPos[2]);
  pedestal.material = createStdMat(fpScene, 'fpS2_pedMat', '#80ccb9', { emissive: 0.3 });
  pedestal.parent = root;

  Object.assign(fpS2, { vaultBox, vaultMat, vaultFrame, trappedComp, core, pedestal });
}

// ---- FP SECTION 3: 解不开的死结 (Two Giant Interlocked Metal Rings + Companion Pod) ----
const fpS3 = {};
{
  const root = fpGroups[3];
  const floor = B.MeshBuilder.CreateBox('fpS3_floor', { width: 7.4, height: 0.16, depth: 6.4 }, fpScene);
  floor.position.set(0, -0.08, 0);
  floor.material = createStdMat(fpScene, 'fpS3_floorMat', '#162d3c', { emissive: 0.15 });
  floor.parent = root;

  // Scale up rings 1.5x in First-Person for grand architectural presence!
  const SCALE = 1.55;
  const ringA = B.MeshBuilder.CreateTorus('fpS3_ringA', {
    diameter: RING_SPEC.majorR * 2 * SCALE,
    thickness: RING_SPEC.tubeR * 2 * SCALE,
    tessellation: 52
  }, fpScene);
  ringA.rotation.x = Math.PI / 2;
  ringA.position.set(RING_SPEC.ringACenterX * SCALE, 1.45, 0.5);
  ringA.material = createStdMat(fpScene, 'fpS3_ringAMat', '#5cd5e5', { emissive: 0.3 });
  ringA.parent = root;

  const ringB = B.MeshBuilder.CreateTorus('fpS3_ringB', {
    diameter: RING_SPEC.majorR * 2 * SCALE,
    thickness: RING_SPEC.tubeR * 2 * SCALE,
    tessellation: 52
  }, fpScene);
  ringB.position.set(RING_SPEC.startBX * SCALE, 1.45, 0.5);
  ringB.material = createStdMat(fpScene, 'fpS3_ringBMat', '#dfbb73', { emissive: 0.34 });
  ringB.parent = root;

  const comp = buildAstronautAvatar(fpScene, 'fpS3_comp');
  comp.parent.parent = root;

  Object.assign(fpS3, { ringA, ringB, comp, SCALE });
}

// ---- FP SECTION 4: 镜中人的握手 (4D Inverter Pod + Full-Length Mirror Avatar + Companion at Dual-Palm Gate) ----
const fpS4 = {};
{
  const root = fpGroups[4];
  const floor = B.MeshBuilder.CreateBox('fpS4_floor', { width: 7.0, height: 0.16, depth: 7.0 }, fpScene);
  floor.position.set(0, -0.08, 0);
  floor.material = createStdMat(fpScene, 'fpS4_floorMat', '#162d3c', { emissive: 0.15 });
  floor.parent = root;

  // Central 4D Inverter Ring Pod at (0, 0, -0.3)
  const podRing1 = B.MeshBuilder.CreateTorus('fpS4_pod1', { diameter: 2.5, thickness: 0.09, tessellation: 44 }, fpScene);
  podRing1.position.set(0, 1.25, -0.3);
  podRing1.material = createStdMat(fpScene, 'fpS4_podMat1', '#dfbb73', { emissive: 0.45 });
  podRing1.parent = root;

  const podRing2 = B.MeshBuilder.CreateTorus('fpS4_pod2', { diameter: 2.3, thickness: 0.07, tessellation: 44 }, fpScene);
  podRing2.position.set(0, 1.25, -0.3);
  podRing2.rotation.x = Math.PI / 2;
  podRing2.material = createStdMat(fpScene, 'fpS4_podMat2', '#80ccb9', { emissive: 0.4 });
  podRing2.parent = root;

  // Companion Astronaut waiting at North Dual-Palm Gate (x = -0.55, z = 2.1)
  const comp = buildAstronautAvatar(fpScene, 'fpS4_comp');
  comp.parent.parent = root;

  // Live Mirror Reflection Avatar of YOU standing behind the glass mirror frame at (0.85, 0, 2.35)
  const mirrorFrame = B.MeshBuilder.CreateBox('fpS4_mFrame', { width: 1.5, height: 2.4, depth: 0.05 }, fpScene);
  mirrorFrame.position.set(1.1, 1.2, 2.25);
  mirrorFrame.material = createStdMat(fpScene, 'fpS4_mMat', '#78c9d4', { alpha: 0.22, emissive: 0.2 });
  mirrorFrame.parent = root;

  const mirrorAvatar = buildAstronautAvatar(fpScene, 'fpS4_mirrorYou');
  mirrorAvatar.parent.parent = root;

  // Dual-Palm Gate Arch
  const gateArch = B.MeshBuilder.CreateTorus('fpS4_gate', { diameter: 3.0, thickness: 0.14, tessellation: 40 }, fpScene);
  gateArch.position.set(0, 1.5, 2.6);
  gateArch.rotation.x = Math.PI / 2;
  gateArch.material = createStdMat(fpScene, 'fpS4_gateMat', '#80ccb9', { emissive: 0.35 });
  gateArch.parent = root;

  Object.assign(fpS4, { podRing1, podRing2, comp, mirrorAvatar, gateArch });
}

// ---- FP SECTION 5: 凭空生长的巨球 (4D Hypersphere Atrium + Companion on Walkway) ----
const fpS5 = {};
{
  const root = fpGroups[5];
  const floor = B.MeshBuilder.CreateBox('fpS5_floor', { width: 8.0, height: 0.16, depth: 8.0 }, fpScene);
  floor.position.set(0, -0.08, 0);
  floor.material = createStdMat(fpScene, 'fpS5_floorMat', '#142836', { emissive: 0.15 });
  floor.parent = root;

  const sphere = B.MeshBuilder.CreateSphere('fpS5_sphere', { diameter: 2.0, segments: 36 }, fpScene);
  sphere.position.set(0, 1.75, 0.4);
  sphere.material = createStdMat(fpScene, 'fpS5_sphMat', '#64d8cb', { alpha: 0.88, emissive: 0.32 });
  sphere.parent = root;

  const eqRing = B.MeshBuilder.CreateTorus('fpS5_eq', { diameter: 2.04, thickness: 0.03, tessellation: 44 }, fpScene);
  eqRing.material = createStdMat(fpScene, 'fpS5_eqMat', '#dfbb73', { emissive: 0.5 });
  eqRing.parent = sphere;

  const comp = buildAstronautAvatar(fpScene, 'fpS5_comp');
  comp.parent.parent = root;

  Object.assign(fpS5, { sphere, comp });
}

// ---- FP SECTION 6: 透视自身 (Astronaut Twin with Visible Heart/Lungs/Vessels + 4D Tilt Cross-Section) ----
const fpS6 = {};
{
  const root = fpGroups[6];
  const floor = B.MeshBuilder.CreateBox('fpS6_floor', { width: 7.4, height: 0.16, depth: 7.4 }, fpScene);
  floor.position.set(0, -0.08, 0);
  floor.material = createStdMat(fpScene, 'fpS6_floorMat', '#142836', { emissive: 0.15 });
  floor.parent = root;

  // Central Astronaut Twin on pedestal at (0, 0.15, 0.3)
  const twinPed = B.MeshBuilder.CreateCylinder('fpS6_ped', { diameter: 1.6, height: 0.15, tessellation: 32 }, fpScene);
  twinPed.position.set(0, 0.075, 0.3);
  twinPed.material = createStdMat(fpScene, 'fpS6_pedMat', '#345c6e', { emissive: 0.25 });
  twinPed.parent = root;

  const twinAvatar = buildAstronautAvatar(fpScene, 'fpS6_twin');
  twinAvatar.parent.parent = root;

  // Internal Heart, Lungs & Golden Vascular Conduits parented inside twinAvatar.body!
  const organRoot = new B.TransformNode('fpS6_organs', fpScene);
  organRoot.parent = twinAvatar.body;
  organRoot.position.set(0, -0.48, 0);

  const heart = B.MeshBuilder.CreateSphere('fpS6_heart', { diameterX: 0.13, diameterY: 0.16, diameterZ: 0.12, segments: 14 }, fpScene);
  heart.position.set(0.04, 0.05, 0.02);
  heart.material = createStdMat(fpScene, 'fpS6_heartMat', '#ff5e5b', { emissive: 0.75 });
  heart.parent = organRoot;

  const lungL = B.MeshBuilder.CreateSphere('fpS6_lungL', { diameterX: 0.15, diameterY: 0.28, diameterZ: 0.16, segments: 14 }, fpScene);
  lungL.position.set(-0.11, 0.06, -0.01);
  lungL.material = createStdMat(fpScene, 'fpS6_lungMat', '#64d8cb', { alpha: 0.55, emissive: 0.35 });
  lungL.parent = organRoot;

  const lungR = lungL.clone('fpS6_lungR');
  lungR.position.x = 0.11;

  const vessel = B.MeshBuilder.CreateTube('fpS6_vessel', {
    path: [
      new B.Vector3(0.04, 0.12, 0.01),
      new B.Vector3(0.0, 0.24, -0.02),
      new B.Vector3(-0.02, -0.28, -0.03)
    ],
    radius: 0.018,
    tessellation: 10
  }, fpScene);
  vessel.material = createStdMat(fpScene, 'fpS6_vesselMat', '#ffd566', { emissive: 0.65 });
  vessel.parent = organRoot;

  // Glowing 2D Cross-Section Contour Ring when Astronaut Twin is tilted in 4D!
  const sliceRing = B.MeshBuilder.CreateTorus('fpS6_sliceRing', { diameter: 0.58, thickness: 0.03, tessellation: 36 }, fpScene);
  sliceRing.position.set(0, 1.15, 0.3);
  sliceRing.rotation.z = Math.PI / 2;
  sliceRing.material = createStdMat(fpScene, 'fpS6_sliceMat', '#ffd566', { emissive: 0.8 });
  sliceRing.parent = root;

  const comp = buildAstronautAvatar(fpScene, 'fpS6_comp');
  comp.parent.parent = root;

  Object.assign(fpS6, { twinAvatar, organRoot, heart, lungL, lungR, sliceRing, comp });
}

// ============================================================
// 2. GOD-VIEW 4D HYPERCUBE LABORATORY (#labCanvas via F)
// ============================================================
const godCanvas = $('labCanvas');
const godEngine = new B.Engine(godCanvas, true, { preserveDrawingBuffer: true });
godEngine.setHardwareScalingLevel(1 / Math.min(Math.max(window.devicePixelRatio || 1, 1), 1.5));
const godScene = new B.Scene(godEngine);
godScene.clearColor = new B.Color4(0.02, 0.05, 0.08, 1);

const godCamera = new B.ArcRotateCamera('godCam', -Math.PI * 0.58, 1.04, 10.5, new B.Vector3(0, 0.6, 0), godScene);
godCamera.lowerRadiusLimit = 4.0;
godCamera.upperRadiusLimit = 20.0;
godCamera.wheelPrecision = 35;
godCamera.attachControl(godCanvas, true);
godCamera.inputs.removeByType('ArcRotateCameraKeyboardMoveInput');

const godHemi = new B.HemisphericLight('godHemi', new B.Vector3(0.4, 1, -0.3), godScene);
godHemi.intensity = 0.9;
const godDir = new B.DirectionalLight('godDir', new B.Vector3(-0.5, -1, 0.4), godScene);
godDir.intensity = 0.7;

// In the God-View 4D Lab, we map (X, Y, Z, W) into 3D by stacking W vertically (or perspective 4D)!
// Mapping helper: W shifts vertical elevation Y_god = y_local * 0.55 + w * 1.15 so all W-pages AND the
// little Astronaut moving between W-pages are crystal-clear to a non-physics player!
const W_STACK_SCALE = 1.12;
const BODY_SCALE = 0.58;

// 3 Stacked Transparent Hypercube Slice Pages in God-View (W = -1.8, 0.0, +1.8) + Active Player W Slice Plane!
const godPages = [-1.8, 0.0, 1.8].map((wLv, idx) => {
  const color = wLv > 0.5 ? '#dfbb73' : wLv < -0.5 ? '#68a7ff' : '#80ccb9';
  const plane = B.MeshBuilder.CreateBox('godPage_' + idx, { width: 5.4, height: 0.04, depth: 5.4 }, godScene);
  plane.position.set(0, wLv * W_STACK_SCALE, 0);
  plane.material = createStdMat(godScene, 'godPageMat_' + idx, color, { alpha: 0.14, emissive: 0.22 });
  const border = B.MeshBuilder.CreateBox('godPageBorder_' + idx, { width: 5.42, height: 0.05, depth: 5.42 }, godScene);
  border.position.set(0, wLv * W_STACK_SCALE, 0);
  border.material = createStdMat(godScene, 'godPageBMat_' + idx, color, { alpha: 0.45, wireframe: true, unlit: true });
  return { wLv, plane, border };
});

// Active movable W-Page platform that follows your little Astronaut's current W coordinate!
const godActiveSlice = B.MeshBuilder.CreateBox('godActiveSlice', { width: 5.6, height: 0.03, depth: 5.6 }, godScene);
godActiveSlice.material = createStdMat(godScene, 'godActiveMat', '#ffffff', { alpha: 0.18, emissive: 0.35 });

// Vertical 4D Hypercube W-pillars connecting the stacked 3D pages
{
  const lines = [];
  for (const x of [-2.7, 2.7]) {
    for (const z of [-2.7, 2.7]) {
      lines.push([new B.Vector3(x, -2.5 * W_STACK_SCALE, z), new B.Vector3(x, 2.5 * W_STACK_SCALE, z)]);
    }
  }
  const pillars = B.MeshBuilder.CreateLineSystem('godWPillars', { lines }, godScene);
  pillars.color = B.Color3.FromHexString('#3d6f7d');
  pillars.alpha = 0.6;
}

// YOUR 3D Astronaut Miniature (小人) in God-View + Companion Astronaut Miniature(s)!
const godPlayerAvatar = buildAstronautAvatar(godScene, 'godPlayer');
godPlayerAvatar.parent.scaling.setAll(BODY_SCALE);

const godCompAvatar1 = buildAstronautAvatar(godScene, 'godComp1', { tintSuit: '#f5e2b8' });
godCompAvatar1.parent.scaling.setAll(BODY_SCALE);

const godCompAvatar2 = buildAstronautAvatar(godScene, 'godComp2', { tintSuit: '#cce0ff' });
godCompAvatar2.parent.scaling.setAll(BODY_SCALE);

// Section-specific props in God-View so every puzzle is visualizable with the little Astronaut!
const godVaultBox = B.MeshBuilder.CreateBox('godVault', {
  width: VAULT_SPEC.outerHalf * 2,
  height: VAULT_SPEC.wallHalfW * 2 * W_STACK_SCALE,
  depth: VAULT_SPEC.outerHalf * 2
}, godScene);
godVaultBox.material = createStdMat(godScene, 'godVaultMat', '#54c1d3', { alpha: 0.36, emissive: 0.22 });

const godCore = B.MeshBuilder.CreatePolyhedron('godCore', { type: 3, size: 0.22 }, godScene);
godCore.material = createStdMat(godScene, 'godCoreMat', '#ffd566', { emissive: 0.65 });

const godRingA = B.MeshBuilder.CreateTorus('godRingA', {
  diameter: RING_SPEC.majorR * 2,
  thickness: RING_SPEC.tubeR * 2,
  tessellation: 40
}, godScene);
godRingA.rotation.x = Math.PI / 2;
godRingA.material = createStdMat(godScene, 'godRingAMat', '#5cd5e5', { emissive: 0.3 });

const godRingB = B.MeshBuilder.CreateTorus('godRingB', {
  diameter: RING_SPEC.majorR * 2,
  thickness: RING_SPEC.tubeR * 2,
  tessellation: 40
}, godScene);
godRingB.material = createStdMat(godScene, 'godRingBMat', '#dfbb73', { emissive: 0.35 });

const godHyperSphere = B.MeshBuilder.CreateSphere('godHyperSphere', { diameter: 2.0, segments: 28 }, godScene);
godHyperSphere.material = createStdMat(godScene, 'godSphMat', '#64d8cb', { alpha: 0.72, emissive: 0.3 });

const godHyperEnvelope = B.MeshBuilder.CreateSphere('godHyperEnv', { diameter: 4.2, segments: 20 }, godScene);
godHyperEnvelope.material = createStdMat(godScene, 'godEnvMat', '#68a7ff', { alpha: 0.18, wireframe: true, unlit: true });

// ============================================================
// Section Switching & State Synchronization
// ============================================================
function getActivePos4() {
  if (currentSection === 1) return sim1.player;
  if (currentSection === 2) return sim2.player;
  if (currentSection === 3) return [sim3.bx - 0.55, 0, -0.5, sim3.bw];
  if (currentSection === 4) {
    const rad = (sim4.rotXW * Math.PI) / 180;
    return [sec4PlayerPos[0], 0, sec4PlayerPos[2], Math.sin(rad) * 0.9];
  }
  if (currentSection === 5) return sec5Pos;
  return sec6Pos;
}

function selectSection(secId) {
  currentSection = Math.max(1, Math.min(6, Number(secId) || 1));
  for (let i = 1; i <= 6; i++) {
    fpGroups[i].setEnabled(i === currentSection);
  }
  ground.reset();
  gait.reset();
  look.yaw = 0;
  look.pitch = 0;

  if (currentSection === 1) {
    // Keep progress if already started, or ensure valid position
  } else if (currentSection === 3) {
    sec3Grabbed = true;
  }

  updateHUD();
  if (godOpen) refreshGodLabUI();
  saveProgress();
}

function resetCurrentSection() {
  if (currentSection === 1) sim1.reset();
  if (currentSection === 2) sim2.reset(false);
  if (currentSection === 3) { sim3.reset(); sec3Grabbed = true; }
  if (currentSection === 4) { sim4.reset(); sec4PlayerPos = [0, 0, -2.0]; sec4HandshakeDone = false; }
  if (currentSection === 5) { sec5Pos = [0, 0, -2.0, -2.2]; sec5Phases.clear(); sec5MetCompanion = false; }
  if (currentSection === 6) { sec6Pos = [0, 0, -2.1, 0]; sec6Mode = 'xray'; sec6TiltDeg = 38; sec6Observed.clear(); }
  ground.reset();
  gait.reset();
  look.yaw = 0;
  look.pitch = 0;
  updateHUD();
  if (godOpen) refreshGodLabUI();
  showToast(`已重置${CHAPTER2_SECTIONS[currentSection - 1].code}。`);
}

function applyMovementStep(dx, dz, dw) {
  const prevW = getActivePos4()[3];

  if (currentSection === 1) {
    const res = sim1.move([dx, 0, dz, dw]);
    if (res.newlyCollected) {
      companionGesture = { left: time, right: time };
      audio.routeStep(sim1.collected.size);
      showToast(`已与 ${res.newlyCollected.label} 的同路人汇合！`);
    }
    if (sim1.isComplete && sim1.player[2] > 1.3) {
      markSectionDone(1, '第一小节完成！你已学会翻动空间书页，进入第二小节「密室里的求救者」！');
    }
  } else if (currentSection === 2) {
    const res = sim2.move([dx, 0, dz, dw]);
    if (res.blocked && Math.hypot(dx, dz) > 1e-4 && time - (applyMovementStep._lastHit || 0) > 1.0) {
      applyMovementStep._lastHit = time;
      audio.probeBounce(1.8);
      showToast(sim2.hyperWall
        ? '四维全封闭墙：当墙壁在第四维也封死时，谁也绕不过去！'
        : '砰！防爆玻璃把 W = 0 封死了。按住 E 翻到 W = +1.4 空间页试试！');
    }
    if (res.picked) {
      companionGesture = { left: time, right: time };
      audio.evidenceUnlocked();
      showToast('成功进入密闭玻璃房拿到光核！现在按 E 翻页走出密室，送到右侧接收台！');
    }
    if (res.delivered) {
      markSectionDone(2, '第二小节完成！你一扇门都没开，就从六面封死的玻璃房里救出了光核！');
    }
  } else if (currentSection === 3) {
    const targetX = sim3.bx + dx * 0.85;
    const targetW = sim3.bw + dw;
    const res = sim3.moveTo(targetX, targetW);
    if (res.blocked && time - (applyMovementStep._lastHit || 0) > 0.9) {
      applyMovementStep._lastHit = time;
      audio.probeBounce(2.0);
      showToast('两只金属环在 W = 0 页死死卡住！先按 E 把金色环带到 W = +1.0 页再往前推！');
    }
    if (res.unlinked) {
      companionGesture = { left: time, right: time };
      markSectionDone(3, '第三小节完成！两只完好无损的实心金属圆环，在第四维彻底解开了！');
    }
  } else if (currentSection === 4) {
    sec4PlayerPos[0] = Math.max(-2.8, Math.min(2.8, sec4PlayerPos[0] + dx));
    sec4PlayerPos[2] = Math.max(-2.8, Math.min(2.3, sec4PlayerPos[2] + dz));
    const inPod = Math.hypot(sec4PlayerPos[0], sec4PlayerPos[2] + 0.3) < 1.35 || godOpen;
    if (Math.abs(dw) > 1e-5) {
      if (inPod) {
        const nextAngle = Math.max(0, Math.min(180, sim4.rotXW + dw * 75));
        sim4.setAngles({ xw: Math.round(nextAngle) });
        if (sim4.rotXW >= 176) {
          sim4.setAngles({ xw: 180 });
          if (!applyMovementStep._flippedToast) {
            applyMovementStep._flippedToast = true;
            audio.hologramOpen();
            showToast('你在第四维翻转了 180°！低头或看镜子：你的红、金袖标左右互换了！去和同伴握手吧！');
          }
        }
      } else if (time - (applyMovementStep._podHint || 0) > 1.5) {
        applyMovementStep._podHint = time;
        showToast('请先走进房间中央的金色四维回旋环，再按 E 翻转身体！');
      }
    }
    // Check handshake with companion at (-0.55, 0, 2.1)
    if (Math.hypot(sec4PlayerPos[0] + 0.3, sec4PlayerPos[2] - 1.7) < 1.1) {
      if (sim4.rotXW >= 175) {
        if (!sec4HandshakeDone) {
          sec4HandshakeDone = true;
          gesture.left = time;
          companionGesture.right = time;
          markSectionDone(4, '第四小节完成！变成镜像人的你与同伴举起同侧金袖标双手，掌纹大门开启！');
        }
      } else if (time - (applyMovementStep._handHint || 0) > 1.8) {
        applyMovementStep._handHint = time;
        companionGesture.right = time;
        showToast('同伴举起的是金袖标右手，而你这侧是红袖标左手！进中央回旋环按 E 翻转 180° 试试！');
      }
    }
  } else if (currentSection === 5) {
    sec5Pos[0] = Math.max(-3.2, Math.min(3.2, sec5Pos[0] + dx));
    sec5Pos[2] = Math.max(-3.2, Math.min(3.2, sec5Pos[2] + dz));
    sec5Pos[3] = Math.max(-2.5, Math.min(2.5, sec5Pos[3] + dw));
    const w = sec5Pos[3];
    if (w > -2.05 && w < -1.1) sec5Phases.add('birth');
    if (Math.abs(w) < 0.35) sec5Phases.add('equator');
    if (w > 1.55) sec5Phases.add('vanish');
    if (Math.hypot(sec5Pos[0] - 1.8, sec5Pos[2] - 1.5) < 1.4 && sec5Phases.size >= 2) {
      sec5MetCompanion = true;
    }
    if (sec5Phases.size === 3) {
      companionGesture = { left: time, right: time };
      markSectionDone(5, '第五小节完成！你亲历了四维巨球在三维世界中凭空诞生、膨胀与消隐的全过程！');
    }
  } else if (currentSection === 6) {
    sec6Pos[0] = Math.max(-3.0, Math.min(3.0, sec6Pos[0] + dx));
    sec6Pos[2] = Math.max(-3.0, Math.min(3.0, sec6Pos[2] + dz));
    sec6Pos[3] = Math.max(-1.6, Math.min(1.6, sec6Pos[3] + dw * 0.65));
    const nearTwin = Math.hypot(sec6Pos[0], sec6Pos[2] - 0.3) < 2.3 || godOpen;
    if (nearTwin) {
      if (sec6Mode === 'xray') sec6Observed.add('xray');
      if (sec6Mode === 'tilt' && Math.abs(sec6Pos[3]) > 0.18) sec6Observed.add('tilt');
    }
    if (sec6Observed.has('xray') && sec6Observed.has('tilt')) {
      companionGesture = { left: time, right: time };
      markSectionDone(6, '第六小节完成！你已走完《维度之外》第二章的全部六节四维内部奇迹！');
    }
  }

  const newW = getActivePos4()[3];
  if (Math.abs(newW - prevW) > 1e-3) {
    pulseWShift(newW);
    if (performance.now() - lastWBeep > 130) {
      lastWBeep = performance.now();
      audio.wSlideTone(newW);
    }
  }
}

// ============================================================
// HUD & God-View Lab Console UI Updates
// ============================================================
function isSectionComplete(secId) {
  return completedSections.has(secId);
}

function updateHUD() {
  const meta = CHAPTER2_SECTIONS[currentSection - 1];
  const pos4 = getActivePos4();
  const w = pos4[3];

  $('secCode').textContent = `${meta.code} / SECTION 0${currentSection}`;
  $('secTitle').textContent = `${meta.title} · ${meta.subtitle}`;
  $('wPageReadout').textContent = currentSection === 4
    ? `翻转 ${Math.round(sim4.rotXW)}°`
    : `W = ${w >= 0 ? '+' : ''}${w.toFixed(1)} 页`;

  // Intuitive sensory page description
  let pageDesc = '基准空间页 · 白色甲板';
  if (currentSection === 4) {
    pageDesc = sim4.rotXW >= 175 ? '镜像态 · 红金双手已互换 ✓' : sim4.rotXW > 5 ? '正在第四维翻转身体…' : '初始态 · 左手红标 / 右手金标';
  } else if (w > 0.65) {
    pageDesc = '上层空间页 · 金色折页';
  } else if (w < -0.65) {
    pageDesc = '下层空间页 · 蔚蓝折页';
  }
  $('wPageTag').textContent = pageDesc;
  $('objective').textContent = meta.goal;

  // Section checklist items
  const list = $('secChecklist');
  let items = [];
  if (currentSection === 1) {
    items = [
      { done: sim1.collected.has('wp'), text: '翻到 W=+1.8 页与金色同伴汇合' },
      { done: sim1.collected.has('wm'), text: '翻到 W=−1.8 页与蔚蓝同伴汇合' },
      { done: isSectionComplete(1), text: '翻回 W=0 页走上对岸出口' }
    ];
  } else if (currentSection === 2) {
    items = [
      { done: Math.abs(sim2.player[3]) > 0.9 || sim2.enteredVault, text: '按 E 翻到 W=+1.4 页越过玻璃墙' },
      { done: sim2.carryingCore || sim2.coreDelivered, text: '在密室上方按 Q 降入室内拿起光核' },
      { done: sim2.coreDelivered, text: '带光核翻页出室送到右侧接收台' }
    ];
  } else if (currentSection === 3) {
    items = [
      { done: Math.abs(sim3.bw) > 0.45 || sim3.unlinked, text: '按 E 带金色环翻到 W=+1.0 页' },
      { done: sim3.bx >= RING_SPEC.unlinkedBX || sim3.unlinked, text: '按 W/D 推着金环走过青环位置' },
      { done: sim3.unlinked, text: '按 Q 放回 W=0 页完成无损解链' }
    ];
  } else if (currentSection === 4) {
    items = [
      { done: sim4.rotXW >= 90, text: '走进中央回旋环按住 E 在第四维翻身' },
      { done: sim4.rotXW >= 175, text: '翻转 180° 让左右手袖标互换' },
      { done: sec4HandshakeDone, text: '走向大门与同伴举起同侧金袖标握手' }
    ];
  } else if (currentSection === 5) {
    items = [
      { done: sec5Phases.has('birth'), text: '在 W=−1.6 页目睹巨球凭空初现' },
      { done: sec5Phases.has('equator'), text: '在 W=0.0 页仰望 4 米最大赤道星体' },
      { done: sec5Phases.has('vanish'), text: '在 W=+1.8 页目睹巨球缩小消散' }
    ];
  } else if (currentSection === 6) {
    items = [
      { done: sec6Observed.has('xray'), text: '走近同伴：高维目光越过外壳看清跳动的心脏' },
      { done: sec6Observed.has('tilt'), text: '按 R 切换四维倾斜，按 Q/E 扫描他的身体断面' }
    ];
  }

  list.innerHTML = items.map(it =>
    `<div class="ch2-check-item ${it.done ? 'done' : ''}"><span>${it.done ? '✓' : '○'}</span><span>${it.text}</span></div>`
  ).join('');

  // Show next section button once current section is complete
  const nextBtn = $('nextSecHudBtn');
  const done = isSectionComplete(currentSection);
  nextBtn.classList.toggle('hidden', !done);
  nextBtn.textContent = currentSection < 6 ? `前往${CHAPTER2_SECTIONS[currentSection].code} →` : '完成第二章 · 查看终幕 →';

  // Top section tabs
  document.querySelectorAll('#sectionTabs button').forEach(btn => {
    const s = Number(btn.dataset.sec);
    btn.classList.toggle('active', s === currentSection);
    btn.classList.toggle('done', isSectionComplete(s));
  });

  // Right W-gauge thumb position
  const normW = currentSection === 4
    ? (sim4.rotXW / 90) - 1
    : Math.max(-1, Math.min(1, w / 2.4));
  const pct = 50 - normW * 42;
  const thumb = $('wThumb');
  if (thumb) thumb.style.top = `${pct}%`;
}

function refreshGodLabUI() {
  const meta = CHAPTER2_SECTIONS[currentSection - 1];
  const pos4 = getActivePos4();
  const w = pos4[3];

  $('godTitle').textContent = `四维超立方体实验室 · ${meta.code}：${meta.title}`;
  $('godExplanation').textContent = meta.godHint;

  const slider = $('godWSlider');
  const valOut = $('godWValue');
  if (currentSection === 4) {
    $('godSliderLabel').textContent = '小人四维翻转角 (0° → 180°)';
    slider.min = '0';
    slider.max = '180';
    slider.step = '1';
    slider.value = String(Math.round(sim4.rotXW));
    valOut.textContent = `${Math.round(sim4.rotXW)}°`;
  } else {
    $('godSliderLabel').textContent = '小人所在空间页 W';
    slider.min = '-2.4';
    slider.max = '2.4';
    slider.step = '0.02';
    slider.value = String(w);
    valOut.textContent = `${w >= 0 ? '+' : ''}${w.toFixed(2)}`;
  }

  let liveText = `你的宇航员小人正位于空间页 W = ${w >= 0 ? '+' : ''}${w.toFixed(2)}。`;
  if (currentSection === 1) {
    liveText = `三层透明平台代表三页平行的三维世界。你的小人已汇合 ${sim1.collected.size}/3 位同路人。`;
  } else if (currentSection === 2) {
    liveText = sim2.coreDelivered
      ? '小人已把光核安全带出密室并放上接收台！'
      : sim2.carryingCore
        ? '小人已抱着光核站在密室里！把滑块拉到 W = +1.4 带他迈出密室墙顶吧！'
        : Math.abs(w) > 0.85
          ? '看！小人已经升到了玻璃房的墙壁范围（W=0）上方，现在直接操控小人走到密室正中央再降回 W=0！'
          : '在 W = 0 页，玻璃房四面封死；拉动下方 W 滑块让小人升到 W = +1.4 页即可越墙而入！';
  } else if (currentSection === 3) {
    liveText = sim3.unlinked
      ? '两只圆环已在第四维彻底解开！'
      : Math.abs(sim3.bw) > 0.45
        ? '小人已把金色环抬到了另一页空间！现在点「小人右移」把金环推过青环，再拉回 W = 0！'
        : '先拉动 W 滑块让小人带着金色环离开 W = 0 页，就能避开青色环的管壁！';
  } else if (currentSection === 4) {
    liveText = sim4.rotXW >= 175
      ? '看小人身上的袖标！在第四维翻身 180° 后，他的红袖标左手与金袖标右手已经左右互换了！'
      : `当前翻转角 ${Math.round(sim4.rotXW)}°：把滑块拉到 180°，亲眼看小人像翻书页一样在第四维翻身变成镜像人！`;
  } else if (currentSection === 5) {
    const sl = hypersphereSlice(w);
    liveText = sl.exists
      ? `小人当前页切过了四维巨球，截面是一颗半径 ${sl.radius.toFixed(2)} 米的实心球（巨球本体其实静止不动）。`
      : '小人当前所在的空间页位于四维巨球范围之外，因此在第一人称里看不到球。';
  } else if (currentSection === 6) {
    const inter = xwTiltedBodyIntersection(sec6Mode === 'tilt' ? sec6TiltDeg : 0, w, 0.62);
    liveText = sec6Mode === 'xray'
      ? '高维透视模式：视线从第四维落向宇航员小人，无需打开外壳即可同时看见宇航服与内部跳动的心脏。'
      : inter.description;
  }
  $('godLiveStatus').textContent = liveText;

  // Section-specific quick buttons inside God-View sidebar
  const extra = $('godExtraControls');
  extra.innerHTML = '';
  if (currentSection === 2) {
    const btn = document.createElement('button');
    btn.className = 'secondary';
    btn.textContent = sim2.hyperWall ? '当前：四维全封墙（点此切回普通三维密室）' : '对比实验：如果墙壁在第四维也封死会怎样？';
    btn.onclick = () => {
      audio.unlock();
      sim2.setHyperWall(!sim2.hyperWall);
      refreshGodLabUI();
      updateHUD();
    };
    extra.appendChild(btn);
  } else if (currentSection === 4) {
    const btn = document.createElement('button');
    btn.className = 'primary';
    btn.textContent = '一键演示小人 180° 四维镜像翻转';
    btn.onclick = () => {
      audio.unlock();
      let a = 0;
      const tick = () => {
        if (!godOpen || currentSection !== 4) return;
        a = Math.min(180, a + 4);
        sim4.setAngles({ xw: a });
        applyMovementStep(0, 0, 0);
        refreshGodLabUI();
        updateHUD();
        if (a < 180) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    extra.appendChild(btn);
  } else if (currentSection === 6) {
    const btn = document.createElement('button');
    btn.className = 'secondary';
    btn.textContent = sec6Mode === 'xray' ? '切换为：同伴在第四维倾斜（观察身体断面）' : '切换为：高维透视（观察跳动的心脏与血管）';
    btn.onclick = () => {
      audio.unlock();
      sec6Mode = sec6Mode === 'xray' ? 'tilt' : 'xray';
      applyMovementStep(0, 0, 0.25);
      refreshGodLabUI();
      updateHUD();
    };
    extra.appendChild(btn);
  }

  const nextBtn = $('godNextSecBtn');
  nextBtn.classList.toggle('hidden', !isSectionComplete(currentSection));
  nextBtn.textContent = currentSection < 6 ? `完成本节 · 进入${CHAPTER2_SECTIONS[currentSection].code} →` : '完成第二章 · 查看终幕 →';

  // Section tabs at bottom of God-View console
  const idxWrap = $('godSecIndex');
  idxWrap.replaceChildren();
  for (const s of CHAPTER2_SECTIONS) {
    const b = document.createElement('button');
    b.textContent = `${s.code}：${s.title}${isSectionComplete(s.id) ? ' ✓' : ''}`;
    if (s.id === currentSection) b.style.borderColor = '#dfbb73';
    b.onclick = () => {
      audio.unlock();
      selectSection(s.id);
    };
    idxWrap.appendChild(b);
  }
}

// ============================================================
// Pointer Lock, Pause & God-View Modal Lifecycle
// ============================================================
function clearKeys() {
  keys.clear();
  jumpQueued = false;
  ground.releaseJumpControl();
}

function pause(showMenu = true) {
  locked = false;
  keyboardCorridor = false;
  escapeReturnPending = false;
  clearKeys();
  look.transition();
  document.exitPointerLock?.();
  if (showMenu && !godOpen && !ended) {
    $('menu').classList.remove('hidden');
  }
}

function resumeFirstPerson({ keyboardFallback = true } = {}) {
  if (!ready || godOpen || ended) return;
  audio.unlock();
  keyboardCorridor = keyboardFallback;
  clearKeys();
  look.transition();
  $('notice').textContent = '';
  $('menu').classList.add('hidden');
  try {
    worldCanvas.focus();
    const res = worldCanvas.requestPointerLock?.();
    Promise.resolve(res).catch(() => {});
  } catch {}
  updateHUD();
}

function openGodLab() {
  if (!ready || ended) return;
  audio.unlock();
  audio.hologramOpen();
  pause(false);
  godOpen = true;
  $('menu').classList.add('hidden');
  $('console').classList.remove('hidden');
  godEngine.resize();
  refreshGodLabUI();
}

function closeGodLab({ resume = true } = {}) {
  if (!godOpen) return;
  godOpen = false;
  clearKeys();
  $('console').classList.add('hidden');
  if (resume) {
    resumeFirstPerson({ keyboardFallback: true });
  } else {
    $('menu').classList.remove('hidden');
  }
  updateHUD();
}

function triggerEnding() {
  ended = true;
  godOpen = false;
  pause(false);
  $('console').classList.add('hidden');
  $('menu').classList.add('hidden');
  $('ending').classList.remove('hidden');
  audio.evidenceUnlocked();
}

// ============================================================
// Input Handlers
// ============================================================
$('start').onclick = () => resumeFirstPerson({ keyboardFallback: true });
$('menuGodBtn').onclick = () => openGodLab();
$('openGodBtn').onclick = () => { if (godOpen) closeGodLab({ resume: true }); else openGodLab(); };
$('closeLab').onclick = () => closeGodLab({ resume: true });
$('pause').onclick = () => { if (godOpen) closeGodLab({ resume: false }); else pause(true); };
$('resetSecBtn').onclick = () => resetCurrentSection();

$('nextSecHudBtn').onclick = () => {
  audio.unlock();
  if (currentSection < 6) selectSection(currentSection + 1);
  else triggerEnding();
};
$('godNextSecBtn').onclick = () => {
  audio.unlock();
  if (currentSection < 6) selectSection(currentSection + 1);
  else triggerEnding();
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

// Build section buttons inside pause menu settings
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

// God-View Console interactive controls for the little Astronaut
$('godResetView').onclick = () => {
  godCamera.alpha = -Math.PI * 0.58;
  godCamera.beta = 1.04;
  godCamera.radius = 10.5;
  godCamera.target.set(0, 0.6, 0);
};
$('godWSlider').oninput = e => {
  audio.unlock();
  const val = Number(e.target.value);
  if (currentSection === 4) {
    const delta = (val - sim4.rotXW) / 75;
    applyMovementStep(0, 0, delta);
  } else {
    const curW = getActivePos4()[3];
    applyMovementStep(0, 0, val - curW);
  }
  refreshGodLabUI();
  updateHUD();
};
$('godMoveFwd').onclick = () => { audio.unlock(); applyMovementStep(0, 0.45, 0); gait.step(0.45, 0.16, 2.7, false, false); refreshGodLabUI(); updateHUD(); };
$('godMoveBack').onclick = () => { audio.unlock(); applyMovementStep(0, -0.45, 0); gait.step(0.45, 0.16, 2.7, false, false); refreshGodLabUI(); updateHUD(); };
$('godMoveLeft').onclick = () => { audio.unlock(); applyMovementStep(-0.45, 0, 0); gait.step(0.45, 0.16, 2.7, false, false); refreshGodLabUI(); updateHUD(); };
$('godMoveRight').onclick = () => { audio.unlock(); applyMovementStep(0.45, 0, 0); gait.step(0.45, 0.16, 2.7, false, false); refreshGodLabUI(); updateHUD(); };
$('godWaveBtn').onclick = () => {
  audio.unlock();
  gesture.left = time;
  gesture.right = time;
  companionGesture.left = time;
  companionGesture.right = time;
  audio.wave(true);
};

document.addEventListener('pointerlockchange', () => {
  const acquired = document.pointerLockElement === worldCanvas;
  if (acquired && (godOpen || ended || document.hidden)) {
    locked = false;
    document.exitPointerLock?.();
    return;
  }
  locked = acquired;
  if (locked) keyboardCorridor = false;
  clearKeys();
  look.transition();
  lockTime = time;
  $('menu').classList.toggle('hidden', locked || keyboardCorridor || godOpen || ended);
});

document.addEventListener('mousemove', e => {
  if (!locked && (!keyboardCorridor || e.target !== worldCanvas || godOpen || document.hidden)) {
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
    companionGesture.right = time;
    audio.wave(true);
  }
  if (e.button === 2) {
    gesture.right = time;
    companionGesture.left = time;
    audio.wave(true);
  }
});
worldCanvas.addEventListener('contextmenu', e => e.preventDefault());

// Mouse wheel shifts W page smoothly in First-Person!
worldCanvas.addEventListener('wheel', e => {
  if ((!locked && !keyboardCorridor) || godOpen || ended) return;
  e.preventDefault();
  audio.unlock();
  const dw = -Math.sign(e.deltaY) * 0.18;
  applyMovementStep(0, 0, dw);
  updateHUD();
}, { passive: false });

document.addEventListener('keydown', e => {
  const tag = e.target?.tagName;
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;

  if (e.code === 'Escape') {
    e.preventDefault();
    if (e.repeat) return;
    if (godOpen) closeGodLab({ resume: true });
    else pause(true);
    return;
  }

  if (e.code === 'KeyF' && !e.repeat && !ended) {
    e.preventDefault();
    if (godOpen) closeGodLab({ resume: true });
    else openGodLab();
    return;
  }

  if (e.code === 'KeyV' && !e.repeat) {
    $('audioBtn').click();
    return;
  }

  if (e.code === 'KeyR' && !e.repeat && currentSection === 6) {
    audio.unlock();
    sec6Mode = sec6Mode === 'xray' ? 'tilt' : 'xray';
    applyMovementStep(0, 0, 0.22);
    updateHUD();
    if (godOpen) refreshGodLabUI();
    showToast(sec6Mode === 'xray' ? '已切换：高维透视模式（越过外壳看清心脏与血管）' : '已切换：四维倾斜模式（按 Q/E 扫描他的身体断面）');
    return;
  }

  if (!locked && !keyboardCorridor && !godOpen) return;
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

window.addEventListener('blur', () => { if (!godOpen) pause(true); else clearKeys(); });
window.addEventListener('resize', () => { fpEngine.resize(); godEngine.resize(); });

// ============================================================
// Main Simulation & Dual-Scene Render Loop
// ============================================================
function waveValue(startT) {
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

  const activeControl = (locked || keyboardCorridor || godOpen) && ready && !ended;
  if (activeControl) {
    if (!godOpen) look.frame(dt, 0);

    const strafe = Number(keys.has('KeyD')) - Number(keys.has('KeyA'));
    const forward = Number(keys.has('KeyW')) - Number(keys.has('KeyS'));
    const shiftW = Number(keys.has('KeyE')) - Number(keys.has('KeyQ'));
    const sprinting = keys.has('ShiftLeft') || keys.has('ShiftRight');

    const len = Math.hypot(strafe, forward) || 1;
    const speed = (sprinting ? 4.2 : 2.65);
    const yaw = godOpen ? 0 : look.yaw;
    const vx = (Math.cos(yaw) * (strafe / len) + Math.sin(yaw) * (forward / len)) * (strafe || forward ? speed : 0);
    const vz = (-Math.sin(yaw) * (strafe / len) + Math.cos(yaw) * (forward / len)) * (strafe || forward ? speed : 0);

    const fall = ground.step(dt, jumpQueued, false, keys.has('Space'));
    jumpQueued = false;
    if (fall.jumped) audio.jump();
    if (fall.landed) audio.land(2.0);

    const dx = vx * dt;
    const dz = vz * dt;
    const dw = shiftW * 1.65 * dt;

    if (Math.hypot(dx, dz, dw) > 1e-6) {
      applyMovementStep(dx, dz, dw);
      updateHUD();
      if (godOpen) refreshGodLabUI();
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

  // Current 4D position of the player's astronaut
  const pos4 = getActivePos4();
  const px = pos4[0], pz = pos4[2], pw = pos4[3];
  const eyeY = 1.68 + ground.footLift;
  const mirrored = currentSection === 4 && sim4.rotXW >= 90;
  const wL = waveValue(gesture.left);
  const wR = waveValue(gesture.right);
  const cWL = waveValue(companionGesture.left);
  const cWR = waveValue(companionGesture.right);

  // Update First-Person Camera & Local Astronaut Body
  look.applyCamera(B, fpCamera);
  fpCamera.position.set(px, eyeY, pz);
  poseAstronaut(fpLocalAvatar, [px, eyeY, pz], look.yaw, look.pitch, {
    leftLeg: locomotion.leftLeg,
    rightLeg: locomotion.rightLeg,
    waveLeft: wL,
    waveRight: wR,
    mirrorX: mirrored,
    isLocalFirstPerson: true
  });

  // Update Section-Specific First-Person 3D World & Prompts
  const promptEl = $('ch2Prompt');
  let promptHtml = `<kbd>F</kbd> 打开四维超立方体实验室（上帝视角操控小人）`;

  if (currentSection === 1) {
    const aW0 = Math.max(0.14, 1 - Math.abs(pw - 0.0) / 1.1);
    const aWP = Math.max(0.14, 1 - Math.abs(pw - 1.8) / 1.1);
    const aWM = Math.max(0.14, 1 - Math.abs(pw + 1.8) / 1.1);
    fpS1.matW0.alpha = aW0;
    fpS1.matWP.alpha = aWP;
    fpS1.matWM.alpha = aWM;
    fpS1.compWP.setAlpha(Math.max(0.22, aWP));
    fpS1.compWM.setAlpha(Math.max(0.22, aWM));
    poseAstronaut(fpS1.compWP, [-1.4, 1.68, 0.4], Math.atan2(px + 1.4, pz - 0.4), 0, {
      waveLeft: cWL || (Math.sin(time * 2.5) * 0.25 + 0.25),
      waveRight: cWR
    });
    poseAstronaut(fpS1.compWM, [1.4, 1.68, 1.8], Math.atan2(px - 1.4, pz - 1.8), 0, {
      waveLeft: cWL,
      waveRight: cWR || (Math.sin(time * 2.5) * 0.25 + 0.25)
    });
    fpS1.exitRing.rotation.z = time * 0.8;
    if (!sim1.collected.has('wp')) promptHtml = `按住 <kbd>E</kbd> 翻到 W = +1.8 金色空间页，走近左侧同路人（或按 <kbd>F</kbd> 看上帝视角）`;
    else if (!sim1.collected.has('wm')) promptHtml = `按住 <kbd>Q</kbd> 翻到 W = −1.8 蔚蓝空间页，走近前方同路人`;
    else if (Math.abs(pw) > 0.3) promptHtml = `两位同路人均已汇合！按 <kbd>E</kbd> 翻回 W = 0.0 页走入前方出口环`;
  } else if (currentSection === 2) {
    const inWallW = sim2.hyperWall || Math.abs(pw) <= VAULT_SPEC.wallHalfW + 0.25;
    fpS2.vaultMat.alpha = inWallW ? 0.42 : 0.06;
    fpS2.vaultFrame.material.alpha = inWallW ? 0.72 : 0.16;
    fpS2.trappedComp.setAlpha(Math.max(0.24, 1 - Math.abs(pw) * 0.45));
    poseAstronaut(fpS2.trappedComp, [-0.35, 1.68, 0.25], Math.atan2(px + 0.35, pz - 0.25), 0, {
      waveLeft: sim2.coreDelivered ? (Math.sin(time * 5) * 0.5 + 0.5) : 0.45,
      waveRight: cWR
    });
    if (sim2.carryingCore) {
      const fwdX = Math.sin(look.yaw) * 0.65;
      const fwdZ = Math.cos(look.yaw) * 0.65;
      fpS2.core.position.set(px + fwdX, eyeY - 0.35, pz + fwdZ);
    } else {
      fpS2.core.position.set(sim2.corePos[0], 1.1 + Math.sin(time * 3) * 0.08, sim2.corePos[2]);
    }
    fpS2.core.rotation.y = time * 1.6;
    if (!sim2.carryingCore && !sim2.coreDelivered) {
      promptHtml = Math.abs(pw) < 0.85
        ? `玻璃房在 W=0 完全封死 · 按住 <kbd>E</kbd> 翻到 W = +1.4 页让墙壁退去`
        : `玻璃墙已在当前页消失！走到密室中央同伴上方，按 <kbd>Q</kbd> 降回 W = 0 进入室内`;
    } else if (sim2.carryingCore) {
      promptHtml = Math.abs(pw) < 0.85
        ? `已拿到光核！按住 <kbd>E</kbd> 翻到 W = +1.4 页迈出密室，送到右侧接收台`
        : `走到右侧接收台上方 (X = +2.5)，按 <kbd>Q</kbd> 降回 W = 0 完成救援`;
    }
  } else if (currentSection === 3) {
    const S = fpS3.SCALE;
    fpS3.ringB.position.x = sim3.bx * S;
    fpS3.ringB.position.y = 1.45 + sim3.bw * 0.35;
    fpS3.ringA.material.alpha = Math.max(0.18, 1 - Math.abs(sim3.bw) * 0.65);
    poseAstronaut(fpS3.comp, [-1.5, 1.68, 1.8], Math.atan2(px + 1.5, pz - 1.8), 0, {
      waveLeft: sim3.unlinked ? (Math.sin(time * 5) * 0.5 + 0.5) : cWL,
      waveRight: cWR
    });
    if (!sim3.unlinked) {
      promptHtml = Math.abs(sim3.bw) < 0.45
        ? `两环在 W=0 互相卡死 · 先按住 <kbd>E</kbd> 把金色环带到 W = +1.0 页`
        : sim3.bx < RING_SPEC.unlinkedBX
          ? `青环已变成虚影！按 <kbd>D</kbd> 或 <kbd>W</kbd> 推着金色环向右走过青环`
          : `已越过青环！按住 <kbd>Q</kbd> 把金色环放回 W = 0.0 页完成解链`;
    }
  } else if (currentSection === 4) {
    const rad = (sim4.rotXW * Math.PI) / 180;
    fpS4.podRing1.rotation.y = rad;
    fpS4.podRing2.rotation.z = time * 0.7;
    poseAstronaut(fpS4.comp, [-0.45, 1.68, 2.05], 0, 0, {
      waveLeft: 0,
      waveRight: 0.75 // Companion holds up his Gold-Cuff Right Arm!
    });
    // Live Mirror Reflection Avatar of YOU in the observation mirror!
    poseAstronaut(fpS4.mirrorAvatar, [1.1, 1.68, 2.38], Math.PI, 0, {
      leftLeg: locomotion.leftLeg,
      rightLeg: locomotion.rightLeg,
      waveLeft: wL,
      waveRight: wR,
      mirrorX: !mirrored
    });
    if (!sec4HandshakeDone) {
      promptHtml = sim4.rotXW < 175
        ? `站在中央金色回旋环内，按住 <kbd>E</kbd> 在第四维翻转身体 180°（当前 ${Math.round(sim4.rotXW)}°）`
        : `你的红金双手已左右互换！走向前方大门与同伴完成同侧金袖标握手`;
    }
  } else if (currentSection === 5) {
    const sl = hypersphereSlice(pw);
    fpS5.sphere.setEnabled(sl.exists);
    if (sl.exists) {
      fpS5.sphere.scaling.setAll(sl.radius);
      fpS5.sphere.rotation.y = time * 0.4;
    }
    poseAstronaut(fpS5.comp, [1.8, 1.68, 1.5], Math.atan2(px - 1.8, pz - 1.5), 0, {
      waveLeft: cWL || 0.35,
      waveRight: cWR
    });
    promptHtml = `按 <kbd>E</kbd> 与 <kbd>Q</kbd> 在 W = −2.4 到 +2.4 间滑行，观察四维巨球的初现、膨胀与消隐（已体验 ${sec5Phases.size}/3）`;
  } else if (currentSection === 6) {
    const beat = 1 + Math.sin(time * 5.4) * 0.08;
    fpS6.heart.scaling.setAll(beat);
    const inter = xwTiltedBodyIntersection(sec6Mode === 'tilt' ? sec6TiltDeg : 0, pw, 0.62);
    const tiltRad = sec6Mode === 'tilt' ? (sec6TiltDeg * Math.PI) / 180 : 0;

    fpS6.twinAvatar.setAlpha(sec6Mode === 'xray' ? 0.24 : (inter.intersects ? 0.35 : 0.12));
    poseAstronaut(fpS6.twinAvatar, [0, 1.82, 0.3], time * 0.25, 0, {
      tiltZRad: tiltRad * 0.45
    });
    fpS6.sliceRing.setEnabled(sec6Mode === 'tilt' && inter.dimension === 2);
    if (sec6Mode === 'tilt' && inter.dimension === 2) {
      fpS6.sliceRing.position.set(inter.worldX * 0.6, 1.15 + pw * 0.35, 0.3);
    }
    poseAstronaut(fpS6.comp, [1.7, 1.68, 0.8], Math.atan2(px - 1.7, pz - 0.8), 0, {
      waveLeft: cWL || 0.3,
      waveRight: cWR
    });
    promptHtml = sec6Mode === 'xray'
      ? `高维透视中：无需破开宇航服即可看清跳动的心脏 · 按 <kbd>R</kbd> 切换「四维倾斜断面」`
      : `四维倾斜断面：按 <kbd>Q</kbd> / <kbd>E</kbd> 移动空间页扫描他的身体截面 · 按 <kbd>F</kbd> 在上帝视角看真相`;
  }

  if (promptEl) {
    promptEl.innerHTML = promptHtml;
    promptEl.classList.toggle('show', (locked || keyboardCorridor) && !godOpen && !ended);
  }

  // Render First-Person 3D World
  fpScene.render();

  // Render God-View 4D Hypercube Laboratory when open (with the living 3D Astronaut Miniature!)
  if (godOpen) {
    const godY = pw * W_STACK_SCALE;
    godActiveSlice.position.y = godY;

    // Position YOUR 3D Astronaut Miniature (小人) at your exact 4D coordinates (px, pw, pz)!
    const flipTilt = currentSection === 4 ? ((sim4.rotXW * Math.PI) / 180) : 0;
    poseAstronaut(godPlayerAvatar, [px * 0.75, godY + 1.68 * BODY_SCALE, pz * 0.75], look.yaw, 0, {
      leftLeg: locomotion.leftLeg,
      rightLeg: locomotion.rightLeg,
      waveLeft: wL,
      waveRight: wR,
      mirrorX: mirrored,
      tiltZRad: currentSection === 4 ? Math.sin(flipTilt) * 0.85 : 0
    });

    // Show/hide section-specific props and companion miniatures in God-View
    godPages.forEach(p => {
      p.plane.setEnabled(currentSection === 1 || currentSection === 2);
      p.border.setEnabled(currentSection === 1 || currentSection === 2);
    });
    godVaultBox.setEnabled(currentSection === 2);
    if (currentSection === 2) {
      godVaultBox.scaling.y = sim2.hyperWall ? 3.5 : 1.0;
    }
    godCore.setEnabled(currentSection === 2);
    if (currentSection === 2) {
      godCore.position.set(sim2.corePos[0] * 0.75, sim2.corePos[3] * W_STACK_SCALE + 0.4, sim2.corePos[2] * 0.75);
      godCore.rotation.y = time * 1.6;
    }

    godRingA.setEnabled(currentSection === 3);
    godRingB.setEnabled(currentSection === 3);
    if (currentSection === 3) {
      godRingA.position.set(RING_SPEC.ringACenterX, 0.55, 0);
      godRingB.position.set(sim3.bx, sim3.bw * W_STACK_SCALE + 0.55, 0);
    }

    godHyperSphere.setEnabled(currentSection === 5 && hypersphereSlice(pw).exists);
    godHyperEnvelope.setEnabled(currentSection === 5);
    if (currentSection === 5) {
      const sl = hypersphereSlice(pw);
      if (sl.exists) {
        godHyperSphere.position.set(0, godY + 0.8, 0);
        godHyperSphere.scaling.setAll(sl.radius * 0.75);
      }
      godHyperEnvelope.position.set(0, 0.8, 0);
    }

    // Companion Astronaut Miniatures in God-View
    godCompAvatar1.parent.setEnabled(true);
    godCompAvatar2.parent.setEnabled(currentSection === 1);
    if (currentSection === 1) {
      poseAstronaut(godCompAvatar1, [-1.4 * 0.75, 1.8 * W_STACK_SCALE + 1.68 * BODY_SCALE, 0.4 * 0.75], 0, 0, {
        waveLeft: 0.45, waveRight: cWR
      });
      poseAstronaut(godCompAvatar2, [1.4 * 0.75, -1.8 * W_STACK_SCALE + 1.68 * BODY_SCALE, 1.8 * 0.75], Math.PI, 0, {
        waveLeft: cWL, waveRight: 0.45
      });
    } else if (currentSection === 2) {
      poseAstronaut(godCompAvatar1, [-0.25, 1.68 * BODY_SCALE, 0.2], 0, 0, {
        waveLeft: 0.5, waveRight: cWR
      });
    } else if (currentSection === 3) {
      poseAstronaut(godCompAvatar1, [-1.2, 1.68 * BODY_SCALE, 1.2], 0, 0, {
        waveLeft: sim3.unlinked ? 0.7 : 0.2, waveRight: cWR
      });
    } else if (currentSection === 4) {
      poseAstronaut(godCompAvatar1, [-0.35, 1.68 * BODY_SCALE, 1.5], Math.PI, 0, {
        waveLeft: 0, waveRight: 0.75
      });
    } else if (currentSection === 5) {
      poseAstronaut(godCompAvatar1, [1.4, 1.68 * BODY_SCALE, 1.1], -Math.PI / 2, 0, {
        waveLeft: 0.35, waveRight: cWR
      });
    } else if (currentSection === 6) {
      const tiltR = sec6Mode === 'tilt' ? (sec6TiltDeg * Math.PI) / 180 : 0;
      poseAstronaut(godCompAvatar1, [0, 1.68 * BODY_SCALE, 0.2], time * 0.3, 0, {
        tiltZRad: tiltR * 0.65
      });
    }

    godScene.render();
  }

  $('stats').textContent = `${Math.round(fpEngine.getFps())} FPS · ${godOpen ? '四维实验室（上帝视角）' : locked ? '第一人称鼠标锁定' : keyboardCorridor ? '第一人称自由鼠标 · 点击锁定' : '暂停'}`;
});
