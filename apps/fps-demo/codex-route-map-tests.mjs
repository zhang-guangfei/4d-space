import assert from 'node:assert/strict';
import {ChapterProgress} from './dist/chapter-progress.js';
import {CELL_IDS, H, normalFor} from './dist/chapter-topology.js';
import {insideHatch} from './dist/hatch.js';
import {routeMapState} from './dist/route-map.js';

// Independent oracle: two cubical facets share a square when they pin
// different axes. Every door used below also admits a body at its center.
function sharedDoor(from, to) {
  if (from[0] === to[0]) return false;
  const a = normalFor(from), b = normalFor(to);
  return insideHatch(a, b, a.map((x, i) => H * (x + b[i])), 'lower');
}

function checkAnswer(answer) {
  assert.equal(answer[0], 'W+');
  assert.deepEqual([...answer].sort(), [...CELL_IDS].sort(), 'exactly eight distinct known rooms');
  assert.ok(answer.slice(1).every((id, i) => sharedDoor(answer[i], id)), 'every line crosses a real shared hatch');
}

function enter(progress, id, time) {
  progress.onCross(id, time);
  assert.equal(progress.updateInterior(id, 1, time + 0.8), true);
}

const progress = new ChapterProgress();
for (const model of ['central-hall', 'treadmill', 'sphere']) progress.inspectModel(model);
assert.ok(progress.viewTruth());
assert.deepEqual(routeMapState(progress.snapshot(), true), {
  visible: false, currentCell: null, visited: [], canHint: false, route: [], status: 'hidden'
});
assert.ok(progress.unlockLower());
let state = routeMapState(progress.snapshot(), true);
assert.equal(state.status, 'survey');
assert.deepEqual(state.visited, ['W+']);
assert.equal(state.canHint, false);
assert.deepEqual(state.route, []);
progress.onCross('X+', 1);
state = routeMapState(progress.snapshot());
assert.equal(state.currentCell, 'X+');
assert.ok(!state.visited.includes('X+'));
assert.equal(progress.updateInterior('X+', 1, 2), true);
assert.deepEqual(new Set(routeMapState(progress.snapshot()).visited), new Set(['W+', 'X+']));
progress.debugCompleteSurvey();
enter(progress, 'W+', 3);
assert.equal(routeMapState(progress.snapshot()).status, 'ready');
assert.deepEqual(routeMapState(progress.snapshot()).route, []);
checkAnswer(routeMapState(progress.snapshot(), true).route);
assert.ok(progress.startRoute());
const start = progress.snapshot();
assert.deepEqual(routeMapState(start).visited, ['W+'], 'old survey marks must give way to the new challenge');

// Enumerate all 7! orders, without using the route solver to find completions.
const viablePrefixes = new Set();
function checkPermutation(prefix, remaining) {
  if (!remaining.length) {
    if (prefix.slice(1).every((room, i) => sharedDoor(prefix[i], room))) {
      for (let n = 1; n <= prefix.length; n++) viablePrefixes.add(prefix.slice(0, n).join('/'));
    }
    return;
  }
  for (const room of remaining) {
    checkPermutation([...prefix, room], remaining.filter(id => id !== room));
  }
}
checkPermutation(['W+'], CELL_IDS.filter(id => id !== 'W+'));

let examined = 0, deadEnds = 0, backtracks = 0;
function checkWalk(trail) {
  const currentCell = trail.at(-1);
  const signature = trail.join('/');
  const complete = trail.length === CELL_IDS.length;
  const snapshot = {...start, currentCell, routeTrail: trail, routeActive: !complete, routeComplete: complete};
  const hiddenHint = routeMapState(snapshot);
  assert.deepEqual(hiddenHint.visited, trail);
  assert.deepEqual(hiddenHint.route, []);
  const hint = routeMapState(snapshot, true);
  if (complete) {
    assert.equal(hint.status, 'complete');
    assert.equal(hint.canHint, false);
    assert.deepEqual(hint.route, []);
    return;
  }
  examined++;
  checkAnswer(hint.route);
  const viable = viablePrefixes.has(signature);
  if (viable) {
    assert.equal(hint.status, 'active');
    assert.deepEqual(hint.route.slice(0, trail.length), trail);
  } else {
    deadEnds++;
    assert.equal(hint.status, 'restart');
  }
  for (const next of CELL_IDS.filter(id => sharedDoor(currentCell, id))) {
    const withPending = {...snapshot, currentCell: next, pending: {cell: next, crossedAt: 5}};
    const pending = routeMapState(withPending, true);
    assert.equal(pending.currentCell, next);
    assert.deepEqual(pending.visited, trail);
    checkAnswer(pending.route);
    const extended = [...trail, next];
    if (viablePrefixes.has(extended.join('/'))) {
      assert.equal(pending.status, 'active');
      assert.deepEqual(pending.route.slice(0, extended.length), extended);
    } else if (viable) {
      backtracks++;
      assert.equal(pending.status, 'backtrack');
      assert.deepEqual(pending.route.slice(0, trail.length), trail);
    } else {
      assert.equal(pending.status, 'restart');
    }
    if (!trail.includes(next)) checkWalk(extended);
  }
}
checkWalk(['W+']);
assert.ok(deadEnds > 0 && backtracks > 0);

enter(progress, 'X+', 5);
enter(progress, 'W+', 7);
const failed = progress.snapshot();
state = routeMapState(failed, true);
assert.equal(state.status, 'restart');
assert.deepEqual(state.visited, ['W+', 'X+']);
checkAnswer(state.route);
assert.deepEqual(progress.snapshot(), failed, 'requesting help must not restart or complete the challenge');
assert.ok(progress.startRoute());
const answer = routeMapState(progress.snapshot(), true).route;
let time = 9;
for (const id of answer.slice(1)) {
  enter(progress, id, time);
  time += 2;
}
assert.ok(progress.routeComplete, 'following the displayed answer satisfies the real progression logic');
assert.equal(routeMapState(progress.snapshot(), true).status, 'complete');
if (!sharedDoor(progress.currentCell, 'W+')) {
  enter(progress, 'X+', time);
  time += 2;
}
enter(progress, 'W+', time);
assert.ok(progress.enterBubble());
assert.equal(routeMapState(progress.snapshot(), true).visible, false);
console.log(`PASS static route map: ${examined} unfinished prefixes, ${deadEnds} dead ends, ${backtracks} recoverable threshold entries, spoiler gates and playable full route.`);
