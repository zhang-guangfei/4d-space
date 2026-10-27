# 第一章：回廊空间站 — prototype

## Latest implemented progression

Upper: continuous grounded WASD exploration of W+ → X+ → W− → X− → W+. Four remaining faces are non-passable optical glass. Complete one forward loop and manually operate the three canonical models at W+, X+ and W−, then explicitly choose **解除通行限制** at the W+ console.

Lower: all six faces become traversable and gravity is disabled. Fresh survey counts start with W+=1; upper entries do not count. Each of eight cells must be entered three times. A visit is committed only after ≥0.8m interior penetration and 0.7s since the last committed visit, preventing seam jitter farming. Then show exactly: **尝试从 W＋开始，不重复地走过八个不同房间吧**. The player explicitly starts at W+. Any contiguous path through eight distinct cells succeeds; a repeated cell fails only the current attempt and requires restarting at W+, retaining survey/model records. Eight unique cells latch success; returning to W+ is then allowed. W+ immediately has an enterable 2.4m chrome sphere. Models are not an additional final exit gate. Entering shows arrival in four-dimensional interior and a chapter-end placeholder; chapter 2 is not implemented.

One verified route: W+ → X+ → Y+ → Z+ → W− → X− → Y− → Z−, then return to adjacent W+. This is not the only valid route.

## Scene / optical model

Eight distinct cubic cells form the boundary of [-4,4]^4. Each cell has six neighbors, not a periodic 3-torus. The point lies on its cell hyperplane. Seams transport tangent vectors by `a' = a - (a·v)(v+n)`; remaining displacement and inertial velocity are preserved in the transported frame. Initial right/up/forward is Y−/Z+/X+, so Y+ is the initial left window.

Geometry is unfolded into the current tangent chart. Every branch includes its entire chain of portal rectangles; 5 clip planes per crossing (up to 20) restrict geometry to the corresponding optical path. Current budget: camera/portal-aware recursion through four crossings, including turning paths, with80 preallocated slots and at most10percell. The old73-path set remains only a deterministic regression fixture. This is geometrically mapped portal rendering, not planar mirrors. Full-sized synchronized self-images appear on actual returning-root paths; the straight four-seam images have32m optical distance, not nearest-room clones. Own body remains visible locally without a near-camera helmet. Up/down self paths preserve appropriate soles/head observation. Paths beyond four crossings or the bounded pool are not traced. This is explicitly disclosed in settings.

Light is modeled as confined to the cubical boundary, with per-cell point/ambient shading and local station emitters. It is not full 4D interior optics. The same asymmetric Y+ statue is transformed through the four XW observations (90-degree changes); Y− has a corresponding marker. Only W+, X+ and W− contain exhibits: central hall, treadmill and inside-equator sphere. All extra variants and the vertical hall were removed. Each has a miniature and an interactive inspector with Chinese explanation.

Chrome sphere uses an actual Babylon ReflectionProbe cubemap of the W+ room when the player returns there. Portal images before that use a low-resolution neutral environment fallback; probe is sampled once (not per-frame recursive full-4D reflections). No external textures are needed. The sphere has no collision barrier.

## Input and body

Click start/resume to lock pointer. Mouse yaw/pitch nearly ±90°, WASD grounded motion, C crouch. E near room center opens the hologram; drag model/scroll for orbit/zoom and manipulate travel slider to record inspection. Selecting/autoplay alone does not record it. Left mouse waves left red-marked hand, right mouse waves right gold-marked hand; all self-images synchronize. Context menu suppression applies only during active pointer lock; start-click transition cannot accidentally wave.

Lower W/S jets use full view forward/back including pitch; A/D side jets; Space/Ctrl or Q view-up/down jets. Velocity survives turning; new thrust changes acceleration direction, not existing momentum. Exponential suit-braking assistance, speed cap, radius-aware collision and normal-only velocity cancellation. Body full orientation follows view and transported frame, not global floor up. Pause freezes simulation and clears held keys, preserving momentum for resume. No forced camera roll, bob, or jump.

Mouse v3 guard remains: one authoritative look state, lock-transition reset, no repeated-frame drift, finite/extreme-packet guard, no smoothing or ordinary fast-turn rate cap. User-reported hardware jitter is not independently confirmed fixed.

## QA and limitations

