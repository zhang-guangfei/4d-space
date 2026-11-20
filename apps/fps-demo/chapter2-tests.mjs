/**
 * Automated mathematical & physics verification for Chapter 2: Inside the 4D Hypercube (-4, 4)^4.
 * Covers all four progressive stages including positive and counterexample collision cases.
 */
import assert from 'node:assert/strict';
import {
  INTERIOR_L, isStrictlyInsideInterior,
  Stage1Simulation,
  VAULT_SPEC, VaultSimulation, vaultWallCollides, vaultClearance4D,
  RING_SPEC, RingUnlinkSimulation, ringSurfaceClearance4D,
  ChiralKeySimulation,
  hypersphereSlice, xwTiltedBodyIntersection
} from './dist/chapter2-core.js';

// Stage 1: Pure W-axis traversal keeps XYZ fixed, stays inside (-4,4)^4, collects 3 cross-W beacons
{
  const s1 = new Stage1Simulation();
  // Move to (0, 0, 0) in W = 0 first
  s1.move([0, 0, 2.1, 0]);
  assert.equal(s1.collected.has('w0'), true, 'collects W=0 beacon');
  const xyzFixed = s1.player.slice(0, 3);
  // Shift purely along W to +1.8, then -1.8, then back to 0
  s1.move([0, 0, 0, 1.8]);
  assert.deepEqual(s1.player.slice(0, 3), xyzFixed, 'pure W shift keeps XYZ strictly unchanged');
  assert.equal(s1.collected.has('wp'), true, 'collects W=+1.8 beacon');
  s1.move([0, 0, 0, -3.6]);
  assert.deepEqual(s1.player.slice(0, 3), xyzFixed);
  assert.equal(s1.collected.has('wm'), true, 'collects W=-1.8 beacon');
  // Boundary clamp test
  s1.move([0, 0, 0, -20]);
  assert.equal(isStrictlyInsideInterior(s1.player, s1.radius, INTERIOR_L), true, 'stays strictly inside (-4,4)^4');
  // Return to W=0
  s1.move([0, 0, 0, -s1.player[3]]);
  assert.equal(s1.isComplete, true, 'stage 1 completes upon collecting 3 beacons and returning to W=0');
}

// Stage 2: 4D Vault Heist — Positive Finite-W Case AND Negative Full-W Hyper-Wall Counterexample!
{
  // Positive case
  const v = new VaultSimulation();
  // 1) Try walking straight into the sealed 3D box at W=0 -> MUST BE BLOCKED!
  const hitWall = v.move([2.5, 0, 0, 0]);
  assert.equal(hitWall.blocked, true, 'sealed 3D vault blocks direct W=0 approach');
  assert.ok(v.player[0] <= -(VAULT_SPEC.outerHalf + VAULT_SPEC.playerRadius) + 0.06, 'cannot penetrate outer wall at W=0');

  // 2) Continuous 4D bypass: lift W to +1.35 -> walk to X=0 -> descend to W=0 inside cavity -> pick core!
  let r = v.move([0, 0, 0, 1.35]);
  assert.equal(r.blocked, false);
  assert.ok(vaultClearance4D(v.player, v.activeRadius(), false) > 0);
  r = v.move([-v.player[0], 0, 0, 0]);
  assert.equal(r.blocked, false, 'passes above wall W-band without collision');
  r = v.move([0, 0, 0, -1.35]);
  assert.equal(r.blocked, false, 'descends cleanly into hollow vault interior');
  assert.equal(v.enteredVault, true);
  assert.equal(v.carryingCore, true, 'picks up Golden Core inside sealed vault');

  // 3) Escape carrying larger radius (0.30) via W = +1.45 -> move to Pedestal (2.55,0,0) -> descend to W=0
  r = v.move([0, 0, 0, 1.45]);
  assert.equal(r.blocked, false);
  r = v.move([2.55, 0, 0, 0]);
  assert.equal(r.blocked, false);
  r = v.move([0, 0, 0, -1.45]);
  assert.equal(r.blocked, false);
  assert.equal(v.coreDelivered, true, 'delivers core to extraction pedestal via continuous collision-free 4D path');

  // Negative counterexample: Full-W Hyper-Wall spanning [-4, +4] CANNOT be bypassed at ANY W!
  const counter = new VaultSimulation();
  counter.setHyperWall(true);
  for (const wTry of [-3.2, -1.5, 0, 1.5, 3.2]) {
    counter.setHyperWall(true);
    counter.move([0, 0, 0, wTry]);
    const attempt = counter.move([3.0, 0, 0, 0]);
    assert.equal(attempt.blocked, true, `hyper-wall must block at W=${wTry}`);
    assert.equal(counter.enteredVault, false, `hyper-wall must prevent entry at W=${wTry}`);
    assert.ok(counter.player[0] <= -(VAULT_SPEC.outerHalf + VAULT_SPEC.playerRadius) + 0.06);
  }
  assert.equal(vaultWallCollides([1.2, 0, 0, 2.8], 0.24, true), true);
  assert.equal(vaultWallCollides([1.2, 0, 0, 2.8], 0.24, false), false);
}

