/**
 * Pure 4D Geometry, Large-Arena Simulation & 8-Section Campaign Core for Chapter 2:
 * 《折页之间》——「离开画纸的人」
 *
 * Upgraded 8-Section Core Campaign (Old Sections 09–16 archived to
 * docs/design/chapter-2/sections-9-to-16-story-and-puzzle-draft.md):
 *  - Sec 01: 隔页的呼救 — 20m grand hall stationary-XYZ W-axis opacity shifting via Mouse Wheel
 *  - Sec 02: 六阶跨维天梯 — 20m chasm with 6 elevated stepping/jumping platforms (always-visible ghosts!)
 *  - Sec 03: 折页棱镜：四维光束谜题 — 3 co-located W-slices + 2 vertical W-Wells + 3 rotatable crystal prisms
 *  - Sec 04: 绝密玻璃牢笼 — 20m grand hall sealed 3D vault bypass along W
 *  - Sec 05: 四维多墙立体迷宫 — 5×5 multi-wall 3-slice 4D labyrinth (BFS-verified impossible in any single W slice!)
 *  - Sec 06: 四维吃豆 & 四维推箱子（7 关全集）— Replicates Bilibili BV1yY9AYxEGp?p=3 (3 Eat-Dots + 4 Sokoban levels)
 *  - Sec 07: 三环拓扑解链阵 — Brain-teasing dual-movable-ring + W-phase lock pillar topology unlinking puzzle
 *  - Sec 08: 手性反转：四维 XW 翻面锁 — Authentic 4D XW 180° rigid flip (X,Y,Z,0)→(−X,Y,Z,0) + 2D paper-cutout flip analogy
 */

export const CHAMBER_SIZE = 20.0;
export const CHAMBER_H = 7.6;
export const ARENA_HALF = 8.6;
export const INTERIOR_L = 9.0;
export const PLAYER_RADIUS = 0.34;
export const LAYER_W = Object.freeze([-1.8, 0.0, 1.8]);

export function dist4(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2], a[3] - b[3]);
}

export function isStrictlyInsideInterior(p, radius = PLAYER_RADIUS, L = INTERIOR_L) {
  const limit = L - radius;
  return (
    Math.abs(p[0]) < limit &&
    Math.abs(p[1]) < limit &&
    Math.abs(p[2]) < limit &&
    Math.abs(p[3]) < 2.6
  );
}

/** Formats a discrete 4D grid coordinate [x, y, z, w] as "(x,y,z,w)" */
export function formatCoord4D(coord4) {
  return `(${coord4[0]},${coord4[1]},${coord4[2]},${coord4[3]})`;
}

/** Smooth opacity clarity curve for co-located W slices */
export function phaseClarity(pw, targetW, span = 1.55) {
  const t = Math.max(0, 1 - Math.abs(pw - targetW) / span);
  return t * t * (3 - 2 * t);
}

/** Section 1 Cross-W Beacons (20m Grand Hall scale) */
export const STAGE1_BEACONS = Object.freeze([
  { id: 'w0', label: 'W = 0.0 青苍折页', pos: [0, 0, 0, 0.0], color: '#4de6d3' },
  { id: 'wp', label: 'W = +1.8 流金折页', pos: [-2.2, 0, 3.8, 1.8], color: '#f7c346' },
  { id: 'wm', label: 'W = −1.8 星轨折页', pos: [3.2, 0, 4.6, -1.8], color: '#58a6ff' }
]);

// ============================================================
// SECTION 02: Six-Step Elevated 4D Stepping & Jumping Chasm
// Fixes invisible cyan/star-rail bridge bug: every step ALWAYS has
// a bright holographic silhouette (ghostAlpha >= 0.34) and solidifies
// smoothly when the player scrolls to its W phase!
// ============================================================
export const SEC2_STEPS = Object.freeze([
  { id: 's1', index: 1, label: '一阶 · 青苍起点', x:  0.0, z: -6.8, y: 0.00, w: 4.8, d: 3.0, wTarget:  0.0, color: '#4de6d3' },
  { id: 's2', index: 2, label: '二阶 · 流金跃台', x:  2.2, z: -4.1, y: 0.55, w: 4.2, d: 2.8, wTarget:  1.8, color: '#f7c346' },
  { id: 's3', index: 3, label: '三阶 · 星轨悬台', x: -2.0, z: -1.4, y: 1.15, w: 4.2, d: 2.8, wTarget: -1.8, color: '#58a6ff' },
  { id: 's4', index: 4, label: '四阶 · 流金高阶', x:  2.1, z:  1.3, y: 1.80, w: 4.2, d: 2.8, wTarget:  1.8, color: '#f7c346' },
  { id: 's5', index: 5, label: '五阶 · 星轨云阶', x: -1.8, z:  4.0, y: 2.45, w: 4.2, d: 2.8, wTarget: -1.8, color: '#58a6ff' },
  { id: 's6', index: 6, label: '六阶 · 青苍顶台', x:  0.0, z:  6.9, y: 3.10, w: 5.4, d: 3.2, wTarget:  0.0, color: '#4de6d3' }
]);

export class SixStepAscentSimulation {
  constructor() {
    this.reset();
  }
  reset() {
    this.visited = new Set(['s1']);
    this.lastSafeStep = SEC2_STEPS[0];
    this.complete = false;
  }

  /** Always-visible platform opacity (>= 0.34 ghost, 1.0 when solidified in matching W slice) */
  stepVisualOpacity(step, pw) {
    const c = phaseClarity(pw, step.wTarget, 1.55);
    return 0.34 + 0.66 * c;
  }

  isStepSolid(step, pw) {
    return Math.abs(pw - step.wTarget) <= 0.72;
  }

  /** Returns supporting step if player (x, z, footY, pw) is over a solid platform at reachable height */
  findSupportingStep(x, z, footY, pw) {
    let best = null;
    for (const s of SEC2_STEPS) {
      if (!this.isStepSolid(s, pw)) continue;
      if (Math.abs(x - s.x) <= s.w * 0.5 + 0.24 && Math.abs(z - s.z) <= s.d * 0.5 + 0.24) {
        if (s.y <= footY + 0.42 && (!best || s.y > best.y)) {
          best = s;
        }
      }
    }
    return best;
  }

  recordLanding(step) {
    if (!step) return false;
    this.visited.add(step.id);
    this.lastSafeStep = step;
    if (step.id === 's6' && this.visited.size >= 4) {
      this.complete = true;
      return true;
    }
    return false;
  }
}

// ============================================================
// SECTION 03: 4D Phase-Prism Laser Relay (Brand-New Fun Theme!)
// 3 co-located W-slices connected by 2 vertical W-Axis Light Wells!
// Direction enum: 0 = +Z (North), 1 = +X (East), 2 = -Z (South), 3 = -X (West)
// ============================================================
export const PRISM_SPEC = Object.freeze({
  emitter: { x: 0.0, z: -7.2, w: 0.0, dir: 0 },
  wellA:   { x:  5.4, z: -3.4, fromW: 0.0, toW:  1.8 },
  wellB:   { x:  5.4, z:  4.2, fromW: 1.8, toW: -1.8 },
  receiver:{ x: -4.8, z:  4.2, w: -1.8 },
  // Solid titanium walls that make a purely 3D solution impossible in W=0 and W=+1.8
  walls: Object.freeze([
    { id: 'wallW0', w: 0.0, x: 0.0, z: 0.4, width: 15.2, depth: 0.65, height: 4.8 },
    { id: 'wallWP', w: 1.8, x: 0.0, z: 0.4, width: 0.65, depth: 15.2, height: 4.8 }
  ]),
  prisms: Object.freeze([
    { id: 'p1', label: '棱镜 ①（青苍 W=0）',   x: 0.0, z: -3.4, w:  0.0, startDir: 0, targetDir: 1 }, // Turn East (+X) -> Well A
    { id: 'p2', label: '棱镜 ②（流金 W=+1.8）', x: 5.4, z: -3.4, w:  1.8, startDir: 3, targetDir: 0 }, // Turn North (+Z) -> Well B
    { id: 'p3', label: '棱镜 ③（星轨 W=−1.8）', x: 5.4, z:  4.2, w: -1.8, startDir: 2, targetDir: 3 }  // Turn West (-X) -> Receiver
  ])
});

const DIR_VEC = Object.freeze([
  [0, 1],   // 0: North (+Z)
  [1, 0],   // 1: East  (+X)
  [0, -1],  // 2: South (-Z)
  [-1, 0]   // 3: West  (-X)
]);

export class PrismLaserSimulation {
  constructor() {
    this.reset();
  }

  reset() {
    this.dirs = PRISM_SPEC.prisms.map(p => p.startDir);
    this.complete = false;
    this.trace();
  }

