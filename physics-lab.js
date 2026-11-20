/**
 * Pure 4D boundary physics experiments for Beyond 3D Chapter 1:
 *  1. Geodesic laser pulse tracer (exact 4D boundary advance + specular reflection)
 *  2. Newtonian / 0.5g inertial physics probe with exact 4D seam transport
 *  3. Parallel-transport Regge curvature holonomy gyroscope (90° on 3-cell corner loops)
 *  4. Scientific hypothesis-falsification evidence ledger
 *
 * Pure ES module with zero DOM/Babylon dependencies so it is 100% unit-testable.
 */
import {
  H, dot, add, sub, scale, axisOf, normalFor, cellId, copyState,
  canonicalFrame, tangentToWorld, worldToTangent, transportFrame, advance, localPoint
} from './chapter-topology.js';
import { seamAperture, positionClear, viewBasis } from './chapter-motion.js';
import { statueBlocked } from './statue-placement.js';
import { GRAVITY } from './grounded-motion.js';

const SPEED_OF_LIGHT_M_PER_NS = 0.299792458;
const EPS = 1e-6;

function normalize3(v) {
  const n = Math.hypot(v[0], v[1], v[2]);
  return n > 1e-12 ? [v[0] / n, v[1] / n, v[2] / n] : [0, 0, 1];
}

function reflect3(d, n) {
  const k = 2 * dot(d, n);
  return normalize3([d[0] - k * n[0], d[1] - k * n[1], d[2] - k * n[2]]);
}

/**
 * Trace an optical geodesic laser pulse on the piecewise-flat 3-manifold boundary ∂[-H, H]^4.
 * Crosses open doorways straight via exact 4D parallel transport; reflects specularly off
 * closed walls, hatch rims, upper-stage glass, or solid statues.
 */
