/**
 * Automated verification for Chapter 2: 《折页之间》 —「离开画纸的人」
 * (16-Section 5-Act Continuous Campaign, HTML/JS Tab Parity, Companion Presence Rules,
 *  4×4×2×4 4D Sokoban, Monument Valley 4D Bridge, Three-Body 4D Fragment,
 *  Yun Tianming Fairy Tales, and 4 True 4D Geometric Objects).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  INTERIOR_L, isStrictlyInsideInterior, dist4, formatCoord4D,
  Stage1Simulation,
  MonumentBridgeSimulation,
  VAULT_SPEC, VaultSimulation, vaultWallCollides, vaultClearance4D,
  SOKOBAN_4D_SPEC, Sokoban4DSimulation, FourDSokobanSimulation,
  RING_SPEC, RingUnlinkSimulation, ringSurfaceClearance4D,
  ChiralKeySimulation,
  hypersphereSlice, hyperPolytopeSliceForm, hyperTorusSliceState, cliffordDoubleRotate4D,
  ThreeBodyFragmentSimulation, FairyTaleCanvasSimulation,
  xwTiltedBodyIntersection,
  CHAPTER2_SECTIONS
} from './dist/chapter2-core.js';

// 1. Verify all 16 continuous sections, HTML/JS tab parity, and Companion Presence Rules
{
  assert.equal(CHAPTER2_SECTIONS.length, 16, 'Chapter 2 has 16 continuous story sections');
  const html = fs.readFileSync(new URL('./dist/chapter2.html', import.meta.url), 'utf8');
  for (let id = 1; id <= 16; id++) {
    const sec = CHAPTER2_SECTIONS[id - 1];
    assert.equal(sec.id, id, `Section index ${id} matches id`);
    assert.ok(sec.title && sec.act && sec.speaker && sec.dialogue && sec.goal && sec.godHint && sec.themeQuote);
    assert.equal(typeof sec.hasCompanion, 'boolean');
    assert.ok(html.includes(`data-sec="${id}"`), `chapter2.html includes tab data-sec="${id}"`);
  }

  // Verify meaningless bystander figurines are omitted in solo geometric/matrix puzzles
  for (const soloId of [5, 6, 7, 9, 10, 12]) {
    const sec = CHAPTER2_SECTIONS.find(s => s.id === soloId);
    assert.equal(sec.hasCompanion, false, `Section ${soloId} omits physical bystander companion`);
  }
  // Verify companion Lin Xia IS physically present where narrative interaction occurs
  for (const activeId of [1, 2, 3, 4, 8, 11, 13, 14, 15, 16]) {
    const sec = CHAPTER2_SECTIONS.find(s => s.id === activeId);
    assert.equal(sec.hasCompanion, true, `Section ${activeId} includes physical companion Lin Xia`);
  }
}

// 2. Verify Section 03: Monument Valley 4D Rotating Penrose Bridge & Dual-Switch Cooperation
{
  const mon = new MonumentBridgeSimulation();
  assert.equal(mon.isBridgeAligned, false);
  assert.equal(mon.updateProgress([0, 0, 0.2, 0]).blockedByAbyss, true, 'Unrotated 4D bridge blocks crossing');
  mon.rotateBridge(90);
  assert.equal(mon.isBridgeAligned, true, '90° XW rotation aligns the Monument bridge');
  const sw = mon.updateProgress([0, 0, 0.65, 0]);
  assert.equal(sw.blockedByAbyss, false);
  assert.equal(sw.cyanSwitchPressed, true);
  assert.equal(sw.spireStairRaised, true);
  const fin = mon.updateProgress([0, 0, 1.8, 1.8]);
  assert.equal(fin.complete, true, 'Ascending raised spire stair to W=+1.8 completes Section 03');
}

// 3. Verify Section 06: 4D Sokoban (`4×4×2×4` Hyper-Grid, 3D Deadlock Escape via W+1, XYZ ⇄ XYW Swap, Undo & BFS Solver)
{
  assert.equal(FourDSokobanSimulation, Sokoban4DSimulation, 'FourDSokobanSimulation alias matches');
  const soko = new Sokoban4DSimulation();
  assert.deepEqual(soko.player, [1, 2, 1, 3]);
  assert.deepEqual(soko.boxes[0], [2, 2, 1, 3]);
  assert.deepEqual(soko.targets[0], [3, 4, 2, 4]);
  assert.equal(formatCoord4D(soko.targets[0]), '(3,4,2,4)');

  // Test XYZ ⇄ XYW Basis Transpose projection
  const projXYZ = soko.projectCell([3, 4, 2, 4]);
  assert.equal(projXYZ.sliceAxis, 'W');
  assert.equal(projXYZ.sliceIndex, 4);
  assert.equal(projXYZ.localZ, 2);

  assert.equal(soko.toggleBasisMode(), 'XYW');
  const projXYW = soko.projectCell([3, 4, 2, 4]);
  assert.equal(projXYW.sliceAxis, 'Z');
  assert.equal(projXYW.sliceIndex, 2);
  assert.equal(projXYW.localZ, 4);
  assert.equal(soko.toggleBasisMode(), 'XYZ');

  // Push crate +X into W=3 corner (3,2,1,3): verify 3D corner deadlock!
  const push1 = soko.step(1, 0, 0, 0);
  assert.equal(push1.pushed, true);
  assert.deepEqual(soko.boxes[0], [3, 2, 1, 3]);
  assert.equal(soko.is3DDeadlocked(0), true, 'Crate at (3,2,1,3) is deadlocked in 3D slice W=3');
  assert.equal(soko.step(1, 0, 0, 0).blocked, true, 'Further +X push in W=3 is blocked by 3D wall');

  // Escape 3D corner deadlock by stepping to W=2 and pushing across +W into W=4!
  assert.equal(soko.step(0, 0, 0, -1).moved, true); // player -> (2,2,1,2)
  assert.equal(soko.step(1, 0, 0, 0).moved, true);  // player -> (3,2,1,2)
  const crossPush = soko.step(0, 0, 0, 1);          // player -> (3,2,1,3), crate -> (3,2,1,4)!
  assert.equal(crossPush.crossWPush, true, 'Cross-W crate push escapes 3D corner deadlock');
  assert.deepEqual(soko.boxes[0], [3, 2, 1, 4]);

  // Verify Undo restores pre-push state exactly
  assert.equal(soko.undo(), true);
  assert.deepEqual(soko.boxes[0], [3, 2, 1, 3]);
  assert.deepEqual(soko.player, [3, 2, 1, 2]);

  // Verify exact BFS autoSolve() solves cleanly from initial state to (3,4,2,4)
  soko.reset();
  const solved = soko.autoSolve();
  assert.equal(solved.complete, true, 'BFS autoSolve() completes the 4×4×2×4 4D Sokoban');
  assert.deepEqual(soko.boxes[0], [3, 4, 2, 4]);
  assert.ok(soko.crossWPushes >= 1, 'Solution genuinely uses at least one cross-W push');
}

// 4. Verify Section 13: Three-Body 4D Fragment Space ("魔戒" Tomb Ring & Unfolded 3-Hull Battleship)
{
  const tb = new ThreeBodyFragmentSimulation();
  const talk = tb.contactTombRing();
  assert.equal(talk.ringContacted, true);
  assert.ok(talk.dialogue.includes('墓地'));

  // Folded 3D cruiser blocks extraction in W=0
  const blockedRes = tb.extractCore(1, [0.85, 0, 0.85, 0]);
  assert.equal(blockedRes.extracted, false);
  assert.equal(blockedRes.blockedBy3DHull, true);

  // Unfold along 4th dimension and extract all 3 quantum cores across W = -1.8, 0.0, +1.8
  assert.equal(tb.toggleHullUnfold4D(true), true);
  assert.equal(tb.extractCore(0, [0.85, 0, 0.85, -1.8]).extracted, true);
  assert.equal(tb.extractCore(1, [0.85, 0, 0.85, 0.0]).extracted, true);
  const lastCore = tb.extractCore(2, [0.85, 0, 0.85, 1.8]);
  assert.equal(lastCore.extracted, true);
  assert.equal(lastCore.complete, true);

  const r0 = tb.bubbleRadius;
  assert.ok(tb.stepBubbleDrain(1.0) < r0, '4D Fragment bubble drains monotonically');
}

// 5. Verify Section 14: Yun Tianming's Three Fairy Tales (2D Xue-Lang Canvas, 4D Umbrella & Deep-Water Beacon)
{
  const ft = new FairyTaleCanvasSimulation();
  assert.equal(ft.linCanvasThickness, 0.02);

  // Deep-Water Prince Perspective-Invariant Law: invariant across 3D distance, strictly dependent on |ΔW|
  const sNear = ft.deepWaterConstantApparentSize(2.0, 0.0);
  const sFar = ft.deepWaterConstantApparentSize(250.0, 0.0);
  const sShiftW = ft.deepWaterConstantApparentSize(2.0, 1.8);
  assert.equal(sNear, sFar, 'Deep-Water Beacon apparent size is strictly invariant across 3D distance');
  assert.ok(sShiftW < sNear, 'Deep-Water Beacon apparent size decreases with 4th-dimension |ΔW| separation');

  // Without 4D Spinning Umbrella, unlocking canvas pins is blocked by 2D flattening field
  const failPin = ft.unlockPin(0, [0, 0, 0, -1.8]);
  assert.equal(failPin.unlocked, false);
  assert.equal(failPin.blockedByFlatteningField, true);

  // Open 4D Clifford Spinning Umbrella and unlock all 3 pins -> Lin Xia unfolds from 0.02 back to 1.0!
  assert.equal(ft.toggleUmbrella(true), true);
  assert.equal(ft.unlockPin(0).unlocked, true);
  assert.equal(ft.unlockPin(1).unlocked, true);
  const finalPin = ft.unlockPin(2);
  assert.equal(finalPin.complete, true);
  assert.equal(ft.linUnfoldedFromCanvas, true);
  assert.equal(ft.linCanvasThickness, 1.0);
}

// 6. Verify 4 True 4D Geometric Objects (Sections 09–12)
{
  // Hypersphere B^4
  assert.ok(Math.abs(hypersphereSlice(0, { R: 2.1 }).radius - 2.1) < 1e-12);
  assert.ok(hypersphereSlice(-1.8, { R: 2.1 }).radius < 1.2);
  assert.equal(hypersphereSlice(2.25, { R: 2.1 }).exists, false);

  // Diagonal 4D Hypercube / 16-Cell Polytope Morph
  assert.equal(hyperPolytopeSliceForm(-1.8).form, 'tetrahedron');
  assert.equal(hyperPolytopeSliceForm(0.0).form, 'octahedron');
  assert.equal(hyperPolytopeSliceForm(1.8).form, 'cube');
  assert.equal(hyperPolytopeSliceForm(2.8).exists, false);

  // 4D Hyper-Torus Split Islands ⇄ Merged Bridge
  assert.equal(hyperTorusSliceState(0.0).merged, false);
  assert.equal(hyperTorusSliceState(1.8).merged, true);

  // 24-Cell Clifford Isoclinic Double Rotor
  const vRot = cliffordDoubleRotate4D([1, 1, 0, 0], 1.234);
  assert.ok(Math.abs(Math.hypot(...vRot) - Math.SQRT2) < 1e-12);
  const ex = cliffordDoubleRotate4D([1, 0, 0, 0], Math.PI / 4);
  const ey = cliffordDoubleRotate4D([0, 1, 0, 0], Math.PI / 4);
  assert.ok(dist4(ex, [1, 0, 0, 0]) > 0.5 && dist4(ey, [0, 1, 0, 0]) > 0.5);
}

// 7. Verify Core 3D-in-4D Simulations (Sealed Glass Prison, Interlocked Rings, Chiral Key, Medical Tilt)
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

console.log('PASS Chapter 2 16-section campaign, 4D Sokoban (4x4x2x4), Monument Valley, Three-Body, Yun Tianming Fairy Tales, companion rules & 4 True 4D Objects suite.');
