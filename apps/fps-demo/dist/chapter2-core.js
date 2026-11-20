/**
 * 4D Hypercube Interior (-L, L)^4 Physics, True 4D Objects & 12-Section Story Campaign Engine
 * for Beyond 3D Chapter 2: 《折页之间》 —「离开画纸的人」.
 *
 * Includes both:
 *  - 3D Objects & People moving inside 4D Space (Sections 1–6, 11–12)
 *  - True 4D Geometric Objects & their 3D Slice Metamorphoses (Sections 7–10):
 *      #1 4D Hypersphere (B^4): point -> growing sphere -> 4.4m giant sphere -> vanish
 *      #2 Diagonal 4D Hypercube / 16-Cell Bulk: Tetrahedron -> Octahedron -> Cube slice morphing
 *      #3 4D Hyper-Torus (Spheritorus): two disconnected 3D islands merging into one continuous ring bridge
 *      #4 24-Cell Clifford Isoclinic Double Rotor: simultaneous XW + YZ double rotation (inside-out 4D turning)
 */

export const INTERIOR_L = 4.0;
const EPS = 1e-7;

export function clampInsideInterior(p4, radius = 0.25, L = INTERIOR_L) {
  const limit = L - radius - 0.02;
  return p4.map(v => Math.max(-limit, Math.min(limit, v)));
}

export function isStrictlyInsideInterior(p4, radius = 0.25, L = INTERIOR_L) {
  const limit = L - radius;
  return p4.every(v => Number.isFinite(v) && Math.abs(v) < limit + 1e-9);
}

export function dist4(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2], a[3] - b[3]);
}

export function rotate4Plane(p, axisA, axisB, angleRad) {
  const out = [...p];
  const c = Math.cos(angleRad);
  const s = Math.sin(angleRad);
  out[axisA] = c * p[axisA] - s * p[axisB];
  out[axisB] = s * p[axisA] + c * p[axisB];
  return out;
}

/** Legacy & Section 1 Cross-W Beacons */
export const STAGE1_BEACONS = Object.freeze([
  { id: 'w0', label: 'W = 0.0 底层青苍舱', pos: [0, 0, 0, 0.0], color: '#4de6d3' },
  { id: 'wp', label: 'W = +1.8 上层流金舱', pos: [-1.4, 0, 0.6, 1.8], color: '#f7c346' },
  { id: 'wm', label: 'W = −1.8 深层星轨舱', pos: [1.4, 0, 1.8, -1.8], color: '#58a6ff' }
]);

export class Stage1Simulation {
  constructor() {
    this.reset();
  }
  reset() {
    this.player = [0, 0, -2.1, 0];
    this.radius = 0.25;
    this.collected = new Set();
    this.returnedToZero = false;
    this.trail = [[...this.player]];
  }
  move(delta4) {
    const next = clampInsideInterior(
      this.player.map((v, i) => v + (delta4[i] || 0)),
      this.radius
    );
    this.player = next;
    const prev = this.trail[this.trail.length - 1];
    if (dist4(prev, next) > 0.14) {
      this.trail.push([...next]);
      if (this.trail.length > 180) this.trail.shift();
    }
    let newlyCollected = null;
    for (const b of STAGE1_BEACONS) {
      const d = Math.min(dist4(this.player, b.pos), dist4(this.player, [0, 0, 0, b.pos[3]]));
      if (!this.collected.has(b.id) && d < 1.1) {
        this.collected.add(b.id);
        newlyCollected = b;
      }
    }
    if (this.collected.size === STAGE1_BEACONS.length && Math.abs(this.player[3]) < 0.28) {
      this.returnedToZero = true;
    }
    return { newlyCollected, complete: this.isComplete };
  }
  get isComplete() {
    return this.collected.size === STAGE1_BEACONS.length && this.returnedToZero;
  }
}

/**
 * Sealed 3D Glass Prison in W ∈ [-0.55, +0.55].
 */
export const VAULT_SPEC = Object.freeze({
  center: Object.freeze([0, 0, 0]),
  innerHalf: 1.05,
  outerHalf: 1.42,
  wallHalfW: 0.55,
  corePos: Object.freeze([0, 0, 0, 0]),
  pedestalPos: Object.freeze([2.55, 0, 0, 0]),
  playerRadius: 0.24,
  carryRadius: 0.30
});

