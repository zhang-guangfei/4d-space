import assert from 'node:assert/strict';
import { act, createState, objective, SECTIONS, target } from './dist/chapter2/rules.mjs';
import { anchorRings, bridgeAligned, cargoDocked, createBoard, displayCell, moveBoard, rotateXW, sliceProfile, undoBoard } from './dist/chapter2/puzzles.mjs';

const near = { near: true };
const interact = state => act(state, 'interact', near);
const indexOf = id => SECTIONS.findIndex(section => section.id === id);
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-10, a + ' != ' + b);
const distance = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
const coords = ['x', 'y', 'z', 'w'];

assert.equal(SECTIONS.length, new Set(SECTIONS.map(section => section.id)).size);
for (const [index, section] of SECTIONS.entries()) {
  const state = createState(index);
  assert.equal(state.line, section.opening);
  assert.ok(objective(state).length);
  assert.ok(Number.isFinite(target(state).x));
  assert.ok(Number.isFinite(target(state).z));
  assert.equal(act(state, 'interact').step, 0);
  assert.equal(act(state, 'jump_to_end'), state);
}
// W translation alone preserves the marked point in the XYZ room and its
// interaction state. Returning by the opposite key restores the initial sample.
const atReceiver = createState(indexOf('echo'));
const acrossW = act(atReceiver, 'w+');
assert.deepEqual(target(acrossW), target(atReceiver));
assert.equal(acrossW.step, atReceiver.step);
assert.deepEqual(act(acrossW, 'w-'), atReceiver);
assert.throws(() => createState(-1), RangeError);
assert.throws(() => createState(SECTIONS.length), RangeError);

// Two objects with identical central radius have different off-centre profiles.
// A tangent point has zero radius, distinct from the empty intersection outside.
for (const id of ['sphere', 'crystal']) {
  assert.equal(sliceProfile(id, 1).radius, 1.5);
  assert.equal(sliceProfile(id, -0.5).radius, 0);
  assert.equal(sliceProfile(id, 2.5).radius, 0);
  assert.equal(sliceProfile(id, 3).radius, null);
  close(sliceProfile(id, 0).radius, sliceProfile(id, 2).radius);
}
close(sliceProfile('sphere', 0).radius, Math.sqrt(1.25));
close(sliceProfile('crystal', 0).radius, 0.5);
assert.throws(() => sliceProfile('bridge', 1), RangeError);

const vertices = [[0, 0, 0, 0], [2, 0, 0, 0], [0, 3, 0, 0], [0, 0, 1, 0]];
for (const theta of [0, 20, 45, 90, 137, 180]) {
  const rotated = vertices.map(v => rotateXW(v, theta));
  for (let i = 0; i < rotated.length; i++) {
    for (let j = 0; j < i; j++) close(distance(rotated[i], rotated[j]), distance(vertices[i], vertices[j]));
  }
}
const reversed = vertices.map(v => rotateXW(v, 180));
for (const p of reversed) close(p[3], 0);
close(reversed[1][0] * reversed[2][1] * reversed[3][2], -6);
for (const angle of [0, 45, 135, 180]) assert.equal(bridgeAligned(angle), false);
assert.equal(bridgeAligned(90), true);

// Count piercings of the disk bounded by the fixed circle. Opposite crossings
// have opposite orientation; a single interior crossing is the Hopf link.
function mooringLinked(step) {
  const [fixed, moving] = anchorRings({step,w:0});
  assert.equal(fixed.plane, 'XY');
  assert.equal(moving.plane, 'XZ');
  assert.deepEqual(fixed.center.slice(1), moving.center.slice(1));
  const dx = moving.center[0] - fixed.center[0];
  const x = [dx - moving.radius, dx + moving.radius];
  // Clearance in the original and final slices exceeds both tube radii.
  for (const crossing of x) assert.ok(Math.abs(Math.abs(crossing) - fixed.radius) > .09);
  return x.filter(crossing => Math.abs(crossing) < fixed.radius).length === 1;
}
assert.equal(mooringLinked(0), true);
assert.equal(mooringLinked(2), false);
const [fixedRing, raisedRing] = anchorRings({step:1,w:1});
assert.ok(raisedRing.center[3] - fixedRing.center[3] > .09);

