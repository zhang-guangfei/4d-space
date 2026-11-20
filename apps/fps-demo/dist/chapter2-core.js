/**
 * Pure 4D Hypercube Interior (-L, L)^4 Physics & Geometry Engine for Chapter 2.
 * Zero DOM / Babylon dependencies — 100% deterministic & unit-testable.
 *
 * Implements all four progressive stages from docs/design/chapter-2:
 *  Stage 1: First-person W-axis traversal inside (-L, L)^4 (with Book-Page low-dim analogy)
 *  Stage 2: 4D Vault Heist — Bypassing a sealed 3D box (finite-W positive + full-W hyper-wall counterexample)
 *  Stage 3A: Interlocked 3D torus rings unlinking continuously through W
 *  Stage 3B: 4-vertex chiral key rigid SO(4) 180° XW rotation to invert 3D handedness
 *  Stage 4: 4D Hypersphere S^3 ball slicing + XW-tilted 2D cross-section intersection math
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

/** Stage 1: Cross-W Beacons at identical (X, Y, Z) but distinct W hyperplanes. */
export const STAGE1_BEACONS = Object.freeze([
  { id: 'w0', label: 'W = 0.0 基准层', pos: [0, 0, 0, 0.0], color: '#80ccb9' },
  { id: 'wp', label: 'W = +1.8 上叠层', pos: [0, 0, 0, 1.8], color: '#dfbb73' },
  { id: 'wm', label: 'W = −1.8 下叠层', pos: [0, 0, 0, -1.8], color: '#68a7ff' }
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
      if (!this.collected.has(b.id) && dist4(this.player, b.pos) < 0.72) {
        this.collected.add(b.id);
        newlyCollected = b;
      }
    }
    if (this.collected.size === STAGE1_BEACONS.length && Math.abs(this.player[3]) < 0.22) {
      this.returnedToZero = true;
    }
    return { newlyCollected, complete: this.isComplete };
  }
  get isComplete() {
    return this.collected.size === STAGE1_BEACONS.length && this.returnedToZero;
  }
}

/**
 * Stage 2: 4D Vault Heist — Sealed 3D Cube Box in W ∈ [-0.55, +0.55].
 * Positive case: hyperWall = false -> finite W-band wall can be bypassed continuously via |W| > 0.55 + r.
 * Counterexample: hyperWall = true -> wall spans entire [-L, +L] in W; mathematically impassable!
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

/** Exact 4D collision check between sphere(pos4, radius) and the 6 thick walls of the sealed 3D box. */
export function vaultWallCollides(pos4, radius = VAULT_SPEC.playerRadius, hyperWall = false) {
  const halfW = hyperWall ? INTERIOR_L + 1 : VAULT_SPEC.wallHalfW;
  // First check W-band overlap
  if (Math.abs(pos4[3]) >= halfW + radius - EPS) return false;

  const dx = Math.abs(pos4[0] - VAULT_SPEC.center[0]);
  const dy = Math.abs(pos4[1] - VAULT_SPEC.center[1]);
  const dz = Math.abs(pos4[2] - VAULT_SPEC.center[2]);
  const maxXYZ = Math.max(dx, dy, dz);

  // Completely outside outer box (with sphere margin)
  if (maxXYZ >= VAULT_SPEC.outerHalf + radius - EPS) return false;
  // Completely inside hollow cavity (with sphere margin)
  if (maxXYZ <= VAULT_SPEC.innerHalf - radius + EPS) return false;
  // Otherwise overlapping the solid 3D wall shell!
  return true;
}

/** Signed 4D clearance from the vault shell (> 0 means safe clearance, <= 0 means contact/overlap). */
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

    // Track whether player safely reached inside the sealed vault cavity at W≈0
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
    if (!this.carryingCore && !this.coreDelivered && dist4(this.player, this.corePos) < 0.62) {
      this.carryingCore = true;
      picked = true;
    }
    if (this.carryingCore && !this.coreDelivered && dist4(this.player, VAULT_SPEC.pedestalPos) < 0.65) {
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
 * Stage 3A: Interlocked 3D Torus Rings in 4D.
 * Ring A: fixed in XY plane at (-0.45, 0, 0, 0), R = 0.90, tube r = 0.11.
 * Ring B: movable in XZ plane at (bx, 0, 0, bw), R = 0.90, tube r = 0.11.
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
    // Unlinked once Ring B is completely outside Ring A's span AND returned to W ≈ 0!
    if (this.bx >= RING_SPEC.unlinkedBX && Math.abs(this.bw) < 0.08 && !this.everInterpenetrated) {
      this.unlinked = true;
    }
    return { bx: this.bx, bw: this.bw, clearance: currentClear, blocked, unlinked: this.unlinked };
  }
}