export function traceGeodesicLaser(startState, direction3, mode = 'upper', options = {}) {
  const maxDistance = options.maxDistance ?? 36;
  const maxBounces = options.maxBounces ?? 6;
  const selfRadius = options.selfRadius ?? 0.55;
  const minReturnDist = options.minReturnDist ?? 4.0;
  const rayRadius = options.rayRadius ?? 0.03;

  let cur = copyState(startState);
  let dir = normalize3(direction3);
  const originCell = cellId(startState.normal);
  const originP = [...startState.p];
  const launchWorldDir = tangentToWorld(startState.frame, dir);

  const segments = [];
  const cellsVisited = [originCell];
  let traveled = 0;
  let bounces = 0;
  let hitSelf = false;
  let hitSelfFromBehind = false;
  let selfHitAngleCos = 0;
  let selfHitDistance = null;

  const canCross = seam => seamAperture(seam.from, seam.to, seam.p, mode, rayRadius);

  // Check if a ray segment inside `cur` passes close to originP when in originCell
  const checkSelfHit = (p0, p1, segStartDist, currentDirWorld) => {
    if (hitSelf || cellId(cur.normal) !== originCell) return null;
    const dVec = sub(p1, p0);
    const segLen = Math.hypot(...dVec);
    if (segLen < 1e-8) return null;
    if (segStartDist + segLen < minReturnDist) return null;
    const u = scale(dVec, 1 / segLen);
    const toOrigin = sub(originP, p0);
    const proj = dot(toOrigin, u);
    const clamped = Math.max(0, Math.min(segLen, proj));
    if (segStartDist + clamped < minReturnDist) return null;
    const closest = add(p0, scale(u, clamped));
    const miss = Math.hypot(...sub(closest, originP));
    if (miss <= selfRadius) {
      const cosAngle = dot(currentDirWorld, launchWorldDir);
      return {
        t: clamped / segLen,
        point: closest,
        distance: segStartDist + clamped,
        cosAngle,
        fromBehind: cosAngle > 0.75
      };
    }
    return null;
  };

  let guard = 0;
  while (traveled < maxDistance - 1e-5 && bounces <= maxBounces && guard++ < 96) {
    const remaining = maxDistance - traveled;
    // Step straight to the next boundary face or maxDistance
    const worldDir = tangentToWorld(cur.frame, dir);
    const nAxis = axisOf(cur.normal);
    let stepDist = remaining;
    let hitFace = null;

    for (let i = 0; i < 4; i++) {
      if (i === nAxis || Math.abs(worldDir[i]) < 1e-10) continue;
      const sign = Math.sign(worldDir[i]);
      const distToFace = (sign * H - cur.p[i]) / worldDir[i];
      if (distToFace > 1e-6 && distToFace < stepDist - 1e-9) {
        stepDist = distToFace;
        hitFace = [0, 0, 0, 0];
        hitFace[i] = sign;
      }
    }

    // Coarse statue intersection check along segment (for Y± cells)
    let hitStatue = false;
    const statueSamples = Math.abs(cur.normal[1]) === 1 ? Math.max(2, Math.ceil(stepDist / 0.12)) : 0;
    for (let s = 1; s <= statueSamples; s++) {
      const dTry = (stepDist * s) / statueSamples;
      const pTry = add(cur.p, scale(worldDir, dTry));
      if (statueBlocked(cur.normal, pTry, 0.05, mode)) {
        stepDist = Math.max(0.02, (stepDist * (s - 1)) / statueSamples);
        hitStatue = true;
        hitFace = null;
        break;
      }
    }

    const nextP = add(cur.p, scale(worldDir, stepDist));
    const selfCheck = checkSelfHit(cur.p, nextP, traveled, worldDir);

    if (selfCheck) {
      const segEnd = selfCheck.point;
      segments.push({
        cell: cellId(cur.normal),
        normal: [...cur.normal],
        frame: cur.frame.map(v => [...v]),
        from4: [...cur.p],
        to4: segEnd,
        startDist: traveled,
        endDist: selfCheck.distance,
        reflected: false,
        hitSelf: true
      });
      traveled = selfCheck.distance;
      hitSelf = true;
      hitSelfFromBehind = selfCheck.fromBehind;
      selfHitAngleCos = selfCheck.cosAngle;
      selfHitDistance = selfCheck.distance;
      break;
    }

    const fromLocal = localPoint(cur, cur.p);
    const toLocal = localPoint(cur, nextP);

    if (hitStatue) {
      segments.push({
        cell: cellId(cur.normal),
        normal: [...cur.normal],
        frame: cur.frame.map(v => [...v]),
        from4: [...cur.p],
        to4: nextP,
        fromLocal,
        toLocal,
        startDist: traveled,
        endDist: traveled + stepDist,
        reflected: true
      });
      cur.p = nextP;
      traveled += stepDist;
      bounces++;
      // Diffuse-like back-reflection off classical statue
      dir = scale(dir, -1);
      continue;
    }

    if (!hitFace) {
      segments.push({
        cell: cellId(cur.normal),
        normal: [...cur.normal],
        frame: cur.frame.map(v => [...v]),
        from4: [...cur.p],
        to4: nextP,
        fromLocal,
        toLocal,
        startDist: traveled,
        endDist: traveled + stepDist,
        reflected: false
      });
      cur.p = nextP;
      traveled += stepDist;
      break;
    }

    const seam = { from: [...cur.normal], to: hitFace, p: [...nextP], frame: cur.frame.map(v => [...v]) };
    const open = canCross(seam);

    segments.push({
      cell: cellId(cur.normal),
      normal: [...cur.normal],
      frame: cur.frame.map(v => [...v]),
      from4: [...cur.p],
      to4: nextP,
      fromLocal,
      toLocal,
      startDist: traveled,
      endDist: traveled + stepDist,
      reflected: !open,
      crossedTo: open ? cellId(hitFace) : null
    });

    traveled += stepDist;
    if (open) {
      cur.frame = transportFrame(cur.frame, cur.normal, hitFace);
      cur.normal = hitFace;
      cur.p = [...nextP];
      cur.p[axisOf(hitFace)] = hitFace[axisOf(hitFace)] * H;
      // Nudge slightly inside next cell to prevent re-hitting boundary face
      const nextWorldDir = tangentToWorld(cur.frame, dir);
      cur.p = add(cur.p, scale(nextWorldDir, 1e-4));
      cur.p[axisOf(cur.normal)] = cur.normal[axisOf(cur.normal)] * H;
      cellsVisited.push(cellId(cur.normal));
    } else {
      bounces++;
      const faceTangentNormal = worldToTangent(cur.frame, hitFace);
      dir = reflect3(dir, faceTangentNormal);
      // Pull back a tiny epsilon off the wall
      const inward = scale(hitFace, -1e-4);
      cur.p = add(nextP, inward);
      cur.p[axisOf(cur.normal)] = cur.normal[axisOf(cur.normal)] * H;
    }
  }

  const geodesicClosed = hitSelf && hitSelfFromBehind && bounces === 0;
  const lightTimeNs = traveled / SPEED_OF_LIGHT_M_PER_NS;

  let verdict = '光束在墙面/玻璃上反射消散。试着对准正前方开口发射！';
  if (geodesicClosed) {
    verdict = `测地闭合验证成功！光束零反射直线飞行 ${traveled.toFixed(2)} m（${lightTimeNs.toFixed(1)} ns），绕行 ${cellsVisited.slice(0, -1).join('→')} 后从你正后方归来——走廊几何完全笔直，绝非弯曲大厅或平面镜！`;
  } else if (hitSelf && bounces > 0) {
    verdict = `光束经 ${bounces} 次反射后回到自身（总光程 ${traveled.toFixed(2)} m）。试着沿正前方无遮挡方向发射，验证零反射直线闭合！`;
  } else if (cellsVisited.length >= 4 && bounces === 0) {
    verdict = `光束零反射连续穿越 ${cellsVisited.length - 1} 道舱门（${cellsVisited.join('→')}），直线传播未触及任何弯壁。`;
  }

  return {
    segments,
    cellsVisited,
    totalDistance: traveled,
    bounces,
    hitSelf,
    hitSelfFromBehind,
    selfHitAngleCos,
    selfHitDistance,
    geodesicClosed,
    lightTimeNs,
    verdict
  };
}

