/**
 * 4D Hypercube Interior (-L, L)^4 Physics, True 4D Objects, 4D Sokoban (4×4×2×4),
 * Monument Valley 4D Turntable, Three-Body 4D Fragment & Yun Tianming Fairy Tales
 * 16-Section Story Campaign Engine for Beyond 3D Chapter 2: 《折页之间》 —「离开画纸的人」.
 *
 * Includes:
 *  - Act I   (01–03): Volumetric 4D Space Layers & Monument Valley Impossible 4D Rotating Bridge
 *  - Act II  (04–08): High-Dimensional Crushes & 4D Sokoban (4×4×2×4 Hyper-Grid with XYZ ⇄ XYW Basis Switch)
 *  - Act III (09–12): 4 True 4D Megastructures (Hypersphere, Polytope Morph, 4D Torus Islands, 24-Cell Double Rotor)
 *  - Act IV  (13–14): Three-Body 4D Fragment ("魔戒" & Unfolded Cruiser) & Yun Tianming Fairy Tales (2D Canvas & 4D Umbrella)
 *  - Act V   (15–16): High-Dimensional Non-Invasive Medical Surgery & Awakening the 4D Ark Core
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

/** Formats a discrete 4D grid coordinate [x, y, z, w] as "(x,y,z,w)" matching reference image.png */
export function formatCoord4D(coord4) {
  return `(${coord4[0]},${coord4[1]},${coord4[2]},${coord4[3]})`;
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
 * Section 03 — Monument Valley Impossible 4D Rotating Bridge & Dual-Switch Companion Cooperation.
 */
export class MonumentBridgeSimulation {
  constructor() {
    this.reset();
  }
  reset() {
    this.bridgeAngleDeg = 0; // 0, 90, 180, 270 in the XW 4D plane; aligned at 90°
    this.cyanSwitchPressed = false;
    this.linAtGoldenSwitch = false;
    this.spireStairRaised = false;
    this.complete = false;
  }
  get isBridgeAligned() {
    return this.bridgeAngleDeg === 90 || this.bridgeAngleDeg === 270;
  }
  rotateBridge(deltaDeg = 90) {
    this.bridgeAngleDeg = ((this.bridgeAngleDeg + deltaDeg) % 360 + 360) % 360;
    return {
      bridgeAngleDeg: this.bridgeAngleDeg,
      isBridgeAligned: this.isBridgeAligned
    };
  }
  canCrossBridge(w = 0) {
    if (this.spireStairRaised) return true;
    return this.isBridgeAligned && Math.abs(w) < 0.65;
  }
  updateProgress(playerPos4 = [0, 0, 0, 0]) {
    const [x, , z, w] = playerPos4;
    const inGapZ = z > -0.55 && z < 1.15;
    if (inGapZ && !this.canCrossBridge(w)) {
      return {
        blockedByAbyss: true,
        bridgeAngleDeg: this.bridgeAngleDeg,
        isBridgeAligned: this.isBridgeAligned,
        cyanSwitchPressed: this.cyanSwitchPressed,
        linAtGoldenSwitch: this.linAtGoldenSwitch,
        spireStairRaised: this.spireStairRaised,
        complete: this.complete
      };
    }
    // Step onto the Cyan Pressure Switch on the middle monument terrace at W=0
    if (this.isBridgeAligned && Math.abs(w) < 0.65 && Math.hypot(x, z - 0.65) < 1.25) {
      this.cyanSwitchPressed = true;
      this.linAtGoldenSwitch = true;
      this.spireStairRaised = true;
    }
    // Ascend the raised 4D Monument Spire stairway to W=+1.8 to reunite with Lin Xia
    if (this.spireStairRaised && Math.abs(w - 1.8) < 0.65 && z >= 1.45) {
      this.complete = true;
    }
    return {
      blockedByAbyss: false,
      bridgeAngleDeg: this.bridgeAngleDeg,
      isBridgeAligned: this.isBridgeAligned,
      cyanSwitchPressed: this.cyanSwitchPressed,
      linAtGoldenSwitch: this.linAtGoldenSwitch,
      spireStairRaised: this.spireStairRaised,
      complete: this.complete
    };
  }
}

/**
 * Section 04 — Sealed 3D Glass Prison in W ∈ [-0.55, +0.55].
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
 * Section 06 — 4D Sokoban (`4 × 4 × 2 × 4` Hyper-Grid & `XYZ ⇄ XYW` Basis Transpose)
 * Directly models `/home/antigravity/image.png`:
 *   - Domain: X, Y, W ∈ {1, 2, 3, 4}, Z ∈ {1, 2}
 *   - Player starts at (1,2,1,3) in slice W=3
 *   - Pushable 4D crate starts at (2,2,1,3) in slice W=3 and must reach target (3,4,2,4) in slice W=4
 *   - In slice W=3, cell (3,2,1,3) is a 3D wall corner deadlock (blocked in +X by (4,2,1,3),
 *     in +Y by (3,3,1,3), and in +Z by (3,2,2,3)), requiring a cross-W crate push (dw = +1, E for W+1)
 *     from W=2 through W=3 into W=4!
 *   - X key toggles basisMode between 'XYZ' (4 slices of W=1..4) and 'XYW' (2 slices of Z=1..2).
 */
export const SOKOBAN_4D_SPEC = Object.freeze({
  dims: Object.freeze({ x: 4, y: 4, z: 2, w: 4 }),
  initialPlayer: Object.freeze([1, 2, 1, 3]),
  initialBoxes: Object.freeze([
    Object.freeze([2, 2, 1, 3])
  ]),
  targets: Object.freeze([
    Object.freeze([3, 4, 2, 4])
  ]),
  // 3D corner deadlock in W=3 around (3,2,1,3) + architectural mint-grey blocks across W=1..4 matching image.png
  walls: Object.freeze([
    // W=1 architectural wall pillars
    Object.freeze([1, 1, 1, 1]), Object.freeze([1, 1, 2, 1]),
    Object.freeze([4, 1, 1, 1]), Object.freeze([4, 1, 2, 1]),
    Object.freeze([1, 4, 1, 1]), Object.freeze([1, 4, 2, 1]),
    Object.freeze([4, 4, 1, 1]),
    // W=2 architectural wall frame (leaves (2,2,1,2) and (3,2,1,2) open for cross-W push maneuver)
    Object.freeze([1, 1, 1, 2]), Object.freeze([1, 1, 2, 2]),
    Object.freeze([4, 1, 1, 2]), Object.freeze([4, 1, 2, 2]),
    Object.freeze([1, 4, 1, 2]), Object.freeze([1, 4, 2, 2]),
    Object.freeze([4, 4, 1, 2]), Object.freeze([4, 4, 2, 2]),
    // W=3 3D corner deadlock around (3,2,1,3): blocks +X, +Y, +Z in 3D slice W=3!
    Object.freeze([4, 2, 1, 3]),
    Object.freeze([3, 3, 1, 3]),
    Object.freeze([3, 2, 2, 3]),
    Object.freeze([1, 4, 1, 3]), Object.freeze([1, 4, 2, 3]),
    Object.freeze([4, 4, 1, 3]), Object.freeze([4, 4, 2, 3]),
    // W=4 architectural blocks (with (3,4,1,4) step-up pedestal base supporting goal (3,4,2,4))
    Object.freeze([1, 1, 1, 4]), Object.freeze([1, 1, 2, 4]),
    Object.freeze([1, 4, 1, 4]), Object.freeze([1, 4, 2, 4]),
    Object.freeze([4, 4, 1, 4]), Object.freeze([4, 4, 2, 4])
  ]),
  // Step-up ramp base in W=4: pushing a crate +Y into (3,4,1,4) elevates it onto target (3,4,2,4)
  rampCell: Object.freeze([3, 4, 1, 4]),
  rampExit: Object.freeze([3, 4, 2, 4])
});

function coordKey4(c) {
  return `${c[0]},${c[1]},${c[2]},${c[3]}`;
}

function coordsEqual4(a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
}

export class Sokoban4DSimulation {
  constructor() {
    this.reset();
  }
  reset() {
    this.player = [...SOKOBAN_4D_SPEC.initialPlayer];
    this.boxes = SOKOBAN_4D_SPEC.initialBoxes.map(b => [...b]);
    this.targets = SOKOBAN_4D_SPEC.targets.map(t => [...t]);
    this.walls = SOKOBAN_4D_SPEC.walls.map(w => [...w]);
    this.wallSet = new Set(this.walls.map(coordKey4));
    this.basisMode = 'XYZ'; // 'XYZ' (slices W=1..4) or 'XYW' (slices Z=1..2)
    this.moves = 0;
    this.crossWPushes = 0;
    this.basisSwaps = 0;
    this.history = [];
    this.complete = this._checkComplete();
  }
  inBounds(c) {
    return (
      c[0] >= 1 && c[0] <= SOKOBAN_4D_SPEC.dims.x &&
      c[1] >= 1 && c[1] <= SOKOBAN_4D_SPEC.dims.y &&
      c[2] >= 1 && c[2] <= SOKOBAN_4D_SPEC.dims.z &&
      c[3] >= 1 && c[3] <= SOKOBAN_4D_SPEC.dims.w
    );
  }
  hasWall(c) {
    return this.wallSet.has(coordKey4(c));
  }
  boxIndexAt(c) {
    return this.boxes.findIndex(b => coordsEqual4(b, c));
  }
  is3DDeadlocked(boxIndex = 0) {
    const b = this.boxes[boxIndex];
    if (!b) return false;
    // Check if pushing along +X, +Y, +Z inside the current W-slice is completely blocked by walls/bounds
    const blockedPlusX = !this.inBounds([b[0] + 1, b[1], b[2], b[3]]) || this.hasWall([b[0] + 1, b[1], b[2], b[3]]);
    const blockedPlusY = !this.inBounds([b[0], b[1] + 1, b[2], b[3]]) || this.hasWall([b[0], b[1] + 1, b[2], b[3]]);
    const blockedPlusZ = !this.inBounds([b[0], b[1], b[2] + 1, b[3]]) || this.hasWall([b[0], b[1], b[2] + 1, b[3]]);
    return blockedPlusX && blockedPlusY && blockedPlusZ && b[3] === 3;
  }
  _checkComplete() {
    return this.targets.every(t => this.boxes.some(b => coordsEqual4(b, t)));
  }
  toggleBasisMode() {
    this.basisMode = this.basisMode === 'XYZ' ? 'XYW' : 'XYZ';
    this.basisSwaps++;
    return this.basisMode;
  }
  projectCell(coord4) {
    const [x, y, z, w] = coord4;
    if (this.basisMode === 'XYZ') {
      return {
        sliceIndex: w,
        sliceAxis: 'W',
        localX: x,
        localY: y,
        localZ: z,
        coord4: [...coord4],
        label: formatCoord4D(coord4)
      };
    }
    // 'XYW' mode: W becomes the 3rd in-slice coordinate and Z becomes the slice index!
    return {
      sliceIndex: z,
      sliceAxis: 'Z',
      localX: x,
      localY: y,
      localZ: w,
      coord4: [...coord4],
      label: formatCoord4D(coord4)
    };
  }
  step(dx = 0, dy = 0, dz = 0, dw = 0) {
    const manhattan = Math.abs(dx) + Math.abs(dy) + Math.abs(dz) + Math.abs(dw);
    if (manhattan !== 1) {
      return {
        moved: false,
        pushed: false,
        crossWPush: false,
        blocked: true,
        reason: 'invalid_step',
        player: [...this.player],
        boxes: this.boxes.map(b => [...b]),
        complete: this.complete
      };
    }

    const next = [
      this.player[0] + dx,
      this.player[1] + dy,
      this.player[2] + dz,
      this.player[3] + dw
    ];

    if (!this.inBounds(next)) {
      return {
        moved: false,
        pushed: false,
        crossWPush: false,
        blocked: true,
        reason: 'out_of_bounds',
        player: [...this.player],
        boxes: this.boxes.map(b => [...b]),
        complete: this.complete
      };
    }
    if (this.hasWall(next)) {
      return {
        moved: false,
        pushed: false,
        crossWPush: false,
        blocked: true,
        reason: 'wall',
        player: [...this.player],
        boxes: this.boxes.map(b => [...b]),
        complete: this.complete
      };
    }

    const boxIdx = this.boxIndexAt(next);
    if (boxIdx >= 0) {
      let beyond = [
        next[0] + dx,
        next[1] + dy,
        next[2] + dz,
        next[3] + dw
      ];
      // If pushing crate onto the W=4 step-up pedestal ramp (3,4,1,4), elevate crate onto target (3,4,2,4)
      if (coordsEqual4(beyond, SOKOBAN_4D_SPEC.rampCell)) {
        beyond = [...SOKOBAN_4D_SPEC.rampExit];
      }
      if (!this.inBounds(beyond)) {
        return {
          moved: false,
          pushed: false,
          crossWPush: false,
          blocked: true,
          reason: 'box_out_of_bounds',
          player: [...this.player],
          boxes: this.boxes.map(b => [...b]),
          complete: this.complete
        };
      }
      if (this.hasWall(beyond) || this.boxIndexAt(beyond) >= 0) {
        return {
          moved: false,
          pushed: false,
          crossWPush: false,
          blocked: true,
          reason: 'box_blocked',
          player: [...this.player],
          boxes: this.boxes.map(b => [...b]),
          complete: this.complete
        };
      }

      // Valid crate push!
      this.history.push({
        player: [...this.player],
        boxes: this.boxes.map(b => [...b]),
        moves: this.moves,
        crossWPushes: this.crossWPushes
      });
      this.boxes[boxIdx] = beyond;
      this.player = next;
      this.moves++;
      const crossWPush = dw !== 0;
      if (crossWPush) this.crossWPushes++;
      this.complete = this._checkComplete();
      return {
        moved: true,
        pushed: true,
        crossWPush,
        blocked: false,
        reason: null,
        player: [...this.player],
        boxes: this.boxes.map(b => [...b]),
        complete: this.complete
      };
    }

    // Standard 4D walk into empty cell
    this.history.push({
      player: [...this.player],
      boxes: this.boxes.map(b => [...b]),
      moves: this.moves,
      crossWPushes: this.crossWPushes
    });
    this.player = next;
    this.moves++;
    this.complete = this._checkComplete();
    return {
      moved: true,
      pushed: false,
      crossWPush: false,
      blocked: false,
      reason: null,
      player: [...this.player],
      boxes: this.boxes.map(b => [...b]),
      complete: this.complete
    };
  }
  undo() {
    if (this.history.length === 0) return false;
    const prev = this.history.pop();
    this.player = [...prev.player];
    this.boxes = prev.boxes.map(b => [...b]);
    this.moves = prev.moves;
    this.crossWPushes = prev.crossWPushes;
    this.complete = this._checkComplete();
    return true;
  }
  /**
   * Finds the exact shortest 4D Sokoban move sequence from the current state via BFS
   * over the 4×4×2×4 lattice and executes the next step.
   */
  solveStep() {
    if (this.complete) {
      return { moved: false, complete: true, player: [...this.player], boxes: this.boxes.map(b => [...b]) };
    }
    const dirs = [
      [1, 0, 0, 0], [-1, 0, 0, 0],
      [0, 1, 0, 0], [0, -1, 0, 0],
      [0, 0, 1, 0], [0, 0, -1, 0],
      [0, 0, 0, 1], [0, 0, 0, -1]
    ];
    const startPlayer = [...this.player];
    const startBox = [...this.boxes[0]];
    const target = this.targets[0];
    const stateKey = (p, b) => `${coordKey4(p)}|${coordKey4(b)}`;

    const queue = [{ p: startPlayer, b: startBox, firstDir: null }];
    const visited = new Set([stateKey(startPlayer, startBox)]);

    while (queue.length > 0) {
      const cur = queue.shift();
      if (coordsEqual4(cur.b, target)) {
        if (cur.firstDir) {
          return this.step(...cur.firstDir);
        }
        break;
      }
      for (const d of dirs) {
        const np = [cur.p[0] + d[0], cur.p[1] + d[1], cur.p[2] + d[2], cur.p[3] + d[3]];
        if (!this.inBounds(np) || this.hasWall(np)) continue;
        let nb = cur.b;
        if (coordsEqual4(np, cur.b)) {
          let beyond = [cur.b[0] + d[0], cur.b[1] + d[1], cur.b[2] + d[2], cur.b[3] + d[3]];
          if (coordsEqual4(beyond, SOKOBAN_4D_SPEC.rampCell)) {
            beyond = [...SOKOBAN_4D_SPEC.rampExit];
          }
          if (!this.inBounds(beyond) || this.hasWall(beyond)) continue;
          nb = beyond;
        }
        const k = stateKey(np, nb);
        if (!visited.has(k)) {
          visited.add(k);
          queue.push({ p: np, b: nb, firstDir: cur.firstDir || d });
        }
      }
    }

    // If the user pushed the crate into an unrecoverable corner, undo once and then step
    if (this.undo()) {
      return this.solveStep();
    }
    return { moved: false, complete: this.complete, player: [...this.player], boxes: this.boxes.map(b => [...b]) };
  }
  autoSolve() {
    let guard = 0;
    const stepsTaken = [];
    while (!this.complete && guard < 32) {
      const res = this.solveStep();
      stepsTaken.push(res);
      if (!res.moved) break;
      guard++;
    }
    return { complete: this.complete, steps: stepsTaken.length, player: [...this.player], boxes: this.boxes.map(b => [...b]) };
  }
}

export const FourDSokobanSimulation = Sokoban4DSimulation;

/**
 * Section 07 — Interlocked Giant Rings Unlinking in 4D.
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
 * Section 08 — Chiral Key & Mirror Control Swap (180° XW Rotation).
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
 * TRUE 4D OBJECT #1 (Section 09): 4D Hypersphere (B^4) Slicing.
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
 * TRUE 4D OBJECT #2 (Section 10): Diagonal-Tilted 4D Hypercube / 16-Cell Polytope Slice Metamorphosis!
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
 * TRUE 4D OBJECT #3 (Section 11): 4D Hyper-Torus (Spheritorus) Split-and-Merge Bridge!
 */
export function hyperTorusSliceState(w, { majorR = 1.65, tubeR = 0.85 } = {}) {
  const aw = Math.abs(w);
  if (aw > majorR + tubeR) {
    return { exists: false, merged: false, islandOffset: 0, bridgeWidth: 0, description: '超出四维超环面范围' };
  }
  if (aw < majorR - tubeR * 0.45) {
    const sep = Math.sqrt(Math.max(0.2, majorR * majorR - aw * aw));
    return {
      exists: true,
      merged: false,
      islandOffset: sep,
      bridgeWidth: 0,
      description: '当前切过超环面中孔：同一个四维环面在三维里分裂成左、右两座互不相连的孤岛！'
    };
  }
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
 * TRUE 4D OBJECT #4 (Section 12): 24-Cell Clifford Isoclinic Double Rotor!
 */
export function cliffordDoubleRotate4D(point4, phaseRad) {
  const p1 = rotate4Plane(point4, 0, 3, phaseRad); // XW rotation
  return rotate4Plane(p1, 1, 2, phaseRad);         // Simultaneous orthogonal YZ rotation!
}

/**
 * Section 13 — The Three-Body Problem 4D Fragment Space ("魔戒" Tomb Ring & Unfolded 3D Battleship).
 *
 * Models:
 *  - Conversing with the ancient sentient 4D relic "魔戒 (Tomb Ring)"
 *  - Shrinking 4D fragment puddle radius (`bubbleRadius`)
 *  - 3-layer concentric sealed 3D derelict cruiser at W=0 whose outer armor blocks 3D entry,
 *    but whose internal decks & 3 quantum cores unfold along W when inspected in 4D!
 */
export class ThreeBodyFragmentSimulation {
  constructor() {
    this.reset();
  }
  reset() {
    this.ringContacted = false;
    this.tombDialogue = '“我是墓地，死去很多年了……这片四维水洼正在干涸，快从第四维拆解那艘三维战舰的核心。”';
    this.hullUnfolded4D = false;
    this.coresExtracted = [false, false, false];
    this.coreLayersW = [-1.8, 0.0, 1.8];
    this.bubbleRadius = 4.2;
    this.complete = false;
  }
  contactTombRing() {
    this.ringContacted = true;
    return {
      ringContacted: this.ringContacted,
      dialogue: this.tombDialogue,
      bubbleRadius: this.bubbleRadius
    };
  }
  toggleHullUnfold4D(forceState = undefined) {
    this.hullUnfolded4D = typeof forceState === 'boolean' ? forceState : !this.hullUnfolded4D;
    return this.hullUnfolded4D;
  }
  stepBubbleDrain(dt = 0.05) {
    this.bubbleRadius = Math.max(2.5, this.bubbleRadius - dt * 0.04);
    return this.bubbleRadius;
  }
  canExtractCore(coreIndex, playerPos4 = [0, 0, 0, 0]) {
    if (coreIndex < 0 || coreIndex >= 3) return false;
    if (this.coresExtracted[coreIndex]) return false;
    const w = playerPos4[3] || 0;
    // When folded in 3D (hullUnfolded4D === false) and player is in W=0, the 3 concentric 3D armored hulls block access!
    if (!this.hullUnfolded4D && Math.abs(w) < 0.85) {
      return false;
    }
    return true;
  }
  extractCore(coreIndex, playerPos4 = [0, 0, 0, 0]) {
    if (!this.canExtractCore(coreIndex, playerPos4)) {
      return {
        extracted: false,
        blockedBy3DHull: !this.hullUnfolded4D,
        coresExtracted: [...this.coresExtracted],
        complete: this.complete
      };
    }
    this.coresExtracted[coreIndex] = true;
    if (this.coresExtracted.every(Boolean)) {
      this.ringContacted = true;
      this.complete = true;
    }
    return {
      extracted: true,
      blockedBy3DHull: false,
      count: this.coresExtracted.filter(Boolean).length,
      coresExtracted: [...this.coresExtracted],
      complete: this.complete
    };
  }
}

/**
 * Section 14 — Yun Tianming's Three Fairy Tales:
 *  1. Needle-Eye Painter's 2D Xue-Lang Canvas (`雪浪画纸`, flattening Lin Xia to thickness 0.02)
 *  2. He'ershingenmosiken's 4D Clifford Spinning Umbrella (`赫尔辛根默斯肯旋转伞`, shielding against 2D flattening)
 *  3. Deep-Water Prince (`深水王子信标`, perspective-invariant apparent size across 3D distance, varying only with |deltaW|)
 *  4. Gluttonous Sea Curvature Wake Trail (`饕餮海曲率航迹`, unlocking 3 canvas pins across W=-1.8, 0.0, +1.8)
 */
export class FairyTaleCanvasSimulation {
  constructor() {
    this.reset();
  }
  reset() {
    this.umbrellaSpinning = false;
    this.umbrellaPhaseRad = 0;
    this.pinsUnlocked = [false, false, false];
    this.pinTargetW = [-1.8, 0.0, 1.8];
    this.linCanvasThickness = 0.02; // Flattened 2D silhouette on Xue-Lang paper!
    this.linUnfoldedFromCanvas = false;
    this.complete = false;
  }
  toggleUmbrella(spinning = !this.umbrellaSpinning) {
    this.umbrellaSpinning = !!spinning;
    return this.umbrellaSpinning;
  }
  /**
   * Deep-Water Prince Perspective Law:
   * Apparent angular size is invariant with respect to 3D Euclidean distance `distance3D`
   * and depends strictly on 4th-dimension separation `|deltaW|`.
   */
  deepWaterConstantApparentSize(distance3D, deltaW = 0) {
    void distance3D; // Explicitly invariant across 3D (X,Y,Z) distance!
    const baseApparentScale = 1.35;
    return baseApparentScale / (1 + Math.abs(deltaW) * 0.45);
  }
  unlockPin(pinIndex, playerPos4 = [0, 0, 0, 0]) {
    void playerPos4;
    if (pinIndex < 0 || pinIndex >= 3) {
      return { unlocked: false, blockedByFlatteningField: false, reason: 'invalid_pin' };
    }
    if (!this.umbrellaSpinning) {
      return {
        unlocked: false,
        blockedByFlatteningField: true,
        reason: 'umbrella_not_spinning',
        pinsUnlocked: [...this.pinsUnlocked],
        linUnfoldedFromCanvas: this.linUnfoldedFromCanvas,
        complete: this.complete
      };
    }
    this.pinsUnlocked[pinIndex] = true;
    if (this.pinsUnlocked.every(Boolean)) {
      this.unfoldLinXia();
    }
    return {
      unlocked: true,
      blockedByFlatteningField: false,
      count: this.pinsUnlocked.filter(Boolean).length,
      pinsUnlocked: [...this.pinsUnlocked],
      linCanvasThickness: this.linCanvasThickness,
      linUnfoldedFromCanvas: this.linUnfoldedFromCanvas,
      complete: this.complete
    };
  }
  unfoldLinXia() {
    if (!this.umbrellaSpinning || !this.pinsUnlocked.every(Boolean)) {
      return { unfolded: false, linCanvasThickness: this.linCanvasThickness, complete: this.complete };
    }
    this.linUnfoldedFromCanvas = true;
    this.linCanvasThickness = 1.0;
    this.complete = true;
    return {
      unfolded: true,
      linCanvasThickness: this.linCanvasThickness,
      linUnfoldedFromCanvas: this.linUnfoldedFromCanvas,
      complete: this.complete
    };
  }
}

/**
 * Astronaut Internal Cross-Section & XW Tilt Intersection (Section 15).
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
 * 16-Section Continuous 5-Act Story Campaign for Chapter 2: 《折页之间》 —「离开画纸的人」.
 *
 * Companion Presence Invariant:
 *  - hasCompanion: true  ONLY in [1, 2, 3, 4, 8, 11, 13, 14, 15, 16]
 *  - hasCompanion: false in solo geometric/matrix puzzles [5, 6, 7, 9, 10, 12]
 */
export const CHAPTER2_SECTIONS = Object.freeze([
  {
    id: 1,
    code: '第一小节',
    act: 'ACT I · 初入折页',
    title: '隔页的呼救',
    subtitle: '初识立体空间舱层（W 轴跃迁）',
    themeQuote: '《折页之间》——「离开画纸的第一步，是听见头顶另一页空间的呼唤。」',
    hasCompanion: true,
    targetW: 1.8,
    speaker: '先遣领航员 · 林夏 (07)',
    dialogue: '“08号，听到吗？！你终于穿破八胞外壳进来了！别怕，我就在你头顶的 W = +1.8 流金舱层——按 E 穿梭上来找我！”',
    introDialogue: '“08号，听到吗？！你终于穿破八胞外壳进来了！别怕，我就在你头顶的 W = +1.8 流金舱层——按 E 穿梭上来找我！”',
    goal: '按住 E（或点右侧高维操作台）穿梭至 W = +1.8 流金空间舱，走向挥手的同伴林夏与她汇合。',
    goalText: '按住 E（或点右侧高维操作台）穿梭至 W = +1.8 流金空间舱，走向挥手的同伴林夏与她汇合。',
    godHint: '高维视角下，每个空间层都是一座带厚度的立体舱室。直接点击上层流金舱或按 E，让你的小人跨越第四维！',
    consoleHint: '高维视角下，每个空间层都是一座带厚度的立体舱室。直接点击上层流金舱或按 E，让你的小人跨越第四维！',
    crushButtonLabel: '⚡ 高维跃迁：直接升入 W=+1.8 与林夏汇合'
  },
  {
    id: 2,
    code: '第二小节',
    act: 'ACT I · 初入折页',
    title: '折叠断渊',
    subtitle: '三层立体空间舱连续穿梭过桥',
    themeQuote: '《折页之间》——「三维里断裂的深渊，在第四维里只是错开的三级台阶。」',
    hasCompanion: true,
    targetW: 0.0,
    speaker: '先遣领航员 · 林夏 (07)',
    dialogue: '“回廊外壳正在坍缩，我们得赶去方舟主塔！前方的长桥被切碎在 0、+1.8、−1.8 三层空间舱里了，边跑边按 Q/E 切换脚下的舱层跟上我！”',
    introDialogue: '“回廊外壳正在坍缩，我们得赶去方舟主塔！前方的长桥被切碎在 0、+1.8、−1.8 三层空间舱里了，边跑边按 Q/E 切换脚下的舱层跟上我！”',
    goal: '向前推进：依次切入 W = +1.8 流金桥段 → W = −1.8 星轨桥段 → W = 0 终点甲板，与对岸的林夏汇合。',
    goalText: '向前推进：依次切入 W = +1.8 流金桥段 → W = −1.8 星轨桥段 → W = 0 终点甲板，与对岸的林夏汇合。',
    godHint: '三段断桥分别悬浮在三座平行的立体空间舱里——在高维操作台上一眼就能看穿哪一层有路！',
    consoleHint: '三段断桥分别悬浮在三座平行的立体空间舱里——在高维操作台上一眼就能看穿哪一层有路！',
    crushButtonLabel: '⚡ 高维连跃：一键穿梭三层断桥抵达对岸'
  },
  {
    id: 3,
    code: '第三小节',
    act: 'ACT I · 初入折页',
    title: '纪念碑谷：四维旋转天桥',
    subtitle: '高维视错觉天桥旋转 + 双人踏板协作',
    themeQuote: '《纪念碑谷》致敬——「当你在第四维转动天桥，两条原本永不相交的断路便在投影中合而为一。」',
    hasCompanion: true,
    targetW: 1.8,
    speaker: '先遣领航员 · 林夏 (07)',
    dialogue: '“看这座纪念碑圣殿！我在上层 W=+1.8 的流金塔楼，你面前的 L 形旋转桥朝第四维偏了 90°。快按 R 旋转四维转盘接通断桥，踩下青色机关帮我升起登顶天梯！”',
    introDialogue: '“看这座纪念碑圣殿！我在上层 W=+1.8 的流金塔楼，你面前的 L 形旋转桥朝第四维偏了 90°。快按 R 旋转四维转盘接通断桥，踩下青色机关帮我升起登顶天梯！”',
    goal: '按 R（或点高维台旋钮）将四维 L 形转盘旋转 90° 接通断桥，走上中央平台踩亮【青色踏板】使林夏踩亮上层【金色踏板】，再升入 W=+1.8 圣殿尖塔汇合！',
    goalText: '按 R（或点高维台旋钮）将四维 L 形转盘旋转 90° 接通断桥，走上中央平台踩亮【青色踏板】使林夏踩亮上层【金色踏板】，再升入 W=+1.8 圣殿尖塔汇合！',
    godHint: '纪念碑谷的四维真相：原本指向第四维 W 的悬臂桥，在 XW 平面旋转 90° 后便严丝合缝地填补了三维断渊！',
    consoleHint: '纪念碑谷的四维真相：原本指向第四维 W 的悬臂桥，在 XW 平面旋转 90° 后便严丝合缝地填补了三维断渊！',
    crushButtonLabel: '⚡ 旋转四维天桥 (XW 90°) 并协同点亮纪念碑尖塔'
  },
  {
    id: 4,
    code: '第四小节',
    act: 'ACT II · 降维碾压',
    title: '绝密玻璃牢笼',
    subtitle: '高维降维碾压：无门密室救援',
    themeQuote: '《折页之间》——「三维里密不透风的六面牢笼，在第四维看来只是画纸上一个没盖子的方框。」',
    hasCompanion: true,
    targetW: 0.0,
    speaker: '先遣领航员 · 林夏 (07)',
    dialogue: '“糟了！防御罩落下来把我和启动核心关进了六面封死的防爆玻璃房！三维里根本没门，快用高维操作台从 W = +1.8 层空降进来救我！”',
    introDialogue: '“糟了！防御罩落下来把我和启动核心关进了六面封死的防爆玻璃房！三维里根本没门，快用高维操作台从 W = +1.8 层空降进来救我！”',
    goal: '按 E 升入 W = +1.8 层（越过只造在 W=0 的玻璃牢笼），走到林夏正上方按 Q 空降进牢笼拿起核心，再翻页带去右侧接收台！',
    goalText: '按 E 升入 W = +1.8 层（越过只造在 W=0 的玻璃牢笼），走到林夏正上方按 Q 空降进牢笼拿起核心，再翻页带去右侧接收台！',
    godHint: '高维碾压低维：三维里密不透风的六面牢笼，在第四维看来只是个没盖子的矮框！直接点高维台把小人空投进牢笼中心！',
    consoleHint: '高维碾压低维：三维里密不透风的六面牢笼，在第四维看来只是个没盖子的矮框！直接点高维台把小人空投进牢笼中心！',
    crushButtonLabel: '⚡ 高维空降：越过三维玻璃墙空投进密室中心'
  },
  {
    id: 5,
    code: '第五小节',
    act: 'ACT II · 降维碾压',
    title: '四维封锁线',
    subtitle: '贯穿高维的超墙与底层唯一裂隙',
    themeQuote: '《折页之间》——「真正的四维超墙会封锁多层切片，唯有高维全局视野能洞悉底层的裂隙。」',
    hasCompanion: false,
    targetW: -1.8,
    speaker: '先遣领航员 · 林夏 (07) [远程通讯]',
    dialogue: '“我在后方终端帮你掩护！注意前面那道赤红屏障——它是连第四维都封死的【四维超墙】，往上翻页也没用！我只在 W = −1.8 底层右侧撕开了个缺口！”',
    introDialogue: '“我在后方终端帮你掩护！注意前面那道赤红屏障——它是连第四维都封死的【四维超墙】，往上翻页也没用！我只在 W = −1.8 底层右侧撕开了个缺口！”',
    goal: '按 Q 潜入 W = −1.8 深蓝底层，从右侧唯一的高维缺口钻过赤红超墙，再升回 W = 0 抵达北侧终端。',
    goalText: '按 Q 潜入 W = −1.8 深蓝底层，从右侧唯一的高维缺口钻过赤红超墙，再升回 W = 0 抵达北侧终端。',
    godHint: '不是所有墙都能随便翻越：赤红超墙在 W=0 和 W=+1.8 全封死，唯有最下方的 W=−1.8 舱层右侧留有一道缺口！',
    consoleHint: '不是所有墙都能随便翻越：赤红超墙在 W=0 和 W=+1.8 全封死，唯有最下方的 W=−1.8 舱层右侧留有一道缺口！',
    crushButtonLabel: '⚡ 高维潜行：从 W=−1.8 底层缺口钻过超墙'
  },
  {
    id: 6,
    code: '第六小节',
    act: 'ACT II · 降维碾压',
    title: '四维推箱：4×4×2×4 矩阵归位',
    subtitle: '跨 W 维推箱破除三维死角 · X 键切换 XYZ ⇄ XYW 切片',
    themeQuote: '四维推箱子 (4×4×2×4)——「当箱子卡死在三维墙角时，把它推向第四维 W+1，死角便不复存在。」',
    hasCompanion: false,
    targetW: 4.0,
    speaker: '先遣领航员 · 林夏 (07) [远程通讯]',
    dialogue: '“主塔动力锁是一座【4×4×2×4 四维推箱矩阵】（X,Y,W∈{1..4}, Z∈{1,2}）！你在 (1,2,1,3)，翠绿能量箱若在 W=3 推入墙角 (3,2,1,3) 会在三维死锁——快切去 W=2 按 E 把箱子跨维推入 W=4，再按 X 切换 XYZ ⇄ XYW 视角把它推上 (3,4,2,4)！”',
    introDialogue: '“主塔动力锁是一座【4×4×2×4 四维推箱矩阵】（X,Y,W∈{1..4}, Z∈{1,2}）！你在 (1,2,1,3)，翠绿能量箱若在 W=3 推入墙角 (3,2,1,3) 会在三维死锁——快切去 W=2 按 E 把箱子跨维推入 W=4，再按 X 切换 XYZ ⇄ XYW 视角把它推上 (3,4,2,4)！”',
    goal: '操控 (1,2,1,3) 处的推箱光标：用 WASD 在当前三维棋盘推箱，用 E (W+1) / Q或C (W−1) 跨第四维把卡在 W=3 死角的翠绿箱子推入 W=4，可按 X 切换 XYZ ⇄ XYW 切片轴、按 Z 撤销，将翠绿箱推入 W=4 上层目标点 (3,4,2,4)！',
    goalText: '操控 (1,2,1,3) 处的推箱光标：用 WASD 在当前三维棋盘推箱，用 E (W+1) / Q或C (W−1) 跨第四维把卡在 W=3 死角的翠绿箱子推入 W=4，可按 X 切换 XYZ ⇄ XYW 切片轴、按 Z 撤销，将翠绿箱推入 W=4 上层目标点 (3,4,2,4)！',
    godHint: '高维操作台同时平铺 W=1、W=2、W=3、W=4 四座 4×4×2 立体棋盘！按 X 键交换 Z 与 W 轴（XYZ ⇄ XYW），跨维推箱路线将直接变成眼前的直线通道！',
    consoleHint: '高维操作台同时平铺 W=1、W=2、W=3、W=4 四座 4×4×2 立体棋盘！按 X 键交换 Z 与 W 轴（XYZ ⇄ XYW），跨维推箱路线将直接变成眼前的直线通道！',
    crushButtonLabel: '⚡ 高维推箱解算：自动执行下一步四维推箱 → (3,4,2,4)'
  },
  {
    id: 7,
    code: '第七小节',
    act: 'ACT II · 降维碾压',
    title: '巨环死结',
    subtitle: '四维无损解开相扣合金环',
    themeQuote: '拓扑定理——「三维空间里死死相扣的圆环，在四维空间里根本打不成结。」',
    hasCompanion: false,
    targetW: 0.0,
    speaker: '先遣领航员 · 林夏 (07) [远程通讯]',
    dialogue: '“主塔升降梯被两只 4 米高的实心金属巨环死死扣住了！在同层硬推只会卡死，先把金色巨环带到 W = +1.4 舱层，就能毫无碰撞地穿过去！”',
    introDialogue: '“主塔升降梯被两只 4 米高的实心金属巨环死死扣住了！在同层硬推只会卡死，先把金色巨环带到 W = +1.4 舱层，就能毫无碰撞地穿过去！”',
    goal: '按 E 把金色巨环升入 W = +1.4 舱层，按 D（或高维台右移）推着金环越过青环位置，再按 Q 放回 W = 0 解开死结。',
    goalText: '按 E 把金色巨环升入 W = +1.4 舱层，按 D（或高维台右移）推着金环越过青环位置，再按 Q 放回 W = 0 解开死结。',
    godHint: '在高维操作台里看清本质：把金环挪去上层空间舱，两只实心环就像错层的高架桥一样互不阻挡！',
    consoleHint: '在高维操作台里看清本质：把金环挪去上层空间舱，两只实心环就像错层的高架桥一样互不阻挡！',
    crushButtonLabel: '⚡ 高维解链：把金环升入上层无损解开死结'
  },
  {
    id: 8,
    code: '第八小节',
    act: 'ACT II · 降维碾压',
    title: '镜中双生与圣钥',
    subtitle: '与镜中自己互换手性 · 拼合双生密钥',
    themeQuote: '四维手性反转——「把右手放进第四维翻转半圈拿回来，它就变成了左手。」',
    hasCompanion: true,
    targetW: 0.0,
    speaker: '先遣领航员 · 林夏 (07)',
    dialogue: '“内殿大门需要左右对称的两半圣钥拼合！但我俩手里的都是【右旋半钥】……快看中央那面四维相位魔镜！和镜子里的你互换，把你的半钥翻转成【左旋】！”',
    introDialogue: '“内殿大门需要左右对称的两半圣钥拼合！但我俩手里的都是【右旋半钥】……快看中央那面四维相位魔镜！和镜子里的你互换，把你的半钥翻转成【左旋】！”',
    goal: '走近中央的四维魔镜按 R（或点高维台「四维镜像互换」），与镜中自己互换使手里的圣钥手性反转，再走向大门与林夏的半钥完美拼合！',
    goalText: '走近中央的四维魔镜按 R（或点高维台「四维镜像互换」），与镜中自己互换使手里的圣钥手性反转，再走向大门与林夏的半钥完美拼合！',
    godHint: '三维里怎么转都无法把右手钥匙变成左手钥匙；但在第四维翻转 180°，你与镜中自己互换，两半圣钥立刻严丝合缝！',
    consoleHint: '三维里怎么转都无法把右手钥匙变成左手钥匙；但在第四维翻转 180°，你与镜中自己互换，两半圣钥立刻严丝合缝！',
    crushButtonLabel: '⚡ 四维镜像互换：与镜中自己互换翻转圣钥手性 (R)'
  },
  {
    id: 9,
    code: '第九小节',
    act: 'ACT III · 真四维巨物',
    title: '真四维物①：超球星核',
    subtitle: '四维实心超球切面缩放与三态采能',
    themeQuote: '真四维几何①——「超球从未呼吸缩放，是你切过它的深度改变了三维截面的半径。」',
    hasCompanion: false,
    targetW: 2.2,
    speaker: '先遣领航员 · 林夏 (07) [远程通讯]',
    dialogue: '“从这里开始是真正的四维巨物！这颗【四维超球】在 W=0 膨胀成 4.2 米堵死了路，切去 W=−1.8 让它缩成小球绕过去，再去 W=+2.2 让它彻底消失，集齐三枚晶簇！”',
    introDialogue: '“从这里开始是真正的四维巨物！这颗【四维超球】在 W=0 膨胀成 4.2 米堵死了路，切去 W=−1.8 让它缩成小球绕过去，再去 W=+2.2 让它彻底消失，集齐三枚晶簇！”',
    goal: '利用四维超球在不同空间层切面大小不同的特性：在 W=−1.8（缩球层）、W=0（赤道层）、W=+2.2（超界消失层）集齐 3 枚稳压晶簇！',
    goalText: '利用四维超球在不同空间层切面大小不同的特性：在 W=−1.8（缩球层）、W=0（赤道层）、W=+2.2（超界消失层）集齐 3 枚稳压晶簇！',
    godHint: '真正的四维超球其实没有呼吸缩放——切过它的极区是小球，切过赤道是巨球，超出它的 W 半径后巨球原地消失！',
    consoleHint: '真正的四维超球其实没有呼吸缩放——切过它的极区是小球，切过赤道是巨球，超出它的 W 半径后巨球原地消失！',
    crushButtonLabel: '⚡ 高维采能：跃迁至下一枚超球晶簇层'
  },
  {
    id: 10,
    code: '第十小节',
    act: 'ACT III · 真四维巨物',
    title: '真四维物②：超方圣殿',
    subtitle: '斜立实心超立方体：四面体 ⇄ 八面体 ⇄ 立方体相变',
    themeQuote: '真四维几何②——「沿对角线切过同一座四维多胞体，三维世界会依次看到四面体、八面体与立方体。」',
    hasCompanion: false,
    targetW: 1.8,
    speaker: '先遣领航员 · 林夏 (07) [远程通讯]',
    dialogue: '“看中央那座悬浮建筑！它是一块斜立在四维中的【实心超立方体】！在不同空间层切过它的对角线，它会变成完全不同的多面体——快去激活它的三种几何形态！”',
    introDialogue: '“看中央那座悬浮建筑！它是一块斜立在四维中的【实心超立方体】！在不同空间层切过它的对角线，它会变成完全不同的多面体——快去激活它的三种几何形态！”',
    goal: '穿梭三层空间，依次走近并激活同一座四维超方体切出的三种形态：W=−1.8【正四面体】→ W=0【正八面体钻石殿】→ W=+1.8【正立方体】！',
    goalText: '穿梭三层空间，依次走近并激活同一座四维超方体切出的三种形态：W=−1.8【正四面体】→ W=0【正八面体钻石殿】→ W=+1.8【正立方体】！',
    godHint: '就像斜切三维方块会切出三角形和六边形，沿第四维切过斜立的四维超立方体，会在三维里依次切出正四面体、正八面体与正立方体！',
    consoleHint: '就像斜切三维方块会切出三角形和六边形，沿第四维切过斜立的四维超立方体，会在三维里依次切出正四面体、正八面体与正立方体！',
    crushButtonLabel: '⚡ 高维相变：切换超方体切面形态'
  },
  {
    id: 11,
    code: '第十一小节',
    act: 'ACT III · 真四维巨物',
    title: '真四维物③：分合浮岛',
    subtitle: '四维超环面：两座孤岛在第四维融合成桥',
    themeQuote: '真四维几何③——「两座被深渊隔开的孤岛，在第四维的拱顶处本来就是同一座超环面。」',
    hasCompanion: true,
    targetW: 0.0,
    speaker: '先遣领航员 · 林夏 (07)',
    dialogue: '“08号，我在右边的浮岛上！在 W=0 层，我们脚下是两座被深渊隔开的孤岛；但它们其实是同一个【四维超环面】的切片！快升到 W=+1.8 层，两座孤岛就会融合成一座环形天桥！”',
    introDialogue: '“08号，我在右边的浮岛上！在 W=0 层，我们脚下是两座被深渊隔开的孤岛；但它们其实是同一个【四维超环面】的切片！快升到 W=+1.8 层，两座孤岛就会融合成一座环形天桥！”',
    goal: '在 W=0 两岛完全断开；按 E 升入 W=+1.8 层使两座孤岛融合成完整环形天桥，走过天桥到右侧再按 Q 降回 W=0 与林夏汇合！',
    goalText: '在 W=0 两岛完全断开；按 E 升入 W=+1.8 层使两座孤岛融合成完整环形天桥，走过天桥到右侧再按 Q 降回 W=0 与林夏汇合！',
    godHint: '就像把救生圈竖着浸入水面，水面上先看到两个分离的圆圈，浸到顶部才连成一体——两座孤岛在第四维本来就是连通的！',
    consoleHint: '就像把救生圈竖着浸入水面，水面上先看到两个分离的圆圈，浸到顶部才连成一体——两座孤岛在第四维本来就是连通的！',
    crushButtonLabel: '⚡ 升入 W=+1.8 让两座孤岛融合成环形天桥'
  },
  {
    id: 12,
    code: '第十二小节',
    act: 'ACT III · 真四维巨物',
    title: '真四维物④：双旋星轮',
    subtitle: '正二十四胞体克利福德双旋转（由内向外翻滚）',
    themeQuote: '真四维几何④——「没有静止转轴的克利福德双旋转，让四维星轮由内向外永恒翻涌。」',
    hasCompanion: false,
    targetW: 0.0,
    speaker: '先遣领航员 · 林夏 (07) [远程通讯]',
    dialogue: '“这是四维独有的【正二十四胞体双旋星轮】！它没有固定转轴，而是同时在两个正交平面双旋转，不停把内环翻到第四维外层！趁它的相位对齐时收集三枚曲率核心！”',
    introDialogue: '“这是四维独有的【正二十四胞体双旋星轮】！它没有固定转轴，而是同时在两个正交平面双旋转，不停把内环翻到第四维外层！趁它的相位对齐时收集三枚曲率核心！”',
    goal: '观察由内向外翻滚的四维双旋星轮：在 W=0 与 W=±1.8 层捕捉从第四维翻入当前层的星轮核心，集齐 3 枚高维曲率核心！',
    goalText: '观察由内向外翻滚的四维双旋星轮：在 W=0 与 W=±1.8 层捕捉从第四维翻入当前层的星轮核心，集齐 3 枚高维曲率核心！',
    godHint: '三维物体旋转必有一根静止轴；而四维物体可以做克利福德双旋转（XW+YZ 同时等角旋转），整个星轮由内向外无死角翻滚！',
    consoleHint: '三维物体旋转必有一根静止轴；而四维物体可以做克利福德双旋转（XW+YZ 同时等角旋转），整个星轮由内向外无死角翻滚！',
    crushButtonLabel: '⚡ 捕捉双旋星轮高维曲率核心'
  },
  {
    id: 13,
    code: '第十三小节',
    act: 'ACT IV · 三体四维碎片与童话',
    title: '三体四维碎片：魔戒墓地与全透视战舰',
    subtitle: '对话四维遗迹「魔戒」 · 从第四维展开三层封闭战舰取核',
    themeQuote: '《三体·死神永生》致敬——「我是墓地，死去很多年了……从四维看去，三维战舰的内外甲板同时毫无遮挡地摊开在眼前。」',
    hasCompanion: true,
    targetW: 1.8,
    speaker: '四维遗迹 · 魔戒 / 林夏 (07)',
    dialogue: '“08号，我们飘进了一片正在干涸的【四维碎片水洼】！前方的青铜巨环自称是『墓地』，中央那艘三层装甲封死的先遣战舰在三维完全打不开——快按 R 展开四维全透视视图，从第四维直接伸手取出舰内的三枚量子核心！”',
    introDialogue: '“08号，我们飘进了一片正在干涸的【四维碎片水洼】！前方的青铜巨环自称是『墓地』，中央那艘三层装甲封死的先遣战舰在三维完全打不开——快按 R 展开四维全透视视图，从第四维直接伸手取出舰内的三枚量子核心！”',
    goal: '走近前方发光的古老四维遗迹【魔戒】聆听警告，按 R（或点高维台「四维全透视展开」）将三层封闭战舰甲板沿 W 维展开，穿梭 W=−1.8 / 0.0 / +1.8 取出全部 3 枚内层核心！',
    goalText: '走近前方发光的古老四维遗迹【魔戒】聆听警告，按 R（或点高维台「四维全透视展开」）将三层封闭战舰甲板沿 W 维展开，穿梭 W=−1.8 / 0.0 / +1.8 取出全部 3 枚内层核心！',
    godHint: '《三体》四维碎片奇观：在三维里层层包裹的战舰外装甲、反应舱与舰桥核心，在第四维展开后就像并排摊开的图纸，无需破甲即可直接取核！',
    consoleHint: '《三体》四维碎片奇观：在三维里层层包裹的战舰外装甲、反应舱与舰桥核心，在第四维展开后就像并排摊开的图纸，无需破甲即可直接取核！',
    crushButtonLabel: '⚡ 四维全透视拆解战舰并提取量子核心 (R)'
  },
  {
    id: 14,
    code: '第十四小节',
    act: 'ACT IV · 三体四维碎片与童话',
    title: '云天明童话：针眼画师与四维旋转伞',
    subtitle: '撑开克利福德旋转伞抵御二向降维 · 深水信标与雪浪纸折页救人',
    themeQuote: '《云天明童话》致敬——「唯有不停旋转的黑伞能抵御针眼画师的雪浪画纸，把被画成二维的同伴重新折回立体世界。」',
    hasCompanion: true,
    targetW: 1.8,
    speaker: '先遣领航员 · 林夏 (07) [雪浪画纸内]',
    dialogue: '“救命！四维碎片坍缩掀起了『针眼画师』的降维浪潮，把我的身体压扁进这张二维【雪浪画纸】里了！快按 R 撑开头顶的【四维克利福德旋转伞】护住自己，追随远处不随三维距离缩小的【深水王子信标】，拔掉三层空间里的画卷定画针把我折回立体世界！”',
    introDialogue: '“救命！四维碎片坍缩掀起了『针眼画师』的降维浪潮，把我的身体压扁进这张二维【雪浪画纸】里了！快按 R 撑开头顶的【四维克利福德旋转伞】护住自己，追随远处不随三维距离缩小的【深水王子信标】，拔掉三层空间里的画卷定画针把我折回立体世界！”',
    goal: '按 R 撑开并旋转【四维克利福德旋转伞】抵御二维降维场，沿着饕餮海曲率航迹朝【深水王子信标】（不服从三维近大远小透视）前进，在 W=−1.8 / 0.0 / +1.8 解锁 3 枚定画针，将林夏从二维雪浪画纸中重新折回三维立体形态！',
    goalText: '按 R 撑开并旋转【四维克利福德旋转伞】抵御二维降维场，沿着饕餮海曲率航迹朝【深水王子信标】（不服从三维近大远小透视）前进，在 W=−1.8 / 0.0 / +1.8 解锁 3 枚定画针，将林夏从二维雪浪画纸中重新折回三维立体形态！',
    godHint: '《云天明的三个故事》与《离开画纸的人》主题交汇：旋转伞用四维双旋转离心场抵消降维打击，深水信标在三维走再远都不会变小，拔除三枚定画针即可让林夏真正『离开画纸』！',
    consoleHint: '《云天明的三个故事》与《离开画纸的人》主题交汇：旋转伞用四维双旋转离心场抵消降维打击，深水信标在三维走再远都不会变小，拔除三枚定画针即可让林夏真正『离开画纸』！',
    crushButtonLabel: '⚡ 撑开四维旋转伞并拔除雪浪画纸定画针救出林夏 (R)'
  },
  {
    id: 15,
    code: '第十五小节',
    act: 'ACT V · 终幕觉醒',
    title: '四维急诊：透视内脏',
    subtitle: '高维无创透视 + 第四维身体弯曲手术',
    themeQuote: '《折页之间》——「无需划开封闭的宇航服外壳，高维视线与第四维微倾即可直接触达跳动的心脏。」',
    hasCompanion: true,
    targetW: 0.0,
    speaker: '先遣领航员 · 林夏 (07)',
    dialogue: '“咳……刚才从二维画卷折回三维时，三块高维碎屑卡进了我体内！我的宇航服锁死了不能脱，快用高维医疗台直接透视我的内脏，再把我的身体在第四维轻轻弯曲取出碎屑！”',
    introDialogue: '“咳……刚才从二维画卷折回三维时，三块高维碎屑卡进了我体内！我的宇航服锁死了不能脱，快用高维医疗台直接透视我的内脏，再把我的身体在第四维轻轻弯曲取出碎屑！”',
    goal: '走近医疗台上的林夏：在高维透视下看穿封闭宇航服里的心脏与双肺，按 Q/E（或点高维台排异）弯曲她的四维姿态，依次清除心脏、左肺、脊柱的 3 处紫色碎屑！',
    goalText: '走近医疗台上的林夏：在高维透视下看穿封闭宇航服里的心脏与双肺，按 Q/E（或点高维台排异）弯曲她的四维姿态，依次清除心脏、左肺、脊柱的 3 处紫色碎屑！',
    godHint: '从第四维看三维人体，就像看透明画纸上的小人：无需划开宇航服表皮，就能直接触达并取出她内脏里的三块碎屑！',
    consoleHint: '从第四维看三维人体，就像看透明画纸上的小人：无需划开宇航服表皮，就能直接触达并取出她内脏里的三块碎屑！',
    crushButtonLabel: '⚡ 高维无创弯曲：摘除林夏体内下一处碎屑'
  },
  {
    id: 16,
    code: '第十六小节',
    act: 'ACT V · 终幕觉醒',
    title: '跃出画纸：方舟之心',
    subtitle: '终章觉醒 · 俯瞰八胞外壳与五维星门',
    themeQuote: '《折页之间》终章——「曾经困住我们的八间立方体房间，如今只是掌心中一枚可以自由折叠的四维超立方体。」',
    hasCompanion: true,
    targetW: 0.0,
    speaker: '先遣领航员 · 林夏 (07)',
    dialogue: '“谢谢你救了我，08号！看脚下——那就是我们曾经困在里面的第一章《回廊空间站》八个房间！走上主控台，和我一起点亮四维方舟之心吧！”',
    introDialogue: '“谢谢你救了我，08号！看脚下——那就是我们曾经困在里面的第一章《回廊空间站》八个房间！走上主控台，和我一起点亮四维方舟之心吧！”',
    goal: '与康复的林夏并肩走上前方的主控核心，按 R（或点高维台「启动方舟之心」）折叠并点亮整座八胞空间站，开启通往更高维度的星门！',
    goalText: '与康复的林夏并肩走上前方的主控核心，按 R（或点高维台「启动方舟之心」）折叠并点亮整座八胞空间站，开启通往更高维度的星门！',
    godHint: '你已彻底走出名为“三维”的画纸。曾经困住你的八间立方体房间，如今只是你掌心中一枚可以自由折叠的四维超立方体！',
    consoleHint: '你已彻底走出名为“三维”的画纸。曾经困住你的八间立方体房间，如今只是你掌心中一枚可以自由折叠的四维超立方体！',
    crushButtonLabel: '⚡ 觉醒四维方舟之心 · 折叠八胞空间站 (R)'
  }
]);