  rotatePrism(index, delta = 1) {
    if (index < 0 || index >= this.dirs.length) return this.trace();
    this.dirs[index] = (this.dirs[index] + delta + 4) % 4;
    return this.trace();
  }

  nearestPrism(x, z, pw, maxDist = 2.8) {
    let bestIdx = -1;
    let bestD = Infinity;
    PRISM_SPEC.prisms.forEach((p, idx) => {
      if (Math.abs(pw - p.w) > 0.72) return;
      const d = Math.hypot(x - p.x, z - p.z);
      if (d < maxDist && d < bestD) {
        bestD = d;
        bestIdx = idx;
      }
    });
    return bestIdx;
  }

  /** Exact deterministic 3-slice laser circuit trace returning visible beam segments per W slice */
  trace() {
    const segments = [];
    const { emitter, wellA, wellB, receiver, prisms } = PRISM_SPEC;

    // Leg 0: South Emitter -> Prism 1 (always active in W = 0.0)
    segments.push({
      id: 'leg0',
      w: 0.0,
      from: [emitter.x, emitter.z],
      to: [prisms[0].x, prisms[0].z],
      aligned: true
    });

    // Leg 1: Prism 1 output in W = 0.0
    const d1 = this.dirs[0];
    const p1Aligned = d1 === prisms[0].targetDir; // East (+X) into Well A
    let leg1To;
    if (d1 === 0) leg1To = [prisms[0].x, 0.05];          // Blocked by wallW0 at Z=0.4!
    else if (d1 === 1) leg1To = [wellA.x, wellA.z];      // Hits W-Well A!
    else if (d1 === 2) leg1To = [emitter.x, emitter.z];  // Back to emitter
    else leg1To = [-8.2, prisms[0].z];                   // Hits west arena wall
    segments.push({
      id: 'leg1',
      w: 0.0,
      from: [prisms[0].x, prisms[0].z],
      to: leg1To,
      aligned: p1Aligned,
      blockedByWall: d1 === 0
    });

    const wellAActive = p1Aligned;
    let wellBActive = false;
    let receiverLit = false;

    // Leg 2: If W-Well A is energized, Prism 2 fires in W = +1.8
    if (wellAActive) {
      const d2 = this.dirs[1];
      const p2Aligned = d2 === prisms[1].targetDir; // North (+Z) into Well B
      let leg2To;
      if (d2 === 0) leg2To = [wellB.x, wellB.z];         // Hits W-Well B!
      else if (d2 === 3) leg2To = [0.35, prisms[1].z];   // Blocked by wallWP at X=0!
      else if (d2 === 1) leg2To = [8.4, prisms[1].z];    // Hits east arena wall
      else leg2To = [prisms[1].x, -8.2];                 // Hits south arena wall
      segments.push({
        id: 'leg2',
        w: 1.8,
        from: [prisms[1].x, prisms[1].z],
        to: leg2To,
        aligned: p2Aligned,
        blockedByWall: d2 === 3
      });
      wellBActive = p2Aligned;
    }

    // Leg 3: If W-Well B is energized, Prism 3 fires in W = -1.8
    if (wellBActive) {
      const d3 = this.dirs[2];
      const p3Aligned = d3 === prisms[2].targetDir; // West (-X) into Receiver!
      let leg3To;
      if (d3 === 3) leg3To = [receiver.x, receiver.z];
      else if (d3 === 0) leg3To = [prisms[2].x, 8.2];
      else if (d3 === 1) leg3To = [8.4, prisms[2].z];
      else leg3To = [prisms[2].x, -8.2];
      segments.push({
        id: 'leg3',
        w: -1.8,
        from: [prisms[2].x, prisms[2].z],
        to: leg3To,
        aligned: p3Aligned,
        blockedByWall: false
      });
      receiverLit = p3Aligned;
    }

    if (receiverLit) this.complete = true;
    return {
      segments,
      wellAActive,
      wellBActive,
      receiverLit,
      dirs: [...this.dirs],
      alignedCount: Number(wellAActive) + Number(wellBActive) + Number(receiverLit),
      complete: this.complete
    };
  }
}

// ============================================================
// SECTION 04: Sealed 3D Glass Vault in the 20m Grand Hall
// ============================================================
export const VAULT_SPEC = Object.freeze({
  halfSize: 3.1,      // 6.2m × 6.2m grand glass chamber at center!
  wallThickness: 0.24,
  wHalfThickness: 0.45,
  corePos: [0, 0, 0, 0],
  targetPedestal: [6.8, 0, 0, 0]
});

export function vaultWallCollides(p, radius = PLAYER_RADIUS, spec = VAULT_SPEC) {
  if (Math.abs(p[3]) >= spec.wHalfThickness + radius) return false;
  const H = spec.halfSize;
  const t = spec.wallThickness * 0.5 + radius;
  const ax = Math.abs(p[0]);
  const az = Math.abs(p[2]);
  const inXWall = Math.abs(ax - H) < t && az <= H + t;
  const inZWall = Math.abs(az - H) < t && ax <= H + t;
  return inXWall || inZWall;
}

export class VaultSimulation {
  constructor() {
    this.reset();
  }
  reset() {
    this.player = [-6.6, 0, -0.6, 0];
    this.carryingCore = false;
    this.coreDelivered = false;
    this.enteredVault = false;
  }
  move(delta4) {
    const next = [
      Math.max(-ARENA_HALF, Math.min(ARENA_HALF, this.player[0] + delta4[0])),
      0,
      Math.max(-ARENA_HALF, Math.min(ARENA_HALF, this.player[2] + delta4[2])),
      Math.max(-2.3, Math.min(2.3, this.player[3] + delta4[3]))
    ];
    if (vaultWallCollides(next)) {
      return { moved: false, blocked: true, player: [...this.player] };
    }
    this.player = next;
    if (Math.abs(next[0]) < VAULT_SPEC.halfSize - 0.5 && Math.abs(next[2]) < VAULT_SPEC.halfSize - 0.5) {
      this.enteredVault = true;
    }
    if (!this.carryingCore && !this.coreDelivered && dist4(next, VAULT_SPEC.corePos) < 1.5) {
      this.carryingCore = true;
    }
    if (this.carryingCore && dist4(next, VAULT_SPEC.targetPedestal) < 1.7) {
      this.carryingCore = false;
      this.coreDelivered = true;
    }
    return {
      moved: true,
      blocked: false,
      carryingCore: this.carryingCore,
      coreDelivered: this.coreDelivered,
      player: [...this.player]
    };
  }
}

// ============================================================
// SECTION 05: 5×5 Multi-Wall 3-Slice 4D Hyper-Maze (20m Hall!)
// BFS-verified: UNSOLVABLE in W=-1.8 alone, UNSOLVABLE in W=0 alone,
// UNSOLVABLE in W=+1.8 alone — MUST weave across all 3 W-slices!
// Grid coords: col ∈ [0..4] (X), row ∈ [0..4] (Z), slice ∈ {0:-1.8, 1:0.0, 2:+1.8}
// ============================================================
export const MAZE4D_SPEC = Object.freeze({
  cols: 5,
  rows: 5,
  cellSize: 3.4,   // 5 × 3.4m = 17.0m × 17.0m grand labyrinth inside 20m hall!
  wallThickness: 0.34,
  sliceW: Object.freeze([-1.8, 0.0, 1.8]),
  startCell: Object.freeze([0, 0, 1]),      // SW corner in W=0.0
  exitCell:  Object.freeze([4, 4, 1]),      // NE corner in W=0.0
  beacons: Object.freeze([
    { id: 'b1', label: '流金相位信标 ①', col: 2, row: 2, slice: 2, w:  1.8, color: '#f7c346' },
    { id: 'b2', label: '星轨相位信标 ②', col: 1, row: 4, slice: 0, w: -1.8, color: '#58a6ff' }
  ]),
  // Vertical walls between (col, row) and (col+1, row): [col, row]
  // Horizontal walls between (col, row) and (col, row+1): [col, row]
  slices: Object.freeze([
    // Slice 0: W = -1.8 (星轨折页) — open vertical spine on col 1 & north bridge on row 4, blocked on south & east!
    {
      w: -1.8,
      color: '#58a6ff',
      vWalls: [
        [0, 0], [0, 1], [0, 2], [0, 3],
        [1, 0], [1, 1], [1, 2],
        [2, 0], [2, 1], [2, 3], [2, 4],
        [3, 1], [3, 2], [3, 3], [3, 4]
      ],
      hWalls: [
        [0, 1], [1, 0], [2, 1], [3, 0], [4, 1],
        [0, 3], [2, 2], [3, 2], [4, 3]
      ]
    },
    // Slice 1: W = 0.0 (青苍折页) — start at (0,0), exit at (4,4), sealed mid-divider across entire hall!
    {
      w: 0.0,
      color: '#4de6d3',
      vWalls: [
        [1, 0], [1, 1],
        [2, 0], [2, 1], [2, 2], [2, 3], [2, 4], // Complete N-S curtain blocking direct X crossing!
        [0, 2], [0, 3],
        [3, 1], [3, 2], [3, 3]
      ],
      hWalls: [
        [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], // Complete E-W curtain isolating South from North!
        [1, 3], [3, 3], [4, 2]
      ]
    },
    // Slice 2: W = +1.8 (流金折页) — opens central crossing into (2,2) & east corridor to (4,3), blocked at (4,4) exit!
    {
      w: 1.8,
      color: '#f7c346',
      vWalls: [
        [0, 0], [0, 2], [0, 4],
        [1, 1], [1, 3], [1, 4],
        [2, 0], [2, 3], [2, 4],
        [3, 0], [3, 1], [3, 3]
      ],
      hWalls: [
        [0, 0], [1, 0], [3, 1],
        [1, 2], [2, 2], [3, 2],
        [0, 3], [2, 3], [4, 3] // Blocks direct entry to (4,4) in W=+1.8 -> must shift to W=0!
      ]
    }
  ])
});

