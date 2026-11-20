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