/**
 * Real ballistic (upper 0.5g) / Newtonian zero-G (lower) physical probe ball
 * obeying exact 4D parallel transport across doorways and elastic wall collisions.
 */
export class PhysicsProbe {
  constructor(originState, launchVelocity, { radius = 0.14, mode = 'upper' } = {}) {
    this.state = copyState(originState);
    this.velocity = [...launchVelocity];
    this.radius = radius;
    this.mode = mode;
    this.originCell = cellId(originState.normal);
    this.originP = [...originState.p];
    this.age = 0;
    this.distance = 0;
    this.bounces = 0;
    this.seamsCrossed = 0;
    this.trailCells = [this.originCell];
    this.loopedBack = false;
    this.alive = true;
    this.maxAge = 18;
  }

  step(dt, mode = this.mode) {
    this.mode = mode;
    if (!this.alive || dt <= 0) return { crossed: null, bounced: false, looped: false };
    this.age += dt;
    if (this.age >= this.maxAge) {
      this.alive = false;
      return { crossed: null, bounced: false, looped: false };
    }

    const substeps = Math.max(1, Math.ceil((Math.hypot(...this.velocity) * dt) / 0.08));
    const h = dt / substeps;
    let crossed = null;
    let bounced = false;
    let looped = false;
    const restitution = mode === 'upper' ? 0.72 : 0.90;

    for (let s = 0; s < substeps; s++) {
      // Gravity in upper mode along global -Z, projected into current transported frame
      if (mode === 'upper') {
        const gLocal = worldToTangent(this.state.frame, [0, 0, -GRAVITY, 0]);
        this.velocity[0] += gLocal[0] * h;
        this.velocity[1] += gLocal[1] * h;
        this.velocity[2] += gLocal[2] * h;
      }

      const disp = scale(this.velocity, h);
      const dispLen = Math.hypot(...disp);
      if (dispLen < 1e-9) continue;

      // Component-wise collision & bounce in transported frame
      for (let c = 0; c < 3; c++) {
        const amt = disp[c];
        if (Math.abs(amt) < 1e-10) continue;
        const delta = [0, 0, 0];
        delta[c] = amt;
        const worldStep = tangentToWorld(this.state.frame, delta);
        const res = advance(this.state, delta, {
          canCross: seam => seamAperture(seam.from, seam.to, seam.p, mode, this.radius)
        });
        const destClear =
          positionClear(this.state, add(this.state.p, worldStep), mode, this.radius) &&
          positionClear(res.state, res.state.p, mode, this.radius);

        if (destClear && res.blocked.length === 0) {
          this.state = res.state;
          this.distance += Math.abs(amt);
          if (res.crossings.length > 0) {
            for (const seam of res.crossings) {
              const toId = cellId(seam.to);
              this.seamsCrossed++;
              this.trailCells.push(toId);
              crossed = { from: cellId(seam.from), to: toId };
            }
          }
        } else {
          // Elastic bounce on blocked axis
          this.velocity[c] = -this.velocity[c] * restitution;
          // Rolling friction when resting on floor in upper mode
          if (mode === 'upper' && c === 1 && Math.abs(this.velocity[c]) < 0.25) {
            this.velocity[c] = 0;
            this.velocity[0] *= Math.exp(-0.55 * h);
            this.velocity[2] *= Math.exp(-0.55 * h);
          } else {
            bounced = true;
            this.bounces++;
          }
        }
      }

      // Detect 4-cell geodesic loop return!
      if (!this.loopedBack && this.seamsCrossed >= 4 && cellId(this.state.normal) === this.originCell) {
        const dToOrigin = Math.hypot(...sub(this.state.p, this.originP));
        if (dToOrigin < 2.2) {
          this.loopedBack = true;
          looped = true;
        }
      }
    }

    return { crossed, bounced, looped };
  }
}