/**
 * Stage 3B: Chiral 4-vertex non-coplanar 3D key & mirror lock socket.
 * Rigid SO(4) rotation in XW by 180° turns (x, y, z, 0) -> (-x, y, z, 0),
 * reversing 3D signed volume (chirality) while preserving every 4D edge length identically!
 */
export const CHIRAL_KEY_VERTICES = Object.freeze([
  Object.freeze([0.0, 0.0, 0.0, 0]),    // Hub (white)
  Object.freeze([0.96, 0.0, 0.0, 0]),   // Red prong
  Object.freeze([0.14, 0.76, 0.0, 0]),  // Gold prong
  Object.freeze([0.20, 0.16, 0.64, 0])  // Cyan prong
]);

export const MIRROR_LOCK_VERTICES = Object.freeze(
  CHIRAL_KEY_VERTICES.map(v => Object.freeze([-v[0], v[1], v[2], 0]))
);

function signedTetVolume3D(verts) {
  const a = [verts[1][0] - verts[0][0], verts[1][1] - verts[0][1], verts[1][2] - verts[0][2]];
  const b = [verts[2][0] - verts[0][0], verts[2][1] - verts[0][1], verts[2][2] - verts[0][2]];
  const c = [verts[3][0] - verts[0][0], verts[3][1] - verts[0][1], verts[3][2] - verts[0][2]];
  // Scalar triple product a · (b × c) / 6
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
    this.rotXY = 0; // degrees
    this.rotXZ = 0;
    this.rotYZ = 0;
    this.rotXW = 0; // 4th-dimensional rotation!
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
    const matchesLock = maxSocketError < 0.09 && Math.abs(volumeRatio + 1) < 0.08 && maxW < 0.09;
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
 * Stage 4A: Exact 4D Hypersphere (4-Ball) 3D Hyperplane Slice.
 * x² + y² + z² + (w - w0)² <= R² intersected with w = c
 * produces a 3D solid ball of radius r(c) = sqrt(R² - (c - w0)²) when |c - w0| <= R.
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
 * Stage 4B: Exact 2D Cross-Section of a 3D rigid body rotated in the XW plane by angle `thetaDeg`
 * and intersected with the fixed observation hyperplane W = sliceW.
 *
 * A 3D body initially in W = 0 rotated by θ in XW has points:
 *   (x cosθ, y, z, x sinθ).
 * Intersecting with W = sliceW requires:
 *   x sinθ = sliceW  =>  x_body = sliceW / sinθ (for sinθ ≠ 0),
 * leaving a TRUE 2D plane (y, z) located at projected X = x_body * cosθ = sliceW * cotθ!
 */
export function xwTiltedBodyIntersection(thetaDeg, sliceW = 0, bodyHalfX = 0.62) {
  const rad = (thetaDeg * Math.PI) / 180;
  const s = Math.sin(rad);
  const c = Math.cos(rad);
  if (Math.abs(s) < 1e-5) {
    // Coplanar with W = 0! Either entire 3D body (if sliceW ≈ 0) or empty set!
    const coincides = Math.abs(sliceW) < 0.04;
    return {
      dimension: coincides ? 3 : 0,
      coincides,
      intersects: coincides,
      bodyX: null,
      worldX: 0,
      description: coincides
        ? 'θ = 0° 且 W = 0：整个三维刚体完整落入当前切片（三维交集）。'
        : 'θ = 0° 但 W ≠ 0：零厚度三维刚体已整体离开当前切片（空集，物体并未消失）。'
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
      description: `倾斜体与 W = ${sliceW.toFixed(2)} 超平面不相交（所需身体坐标 x = ${bodyX.toFixed(2)} 超出躯干宽度 ±${bodyHalfX}）。`
    };
  }
  return {
    dimension: 2,
    coincides: false,
    intersects: true,
    bodyX,
    worldX: bodyX * c,
    description: `真实二维交集！倾斜 ${thetaDeg.toFixed(0)}° 的三维躯体在身体局部 x = ${bodyX.toFixed(2)} 处穿过 W = ${sliceW.toFixed(2)} 超平面，留下一片无厚度的二维截面轮廓。`
  };
}
