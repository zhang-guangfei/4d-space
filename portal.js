/**
 * Interactive 4D Tesseract Hero Renderer & Cross-Chapter Progress Sync for Portal Hub.
 */
const HUB_PROGRESS_KEY = 'beyond3d_hub_progress_v1';

// Exact 16 vertices & 32 edges of unit tesseract [-1, 1]^4
const VERTS = Array.from({ length: 16 }, (_, i) => [
  (i & 1) ? 1 : -1,
  (i & 2) ? 1 : -1,
  (i & 4) ? 1 : -1,
  (i & 8) ? 1 : -1
]);
const EDGES = [];
for (let i = 0; i < 16; i++) {
  for (let a = 0; a < 4; a++) {
    const j = i ^ (1 << a);
    if (i < j) EDGES.push([i, j, a]);
  }
}

const AXES_IDX = { X: 0, Y: 1, Z: 2, W: 3 };
const PLANE_INFO = {
  XW: 'XW 旋转平面 · 主环 4 胞连续置换',
  YW: 'YW 旋转平面 · 左右侧室跨维翻转',
  ZW: 'ZW 旋转平面 · 顶底方向穿行投影'
};

let activePlane = 'XW';
let angle4D = 0;
let rotY = 0.55;
let rotX = 0.34;
let dragging = false;
let lastX = 0;
let lastY = 0;

function rotatePlane(p, a, b, theta) {
  const out = [...p];
  const c = Math.cos(theta), s = Math.sin(theta);
  out[a] = c * p[a] - s * p[b];
  out[b] = s * p[a] + c * p[b];
  return out;
}

function initHeroCanvas() {
  const canvas = document.getElementById('heroTesseract');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  canvas.addEventListener('pointerdown', e => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture?.(e.pointerId);
  });
  canvas.addEventListener('pointermove', e => {
    if (!dragging) return;
    rotY += (e.clientX - lastX) * 0.008;
    rotX = Math.max(-1.2, Math.min(1.2, rotX + (e.clientY - lastY) * 0.008));
    lastX = e.clientX;
    lastY = e.clientY;
  });
  canvas.addEventListener('pointerup', () => { dragging = false; });
  canvas.addEventListener('pointercancel', () => { dragging = false; });

  document.querySelectorAll('.plane-switch button').forEach(btn => {
    btn.onclick = () => {
      activePlane = btn.dataset.plane;
      document.querySelectorAll('.plane-switch button').forEach(b => b.classList.toggle('active', b === btn));
      const lbl = document.getElementById('heroPlaneLabel');
      if (lbl) lbl.textContent = PLANE_INFO[activePlane] || activePlane;
    };
  });

  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let lastT = performance.now();

  function frame(now) {
    const dt = Math.min((now - lastT) / 1000, 0.05);
    lastT = now;
    if (!reduced) {
      angle4D += dt * 0.48;
      if (!dragging) rotY += dt * 0.14;
    }

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const aIdx = AXES_IDX[activePlane[0]];
    const bIdx = AXES_IDX[activePlane[1]];

    const projected = VERTS.map(v => {
      const r4 = rotatePlane(v, aIdx, bIdx, angle4D);
      const d4 = 3.2;
      const k4 = d4 / (d4 - r4[3]);
      let x = r4[0] * k4;
      let y = r4[1] * k4;
      let z = r4[2] * k4;

      // 3D orbit rotation
      const cy = Math.cos(rotY), sy = Math.sin(rotY);
      const x1 = cy * x + sy * z;
      const z1 = -sy * x + cy * z;
      const cx = Math.cos(rotX), sx = Math.sin(rotX);
      const y2 = cx * y - sx * z1;
      const z2 = sx * y + cx * z1;

      const d3 = 6.2;
      const k3 = (d3 / (d3 - z2)) * 104;
      return { sx: w * 0.5 + x1 * k3, sy: h * 0.5 - y2 * k3, depth: z2, w4: r4[3] };
    });

    // Sort edges back-to-front
    const sortedEdges = EDGES.map(([i, j, axis]) => ({
      i, j, axis,
      depth: (projected[i].depth + projected[j].depth) * 0.5,
      wMid: (projected[i].w4 + projected[j].w4) * 0.5
    })).sort((a, b) => a.depth - b.depth);

    for (const e of sortedEdges) {
      const a = projected[e.i];
      const b = projected[e.j];
      const isWPlus = VERTS[e.i][3] === 1 && VERTS[e.j][3] === 1;
      const isWEdge = e.axis === 3;
      const alpha = Math.max(0.18, Math.min(0.95, 0.45 + e.wMid * 0.35));
      ctx.lineWidth = isWPlus ? 2.1 : isWEdge ? 1.5 : 1.25;
      ctx.strokeStyle = isWPlus
        ? `rgba(223, 187, 115, ${alpha})`
        : isWEdge
          ? `rgba(128, 204, 185, ${alpha * 0.85})`
          : `rgba(148, 198, 214, ${alpha * 0.72})`;
      ctx.beginPath();
      ctx.moveTo(a.sx, a.sy);
      ctx.lineTo(b.sx, b.sy);
      ctx.stroke();
    }

    // Draw vertices
    for (let i = 0; i < projected.length; i++) {
      const p = projected[i];
      const isWPlus = VERTS[i][3] === 1;
      ctx.fillStyle = isWPlus ? '#dfbb73' : '#80ccb9';
      ctx.beginPath();
      ctx.arc(p.sx, p.sy, isWPlus ? 3.2 : 2.3, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function syncProgressBadges() {
  try {
    const p = JSON.parse(localStorage.getItem(HUB_PROGRESS_KEY) || 'null');
    if (!p) return;
    const s1 = document.getElementById('statusCh1');
    const s2 = document.getElementById('statusCh2');
    if (s1) {
      if (p.ch1Completed) s1.textContent = p.ch1BestRouteSec ? `已通关 · 最佳 ${p.ch1BestRouteSec}s` : '已通关 ✓';
      else if (p.ch1Phase === 'lower') s1.textContent = '进行中 · 零重力六向';
      else if (p.ch1Models > 0 || p.ch1EvidenceCount > 0) s1.textContent = `已读 ${p.ch1Models || 0}/3 · 取证 ${p.ch1EvidenceCount || 0}`;
    }
    if (s2 && Array.isArray(p.ch2StagesDone) && p.ch2StagesDone.length > 0) {
      s2.textContent = p.ch2Completed ? '全部 4 阶段通关 ✓' : `已完成 ${p.ch2StagesDone.length}/4 阶段`;
    }
  } catch {}
}

initHeroCanvas();
syncProgressBadges();