export function mazeCellCenter(col, row) {
  const half = ((MAZE4D_SPEC.cols - 1) * MAZE4D_SPEC.cellSize) * 0.5;
  return [col * MAZE4D_SPEC.cellSize - half, row * MAZE4D_SPEC.cellSize - half];
}

export class HyperMaze4DSimulation {
  constructor() {
    this.wallBoxes = MAZE4D_SPEC.slices.map((sl, sIdx) => {
      const cs = MAZE4D_SPEC.cellSize;
      const halfGrid = (MAZE4D_SPEC.cols * cs) * 0.5;
      const t = MAZE4D_SPEC.wallThickness;
      const boxes = [];
      for (const [c, r] of sl.vWalls) {
        const x = -halfGrid + (c + 1) * cs;
        const z = -halfGrid + (r + 0.5) * cs;
        boxes.push({ slice: sIdx, w: sl.w, x, z, sx: t, sz: cs + t * 0.4, color: sl.color });
      }
      for (const [c, r] of sl.hWalls) {
        const x = -halfGrid + (c + 0.5) * cs;
        const z = -halfGrid + (r + 1) * cs;
        boxes.push({ slice: sIdx, w: sl.w, x, z, sx: cs + t * 0.4, sz: t, color: sl.color });
      }
      return boxes;
    });
    this.reset();
  }

  reset() {
    this.beaconsFound = new Set();
    this.complete = false;
  }

  /** Checks continuous 4D collision against maze walls whose W slice is currently materialized (|pw - wall.w| < 0.72) */
  collides(x, z, pw, radius = PLAYER_RADIUS) {
    for (let s = 0; s < this.wallBoxes.length; s++) {
      if (Math.abs(pw - MAZE4D_SPEC.sliceW[s]) > 0.72) continue;
      for (const b of this.wallBoxes[s]) {
        if (Math.abs(x - b.x) < b.sx * 0.5 + radius && Math.abs(z - b.z) < b.sz * 0.5 + radius) {
          return b;
        }
      }
    }
    return null;
  }

  updateProgress(x, z, pw) {
    let newlyFound = null;
    for (const b of MAZE4D_SPEC.beacons) {
      if (this.beaconsFound.has(b.id)) continue;
      if (Math.abs(pw - b.w) < 0.65) {
        const [bx, bz] = mazeCellCenter(b.col, b.row);
        if (Math.hypot(x - bx, z - bz) < 1.35) {
          this.beaconsFound.add(b.id);
          newlyFound = b;
        }
      }
    }
    const [ex, ez] = mazeCellCenter(MAZE4D_SPEC.exitCell[0], MAZE4D_SPEC.exitCell[1]);
    if (this.beaconsFound.size === MAZE4D_SPEC.beacons.length && Math.abs(pw) < 0.65 && Math.hypot(x - ex, z - ez) < 1.55) {
      this.complete = true;
    }
    return { newlyFound, beaconsCount: this.beaconsFound.size, complete: this.complete };
  }

  /** Discrete BFS path verification (pass allowedSlices=[s] to prove 3D unsolvability, or [0,1,2] for 4D solvability) */
  findCellPath(fromCell, toCell, allowedSlices = [0, 1, 2]) {
    const allowSet = new Set(allowedSlices);
    if (!allowSet.has(fromCell[2]) || !allowSet.has(toCell[2])) return null;
    const vSets = MAZE4D_SPEC.slices.map(s => new Set(s.vWalls.map(w => `${w[0]},${w[1]}`)));
    const hSets = MAZE4D_SPEC.slices.map(s => new Set(s.hWalls.map(w => `${w[0]},${w[1]}`)));
    const key = ([c, r, s]) => `${c},${r},${s}`;
    const q = [fromCell];
    const prev = new Map([[key(fromCell), null]]);
    const targetKey = key(toCell);

    while (q.length) {
      const cur = q.shift();
      const ck = key(cur);
      if (ck === targetKey) {
        const out = [];
        let k = ck;
        while (k) {
          out.push(k.split(',').map(Number));
          k = prev.get(k);
        }
        return out.reverse();
      }
      const [c, r, s] = cur;
      const neighbors = [];
      if (c + 1 < MAZE4D_SPEC.cols && !vSets[s].has(`${c},${r}`)) neighbors.push([c + 1, r, s]);
      if (c - 1 >= 0 && !vSets[s].has(`${c - 1},${r}`)) neighbors.push([c - 1, r, s]);
      if (r + 1 < MAZE4D_SPEC.rows && !hSets[s].has(`${c},${r}`)) neighbors.push([c, r + 1, s]);
      if (r - 1 >= 0 && !hSets[s].has(`${c},${r - 1}`)) neighbors.push([c, r - 1, s]);
      // W-axis scroll step to adjacent slice
      if (s + 1 <= 2 && allowSet.has(s + 1)) neighbors.push([c, r, s + 1]);
      if (s - 1 >= 0 && allowSet.has(s - 1)) neighbors.push([c, r, s - 1]);

      for (const n of neighbors) {
        const nk = key(n);
        if (!prev.has(nk)) {
          prev.set(nk, ck);
          q.push(n);
        }
      }
    }
    return null;
  }
}

// ============================================================
// SECTION 06: 7-Level 4D Eat-Dots & 4D Sokoban Arcade
// Faithfully modeled after Bilibili BV1yY9AYxEGp?p=3 (小资租《修改音效并新增一关》)
// + user's attached screenshots (image_2.png & image.png)!
// Controls: WASD (plane), Space (+Z up), Ctrl/Shift (-Z down), Mouse Wheel (W±1),
//           Mouse Drag (3D camera orbit), X (XYZ ⇄ XYW basis), Z (Undo)
// ============================================================
function makeGridWalls(list) {
  return Object.freeze(list.map(c => Object.freeze([...c])));
}