export function vaultWallCollides(pos4, radius = VAULT_SPEC.playerRadius, hyperWall = false) {
  const halfW = hyperWall ? INTERIOR_L + 1 : VAULT_SPEC.wallHalfW;
  if (Math.abs(pos4[3]) >= halfW + radius - EPS) return false;

  const dx = Math.abs(pos4[0] - VAULT_SPEC.center[0]);
  const dy = Math.abs(pos4[1] - VAULT_SPEC.center[1]);
  const dz = Math.abs(pos4[2] - VAULT_SPEC.center[2]);
  const maxXYZ = Math.max(dx, dy, dz);

  if (maxXYZ >= VAULT_SPEC.outerHalf + radius - EPS) return false;
  if (maxXYZ <= VAULT_SPEC.innerHalf - radius + EPS) return false;
  return true;
}

export function vaultClearance4D(pos4, radius = VAULT_SPEC.playerRadius, hyperWall = false) {
  const halfW = hyperWall ? INTERIOR_L + 1 : VAULT_SPEC.wallHalfW;
  const wClear = Math.abs(pos4[3]) - (halfW + radius);
  const maxXYZ = Math.max(
    Math.abs(pos4[0] - VAULT_SPEC.center[0]),
    Math.abs(pos4[1] - VAULT_SPEC.center[1]),
    Math.abs(pos4[2] - VAULT_SPEC.center[2])
  );
  const outClear = maxXYZ - (VAULT_SPEC.outerHalf + radius);
  const inClear = (VAULT_SPEC.innerHalf - radius) - maxXYZ;
  return Math.max(wClear, outClear, inClear);
}

export class VaultSimulation {
  constructor() {
    this.reset();
  }
  reset(hyperWall = false) {
    this.hyperWall = !!hyperWall;
    this.player = [-2.45, 0, 0, 0];
    this.carryingCore = false;
    this.coreDelivered = false;
    this.corePos = [...VAULT_SPEC.corePos];
    this.blockedCount = 0;
    this.enteredVault = false;
    this.trail = [[...this.player]];
  }
  activeRadius() {
    return this.carryingCore ? VAULT_SPEC.carryRadius : VAULT_SPEC.playerRadius;
  }
  setHyperWall(enabled) {
    this.reset(enabled);
  }
  move(delta4) {
    const r = this.activeRadius();
    const totalLen = Math.hypot(...delta4);
    if (totalLen < 1e-9) return { blocked: false, picked: false, delivered: false };
    const steps = Math.max(1, Math.ceil(totalLen / 0.05));
    let blocked = false;
    for (let s = 0; s < steps; s++) {
      for (let axis = 0; axis < 4; axis++) {
        const d = delta4[axis] / steps;
        if (Math.abs(d) < 1e-10) continue;
        const cand = [...this.player];
        cand[axis] += d;
        if (!isStrictlyInsideInterior(cand, r)) {
          blocked = true;
          continue;
        }
        if (vaultWallCollides(cand, r, this.hyperWall)) {
          blocked = true;
          this.blockedCount++;
          continue;
        }
        this.player = cand;
      }
    }

    if (this.carryingCore) {
      this.corePos = [...this.player];
    }

    const maxXYZ = Math.max(Math.abs(this.player[0]), Math.abs(this.player[1]), Math.abs(this.player[2]));
    if (maxXYZ < VAULT_SPEC.innerHalf - r && Math.abs(this.player[3]) < 0.35) {
      this.enteredVault = true;
    }

    const prev = this.trail[this.trail.length - 1];
    if (dist4(prev, this.player) > 0.12) {
      this.trail.push([...this.player]);
      if (this.trail.length > 240) this.trail.shift();
    }

    let picked = false;
    let delivered = false;
    if (!this.carryingCore && !this.coreDelivered && dist4(this.player, this.corePos) < 0.9) {
      this.carryingCore = true;
      picked = true;
    }
    if (this.carryingCore && !this.coreDelivered && dist4(this.player, VAULT_SPEC.pedestalPos) < 0.95) {
      this.carryingCore = false;
      this.coreDelivered = true;
      this.corePos = [...VAULT_SPEC.pedestalPos];
      delivered = true;
    }

    return {
      blocked,
      picked,
      delivered,
      clearance: vaultClearance4D(this.player, r, this.hyperWall)
    };
  }
}

