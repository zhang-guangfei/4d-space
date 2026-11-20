import assert from 'node:assert/strict';
import { openLogbook } from './dist/chapter2/logbook.mjs';
import { act, createState, SECTIONS } from './dist/chapter2/rules.mjs';

const values = new Map();
const storage = { getItem(key) { return values.get(key); }, setItem(key,value) { values.set(key,value); } };
const log = openLogbook(storage);
const cargoIndex = SECTIONS.findIndex(s => s.id === 'cargo');
let state = createState(cargoIndex);
const pose = { x: 0, z: 2.3, yaw: 1, pitch: -.1 };
assert.equal(log.initial.index, 0);
log.switchTo(cargoIndex);
assert.equal(log.toggleSound(), false);
for (const [action, options] of [['interact', {}], ['basis', {}], ['move', {axis: 'x', delta: 1}], ['move', {axis: 'w', delta: 1}]]) {
  log.append(action, options, pose);
  state = act(state, action, { ...options, near: true });
}
const restored = openLogbook(storage);
assert.deepEqual(restored.initial, state);
assert.deepEqual(act(restored.initial,'undo'), act(state,'undo'));
assert.deepEqual(restored.pose, pose);
assert.equal(restored.sound, false);
restored.switchTo(0);
assert.deepEqual(openLogbook(storage).initial, createState(0));
assert.equal(openLogbook(storage).pose, null);
assert.equal(openLogbook(undefined).initial.index, 0);
assert.doesNotThrow(() => openLogbook(undefined).savePose(pose));
const key = [...values.keys()][0];
for (const saved of ['{', '{"index":999,"commands":[]}', '{"index":0,"commands":[["warp"]]}']) {
  values.set(key, saved);
  assert.deepEqual(openLogbook(storage).initial, createState(0));
}
console.log('PASS Codex logbook: cargo replay/undo, reload, sound, pose, section reset, invalid saves and storage denial.');
