/**
 * Automated verification of Chapter 1 real 4D boundary physics experiments:
 *  - Geodesic laser pulse tracer (24m zero-bounce return from behind + specular wall reflection)
 *  - Ballistic (0.5g) & Newtonian (zero-G) 4D-transported physics probe
 *  - Regge curvature holonomy gyroscope (0° on straight 4-cell loop, exact 90° on 3-cell corner loop)
 *  - Scientific evidence & hypothesis falsification matrix
 */
import assert from 'node:assert/strict';
import {
  H, initialState, advance, cellId, normalFor
} from './dist/chapter-topology.js';
import { upperEyeZ } from './dist/chapter-motion.js';
import {
  traceGeodesicLaser, PhysicsProbe, HolonomyTracker, EvidenceLog, frameRotationDegrees
} from './dist/physics-lab.js';

// 1. Geodesic Laser Pulse: straight corridor loop returns 24.00m from BEHIND with 0 bounces!
{
  const s = initialState();
  s.p[2] = upperEyeZ(false);
  s.p[0] = -2.0;
  const trace = traceGeodesicLaser(s, [0, 0, 1], 'upper');
  assert.equal(trace.bounces, 0, 'straight corridor laser has zero reflections');
  assert.equal(trace.hitSelf, true, 'straight corridor laser hits player');
  assert.equal(trace.hitSelfFromBehind, true, 'laser arrives from behind (+180 deg geodesic loop)');
  assert.equal(trace.geodesicClosed, true, 'geodesicClosed flag confirmed');
  assert.ok(Math.abs(trace.totalDistance - 24) < 0.05, `expected ~24m loop, got ${trace.totalDistance}`);
  assert.deepEqual(trace.cellsVisited, ['W+', 'X+', 'W-', 'X-', 'W+']);
  assert.ok(Math.abs(trace.lightTimeNs - 24 / 0.299792458) < 0.3, 'exact physical light travel time');

  // Sideways laser in upper mode hits closed Y- glass and reflects!
  const side = traceGeodesicLaser(s, [1, 0, 0], 'upper');
  assert.ok(side.bounces >= 1, 'upper closed glass reflects sideways laser');
  assert.equal(side.geodesicClosed, false);

  // Lower zero-G mode: shooting UP (+Z) ALSO closes a 24m zero-bounce loop through Z+/W-/Z-/W+!
  const sLow = initialState();
  const upTrace = traceGeodesicLaser(sLow, [0, 1, 0], 'lower');
  assert.equal(upTrace.bounces, 0, 'lower upward laser has zero bounces');
  assert.equal(upTrace.geodesicClosed, true, 'lower upward laser closes 24m geodesic loop');
  assert.deepEqual(upTrace.cellsVisited, ['W+', 'Z+', 'W-', 'Z-', 'W+']);
}

// 2. Ballistic (upper) & Newtonian zero-G (lower) PhysicsProbe
{
  // Upper 0.5g probe: gravity pulls down, floor bounces elastically, crosses doorway cleanly
  const sUp = initialState();
  sUp.p[2] = upperEyeZ(false);
  sUp.p[0] = 0;
  const pUp = new PhysicsProbe(sUp, [0, 0.5, 9.0], { mode: 'upper' });
  let sawBounce = false;
  let sawCross = false;
  for (let i = 0; i < 180; i++) {
    const r = pUp.step(1 / 60, 'upper');
    if (r.bounced) sawBounce = true;
    if (r.crossed) sawCross = true;
  }
  assert.ok(sawBounce, 'upper 0.5g probe bounces off floor');
  assert.ok(sawCross, 'upper probe crosses open XW doorway via 4D transport');

  // Lower zero-G probe: pure Newton's 1st law straight geodesic loop back to origin!
  const sLow = initialState();
  const pLow = new PhysicsProbe(sLow, [0, 0, 8.0], { mode: 'lower' });
  for (let i = 0; i < 240; i++) pLow.step(1 / 60, 'lower');
  assert.equal(pLow.bounces, 0, 'zero-G centered probe flies with zero bounces');
  assert.equal(pLow.loopedBack, true, 'zero-G probe returns around 24m 4-cell loop');
  assert.ok(pLow.seamsCrossed >= 4);
}

// 3. Regge Curvature Holonomy Gyroscope
{
  // Straight 4-cell loop (W+ -> X+ -> W- -> X- -> W+): 0° holonomy!
  let s = initialState();
  const tracker = new HolonomyTracker(s);
  for (let step = 0; step < 4; step++) {
    s = advance(s, [0, 0, 2 * H]).state;
    const res = tracker.onSeam(s);
    if (step === 3) {
      assert.equal(res.returned, true);
      assert.ok(Math.abs(res.angleDeg) < 1e-6, `straight loop holonomy must be 0°, got ${res.angleDeg}`);
      assert.equal(res.proved, false);
    }
  }

  // 3-cell corner loop around a shared edge: W+ -> X+ -> Y+ -> W+ => EXACT 90.0° holonomy!
  // Start in W+ with frame [Y-, Z+, X+]
  let cState = initialState();
  const hTracker = new HolonomyTracker(cState);
  // Step 1: forward (+frame[2] = X+) into X+
  cState = advance(cState, [0, 0, 2 * H]).state;
  assert.equal(cellId(cState.normal), 'X+');
  hTracker.onSeam(cState);
  // Step 2: left (-frame[0] = Y+) into Y+
  cState = advance(cState, [-2 * H, 0, 0]).state;
  assert.equal(cellId(cState.normal), 'Y+');
  hTracker.onSeam(cState);
  // Step 3: backward (-frame[2] = W+) into W+
  cState = advance(cState, [0, 0, -2 * H]).state;
  assert.equal(cellId(cState.normal), 'W+');
  const proof = hTracker.onSeam(cState);
  assert.equal(proof.returned, true);
  assert.ok(Math.abs(proof.angleDeg - 90) < 1e-5, `3-cell edge loop must yield exact 90° Regge holonomy, got ${proof.angleDeg}`);
  assert.equal(proof.proved, true);
  assert.equal(hTracker.holonomyProved, true);
  assert.ok(Math.abs(frameRotationDegrees(initialState().frame, cState.frame) - 90) < 1e-5);
}

// 4. Scientific Evidence & Hypothesis Falsification Matrix
{
  const log = new EvidenceLog();
  log.record('geodesic_loop', '24.00m 0-bounce');
  log.record('chiral_self', 'left hand stays left');
  log.record('side_rotation', '90 deg per seam');
  log.record('holonomy_90', '90.0 deg 3-cell loop');

  for (const flawed of ['central-hall', 'treadmill', 'sphere']) {
    const res = log.evaluateGuess(flawed);
    assert.ok(res.conflicts.length >= 1, `${flawed} must be falsified by physical evidence`);
    assert.equal(res.consistent, false);
  }
  const truth = log.evaluateGuess('colored-tesseract');
  assert.equal(truth.conflicts.length, 0, 'colored-tesseract has zero physical conflicts');
  assert.equal(truth.matches.length, 4, 'colored-tesseract matches all 4 physical observations');
  assert.equal(truth.consistent, true);
}

console.log('PASS Chapter 1 physics lab: 24m zero-bounce geodesic laser, specular glass bounce, 0.5g & zero-G 4D probes, exact 0°/90° Regge holonomy gyroscope, and 4-evidence hypothesis falsification matrix.');