/**
 * Interlocked Giant Rings Unlinking in 4D.
 */
export const RING_SPEC = Object.freeze({
  majorR: 0.90,
  tubeR: 0.11,
  ringACenterX: -0.45,
  startBX: 0.45,
  unlinkedBX: 1.58
});

export function ringSurfaceClearance4D(bx, bw, samples = 48) {
  const R = RING_SPEC.majorR;
  const ax0 = RING_SPEC.ringACenterX;
  let minCenterDistSq = Infinity;
  for (let i = 0; i < samples; i++) {
    const u = (i / samples) * Math.PI * 2;
    const ax = ax0 + R * Math.cos(u);
    const ay = R * Math.sin(u);
    for (let j = 0; j < samples; j++) {
      const v = (j / samples) * Math.PI * 2;
      const bpx = bx + R * Math.cos(v);
      const bpz = R * Math.sin(v);
      const dx = ax - bpx;
      const dSq = dx * dx + ay * ay + bpz * bpz + bw * bw;
      if (dSq < minCenterDistSq) minCenterDistSq = dSq;
    }
  }
  return Math.sqrt(minCenterDistSq) - 2 * RING_SPEC.tubeR;
}

export class RingUnlinkSimulation {
  constructor() {
    this.reset();
  }
  reset() {
    this.bx = RING_SPEC.startBX;
    this.bw = 0.0;
    this.minObservedClearance = ringSurfaceClearance4D(this.bx, this.bw);
    this.unlinked = false;
    this.everInterpenetrated = false;
  }
  moveTo(targetX, targetW) {
    const clampedX = Math.max(-1.8, Math.min(2.3, targetX));
    const clampedW = Math.max(-2.4, Math.min(2.4, targetW));
    const steps = Math.max(1, Math.ceil(Math.hypot(clampedX - this.bx, clampedW - this.bw) / 0.04));
    let blocked = false;
    for (let s = 1; s <= steps; s++) {
      const nx = this.bx + ((clampedX - this.bx) / (steps - s + 1));
      const nw = this.bw + ((clampedW - this.bw) / (steps - s + 1));
      const clear = ringSurfaceClearance4D(nx, nw, 36);
      if (clear <= 0.015) {
        blocked = true;
        break;
      }
      this.bx = nx;
      this.bw = nw;
      if (clear < this.minObservedClearance) this.minObservedClearance = clear;
    }
    const currentClear = ringSurfaceClearance4D(this.bx, this.bw, 48);
    if (currentClear <= 0) this.everInterpenetrated = true;
    if (this.bx >= RING_SPEC.unlinkedBX && Math.abs(this.bw) < 0.22 && !this.everInterpenetrated) {
      this.unlinked = true;
    }
    return { bx: this.bx, bw: this.bw, clearance: currentClear, blocked, unlinked: this.unlinked };
  }
}

/**
 * Chiral Key & Mirror Control Swap (180° XW Rotation).
 */
export const CHIRAL_KEY_VERTICES = Object.freeze([
  Object.freeze([0.0, 0.0, 0.0, 0]),
  Object.freeze([0.96, 0.0, 0.0, 0]),
  Object.freeze([0.14, 0.76, 0.0, 0]),
  Object.freeze([0.20, 0.16, 0.64, 0])
]);

export const MIRROR_LOCK_VERTICES = Object.freeze(
  CHIRAL_KEY_VERTICES.map(v => Object.freeze([-v[0], v[1], v[2], 0]))
);