// Stage 3A: Two Interlocked 3D Torus Rings Unlinking Through W
{
  const rings = new RingUnlinkSimulation();
  // Attempting to pull Ring B out at W=0 must collide & block!
  const blockedTry = rings.moveTo(1.8, 0);
  assert.equal(blockedTry.blocked, true, 'rings cannot pass through each other in 3D (W=0)');
  assert.equal(rings.unlinked, false);

  // Lift along W -> slide past -> lower back to W=0!
  const step1 = rings.moveTo(RING_SPEC.startBX, 0.70);
  assert.equal(step1.blocked, false);
  const step2 = rings.moveTo(1.85, 0.70);
  assert.equal(step2.blocked, false, 'passes cleanly over Ring A in W=0.70');
  const step3 = rings.moveTo(1.85, 0.0);
  assert.equal(step3.blocked, false);
  assert.equal(step3.unlinked, true, 'rings successfully unlinked and returned to W=0');
  assert.equal(rings.everInterpenetrated, false, 'never penetrated at any substep');
  assert.ok(rings.minObservedClearance > 0);
  assert.ok(ringSurfaceClearance4D(0.45, 0) > 0, 'initial linked position has positive surface clearance');
}

// Stage 3B: Chiral 4-Vertex Key Rigid SO(4) 180° XW Rotation
{
  const key = new ChiralKeySimulation();
  // Arbitrary 3D rotations NEVER invert chirality or fit mirror lock!
  for (let xy = -180; xy <= 180; xy += 45) {
    for (let xz = -180; xz <= 180; xz += 45) {
      for (let yz = -90; yz <= 90; yz += 90) {
        const ev = key.setAngles({ xy, xz, yz, xw: 0 });
        assert.ok(Math.abs(ev.volumeRatio - 1) < 1e-9, '3D rotation preserves +1 handedness');
        assert.ok(ev.maxEdgeError < 1e-11, 'rigid edge length invariant');
        assert.equal(ev.matchesLock, false, 'no 3D rotation can fit mirror lock');
      }
    }
  }
  // Halfway XW = 90°: rigid in 4D, zero 3D projected signed volume!
  const mid = key.setAngles({ xy: 0, xz: 0, yz: 0, xw: 90 });
  assert.ok(mid.maxEdgeError < 1e-11, 'rigid at XW=90°');
  assert.ok(Math.abs(mid.volumeRatio) < 1e-9, 'zero 3D signed volume at XW=90°');

  // Full 180° XW rotation: exact rigid mirror image back in W=0!
  const flipped = key.setAngles({ xy: 0, xz: 0, yz: 0, xw: 180 });
  assert.ok(flipped.maxEdgeError < 1e-11, 'exact rigid SO(4) isometry at 180°');
  assert.ok(Math.abs(flipped.volumeRatio + 1) < 1e-9, 'exact -1 chirality inversion at 180°');
  assert.ok(flipped.maxW < 1e-11, 'returns completely to W=0');
  assert.equal(flipped.matchesLock, true, 'fits mirror lock socket exactly');
}

// Stage 4A: 4D Hypersphere Slicing
{
  const c = hypersphereSlice(0, { R: 2.1 });
  assert.equal(c.exists, true);
  assert.ok(Math.abs(c.radius - 2.1) < 1e-12);
  const edge = hypersphereSlice(2.1, { R: 2.1 });
  assert.equal(edge.exists, false);
  assert.equal(edge.radius, 0);
  const out = hypersphereSlice(2.5, { R: 2.1 });
  assert.equal(out.exists, false);
  const pos = hypersphereSlice(1.05, { R: 2.1 });
  const neg = hypersphereSlice(-1.05, { R: 2.1 });
  assert.ok(Math.abs(pos.radius - neg.radius) < 1e-12, 'round-trip W symmetry');
}

// Stage 4B: XW-Tilted 3D Body ∩ W=c Intersection Dimension
{
  const flat0 = xwTiltedBodyIntersection(0, 0);
  assert.equal(flat0.dimension, 3);
  const flatAway = xwTiltedBodyIntersection(0, 0.5);
  assert.equal(flatAway.dimension, 0);
  const tilted = xwTiltedBodyIntersection(45, 0.2, 0.62);
  assert.equal(tilted.dimension, 2, 'XW-tilted 3D rigid body intersects W=c in a true 2D cross-section');
  assert.ok(Math.abs(tilted.bodyX - 0.2 / Math.SQRT1_2) < 1e-9);
  const tiltedMiss = xwTiltedBodyIntersection(45, 1.0, 0.62);
  assert.equal(tiltedMiss.dimension, 0);
}

console.log('PASS Chapter 2 4D interior suite: W-traversal bounds, positive & hyper-wall counterexample vault collisions, 4D ring unlinking, SO(4) rigid chiral inversion, hypersphere slicing, and XW-tilted 2D intersection.');
