# 第一章：回廊空间站 — prototype

## Latest implemented progression

Upper: continuous grounded WASD exploration of W+ → X+ → W− → X− → W+. Four remaining faces are non-passable optical glass. Complete one forward loop and manually inspect the four reachable room experiments, then explicitly choose **解除通行限制** at the W+ console.

Lower: all six faces become traversable and gravity is disabled. Fresh survey counts start with W+=1; upper entries do not count. Each of eight cells must be entered three times. A visit is committed only after ≥0.8m interior penetration and 0.7s since the last committed visit, preventing seam jitter farming. Then show exactly: **尝试从 W＋开始，不重复地走过八个不同房间吧**. The player explicitly starts at W+. Any contiguous path through eight distinct cells succeeds; a repeated cell fails only the current attempt and requires restarting at W+, retaining survey/model records. Eight unique cells latch success; returning to W+ is then allowed. W+ immediately has an enterable 2.4m chrome sphere. Models are not an additional final exit gate. Entering shows arrival in four-dimensional interior and a chapter-end placeholder; chapter 2 is not implemented.

One verified route: W+ → X+ → Y+ → Z+ → W− → X− → Y− → Z−, then return to adjacent W+. This is not the only valid route.

## Scene / optical model

Eight distinct cubic cells form the boundary of [-4,4]^4. Each cell has six neighbors, not a periodic 3-torus. The point lies on its cell hyperplane. Seams transport tangent vectors by `a' = a - (a·v)(v+n)`; remaining displacement and inertial velocity are preserved in the transported frame. Initial right/up/forward is Y−/Z+/X+, so Y+ is the initial left window.

Geometry is unfolded into the current tangent chart. Every branch includes its entire chain of portal rectangles; 5 clip planes per crossing (up to 20) restrict geometry to the corresponding optical path. Budget: all six first neighbors, all non-return second neighbors, and all six straight chains through fourth crossing. 49 instances total. This is geometrically mapped portal rendering, not planar mirrors. Six full-sized synchronized self-images appear only on returning four-seam optical paths, 32m from the source image—not in the nearest room. Own body remains visible locally without a near-camera helmet. Up/down self paths preserve appropriate soles/head observation. At arbitrary corners, branches beyond two turns are not traced; beyond-budget openings fade to scene background. This is explicitly disclosed in settings.

Light is modeled as confined to the cubical boundary, with per-cell point/ambient shading and local station emitters. It is not full 4D interior optics. The same asymmetric Y+ statue is transformed through the four XW observations (90-degree changes); Y− has a corresponding marker. Each cell has an animated small hologram and a larger interactive 3D experiment with Chinese explanation. Miniatures are schematic previews; the expanded experiments implement the full distinct variants.

Chrome sphere uses an actual Babylon ReflectionProbe cubemap of the W+ room when the player returns there. Portal images before that use a low-resolution neutral environment fallback; probe is sampled once (not per-frame recursive full-4D reflections). No external textures are needed. The sphere has no collision barrier.

## Input and body

Click start/resume to lock pointer. Mouse yaw/pitch nearly ±90°, WASD grounded motion, C crouch. E near room center opens the hologram; drag model/scroll for orbit/zoom and manipulate travel slider to record inspection. Selecting/autoplay alone does not record it. Left mouse waves left red-marked hand, right mouse waves right gold-marked hand; all self-images synchronize. Context menu suppression applies only during active pointer lock; start-click transition cannot accidentally wave.

Lower W/S jets use full view forward/back including pitch; A/D side jets; Space/Ctrl or Q view-up/down jets. Velocity survives turning; new thrust changes acceleration direction, not existing momentum. Exponential suit-braking assistance, speed cap, radius-aware collision and normal-only velocity cancellation. Body full orientation follows view and transported frame, not global floor up. Pause freezes simulation and clears held keys, preserving momentum for resume. No forced camera roll, bob, or jump.

Mouse v3 guard remains: one authoritative look state, lock-transition reset, no repeated-frame drift, finite/extreme-packet guard, no smoothing or ordinary fast-turn rate cap. User-reported hardware jitter is not independently confirmed fixed.

## QA and limitations

Tests: `npm run test:chapter` (aggregate); `node chapter-optics-tests.mjs`; `node chapter-topology-tests.mjs`; `node chapter-motion-tests.mjs`; `node chapter-progress-tests.mjs`; `node chapter-hypotheses-tests.mjs`; `node chapter-smoke.mjs`; `node tests.mjs`; `node camera-engine-tests.mjs`.

The full application test uses real Babylon NullEngine scene/render paths and synthetic handlers. The fixture supplies DOM canvas mocks and a raw cubemap storage shim because NullEngine lacks that GPU allocation. It validates JavaScript/geometry/state, not GLSL GPU rasterization, physical pointer lock, actual mouse comfort, frame rate or visual quality. The designated cloud browser previously reported `WebGL not supported`; no alternate browser or server was used to evade it. Actual GPU acceptance remains for user review.

The previous public candidate is recoverable at `/v3.html` and Git commit `5f0317469a83aed529005a128e849319d05330e0`. The old teaching Site and documents were not modified. All engine assets are vendored locally; no AI/API keys, analytics or paid access.