function signedTetVolume3D(verts) {
  const a = [verts[1][0] - verts[0][0], verts[1][1] - verts[0][1], verts[1][2] - verts[0][2]];
  const b = [verts[2][0] - verts[0][0], verts[2][1] - verts[0][1], verts[2][2] - verts[0][2]];
  const c = [verts[3][0] - verts[0][0], verts[3][1] - verts[0][1], verts[3][2] - verts[0][2]];
  const cx = b[1] * c[2] - b[2] * c[1];
  const cy = b[2] * c[0] - b[0] * c[2];
  const cz = b[0] * c[1] - b[1] * c[0];
  return (a[0] * cx + a[1] * cy + a[2] * cz) / 6;
}

const BASE_KEY_VOLUME = signedTetVolume3D(CHIRAL_KEY_VERTICES);
const BASE_EDGE_LENGTHS = [];
for (let i = 0; i < 4; i++) {
  for (let j = i + 1; j < 4; j++) {
    BASE_EDGE_LENGTHS.push([i, j, dist4(CHIRAL_KEY_VERTICES[i], CHIRAL_KEY_VERTICES[j])]);
  }
}

export class ChiralKeySimulation {
  constructor() {
    this.reset();
  }
  reset() {
    this.rotXY = 0;
    this.rotXZ = 0;
    this.rotYZ = 0;
    this.rotXW = 0;
    this.unlocked = false;
  }
  setAngles({ xy = this.rotXY, xz = this.rotXZ, yz = this.rotYZ, xw = this.rotXW } = {}) {
    this.rotXY = xy;
    this.rotXZ = xz;
    this.rotYZ = yz;
    this.rotXW = xw;
    const evalState = this.evaluate();
    if (evalState.matchesLock) this.unlocked = true;
    return evalState;
  }
  transformedVertices() {
    const rXY = (this.rotXY * Math.PI) / 180;
    const rXZ = (this.rotXZ * Math.PI) / 180;
    const rYZ = (this.rotYZ * Math.PI) / 180;
    const rXW = (this.rotXW * Math.PI) / 180;
    return CHIRAL_KEY_VERTICES.map(v => {
      let p = rotate4Plane(v, 0, 1, rXY);
      p = rotate4Plane(p, 0, 2, rXZ);
      p = rotate4Plane(p, 1, 2, rYZ);
      p = rotate4Plane(p, 0, 3, rXW);
      return p;
    });
  }
  evaluate() {
    const verts = this.transformedVertices();
    let maxEdgeError = 0;
    for (const [i, j, expected] of BASE_EDGE_LENGTHS) {
      const err = Math.abs(dist4(verts[i], verts[j]) - expected);
      if (err > maxEdgeError) maxEdgeError = err;
    }
    const volumeRatio = signedTetVolume3D(verts) / BASE_KEY_VOLUME;
    const maxW = Math.max(...verts.map(v => Math.abs(v[3])));
    let maxSocketError = 0;
    for (let i = 0; i < 4; i++) {
      const d = dist4(verts[i], MIRROR_LOCK_VERTICES[i]);
      if (d > maxSocketError) maxSocketError = d;
    }
    const matchesLock = maxSocketError < 0.12 && Math.abs(volumeRatio + 1) < 0.10 && maxW < 0.12;
    return {
      vertices: verts,
      maxEdgeError,
      volumeRatio,
      maxW,
      maxSocketError,
      matchesLock,
      unlocked: this.unlocked || matchesLock
    };
  }
}

/**
 * TRUE 4D OBJECT #1 (Section 7): 4D Hypersphere (B^4) Slicing.
 */
export function hypersphereSlice(w, { R = 2.1, w0 = 0 } = {}) {
  const dw = Math.abs(w - w0);
  if (dw > R) {
    return { exists: false, radius: 0, volume3D: 0, fraction: 0 };
  }
  const radius = Math.sqrt(Math.max(0, R * R - dw * dw));
  const volume3D = (4 / 3) * Math.PI * radius * radius * radius;
  return {
    exists: radius > 1e-6,
    radius,
    volume3D,
    fraction: radius / R
  };
}

/**
 * TRUE 4D OBJECT #2 (Section 8): Diagonal-Tilted 4D Hypercube / 16-Cell Polytope Slice Metamorphosis!
 *
 * Just as slicing a 3D cube along its corner diagonal produces a Triangle -> Hexagon -> Triangle,
 * slicing a diagonally oriented 4D Hypercube / 16-Cell across W = c morphs the 3D cross-section
 * between three distinct Platonic/Archimedean polyhedra:
 *   - W < -0.9 (Lower apex zone): Tetrahedron (正四面体, 4 faces)
 *   - |W| <= 0.9 (Equatorial core): Octahedron (正八面体, 8 faces)
 *   - W > +0.9 (Upper aligned zone): Cube (正立方体, 6 faces)
 */
