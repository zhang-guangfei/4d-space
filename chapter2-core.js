/**
 * 4D Hypercube Interior (-L, L)^4 Physics, Geometry & 6-Section First-Person Astronaut Engine
 * for Beyond 3D Chapter 2: 《折页之间》.
 *
 * Pure ES module with zero DOM/Babylon dependencies so all 4D collision, topology,
 * chirality, slicing, and 6-section astronaut progression rules are 100% unit-testable.
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

/** Section 1: Cross-W Astronaut Beacons across 3 stacked 3D pages. */
export const STAGE1_BEACONS = Object.freeze([
  { id: 'w0', label: 'W = 0.0 起点回廊', pos: [0, 0, 0, 0.0], color: '#80ccb9' },
  { id: 'wp', label: 'W = +1.8 金色上页', pos: [-1.4, 0, 0.4, 1.8], color: '#dfbb73' },
  { id: 'wm', label: 'W = −1.8 蔚蓝下页', pos: [1.4, 0, 1.8, -1.8], color: '#68a7ff' }
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
      // Check both exact beacon pos and centered [0,0,0,w] for compatibility
      const d = Math.min(dist4(this.player, b.pos), dist4(this.player, [0, 0, 0, b.pos[3]]));
      if (!this.collected.has(b.id) && d < 0.95) {
        this.collected.add(b.id);
        newlyCollected = b;
      }
    }
    if (this.collected.size === STAGE1_BEACONS.length && Math.abs(this.player[3]) < 0.25) {
      this.returnedToZero = true;
    }
    return { newlyCollected, complete: this.isComplete };
  }
  get isComplete() {
    return this.collected.size === STAGE1_BEACONS.length && this.returnedToZero;
  }
}

/**
 * Section 2: Sealed 3D Glass Room Rescue in W ∈ [-0.55, +0.55].
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
    if (!this.carryingCore && !this.coreDelivered && dist4(this.player, this.corePos) < 0.85) {
      this.carryingCore = true;
      picked = true;
    }
    if (this.carryingCore && !this.coreDelivered && dist4(this.player, VAULT_SPEC.pedestalPos) < 0.85) {
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
 * Section 3: Interlocked Giant Rings Unlinking in 4D (Astronaut pushes Ring B).
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
    if (this.bx >= RING_SPEC.unlinkedBX && Math.abs(this.bw) < 0.16 && !this.everInterpenetrated) {
      this.unlinked = true;
    }
    return { bx: this.bx, bw: this.bw, clearance: currentClear, blocked, unlinked: this.unlinked };
  }
}

/**
 * Section 4: Astronaut Mirror Flip (180° XW Rotation Swaps Left & Right Hands!).
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
  return (a[0] * cx + a[1] * cx * 0 + a[1] * cy + a[2] * cz) / 6;
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
 * Section 5: 4D Hypersphere Slicing.
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
 * Section 6: Astronaut Internal Cross-Section & XW Tilt Intersection.
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
        ? '两人处在同一空间页：整具身体完整可见。'
        : '他已移入相邻空间页：当前页看不到他，但他依然完好存在。'
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
      description: '当前页未切过他倾斜的身体，继续按 Q / E 移向他所在的页即可重逢。'
    };
  }
  return {
    dimension: 2,
    coincides: false,
    intersects: true,
    bodyX,
    worldX: bodyX * c,
    description: '他在第四维微微倾斜，穿过你所在的这一页，留下一道发光的身体断面轮廓。'
  };
}

/**
 * Six Story-Driven First-Person + God-View Sections for Chapter 2.
 */