export const ARCADE_4D_LEVELS = Object.freeze([
  // 1. 吃豆 第1关 (0:26–0:35) — 4×4×1×4 (Z=1), modeled after image_2.png!
  {
    id: 'pac1',
    mode: 'eat',
    badge: '吃豆 1',
    title: '吃豆 · 第一关（0:26–0:35 · 4×4×1×4）',
    subtitle: '平层四维吃豆入门：WASD 走平面 + 鼠标滚轮切 W=1..4',
    tip: '窍门：Z 只有 1 层，直接用 WASD 移动 + 滚轮在 W=1→2→3→4 之间绕开白墙吃掉全部 5 颗能量豆！',
    dims: [4, 4, 1, 4],
    playerStart: [1, 1, 1, 1],
    walls: makeGridWalls([
      // W=1 (mirrors image_2.png front-left open L-corridor, blocked core)
      [2, 2, 1, 1], [3, 2, 1, 1], [4, 2, 1, 1],
      [1, 3, 1, 1], [2, 3, 1, 1], [3, 3, 1, 1], [4, 3, 1, 1],
      [1, 4, 1, 1], [2, 4, 1, 1], [3, 4, 1, 1],
      // W=2 (mirrors image_2.png upper-right corridor open)
      [1, 3, 1, 2], [2, 3, 1, 2], [3, 3, 1, 2],
      [1, 4, 1, 2], [2, 4, 1, 2], [4, 1, 1, 2],
      // W=3 (mirrors image_2.png hollow ring perimeter)
      [1, 2, 1, 3], [1, 3, 1, 3], [1, 4, 1, 3],
      [2, 4, 1, 3], [3, 4, 1, 3], [4, 2, 1, 3], [4, 3, 1, 3],
      // W=4 (mirrors image_2.png goal pocket around (1,1,1,4))
      [2, 1, 1, 4], [2, 2, 1, 4], [3, 2, 1, 4], [4, 2, 1, 4],
      [1, 3, 1, 4], [2, 3, 1, 4], [3, 3, 1, 4], [4, 4, 1, 4]
    ]),
    dots: makeGridWalls([
      [4, 1, 1, 1],
      [3, 2, 1, 2],
      [2, 2, 1, 3],
      [3, 3, 1, 3],
      [1, 1, 1, 4]
    ]),
    boxes: [],
    targets: []
  },
  // 2. 吃豆 第2关 (0:36–1:02) — 4×4×2×3 (Z∈{1,2}), introduces Space (+Z) & Ctrl/Shift (-Z)!
  {
    id: 'pac2',
    mode: 'eat',
    badge: '吃豆 2',
    title: '吃豆 · 第二关（0:36–1:02 · 4×4×2×3）',
    subtitle: '加入垂直上下维度：Space 升至 Z=2、Ctrl/Shift 降至 Z=1',
    tip: '窍门：遇到平面死墙时，试试按 Space 飞上 Z=2 二层，或滚轮切到相邻 W 切片再下来吃豆！',
    dims: [4, 4, 2, 3],
    playerStart: [1, 1, 1, 1],
    walls: makeGridWalls([
      // W=1 Z=1
      [2, 1, 1, 1], [2, 2, 1, 1], [3, 3, 1, 1], [4, 2, 1, 1],
      // W=1 Z=2
      [1, 2, 2, 1], [2, 3, 2, 1], [3, 2, 2, 1], [4, 4, 2, 1],
      // W=2 Z=1
      [1, 1, 1, 2], [1, 3, 1, 2], [2, 3, 1, 2], [3, 1, 1, 2], [4, 3, 1, 2],
      // W=2 Z=2
      [2, 1, 2, 2], [3, 3, 2, 2], [4, 1, 2, 2],
      // W=3 Z=1
      [1, 2, 1, 3], [2, 2, 1, 3], [3, 2, 1, 3], [3, 4, 1, 3],
      // W=3 Z=2
      [1, 3, 2, 3], [2, 4, 2, 3], [4, 2, 2, 3]
    ]),
    dots: makeGridWalls([
      [1, 4, 1, 1],
      [4, 1, 2, 1],
      [2, 2, 2, 2],
      [4, 4, 1, 2],
      [1, 1, 2, 3],
      [4, 4, 2, 3]
    ]),
    boxes: [],
    targets: []
  },
  // 3. 吃豆 第3关 (1:03–1:28) — Full 4×4×2×4 mirroring image.png (01:05: start (3,1,2,1), end (3,4,2,4))!
  {
    id: 'pac3',
    mode: 'eat',
    badge: '吃豆 3',
    title: '吃豆 · 第三关（1:03–1:28 · 4×4×2×4）',
    subtitle: '双层四维迷宫全开：起点 (3,1,2,1) 紫晶 → 终点 (3,4,2,4) 绿晶',
    tip: '窍门：这就是参考图中的 4×4×2×4 双层四维迷宫！按 X 可随时切换 XYZ ⇄ XYW 观察跨维通道！',
    dims: [4, 4, 2, 4],
    playerStart: [3, 1, 2, 1],
    walls: makeGridWalls([
      // W=1
      [1, 1, 1, 1], [2, 1, 1, 1], [1, 2, 1, 1], [2, 2, 1, 1], [3, 2, 1, 1], [4, 2, 1, 1],
      [1, 3, 1, 1], [2, 3, 1, 1], [4, 3, 1, 1],
      [1, 1, 2, 1], [2, 2, 2, 1], [3, 2, 2, 1], [1, 3, 2, 1], [2, 3, 2, 1],
      // W=2
      [1, 2, 1, 2], [2, 2, 1, 2], [3, 3, 1, 2], [4, 3, 1, 2], [2, 4, 1, 2],
      [1, 1, 2, 2], [2, 2, 2, 2], [3, 1, 2, 2], [4, 2, 2, 2], [2, 3, 2, 2],
      // W=3
      [1, 1, 1, 3], [3, 1, 1, 3], [2, 3, 1, 3], [4, 2, 1, 3], [1, 4, 1, 3],
      [2, 1, 2, 3], [1, 3, 2, 3], [3, 3, 2, 3], [4, 4, 2, 3],
      // W=4
      [1, 1, 1, 4], [2, 1, 1, 4], [4, 1, 1, 4], [1, 3, 1, 4], [2, 3, 1, 4], [4, 3, 1, 4],
      [1, 2, 2, 4], [2, 2, 2, 4], [4, 2, 2, 4], [1, 4, 2, 4], [2, 4, 2, 4]
    ]),
    dots: makeGridWalls([
      [4, 4, 2, 1],
      [1, 4, 1, 1],
      [4, 1, 1, 2],
      [3, 4, 2, 2],
      [2, 2, 1, 3],
      [4, 1, 2, 3],
      [3, 2, 1, 4],
      [3, 4, 2, 4]
    ]),
    boxes: [],
    targets: []
  },
  // 4. 推箱子 第1关 (1:35–1:43) — 4×4×1×3 Tutorial: Push crate along +W via Mouse Wheel!
  {
    id: 'soko1',
    mode: 'sokoban',
    badge: '推箱 1',
    title: '推箱子 · 第一关（1:35–1:43 · 4×4×1×3）',
    subtitle: '四维推箱核心课：在 W=1 对准箱子同位坐标，向上滚轮沿 W+ 推入 W=3！',
    tip: '窍门：箱子在 W=2 被三维围墙卡死！滚轮退到 W=1 站到 (2,2,1,1)，再向上滚轮推箱子跨入 W=3，最后推到金色目标格！',
    dims: [4, 4, 1, 3],
    playerStart: [1, 2, 1, 2],
    walls: makeGridWalls([
      // W=2 surrounds crate at (2,2,1,2) on +X and +Y walls!
      [3, 2, 1, 2], [2, 3, 1, 2], [3, 3, 1, 2], [1, 4, 1, 2], [4, 1, 1, 2],
      // W=1 light walls leaving (2,2,1,1) easily reachable
      [3, 1, 1, 1], [3, 3, 1, 1], [4, 3, 1, 1],
      // W=3 corridor leading to (3,3,1,3)
      [1, 1, 1, 3], [1, 3, 1, 3], [4, 4, 1, 3]
    ]),
    dots: [],
    boxes: makeGridWalls([[2, 2, 1, 2]]),
    targets: makeGridWalls([[3, 3, 1, 3]])
  },
  // 5. 推箱子 第2关 (1:44–2:21) — 4×4×3×4 Single crate: cross-W escape + Ctrl duck underneath & Space push +Z up to Z=3!
  {
    id: 'soko2',
    mode: 'sokoban',
    badge: '推箱 2',
    title: '推箱子 · 第二关（1:44–2:21 · 4×4×3×4）',
    subtitle: '立体四维推箱：跨 W 推箱破三维死角 + Ctrl 钻入箱底按 Space 顶上 Z=3！',
    tip: '窍门：先在 W=2 把箱子沿 W+ 推入 W=4 脱离墙角，再按 Ctrl/Shift 降到箱子正下方的 Z=1，按 Space 把箱子向上顶进 Z=3 目标台！',
    dims: [4, 4, 3, 4],
    playerStart: [1, 2, 2, 3],
    walls: makeGridWalls([
      // W=3 locks (3,2,2,3) on +X and +Y so 3D cannot reach target
      [4, 2, 2, 3], [3, 3, 2, 3], [4, 3, 2, 3], [2, 4, 2, 3],
      // W=2 light landmarks leaving (2,2,2,2) and (3,2,2,2) clear
      [1, 4, 2, 2], [4, 1, 2, 2],
      // W=4 open hall with Z=1 under-space so player can duck under & push +Z!
      [1, 1, 2, 4], [2, 1, 2, 4], [4, 3, 2, 4]
    ]),
    dots: [],
    boxes: makeGridWalls([[2, 2, 2, 3]]),
    targets: makeGridWalls([[3, 4, 3, 4]])
  },
  // 6. 推箱子 第3关 (2:23–2:56) — 4×4×2×4 Dual-Crate 4D Cooperation across Z=1, Z=2 & W=1..4!
  {
    id: 'soko3',
    mode: 'sokoban',
    badge: '推箱 3',
    title: '推箱子 · 第三关（2:23–2:56 · 4×4×2×4）',
    subtitle: '双箱联动四维推箱：Z=1 与 Z=2 两枚能量箱跨 W 切片协调归位',
    tip: '窍门：两只箱子分处 Z=1 与 Z=2！用 Space/Ctrl 切换高度，分别用滚轮沿 W 轴绕开障碍把两只箱子推入金色目标格！',
    dims: [4, 4, 2, 4],
    playerStart: [1, 2, 1, 2],
    walls: makeGridWalls([
      [3, 1, 1, 2], [3, 2, 1, 2], [2, 4, 1, 2],
      [1, 3, 1, 3], [4, 2, 1, 3],
      [1, 1, 1, 4], [4, 4, 1, 4],
      [1, 1, 2, 3], [4, 3, 2, 3], [2, 2, 2, 2]
    ]),
    dots: [],
    boxes: makeGridWalls([[2, 2, 1, 2], [2, 3, 2, 3]]),
    targets: makeGridWalls([[3, 3, 1, 4], [3, 4, 2, 2]])
  },
  // 7. 推箱子 第4关（最终关 · 3:10–结尾）— Streamlined reduced-obstacle finale per user request: key trick is pushing along +W!
  {
    id: 'soko4',
    mode: 'sokoban',
    badge: '推箱 终关',
    title: '推箱子 · 最终关（3:10–结尾 · 精简版 4×4×2×4）',
    subtitle: '精简障碍版终极关：破解三维四面围墙的唯一窍门是「沿 W 轴推箱子」！',
    tip: '通关窍门：箱子在 W=2 被四面三维白墙彻底封死，三维里动弹不得！只需滚轮切到 W=1 站到同位坐标 (2,2,2,1)，再向上滚轮沿 W+ 直接把箱子推出围墙到 W=4，轻松送进 (3,4,2,4)！',
    dims: [4, 4, 2, 4],
    playerStart: [1, 1, 2, 1],
    walls: makeGridWalls([
      // W=2: crystal-clear 4-sided 3D cage around (2,2,2,2) -> IMPOSSIBLE in 3D, trivial via +W push!
      [1, 2, 2, 2], [3, 2, 2, 2], [2, 1, 2, 2], [2, 3, 2, 2],
      // W=1: wide-open launch pad to line up at (2,2,2,1)
      [4, 4, 1, 1],
      // W=3: single sleek pillar guiding crate through to W=4
      [3, 2, 2, 3], [1, 4, 2, 3],
      // W=4: open landing hall straight to (3,4,2,4)
      [1, 1, 2, 4], [4, 2, 2, 4]
    ]),
    dots: [],
    boxes: makeGridWalls([[2, 2, 2, 2]]),
    targets: makeGridWalls([[3, 4, 2, 4]])
  }
]);

