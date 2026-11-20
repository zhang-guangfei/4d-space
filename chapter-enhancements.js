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
import { CharacterVoice } from './voice.js';
import { TopologyRadar, TesseractStaticMap, computeHamiltonianRouteHint } from './radar.js';

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
  const voice = new CharacterVoice(audio);
  let radar = null;
  let tesseractMap = null;
  let radarOpen = true;
  let showRouteHint = false;
  let strideSign = 0;
  let lastRadarDraw = 0;
  let routeStartTime = null;
  let routeElapsed = 0;

  // Header buttons: Chapter 2 quick jump, Room Compass & 3D Map toggle (M), Voice toggle, Sound toggle (V)
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
  radarBtn.textContent = 'M · 罗盘与地图';
  radarBtn.title = '显示/隐藏六向罗盘与八胞体立体地图 (M)';

  const voiceBtn = document.createElement('button');
  voiceBtn.className = 'b3d-pill-btn active';
  voiceBtn.id = 'b3d-voice-btn';
  voiceBtn.textContent = '🎙️ 配音 开';
  voiceBtn.title = '开启/关闭人物中文语音播报';

  const audioBtn = document.createElement('button');
  audioBtn.className = 'b3d-pill-btn';
  audioBtn.id = 'b3d-audio-btn';
  audioBtn.textContent = 'V · 音效 开';
  audioBtn.title = '切换空间站环境音效 (V)';

  if (header && pauseBtn) {
    header.insertBefore(toolWrap, pauseBtn);
    toolWrap.append(ch2Link, radarBtn, voiceBtn, audioBtn, pauseBtn);
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

  // Player-centric first-person 6-door navigation compass + 3D static 8-cell tesseract map dock
  const dock = document.createElement('aside');
  dock.id = 'b3d-dock';
  dock.innerHTML = `
    <div class="b3d-theme-banner">《回廊空间站》· 外壳上的迷宫</div>
    <div id="b3d-radar-wrap">
      <div class="b3d-radar-head">
        <span>六向舱门导航罗盘</span>
        <span id="b3d-radar-mode">四室回廊</span>
      </div>
      <canvas id="b3d-radar-canvas" width="336" height="372"></canvas>
    </div>
    <div id="b3d-tesseract-wrap">
      <div class="b3d-radar-head b3d-tesseract-head">
        <span>八胞体立体地图</span>
        <button id="b3d-hint-btn" class="b3d-hint-btn" type="button" title="点击或按 H 键，在八胞体立体模型中用连线显示不重复路线答案">💡 路线答案 (H)</button>
      </div>
      <canvas id="b3d-tesseract-canvas" width="336" height="252"></canvas>
    </div>
  `;
  document.body.appendChild(dock);
  radar = new TopologyRadar(document.getElementById('b3d-radar-canvas'));
  tesseractMap = new TesseractStaticMap(document.getElementById('b3d-tesseract-canvas'));
  const hintBtn = document.getElementById('b3d-hint-btn');
  const tesseractWrap = document.getElementById('b3d-tesseract-wrap');

  // Inject direct Chapter 2 transition action inside #ending (after Chapter 1 completion)
  const endingPanel = document.querySelector('#ending .panel');
  if (endingPanel && !endingPanel.querySelector('.b3d-ending-actions')) {
    const actions = document.createElement('div');
    actions.className = 'b3d-ending-actions';
    actions.innerHTML = `<a href="chapter2.html" class="primary">跃入裂隙 · 进入第二章《折页之间》→</a>`;
    endingPanel.appendChild(actions);
  }

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

  function renderTesseractNow() {
    if (!tesseractMap) return;
    tesseractMap.render({
      state: bridge.getState(),
      progress: bridge.getProgress().snapshot(),
      time: bridge.getTime(),
      showHint: showRouteHint
    });
  }

  function toggleRouteHint() {
    showRouteHint = !showRouteHint;
    if (hintBtn) {
      hintBtn.classList.toggle('active', showRouteHint);
      hintBtn.textContent = showRouteHint ? '💡 隐藏答案 (H)' : '💡 路线答案 (H)';
    }
    tesseractWrap?.classList.toggle('hint-on', showRouteHint);
    if (showRouteHint && !radarOpen) {
      radarOpen = true;
      document.getElementById('b3d-radar-wrap')?.classList.remove('hidden-radar');
      tesseractWrap?.classList.remove('hidden-radar');
      radarBtn.classList.add('active');
    }
    renderTesseractNow();
    if (showRouteHint) {
      const snap = bridge.getProgress().snapshot();
      const hint = computeHamiltonianRouteHint(snap);
      const routeStr = hint.path.join('→') + (hint.closesToStart ? '→W+' : '');
      if (hint.deadEnd) {
        showToast(`当前路线陷入死胡同！回 W+ 重启并按金线走：${routeStr}`, 'warm');
      } else {
        showToast(`已在八胞体立体地图标出不重复路线答案：${routeStr}`, 'warm');
      }
    }
  }

  if (hintBtn) {
    hintBtn.addEventListener('mousedown', e => e.stopPropagation());
    hintBtn.onclick = e => {
      e.stopPropagation();
      toggleRouteHint();
    };
  }

  radarBtn.onclick = () => {
    radarOpen = !radarOpen;
    document.getElementById('b3d-radar-wrap')?.classList.toggle('hidden-radar', !radarOpen);
    tesseractWrap?.classList.toggle('hidden-radar', !radarOpen);
    radarBtn.classList.toggle('active', radarOpen);
    if (radarOpen) renderTesseractNow();
  };
  voiceBtn.onclick = () => {
    audio.unlock();
    voice.unlock();
    const on = voice.toggle();
    voiceBtn.textContent = on ? '🎙️ 配音 开' : '🎙️ 配音 关';
    voiceBtn.classList.toggle('active', on);
    if (on) voice.speak('语音播报已开启，领航员系统在线。', { persona: 'linxia', force: true });
  };
  audioBtn.onclick = () => {
    audio.unlock();
    const muted = audio.toggleMute();
    audioBtn.textContent = muted ? 'V · 音效 关' : 'V · 音效 开';
  };

  const unlockOnce = () => { audio.unlock(); voice.unlock(); };
  window.addEventListener('pointerdown', unlockOnce, { once: true });
  window.addEventListener('keydown', unlockOnce, { once: true });

  document.addEventListener('keydown', e => {
    const tag = e.target?.tagName;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || e.repeat) return;
    if (e.code === 'KeyM' && !bridge.isLabOpen()) {
      radarBtn.click();
    } else if (e.code === 'KeyH' && !bridge.isLabOpen()) {
      e.preventDefault();
      toggleRouteHint();
    } else if (e.code === 'KeyV') {
      audioBtn.click();
    }
  });

  renderTesseractNow();

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
      voice.unlock();
      const state = bridge.getState();
      const look = bridge.getLook();
      const fwd = viewBasis(look).forward;
      const worldFwd = tangentToWorld(state.frame, fwd);
      const aligned = worldFwd.some(c => Math.abs(c) > 0.88);
      audio.wave(aligned);
      if (aligned) {
        const hand = side === 'left' ? '左手（红袖标）' : '右手（金袖标）';
        const msg = `远处那道背影，也同步举起了同一侧的${hand}。`;
        showToast(msg, 'warm');
        voice.speak(msg, { persona: 'narrator' });
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
        const msg = '八间房全部走通！回到起点 W+，中央浮现了一颗镜面球。';
        showToast(msg, 'warm');
        voice.speak(msg, { persona: 'linxia', force: true });
      } else if (snap.routeFailure) {
        audio.routeFail();
        const msg = `再次踏入了走过的 ${snap.routeFailure.cell}，回到 W+ 可重新出发。`;
        showToast(msg);
        voice.speak(msg, { persona: 'narrator' });
      } else if (snap.routeActive) {
        audio.routeStep(snap.routeTrail.length);
        showToast(`不重复路线 ${snap.routeTrail.length}/8 · 抵达 ${cell}`);
      }
      updateSave();
    },
    onRouteStart() {
      audio.unlock();
      voice.unlock();
      audio.routeStep(1);
      routeStartTime = bridge.getTime();
      routeElapsed = 0;
      const msg = '八室巡航开始：连续走过八间不同的房间！可随时按 H 键在八胞体地图查看路线答案。';
      showToast(msg, 'warm');
      voice.speak(msg, { persona: 'linxia' });
    },
    onOpenLab(room, snap) {
      audio.unlock();
      voice.unlock();
      audio.hologramOpen();
      if (snap.truthRevealed && room !== 'W+' && !snap.truthViewed) {
        const msg = '三个猜想都已看过——回到起点 W+，那里出现了新的全息台！';
        showToast(msg, 'warm');
        voice.speak(msg, { persona: 'linxia' });
      }
      updateSave();
    },
    onCloseLab() {
      updateSave();
    },
    onUnlock() {
      audio.unlock();
      voice.unlock();
      audio.airlockUnlock();
      audio.setMode('lower');
      const msg = '六扇舱门全部开启，重力解除！向任意方向漂浮探索吧。';
      showToast(msg, 'warm');
      voice.speak(msg, { persona: 'linxia', force: true });
      updateSave();
    },
    onFinish() {
      audio.evidenceUnlocked();
      voice.speak('你已穿破八胞外壳，跃入四维内部空间！欢迎进入第二章折页之间。', { persona: 'linxia', force: true });
      updateSave();
    },
    onReset() {
      routeStartTime = null;
      routeElapsed = 0;
      voice.stop();
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

      if (radar && radarOpen && time - lastRadarDraw > 0.06) {
        lastRadarDraw = time;
        if (snap.routeActive && routeStartTime !== null) routeElapsed = time - routeStartTime;
        const rm = document.getElementById('b3d-radar-mode');
        if (rm) rm.textContent = snap.routeActive ? '一笔画挑战' : (phase === 'upper' ? '四室回廊' : '八室六向全通');
        radar.render({
          state,
          look,
          time,
          progress: snap,
          holonomyDeg: 0,
          holonomyProved: false,
          routeTimerSec: routeElapsed
        });
        if (tesseractMap) {
          tesseractMap.render({
            state,
            progress: snap,
            time,
            showHint: showRouteHint
          });
        }
      }
    }
  };
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initEnhancements);
} else {
  initEnhancements();
}
