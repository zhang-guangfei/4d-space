import { SECTIONS, createState, act } from './rules.mjs';
import { createWorld } from './scene.mjs';
import { createConsole } from './console.mjs';
import { createRadio } from './radio.mjs';
import { openLogbook } from './logbook.mjs';
import { readRenderQualityMode, saveRenderQualityMode } from '../render-quality.js';

const canvas = document.getElementById('world');
let storage;
try { storage = window.localStorage; } catch { /* Storage is optional. */ }
const log = openLogbook(storage);
const resolution = document.getElementById('resolution');
const resolutionReadout = document.getElementById('resolution-readout');
resolution.value = readRenderQualityMode();
resolution.addEventListener('change', () => {
  saveRenderQualityMode(resolution.value);
  world?.setQuality(resolution.value);
});
const radio = createRadio(log.sound);
let state = log.initial;
let mode = 'loading';
let world;
let nearby = false;
const ui = createConsole({ onAction: command, onStart: resume, onPause: pause, onPointer: togglePointer,
  onSection: changeSection, onNext: next, onExpand: () => world?.resize() });
const sound = document.getElementById('sound');
function soundLabel() {
  sound.textContent = log.sound ? '音效开' : '音效关';
  sound.setAttribute('aria-pressed', String(log.sound));
  sound.title = log.sound ? '关闭通讯音效' : '开启通讯音效';
  sound.setAttribute('aria-label', sound.title);
}
soundLabel();
sound.addEventListener('click', () => {
  radio.setEnabled(log.toggleSound());
  soundLabel();
  radio.play('page');
});

function setMode(value) {
  mode = value;
  if (value !== 'playing' && document.pointerLockElement === canvas) document.exitPointerLock();
  ui.setMode(value);
  world?.setActive(value === 'playing');
  if (value === 'playing') canvas.focus({ preventScroll: true });
  else if (value === 'paused' || value === 'ending') document.getElementById('start').focus({ preventScroll: true });
}
function changeSection(index) {
  if (!Number.isInteger(index) || !SECTIONS[index] || !world) return;
  state = createState(index);
  log.switchTo(index);
  nearby = false;
  ui.setNear(false);
  ui.render(state);
  world.setSection(SECTIONS[index], state);
  if (mode !== 'loading') {
    setMode('playing');
    radio.play('page');
  }
}
function resume() {
  if (mode === 'ending') changeSection(0);
  else if (mode === 'paused') setMode('playing');
}
function pause() {
  if (mode === 'paused') return resume();
  if (mode !== 'playing') return;
  log.savePose(world.getPose?.());
  setMode('paused');
}
function next() {
  if (!state.done || mode !== 'playing') return;
  if (state.index + 1 < SECTIONS.length) changeSection(state.index + 1);
  else {
    setMode('ending');
    radio.play('receipt');
  }
}
function command(name, options = {}) {
  if (mode !== 'playing' || !world) return;
  const updated = act(state, name, { ...options, near: nearby });
  if (updated === state) return;
  if ((state.w !== updated.w || state.angle !== updated.angle) && !world.canOccupy(updated)) {
    ui.setStatus('这一处容不下身体。先退到空地，再改变切片。');
    return;
  }
  if (state.step !== updated.step || state.done !== updated.done || state.w !== updated.w || state.angle !== updated.angle || state.basis !== updated.basis || state.board !== updated.board) {
    log.append(name, options, world.getPose?.());
    if (updated.done) radio.play('ident');
    else if (state.step !== updated.step) radio.play('contact');
    else if (state.w !== updated.w) radio.play('page');
  }
  state = updated;
  world.update(state);
  ui.render(state);
}
function syncPointer() {
  const captured = document.pointerLockElement === canvas;
  ui.setPointerCaptured(captured);
  if (captured) {
    if (mode === 'playing') canvas.focus({ preventScroll: true });
    else document.exitPointerLock();
  }
}
function togglePointer() {
  if (mode !== 'playing') return;
  const capture = document.pointerLockElement !== canvas;
  if (capture) canvas.focus({ preventScroll: true });
  world.setMouseMode(capture);
}
// Chromium only unlocks Web Audio after a gesture. The opening and its goal
// are already visible while we wait for the first actual footstep or look.
function soundOpening(event) {
  if (mode !== 'playing' || !event.isTrusted) return;
  if (event.type === 'keydown' && !['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code)) return;
  if (state.index === 0 && !state.done) radio.play('ident');
  canvas.removeEventListener('pointerdown',soundOpening);
  canvas.removeEventListener('keydown',soundOpening);
}
canvas.addEventListener('pointerdown',soundOpening);
canvas.addEventListener('keydown',soundOpening);
document.addEventListener('pointerlockchange', syncPointer);
document.addEventListener('pointerlockerror', () => {
  syncPointer();
  ui.setStatus('浏览器保留了指针，可在画面中按住鼠标拖动环视。');
});
window.addEventListener('keydown', event => {
  if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
  if (event.code === 'Escape' && (mode === 'playing' || mode === 'paused')) {
    event.preventDefault();
    if (!event.repeat) pause();
    return;
  }
  if (mode !== 'playing' || event.target?.matches?.('select,input,textarea,[contenteditable=true]')) return;
  if (event.code === 'KeyT') {
    event.preventDefault();
    if (!event.repeat) togglePointer();
    return;
  }
  if (event.code === 'Tab' && document.pointerLockElement === canvas) {
    world.setMouseMode(false);
    return;
  }
  if (event.code === 'KeyN' && state.done) {
    event.preventDefault();
    if (!event.repeat) next();
    return;
  }
  const binding = { KeyQ: 'w-', KeyE: 'w+', BracketLeft: 'w-', BracketRight: 'w+', KeyR: 'turn+', KeyB: 'basis' }[event.code];
  if (binding && SECTIONS[state.index].controls.includes(binding)) {
    event.preventDefault();
    if (!event.repeat) command(binding);
  }
});
window.addEventListener('pagehide', () => { if (world) log.savePose(world.getPose?.()); });
document.addEventListener('visibilitychange', () => { if (document.hidden && mode === 'playing') pause(); });
ui.setSections(SECTIONS, state.index);
ui.render(state);
ui.setReady(false);
try {
  world = createWorld(canvas, {
    qualityMode: resolution.value,
    onResolution(width, height, medianMs) {
      resolutionReadout.textContent = width + ' × ' + height +
        (medianMs ? ' · 游玩中位 ' + Math.round(1000/medianMs) + ' FPS' : '');
    },
    onNear(value, hint) { nearby = value; ui.setNear(value, hint); },
    onInteract() { command('interact'); },
    onPosition(position, yaw) { ui.setPosition(position, yaw); }
  });
  world.setSection(SECTIONS[state.index], state);
  if (log.pose) world.restorePose?.(log.pose);
  await world.whenReady();
  ui.setReady(true);
  setMode('playing');
  syncPointer();
} catch (error) {
  ui.setReady(false);
  ui.setStatus('无法绘制回声场。请开启浏览器硬件加速并重新载入。');
  console.error('Chapter 2 WebGL startup failed', error);
}