/**
 * Compute exact SO(3) rotation angle (degrees) between two orthonormal 3-frames
 * lying in the same 3D tangent hyperplane of a cell.
 */
export function frameRotationDegrees(frameA, frameB) {
  // M_ij = dot(frameA[i], frameB[j]) is orthogonal (det = +1 for same-handedness frames)
  let trace = 0;
  for (let i = 0; i < 3; i++) trace += dot(frameA[i], frameB[i]);
  const cosTheta = Math.max(-1, Math.min(1, (trace - 1) / 2));
  return (Math.acos(cosTheta) * 180) / Math.PI;
}

/**
 * Tracks intrinsic parallel transport holonomy relative to an anchor frame (default W+).
 * Crossing a 3-cell corner loop (e.g., W+ -> X+ -> Y+ -> W+) encircles a Regge curvature
 * deficit edge of the tesseract boundary and yields an EXACT 90° gyroscope rotation!
 */
export class HolonomyTracker {
  constructor(initialState) {
    this.reset(initialState);
  }

  reset(state) {
    this.anchorCell = cellId(state.normal);
    this.anchorFrame = state.frame.map(v => [...v]);
    this.currentPath = [this.anchorCell];
    this.lastHolonomyDeg = 0;
    this.maxHolonomyDeg = 0;
    this.holonomyProved = false;
    this.proofLoop = null;
  }

