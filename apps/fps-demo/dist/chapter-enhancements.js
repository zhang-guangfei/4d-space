/**
 * Chapter 1 Sensory Immersion Layer:
 *  - Procedural spatial audio (footsteps, hover hum, zero-G thrusters, doorway chimes, hand-wave echo)
 *  - Proximity [F] holographic console prompt & doorway seam shimmer
 *  - Clean room compass mini-map (M)
 *  - Auto-save / resume & direct Chapter 2 transition button
 */
import { CELL_COLORS } from './colored-tesseract.js';
import { cellId, localPoint, tangentToWorld } from './chapter-topology.js';
import { viewBasis } from './chapter-motion.js';
import { ROOM_MODELS, roomModel } from './model-content.js';
import { SpaceAudio } from './sound.js';
import { TopologyRadar } from './radar.js';

const SAVE_KEY = 'beyond3d_ch1_save_v1';

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
  let radar = null;
  let radarOpen = true;
  let strideSign = 0;
  let lastRadarDraw = 0;
  let routeStartTime = null;
  let routeElapsed = 0;

  // Header buttons: Chapter 2 quick jump, Room Compass toggle (M), Sound toggle (V)
  const header = document.querySelector('header');
  const pauseBtn = document.getElementById('pause');
  const toolWrap = document.createElement('div');
  toolWrap.className = 'b3d-header-tools';

  const ch2Link = document.createElement('a');
  ch2Link.className = 'b3d-pill-btn warm';
  ch2Link.href = 'chapter2.html';
  ch2Link.textContent = '第二章 · 折页之间 →';
  ch2Link.title = '前往第二章：第一人称四维内部体验';

  const radarBtn = document.createElement('button');
  radarBtn.className = 'b3d-pill-btn active b3d-hide-sm';
  radarBtn.id = 'b3d-radar-btn';
  radarBtn.textContent = 'M · 房间方位';
  radarBtn.title = '显示/隐藏房间连接罗盘 (M)';

  const audioBtn = document.createElement('button');
  audioBtn.className = 'b3d-pill-btn';
  audioBtn.id = 'b3d-audio-btn';
  audioBtn.textContent = 'V · 音效 开';
  audioBtn.title = '切换空间站环境音效 (V)';

  if (header && pauseBtn) {
    header.insertBefore(toolWrap, pauseBtn);
    toolWrap.append(ch2Link, radarBtn, audioBtn, pauseBtn);
  }

  // Room color swatch next to #cell
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

  // Compact room compass dock
  const dock = document.createElement('aside');
  dock.id = 'b3d-dock';
  dock.innerHTML = `
    <div id="b3d-radar-wrap">
      <div class="b3d-radar-head">
        <span>空间连接罗盘</span>
        <span id="b3d-radar-mode">回廊</span>
      </div>
      <canvas id="b3d-radar-canvas" width="220" height="228"></canvas>
    </div>
  `;
  document.body.appendChild(dock);
  radar = new TopologyRadar(document.getElementById('b3d-radar-canvas'));

  // Resume saved progress button + Chapter 2 button on start menu
  const startBtn = document.getElementById('start');
  const resumeSaveBtn = document.createElement('button');
  resumeSaveBtn.id = 'b3d-resume-save';
  resumeSaveBtn.className = 'secondary hidden';
  if (startBtn && startBtn.parentNode) {
    startBtn.insertAdjacentElement('afterend', resumeSaveBtn);
  }

  function showToast(text, kind = '') {
    const item = document.createElement('div');
    item.className = 'b3d-toast' + (kind ? ' ' + kind : '');
    item.textContent = text;
    toastStack.appendChild(item);
    while (toastStack.children.length > 2) toastStack.firstChild.remove();
    setTimeout(() => {
      item.style.transition = 'opacity 0.35s ease';
      item.style.opacity = '0';
      setTimeout(() => item.remove(), 380);
    }, 3600);
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
    if (p.inspected.length === 0 && p.phase === 'upper') return;
    writeJSON(SAVE_KEY, {
      phase: p.phase,
      inspected: p.inspected,
      truthRevealed: p.truthRevealed,
      truthViewed: p.truthViewed,
      counts: p.counts,
      routeComplete: p.routeComplete,
      savedAt: Date.now()
    });
  }

  function checkSavedPrompt() {
    const saved = readJSON(SAVE_KEY);
    if (!saved) {
      resumeSaveBtn.classList.add('hidden');
      return;
    }
    resumeSaveBtn.textContent = saved.routeComplete
      ? '继续上次进度（镜面球已开启）'
      : saved.phase === 'lower'
        ? '继续上次进度（零重力六向）'
        : `继续上次进度（已看 ${saved.inspected?.length || 0}/3）`;
    resumeSaveBtn.classList.remove('hidden');
  }
  checkSavedPrompt();

  resumeSaveBtn.onclick = () => {
    audio.unlock();
    const saved = readJSON(SAVE_KEY);
    if (!saved) return;
    if (bridge.restoreProgress(saved)) {
      audio.setMode(bridge.getPhase());
      resumeSaveBtn.classList.add('hidden');
      showToast('已恢复上次探索位置。');
      bridge.resumeCorridor();
    }
  };

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

  const unlockOnce = () => { audio.unlock(); };
  window.addEventListener('pointerdown', unlockOnce, { once: true });
  window.addEventListener('keydown', unlockOnce, { once: true });

  document.addEventListener('keydown', e => {
    const tag = e.target?.tagName;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || e.repeat) return;
    if (e.code === 'KeyM' && !bridge.isLabOpen()) {
      radarBtn.click();
    } else if (e.code === 'KeyV') {
      audioBtn.click();
    }
  });

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
      const aligned = worldFwd.some(c => Math.abs(c) > 0.88);
      audio.wave(aligned);
      if (aligned) {
        const hand = side === 'left' ? '左手（红袖标）' : '右手（金袖标）';
        showToast(`远处那道背影，也同步举起了同一侧的${hand}。`, 'warm');
      }
    },
    onSeam(fromCell, toCell, state, phase) {
      audio.unlock();
      audio.seamCross(toCell, phase === 'lower');
      pulseSeam(toCell);
      updateSave();
    },
    onInterior(cell, snap) {
      if (snap.routeComplete) {
        audio.evidenceUnlocked();
        showToast('八间房全部走通！回到起点 W+，中央浮现了一颗镜面球。', 'warm');
      } else if (snap.routeFailure) {
        audio.routeFail();
        showToast(`再次踏入了走过的 ${snap.routeFailure.cell}，回到 W+ 可重新出发。`);
      } else if (snap.routeActive) {
        audio.routeStep(snap.routeTrail.length);
        showToast(`不重复路线 ${snap.routeTrail.length}/8 · 抵达 ${cell}`);
      }
      updateSave();
    },
    onRouteStart() {
      audio.unlock();
      audio.routeStep(1);
      routeStartTime = bridge.getTime();
      routeElapsed = 0;
      showToast('八室巡航开始：连续走过八间不同的房间！', 'warm');
    },
    onOpenLab(room, snap) {
      audio.unlock();
      audio.hologramOpen();
      if (snap.truthRevealed && room !== 'W+' && !snap.truthViewed) {
        showToast('三个猜想都已看过——回到起点 W+，那里出现了新的全息台！', 'warm');
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
      showToast('六扇舱门全部开启，重力解除！向任意方向漂浮探索吧。', 'warm');
      updateSave();
    },
    onFinish() {
      audio.evidenceUnlocked();
      updateSave();
    },
    onReset() {
      routeStartTime = null;
      routeElapsed = 0;
      audio.setMode('upper');
      try { localStorage.removeItem(SAVE_KEY); } catch {}
      checkSavedPrompt();
    },
    onFrame(dt, time, state, look, velocity, phase, keys, ground, gait, active, snap) {
      const curCell = cellId(state.normal);
      cellSwatch.style.backgroundColor = CELL_COLORS[curCell] || '#80ccb9';

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

      const distCenter = Math.hypot(...localPoint(state));
      const canInspect = active && !bridge.isLabOpen() &&
        ROOM_MODELS[curCell] && bridge.truthAvailable(curCell) && distCenter < 4.5;
      if (canInspect) {
        const model = roomModel(curCell);
        promptEl.innerHTML = `<kbd>F</kbd> 操作全息模型 · ${model.title}`;
        promptEl.classList.add('show');
      } else {
        promptEl.classList.remove('show');
      }

      if (radar && radarOpen && time - lastRadarDraw > 0.08) {
        lastRadarDraw = time;
        if (snap.routeActive && routeStartTime !== null) routeElapsed = time - routeStartTime;
        const rm = document.getElementById('b3d-radar-mode');
        if (rm) rm.textContent = phase === 'upper' ? '四室回廊' : '八室全通';
        radar.render({
          state,
          progress: snap,
          holonomyDeg: 0,
          holonomyProved: false,
          routeTimerSec: routeElapsed
        });
      }
    }
  };
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initEnhancements);
} else {
  initEnhancements();
}