export const CHAPTER2_SECTIONS = Object.freeze([
  {
    id: 1,
    code: '第一小节',
    title: '看不见的同路人',
    subtitle: '翻动空间书页（穿越 W 轴）',
    story: '你穿破 W+ 的镜面球，第一次离开超立方体的表面外壳，站在了四维内部。面前的通道断了，但空气里浮现着另外两页空间里的宇航员残影。',
    goal: '按 Q / E 翻到金色上页（W = +1.8）和蔚蓝下页（W = −1.8），分别走近两位同路人汇合，再翻回 W = 0 走上对面新出现的出口平台。',
    godHint: '在上帝视角下，三页三维空间像书页一样上下叠放。操控你的宇航员小人翻到上页和下页与同伴汇合吧！'
  },
  {
    id: 2,
    code: '第二小节',
    title: '密室里的求救者',
    subtitle: '六面封死的玻璃房（隔墙救援）',
    story: '大厅中央立着一座六面都被防爆玻璃封死的密室，没有门也没有缝。一名同伴被困在里面向你招手，脚边放着开门的光核。',
    goal: '按 E 翻到 W = +1.4 页（此时玻璃墙在当前页消失），走到密室正中央、同伴的正上方，再按 Q 降回 W = 0 进入密室！拿起光核后再翻页带到右侧接收台。',
    godHint: '从上帝视角俯瞰：三维密室的六面墙只围住了 W = 0 那一页，你的小人只需迈去上一页就能跨进密室中央！'
  },
  {
    id: 3,
    code: '第三小节',
    title: '解不开的死结',
    subtitle: '相扣的巨环（四维无损解链）',
    story: '两只巨大的实心金属圆环死死扣在一起，锁住了同伴的吊舱。在普通空间里，不锯断铁环绝不可能把它们分开。',
    goal: '走近金色圆环握住牵引把：先按 E 带着金色环翻到 W = +1.0 页，再按 W 推着它往前走过青色环的位置，最后按 Q 放回 W = 0 页，彻底解开双环！',
    godHint: '在上帝视角下看小人推环：金色环被小人带去了另一页空间，从高维上方轻松越过青色环，全程没有一点碰撞！'
  },
  {
    id: 4,
    code: '第四小节',
    title: '镜中人的握手',
    subtitle: '四维翻转（左右手互换）',
    story: '双人掌纹大门前，同伴举起金袖标右手等待对接；但你面对他时，对准锁槽的却是你的红袖标左手。在房间里怎么转身，左手也变不成右手。',
    goal: '走进中央的四维回旋环，按住 E（或在 F 实验室里拉动翻转杆）让身体在第四维翻转 180°——低头看你的红、金袖标双手左右互换后，走到同伴面前完成握手！',
    godHint: '像把纸面上的小纸人翻个面再放回纸上一样：看着你的宇航员小人在第四维翻身 180°，左手与右手彻底对调！'
  },
  {
    id: 5,
    code: '第五小节',
    title: '凭空生长的巨球',
    subtitle: '穿越四维巨球（超球穿层）',
    story: '第五座大厅看似空无一物，远处的同伴示意你一边往前走、一边按 Q / E 翻动空间页——这里藏着一颗横跨多层空间的四维巨球。',
    goal: '按 E 与 Q 在 W = −2.4 到 +2.4 之间穿行，亲眼目睹巨球在空气中凭空浮现、膨胀到占满大厅、又缩小消失；依次走过「初现」「赤道」「消隐」三处观测点与同伴汇合。',
    godHint: '在上帝视角下真相大白：那颗四维巨球其实一直静静停在原处，变化的只是你的宇航员小人所在的空间页！'
  },
  {
    id: 6,
    code: '第六小节',
    title: '透视自身',
    subtitle: '高维目光与身体断面',
    story: '旅程的最后一课，你把目光投向了人本身。中央观测台上站着你的同伴宇航员——当高维的目光落下，或者当一个人在第四维微微倾斜时，我们会看到什么？',
    goal: '走近中央的宇航员同伴：先在「高维透视」下越过封闭的宇航服看到他跳动的心脏与血管光路；再按 R 切换「四维倾斜」，按 Q / E 观察他穿过当前页留下的身体断面并完成重逢！',
    godHint: '在上帝视角下同时看清完整的宇航员小人与他穿过当前页留下的发光断面——他从未受伤，只是斜跨在两页空间之间！'
  }
]);