  onSeam(state) {
    const cid = cellId(state.normal);
    if (this.currentPath[this.currentPath.length - 1] !== cid) {
      this.currentPath.push(cid);
      if (this.currentPath.length > 24) this.currentPath.shift();
    }
    if (cid === this.anchorCell && this.currentPath.length >= 4) {
      const angleDeg = frameRotationDegrees(this.anchorFrame, state.frame);
      this.lastHolonomyDeg = Math.round(angleDeg * 10) / 10;
      if (angleDeg > this.maxHolonomyDeg) this.maxHolonomyDeg = this.lastHolonomyDeg;
      if (angleDeg >= 45 && !this.holonomyProved) {
        this.holonomyProved = true;
        this.proofLoop = [...this.currentPath];
      }
      // Re-anchor for next loop measurement while preserving proof
      const prevLoop = [...this.currentPath];
      this.anchorFrame = state.frame.map(v => [...v]);
      this.currentPath = [cid];
      return { returned: true, angleDeg: this.lastHolonomyDeg, loop: prevLoop, proved: angleDeg >= 45 };
    }
    return { returned: false, angleDeg: this.lastHolonomyDeg, loop: null, proved: false };
  }

  /** Current live deviation if standing in anchorCell */
  liveDeviation(state) {
    if (cellId(state.normal) !== this.anchorCell) return null;
    return Math.round(frameRotationDegrees(this.anchorFrame, state.frame) * 10) / 10;
  }
}

/**
 * Scientific Evidence & Hypothesis Falsification Matrix.
 * Connects physical observations directly to the four candidate world models.
 */
export const EVIDENCE_ITEMS = Object.freeze([
  {
    id: 'geodesic_loop',
    title: '① 24m 直线测地闭合',
    how: '沿正前方发射激光脉冲 (L) 或投掷探测球 (G)，观测零反射绕行 4 室并从正后方归来',
    summary: '光束与惯性体零反射直行 24.0 m 从背后返回——走廊无三维弯折，也非平面镜反射。',
    compatibility: {
      'central-hall': 'conflict',
      'treadmill': 'partial',
      'sphere': 'conflict',
      'colored-tesseract': 'match'
    },
    reasons: {
      'central-hall': '弯道大厅中直线光线会撞击外墙，无法零反射闭环',
      'treadmill': '无法在不引入镜面/传送的情况下解释笔直连通的 24m 光路',
      'sphere': '球壳赤道存在径向弯曲，直线光束会离开地板撞上壳顶',
      'colored-tesseract': '八胞边界内每胞与过门局部平直，四胞直行恰好构成 24m 闭合测地线'
    }
  },
  {
    id: 'chiral_self',
    title: '② 同手性 24m 背影自像',
    how: '面向前方 24m 处的自己，按左/右键挥手（配合 Tab 望远镜近观）',
    summary: '你举起左手（红袖标），前方身影举起同一侧左手并背对你——定向保手性闭环，绝非镜面反转。',
    compatibility: {
      'central-hall': 'partial',
      'treadmill': 'conflict',
      'sphere': 'partial',
      'colored-tesseract': 'match'
    },
    reasons: {
      'central-hall': '仅能说明无镜面反射，仍无法解释光线如何沿弯道直行',
      'treadmill': '若用镜面营造无限走廊，必然呈现正面与左右反转',
      'sphere': '可保手性，但同样缺少沿曲壳自动贴壁的直线光路',
      'colored-tesseract': '超立方体边界是可定向流形（det=+1），绕行后手性保持且可见自身背影'
    }
  },
  {
    id: 'side_rotation',
    title: '③ 侧室雕像 90° 四步周期',
    how: '沿主环走过至少 3 间不同房间，观察两侧玻璃窗外的维纳斯与大卫朝向',
    summary: '每直行穿过一扇门，左右两座雕像相对你分别顺/逆时针转过 90°，4 步后精确复原。',
    compatibility: {
      'central-hall': 'partial',
      'treadmill': 'match',
      'sphere': 'match',
      'colored-tesseract': 'match'
    },
    reasons: {
      'central-hall': '仅解释内侧一间中央大厅，无法让左右两侧雕像同时保持单一不变的邻室',
      'treadmill': '靠外力同步旋转侧室勉强拟合，但缺乏驱动与惯性机制',
      'sphere': '赤道绕行确实会让南北两极每次转过 90°，但无法扩展到 6 个方向',
      'colored-tesseract': '跨门 4D 平行移动（XW 平面 90° 转向）自然导致 Y± 侧室朝向旋转 90°'
    }
  },
  {
    id: 'holonomy_90',
    title: '④ 三胞角环 90° 空间曲率和乐',
    how: '在零重力六向漂航中，飞完一条 3 室三角回路（如 W+→X+→Y+→W+），查看惯性陀螺仪',
    summary: '不主动旋转身体，仅穿 3 扇门回到原室，惯性陀螺仪偏转精确 90°！这是离散正曲率三维流形的铁证。',
    lowerOnly: true,
    compatibility: {
      'central-hall': 'conflict',
      'treadmill': 'conflict',
      'sphere': 'conflict',
      'colored-tesseract': 'match'
    },
    reasons: {
      'central-hall': '平直三维空间任意平移闭环和乐角恒为 0°',
      'treadmill': '平直三维传送带空间不存在非零平行移动和乐',
      'sphere': '普通二维球壳不包含三个互相垂直的 6 向立方胞连接',
      'colored-tesseract': '绕超立方体棱的 3 胞环路包围 π/2 雷吉曲率亏角，必然产生 90° 平行移动和乐！'
    }
  }
]);