export class HyperGridArcadeSimulation {
  constructor(levelId = 'pac1') {
    this.completedLevels = new Set();
    this.loadLevel(levelId);
  }

  loadLevel(levelId) {
    const idx = ARCADE_4D_LEVELS.findIndex(l => l.id === levelId);
    this.levelIndex = idx >= 0 ? idx : 0;
    this.spec = ARCADE_4D_LEVELS[this.levelIndex];
    this.dims = [...this.spec.dims];
    this.wallSet = new Set(this.spec.walls.map(c => c.join(',')));
    this.basisMode = 'XYZ';
    this.reset();
    return this.spec;
  }

  reset() {
    this.player = [...this.spec.playerStart];
    this.boxes = this.spec.boxes.map(b => [...b]);
    this.targets = this.spec.targets.map(t => [...t]);
    this.dotsRemaining = new Set(this.spec.dots.map(d => d.join(',')));
    this.moves = 0;
    this.crossWPushes = 0;
    this.basisSwaps = 0;
    this.history = [];
    this.complete = false;
  }

  inBounds(c) {
    return (
      c[0] >= 1 && c[0] <= this.dims[0] &&
      c[1] >= 1 && c[1] <= this.dims[1] &&
      c[2] >= 1 && c[2] <= this.dims[2] &&
      c[3] >= 1 && c[3] <= this.dims[3]
    );
  }

  isWall(c) {
    return this.wallSet.has(c.join(','));
  }

  boxIndexAt(c) {
    return this.boxes.findIndex(b => b[0] === c[0] && b[1] === c[1] && b[2] === c[2] && b[3] === c[3]);
  }

  toggleBasisMode() {
    this.basisMode = this.basisMode === 'XYZ' ? 'XYW' : 'XYZ';
    this.basisSwaps++;
    return this.basisMode;
  }

  projectCell(coord4) {
    if (this.basisMode === 'XYZ') {
      return { sliceAxis: 'W', sliceIndex: coord4[3], localX: coord4[0], localY: coord4[1], localZ: coord4[2] };
    }
    return { sliceAxis: 'Z', sliceIndex: coord4[2], localX: coord4[0], localY: coord4[1], localZ: coord4[3] };
  }

  _checkWin() {
    if (this.spec.mode === 'eat') {
      this.complete = this.dotsRemaining.size === 0;
    } else {
      const targetKeys = new Set(this.targets.map(t => t.join(',')));
      this.complete = this.boxes.length > 0 && this.boxes.every(b => targetKeys.has(b.join(',')));
    }
    if (this.complete) this.completedLevels.add(this.spec.id);
    return this.complete;
  }

  step(dx, dy, dz, dw) {
    const next = [this.player[0] + dx, this.player[1] + dy, this.player[2] + dz, this.player[3] + dw];
    if (!this.inBounds(next) || this.isWall(next)) {
      return { moved: false, blocked: true, pushed: false, ateDot: false, complete: this.complete };
    }

    const bIdx = this.boxIndexAt(next);
    if (bIdx >= 0) {
      const boxNext = [next[0] + dx, next[1] + dy, next[2] + dz, next[3] + dw];
      if (!this.inBounds(boxNext) || this.isWall(boxNext) || this.boxIndexAt(boxNext) >= 0) {
        return { moved: false, blocked: true, pushed: false, ateDot: false, complete: this.complete };
      }
      this.history.push({
        player: [...this.player],
        boxes: this.boxes.map(b => [...b]),
        dots: new Set(this.dotsRemaining),
        moves: this.moves,
        crossWPushes: this.crossWPushes
      });
      this.boxes[bIdx] = boxNext;
      this.player = next;
      this.moves++;
      const crossWPush = dw !== 0;
      if (crossWPush) this.crossWPushes++;
      this._checkWin();
      return { moved: true, blocked: false, pushed: true, crossWPush, ateDot: false, complete: this.complete };
    }

    this.history.push({
      player: [...this.player],
      boxes: this.boxes.map(b => [...b]),
      dots: new Set(this.dotsRemaining),
      moves: this.moves,
      crossWPushes: this.crossWPushes
    });
    this.player = next;
    this.moves++;
    const nk = next.join(',');
    const ateDot = this.dotsRemaining.delete(nk);
    this._checkWin();
    return { moved: true, blocked: false, pushed: false, crossWPush: false, ateDot, complete: this.complete };
  }

  undo() {
    if (!this.history.length) return false;
    const prev = this.history.pop();
    this.player = prev.player;
    this.boxes = prev.boxes;
    this.dotsRemaining = prev.dots;
    this.moves = prev.moves;
    this.crossWPushes = prev.crossWPushes;
    this.complete = false;
    return true;
  }

