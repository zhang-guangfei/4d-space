/**
 * Automated verification for Chapter 2: 《折页之间》 (6 First-Person + God-View Astronaut Sections).
 */
import assert from 'node:assert/strict';
import {
  INTERIOR_L, isStrictlyInsideInterior,
  Stage1Simulation,
  VAULT_SPEC, VaultSimulation, vaultWallCollides, vaultClearance4D,
  RING_SPEC, RingUnlinkSimulation, ringSurfaceClearance4D,
  ChiralKeySimulation,
  hypersphereSlice, xwTiltedBodyIntersection,
  CHAPTER2_SECTIONS
} from './dist/chapter2-core.js';

// Verify all 6 independent sections exist and use sensory, non-jargon titles
{
  assert.equal(CHAPTER2_SECTIONS.length, 6, 'Chapter 2 has 6 independent sections (小节)');
  assert.deepEqual(
    CHAPTER2_SECTIONS.map(s => s.code),
    ['第一小节', '第二小节', '第三小节', '第四小节', '第五小节', '第六小节']
  );
  for (const sec of CHAPTER2_SECTIONS) {
    assert.ok(sec.title && sec.story && sec.goal && sec.godHint);
  }
}

// Section 1: Pure W-axis traversal collects 3 cross-W astronaut beacons and returns to W=0
{
  const s1 = new Stage1Simulation();
  s1.move([0, 0, 2.1, 0]);
  assert.equal(s1.collected.has('w0'), true, 'collects W=0 beacon');
  s1.move([0, 0, 0, 1.8]);
  assert.equal(s1.collected.has('wp'), true, 'collects W=+1.8 beacon');
  s1.move([0, 0, 0, -3.6]);
  assert.equal(s1.collected.has('wm'), true, 'collects W=-1.8 beacon');
  s1.move([0, 0, 0, -20]);
  assert.equal(isStrictlyInsideInterior(s1.player, s1.radius, INTERIOR_L), true);
  s1.move([0, 0, 0, -s1.player[3]]);
  assert.equal(s1.isComplete, true);
}

// Section 2: Sealed 3D Glass Room Rescue (positive finite-W bypass + full-W wall counterexample)
{
  const v = new VaultSimulation();
  const hitWall = v.move([2.5, 0, 0, 0]);
  assert.equal(hitWall.blocked, true, 'sealed 3D glass room blocks direct W=0 walk');
  let r = v.move([0, 0, 0, 1.35]);
  assert.equal(r.blocked, false);
  assert.ok(vaultClearance4D(v.player, v.activeRadius(), false) > 0);
  r = v.move([-v.player[0], 0, 0, 0]);
  assert.equal(r.blocked, false);
  r = v.move([0, 0, 0, -1.35]);
  assert.equal(r.blocked, false);
  assert.equal(v.enteredVault, true);
  assert.equal(v.carryingCore, true);

  r = v.move([0, 0, 0, 1.45]);
  assert.equal(r.blocked, false);
  r = v.move([2.55, 0, 0, 0]);
  assert.equal(r.blocked, false);
  r = v.move([0, 0, 0, -1.45]);
  assert.equal(r.blocked, false);
  assert.equal(v.coreDelivered, true);

  const counter = new VaultSimulation();
  counter.setHyperWall(true);
  for (const wTry of [-3.2, 0, 1.5, 3.2]) {
    counter.setHyperWall(true);
    counter.move([0, 0, 0, wTry]);
    const attempt = counter.move([3.0, 0, 0, 0]);
    assert.equal(attempt.blocked, true);
    assert.equal(counter.enteredVault, false);
  }
  assert.equal(vaultWallCollides([1.2, 0, 0, 2.8], 0.24, true), true);
  assert.equal(vaultWallCollides([1.2, 0, 0, 2.8], 0.24, false), false);
}

// Section 3: Interlocked Rings Unlinking via W
{
  const rings = new RingUnlinkSimulation();
  assert.equal(rings.moveTo(1.8, 0).blocked, true);
  assert.equal(rings.moveTo(RING_SPEC.startBX, 0.70).blocked, false);
  assert.equal(rings.moveTo(1.85, 0.70).blocked, false);
  const done = rings.moveTo(1.85, 0.0);
  assert.equal(done.unlinked, true);
  assert.equal(rings.everInterpenetrated, false);
  assert.ok(ringSurfaceClearance4D(0.45, 0) > 0);
}

// Section 4: Astronaut 180° 4D Flip Swaps Left/Right Hands Without Distortion
{
  const key = new ChiralKeySimulation();
  const mid = key.setAngles({ xy: 0, xz: 0, yz: 0, xw: 90 });
  assert.ok(mid.maxEdgeError < 1e-11);
  const flipped = key.setAngles({ xy: 0, xz: 0, yz: 0, xw: 180 });
  assert.ok(flipped.maxEdgeError < 1e-11);
  assert.ok(Math.abs(flipped.volumeRatio + 1) < 1e-9);
  assert.equal(flipped.matchesLock, true);
}

// Section 5: 4D Hypersphere Slicing
{
  assert.ok(Math.abs(hypersphereSlice(0, { R: 2.1 }).radius - 2.1) < 1e-12);
  assert.equal(hypersphereSlice(2.5, { R: 2.1 }).exists, false);
}

// Section 6: Astronaut Cross-Section & XW Tilt
{
  assert.equal(xwTiltedBodyIntersection(0, 0).dimension, 3);
  assert.equal(xwTiltedBodyIntersection(45, 0.2, 0.62).dimension, 2);
}

console.log('PASS Chapter 2 6-section first-person + God-View astronaut suite.');