export class EvidenceLog {
  constructor() {
    this.reset();
  }

  reset() {
    this.discovered = new Set();
    this.measurements = {};
    this.visitedLoopCells = new Set(['W+']);
    this.playerGuess = null;
  }

  record(id, detail = '') {
    const isNew = !this.discovered.has(id);
    this.discovered.add(id);
    if (detail) this.measurements[id] = detail;
    return isNew;
  }

  noteCell(cell) {
    if (['W+', 'X+', 'W-', 'X-'].includes(cell)) {
      this.visitedLoopCells.add(cell);
      if (this.visitedLoopCells.size >= 3) {
        return this.record('side_rotation', `已跨 ${this.visitedLoopCells.size} 室比对 Y+/Y− 雕像朝向`);
      }
    }
    return false;
  }

  setGuess(hypothesisBase) {
    this.playerGuess = hypothesisBase;
    return this.evaluateGuess(hypothesisBase);
  }

  evaluateGuess(hypothesisBase) {
    const conflicts = [];
    const matches = [];
    for (const item of EVIDENCE_ITEMS) {
      if (!this.discovered.has(item.id)) continue;
      const status = item.compatibility[hypothesisBase];
      if (status === 'conflict') conflicts.push({ id: item.id, title: item.title, reason: item.reasons[hypothesisBase] });
      else if (status === 'match') matches.push({ id: item.id, title: item.title, reason: item.reasons[hypothesisBase] });
    }
    return { hypothesisBase, conflicts, matches, consistent: conflicts.length === 0 && matches.length > 0 };
  }

  serialize() {
    return {
      discovered: [...this.discovered],
      measurements: { ...this.measurements },
      visitedLoopCells: [...this.visitedLoopCells],
      playerGuess: this.playerGuess
    };
  }

  restore(data) {
    if (!data || typeof data !== 'object') return;
    this.discovered = new Set(Array.isArray(data.discovered) ? data.discovered : []);
    this.measurements = data.measurements && typeof data.measurements === 'object' ? { ...data.measurements } : {};
    this.visitedLoopCells = new Set(Array.isArray(data.visitedLoopCells) ? data.visitedLoopCells : ['W+']);
    this.playerGuess = data.playerGuess || null;
  }
}