// Test both positive and negative edge cases without mutating the underlying world.
const origin = createBoard();
assert.deepEqual(origin.dims, [4, 4, 2, 4]);
assert.equal(moveBoard(origin, 'w', -1), origin);
assert.equal(moveBoard(origin, 'z', 2), origin);
assert.equal(moveBoard(origin, '?', 1), origin);
const againstWall = { ...origin, player: [1, 0, 0, 2] };
assert.equal(moveBoard(againstWall, 'x', 1), againstWall);
const againstCrate = { ...origin, boxes: [[2, 1, 0, 0], [3, 1, 0, 0]] };
assert.equal(moveBoard(againstCrate, 'x', 1), againstCrate);
const tug = moveBoard(origin, 'x', 1);
const pushed = moveBoard(tug, 'w', 1);
assert.deepEqual(pushed.boxes[0], [2, 1, 0, 2]);
assert.deepEqual(origin.player, [1, 1, 0, 0]);
assert.deepEqual(origin.boxes[0], [2, 1, 0, 1]);
assert.deepEqual(undoBoard(pushed), tug);
assert.equal(undoBoard(origin), origin);
assert.deepEqual(displayCell([1, 2, 0, 3], 'XYZ'), { x: 1, y: 2, depth: 0, slice: 3 });
assert.deepEqual(displayCell([1, 2, 0, 3], 'XYW'), { x: 1, y: 2, depth: 3, slice: 0 });

// Verify shortest route without using chapter goals. Z is genuinely needed to get behind
// the crate. An alternate display basis must never change the solution graph.
function shortestRoute(axes, limit = Infinity) {
  const pending = [createBoard()];
  const visited = new Set();
  for (let head = 0; head < pending.length; head++) {
    const board = pending[head];
    if (cargoDocked(board)) return board.moves;
    if (board.moves >= limit) continue;
    for (const axis of axes) {
      for (const step of [-1, 1]) {
        const next = moveBoard(board, axis, step);
        if (next === board) continue;
        const key = next.player + '|' + next.boxes;
        if (!visited.has(key)) {
          visited.add(key);
          pending.push({ ...next, history: [] });
        }
      }
    }
  }
  return Infinity;
}
assert.equal(shortestRoute(coords, 8), 8);
assert.equal(shortestRoute(['x', 'y', 'w']), Infinity);
assert.equal(shortestRoute(['x', 'y', 'z']), Infinity);

const cargoRoute = [['x', 1], ['w', 1], ['w', 1], ['z', 1], ['y', -1], ['w', 1], ['z', -1], ['y', 1]];
let cargo = createState(indexOf('cargo'));
assert.equal(act(cargo, 'move', { axis: 'x', delta: 1 }).board, cargo.board);
cargo = interact(cargo);
assert.equal(interact(cargo).done, false);
const inspection = act(cargo, 'basis');
assert.equal(inspection.basis, 'XYW');
assert.equal(inspection.board, cargo.board);
assert.equal(act(inspection, 'basis').basis, 'XYZ');
for (const [axis, delta] of cargoRoute) cargo = act(cargo, 'move', { axis, delta });
assert.equal(cargoDocked(cargo.board), true);
assert.equal(cargo.w, cargo.board.player[3]);
assert.equal(cargoDocked(act(cargo, 'undo').board), false);
assert.deepEqual(act(cargo, 'reset').board, createBoard());
assert.equal(interact(cargo).done, true);

const routes = {
  echo: ['F', 'w+', 'F'],
  vault: ['F', 'w+', 'w-', 'F'],
  bridge: ['F', 'turn+', 'turn+', 'F'],
  sphere: ['F', 'w+', 'F', 'w+', 'F'],
  crystal: ['w+', 'F', 'w+', 'F'],
  mirror: ['F', 'turn+', 'turn+', 'turn+', 'turn+', 'F'],
  rings: ['F', 'w+', 'F', 'w-', 'F'],
  clinic: ['F', 'turn+', 'w+', 'w+', 'F', 'w-', 'F'],
  home: ['w+', 'w+', 'w+', 'F', 'w-', 'w-', 'w-', 'F'],
};
for (const [id, actions] of Object.entries(routes)) {
  let state = createState(indexOf(id));
  for (const action of actions) {
    assert.equal(state.done, false);
    state = action === 'F' ? interact(state) : act(state, action);
  }
  assert.equal(state.done, true, id);
  assert.equal(act(state, 'w+'), state);
  assert.ok(state.line);
}
let mirror = interact(createState(indexOf('mirror')));
assert.equal(interact(mirror).step, 1);
mirror = act(mirror, 'turn+');
assert.equal(interact(mirror).step, 1);
let echo = interact(createState(indexOf('echo')));
assert.equal(interact(echo).done, false);
for (let i = 0; i < 9; i++) echo = act(echo, 'w+');
assert.equal(echo.w, 3);
for (let i = 0; i < 9; i++) echo = act(echo, 'w-');
assert.equal(echo.w, 0);
console.log('PASS Codex chapter 2: 10 playable sequences, section solids, 4D isometry, bridge latch, cargo topology and history');
