/**
 * Player-Centric First-Person 6-Door Navigation Compass for Chapter 1:
 * 《回廊空间站》——「外壳上的迷宫」
 *
 * Replaces the tangled 8-node 24-edge spiderweb graph with an intuitive,
 * real-time first-person 6-directional door navigator:
 *  - Center Circle: Current room (`当前所在：绿室 Y-`) with room theme color & forward chevron
 *  - 4 Horizontal Cardinal Doors (rotated dynamically by player look orientation in `state.frame`,
 *    supporting BOTH grounded yaw in Phase 1 AND full 6-DOF zero-G free flight `look.basis()` in Phase 2/3!):
 *      Top    (`▲ 前门`): Doorway directly ahead of your crosshair
 *      Bottom (`▼ 后门`): Doorway directly behind you
 *      Left   (`◀ 左门`): Doorway to your left
 *      Right  (`▶ 右门`): Doorway to your right
 *  - 2 Vertical Hatch Doors:
 *      Top-Left  (`↑ 头顶门`): Hatch above your head
 *      Top-Right (`↓ 脚下门`): Hatch below your feet
 *  - Dashed Antipodal Blind-Spot Bar (`◎ 对面盲区（无门直通·需走2步）`):
 *      Explicitly displays the single opposite room with NO direct doorway from the current room.
 *  - Stage-Adaptive Guidance Badges:
 *      Stages 1 & 2 (Survey): `✓ 已到访` vs pulsing `★ 未去过（推荐）`
 *      Stage 3 (Hamiltonian 8-Room Tour): `✗ 已走过（勿进）` vs `★ 可通行` + 8-room progress bar
 */
import { CELL_COLORS } from './colored-tesseract.js';
import {
  CELL_IDS,
  cellId,
  normalFor,
  scale,
  dot,
  canonicalFrame,
  initialState,
  tangentToWorld
} from './chapter-topology.js';
import { viewBasis } from './chapter-motion.js';

export const COMPASS_LOGICAL_W = 336;
export const COMPASS_LOGICAL_H = 372;

export const ROOM_META = Object.freeze({
  'W+': Object.freeze({ id: 'W+', name: '白室', short: '白室 W+', tag: '净白 W+', color: CELL_COLORS['W+'] }),
  'W-': Object.freeze({ id: 'W-', name: '黄室', short: '黄室 W-', tag: '流金 W-', color: CELL_COLORS['W-'] }),
  'X+': Object.freeze({ id: 'X+', name: '红室', short: '红室 X+', tag: '赤红 X+', color: CELL_COLORS['X+'] }),
  'X-': Object.freeze({ id: 'X-', name: '橙室', short: '橙室 X-', tag: '暖橙 X-', color: CELL_COLORS['X-'] }),
  'Y+': Object.freeze({ id: 'Y+', name: '蓝室', short: '蓝室 Y+', tag: '湛蓝 Y+', color: CELL_COLORS['Y+'] }),
  'Y-': Object.freeze({ id: 'Y-', name: '绿室', short: '绿室 Y-', tag: '翠绿 Y-', color: CELL_COLORS['Y-'] }),
  'Z+': Object.freeze({ id: 'Z+', name: '紫室', short: '紫室 Z+', tag: '晶紫 Z+', color: CELL_COLORS['Z+'] }),
  'Z-': Object.freeze({ id: 'Z-', name: '青室', short: '青室 Z-', tag: '冰青 Z-', color: CELL_COLORS['Z-'] })
});

const UPPER_LOOP_SET = new Set(['W+', 'X+', 'W-', 'X-']);

function resolveYaw(yawOrLook) {
  if (typeof yawOrLook === 'number' && Number.isFinite(yawOrLook)) return yawOrLook;
  if (yawOrLook && typeof yawOrLook === 'object' && Number.isFinite(yawOrLook.yaw)) {
    return yawOrLook.yaw;
  }
  return 0;
}

function pickBestFace(dir4, candidates, excludedIds) {
  let best = null;
  let bestDot = -Infinity;
  for (const c of candidates) {
    if (excludedIds.has(c.id)) continue;
    const d = dot(dir4, c.vec4);
    if (d > bestDot) {
      bestDot = d;
      best = c;
    }
  }
  return best || candidates.find(c => !excludedIds.has(c.id)) || candidates[0];
}

function oppositeFaceId(vec4) {
  return cellId(scale(vec4, -1));
}

