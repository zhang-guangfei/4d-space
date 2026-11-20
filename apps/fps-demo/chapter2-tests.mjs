/**
 * Automated verification for Chapter 2: 《折页之间》 —「离开画纸的人」
 * (Refined 8-Section Large-Arena Campaign, HTML/JS Parity, Mouse-Wheel-First Copy,
 *  Sec 02 6-Step Jumping Chasm + Always-Visible Ghosts,
 *  Sec 03 4D Phase-Prism Laser Relay,
 *  Sec 04 20m Glass Vault,
 *  Sec 05 5×5 Multi-Wall 4D Hyper-Maze BFS Solvability Proof,
 *  Sec 06 All 7 Levels of 4D Eat-Dots (3) + 4D Sokoban (4) BFS Proof,
 *  Sec 07 Brain-Teasing Triple-Ring + Phase Pillar Puzzle,
 *  Sec 08 Authentic 4D XW 180° Rigid Chirality Flip Mathematical Proof).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  CHAMBER_SIZE, ARENA_HALF, formatCoord4D, dist4,
  SEC2_STEPS, SixStepAscentSimulation,
  PRISM_SPEC, PrismLaserSimulation,
  VAULT_SPEC, VaultSimulation, vaultWallCollides,
  MAZE4D_SPEC, HyperMaze4DSimulation,
  ARCADE_4D_LEVELS, HyperGridArcadeSimulation, Sokoban4DSimulation, FourDSokobanSimulation,
  TRIPLE_RING_SPEC, TripleRingUnlinkSimulation,
  CHIRAL_KEY_VERTICES, CHIRAL_LOCK_VERTICES, ChiralFlip4DSimulation, signedVolume3D,
  CHAPTER2_SECTIONS
} from './dist/chapter2-core.js';

// 1. Verify 8-Section Campaign, HTML/JS Tab Parity, Large Arena Scale, and ZERO Q/E prompts in user-facing UI
{
  assert.equal(CHAMBER_SIZE, 20.0, 'Chapter 2 arenas expanded to 20m grand hall');
  assert.ok(ARENA_HALF >= 8.0, 'Walkable arena bounds expanded generously');
  assert.equal(CHAPTER2_SECTIONS.length, 8, 'Chapter 2 is refined to 8 high-craft puzzle sections');

  const html = fs.readFileSync(new URL('./dist/chapter2.html', import.meta.url), 'utf8');
  for (let id = 1; id <= 8; id++) {
    const sec = CHAPTER2_SECTIONS[id - 1];
    assert.equal(sec.id, id);
    assert.ok(sec.title && sec.act && sec.speaker && sec.dialogue && sec.goal && sec.godHint && sec.themeQuote);
    assert.ok(html.includes(`data-sec="${id}"`), `chapter2.html includes tab data-sec="${id}"`);
    assert.ok(!/按\s*[QE]|Q\s*\/\s*E/i.test(sec.dialogue + sec.goal + sec.godHint), `Section ${id} uses Mouse Wheel prompts, not Q/E`);
  }
  assert.ok(!html.includes('data-sec="9"'), 'Sections 9+ removed from Chapter 2 UI');
  assert.ok(!/Q\s*\/\s*E|按\s*[QE]/i.test(html), 'chapter2.html prompts Mouse Wheel instead of Q/E');
  assert.ok(html.includes('id="voiceBtn"'), 'chapter2.html includes character voiceover toggle');
}

// 2. Verify Section 02: 6 Elevated Stepping/Jumping Platforms + Fix for Invisible Star-Rail Bridge Bug
{
  assert.equal(SEC2_STEPS.length, 6, 'Section 02 has 6 distinct elevated platforms');
  for (let i = 1; i < SEC2_STEPS.length; i++) {
    assert.ok(SEC2_STEPS[i].y > SEC2_STEPS[i - 1].y, `Step ${i + 1} is elevated above Step ${i}`);
  }
  const s2 = new SixStepAscentSimulation();
  // Crucially: EVEN when player is at W=0.0, the cyan star-rail steps (W=-1.8) MUST still have opacity >= 0.34!
  const step3 = SEC2_STEPS[2];
  assert.equal(step3.wTarget, -1.8);
  assert.ok(s2.stepVisualOpacity(step3, 0.0) >= 0.34, 'Star-rail step is ALWAYS visible as bright ghost at W=0.0');
  assert.ok(s2.stepVisualOpacity(step3, -1.8) > 0.99, 'Star-rail step solidifies to 1.0 at W=-1.8');

  // Verify stepping & jumping progression across all 6 steps to completion
  for (const step of SEC2_STEPS) {
    assert.equal(s2.isStepSolid(step, step.wTarget), true);
    const sup = s2.findSupportingStep(step.x, step.z, step.y, step.wTarget);
    assert.equal(sup?.id, step.id);
    s2.recordLanding(sup);
  }
  assert.equal(s2.complete, true, 'Reaching Step 6 completes Section 02');
}

// 3. Verify Section 03: 4D Phase-Prism Laser Relay (3 Slices + 2 W-Wells)
{
  const sim3 = new PrismLaserSimulation();
  const t0 = sim3.trace();
  assert.equal(t0.wellAActive, false);
  assert.equal(t0.segments[1].blockedByWall, true, 'Initial W=0 beam is blocked by Titanium Wall 1');

  // Rotate Prism 1 -> East (dir 1) -> hits W-Well A!
  sim3.rotatePrism(0, 1);
  const t1 = sim3.trace();
  assert.equal(t1.wellAActive, true, 'Prism 1 East energizes W-Well A into W=+1.8');
  assert.equal(t1.wellBActive, false);
  assert.equal(t1.segments[2].blockedByWall, true, 'Initial W=+1.8 Prism 2 beam is blocked by Wall 2');

  // Rotate Prism 2 (from 3 West -> 0 North) -> hits W-Well B!
  sim3.rotatePrism(1, 1);
  const t2 = sim3.trace();
  assert.equal(t2.wellBActive, true, 'Prism 2 North energizes W-Well B into W=-1.8');
  assert.equal(t2.receiverLit, false);

  // Rotate Prism 3 (from 2 South -> 3 West) -> hits Receiver!
  sim3.rotatePrism(2, 1);
  const t3 = sim3.trace();
  assert.equal(t3.receiverLit, true);
  assert.equal(t3.complete, true, '3-slice 4D laser circuit unlocks Section 03');
}

// 4. Verify Section 04: 20m Grand Sealed Glass Vault
{
  const v = new VaultSimulation();
  assert.equal(vaultWallCollides([VAULT_SPEC.halfSize, 0, 0, 0]), true, 'Glass wall blocks in W=0');
  assert.equal(vaultWallCollides([VAULT_SPEC.halfSize, 0, 0, 1.8]), false, 'Glass wall transparent/open in W=+1.8');
  v.move([0, 0, 0, 1.8]);
  v.move([6.6, 0, 0.6, 0]);
  v.move([0, 0, 0, -1.8]);
  assert.equal(v.carryingCore, true, 'Picked up core inside vault after re-entering W=0');
  v.move([0, 0, 0, 1.8]);
  v.move([6.8, 0, 0, 0]);
  v.move([0, 0, 0, -1.8]);
  assert.equal(v.coreDelivered, true, 'Delivered core cleanly to East pedestal');
}

// 5. Verify Section 05: 5×5 Multi-Wall 4D Hyper-Maze (Unsolvable in ANY single W slice, Solvable in 4D!)
{
  const m = new HyperMaze4DSimulation();
  assert.ok(m.wallBoxes.every(list => list.length >= 18), 'Every maze W-slice has >= 18 architectural walls');

  // Prove strictly UNSOLVABLE in any single 3D W-slice alone!
  assert.equal(m.findCellPath([0, 0, 1], [4, 4, 1], [1]), null, 'W=0.0 slice alone is strictly unsolvable!');
  assert.equal(m.findCellPath([0, 0, 0], [4, 4, 0], [0]), null, 'W=-1.8 slice alone is strictly unsolvable!');
  assert.equal(m.findCellPath([0, 0, 2], [4, 4, 2], [2]), null, 'W=+1.8 slice alone is strictly unsolvable!');

  // Prove 100% SOLVABLE in 4D across Start -> Beacon 1 -> Beacon 2 -> Exit!
  const b1 = [MAZE4D_SPEC.beacons[0].col, MAZE4D_SPEC.beacons[0].row, MAZE4D_SPEC.beacons[0].slice];
  const b2 = [MAZE4D_SPEC.beacons[1].col, MAZE4D_SPEC.beacons[1].row, MAZE4D_SPEC.beacons[1].slice];
  const p1 = m.findCellPath(MAZE4D_SPEC.startCell, b1, [0, 1, 2]);
  const p2 = m.findCellPath(b1, b2, [0, 1, 2]);
  const p3 = m.findCellPath(b2, MAZE4D_SPEC.exitCell, [0, 1, 2]);
  assert.ok(p1 && p1.length > 3, '4D path exists from Start to Beacon 1');
  assert.ok(p2 && p2.length > 3, '4D path exists from Beacon 1 to Beacon 2');
  assert.ok(p3 && p3.length > 3, '4D path exists from Beacon 2 to Exit');
}

// 6. Verify Section 06: ALL 7 Levels of 4D Eat-Dots (3) + 4D Sokoban (4) are 100% BFS-Solvable!
{
  assert.equal(FourDSokobanSimulation, Sokoban4DSimulation);
  assert.equal(ARCADE_4D_LEVELS.length, 7, 'Section 06 includes 3 Eat-Dots + 4 Sokoban levels');
  assert.equal(ARCADE_4D_LEVELS.filter(l => l.mode === 'eat').length, 3);
  assert.equal(ARCADE_4D_LEVELS.filter(l => l.mode === 'sokoban').length, 4);

  const sim = new HyperGridArcadeSimulation('pac1');
  assert.equal(sim.toggleBasisMode(), 'XYW');
  assert.equal(sim.toggleBasisMode(), 'XYZ');

  for (const lvl of ARCADE_4D_LEVELS) {
    sim.loadLevel(lvl.id);
    const res = sim.autoSolve(240);
    assert.equal(res.complete, true, `Level ${lvl.id} (${lvl.title}) must be BFS-solvable! Got steps=${res.steps}`);
    if (lvl.id === 'soko1' || lvl.id === 'soko4') {
      assert.ok(res.crossWPushes >= 1, `Level ${lvl.id} must genuinely use cross-W pushing! Got crossWPushes=${res.crossWPushes}`);
    }
  }
  assert.equal(sim.completedLevels.size, 7, 'All 7 arcade levels solved cleanly');

  // Verify Undo works cleanly
  sim.loadLevel('soko4');
  const startP = [...sim.player];
  sim.step(1, 0, 0, 0);
  assert.equal(sim.undo(), true);
  assert.deepEqual(sim.player, startP);
}

// 7. Verify Section 07: Triple-Ring + Phase Lock Pillar Topology Puzzle
{
  const r = new TripleRingUnlinkSimulation();
  // Attempting to pull Ring B right in W=0 is blocked by Anchor Ring A
  assert.equal(r.moveActive(2.0, 0).reason, 'anchor');
  // Attempting to pull Ring B right in W=+1.8 hits Right Phase Pillar!
  r.moveActive(0, 1.8);
  assert.equal(r.moveActive(2.2, 0).reason, 'pillarRight', 'Right phase pillar blocks Ring B in W=+1.8!');
  // Shift Ring B to W=-1.8 -> slide right to X=+5.6 -> return to W=0 -> Docked!
  r.moveActive(0, -3.6); // W=-1.8
  r.moveActive(4.95, 0); // X=+5.6
  r.moveActive(0, 1.8);  // W=0.0
  assert.equal(r.ringB.docked, true, 'Ring B unlinks via W=-1.8 and docks at Right pedestal');

  // Select Violet Ring C: blocked in W=-1.8 by Left Phase Pillar, succeeds via W=+1.8!
  r.selectRing('C');
  r.moveActive(0, -1.8);
  assert.equal(r.moveActive(-2.2, 0).reason, 'pillarLeft', 'Left phase pillar blocks Ring C in W=-1.8!');
  r.moveActive(0, 3.6);  // W=+1.8
  r.moveActive(-4.95, 0);// X=-5.6
  r.moveActive(0, -1.8); // W=0.0
  assert.equal(r.ringC.docked, true);
  assert.equal(r.complete, true, 'Both rings unlinked & docked completes Section 07');
}

// 8. Verify Section 08: Authentic 4D XW 180° Rigid Chirality Flip Proof
{
  const c = new ChiralFlip4DSimulation();
  const baseEv = c.evaluate();
  assert.ok(baseEv.det > 1.5, 'Initial 3D key is strictly right-handed (det > 0)');
  assert.equal(baseEv.matchesLock, false);

  // Exhaustively prove ALL 64 orthogonal 3D rotations (XY, XZ, YZ ∈ {0,90,180,270}) keep det > 0 and NEVER match the left-handed lock!
  for (const xy of [0, 90, 180, 270]) {
    for (const xz of [0, 90, 180, 270]) {
      for (const yz of [0, 90, 180, 270]) {
        c.xyDeg = xy; c.xzDeg = xz; c.yzDeg = yz; c.xwDeg = 0;
        const ev = c.evaluate();
        assert.ok(ev.det > 1.5, `3D rotation (${xy},${xz},${yz}) preserves positive signed volume`);
        assert.equal(ev.matchesLock, false, `3D rotation (${xy},${xz},${yz}) can NEVER match Left-Handed lock`);
      }
    }
  }

  // Now perform exact 4D XW rigid flip: 0° -> 90° (edge-on into W) -> 180° (Left-Handed Mirror!)
  c.reset();
  const ev90 = c.setXWFlip(90);
  assert.ok(Math.abs(ev90.det) < 1e-10, 'At XW=90°, 3D projection flattens edge-on (det=0) while A swings into W=+1.4');
  assert.ok(Math.abs(ev90.verts[1][3] - 1.4) < 1e-10);

  const ev180 = c.setXWFlip(180);
  assert.ok(ev180.det < -1.5, 'At XW=180°, signed volume reverses strictly to negative (Left-Handed!)');
  assert.ok(ev180.maxW < 1e-10, 'At XW=180°, all 4 vertices return strictly to W=0');
  assert.equal(ev180.matchesLock, true, 'At XW=180°, 4D-flipped key matches Left-Handed Lock Socket!');

  // Prove strict rigid isometry: all 6 pairwise distances between the 4 vertices are identical before & after XW 180° flip!
  for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) {
      const d0 = dist4(CHIRAL_KEY_VERTICES[i], CHIRAL_KEY_VERTICES[j]);
      const d1 = dist4(ev180.verts[i], ev180.verts[j]);
      assert.ok(Math.abs(d0 - d1) < 1e-12, `Rigid 4D flip preserves edge length (${i},${j}): ${d0} vs ${d1}`);
    }
  }

  const ins = c.attemptInsert();
  assert.equal(ins.unlocked, true, 'Inserting XW-flipped key unlocks Section 08!');
  assert.equal(c.complete, true);
}

console.log('PASS Chapter 2 8-section large-arena suite (6-step chasm, 4D prism laser, 5x5 4D maze BFS, 7-level eat-dots/sokoban BFS, triple-ring, and true XW 180° chirality proof).');