  /** Fast deterministic solver (shortest next-dot BFS for eat-dots; state-space BFS for 1–2 box Sokoban) */
  findNextStepMove() {
    if (this.complete) return null;
    const dirs = [
      [1, 0, 0, 0], [-1, 0, 0, 0],
      [0, 1, 0, 0], [0, -1, 0, 0],
      [0, 0, 1, 0], [0, 0, -1, 0],
      [0, 0, 0, 1], [0, 0, 0, -1]
    ];

    if (this.spec.mode === 'eat') {
      const startKey = this.player.join(',');
      const q = [{ pos: [...this.player], firstDir: null }];
      const seen = new Set([startKey]);
      while (q.length) {
        const cur = q.shift();
        for (const d of dirs) {
          const nxt = [cur.pos[0] + d[0], cur.pos[1] + d[1], cur.pos[2] + d[2], cur.pos[3] + d[3]];
          if (!this.inBounds(nxt) || this.isWall(nxt)) continue;
          const k = nxt.join(',');
          if (seen.has(k)) continue;
          const first = cur.firstDir || d;
          if (this.dotsRemaining.has(k)) return first;
          seen.add(k);
          q.push({ pos: nxt, firstDir: first });
        }
      }
      return null;
    }

    // Fast bucketed A* Sokoban solver (solves 1-box & 2-box 4D puzzles in <15ms!)
    const targets = this.targets;
    const targetKeys = new Set(targets.map(t => t.join(',')));
    const heuristic = (p, bs) => {
      let h = 0;
      for (const b of bs) {
        let best = Infinity;
        for (const t of targets) {
          const d = Math.abs(b[0] - t[0]) + Math.abs(b[1] - t[1]) + Math.abs(b[2] - t[2]) + Math.abs(b[3] - t[3]);
          if (d < best) best = d;
        }
        h += best * 3;
      }
      // Small tie-breaker toward nearest unplaced box
      let minP = Infinity;
      for (const b of bs) {
        if (targetKeys.has(b.join(','))) continue;
        const dp = Math.abs(p[0] - b[0]) + Math.abs(p[1] - b[1]) + Math.abs(p[2] - b[2]) + Math.abs(p[3] - b[3]);
        if (dp < minP) minP = dp;
      }
      return h + (Number.isFinite(minP) ? minP : 0);
    };

    const stateKey = (p, bs) => p.join(',') + '|' + bs.map(b => b.join(',')).sort().join(';');
    const buckets = new Map();
    const pushBucket = (score, item) => {
      if (!buckets.has(score)) buckets.set(score, []);
      buckets.get(score).push(item);
    };
    let minScore = heuristic(this.player, this.boxes);
    pushBucket(minScore, { p: [...this.player], bs: this.boxes.map(b => [...b]), g: 0, firstDir: null });
    const seen = new Set([stateKey(this.player, this.boxes)]);
    let visitedCount = 0;
    const maxNodes = 40000;

    while (buckets.size > 0 && visitedCount++ < maxNodes) {
      while (!buckets.has(minScore) && buckets.size > 0) minScore++;
      const list = buckets.get(minScore);
      if (!list || !list.length) { buckets.delete(minScore); continue; }
      const cur = list.pop();
      if (!list.length) buckets.delete(minScore);

      for (const d of dirs) {
        const np = [cur.p[0] + d[0], cur.p[1] + d[1], cur.p[2] + d[2], cur.p[3] + d[3]];
        if (!this.inBounds(np) || this.isWall(np)) continue;
        const bIdx = cur.bs.findIndex(b => b[0] === np[0] && b[1] === np[1] && b[2] === np[2] && b[3] === np[3]);
        let nbs = cur.bs;
        if (bIdx >= 0) {
          const nb = [np[0] + d[0], np[1] + d[1], np[2] + d[2], np[3] + d[3]];
          if (!this.inBounds(nb) || this.isWall(nb)) continue;
          if (cur.bs.some((b, i) => i !== bIdx && b[0] === nb[0] && b[1] === nb[1] && b[2] === nb[2] && b[3] === nb[3])) continue;
          nbs = cur.bs.map((b, i) => (i === bIdx ? nb : b));
        }
        const first = cur.firstDir || d;
        if (nbs.every(b => targetKeys.has(b.join(',')))) return first;
        const sk = stateKey(np, nbs);
        if (!seen.has(sk)) {
          seen.add(sk);
          const ng = cur.g + 1;
          const sc = ng + heuristic(np, nbs);
          if (sc < minScore) minScore = sc;
          pushBucket(sc, { p: np, bs: nbs, g: ng, firstDir: first });
        }
      }
    }
    return null;
  }

  autoSolve(maxSteps = 220) {
    let steps = 0;
    while (!this.complete && steps < maxSteps) {
      const mv = this.findNextStepMove();
      if (!mv) break;
      this.step(mv[0], mv[1], mv[2], mv[3]);
      steps++;
    }
    return { complete: this.complete, steps, moves: this.moves, crossWPushes: this.crossWPushes };
  }
}

export const Sokoban4DSimulation = HyperGridArcadeSimulation;
export const FourDSokobanSimulation = HyperGridArcadeSimulation;

// ============================================================
// SECTION 07: Brain-Teasing Triple-Ring 4D Topology Unlinking Puzzle
// Central fixed Cyan Ring A (x=0, w=0) interlocked with TWO movable rings:
//  - Golden Ring B (starts x=+0.65, w=0 -> dock at x=+5.4, w=0)
//  - Violet Ring C (starts x=-0.65, w=0 -> dock at x=-5.4, w=0)
// Brain-teaser Phase Lock Pillars:
//  - Right Phase Pillar sits at W > +0.65, X ∈ [1.8, 3.8] -> blocks Ring B in W=+1.8!
//    (Ring B MUST shift to W=-1.8 to bypass Ring A & Right Pillar, then return to W=0!)
//  - Left Phase Pillar sits at W < -0.65, X ∈ [-3.8, -1.8] -> blocks Ring C in W=-1.8!
//    (Ring C MUST shift to W=+1.8 to bypass Ring A & Left Pillar, then return to W=0!)
//  - Mutual Interlock: Rings B & C also block each other near center if |wB - wC| < 0.7!
// ============================================================
export const TRIPLE_RING_SPEC = Object.freeze({
  anchorX: 0.0,
  anchorW: 0.0,
  ringRadius: 1.9,
  startB: { x:  0.65, w: 0.0, dockX:  5.6, dockW: 0.0 },
  startC: { x: -0.65, w: 0.0, dockX: -5.6, dockW: 0.0 },
  pillarRight: { xMin:  1.75, xMax:  3.85, wMin:  0.65, wMax:  2.5 }, // Blocks W=+1.8 on right!
  pillarLeft:  { xMin: -3.85, xMax: -1.75, wMin: -2.5,  wMax: -0.65 } // Blocks W=-1.8 on left!
});

export class TripleRingUnlinkSimulation {
  constructor() {
    this.reset();
  }

  reset() {
    this.activeRing = 'B'; // 'B' (Gold) or 'C' (Violet)
    this.ringB = { x: TRIPLE_RING_SPEC.startB.x, w: TRIPLE_RING_SPEC.startB.w, docked: false, freed: false };
    this.ringC = { x: TRIPLE_RING_SPEC.startC.x, w: TRIPLE_RING_SPEC.startC.w, docked: false, freed: false };
    this.complete = false;
  }

  selectRing(which) {
    if (which === 'B' || which === 'C') this.activeRing = which;
    return this.activeRing;
  }

  _checkBlocked(which, nx, nw) {
    const other = which === 'B' ? this.ringC : this.ringB;
    const { pillarRight, pillarLeft } = TRIPLE_RING_SPEC;

    // 1. Interlock with fixed Cyan Anchor Ring A (at x=0, w=0):
    // Crossing the rim of Ring A (|x| between 1.25 and 2.55) requires |w| >= 0.95!
    const curX = which === 'B' ? this.ringB.x : this.ringC.x;
    const crossesAnchorRim =
      (Math.abs(nx) >= 1.25 && Math.abs(nx) <= 2.65) ||
      (Math.abs(curX) < 1.25 && Math.abs(nx) > 2.65) ||
      (Math.abs(curX) > 2.65 && Math.abs(nx) < 1.25);
    if (crossesAnchorRim && Math.abs(nw) < 0.95) {
      return { blocked: true, reason: 'anchor', message: '在 W=0 与青色母环死扣卡住了！先用滚轮把环沿 W 轴错开相位！' };
    }

    // 2. Mutual interlock between Ring B & Ring C near center (|nx - other.x| < 1.95 requires |nw - other.w| >= 0.65 when crossing)
    if (Math.abs(nx - other.x) < 1.05 && Math.abs(nw - other.w) < 0.65) {
      return { blocked: true, reason: 'mutual', message: '流金环与星紫环在当前 W 相位互相顶住了！先将另一枚环错开到相反 W 折页！' };
    }

    // 3. W-Phase Lock Pillars (the brain-teaser twist!)
    if (nx >= pillarRight.xMin && nx <= pillarRight.xMax && nw >= pillarRight.wMin && nw <= pillarRight.wMax) {
      return { blocked: true, reason: 'pillarRight', message: 'W=+1.8 右侧存在赤红相位锁柱挡路！反向滚动滚轮至 W=−1.8 星轨折页即可绕过！' };
    }
    if (nx >= pillarLeft.xMin && nx <= pillarLeft.xMax && nw >= pillarLeft.wMin && nw <= pillarLeft.wMax) {
      return { blocked: true, reason: 'pillarLeft', message: 'W=−1.8 左侧存在星蓝相位锁柱挡路！滚动滚轮至 W=+1.8 流金折页即可绕过！' };
    }

    return { blocked: false, reason: null, message: '' };
  }

  moveActive(dx, dw) {
    const r = this.activeRing === 'B' ? this.ringB : this.ringC;
    const nx = Math.max(-7.2, Math.min(7.2, r.x + dx));
    const nw = Math.max(-2.1, Math.min(2.1, r.w + dw));

    const check = this._checkBlocked(this.activeRing, nx, nw);
    if (check.blocked) {
      // Allow pure W adjustment even if X is blocked!
      if (Math.abs(dw) > 1e-6) {
        const wOnly = this._checkBlocked(this.activeRing, r.x, nw);
        if (!wOnly.blocked) {
          r.w = nw;
          return { moved: true, blocked: false, reason: null, message: '', complete: this.complete };
        }
      }
      return { moved: false, blocked: true, reason: check.reason, message: check.message, complete: this.complete };
    }

    r.x = nx;
    r.w = nw;
    if (this.activeRing === 'B') {
      if (r.x >= 4.2) r.freed = true;
      r.docked = Math.abs(r.x - TRIPLE_RING_SPEC.startB.dockX) < 1.0 && Math.abs(r.w) < 0.42;
    } else {
      if (r.x <= -4.2) r.freed = true;
      r.docked = Math.abs(r.x - TRIPLE_RING_SPEC.startC.dockX) < 1.0 && Math.abs(r.w) < 0.42;
    }
    this.complete = this.ringB.docked && this.ringC.docked;
    return { moved: true, blocked: false, reason: null, message: '', complete: this.complete };
  }
}