Tests: `npm run test:chapter` (aggregate); `node chapter-optics-tests.mjs`; `node chapter-topology-tests.mjs`; `node chapter-motion-tests.mjs`; `node chapter-progress-tests.mjs`; `node chapter-hypotheses-tests.mjs`; `node chapter-smoke.mjs`; `node tests.mjs`; `node camera-engine-tests.mjs`.

The full application test uses real Babylon NullEngine scene/render paths and synthetic handlers. The fixture supplies DOM canvas mocks and a raw cubemap storage shim because NullEngine lacks that GPU allocation. It validates JavaScript/geometry/state, not GLSL GPU rasterization, physical pointer lock, actual mouse comfort, frame rate or visual quality. The designated cloud browser previously reported `WebGL not supported`; no alternate browser or server was used to evade it. Actual GPU acceptance remains for user review.

The previous public candidate is recoverable at `/v3.html` and Git commit `5f0317469a83aed529005a128e849319d05330e0`. The old teaching Site and documents were not modified. All engine assets are vendored locally; no AI/API keys, analytics or paid access.


## Revision 5 — reference palette, motion and seam performance

Procedural warm off-white walls, broad warm diffusers, blue-gray instruments behind nearly clear glass, rounded hatch rims. Reference PNGs were inspected privately and are NOT included in this project or Site. Traversal openings are circular in lower mode; upper walking hatches use a circular profile with a flat floor threshold. Collision uses the same analytic profile with conservative astronaut clearance; portal cone bounds remain rectangular, with actual opaque curved wall geometry providing the remaining occlusion.

Both miniature and expanded holograms float without model pedestals, are 1.5× larger, and include left/right room connections. Expanded diagrams label hypothesis predictions separately from the fixed W+ observation reference; they are not claimed as a literal 4D embedding. The previously requested eight additional landmarks were withdrawn and were not implemented.

Upper Space is an edge-trigger jump: gravity4.905m/s², feet apex1.75m (matching declared astronaut height), initial speed sqrt(2*g*1.75), exact ballistic integration, no double jump or held-key bounce. Distance-driven alternating leg animation uses actual collision-resolved travel, idles without head bob, and synchronizes all optical bodies. Lower Space remains a view-up jet and never adds gravity/gait. Local-only torso presentation is reduced and set back; helmet/visor/backpack are excluded locally, while full optical avatars retain their true proportions and gestures.

F toggles binocular FOV1.16→0.28 radians with proportional look sensitivity; repeat is ignored, viewing orientation is unchanged, and pause/unlock/model viewer/reset/end restore normal view. Settings show local-only FPS/frame interval/latest seam CPU timing and resource counts; nothing is uploaded.

The renderer now preallocates80 cell slots per mode and rebinds73 active optical paths with exactly7 active full/local avatar parents. Same-mode seams allocate zero new meshes/materials/textures. A comparable pre/post NullEngine CPU harness measured warm seam time from356–449ms to3–11ms before final material sharing; this is NOT GPU FPS or actual device performance. Resident pool memory is higher; mode changes prepare resources while paused with explicit status, and resume stays disabled until readiness. A per-slot material cache further removes duplicate uniform-identical materials.

Additional regressions: chapter-jump-tests.mjs, chapter-hatch-tests.mjs, application F/jump lifecycle checks in chapter-smoke.mjs. Real GPU lighting, physical controls, visible body footprint and shader compilation remain unverified in the cloud environment (WebGL unavailable). User review is still needed.


## Local-body follow-up
Only the first-person torso presentation is narrowed/set farther behind the eyes; all six optical return bodies retain original proportions. Binocular mode hides only the near first-person body so the magnified view stays clear, restoring it on exit; optical self-images remain visible. This is a local display adjustment, not a change to the underlying body or topology.

Read-only 48×36 ray-grid regression (`chapter-body-view-tests.mjs`) samples upper down-pitch45/70/89 degrees: local-body coverage7.5/31.8/42.9%; at89 degrees, wave36–39.5%, jump44%, crouch29.5%. All sampled cases stay below half the viewport; this is geometric sampling, not a universal pose guarantee or GPU screenshot. Lower view-aligned body coverage is0% for those sampled pitches; F near-body hiding is separately tested in the full application harness.

## Revision 7: bounded glass continuity and compact equipment surfaces

The straight second-forward room now has all four side-window backing cells present before crossing. The budget remains finite: arbitrary later turning branches are not traced. Six fourth-seam self images remain. Individual transparent pane meshes replace room-merged glass for distance sorting; shared-boundary panes are exactly coincident and only their inward-facing side contributes. This avoids duplicate tint and asymmetric .025m clip offsets. Procedural shell grain uses canonical mesh-local coordinates instead of the recentered eye chart. These fixes address definite geometry/material discontinuities; real GPU transparency is not verified in the cloud environment.