export function hyperPolytopeSliceForm(w) {
  if (Math.abs(w) > 2.35) {
    return { exists: false, form: 'none', name: '超出四维多胞体边界', faces: 0, scale: 0 };
  }
  if (w < -0.85) {
    const s = Math.max(0.35, 1.35 - Math.abs(w + 1.6) * 0.8);
    return { exists: true, form: 'tetrahedron', name: '正四面体尖顶切面（4面）', faces: 4, scale: s };
  }
  if (w <= 0.85) {
    const s = Math.max(0.75, 1.55 - Math.abs(w) * 0.5);
    return { exists: true, form: 'octahedron', name: '正八面体赤道圣殿（8面）', faces: 8, scale: s };
  }
  const s = Math.max(0.4, 1.35 - Math.abs(w - 1.6) * 0.8);
  return { exists: true, form: 'cube', name: '正立方体上翼切面（6面）', faces: 6, scale: s };
}

/**
 * TRUE 4D OBJECT #3 (Section 9): 4D Hyper-Torus (Spheritorus) Split-and-Merge Bridge!
 *
 * Equation of a 4D Spheritorus with major radius R in (X, W) and minor tube radius r in (X', Y, Z):
 *   (sqrt(x^2 + w^2) - R)^2 + y^2 + z^2 <= r^2.
 * Look at what happens when we intersect this single connected 4D object with a 3D hyperplane W = c:
 *   - At W = 0 (|c| < R - r): sqrt(x^2 + 0) wraps around two centers x = +R and x = -R!
 *     The 3D slice consists of TWO COMPLETELY DISCONNECTED 3D ISLANDS at x = -R and x = +R
 *     separated by a chasm!
 *   - At |W| ≈ R (e.g. W = +1.65): sqrt(x^2 + w^2) ≈ R across the whole span [-R, +R],
 *     so the two separate 3D islands GROW AND MERGE into ONE CONTINUOUS 3D RING BRIDGE!
 */
export function hyperTorusSliceState(w, { majorR = 1.65, tubeR = 0.85 } = {}) {
  const aw = Math.abs(w);
  if (aw > majorR + tubeR) {
    return { exists: false, merged: false, islandOffset: 0, bridgeWidth: 0, description: '超出四维超环面范围' };
  }
  if (aw < majorR - tubeR * 0.45) {
    // Disconnected two-island regime!
    const sep = Math.sqrt(Math.max(0.2, majorR * majorR - aw * aw));
    return {
      exists: true,
      merged: false,
      islandOffset: sep,
      bridgeWidth: 0,
      description: '当前切过超环面中孔：同一个四维环面在三维里分裂成左、右两座互不相连的孤岛！'
    };
  }
  // Merged arch bridge regime!
  const archSpan = Math.sqrt(Math.max(0.4, (majorR + tubeR) ** 2 - aw * aw));
  return {
    exists: true,
    merged: true,
    islandOffset: 0,
    bridgeWidth: archSpan,
    description: '当前切过超环面拱顶：原本分离的两座孤岛在当前空间层融合成了一整座连通的环形天桥！'
  };
}

/**
 * TRUE 4D OBJECT #4 (Section 10): 24-Cell Clifford Isoclinic Double Rotor!
 *
 * In 3D, every rotation has a fixed axis. In 4D, a rigid body can rotate simultaneously
 * in two completely orthogonal planes (XW at speed ω and YZ at speed ω) — an Isoclinic
 * Clifford Double Rotation! Every vertex spirals continuously from the inner 3D shell
 * out into the 4th dimension and back onto the outer 3D shell ("turning inside-out").
 */
export function cliffordDoubleRotate4D(point4, phaseRad) {
  const p1 = rotate4Plane(point4, 0, 3, phaseRad); // XW rotation
  return rotate4Plane(p1, 1, 2, phaseRad);         // Simultaneous orthogonal YZ rotation!
}