// ============================================================
// SECTION 08: Authentic 4D XW Chirality Flip (Strictly Faithful to
// docs/reference/四维空间体验与运动原理解说.txt Part 2, Sec 3!)
//
// Proves:
//  - Any 3D rotation (XY / XZ / YZ) preserves signed volume det > 0
//    and can NEVER align a Right-Handed 4-vertex chiral key with a Left-Handed lock.
//  - Continuous rigid 4D rotation in the XW plane (0° -> 90° -> 180°) maps
//    (X, Y, Z, 0) -> (X cos θ, Y, Z, X sin θ) -> (−X, Y, Z, 0),
//    preserving ALL pairwise distances strictly while reversing 3D handedness (det: + -> −),
//    exactly analogous to flipping a 2D paper cutout over through the 3rd dimension!
// ============================================================
export const CHIRAL_KEY_VERTICES = Object.freeze([
  [0.0, 0.0, 0.0, 0.0], // O: Gold hub
  [1.4, 0.0, 0.0, 0.0], // A: Crimson +X prong
  [0.0, 1.2, 0.0, 0.0], // B: Azure   +Y prong
  [0.0, 0.0, 1.0, 0.0]  // C: Emerald +Z prong
]);

export const CHIRAL_LOCK_VERTICES = Object.freeze([
  [ 0.0, 0.0, 0.0, 0.0],
  [-1.4, 0.0, 0.0, 0.0], // Mirror -X slot!
  [ 0.0, 1.2, 0.0, 0.0],
  [ 0.0, 0.0, 1.0, 0.0]
]);

function rotPlane4(v, i, j, rad) {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  const out = [...v];
  out[i] = v[i] * c - v[j] * s;
  out[j] = v[i] * s + v[j] * c;
  return out;
}

export function signedVolume3D(verts4) {
  const a = [verts4[1][0] - verts4[0][0], verts4[1][1] - verts4[0][1], verts4[1][2] - verts4[0][2]];
  const b = [verts4[2][0] - verts4[0][0], verts4[2][1] - verts4[0][1], verts4[2][2] - verts4[0][2]];
  const c = [verts4[3][0] - verts4[0][0], verts4[3][1] - verts4[0][1], verts4[3][2] - verts4[0][2]];
  const cx = a[1] * b[2] - a[2] * b[1];
  const cy = a[2] * b[0] - a[0] * b[2];
  const cz = a[0] * b[1] - a[1] * b[0];
  return cx * c[0] + cy * c[1] + cz * c[2];
}

export class ChiralFlip4DSimulation {
  constructor() {
    this.reset();
  }

  reset() {
    this.xyDeg = 0;
    this.xzDeg = 0;
    this.yzDeg = 0;
    this.xwDeg = 0; // 0° = Right-Handed, 90° = Edge-on into 4D W, 180° = Left-Handed Mirror!
    this.tried3DRotation = false;
    this.insertedIntoLock = false;
    this.complete = false;
  }

  rotate3D(plane, deltaDeg = 90) {
    this.tried3DRotation = true;
    if (plane === 'XY') this.xyDeg = (this.xyDeg + deltaDeg + 360) % 360;
    if (plane === 'XZ') this.xzDeg = (this.xzDeg + deltaDeg + 360) % 360;
    if (plane === 'YZ') this.yzDeg = (this.yzDeg + deltaDeg + 360) % 360;
    return this.evaluate();
  }

  reset3DRotations() {
    this.xyDeg = 0;
    this.xzDeg = 0;
    this.yzDeg = 0;
    return this.evaluate();
  }

  setXWFlip(deg) {
    this.xwDeg = Math.max(0, Math.min(180, deg));
    return this.evaluate();
  }

  stepXWFlip(deltaDeg) {
    return this.setXWFlip(this.xwDeg + deltaDeg);
  }

  getTransformedVertices() {
    const rXY = (this.xyDeg * Math.PI) / 180;
    const rXZ = (this.xzDeg * Math.PI) / 180;
    const rYZ = (this.yzDeg * Math.PI) / 180;
    const rXW = (this.xwDeg * Math.PI) / 180;
    return CHIRAL_KEY_VERTICES.map(v0 => {
      let v = rotPlane4(v0, 0, 1, rXY);
      v = rotPlane4(v, 0, 2, rXZ);
      v = rotPlane4(v, 1, 2, rYZ);
      v = rotPlane4(v, 0, 3, rXW); // True 4D rigid flip in XW plane!
      return v;
    });
  }

  evaluate() {
    const verts = this.getTransformedVertices();
    const det = signedVolume3D(verts);
    const maxW = Math.max(...verts.map(v => Math.abs(v[3])));
    const maxLockError = Math.max(...verts.map((v, i) => dist4(v, CHIRAL_LOCK_VERTICES[i])));
    const isFlippedLeftHanded = det < -1.3 && maxW < 0.16;
    const matchesLock = maxLockError < 0.18;
    const chiralityLabel = Math.abs(det) < 0.25
      ? '正处于第四维侧立面（90° 穿过 W 轴中）'
      : det > 0
        ? '右旋手性（det > 0，三维内怎么转都无法匹配左旋锁）'
        : '左旋手性（det < 0，已完成四维 XW 180° 翻面！）';
    return {
      verts,
      det,
      maxW,
      maxLockError,
      isFlippedLeftHanded,
      matchesLock,
      chiralityLabel,
      xwDeg: this.xwDeg,
      xyDeg: this.xyDeg,
      xzDeg: this.xzDeg,
      yzDeg: this.yzDeg,
      complete: this.complete
    };
  }

  attemptInsert() {
    const ev = this.evaluate();
    if (ev.matchesLock) {
      this.insertedIntoLock = true;
      this.complete = true;
      return { unlocked: true, reason: null, ev };
    }
    if (ev.isFlippedLeftHanded) {
      return { unlocked: false, reason: 'align3D', ev };
    }
    return { unlocked: false, reason: 'wrongChirality', ev };
  }
}