Round apertures shrink from radius2.8 to2.15m (23%); grounded hatches radius3.4 to2.65m (22%), centeredZ=-1.25 with a floor-flush 3m-wide threshold. Upper side windows shift down .8m to preserve standing-eye sightlines; all visual outlines and capsule checks share hatch parameters. Lower doors remain centered for zeroG. Groundjump retains1.75m feet rise and head clearance.

Latest user image was inspected privately, not bundled: functional cream-white equipment panels, restrained blue rails/screens, green handles, black fasteners, bright rectangular light diffusers. Repeated shallow trim is merged per material; no new standalone room props, no copied logos/watermarks, no change to cube topology or required transparent windows.

73 active optical instances/80 reusable slots cost more resident resources than v6. Independent NullEngine pre-final-trim sample: same-mode seams3.8–17.2ms, update .98ms median/1.89ms p95, lower pool construction~1.5s while paused. These are CPU-only, not actual GPU FPS. chapter-pool-tests performs64 root reassignments across both modes with zero per-seam mesh/material/texture allocations and stable pool identities. chapter-glass-tests checks actual rounded-opening rays, pre/post seam positions and normal/zoom projection, pane boundaries/normals and local-grain source.

Sphere hypotheses are corrected to walking on the INSIDE equator with head/up radially inward and rooms at opposite poles. Miniatures and inspector retain transparent shells; they are ordinary-sphere hypotheses, not the actual eight-cell embedding.

## Revision8: first-person framing farther forward relative to the visible body

Only the local presentation avatar is shifted .28m backward along its body-forward axis. In grounded mode this axis uses yaw (not downward gaze); zeroG uses the full view-aligned body orientation. The actual optical camera, capsule center, transported frame, clipping eye and all six full physical return avatars are unchanged. This avoids premature camera seam crossings, wall-peeking or offset clamps that snap. F still hides only the local body. No new geometry/materials.

48×36 mesh-ray sampling: upper idle body occupancy at45°/70°/89° decreased from7.5/31.8/42.9% to0/6.1/24.5%; jump24.5%, crouch26.9% at89°. These are sampled geometric coverage, not GPU screenshots or a universal guarantee. Regression additionally checks camera/collision/frame/remote-avatar invariance at wall/seam-adjacent, jump-height and crouch-height positions in both movement modes.

## Combined revision9 (includes saved revision8)

The marked gray triangular flicker regions correspond to overlapping incoming-cell wall fragments at round portal corners: rectangular optical clipping admitted the neighboring coplanar shell. Portal depth clipping now requires .002m inside the next cell, rejecting that redundant wall surface while retaining the owning room wall, ring and outgoing glass. The screenshot was inspected privately and not included as an asset. This is a geometric z-fighting correction; GPU output remains unverified here.

Current openings are half revision7 linear size: round windows/lower doors diameter2.15m; grounded hatch circle diameter2.65m, centered ambientZ=-2.675, top=-1.35/floor=-4 (clearheight2.65m), flat thresholdwidth1.5m. Ground avatar stays1.75m. Upper side windows center at ambientZ=-2 where applicable. Full-height jump cannot pass the compact lintel; vertical displacement now goes through collision sweep and cancels upward speed on contact. Free-room jump still rises1.75m. ZeroG retains its existing .2m-radius eye-centered collision proxy; it is not a full articulated suit/limb collider.

Rendering now uses current-camera portal/frustum polygon clipping to follow visible straight AND turning paths to four crossings. Maximum80 pooled instances,10percell; no unbounded5^4 scene creation. Paths outside this finite depth/budget remain untraced. Candidate geometry uses conservative rectangle bounds; opaque rounded walls mask corners. Same-mode remapping only happens when selected ordered paths change. Six full straight return paths remain available when visible; other returned-root paths display the correctly transformed same player. Shared pool stays fixed, including F zoom. Pure-selector sample1000views: CPUmedian.23ms/p95.85ms,max16selected; not GPU FPS. Regression tests explicit formerly missing turning chains through3/4seams plus40dynamic view reassignments with no scene-resource growth.

Half-size doors physically occlude some far SIDE windows that were visible through larger openings. Numeric proof in chapter-glass-tests distinguishes this physical occlusion from missing path geometry; those backing paths still exist. Do not describe a hidden window as forcibly visible through solid walls.

