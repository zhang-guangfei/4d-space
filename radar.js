/**
 * 8-Cell 4D Topology & Parallel-Transport Holonomy Radar for Chapter 1.
 * Strictly spoiler-free in upper stage (only reveals loop cells & active models);
 * shows full 8-cell adjacency graph, survey progress, Hamiltonian route trace,
 * and live Regge holonomy gyroscope in lower zero-G stage.
 */
import { CELL_COLORS } from './colored-tesseract.js';
import { cellId, cellNeighbors, normalFor, dot } from './chapter-topology.js';

// Clean Schlegel-like 2D layout of the 8 tesseract cells (inner W- ring vs outer W+ shell)
const NODE_POS = Object.freeze({
  'W+': [110, 148],
  'X+': [182, 110],
  'W-': [110, 72],
  'X-': [38, 110],
  'Y+': [58, 36],
  'Y-': [162, 184],
  'Z+': [162, 36],
  'Z-': [58, 184]
});

const UPPER_CELLS = ['W+', 'X+', 'W-', 'X-'];
const ALL_CELLS = ['W+', 'X+', 'W-', 'X-', 'Y+', 'Y-', 'Z+', 'Z-'];

export class TopologyRadar {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  render({ state, progress, holonomyDeg = 0, holonomyProved = false, routeTimerSec = 0 }) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);

    const upper = progress.phase === 'upper';
    const current = cellId(state.normal);
    const cells = upper ? UPPER_CELLS : ALL_CELLS;

    // Subtle dark architectural backdrop
    ctx.fillStyle = 'rgba(7, 17, 27, 0.86)';
    ctx.fillRect(0, 0, w, h);

    // Compute which neighbor lies along each player-relative direction (+fwd, -back, +right, -left, +up, -down)
    const forwardCell = cellId(state.frame[2]);
    const rightCell = cellId(state.frame[0]);
    const upCell = cellId(state.frame[1]);

    // Draw adjacency edges
    ctx.lineWidth = 1;
    for (let i = 0; i < cells.length; i++) {
      for (let j = i + 1; j < cells.length; j++) {
        const a = cells[i], b = cells[j];
        if (Math.abs(dot(normalFor(a), normalFor(b))) > 0.5) continue;
        const [ax, ay] = NODE_POS[a], [bx, by] = NODE_POS[b];
        const isCurrentEdge = a === current || b === current;
        ctx.strokeStyle = isCurrentEdge ? 'rgba(128, 204, 185, 0.38)' : 'rgba(130, 165, 178, 0.14)';
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
      }
    }

    // Draw active Hamiltonian route trail in lower mode
    if (!upper && progress.routeTrail && progress.routeTrail.length > 1) {
      ctx.strokeStyle = '#dfbb73';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      progress.routeTrail.forEach((cid, idx) => {
        const [x, y] = NODE_POS[cid];
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    // Highlight directional arrow from current cell to straight-ahead neighbor
    if (NODE_POS[current] && NODE_POS[forwardCell] && cells.includes(forwardCell)) {
      const [cx, cy] = NODE_POS[current], [fx, fy] = NODE_POS[forwardCell];
      ctx.strokeStyle = '#80ccb9';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + (fx - cx) * 0.72, cy + (fy - cy) * 0.72);
      ctx.stroke();
    }

    // Draw cell nodes
    for (const cid of cells) {
      const [x, y] = NODE_POS[cid];
      const isCur = cid === current;
      const color = CELL_COLORS[cid];
      const inRoute = !upper && progress.routeTrail?.includes(cid);
      const count = upper ? 0 : Math.min(3, progress.counts?.[cid] || 0);

      // Survey progress arc in lower mode
      if (!upper) {
        ctx.beginPath();
        ctx.arc(x, y, 16, -Math.PI / 2, -Math.PI / 2 + (count / 3) * Math.PI * 2);
        ctx.strokeStyle = count >= 3 ? '#80ccb9' : 'rgba(213, 242, 219, 0.55)';
        ctx.lineWidth = 2.2;
        ctx.stroke();
      }

      // Current cell outer ring
      if (isCur) {
        ctx.beginPath();
        ctx.arc(x, y, 19, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }

      // Node body
      ctx.beginPath();
      ctx.arc(x, y, isCur ? 12.5 : 10.5, 0, Math.PI * 2);
      ctx.fillStyle = inRoute ? '#1e3a38' : '#0f2330';
      ctx.fill();
      ctx.lineWidth = inRoute ? 2.4 : 1.6;
      ctx.strokeStyle = color;
      ctx.stroke();

      // Cell label
      ctx.fillStyle = color;
      ctx.font = 'bold 9.5px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(cid, x, y + 0.5);
    }

    // Bottom telemetry footer inside radar canvas
    ctx.fillStyle = '#9dbbc2';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(`前 ${forwardCell} · 右 ${rightCell} · 上 ${upCell}`, 10, h - 22);

    if (!upper) {
      ctx.fillStyle = '#80ccb9';
      ctx.fillText(progress.routeActive ? `已走 ${progress.routeTrail.length}/8 间` : '六向全通 · 零重力', 10, h - 8);
      if (progress.routeActive || progress.routeComplete) {
        ctx.textAlign = 'right';
        ctx.fillStyle = '#dfbb73';
        ctx.fillText(`${routeTimerSec.toFixed(1)}s`, w - 10, h - 8);
      }
    } else {
      ctx.fillStyle = '#80ccb9';
      ctx.fillText('前后连通 · 左右玻璃窗', 10, h - 8);
    }
  }
}
