/**
 * Automated verification for Chapter 2: 《折页之间》 —「离开画纸的人」
 * (12-Section Continuous Campaign, Companion Presence Rules, and 4 True 4D Geometric Objects).
 */
import assert from 'node:assert/strict';
import {
  INTERIOR_L, isStrictlyInsideInterior, dist4,
  Stage1Simulation,
  VAULT_SPEC, VaultSimulation, vaultWallCollides, vaultClearance4D,
  RING_SPEC, RingUnlinkSimulation, ringSurfaceClearance4D,
  ChiralKeySimulation,
  hypersphereSlice, hyperPolytopeSliceForm, hyperTorusSliceState, cliffordDoubleRotate4D,
  xwTiltedBodyIntersection,
  CHAPTER2_SECTIONS
} from './dist/chapter2-core.js';

// 1. Verify all 12 continuous sections and Companion Presence Rules
{
  assert.equal(CHAPTER2_SECTIONS.length, 12, 'Chapter 2 has 12 continuous story sections');
  for (const sec of CHAPTER2_SECTIONS) {
    assert.ok(sec.title && sec.speaker && sec.dialogue && sec.goal && sec.godHint);
    assert.equal(typeof sec.hasCompanion, 'boolean');
  }
  // Verify meaningless bystander figurines are omitted in solo megastructure puzzles (4, 5, 7, 8, 10)
  for (const soloId of [4, 5, 7, 8, 10]) {
    const sec = CHAPTER2_SECTIONS.find(s => s.id === soloId);
    assert.equal(sec.hasCompanion, false, `Section ${soloId} omits physical bystander companion`);
  }
  // Verify companion Lin Xia IS physically present where narrative interaction occurs (1, 2, 3, 6, 9, 11, 12)
  for (const activeId of [1, 2, 3, 6, 9, 11, 12]) {
    const sec = CHAPTER2_SECTIONS.find(s => s.id === activeId);
    assert.equal(sec.hasCompanion, true, `Section ${activeId} includes physical companion Lin Xia`);
  }
}

// 2. Verify True 4D Object #1: 4D Hypersphere (B^4) Slicing
{
  assert.ok(Math.abs(hypersphereSlice(0, { R: 2.1 }).radius - 2.1) < 1e-12);
  assert.ok(hypersphereSlice(-1.8, { R: 2.1 }).radius < 1.2);
  assert.equal(hypersphereSlice(2.25, { R: 2.1 }).exists, false);
}

// 3. Verify True 4D Object #2: Diagonal 4D Hypercube / 16-Cell Polytope Slice Metamorphosis
{
  const low = hyperPolytopeSliceForm(-1.8);
  assert.equal(low.form, 'tetrahedron');
  assert.equal(low.faces, 4);
  const mid = hyperPolytopeSliceForm(0.0);
  assert.equal(mid.form, 'octahedron');
  assert.equal(mid.faces, 8);
  const high = hyperPolytopeSliceForm(1.8);
  assert.equal(high.form, 'cube');
  assert.equal(high.faces, 6);
  assert.equal(hyperPolytopeSliceForm(2.8).exists, false);
}

// 4. Verify True 4D Object #3: 4D Hyper-Torus Split Islands ⇄ Merged Ring Bridge
{
  const split = hyperTorusSliceState(0.0);
  assert.equal(split.exists, true);
  assert.equal(split.merged, false, 'At W=0 the 4D torus slices into two disconnected 3D islands');
  assert.ok(split.islandOffset > 1.4);

  const merged = hyperTorusSliceState(1.8);
  assert.equal(merged.exists, true);
  assert.equal(merged.merged, true, 'At W=+1.8 the two islands merge into one continuous ring bridge');
  assert.ok(merged.bridgeWidth > 1.5);
}

// 5. Verify True 4D Object #4: 24-Cell Clifford Isoclinic Double Rotor
{
  const v0 = [1, 1, 0, 0];
  const vRot = cliffordDoubleRotate4D(v0, 1.234);
  assert.ok(Math.abs(Math.hypot(...vRot) - Math.SQRT2) < 1e-12, 'Clifford double rotation is an exact 4D isometry');
  // Verify NO axis among X, Y, Z, W remains fixed under Clifford double rotation
  const ex = cliffordDoubleRotate4D([1, 0, 0, 0], Math.PI / 4);
  const ey = cliffordDoubleRotate4D([0, 1, 0, 0], Math.PI / 4);
  assert.ok(dist4(ex, [1, 0, 0, 0]) > 0.5 && dist4(ey, [0, 1, 0, 0]) > 0.5);
}

// 6. Verify Core 3D-in-4D Simulations (Sealed Glass Prison, Interlocked Rings, Chiral Key, Medical Tilt)
{
  const v = new VaultSimulation();
  assert.equal(v.move([2.5, 0, 0, 0]).blocked, true);
  v.move([0, 0, 0, 1.35]);
  v.move([-v.player[0], 0, 0, 0]);
  v.move([0, 0, 0, -1.35]);
  assert.equal(v.carryingCore, true);

  const rings = new RingUnlinkSimulation();
  assert.equal(rings.moveTo(1.8, 0).blocked, true);
  rings.moveTo(RING_SPEC.startBX, 0.70);
  rings.moveTo(1.85, 0.70);
  assert.equal(rings.moveTo(1.85, 0.0).unlinked, true);

  const key = new ChiralKeySimulation();
  assert.equal(key.setAngles({ xw: 180 }).matchesLock, true);
  assert.equal(xwTiltedBodyIntersection(45, 0.2, 0.62).dimension, 2);
}

console.log('PASS Chapter 2 12-section campaign, companion presence rules, and 4 True 4D Objects suite.');