Hypothesis actors now have grounded feet/clear heads inside room bounds when passing room segments; connecting hall paths support the intervals between rooms. Treadmill rooms fade smoothly at the recycle ends instead of appearing at full opacity on wrap, including reverse/negative travel. The actor remains fixed while rooms move. Sphere inside-equator/radially inward orientation is unchanged. Miniatures use corresponding foot/floor placement and smooth endpoint fade.

### Final scope reduction and reviewed model controls

Exactly three physical exhibits remain: W+ central hall, X+ treadmill, W− inside-equator sphere. No model in X−/Y±/Z±; no vertical hall or extra experiments. Three unique model types are recorded (room keys W+/X+/W−), with loop+three observations unlocking lower stage. Lower survey/route/bubble rules unchanged. Observation means the user manipulated the model, not that a hypothesis was validated.

Hall shared pose now walks counterclockwise so the central hall is genuinely on LEFT; exterior rooms RIGHT. Belt +X-forward means LEFT+Z/RIGHT−Z. Both miniatures and inspectors consume the shared hall/belt mathematical pose functions. Sphere stays equatorial/inward; all sliders consistently scrub time/position, not automatically reverse walking direction. Miniatures run their own clock; inspector starts at phase0, so they are not claimed phase-synchronized. Sphere miniature speed matches inspector(.24×π/2 rad/s). Inspector has pause/resume-current and reset-to0; opening never jumps to global time, autoplay/reset alone never marks observation.

Each physical room now has6 inward-facing signs offset clear of the hatch/model/light center.144 geometry sightline samples across8cell frames find at least5of6 signs unobstructed at each sampled position (one may be physically occluded by the existing asymmetric landmark). Two smaller diffuser panels per room replace6; emitter gain .55→.28 and ambient/diffuse .72/.30→.64/.24. These are custom shader lighting parameters, not a claim that removing Babylon lights improvesFPS. No GPU text/lighting acceptance claim.

## Revision10: optional fourth colored tesseract model

Latest user request adds a NEW fourth model at X−, not the removed vertical-hall hypothesis. The required observations remain exactly3 (central hall/treadmill/inside-equator sphere). Colored tesseract manipulation awards no required-model credit and never blocks upper unlock or the lower survey/route/bubble goal.

`dist/colored-tesseract.js` builds the exact unit tesseract incidence data:16vertices/32edges/24squarefaces/8cubic cells; each cell has8vertices/12edges/6faces,6neighbors and one same-axis opposite. Tests compare every neighbor directly with the game atlas. Six4D rotation planes preserve Euclidean norms; perspective projection distance4 is beyond vertex radius2, so finite throughout. Stable palette: W+white,W−yellow,X+red,X−orange,Y+blue,Y−green,Z+purple,Z−cyan. This is a color-indexed boundary topology hint, not a Rubik-turn puzzle.

The diagram shows32neutral exact projected edges, eight colored cell-outline batches inset6% solely to distinguish overlapping cells, and one transparent selected six-face volume. It explicitly explains projection distortion/overlap; inset outlines are not physically separated rooms or a literal 3D embedding. Inspector provides all8ID/color buttons, selectedcell+sixneighbors, six rotation-plane choices, angle slider and ordinary3D orbit/zoom. The X− miniature uses the same module with owning-room portal shaders; it updates at12Hz for bounded CPU work, whereas the inspector animates continuously. Selection state is local to the inspector, not a change to game topology.

Each copy has10batched ordinary triangle meshes and17prewarmed materials. Selected-cell/plane/angle changes retain mesh identities and material count. Main pool adds100meshes (4052resident in NullEngine fixture), with no per-seam resource creation. All new meshes have normals/UVs for portal clipping. No external assets or reference images included.

Verification: full `npm run test:chapter` passes, including module exact incidence/rotation/projection, canonical three-model regressions, optional fourth UI selection/plane controls, no-progress-credit, stable scene resource counts, portal material ownership,40dynamic visibility changes and64root reassignments. Still no real GPU visual/physical pointer-lock acceptance in this environment.
Additional regression explicitly checks0°/90°/180° and the genuinely edge-on X+ cell at XW angle asin(1/4): its projected X extent collapses below1e−10 while all mesh positions/normals remain finite. Natural projection collapse is retained, not disguised. Optional-model reset/close after manipulation leaves required observations0/3 and unlock false.