/**
 * Astronaut Internal Cross-Section & XW Tilt Intersection (Section 11).
 */
export function xwTiltedBodyIntersection(thetaDeg, sliceW = 0, bodyHalfX = 0.62) {
  const rad = (thetaDeg * Math.PI) / 180;
  const s = Math.sin(rad);
  const c = Math.cos(rad);
  if (Math.abs(s) < 1e-5) {
    const coincides = Math.abs(sliceW) < 0.04;
    return {
      dimension: coincides ? 3 : 0,
      coincides,
      intersects: coincides,
      bodyX: null,
      worldX: 0,
      description: coincides
        ? '两人在同一空间层：整具身体完整可见。'
        : '身体位于相邻空间层：当前层看不到，但依然完好。'
    };
  }
  const bodyX = sliceW / s;
  if (Math.abs(bodyX) > bodyHalfX) {
    return {
      dimension: 0,
      coincides: false,
      intersects: false,
      bodyX,
      worldX: bodyX * c,
      description: '当前空间层未切过弯曲位置，按 Q / E 微调空间层即可对准病灶。'
    };
  }
  return {
    dimension: 2,
    coincides: false,
    intersects: true,
    bodyX,
    worldX: bodyX * c,
    description: '身体在第四维弯曲穿过当前层，暴露出受阻的内脏节点。'
  };
}

/**
 * 12-Section Continuous Story Campaign for Chapter 2: 《折页之间》 —「离开画纸的人」.
 *
 * Act I (01–02): 3D People Shuttling Across Volumetric 4D Space Layers
 * Act II (03–06): Crushing 3D Obstacles from the 4th Dimension (Prison, Hyper-Wall, Rings, Mirror Key)
 * Act III (07–10): True 4D Megastructures & Their 3D Slice Metamorphoses (Hypersphere, Polytope Morph, 4D Torus Islands, Clifford Double Rotor)
 * Act IV (11–12): High-Dimensional Medical Surgery & Awakening the 4D Ark Core
 */
