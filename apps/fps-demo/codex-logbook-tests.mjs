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
for (const [action, options] of [['basis', {}], ['move', {axis: 'x', delta: 1}], ['move', {axis: 'w', delta: 1}]]) {
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
// These snapshots use the old format, including its one-time briefing. A W
// shift (or cargo basis change) can precede the briefing. Replay all other
// commands, and do not consume the first genuine interaction on a later load.
const oldSaves = [
  ['echo', ['w+', 'brief', 'interact'], true],
  ['vault', ['brief', 'w+', 'w-', 'interact'], true],
  ['bridge', ['turn+', 'brief', 'turn+', 'interact'], true],
  ['sphere', ['interact', 'w+', 'interact'], false],
  ['crystal', ['w+', 'interact', 'w+', 'interact'], true],
  ['cargo', ['basis', 'brief', ['move','x',1], ['move','w',1]], false],
  ['mirror', ['turn+', 'brief', 'turn+', 'turn+', 'turn+', 'interact'], true],
  ['rings', ['interact', 'w+', 'interact', 'w-', 'interact'], true],
  ['clinic', ['w+', 'brief', 'w+', 'turn+', 'interact', 'w-', 'interact'], true],
  ['home', ['w+', 'w+', 'w+', 'interact'], false],
];
for (const [id, history, finished] of oldSaves) {
  const index = SECTIONS.findIndex(section => section.id === id);
  const tuples = history.map(command => typeof command === 'string' ? [command] : command);
  const commands = tuples.map(command => command[0] === 'brief' ? ['interact'] : command);
  const expected = tuples.filter(([action]) => action !== 'brief').reduce(
    (current, [name, axis, delta]) => act(current, name, {near:true, axis, delta}),
    createState(index));
  assert.equal(expected.done, finished, id);
  values.set(key, JSON.stringify({index, pose, sound:false, commands}));
  const migrated = openLogbook(storage);
  assert.deepEqual(migrated.initial, expected, id);
  assert.deepEqual(migrated.pose, pose);
  assert.equal(migrated.sound, false);
  migrated.savePose(pose);
  assert.deepEqual(openLogbook(storage).initial, expected, 'repeated load ' + id);
  if (history.includes('brief')) {
    values.set(key, JSON.stringify({index, commands:[['interact']]}));
    assert.deepEqual(openLogbook(storage).initial, createState(index), 'only the old briefing ' + id);
  }
}
console.log('PASS Codex logbook: cargo replay/undo, migration of all ten legacy sections, reload, sound, pose, section reset, invalid saves and storage denial.');