function buildDoorStatus(targetId, {
  currentId,
  isUpper,
  isRouteStage,
  visitedSet,
  routeSet,
  counts,
  directionKey
}) {
  const meta = ROOM_META[targetId];
  const visitCount = Math.max(0, Number(counts?.[targetId] ?? (visitedSet.has(targetId) ? 1 : 0)));

  if (isRouteStage) {
    const alreadyInRoute = routeSet.has(targetId);
    return {
      cellId: targetId,
      name: meta.name,
      short: meta.short,
      color: meta.color,
      direction: directionKey,
      visited: alreadyInRoute || visitCount > 0,
      visitedInRoute: alreadyInRoute,
      safeForRoute: !alreadyInRoute,
      recommended: !alreadyInRoute,
      visitCount,
      statusKey: alreadyInRoute ? 'route_forbidden' : 'route_safe',
      badgeText: alreadyInRoute ? '✗ 已走过（勿进）' : '★ 可通行',
      badgeColor: alreadyInRoute ? '#ff6b6b' : '#69f0ae'
    };
  }

  // In Phase 1 (upper corridor loop), only W+/X+/W-/X- doors are open; Y± and Z± are glass observation windows!
  if (isUpper && !UPPER_LOOP_SET.has(targetId)) {
    return {
      cellId: targetId,
      name: meta.name,
      short: meta.short,
      color: meta.color,
      direction: directionKey,
      visited: false,
      visitedInRoute: false,
      safeForRoute: false,
      recommended: false,
      visitCount: 0,
      statusKey: 'upper_window',
      badgeText: '玻璃舷窗（封闭）',
      badgeColor: '#98b4bc'
    };
  }

  const visited = visitedSet.has(targetId) || visitCount > 0 || targetId === currentId;
  const fullySurveyed = !isUpper && visitCount >= 3;
  return {
    cellId: targetId,
    name: meta.name,
    short: meta.short,
    color: meta.color,
    direction: directionKey,
    visited,
    visitedInRoute: false,
    safeForRoute: true,
    recommended: !visited || (!isUpper && visitCount < 3),
    visitCount,
    statusKey: visited ? (fullySurveyed ? 'surveyed_3x' : 'visited') : 'unvisited_recommend',
    badgeText: visited
      ? (!isUpper && counts && typeof counts[targetId] === 'number'
          ? (visitCount >= 3 ? `✓ 已查全 (${visitCount}/3)` : `✓ 已到访 (${visitCount}/3)`)
          : '✓ 已到访')
      : '★ 未去过（推荐）',
    badgeColor: visited ? (fullySurveyed ? '#69f0ae' : '#80ccb9') : '#ffd54f'
  };
}

/**
 * Pure deterministic calculator for the Player-Centric First-Person 6-Door Navigation Compass.
 * Guarantees all 6 doors (`front, back, left, right, up, down`) map bijectively to the
 * 6 distinct neighboring rooms matching the player's actual camera orientation (both
 * gravity-grounded yaw AND 6-DOF zero-G free-flight basis!).
 *
 * @param {string|number[]} cellOrNormal - Current cell ID (e.g. 'Y-', 'W+') or 4D normal vector
 * @param {number[][]} [frame] - Orthonormal 3x4 tangent frame `[right4, up4, forward4]`
 * @param {number|object} [yawOrLook=0] - Player horizontal yaw angle in radians OR LookController
 * @param {object} [progressState={}] - Progress snapshot or test state
 */
