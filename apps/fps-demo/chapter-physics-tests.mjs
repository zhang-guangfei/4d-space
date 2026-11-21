/**
 * Automated verification of Chapter 1 navigation & route solver (radar.js):
 *  - Player-centric First-Person 6-Door Navigation Compass (grounded + 6-DOF zero-G)
 *  - Static 8-Cell Tesseract Map & Hamiltonian Route Answer Solver
 */
import assert from 'node:assert/strict';
import { initialState } from './dist/chapter-topology.js';
import {
  computeSixDoorCompass,
  computeHamiltonianRouteHint,
  areCellsAdjacent,
  CANONICAL_HAMILTONIAN_PATH
} from './dist/radar.js';

// 1. Chapter 1 Player-Centric First-Person 6-Door Navigation Compass (radar.js)
{
  const s0 = initialState(); // W+, frame [right=Y-, up=Z+, forward=X+]

  // Grounded yaw = 0 in Stage 2
  const c0 = computeSixDoorCompass(s0.normal, s0.frame, 0, { phase: 'lower', visitedCells: ['W+', 'X+'] });
  assert.equal(c0.current.cellId, 'W+');
  assert.equal(c0.doors.front.cellId, 'X+');
  assert.equal(c0.doors.back.cellId, 'X-');
  assert.equal(c0.doors.right.cellId, 'Y-');
  assert.equal(c0.doors.left.cellId, 'Y+');
  assert.equal(c0.doors.up.cellId, 'Z+');
  assert.equal(c0.doors.down.cellId, 'Z-');
  assert.equal(c0.antipode.cellId, 'W-', 'Antipode blind spot is W- (non-adjacent, 2 steps)');
  assert.equal(c0.doors.front.statusKey, 'visited');
  assert.equal(c0.doors.back.statusKey, 'unvisited_recommend');
  assert.ok(c0.doors.back.badgeText.includes('未去过'));

  // Turning 90 deg right (yaw = +PI/2): old right (Y-) becomes front, old back (X-) becomes right!
  const cRight = computeSixDoorCompass(s0.normal, s0.frame, Math.PI / 2, { phase: 'lower' });
  assert.equal(cRight.doors.front.cellId, 'Y-');
  assert.equal(cRight.doors.right.cellId, 'X-');
  assert.equal(cRight.doors.back.cellId, 'Y+');
  assert.equal(cRight.doors.left.cellId, 'X+');
  assert.equal(cRight.doors.up.cellId, 'Z+');
  assert.equal(cRight.doors.down.cellId, 'Z-');

  // Full 6-DOF Zero-G Free-Flight (pitching straight up so forward looks at ceiling Z+!)
  const freeLookUp = {
    free: true,
    basis: () => ({ forward: [0, 1, 0], up: [0, 0, -1], right: [1, 0, 0] })
  };
  const cFree = computeSixDoorCompass(s0.normal, s0.frame, freeLookUp, {
    phase: 'lower',
    routeActive: true,
    routeTrail: ['W+', 'Z+', 'Y-']
  });
  assert.equal(cFree.isFreeFlightLook, true);
  assert.equal(cFree.doors.front.cellId, 'Z+', 'Pitching up in zero-G puts ceiling hatch Z+ in Front slot');
  assert.equal(cFree.doors.back.cellId, 'Z-');
  assert.equal(cFree.doors.up.cellId, 'X-');
  assert.equal(cFree.doors.down.cellId, 'X+');
  assert.equal(cFree.doors.right.cellId, 'Y-');
  assert.equal(cFree.doors.left.cellId, 'Y+');

  // All 6 doors must be 6 distinct adjacent rooms (none equal to current or antipode)
  const doorIds = Object.values(cFree.doors).map(d => d.cellId);
  assert.equal(new Set(doorIds).size, 6, 'All 6 compass doors must be distinct adjacent rooms');
  assert.ok(!doorIds.includes(cFree.current.cellId) && !doorIds.includes(cFree.antipode.cellId));

  // Stage 3 Hamiltonian route guidance: Z+ & Y- are forbidden; X+ & Y+ are safe!
  assert.equal(cFree.stage, 3);
  assert.equal(cFree.doors.front.statusKey, 'route_forbidden');
  assert.ok(cFree.doors.front.badgeText.includes('勿进'));
  assert.equal(cFree.doors.left.statusKey, 'route_safe');
  assert.ok(cFree.doors.left.badgeText.includes('可通行'));
  assert.equal(cFree.progressBar.count, 3);
}

// 2. Chapter 1 Static 8-Cell Tesseract Map & Hamiltonian Route Answer Solver (radar.js)
{
  const verifyValidHamiltonian = (path, label) => {
    assert.equal(path.length, 8, `${label}: must visit all 8 cells`);
    assert.equal(new Set(path).size, 8, `${label}: all 8 cells must be unique`);
    for (let i = 0; i < 7; i++) {
      assert.equal(
        areCellsAdjacent(path[i], path[i + 1]),
        true,
        `${label}: step ${path[i]} -> ${path[i + 1]} must cross a shared 3D doorway (non-antipodal)`
      );
    }
  };

  // (a) Default / canonical 2-loop Hamiltonian cycle before challenge starts
  const canonical = computeHamiltonianRouteHint({ routeActive: false, routeTrail: [] });
  assert.equal(canonical.status, 'canonical');
  assert.equal(canonical.deadEnd, false);
  assert.deepEqual(canonical.path, ['W+', 'X+', 'W-', 'X-', 'Z-', 'Y-', 'Z+', 'Y+']);
  assert.equal(canonical.closesToStart, true);
  assert.equal(areCellsAdjacent(canonical.path[7], 'W+'), true, 'canonical cycle returns directly to W+ mirror bubble');
  verifyValidHamiltonian(canonical.path, 'canonical');

  // (b) Live mid-route completion from arbitrary valid prefix (also prefers closed cycle returning to W+)
  const live = computeHamiltonianRouteHint({
    routeActive: true,
    routeTrail: ['W+', 'X+', 'W-']
  });
  assert.equal(live.status, 'live');
  assert.equal(live.deadEnd, false);
  assert.equal(live.walkedCount, 3);
  assert.deepEqual(live.path, ['W+', 'X+', 'W-', 'X-', 'Z-', 'Y-', 'Z+', 'Y+']);
  assert.equal(live.nextCell, 'X-');
  assert.equal(live.closesToStart, true);
  verifyValidHamiltonian(live.path, 'live completion');

  // (c) Antipodal dead-end detection (7 cells visited, only Z- remains, and player is at antipode Z+!)
  const dead = computeHamiltonianRouteHint({
    routeActive: true,
    routeTrail: ['W+', 'X+', 'Y+', 'W-', 'X-', 'Y-', 'Z+']
  });
  assert.equal(dead.status, 'deadend');
  assert.equal(dead.deadEnd, true);
  assert.equal(dead.nextCell, 'W+');
  verifyValidHamiltonian(dead.path, 'deadend recovery');

  // (d) Completed 8-cell tour
  const done = computeHamiltonianRouteHint({
    routeActive: false,
    routeComplete: true,
    routeTrail: [...CANONICAL_HAMILTONIAN_PATH]
  });
  assert.equal(done.status, 'complete');
  assert.equal(done.deadEnd, false);
  assert.equal(done.nextCell, null);
  verifyValidHamiltonian(done.path, 'completed tour');
}

console.log('PASS Chapter 1 6-door compass & 8-cell tesseract route solver suite.');
