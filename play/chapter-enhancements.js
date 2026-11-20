/**
 * Chapter 1 Interactive Physics Instruments, Spatial Audio, 8-Cell Holonomy Radar,
 * Scientific Evidence & Hypothesis Deduction Desk, and Save/Resume Layer.
 *
 * Loaded as a separate ES module in browser sessions so every Node NullEngine
 * regression test remains untouched and 100% deterministic.
 */
import { CELL_COLORS } from './colored-tesseract.js';
import {
  H, cellId, localPoint, canonicalFrame, worldToTangent, tangentToWorld,
  mapPoint, sub, scale, normalFor, dot
} from './chapter-topology.js';
import { viewBasis } from './chapter-motion.js';
import { ROOM_MODELS, roomModel } from './model-content.js';
import { SpaceAudio } from './sound.js';
import { TopologyRadar } from './radar.js';
import {
  traceGeodesicLaser, PhysicsProbe, HolonomyTracker, EvidenceLog, EVIDENCE_ITEMS
} from './physics-lab.js';

const SAVE_KEY = 'beyond3d_ch1_save_v1';
const HUB_PROGRESS_KEY = 'beyond3d_hub_progress_v1';

function readJSON(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
}
function writeJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function initEnhancements() {
  const bridge = window.__BEYOND3D_BRIDGE__;
  if (!bridge) return;

  const audio = new SpaceAudio();
  const evidence = new EvidenceLog();
  let holonomy = new HolonomyTracker(bridge.getState());
  let radar = null;
  let radarOpen = true;
  let notebookOpen = false;
  let activeLasers = [];
  let activeProbes = [];
  let probeMeshes = [];
  let laserHeadMesh = null;
  let laserTrailMesh = null;
  let probeMaterial = null;
  let laserMaterial = null;
  let strideSign = 0;
  let lastRadarDraw = 0;
  let routeStartTime = null;
  let routeElapsed = 0;
  let bestRouteSec = readJSON(HUB_PROGRESS_KEY)?.ch1BestRouteSec ?? null;

  // 1. Mount clean, spoiler-free UI elements dynamically
  const header = document.querySelector('header');
  const pauseBtn = document.getElementById('pause');
  const toolWrap = document.createElement('div');
  toolWrap.className = 'b3d-header-tools';

  const notebookBtn = document.createElement('button');
  notebookBtn.className = 'b3d-pill-btn';
  notebookBtn.id = 'b3d-nb-btn';
  notebookBtn.textContent = 'N · 物理取证 (0/3)';
  notebookBtn.title = '打开物理实验记录与空间猜想台 (N)';

  const radarBtn = document.createElement('button');
  radarBtn.className = 'b3d-pill-btn active b3d-hide-sm';
  radarBtn.id = 'b3d-radar-btn';
  radarBtn.textContent = 'M · 拓扑仪';
  radarBtn.title = '显示/隐藏空间拓扑与陀螺仪 (M)';

  const audioBtn = document.createElement('button');
  audioBtn.className = 'b3d-pill-btn';
  audioBtn.id = 'b3d-audio-btn';
  audioBtn.textContent = 'V · 音效 开';
  audioBtn.title = '切换空间站音效 (V)';

  const hubLink = document.createElement('a');
  hubLink.className = 'b3d-pill-btn b3d-hide-sm';
  hubLink.href = location.pathname.includes('/play/') ? '../index.html' : 'chapter2.html';
  hubLink.textContent = location.pathname.includes('/play/') ? '维度总览' : '实验入口';
  if (!location.pathname.includes('/play/')) {
    // Keep upper Chapter 1 spoiler-free in standalone fps-demo serve mode: link to hub if present
    hubLink.style.display = 'none';
  }

  if (header && pauseBtn) {
    header.insertBefore(toolWrap, pauseBtn);
    toolWrap.append(notebookBtn, radarBtn, audioBtn, hubLink, pauseBtn);
  }

  // Color swatch next to #cell
  const cellEl = document.getElementById('cell');
  const cellSwatch = document.createElement('span');
  cellSwatch.className = 'b3d-cell-swatch';
  if (cellEl) cellEl.appendChild(cellSwatch);

  // Proximity interact prompt
  const promptEl = document.createElement('div');
  promptEl.id = 'b3d-prompt';
  document.body.appendChild(promptEl);

  // Seam shimmer overlay
  const seamFxEl = document.createElement('div');
  seamFxEl.id = 'b3d-seam-fx';
  document.body.appendChild(seamFxEl);

  // Toast stack
  const toastStack = document.createElement('div');
  toastStack.id = 'b3d-toast-stack';
  document.body.appendChild(toastStack);

  // Right-side dock: topology radar + physics instruments readout
  const dock = document.createElement('aside');
  dock.id = 'b3d-dock';
  dock.innerHTML = `
    <div id="b3d-radar-wrap">
      <div class="b3d-radar-head">
        <span>TOPOLOGY / GYRO</span>
        <span id="b3d-radar-mode">主环</span>
      </div>
      <canvas id="b3d-radar-canvas" width="220" height="228"></canvas>
    </div>
    <div id="b3d-instruments">
      <div class="b3d-inst-title"><span>物理探测仪</span><span id="b3d-speed">0.0 m/s</span></div>
      <div class="b3d-inst-row"><span><kbd>L</kbd> 激光测地脉冲</span><span id="b3d-laser-stat">就绪</span></div>
      <div class="b3d-inst-row"><span><kbd>G</kbd> 惯性物理探测球</span><span id="b3d-probe-stat">就绪</span></div>
      <div class="b3d-inst-row"><span><kbd>N</kbd> 证据与假说猜想</span><span id="b3d-ev-stat">0/3</span></div>
      <div id="b3d-telemetry">对准前方通道按 L 发射激光，验证走廊是否真正笔直闭合。</div>
    </div>
  `;
  document.body.appendChild(dock);
  radar = new TopologyRadar(document.getElementById('b3d-radar-canvas'));

  // Scientific Evidence & Hypothesis Deduction Overlay
  const notebookEl = document.createElement('section');
  notebookEl.id = 'b3d-notebook';
  notebookEl.className = 'hidden';
  notebookEl.innerHTML = `
    <div class="b3d-nb-card">
      <div class="b3d-nb-top">
        <div>
          <small>FIELD OBSERVATION / HYPOTHESIS DEDUCTION</small>
          <h2>物理取证与空间假说验证台</h2>
          <p>亲自在走廊中做实验（激光测地线、惯性探测球、自像挥手、陀螺仪和乐），检验哪个空间模型经得起物理学推敲。</p>
        </div>
        <button id="b3d-nb-close" class="secondary">返回走廊 · Esc</button>
      </div>
      <div class="b3d-nb-grid">
        <div class="b3d-nb-sec">
          <h3>已测得的物理现象</h3>
          <div id="b3d-ev-list"></div>
        </div>
        <div class="b3d-nb-sec">
          <h3>你的空间结构猜测</h3>
          <div id="b3d-hyp-list"></div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(notebookEl);

  // Resume saved progress button on menu (if save exists)
  const startBtn = document.getElementById('start');
  const resumeSaveBtn = document.createElement('button');
  resumeSaveBtn.id = 'b3d-resume-save';
  resumeSaveBtn.className = 'secondary hidden';
  if (startBtn && startBtn.parentNode) {
    startBtn.insertAdjacentElement('afterend', resumeSaveBtn);
  }

  // Add subtle physics key hint to menu keyline
  const keyline = document.querySelector('#menu .keyline');
  if (keyline) {
    const extra = document.createElement('div');
    extra.style.marginTop = '6px';
    extra.innerHTML = '<b>L</b> 激光测地脉冲　<b>G</b> 惯性探测球　<b>N</b> 物理取证台　<b>M</b> 拓扑陀螺仪　<b>V</b> 音效';
    keyline.appendChild(extra);
  }

  function showToast(text, kind = '') {
    const item = document.createElement('div');
    item.className = 'b3d-toast' + (kind ? ' ' + kind : '');
    item.textContent = text;
    toastStack.appendChild(item);
    while (toastStack.children.length > 3) toastStack.firstChild.remove();
    setTimeout(() => {
      item.style.transition = 'opacity 0.35s ease';
      item.style.opacity = '0';
      setTimeout(() => item.remove(), 380);
    }, 4200);
  }

  function pulseSeam(cell) {
    const hex = CELL_COLORS[cell] || '#80ccb9';
    seamFxEl.style.boxShadow = `inset 0 0 64px 10px ${hex}44`;
    seamFxEl.style.opacity = '1';
    requestAnimationFrame(() => {
      setTimeout(() => { seamFxEl.style.opacity = '0'; }, 90);
    });
  }

  function updateSave() {
    const p = bridge.getProgress().snapshot();
    if (p.inspected.length === 0 && p.phase === 'upper' && evidence.discovered.size === 0) return;
    writeJSON(SAVE_KEY, {
      phase: p.phase,
      inspected: p.inspected,
      truthRevealed: p.truthRevealed,
      truthViewed: p.truthViewed,
      counts: p.counts,
      routeComplete: p.routeComplete,
      evidence: evidence.serialize(),
      savedAt: Date.now()
    });
    const hub = readJSON(HUB_PROGRESS_KEY) || {};
    hub.ch1Phase = p.phase;
    hub.ch1Models = p.inspected.length;
    hub.ch1RouteComplete = p.routeComplete || hub.ch1RouteComplete;
    hub.ch1Completed = p.completed || hub.ch1Completed;
    hub.ch1EvidenceCount = evidence.discovered.size;
    if (bestRouteSec !== null) hub.ch1BestRouteSec = bestRouteSec;
    writeJSON(HUB_PROGRESS_KEY, hub);
  }

  function checkSavedPrompt() {
    const saved = readJSON(SAVE_KEY);
    if (!saved) {
      resumeSaveBtn.classList.add('hidden');
      return;
    }
    const label = saved.routeComplete
      ? '恢复上次进度（路线已完成）'
      : saved.phase === 'lower'
        ? '恢复上次进度（六向漂航）'
        : `恢复上次进度（已读 ${saved.inspected?.length || 0}/3）`;
    resumeSaveBtn.textContent = label;
    resumeSaveBtn.classList.remove('hidden');
  }
  checkSavedPrompt();

  resumeSaveBtn.onclick = () => {
    audio.unlock();
    const saved = readJSON(SAVE_KEY);
    if (!saved) return;
    if (bridge.restoreProgress(saved)) {
      if (saved.evidence) evidence.restore(saved.evidence);
      holonomy = new HolonomyTracker(bridge.getState());
      audio.setMode(bridge.getPhase());
      resumeSaveBtn.classList.add('hidden');
      showToast('已恢复上次探索进度与物理取证记录。');
      updateInstrumentCounts();
      bridge.resumeCorridor();
    }
  };

  // Preallocate lightweight 3D meshes in the browser scene for Laser Pulse & Physics Probes
  function ensurePhysicsMeshes() {
    const B = bridge.B;
    const scene = bridge.getScene();
    if (!scene || laserHeadMesh) return;

    laserMaterial = new B.StandardMaterial('b3d_laser_mat', scene);
    laserMaterial.emissiveColor = B.Color3.FromHexString('#58f4e2');
    laserMaterial.diffuseColor = B.Color3.FromHexString('#c9fff8');
    laserMaterial.disableLighting = true;

    laserHeadMesh = B.MeshBuilder.CreateSphere('b3d_laser_head', { diameter: 0.16, segments: 12 }, scene);
    laserHeadMesh.material = laserMaterial;
    laserHeadMesh.isPickable = false;
    laserHeadMesh.setEnabled(false);

    laserTrailMesh = B.MeshBuilder.CreateCylinder('b3d_laser_trail', { diameter: 0.045, height: 1, tessellation: 8 }, scene);
    laserTrailMesh.material = laserMaterial;
    laserTrailMesh.isPickable = false;
    laserTrailMesh.setEnabled(false);

    probeMaterial = new B.StandardMaterial('b3d_probe_mat', scene);
    probeMaterial.diffuseColor = B.Color3.FromHexString('#f0c86e');
    probeMaterial.emissiveColor = B.Color3.FromHexString('#5c4514');
    probeMaterial.specularColor = new B.Color3(0.8, 0.85, 0.9);

    // Preallocate 10 probe instances so the probe appears simultaneously in your room AND across visible optical portals!
    for (let i = 0; i < 10; i++) {
      const m = B.MeshBuilder.CreateSphere('b3d_probe_' + i, { diameter: 0.28, segments: 14 }, scene);
      m.material = probeMaterial;
      m.isPickable = false;
      m.setEnabled(false);
      probeMeshes.push(m);
    }
  }

  function mapCellPointToInstance(instance, cellNormal, point4) {
    const cf = canonicalFrame(cellNormal);
    const localCanon = worldToTangent(cf, sub(point4, scale(cellNormal, H)));
    return mapPoint(instance.transform, localCanon);
  }

  function fireLaser() {
    if (!bridge.isReady() || bridge.isLabOpen() || notebookOpen) return;
    audio.unlock();
    audio.laserFire();
    const state = bridge.getState();
    const look = bridge.getLook();
    const basis = viewBasis(look);
    const mode = bridge.getPhase();
    const trace = traceGeodesicLaser(state, basis.forward, mode);

    activeLasers = [{
      trace,
      headDist: 0,
      speed: 22, // Visualized light speed (22 m/s) so player watches photon travel 24m and return behind them!
      completed: false,
      age: 0
    }];

    const statEl = document.getElementById('b3d-laser-stat');
    const telEl = document.getElementById('b3d-telemetry');
    if (statEl) {
      statEl.textContent = trace.geodesicClosed
        ? `${trace.totalDistance.toFixed(1)}m 闭合`
        : `${trace.bounces} 次反射`;
    }
    if (telEl) {
      telEl.textContent = `光程 ${trace.totalDistance.toFixed(2)}m · ${trace.lightTimeNs.toFixed(1)}ns · 反射 ${trace.bounces} 次`;
    }

    if (trace.geodesicClosed) {
      setTimeout(() => {
        audio.laserLoopReturn();
        const isNew = evidence.record(
          'geodesic_loop',
          `激光实测：光程 ${trace.totalDistance.toFixed(2)} m（${trace.lightTimeNs.toFixed(1)} ns），0 次反射，从正后方归来`
        );
        if (isNew) {
          audio.evidenceUnlocked();
          showToast('物理取证 ① 解锁：激光零反射直行 24.0 m 从背后命中！走廊绝对笔直，按 N 查看假说比对。', 'warm');
        } else {
          showToast(trace.verdict);
        }
        updateInstrumentCounts();
        updateSave();
      }, Math.min(1300, Math.round((trace.totalDistance / 22) * 1000)));
    } else {
      showToast(trace.verdict);
    }
  }

  function launchProbe() {
    if (!bridge.isReady() || bridge.isLabOpen() || notebookOpen) return;
    audio.unlock();
    audio.probeThrow();
    const state = bridge.getState();
    const look = bridge.getLook();
    const basis = viewBasis(look);
    const mode = bridge.getPhase();
    const speed = mode === 'upper' ? 7.8 : 6.4;
    const launchVel = [
      basis.forward[0] * speed,
      basis.forward[1] * speed + (mode === 'upper' ? 1.4 : 0),
      basis.forward[2] * speed
    ];
    const probe = new PhysicsProbe(state, launchVel, { mode });
    activeProbes = [probe];
    const statEl = document.getElementById('b3d-probe-stat');
    if (statEl) statEl.textContent = `飞行中 (${cellId(state.normal)})`;
    showToast(mode === 'upper'
      ? '已投出物理探测球（0.5g 弹跳）。观察它是否直行穿门并从你身后滚回！'
      : '已投出零重力惯性探测球（牛顿第一定律）。观察它沿测地线穿门绕行！');
  }

  function updateInstrumentCounts() {
    const p = bridge.getProgress().snapshot();
    const total = p.phase === 'upper' ? 3 : 4;
    const found = [...evidence.discovered].filter(id => p.phase !== 'upper' || id !== 'holonomy_90').length;
    notebookBtn.textContent = `N · 物理取证 (${found}/${total})`;
    const evStat = document.getElementById('b3d-ev-stat');
    if (evStat) evStat.textContent = `${found}/${total}`;
  }

  function renderNotebook() {
    const p = bridge.getProgress().snapshot();
    const upper = p.phase === 'upper';
    const evList = document.getElementById('b3d-ev-list');
    const hypList = document.getElementById('b3d-hyp-list');
    if (!evList || !hypList) return;

    const visibleEvidence = EVIDENCE_ITEMS.filter(item => !item.lowerOnly || !upper);
    evList.innerHTML = visibleEvidence.map(item => {
      const done = evidence.discovered.has(item.id);
      const meas = evidence.measurements[item.id];
      return `
        <div class="b3d-ev-card ${done ? 'done' : ''}">
          <div class="b3d-ev-head">
            <span>${item.title}</span>
            <span class="b3d-ev-tag">${done ? '已实测 ✓' : '待实验'}</span>
          </div>
          <p class="b3d-ev-body">${done ? item.summary : '实验方法：' + item.how}</p>
          ${done && meas ? `<div class="b3d-ev-measure">实测记录：${meas}</div>` : ''}
        </div>
      `;
    }).join('');

    const visibleHyps = ['central-hall', 'treadmill', 'sphere'];
    if (p.truthRevealed) visibleHyps.push('colored-tesseract');

    hypList.innerHTML = visibleHyps.map(base => {
      const roomKey = Object.keys(ROOM_MODELS).find(k => ROOM_MODELS[k].base === base);
      const model = ROOM_MODELS[roomKey];
      const evalRes = evidence.evaluateGuess(base);
      const isSelected = evidence.playerGuess === base;
      const statusClass = evalRes.conflicts.length > 0 ? 'falsified' : (evalRes.matches.length >= 2 ? 'consistent' : '');
      const statusLabel = evalRes.conflicts.length > 0
        ? `与 ${evalRes.conflicts.length} 项实测冲突`
        : evalRes.matches.length > 0
          ? `符合 ${evalRes.matches.length} 项实测`
          : '尚待实测验证';

      const reasonsHtml = [
        ...evalRes.conflicts.map(c => `<div class="b3d-conflict">✗ ${c.title}：${c.reason}</div>`),
        ...evalRes.matches.map(m => `<div class="b3d-match">✓ ${m.title}：${m.reason}</div>`)
      ].join('');

      return `
        <div class="b3d-hyp-card ${statusClass} ${isSelected ? 'selected' : ''}">
          <div class="b3d-hyp-top">
            <strong>${model.title}</strong>
            <button class="b3d-hyp-btn" data-guess="${base}">${isSelected ? '当前猜想 ✓' : '押注此假说'}</button>
          </div>
          <p class="b3d-hyp-notes">${statusLabel}</p>
          ${reasonsHtml ? `<div class="b3d-hyp-notes" style="margin-top:6px">${reasonsHtml}</div>` : ''}
        </div>
      `;
    }).join('');

    hypList.querySelectorAll('[data-guess]').forEach(btn => {
      btn.onclick = () => {
        const base = btn.getAttribute('data-guess');
        const res = evidence.setGuess(base);
        updateSave();
        renderNotebook();
        if (res.conflicts.length > 0) {
          showToast(`你的猜想与已测物理现象存在 ${res.conflicts.length} 处矛盾！仔细核对冲突项。`, 'alert');
        } else if (base === 'colored-tesseract' && res.matches.length >= 2) {
          audio.evidenceUnlocked();
          showToast('猜想与全部物理实验严丝合缝！你已看穿这座空间的真实几何结构！', 'warm');
        } else {
          showToast('已记录当前猜想。继续做实验检验它吧！');
        }
      };
    });
  }

  function setNotebookOpen(open) {
    notebookOpen = !!open;
    notebookEl.classList.toggle('hidden', !notebookOpen);
    if (notebookOpen) {
      bridge.pause(false);
      document.getElementById('menu')?.classList.add('hidden');
      renderNotebook();
    } else {
      bridge.resumeCorridor();
    }
  }

  notebookBtn.onclick = () => { audio.unlock(); setNotebookOpen(!notebookOpen); };
  document.getElementById('b3d-nb-close').onclick = () => setNotebookOpen(false);
  radarBtn.onclick = () => {
    radarOpen = !radarOpen;
    document.getElementById('b3d-radar-wrap')?.classList.toggle('hidden-radar', !radarOpen);
    radarBtn.classList.toggle('active', radarOpen);
  };
  audioBtn.onclick = () => {
    audio.unlock();
    const muted = audio.toggleMute();
    audioBtn.textContent = muted ? 'V · 音效 关' : 'V · 音效 开';
  };

  // Unlock audio cleanly on first click/key
  const unlockOnce = () => { audio.unlock(); };
  window.addEventListener('pointerdown', unlockOnce, { once: true });
  window.addEventListener('keydown', unlockOnce, { once: true });

  // Keyboard shortcuts for our physics instruments (L, G, M, N, V)
  document.addEventListener('keydown', e => {
    const tag = e.target?.tagName;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
    if (e.code === 'Escape' && notebookOpen) {
      e.preventDefault();
      e.stopImmediatePropagation();
      setNotebookOpen(false);
      return;
    }
    if (e.repeat) return;
    if (e.code === 'KeyN' && !bridge.isLabOpen() && bridge.getProgress().phase !== 'ended') {
      e.preventDefault();
      audio.unlock();
      setNotebookOpen(!notebookOpen);
      return;
    }
    if (e.code === 'KeyM' && !bridge.isLabOpen()) {
      radarBtn.click();
      return;
    }
    if (e.code === 'KeyV') {
      audioBtn.click();
      return;
    }
    if (!bridge.isActive() || bridge.isLabOpen() || notebookOpen) return;
    if (e.code === 'KeyL') { e.preventDefault(); fireLaser(); }
    if (e.code === 'KeyG') { e.preventDefault(); launchProbe(); }
  }, true);

  // Hook into chapter.js lifecycle events
  window.__BEYOND3D__ = {
    onJump() {
      audio.unlock();
      audio.jump();
    },
    onLand(impactVy) {
      audio.land(impactVy);
    },
    onZoom(isZoom) {
      audio.unlock();
      if (isZoom) audio.hologramOpen();
    },
    onWave(side) {
      audio.unlock();
      const state = bridge.getState();
      const look = bridge.getLook();
      const fwd = viewBasis(look).forward;
      const worldFwd = tangentToWorld(state.frame, fwd);
      // Check if player is facing nearly straight down an open optical loop axis (where 24m self-image stands!)
      const aligned = worldFwd.some(c => Math.abs(c) > 0.88);
      audio.wave(aligned);
      if (aligned) {
        const hand = side === 'left' ? '左手（红标）' : '右手（金标）';
        const isNew = evidence.record(
          'chiral_self',
          `向 24m 外自像挥动${hand}，对方同步举起同侧手臂且保持背影（手性 +1，非镜像）`
        );
        if (isNew) {
          audio.evidenceUnlocked();
          showToast(`物理取证 ② 解锁：24m 外自像同步举起${hand}！非镜面反射（按 N 比对假说）。`, 'warm');
        } else {
          showToast(`24m 外的你同步举起了${hand}——定向保手性闭合光路！`);
        }
        updateInstrumentCounts();
        updateSave();
      }
    },
    onSeam(fromCell, toCell, state, phase) {
      audio.unlock();
      audio.seamCross(toCell, phase === 'lower');
      pulseSeam(toCell);

      if (evidence.noteCell(toCell)) {
        audio.evidenceUnlocked();
        showToast('物理取证 ③ 解锁：两侧雕像随跨门精确 90° 四步周期旋转！按 N 查看取证台。', 'warm');
        updateInstrumentCounts();
      }

      const holo = holonomy.onSeam(state);
      if (holo.returned && holo.proved) {
        const isNew = evidence.record(
          'holonomy_90',
          `零重力回路 ${holo.loop.join('→')} 返回 ${holonomy.anchorCell}，惯性陀螺仪和乐偏转 ${holo.angleDeg.toFixed(1)}°！`
        );
        audio.evidenceUnlocked();
        showToast(
          isNew
            ? `物理取证 ④ 终极铁证：绕角环 ${holo.loop.join('→')} 令陀螺仪偏转 ${holo.angleDeg.toFixed(0)}°！你以微分几何和乐证明了正曲率四维边界！`
            : `陀螺仪检测到 ${holo.angleDeg.toFixed(0)}° 平行移动和乐偏转（${holo.loop.join('→')}）！`,
          'warm'
        );
        updateInstrumentCounts();
      }
      updateSave();
    },
    onInterior(cell, snap) {
      if (snap.routeComplete) {
        audio.evidenceUnlocked();
        const elapsed = routeStartTime !== null ? Math.max(0.1, bridge.getTime() - routeStartTime) : routeElapsed;
        routeElapsed = elapsed;
        if (bestRouteSec === null || elapsed < bestRouteSec) {
          bestRouteSec = Math.round(elapsed * 10) / 10;
        }
        showToast(`八胞无重复路线完成！用时 ${elapsed.toFixed(1)}s — W+ 出现了新的观测目标！`, 'warm');
      } else if (snap.routeFailure) {
        audio.routeFail();
        showToast(`重复进入了 ${snap.routeFailure.cell}，本次路线中断。回 W+ 随时重试！`, 'alert');
      } else if (snap.routeActive) {
        audio.routeStep(snap.routeTrail.length);
        showToast(`路线进度 ${snap.routeTrail.length}/8 · 抵达 ${cell}`);
      } else {
        const count = Math.min(3, snap.counts[cell] || 0);
        if (count === 3) showToast(`房间 ${cell} 通道已完全熟悉 (3/3) ✓`);
      }
      updateSave();
    },
    onRouteStart() {
      audio.unlock();
      audio.routeStep(1);
      routeStartTime = bridge.getTime();
      routeElapsed = 0;
      showToast('八胞无重复挑战开始！按 M 打开拓扑仪规划路径。', 'warm');
    },
    onOpenLab(room, snap) {
      audio.unlock();
      audio.hologramOpen();
      if (snap.truthRevealed && room !== 'W+' && !snap.truthViewed) {
        showToast('三项假说均已记录！返回 W+ 查看新出现的全息模型。', 'warm');
      }
      updateSave();
    },
    onCloseLab() {
      updateSave();
    },
    onUnlock() {
      audio.unlock();
      audio.airlockUnlock();
      audio.setMode('lower');
      holonomy = new HolonomyTracker(bridge.getState());
      const rm = document.getElementById('b3d-radar-mode');
      if (rm) rm.textContent = '八胞全通';
      showToast('舱门开启，重力关闭！飞完 3 室角环（如 W+→X+→Y+→W+）实测 90° 陀螺仪和乐！', 'warm');
      updateInstrumentCounts();
      updateSave();
    },
    onFinish() {
      audio.evidenceUnlocked();
      updateSave();
    },
    onReset() {
      evidence.reset();
      holonomy = new HolonomyTracker(bridge.getState());
      activeLasers = [];
      activeProbes = [];
      routeStartTime = null;
      routeElapsed = 0;
      audio.setMode('upper');
      try { localStorage.removeItem(SAVE_KEY); } catch {}
      checkSavedPrompt();
      updateInstrumentCounts();
    },
    onFrame(dt, time, state, look, velocity, phase, keys, ground, gait, active, snap) {
      ensurePhysicsMeshes();
      const B = bridge.B;
      const renderer = bridge.getRenderer();
      const curCell = cellId(state.normal);

      // Cell color swatch
      cellSwatch.style.backgroundColor = CELL_COLORS[curCell] || '#80ccb9';

      // Speedometer
      const speedEl = document.getElementById('b3d-speed');
      if (speedEl) speedEl.textContent = `${Math.hypot(...velocity).toFixed(1)} m/s`;

      // Realistic audio foley: footsteps in upper mode, hover hum, zero-G RCS thrusters
      if (active) {
        if (phase === 'upper') {
          audio.setThruster(0, false);
          audio.setHover(ground.hovering);
          if (!ground.airborne && Math.abs(gait.leftLeg) > 0.08) {
            const s = Math.sign(gait.leftLeg);
            if (s !== 0 && s !== strideSign) {
              strideSign = s;
              audio.footstep(keys.has('ShiftLeft') || keys.has('ShiftRight'));
            }
          } else if (Math.abs(gait.leftLeg) < 0.03) {
            strideSign = 0;
          }
        } else {
          audio.setHover(false);
          const thrusting = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ControlLeft', 'ControlRight', 'KeyQ', 'KeyE']
            .some(k => keys.has(k));
          const boosted = keys.has('ShiftLeft') || keys.has('ShiftRight');
          audio.setThruster(thrusting ? 1 : 0, boosted);
        }
      } else {
        audio.setThruster(0, false);
        audio.setHover(false);
      }

      // Proximity interaction prompt when near an available room model
      const distCenter = Math.hypot(...localPoint(state));
      const canInspect = active && !bridge.isLabOpen() && !notebookOpen &&
        ROOM_MODELS[curCell] && bridge.truthAvailable(curCell) && distCenter < 4.5;
      if (canInspect) {
        const model = roomModel(curCell);
        promptEl.innerHTML = `<kbd>F</kbd> 观察全息模型 · ${model.title}`;
        promptEl.classList.add('show');
      } else {
        promptEl.classList.remove('show');
      }

      // Step & render 3D Geodesic Laser Pulse across portal rooms
      if (laserHeadMesh && laserTrailMesh) {
        if (activeLasers.length > 0) {
          const lz = activeLasers[0];
          lz.age += dt;
          lz.headDist = Math.min(lz.trace.totalDistance, lz.headDist + lz.speed * dt);
          const seg = lz.trace.segments.find(s => lz.headDist >= s.startDist && lz.headDist <= s.endDist + 1e-6)
            || lz.trace.segments[lz.trace.segments.length - 1];

          // Find matching visible instance for this cell (prefer depth 0 or nearest matching cell)
          const targetInst = renderer?.instances?.find(inst => cellId(inst.normal) === seg.cell);
          if (seg && targetInst && lz.age < (lz.trace.totalDistance / lz.speed) + 0.45) {
            const len = Math.max(1e-6, seg.endDist - seg.startDist);
            const t = Math.max(0, Math.min(1, (lz.headDist - seg.startDist) / len));
            const pNow4 = seg.from4.map((v, i) => v + (seg.to4[i] - v) * t);
            const tailT = Math.max(0, t - 1.1 / len);
            const pTail4 = seg.from4.map((v, i) => v + (seg.to4[i] - v) * tailT);
            const headPos = mapCellPointToInstance(targetInst, seg.normal, pNow4);
            const tailPos = mapCellPointToInstance(targetInst, seg.normal, pTail4);

            laserHeadMesh.setEnabled(true);
            laserHeadMesh.position.set(headPos[0], headPos[1], headPos[2]);

            const dx = headPos[0] - tailPos[0], dy = headPos[1] - tailPos[1], dz = headPos[2] - tailPos[2];
            const segVisualLen = Math.hypot(dx, dy, dz);
            if (segVisualLen > 0.02) {
              laserTrailMesh.setEnabled(true);
              laserTrailMesh.position.set(
                (headPos[0] + tailPos[0]) * 0.5,
                (headPos[1] + tailPos[1]) * 0.5,
                (headPos[2] + tailPos[2]) * 0.5
              );
              laserTrailMesh.scaling.set(1, segVisualLen, 1);
              const dirV = new B.Vector3(dx / segVisualLen, dy / segVisualLen, dz / segVisualLen);
              const upV = new B.Vector3(0, 1, 0);
              const axis = B.Vector3.Cross(upV, dirV);
              const cosA = Math.max(-1, Math.min(1, B.Vector3.Dot(upV, dirV)));
              if (axis.lengthSquared() > 1e-8) {
                laserTrailMesh.rotationQuaternion = B.Quaternion.RotationAxis(axis.normalize(), Math.acos(cosA));
              } else {
                laserTrailMesh.rotationQuaternion = B.Quaternion.Identity();
              }
            } else {
              laserTrailMesh.setEnabled(false);
            }
          } else {
            laserHeadMesh.setEnabled(false);
            laserTrailMesh.setEnabled(false);
            activeLasers = [];
          }
        } else {
          laserHeadMesh.setEnabled(false);
          laserTrailMesh.setEnabled(false);
        }
      }

      // Step & render 3D Physics Probes simultaneously across all matching visible portal rooms!
      if (probeMeshes.length > 0) {
        let usedMesh = 0;
        for (let i = activeProbes.length - 1; i >= 0; i--) {
          const probe = activeProbes[i];
          const res = probe.step(dt, phase);
          if (res.bounced) audio.probeBounce(Math.hypot(...probe.velocity));
          if (res.crossed) {
            const statEl = document.getElementById('b3d-probe-stat');
            if (statEl) statEl.textContent = `穿门→${res.crossed.to} (${probe.seamsCrossed}室)`;
          }
          if (res.looped) {
            audio.laserLoopReturn();
            const isNew = evidence.record(
              'geodesic_loop',
              `探测球沿直线穿越 ${probe.seamsCrossed} 室并从后方回到 ${probe.originCell}（无离心偏转）`
            );
            if (isNew) {
              audio.evidenceUnlocked();
              showToast('物理取证 ① 解锁：惯性探测球零侧偏穿越 4 室归来！按 N 检视假说。', 'warm');
              updateInstrumentCounts();
              updateSave();
            } else {
              showToast('你的探测球已经绕行 24m 回到你所在的房间！');
            }
          }
          if (!probe.alive) {
            activeProbes.splice(i, 1);
            const statEl = document.getElementById('b3d-probe-stat');
            if (statEl && activeProbes.length === 0) statEl.textContent = '就绪';
            continue;
          }
          const pCell = cellId(probe.state.normal);
          if (renderer?.instances) {
            for (const inst of renderer.instances) {
              if (usedMesh >= probeMeshes.length) break;
              if (cellId(inst.normal) !== pCell) continue;
              const pos = mapCellPointToInstance(inst, probe.state.normal, probe.state.p);
              const m = probeMeshes[usedMesh++];
              m.setEnabled(true);
              m.position.set(pos[0], pos[1], pos[2]);
            }
          }
        }
        for (let k = usedMesh; k < probeMeshes.length; k++) probeMeshes[k].setEnabled(false);
      }

      // Redraw radar at ~15 Hz
      if (radar && radarOpen && time - lastRadarDraw > 0.065) {
        lastRadarDraw = time;
        if (snap.routeActive && routeStartTime !== null) routeElapsed = time - routeStartTime;
        const rm = document.getElementById('b3d-radar-mode');
        if (rm) rm.textContent = phase === 'upper' ? '主环 4 胞' : '八胞全通';
        radar.render({
          state,
          progress: snap,
          holonomyDeg: holonomy.maxHolonomyDeg || holonomy.lastHolonomyDeg,
          holonomyProved: holonomy.holonomyProved,
          routeTimerSec: routeElapsed
        });
      }
    }
  };

  updateInstrumentCounts();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initEnhancements);
} else {
  initEnhancements();
}