export function computeSixDoorCompass(cellOrNormal = 'W+', frame = null, yawOrLook = 0, progressState = {}) {
  const normal = normalFor(cellOrNormal || 'W+');
  const currentId = cellId(normal);
  const activeFrame = (Array.isArray(frame) && frame.length === 3)
    ? frame
    : (currentId === 'W+' ? initialState().frame : canonicalFrame(normal));

  const yaw = resolveYaw(yawOrLook);
  const isFreeFlightLook = Boolean(yawOrLook && typeof yawOrLook === 'object' && yawOrLook.free && typeof yawOrLook.basis === 'function');

  let frontId, backId, leftId, rightId, upId, downId;

  if (isFreeFlightLook) {
    // Full 6-DOF zero-G orientation: map camera { forward, up, right } bijectively onto all 6 room faces!
    const basis = viewBasis(yawOrLook);
    const worldFwd = tangentToWorld(activeFrame, basis.forward);
    const worldUp = tangentToWorld(activeFrame, basis.up);
    const worldRight = tangentToWorld(activeFrame, basis.right);

    const allSix = [
      { vec4: activeFrame[2], id: cellId(activeFrame[2]) },
      { vec4: scale(activeFrame[2], -1), id: cellId(scale(activeFrame[2], -1)) },
      { vec4: activeFrame[0], id: cellId(activeFrame[0]) },
      { vec4: scale(activeFrame[0], -1), id: cellId(scale(activeFrame[0], -1)) },
      { vec4: activeFrame[1], id: cellId(activeFrame[1]) },
      { vec4: scale(activeFrame[1], -1), id: cellId(scale(activeFrame[1], -1)) }
    ];

    const used = new Set();
    const frontFace = pickBestFace(worldFwd, allSix, used);
    frontId = frontFace.id;
    backId = oppositeFaceId(frontFace.vec4);
    used.add(frontId);
    used.add(backId);

    const upFace = pickBestFace(worldUp, allSix, used);
    upId = upFace.id;
    downId = oppositeFaceId(upFace.vec4);
    used.add(upId);
    used.add(downId);

    const rightFace = pickBestFace(worldRight, allSix, used);
    rightId = rightFace.id;
    leftId = oppositeFaceId(rightFace.vec4);
  } else {
    // Gravity-grounded mode (or scalar yaw input): ceiling/floor stay aligned to gravity,
    // while Front/Back/Left/Right dynamically rotate with player horizontal yaw!
    const horizBasis = viewBasis(yaw, 0);
    const worldFwd = tangentToWorld(activeFrame, horizBasis.forward);
    const worldRight = tangentToWorld(activeFrame, horizBasis.right);

    const horizFour = [
      { vec4: activeFrame[2], id: cellId(activeFrame[2]) },
      { vec4: scale(activeFrame[2], -1), id: cellId(scale(activeFrame[2], -1)) },
      { vec4: activeFrame[0], id: cellId(activeFrame[0]) },
      { vec4: scale(activeFrame[0], -1), id: cellId(scale(activeFrame[0], -1)) }
    ];

    const used = new Set();
    const frontFace = pickBestFace(worldFwd, horizFour, used);
    frontId = frontFace.id;
    backId = oppositeFaceId(frontFace.vec4);
    used.add(frontId);
    used.add(backId);

    const rightFace = pickBestFace(worldRight, horizFour, used);
    rightId = rightFace.id;
    leftId = oppositeFaceId(rightFace.vec4);

    upId = cellId(activeFrame[1]);
    downId = cellId(scale(activeFrame[1], -1));
  }

  const antipodeId = cellId(scale(normal, -1));

  // Normalize progress state across live ChapterProgress.snapshot() and unit test inputs
  const isUpper = progressState?.phase === 'upper' && progressState?.stage !== 2 && progressState?.stage !== 3;
  const routeArr = progressState?.routeTrail || progressState?.routeCells || [];
  const isRouteStage = Boolean(
    progressState?.routeActive ||
    progressState?.stage === 3 ||
    progressState?.mode === 'route' ||
    (Array.isArray(progressState?.routeCells) && progressState.routeCells.length > 0 && progressState?.stage !== 1 && progressState?.stage !== 2)
  );
  const routeSet = new Set(routeArr);

  const visitedSet = new Set();
  if (progressState?.visitedCells) {
    for (const c of progressState.visitedCells) visitedSet.add(c);
  }
  if (progressState?.counts) {
    for (const [cid, cnt] of Object.entries(progressState.counts)) {
      if (cnt > 0) visitedSet.add(cid);
    }
  }
  if (Array.isArray(progressState?.inspected)) {
    for (const c of progressState.inspected) visitedSet.add(c);
  }
  visitedSet.add(currentId);

  const ctx = {
    currentId,
    isUpper,
    isRouteStage,
    visitedSet,
    routeSet,
    counts: progressState?.counts || null
  };

  const doors = {
    front: { label: '▲ 正前门', ...buildDoorStatus(frontId, { ...ctx, directionKey: 'front' }) },
    back:  { label: '▼ 身后门', ...buildDoorStatus(backId,  { ...ctx, directionKey: 'back' }) },
    left:  { label: '◀ 左侧门', ...buildDoorStatus(leftId,  { ...ctx, directionKey: 'left' }) },
    right: { label: '▶ 右侧门', ...buildDoorStatus(rightId, { ...ctx, directionKey: 'right' }) },
    up:    { label: '↑ 头顶门', ...buildDoorStatus(upId,    { ...ctx, directionKey: 'up' }) },
    down:  { label: '↓ 脚下门', ...buildDoorStatus(downId,  { ...ctx, directionKey: 'down' }) }
  };

  const antipodeMeta = ROOM_META[antipodeId];
  const antipode = {
    cellId: antipodeId,
    name: antipodeMeta.name,
    short: antipodeMeta.short,
    color: antipodeMeta.color,
    stepsRequired: 2,
    label: `◎ 对面盲区胞（无门直通·需走2步）：${antipodeMeta.short}`,
    visited: isRouteStage ? routeSet.has(antipodeId) : visitedSet.has(antipodeId)
  };

  const checkedCells = CELL_IDS.filter(cid =>
    isRouteStage ? routeSet.has(cid) : visitedSet.has(cid)
  );

  return {
    current: {
      cellId: currentId,
      name: ROOM_META[currentId].name,
      short: ROOM_META[currentId].short,
      color: ROOM_META[currentId].color,
      label: `当前：${ROOM_META[currentId].short}`
    },
    yaw,
    isFreeFlightLook,
    stage: isRouteStage ? 3 : (isUpper ? 1 : 2),
    isRouteStage,
    doors,
    antipode,
    progressBar: {
      count: checkedCells.length,
      total: 8,
      checkedCells,
      label: isRouteStage
        ? `8 室一笔画路线进度：${checkedCells.length}/8`
        : `8 室探索打卡进度：${checkedCells.length}/8`
    }
  };
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export class TopologyRadar {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this._syncHiDPI();
  }

  _syncHiDPI() {
    const dpr = Math.min(Math.max((typeof window !== 'undefined' && window.devicePixelRatio) || 1, 1), 2);
    const targetW = Math.round(COMPASS_LOGICAL_W * dpr);
    const targetH = Math.round(COMPASS_LOGICAL_H * dpr);
    if (this.canvas.width !== targetW || this.canvas.height !== targetH) {
      this.canvas.width = targetW;
      this.canvas.height = targetH;
    }
    this.dpr = dpr;
  }

  render({ state, look = null, time = 0, progress = {}, routeTimerSec = 0 }) {
    this._syncHiDPI();
    const ctx = this.ctx;
    const w = COMPASS_LOGICAL_W;
    const h = COMPASS_LOGICAL_H;

    ctx.save();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const model = computeSixDoorCompass(state?.normal || 'W+', state?.frame, look, progress);
    const pulse = 0.65 + 0.35 * Math.sin((time || 0) * 4.2);

    // Rich dark glass backdrop
    ctx.fillStyle = 'rgba(6, 17, 27, 0.96)';
    ctx.fillRect(0, 0, w, h);

    // Subtle radial focus glow behind center compass
    const centerX = w * 0.5;
    const centerY = 176;
    const bgGrad = ctx.createRadialGradient(centerX, centerY, 16, centerX, centerY, 128);
    bgGrad.addColorStop(0, 'rgba(77, 230, 211, 0.14)');
    bgGrad.addColorStop(1, 'rgba(6, 17, 27, 0)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 62, w, 224);

    // Helper to draw each of the 6 directional door cards with crisp legibility
    const drawDoorCard = (door, cx, cy, cardW, cardH) => {
      const x = cx - cardW * 0.5;
      const y = cy - cardH * 0.5;
      const isForbidden = door.statusKey === 'route_forbidden';
      const isHighlight = door.statusKey === 'route_safe' || door.statusKey === 'unvisited_recommend';
      const isWindow = door.statusKey === 'upper_window';

      ctx.save();
      drawRoundedRect(ctx, x, y, cardW, cardH, 8);
      ctx.fillStyle = isForbidden
        ? 'rgba(54, 17, 24, 0.94)'
        : isWindow
          ? 'rgba(14, 24, 34, 0.80)'
          : isHighlight
            ? 'rgba(15, 48, 56, 0.96)'
            : 'rgba(11, 29, 43, 0.94)';
      ctx.fill();

      ctx.lineWidth = isHighlight ? 2.2 : 1.5;
      ctx.strokeStyle = isForbidden
        ? '#ff5252'
        : isWindow
          ? 'rgba(130, 160, 172, 0.42)'
          : isHighlight
            ? (door.statusKey === 'route_safe' ? '#69f0ae' : `rgba(255, 213, 79, ${0.58 + 0.42 * pulse})`)
            : door.color;
      ctx.stroke();

      // Left color stripe matching target room palette
      drawRoundedRect(ctx, x + 4, y + 5, 5, cardH - 10, 2.5);
      ctx.fillStyle = door.color;
      ctx.globalAlpha = isForbidden ? 0.5 : 1;
      ctx.fill();
      ctx.globalAlpha = 1;

      const textX = cx + 3;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Direction label
      ctx.fillStyle = '#c4e0e6';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(door.label, textX, y + 12);

      // Room color + short code
      ctx.fillStyle = isForbidden ? '#d9a0a4' : door.color;
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(door.short, textX, y + cardH * 0.52);

      // Exploration / Route guidance status badge
      ctx.fillStyle = door.badgeColor;
      ctx.font = 'bold 10.5px sans-serif';
      ctx.fillText(door.badgeText, textX, y + cardH - 9);
      ctx.restore();
    };

    // 1. Top Row: Vertical Hatches (↑ 头顶门 on Top-Left, ↓ 脚下门 on Top-Right) — 12px gap, zero overlap
    drawDoorCard(model.doors.up, 87, 35, 150, 52);
    drawDoorCard(model.doors.down, w - 87, 35, 150, 52);

    // Subtle divider separating Vertical Hatches from Horizontal 4-Door Cross
    ctx.strokeStyle = 'rgba(128, 204, 185, 0.16)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(14, 67);
    ctx.lineTo(w - 14, 67);
    ctx.stroke();

    // 2. Central First-Person Horizontal 4-Door Cross Compass
    const ringR = 54;
    ctx.strokeStyle = 'rgba(128, 204, 185, 0.22)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(centerX, centerY, ringR, 0, Math.PI * 2);
    ctx.stroke();

    // Connecting directional spokes from Center Circle to Front / Back / Left / Right doors
    const spokes = [
      [centerX, centerY - 38, centerX, centerY - 52, model.doors.front],
      [centerX, centerY + 38, centerX, centerY + 52, model.doors.back],
      [centerX - 38, centerY, centerX - 56, centerY, model.doors.left],
      [centerX + 38, centerY, centerX + 56, centerY, model.doors.right]
    ];
    for (const [x1, y1, x2, y2, d] of spokes) {
      ctx.strokeStyle = d.statusKey === 'route_forbidden' ? 'rgba(255, 82, 82, 0.6)' : d.color;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // Four Cardinal Horizontal Door Cards around the Center Circle (zero overlap!)
    drawDoorCard(model.doors.front, centerX, 99, 124, 50);
    drawDoorCard(model.doors.back,  centerX, 253, 124, 50);
    drawDoorCard(model.doors.left,  60, centerY, 104, 56);
    drawDoorCard(model.doors.right, w - 60, centerY, 104, 56);

    // Center Circle: Current Room (`当前所在` + bold colored `绿室 Y-`)
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, 38, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(9, 27, 40, 0.99)';
    ctx.fill();
    ctx.lineWidth = 3.2;
    ctx.strokeStyle = model.current.color;
    ctx.stroke();

    // Forward view pointer chevron pointing straight toward ▲ 正前门
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - 43);
    ctx.lineTo(centerX - 6.5, centerY - 32);
    ctx.lineTo(centerX + 6.5, centerY - 32);
    ctx.closePath();
    ctx.fill();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#a9cfd6';
    ctx.font = 'bold 10.5px sans-serif';
    ctx.fillText('当前所在', centerX, centerY - 10);

    ctx.fillStyle = model.current.color;
    ctx.font = 'bold 14.5px sans-serif';
    ctx.fillText(model.current.short, centerX, centerY + 9);
    ctx.restore();

    // 3. Dashed Antipodal Blind-Spot Bar (`◎ 对面盲区（无门直通·需走2步）`)
    const antiY = 286;
    const antiH = 34;
    ctx.save();
    ctx.setLineDash([5, 4]);
    drawRoundedRect(ctx, 12, antiY, w - 24, antiH, 7);
    ctx.fillStyle = 'rgba(14, 26, 38, 0.92)';
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = model.antipode.color;
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#cde3e8';
    ctx.font = 'bold 11.5px sans-serif';
    ctx.fillText('◎ 对面盲区（无门直通·需2步）:', 20, antiY + antiH * 0.5);

    ctx.textAlign = 'right';
    ctx.fillStyle = model.antipode.color;
    ctx.font = 'bold 13.5px sans-serif';
    ctx.fillText(model.antipode.short, w - 20, antiY + antiH * 0.5);
    ctx.restore();

    // 4. Bottom 8-Room Check-In Progress Bar (1/8 → 8/8)
    const barY = 327;
    ctx.fillStyle = '#dff5f1';
    ctx.font = 'bold 11.5px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(model.progressBar.label, 14, barY + 11);

    if (model.isRouteStage || progress.routeComplete) {
      ctx.textAlign = 'right';
      ctx.fillStyle = '#f7c346';
      ctx.fillText(`${routeTimerSec.toFixed(1)}s`, w - 14, barY + 11);
    }

    const slotW = (w - 28 - 7 * 4) / 8;
    const slotY = barY + 17;
    CELL_IDS.forEach((cid, idx) => {
      const sx = 14 + idx * (slotW + 4);
      const done = model.progressBar.checkedCells.includes(cid);
      const isCur = cid === model.current.cellId;
      drawRoundedRect(ctx, sx, slotY, slotW, 20, 4);
      ctx.fillStyle = done ? 'rgba(30, 82, 78, 0.94)' : 'rgba(13, 28, 40, 0.88)';
      ctx.fill();
      ctx.lineWidth = isCur ? 2.2 : 1.2;
      ctx.strokeStyle = isCur ? '#ffffff' : (done ? CELL_COLORS[cid] : 'rgba(128, 168, 180, 0.35)');
      ctx.stroke();

      ctx.fillStyle = done ? CELL_COLORS[cid] : '#7e9fa8';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(cid, sx + slotW * 0.5, slotY + 10.5);
    });

    ctx.restore();
  }
}

// ============================================================
// 3D Static 8-Cell Tesseract Map + Live Hamiltonian Route Hint
// ============================================================
export const TESSERACT_MAP_W = 336;
export const TESSERACT_MAP_H = 252;

const ANTIPODE_PAIR = Object.freeze({
  'W+': 'W-', 'W-': 'W+',
  'X+': 'X-', 'X-': 'X+',
  'Y+': 'Y-', 'Y-': 'Y+',
  'Z+': 'Z-', 'Z-': 'Z+'
});

// Ultra-intuitive 2-loop Hamiltonian cycle:
// Loop 1 (familiar straight XW corridor): W+ -> X+ -> W- -> X-
// Loop 2 (perpendicular ZY ring):        Z- -> Y- -> Z+ -> Y+ (adjacent right back to W+ mirror bubble!)
export const CANONICAL_HAMILTONIAN_PATH = Object.freeze([
  'W+', 'X+', 'W-', 'X-', 'Z-', 'Y-', 'Z+', 'Y+'
]);

export function areCellsAdjacent(a, b) {
  return Boolean(a && b && a !== b && ANTIPODE_PAIR[a] !== b && ROOM_META[a] && ROOM_META[b]);
}

/**
 * Pure deterministic Hamiltonian 8-cell non-repeating route solver for Chapter 1's final challenge.
 * - If player is mid-route (`routeActive` with valid `routeTrail`), computes an exact valid completion
 *   from their current trail without repeating any cell or hitting an antipodal dead-end.
 * - If the current trail is dead-ended (e.g. last unvisited cell is antipodal to current cell),
 *   flags `deadEnd: true` and returns the canonical guaranteed 8-cell solution starting at `W+`.
 */
export function computeHamiltonianRouteHint(progressState = {}) {
  const isRouteActive = Boolean(progressState?.routeActive);
  const routeComplete = Boolean(progressState?.routeComplete);
  const rawTrail = Array.isArray(progressState?.routeTrail) ? progressState.routeTrail.filter(c => ROOM_META[c]) : [];

  if (routeComplete && rawTrail.length === 8) {
    return {
      status: 'complete',
      deadEnd: false,
      walkedCount: 8,
      path: [...rawTrail],
      nextCell: null
    };
  }

  if (isRouteActive && rawTrail.length > 0 && rawTrail.length < 8) {
    // Prefer canonical 2-loop order; first seek a full cycle ending adjacent to W+ (mirror bubble), then any valid path
    const order = CANONICAL_HAMILTONIAN_PATH;

    const solve = (requireReturnToWPlus) => {
      const visited = new Set(rawTrail);
      const path = [...rawTrail];
      function dfs() {
        if (path.length === 8) {
          return !requireReturnToWPlus || areCellsAdjacent(path[7], 'W+');
        }
        const cur = path[path.length - 1];
        for (const nxt of order) {
          if (visited.has(nxt) || !areCellsAdjacent(cur, nxt)) continue;
          visited.add(nxt);
          path.push(nxt);
          if (dfs()) return true;
          path.pop();
          visited.delete(nxt);
        }
        return false;
      }
      return dfs() ? path : null;
    };

    const solved = solve(true) || solve(false);
    if (solved) {
      return {
        status: 'live',
        deadEnd: false,
        walkedCount: rawTrail.length,
        path: solved,
        nextCell: solved[rawTrail.length] || null,
        closesToStart: areCellsAdjacent(solved[7], 'W+')
      };
    }

    return {
      status: 'deadend',
      deadEnd: true,
      walkedCount: 0,
      path: [...CANONICAL_HAMILTONIAN_PATH],
      nextCell: 'W+',
      closesToStart: true
    };
  }

  return {
    status: 'canonical',
    deadEnd: false,
    walkedCount: 0,
    path: [...CANONICAL_HAMILTONIAN_PATH],
    nextCell: CANONICAL_HAMILTONIAN_PATH[1],
    closesToStart: true
  };
}

// Static Schlegel 3D coordinates of the 8-Cell Tesseract (Cube-inside-Cube)
const INNER_S = 0.44;
const OUTER_S = 1.00;
const CUBE_SIGNS = [
  [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
  [-1, -1, 1],  [1, -1, 1],  [1, 1, 1],  [-1, 1, 1]
];
const CUBE_EDGES = [
  [0, 1], [1, 2], [2, 3], [3, 0],
  [4, 5], [5, 6], [6, 7], [7, 4],
  [0, 4], [1, 5], [2, 6], [3, 7]
];

// 3D anchor points for the 8 distinct cells (carefully positioned inside each Schlegel frustum so all 8 badges & arrows have >= 42px separation!)
const CELL_ANCHORS_3D = Object.freeze({
  'W+': [ 0.00,  0.00,  0.00], // Inner white cube center
  'X+': [ 0.84, -0.04,  0.06], // Front-right red frustum
  'X-': [-0.84,  0.04, -0.06], // Back-left orange frustum
  'Z+': [ 0.00,  0.84,  0.00], // Top purple frustum
  'Z-': [ 0.00, -0.84,  0.00], // Bottom cyan frustum
  'Y+': [ 0.16,  0.22, -0.88], // Back-right-up blue frustum (z < 0)
  'Y-': [-0.16, -0.22,  0.88], // Front-left-down green frustum (z > 0)
  'W-': [ 1.62,  0.66, -0.15]  // Outer yellow enclosing 8th cell badge outside the outer cube
});

// Frustum face vertex indices (outer face quad) used to softly tint visited cells
const CELL_FACE_QUADS = Object.freeze({
  'X+': [1, 2, 6, 5],
  'X-': [0, 4, 7, 3],
  'Z+': [3, 7, 6, 2],
  'Z-': [0, 1, 5, 4],
  'Y+': [0, 1, 2, 3],
  'Y-': [4, 5, 6, 7]
});

export class TesseractStaticMap {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this._syncHiDPI();
  }

  _syncHiDPI() {
    const dpr = Math.min(Math.max((typeof window !== 'undefined' && window.devicePixelRatio) || 1, 1), 2);
    const targetW = Math.round(TESSERACT_MAP_W * dpr);
    const targetH = Math.round(TESSERACT_MAP_H * dpr);
    if (this.canvas.width !== targetW || this.canvas.height !== targetH) {
      this.canvas.width = targetW;
      this.canvas.height = targetH;
    }
    this.dpr = dpr;
  }

  _project([x, y, z], cx, cy, scalePx) {
    // Fixed static 3D camera angle (yaw = +31°, pitch = +27°) for crisp unobstructed Schlegel depth
    const cyaw = Math.cos(0.54), syaw = Math.sin(0.54);
    const cpitch = Math.cos(0.47), spitch = Math.sin(0.47);
    const rx = x * cyaw - z * syaw;
    const rz0 = x * syaw + z * cyaw;
    const ry = y * cpitch - rz0 * spitch;
    const rz = y * spitch + rz0 * cpitch;
    const persp = 4.6 / (4.6 - rz);
    return {
      x: cx + rx * scalePx * persp,
      y: cy - ry * scalePx * persp,
      z: rz
    };
  }

  _drawArrowSegment(ctx, p1, p2, color, { width = 2.6, dashed = false, dashOffset = 0, arrow = true, shrink = 13 } = {}) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy);
    if (len < shrink * 2 + 4) return;
    const ux = dx / len;
    const uy = dy / len;
    const sx = p1.x + ux * shrink;
    const sy = p1.y + uy * shrink;
    const ex = p2.x - ux * shrink;
    const ey = p2.y - uy * shrink;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    if (dashed) {
      ctx.setLineDash([6, 4]);
      ctx.lineDashOffset = dashOffset;
    }
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.setLineDash([]);

    if (arrow) {
      const headLen = 7.5;
      const angle = Math.atan2(ey - sy, ex - sx);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex - headLen * Math.cos(angle - 0.45), ey - headLen * Math.sin(angle - 0.45));
      ctx.lineTo(ex - headLen * Math.cos(angle + 0.45), ey - headLen * Math.sin(angle + 0.45));
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  render({ state, progress = {}, time = 0, showHint = false }) {
    this._syncHiDPI();
    const ctx = this.ctx;
    const w = TESSERACT_MAP_W;
    const h = TESSERACT_MAP_H;

    ctx.save();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // Dark tactical slate backdrop
    ctx.fillStyle = 'rgba(6, 17, 27, 0.96)';
    ctx.fillRect(0, 0, w, h);

    const cx = w * 0.44;
    const cy = 108;
    const scalePx = 66;
    const pulse = 0.5 + 0.5 * Math.sin((time || 0) * 5.0);

    const currentId = cellId(normalFor(state?.normal || progress?.currentCell || 'W+'));
    const routeTrail = Array.isArray(progress?.routeTrail) ? progress.routeTrail : [];
    const isRouteStage = Boolean(progress?.routeActive || (progress?.routeComplete && routeTrail.length > 0));

    // Determine visited cells set (during unique-route challenge, mark routeTrail; otherwise mark surveyed/visited cells)
    const visitedSet = new Set();
    if (isRouteStage) {
      for (const c of routeTrail) visitedSet.add(c);
    } else {
      if (progress?.counts) {
        for (const [cid, cnt] of Object.entries(progress.counts)) {
          if (cnt > 0) visitedSet.add(cid);
        }
      }
      if (Array.isArray(progress?.inspected)) {
        for (const c of progress.inspected) visitedSet.add(c);
      }
      visitedSet.add(currentId);
    }

    // Project inner and outer cubes
    const innerPts = CUBE_SIGNS.map(([x, y, z]) => this._project([x * INNER_S, y * INNER_S, z * INNER_S], cx, cy, scalePx));
    const outerPts = CUBE_SIGNS.map(([x, y, z]) => this._project([x * OUTER_S, y * OUTER_S, z * OUTER_S], cx, cy, scalePx));
    const cellPts = Object.fromEntries(
      CELL_IDS.map(cid => [cid, this._project(CELL_ANCHORS_3D[cid], cx, cy, scalePx)])
    );
    // Keep W- outer-enclosing badge pinned cleanly on the right margin with dashed connector to outer cube corner #6 (+1,+1,+1)
    cellPts['W-'] = { x: w - 34, y: 66, z: -1.5 };

    // 1. Softly tint visited 3D cell faces inside the Schlegel tesseract
    for (const [cid, quad] of Object.entries(CELL_FACE_QUADS)) {
      if (!visitedSet.has(cid)) continue;
      ctx.save();
      ctx.beginPath();
      quad.forEach((vi, k) => {
        const pt = outerPts[vi];
        if (k === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.closePath();
      ctx.fillStyle = CELL_COLORS[cid] + '1d';
      ctx.fill();
      ctx.restore();
    }
    if (visitedSet.has('W+')) {
      // Softly fill inner W+ front-ish cube core
      ctx.save();
      ctx.fillStyle = 'rgba(244, 247, 250, 0.10)';
      ctx.beginPath();
      [0, 1, 2, 3].forEach((vi, k) => {
        const pt = innerPts[vi];
        if (k === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // 2. Draw crisp 3D Static Tesseract Wireframe (Outer W- cube, 8 radial struts, Inner W+ cube)
    ctx.save();
    // Outer cube edges (W- gold tint if visited)
    ctx.strokeStyle = visitedSet.has('W-') ? 'rgba(245, 200, 92, 0.56)' : 'rgba(130, 178, 192, 0.34)';
    ctx.lineWidth = visitedSet.has('W-') ? 1.5 : 1.1;
    for (const [a, b] of CUBE_EDGES) {
      ctx.beginPath();
      ctx.moveTo(outerPts[a].x, outerPts[a].y);
      ctx.lineTo(outerPts[b].x, outerPts[b].y);
      ctx.stroke();
    }
    // 8 diagonal 4D connecting struts
    ctx.strokeStyle = 'rgba(110, 185, 198, 0.28)';
    ctx.lineWidth = 1.0;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo(innerPts[i].x, innerPts[i].y);
      ctx.lineTo(outerPts[i].x, outerPts[i].y);
      ctx.stroke();
    }
    // Inner cube edges (W+ bright white/cyan)
    ctx.strokeStyle = visitedSet.has('W+') ? 'rgba(244, 248, 252, 0.72)' : 'rgba(176, 215, 224, 0.50)';
    ctx.lineWidth = 1.45;
    for (const [a, b] of CUBE_EDGES) {
      ctx.beginPath();
      ctx.moveTo(innerPts[a].x, innerPts[a].y);
      ctx.lineTo(innerPts[b].x, innerPts[b].y);
      ctx.stroke();
    }
    // Subtle callout linking outer cube shell corner to W- outer-enclosing badge
    ctx.strokeStyle = 'rgba(245, 200, 92, 0.45)';
    ctx.lineWidth = 1.1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(outerPts[2].x, outerPts[2].y);
    ctx.lineTo(cellPts['W-'].x - 13, cellPts['W-'].y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(245, 200, 92, 0.85)';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('外包壳', cellPts['W-'].x, cellPts['W-'].y + 21);
    ctx.restore();

    // 3. Draw walked route trail in glowing cyan (during unique-route challenge)
    if (isRouteStage && routeTrail.length > 1) {
      for (let i = 0; i < routeTrail.length - 1; i++) {
        this._drawArrowSegment(ctx, cellPts[routeTrail[i]], cellPts[routeTrail[i + 1]], '#4de6d3', {
          width: 2.6,
          arrow: true,
          shrink: 13
        });
      }
    }

    // 4. If Route Hint is toggled ON, draw the complete Hamiltonian answer path in glowing gold lines!
    let hint = null;
    if (showHint) {
      hint = computeHamiltonianRouteHint(progress);
      const ans = hint.path;
      for (let i = 0; i < ans.length - 1; i++) {
        const alreadyDone = !hint.deadEnd && i < hint.walkedCount - 1;
        this._drawArrowSegment(ctx, cellPts[ans[i]], cellPts[ans[i + 1]], alreadyDone ? 'rgba(77, 230, 211, 0.55)' : '#ffd24d', {
          width: alreadyDone ? 2.2 : 3.0,
          dashed: !alreadyDone,
          dashOffset: -(time || 0) * 18,
          arrow: true,
          shrink: 14
        });
      }
      // Subtle closing return arrow from 8th room (e.g. Y+) back to W+ where the mirror bubble spawns!
      if (hint.closesToStart && ans.length === 8 && areCellsAdjacent(ans[7], 'W+')) {
        this._drawArrowSegment(ctx, cellPts[ans[7]], cellPts['W+'], 'rgba(105, 240, 174, 0.88)', {
          width: 2.2,
          dashed: true,
          dashOffset: -(time || 0) * 18,
          arrow: true,
          shrink: 14
        });
      }
    }

    // 5. Draw all 8 cell markers sorted back-to-front by depth (`z`)
    const sortedCells = [...CELL_IDS].sort((a, b) => cellPts[a].z - cellPts[b].z);
    for (const cid of sortedCells) {
      const pt = cellPts[cid];
      const meta = ROOM_META[cid];
      const visited = visitedSet.has(cid);
      const isCur = cid === currentId;
      const routeIdx = isRouteStage ? routeTrail.indexOf(cid) : -1;
      const hintIdx = hint ? hint.path.indexOf(cid) : -1;
      const isNextHint = Boolean(hint && hint.nextCell === cid);

      // Pulsing golden halo on next recommended hint step
      if (isNextHint) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 17 + pulse * 3.5, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 210, 77, ${0.55 + 0.45 * pulse})`;
        ctx.lineWidth = 2.2;
        ctx.stroke();
        ctx.restore();
      }

      // Pulsing bright player beacon ring
      if (isCur) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 15.5 + pulse * 3, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.4;
        ctx.stroke();
        ctx.restore();
      }

      // Cell badge circle
      ctx.save();
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, isCur ? 13 : 11.5, 0, Math.PI * 2);
      ctx.fillStyle = visited ? meta.color : 'rgba(12, 26, 38, 0.94)';
      ctx.fill();
      ctx.lineWidth = isCur ? 2.4 : (visited ? 1.8 : 1.3);
      ctx.strokeStyle = isCur ? '#ffffff' : meta.color;
      if (!visited && !isCur) ctx.setLineDash([3, 2]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Cell ID text inside circle (high contrast dark text on bright visited fill!)
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 9.5px ui-monospace, monospace';
      ctx.fillStyle = visited ? '#07141f' : meta.color;
      ctx.fillText(cid, pt.x, pt.y + 0.5);

      // Visited checkmark or step index micro-badge at top-right of node
      if (hint && hintIdx >= 0) {
        ctx.beginPath();
        ctx.arc(pt.x + 10, pt.y - 9, 6.2, 0, Math.PI * 2);
        ctx.fillStyle = (routeIdx >= 0) ? '#4de6d3' : '#f7c346';
        ctx.fill();
        ctx.fillStyle = '#07141f';
        ctx.font = 'bold 8.5px ui-monospace, monospace';
        ctx.fillText(String(hintIdx + 1), pt.x + 10, pt.y - 8.5);
      } else if (visited) {
        ctx.beginPath();
        ctx.arc(pt.x + 9.5, pt.y - 8.5, 5.8, 0, Math.PI * 2);
        ctx.fillStyle = '#69f0ae';
        ctx.fill();
        ctx.fillStyle = '#07141f';
        ctx.font = 'bold 8.5px sans-serif';
        ctx.fillText(routeIdx >= 0 ? String(routeIdx + 1) : '✓', pt.x + 9.5, pt.y - 8.2);
      }

      // Player tag pill ("你") directly above/beside current cell
      if (isCur) {
        drawRoundedRect(ctx, pt.x - 16, pt.y - 29, 32, 14, 4);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.fillStyle = '#07141f';
        ctx.font = 'bold 9.5px sans-serif';
        ctx.fillText('● 你', pt.x, pt.y - 21.8);
      }
      ctx.restore();
    }

    // Legend & Route Answer Footer Strip
    ctx.save();
    ctx.fillStyle = 'rgba(10, 26, 40, 0.94)';
    drawRoundedRect(ctx, 10, h - 46, w - 20, 38, 6);
    ctx.fill();
    ctx.strokeStyle = showHint ? 'rgba(255, 210, 77, 0.65)' : 'rgba(128, 204, 185, 0.28)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    if (showHint && hint) {
      if (hint.deadEnd) {
        ctx.fillStyle = '#ff8a80';
        ctx.font = 'bold 10.5px sans-serif';
        ctx.fillText('⚠ 当前已陷盲区！请回 W+ 重开，参考答案：', 18, h - 34);
      } else if (hint.status === 'complete') {
        ctx.fillStyle = '#69f0ae';
        ctx.font = 'bold 10.5px sans-serif';
        ctx.fillText('✓ 八胞体不重复路线已完成！回 W+ 进入镜面球', 18, h - 34);
      } else {
        const nxtMeta = hint.nextCell ? ROOM_META[hint.nextCell] : null;
        ctx.fillStyle = '#ffd24d';
        ctx.font = 'bold 10.5px sans-serif';
        ctx.fillText(
          nxtMeta ? `★ 答案指引 · 下一步前往：${nxtMeta.short}（金线 1→8）` : '★ 八胞体一笔画闭环答案（金线 1→8）',
          18,
          h - 34
        );
      }
      ctx.fillStyle = '#fff3c4';
      ctx.font = 'bold 9.8px ui-monospace, monospace';
      const routeText = hint.path.join('→') + (hint.closesToStart ? '→W+' : '');
      ctx.fillText(routeText, 18, h - 18);
    } else {
      ctx.fillStyle = '#d4eef2';
      ctx.font = 'bold 10.5px sans-serif';
      ctx.fillText(`● 你在 ${ROOM_META[currentId].short}  ·  实心✓=已走过(${visitedSet.size}/8)  ·  外框=W-`, 18, h - 34);
      ctx.fillStyle = '#9ac7d0';
      ctx.font = '10px sans-serif';
      ctx.fillText('点击上方「💡 路线答案」或按 H 键在八胞体中标出连线答案', 18, h - 18);
    }
    ctx.restore();

    ctx.restore();
  }
}