export const CHAPTER2_SECTIONS = Object.freeze([
  {
    id: 1,
    code: '第一小节',
    title: '隔页的呼救',
    subtitle: '初识立体空间舱层（W 轴跃迁）',
    hasCompanion: true,
    speaker: '先遣领航员 · 林夏 (07)',
    dialogue: '“08号，听到吗？！你终于穿破八胞外壳进来了！别怕，我就在你头顶的 W = +1.8 流金舱层——按 E 穿梭上来找我！”',
    goal: '按住 E（或点右侧高维操作台）穿梭至 W = +1.8 流金空间舱，走向挥手的同伴林夏与她汇合。',
    godHint: '高维视角下，每个空间层都是一座带厚度的立体舱室。直接点击上层流金舱或按 E，让你的小人跨越第四维！'
  },
  {
    id: 2,
    code: '第二小节',
    title: '折叠断渊',
    subtitle: '三层立体空间舱连续穿梭过桥',
    hasCompanion: true,
    speaker: '先遣领航员 · 林夏 (07)',
    dialogue: '“回廊外壳正在坍缩，我们得赶去方舟主塔！前方的长桥被切碎在 0、+1.8、−1.8 三层空间舱里了，边跑边按 Q/E 切换脚下的舱层跟上我！”',
    goal: '向前推进：依次切入 W = +1.8 流金桥段 → W = −1.8 星轨桥段 → W = 0 终点甲板，与对岸的林夏汇合。',
    godHint: '三段断桥分别悬浮在三座平行的立体空间舱里——在高维操作台上一眼就能看穿哪一层有路！'
  },
  {
    id: 3,
    code: '第三小节',
    title: '绝密玻璃牢笼',
    subtitle: '高维降维碾压：无门密室救援',
    hasCompanion: true,
    speaker: '先遣领航员 · 林夏 (07)',
    dialogue: '“糟了！防御罩落下来把我和启动核心关进了六面封死的防爆玻璃房！三维里根本没门，快用高维操作台从 W = +1.8 层空降进来救我！”',
    goal: '按 E 升入 W = +1.8 层（越过只造在 W=0 的玻璃牢笼），走到林夏正上方按 Q 空降进牢笼拿起核心，再翻页带去右侧接收台！',
    godHint: '高维碾压低维：三维里密不透风的六面牢笼，在第四维看来只是个没盖子的矮框！直接点高维台把小人空投进牢笼中心！'
  },
  {
    id: 4,
    code: '第四小节',
    title: '四维封锁线',
    subtitle: '贯穿高维的超墙与底层唯一裂隙',
    hasCompanion: false,
    speaker: '先遣领航员 · 林夏 (07) [远程通讯]',
    dialogue: '“我在后方终端帮你掩护！注意前面那道赤红屏障——它是连第四维都封死的【四维超墙】，往上翻页也没用！我只在 W = −1.8 底层右侧撕开了个缺口！”',
    goal: '按 Q 潜入 W = −1.8 深蓝底层，从右侧唯一的高维缺口钻过赤红超墙，再升回 W = 0 抵达北侧终端。',
    godHint: '不是所有墙都能随便翻越：赤红超墙在 W=0 和 W=+1.8 全封死，唯有最下方的 W=−1.8 舱层右侧留有一道缺口！'
  },
  {
    id: 5,
    code: '第五小节',
    title: '巨环死结',
    subtitle: '四维无损解开相扣合金环',
    hasCompanion: false,
    speaker: '先遣领航员 · 林夏 (07) [远程通讯]',
    dialogue: '“主塔升降梯被两只 4 米高的实心金属巨环死死扣住了！在同层硬推只会卡死，先把金色巨环带到 W = +1.4 舱层，就能毫无碰撞地穿过去！”',
    goal: '按 E 把金色巨环升入 W = +1.4 舱层，按 D（或高维台右移）推着金环越过青环位置，再按 Q 放回 W = 0 解开死结。',
    godHint: '在高维操作台里看清本质：把金环挪去上层空间舱，两只实心环就像错层的高架桥一样互不阻挡！'
  },
  {
    id: 6,
    code: '第六小节',
    title: '镜中双生与圣钥',
    subtitle: '与镜中自己互换手性 · 拼合双生密钥',
    hasCompanion: true,
    speaker: '先遣领航员 · 林夏 (07)',
    dialogue: '“内殿大门需要左右对称的两半圣钥拼合！但我俩手里的都是【右旋半钥】……快看中央那面四维相位魔镜！和镜子里的你互换，把你的半钥翻转成【左旋】！”',
    goal: '走近中央的四维魔镜按 R（或点高维台「四维镜像互换」），与镜中自己互换使手里的圣钥手性反转，再走向大门与林夏的半钥完美拼合！',
    godHint: '三维里怎么转都无法把右手钥匙变成左手钥匙；但在第四维翻转 180°，你与镜中自己互换，两半圣钥立刻严丝合缝！'
  },
  {
    id: 7,
    code: '第七小节',
    title: '真四维物①：超球星核',
    subtitle: '四维实心超球切面缩放与三态采能',
    hasCompanion: false,
    speaker: '先遣领航员 · 林夏 (07) [远程通讯]',
    dialogue: '“从这里开始是真正的四维巨物！这颗【四维超球】在 W=0 膨胀成 4.4 米堵死了路，切去 W=−1.8 让它缩成小球绕过去，再去 W=+2.2 让它彻底消失，集齐三枚晶簇！”',
    goal: '利用四维超球在不同空间层切面大小不同的特性：在 W=−1.8（缩球层）、W=0（赤道层）、W=+2.2（超界消失层）集齐 3 枚稳压晶簇！',
    godHint: '真正的四维超球其实没有呼吸缩放——切过它的极区是小球，切过赤道是巨球，超出它的 W 半径后巨球原地消失！'
  },
  {
    id: 8,
    code: '第八小节',
    title: '真四维物②：超方圣殿',
    subtitle: '斜立实心超立方体：四面体 ⇄ 八面体 ⇄ 立方体相变',
    hasCompanion: false,
    speaker: '先遣领航员 · 林夏 (07) [远程通讯]',
    dialogue: '“看中央那座悬浮建筑！它是一块斜立在四维中的【实心超立方体】！在不同空间层切过它的对角线，它会变成完全不同的多面体——快去激活它的三种几何形态！”',
    goal: '穿梭三层空间，依次走近并激活同一座四维超方体切出的三种形态：W=−1.8【正四面体】→ W=0【正八面体钻石殿】→ W=+1.8【正立方体】！',
    godHint: '就像斜切三维方块会切出三角形和六边形，沿第四维切过斜立的四维超立方体，会在三维里依次切出正四面体、正八面体与正立方体！'
  },
  {
    id: 9,
    code: '第九小节',
    title: '真四维物③：分合浮岛',
    subtitle: '四维超环面：两座孤岛在第四维融合成桥',
    hasCompanion: true,
    speaker: '先遣领航员 · 林夏 (07)',
    dialogue: '“08号，我在右边的浮岛上！在 W=0 层，我们脚下是两座被深渊隔开的孤岛；但它们其实是同一个【四维超环面】的切片！快升到 W=+1.8 层，两座孤岛就会融合成一座环形天桥！”',
    goal: '在 W=0 两岛完全断开；按 E 升入 W=+1.8 层使两座孤岛融合成完整环形天桥，走过天桥到右侧再按 Q 降回 W=0 与林夏汇合！',
    godHint: '就像把救生圈竖着浸入水面，水面上先看到两个分离的圆圈，浸到顶部才连成一体——两座孤岛在第四维本来就是连通的！'
  },
  {
    id: 10,
    code: '第十小节',
    title: '真四维物④：双旋星轮',
    subtitle: '正二十四胞体克利福德双旋转（由内向外翻滚）',
    hasCompanion: false,
    speaker: '先遣领航员 · 林夏 (07) [远程通讯]',
    dialogue: '“这是四维独有的【正二十四胞体双旋星轮】！它没有固定转轴，而是同时在两个正交平面双旋转，不停把内环翻到第四维外层！趁它的相位对齐时收集三枚曲率核心！”',
    goal: '观察由内向外翻滚的四维双旋星轮：在 W=0 与 W=±1.8 层捕捉从第四维翻入当前层的星轮核心，集齐 3 枚高维曲率核心！',
    godHint: '三维物体旋转必有一根静止轴；而四维物体可以做克利福德双旋转（XW+YZ 同时等角旋转），整个星轮由内向外无死角翻滚！'
  },
  {
    id: 11,
    code: '第十一小节',
    title: '四维急诊：透视内脏',
    subtitle: '高维无创透视 + 第四维身体弯曲手术',
    hasCompanion: true,
    speaker: '先遣领航员 · 林夏 (07)',
    dialogue: '“咳……星轮的高维能量把三块四维碎屑打进了我体内！我的宇航服锁死了不能脱，快用高维医疗台直接透视我的内脏，再把我的身体在第四维轻轻弯曲取出碎屑！”',
    goal: '走近医疗台上的林夏：在高维透视下看穿封闭宇航服里的心脏与双肺，按 Q/E（或点高维台排异）弯曲她的四维姿态，依次清除心脏、左肺、脊柱的 3 处紫色碎屑！',
    godHint: '从第四维看三维人体，就像看透明画纸上的小人：无需划开宇航服表皮，就能直接触达并取出她内脏里的三块碎屑！'
  },
  {
    id: 12,
    code: '第十二小节',
    title: '跃出画纸：方舟之心',
    subtitle: '终章觉醒 · 俯瞰八胞外壳与五维星门',
    hasCompanion: true,
    speaker: '先遣领航员 · 林夏 (07)',
    dialogue: '“谢谢你救了我，08号！看脚下——那就是我们曾经困在里面的第一章《回廊空间站》八个房间！走上主控台，和我一起点亮四维方舟之心吧！”',
    goal: '与康复的林夏并肩走上前方的主控核心，按 R（或点高维台「启动方舟之心」）折叠并点亮整座八胞空间站，开启通往更高维度的星门！',
    godHint: '你已彻底走出名为“三维”的画纸。曾经困住你的八间立方体房间，如今只是你掌心中一枚可以自由折叠的四维超立方体！'
  }
]);