// ============================================================
// 8-SECTION REFINED CHAPTER 2 CAMPAIGN METADATA
// (Zero Q/E prompts — Mouse Wheel first everywhere!
//  Old Sections 09–16 archived in sections-9-to-16-story-and-puzzle-draft.md)
// ============================================================
export const CHAPTER2_SECTIONS = Object.freeze([
  {
    id: 1,
    code: '第一小节',
    act: 'ACT I · 初入折页',
    title: '隔页的呼救',
    subtitle: '大空间原位 W 透明重组（滚动鼠标滚轮）',
    themeQuote: '《折页之间》——「离开画纸的第一步，是站立原地不动，仅滚动鼠标滚轮便目睹四周空间沿第四维渐隐重组。」',
    hasCompanion: true,
    targetW: 1.8,
    speaker: '先遣领航员 · 林夏 (07)',
    dialogue: '“08号，听到吗？！你终于穿破八胞外壳进来了！我就在你前方大厅同一个三维坐标里——但位于 W = +1.8 流金折页！不用上下移动，直接向上滚动鼠标滚轮，看我从半透明渐实后走过来汇合！”',
    goal: '保持原地 XYZ 不动，向上滚动【鼠标滚轮】切入 W = +1.8 流金折页，看林夏从半透明渐实后走向她汇合。',
    godHint: '第一人称里你的 XYZ 绝不做垂直升降，滚动滚轮只改变 W 轴相位，让四周三维切片原地透明重组；高维台横向展开三个折页供你对照！'
  },
  {
    id: 2,
    code: '第二小节',
    act: 'ACT I · 初入折页',
    title: '六阶跨维天梯',
    subtitle: '20米大峡谷 · 6 级高度差跳跃与滚轮实体化阶梯',
    themeQuote: '《折页之间》——「三维里断在半空的六级阶梯，各自栖身于不同 W 折页，滚轮调准相位便化作脚下实阶。」',
    hasCompanion: true,
    targetW: 0.0,
    speaker: '先遣领航员 · 林夏 (07)',
    dialogue: '“前方的深渊大厅宽达二十米，通往顶台的六级阶梯错落分布在不同高度与 W 折页里！所有虚影阶梯都会发光提示位置——滚动鼠标滚轮把下一级阶梯实体化，再用空格跳上去逐级登顶！”',
    goal: '穿越 20 米深渊大厅的 6 级高差阶梯（阶梯 1→6）：用【鼠标滚轮】切准下一阶对应的 W 折页使其变实，用 WASD + Space 跳上阶梯，最终登顶第 6 阶与林夏汇合！',
    godHint: '6 级阶梯高度依次抬升（0m → 3.1m）且交替分布在青苍(0)、流金(+1.8)、星轨(−1.8)折页；虚影框全程可见，先看准颜色再滚轮切相起跳！'
  },
  {
    id: 3,
    code: '第三小节',
    act: 'ACT I · 初入折页',
    title: '折页棱镜：四维光束谜题',
    subtitle: '三切片跨维光井 · 旋转棱镜绕开三维钛墙',
    themeQuote: '《折页之间》——「三维墙能挡住所有平面光线，却挡不住钻入第四维光井、从相邻折页绕出来的激光。」',
    hasCompanion: true,
    targetW: -1.8,
    speaker: '先遣领航员 · 林夏 (07)',
    dialogue: '“这道能量闸门需要把南侧发射器的金色光束引入北侧核心！但在 W=0 折页横着一堵厚钛墙，三维里怎么折射都过不去——快走近棱镜按 R 旋转，把光束射进东侧【跨维光井】传到流金与星轨折页绕过钛墙！”',
    goal: '依次在 W=0、W=+1.8、W=−1.8 三个折页走近发光棱镜按 R（或点高维台旋钮）旋转 90°：让光束经【光井 A】传至流金折页绕过钛墙，再经【光井 B】传至星轨折页射入北侧核心！',
    godHint: '高维操作台实时同步三页激光回路：青苍页光束向东入光井 A → 流金页向北入光井 B → 星轨页向西直击核心，三段全亮即解锁！'
  },
  {
    id: 4,
    code: '第四小节',
    act: 'ACT II · 降维碾压',
    title: '绝密玻璃牢笼',
    subtitle: '高维降维碾压：20 米大厅无门密室透明穿入取核',
    themeQuote: '《折页之间》——「三维里密不透风的六面牢笼，在第四维看来只是画纸上一个没盖子的方框。」',
    hasCompanion: true,
    targetW: 0.0,
    speaker: '先遣领航员 · 林夏 (07)',
    dialogue: '“防御罩落下来把我和启动核心关进了这座六米见方的六面防爆玻璃牢笼！三维里一扇门都没有——快向上滚动鼠标滚轮切去 W = +1.8 让玻璃墙透明淡出，直接走进来再滚回 W = 0 拿走核心！”',
    goal: '用【鼠标滚轮】切入 W = +1.8（W=0 玻璃墙透明淡出不再阻挡），走进牢笼中央后滚回 W = 0 拾取核心，再切相穿墙送往右侧接收台！',
    godHint: '防爆玻璃牢笼仅存在于 W = 0 切片内；滚动滚轮离页绕入，再滚回 W = 0 拾取并安全送出！'
  },
  {
    id: 5,
    code: '第五小节',
    act: 'ACT II · 降维碾压',
    title: '四维多墙立体迷宫',
    subtitle: '5×5 三折页真四维迷宫 · 任意单页均无解',
    themeQuote: '《折页之间》——「当三张三维迷宫彼此堵死全部去路，唯有在十字路口滚动第四维，才能在墙体间穿针引线。」',
    hasCompanion: false,
    targetW: 0.0,
    speaker: '先遣领航员 · 林夏 (07) [远程通讯]',
    dialogue: '“前方是一座覆盖整个大厅的 5×5 四维多墙迷宫！我在单张青苍、流金、星轨折页里都验算过了——任意单页全都是死路！快用鼠标滚轮不断在三个折页间穿墙绕行，收集两枚相位信标后抵达东北出口！”',
    goal: '穿越 5×5 四维多墙迷宫：利用【鼠标滚轮】在青苍(0)、流金(+1.8)、星轨(−1.8)三个折页间穿行，收集【流金信标 ①】与【星轨信标 ②】，最终在 W=0 抵达东北角出口！',
    godHint: '三个折页各自的墙阵都完全封死了起点到终点的路径！在死胡同前滚动滚轮即可看墙体淡出，对照高维台的三页俯视图规划四维穿行路线！'
  },
  {
    id: 6,
    code: '第六小节',
    act: 'ACT II · 降维碾压',
    title: '四维吃豆 & 四维推箱子（7 关）',
    subtitle: 'WASD 平面 · Space 上 · Ctrl/Shift 下 · 滚轮 W 轴 · 鼠标滑视角',
    themeQuote: '四维网格经典合集——「吃豆建立四维方位直觉，推箱体验『向第四维 W 轴推箱破死角』的绝妙顿悟。」',
    hasCompanion: false,
    targetW: 4.0,
    speaker: '先遣领航员 · 林夏 (07) [远程通讯]',
    dialogue: '“欢迎来到四维网格挑战大厅！这里收录了 3 关四维吃豆与 4 关四维推箱子：WASD 走平面，空格上升，Ctrl 或 Shift 下降，鼠标滚轮沿 W 轴穿梭推箱，滑动鼠标自由旋转视角！卡关时记住最终窍门——绕到箱子背后，直接用滚轮向 W 轴推箱子！”',
    goal: '体验 7 关四维吃豆（3 关）与四维推箱（4 关）：WASD 平面移动、Space 上(+Z)、Ctrl/Shift 下(−Z)、【鼠标滚轮】沿 W 轴移动或跨维推箱，鼠标拖动旋转视角，按 X 切 XYZ⇄XYW，按 Z 撤销！',
    godHint: '上方可随时自由切换全部 7 关！推箱终关已精简障碍，核心窍门是切到 W=1 对准箱子同位坐标，向上滚轮直接把箱子沿 W+ 推出三维围栏！'
  },
  {
    id: 7,
    code: '第七小节',
    act: 'ACT II · 降维碾压',
    title: '三环拓扑解链阵',
    subtitle: '双活环互锁 + 相位锁柱 · 动脑规划四维解环顺序',
    themeQuote: '拓扑定理——「三维里死扣的三环在四维可解，但各折页的相位锁柱会逼你先判断该往 W+ 还是 W− 错开！」',
    hasCompanion: false,
    targetW: 0.0,
    speaker: '先遣领航员 · 林夏 (07) [远程通讯]',
    dialogue: '“这次不是简单的单环了！中央青色母环同时死扣着【流金环】与【星紫环】，而且左右两侧分别在 W=+1.8 和 W=−1.8 埋着相位锁柱！先按 1/2 选定要操控的环，想清楚每只环该往哪个 W 方向避开锁柱，再把它们分别送回两侧底座！”',
    goal: '按 1 / 2（或点高维台）切换操控【流金环 B】与【星紫环 C】：用【鼠标滚轮】找准没有相位锁柱阻挡的 W 折页，用 A/D 横向拉出母环并绕过锁柱，最后滚回 W=0 嵌入左右两座谐振底座！',
    godHint: '动脑提示：右侧锁柱封死了 W=+1.8，所以流金环必须向 W=−1.8 滑向右底座；左侧锁柱封死了 W=−1.8，所以星紫环必须向 W=+1.8 滑向左底座！'
  },
  {
    id: 8,
    code: '第八小节',
    act: 'ACT II · 终幕试炼',
    title: '手性反转：四维 XW 翻面锁',
    subtitle: '二维纸片翻面类比 · 三维手性体沿 XW 平面刚性翻转 180°',
    themeQuote: '《四维空间体验与运动原理解说》——「就像把纸片人翻出纸面转 180° 令正反互换，将三维右旋钥匙在 XW 平面转半圈，坐标 (X,Y,Z,0) 便刚性变为左旋镜像 (−X,Y,Z,0)。」',
    hasCompanion: true,
    targetW: 0.0,
    speaker: '先遣领航员 · 林夏 (07)',
    dialogue: '“终点大门是一把【左旋三维立体锁】，但我们手里这把带红蓝绿三色非共面棱爪的钥匙是【右旋】的！先试试普通三维旋转——你会发现怎么转都对不上！再用鼠标滚轮把钥匙沿第四维 XW 平面连续翻转 180°，就像把旁边那张二维纸片人翻面一样，看它的有向体积从正变负、严丝合缝卡进锁孔！”',
    goal: '① 可先点击三维旋转（XY/XZ/YZ）验证普通三维旋转永远无法匹配左旋锁；② 滚动【鼠标滚轮】将立体钥匙沿第四维 XW 平面连续翻转至 180°（观察旁边二维纸片人同步翻面与 90° 侧立缩薄）；③ 按 R 插入左旋锁孔通关第二章！',
    godHint: '核心几何证明：三维旋转的行列式恒为 +1，永不改变手性；唯独沿 XW 平面刚性旋转 180°，所有边长严格不变，但 (X,Y,Z,0) → (−X,Y,Z,0)，三维有向体积变号，右手变左手！'
  }
]);
