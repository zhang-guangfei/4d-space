# 维度之外

当前主入口为第一章「回廊空间站」：`dist/index.html`（同内容 `dist/chapter.html`）。完整规则、光路预算、控制方式、测试及 GPU 验收限制见 [CHAPTER-1.md](CHAPTER-1.md)。运行 `npm run test:chapter` 验证完整章节。旧候选保留在 `/v3.html`。以下是 v3 基线历史记录，不是当前章节规则。

# 四胞回环 · 独立 FPS 原型

Babylon.js 9.32.1 is vendored from the official stable CDN, Apache-2.0 license included. No runtime third-party network assets, backend, API key, document changes, or changes to the original teaching Site.

## Controls
Click 进入 3D 漫游 to request pointer lock; mouse yaw/pitch, WASD continuous motion, Esc pause/unlock. Sensitivity and reset are in the pause menu. Window blur, hidden visibility and lock loss clear movement keys. Fixed FOV and eye height; gravity clamps to floor; no bob, forced jump, or camera automation.

## Geometry
Four room identities w+ → x+ → w− → x− repeat every 48 world units (12 each). Rooms are duplicated beyond the camera range, making the next room actual rendered geometry visible through openings, not an empty trigger. Camera z wraps only at the equivalent chart seam, preserving overshoot and orientation. Wall, doorway and plinth collision uses a circular player and 0.08-unit movement subdivision, with axis sliding. Stable up is correct for this XW loop fixing Y/Z; this is not an entire four-dimensional interior or full eight-cell game.

## Checks
`node tests.mjs` tests forward/inverse loop, positive/negative remainder, walls/jambs/opening and plinth collision. `node --check dist/game.js` validates JS syntax.

Managed preview start failed with infrastructure startup timeout (server reported ready but no preview URL was returned; status stopped). No unauthorized alternate browser/server was used. See final delivery for production browser QA outcome.

Production deployment succeeded; designated cloud browser observed the owner-private ChatGPT login gate, not the scene. WebGL, pointer lock, mouse movement, repeated pause/reset and actual keyboard playtest remain UNVERIFIED. `node smoke.mjs` successfully constructs all 468 meshes, 14 lights and 90 materials with the real Babylon NullEngine and mocked canvas; this does not test rasterization or input.

## Camera-input revision v3 (2026-10-27)
User authorized public/no-login access. Access policy now public, revision 2. The designated cloud browser loads the app without login but fails engine initialization with `WebGL not supported`, including after one reload. Hence no physical mouse/WebGL acceptance claim is made.

A real-engine audit did not reproduce engine angle overwrites, default-input conflicts or seam-induced orientation jumps (`node camera-engine-tests.mjs`). The old mouse handler could turn 2 radians from a single 1000-pixel packet. The v3 candidate mitigation owns one look state, applies it once per rendered frame, discards the first lock-transition packet, clears pending deltas on unlock/blur/reset, rejects nonfinite input, rejects anomalously large (>512px) single packets, and requests unadjusted mouse movement where supported. Excess is discarded, not replayed later. Normal small input is unsmoothed. Normal fast turns and multiple normal packets are preserved without a per-frame speed cap. Pause settings expose local-only input diagnostics; no telemetry is transmitted.

`node tests.mjs` checks continuous yaw across many turns, first-lock spike, pending input reset, finite/spike guards, repeated-frame no-drift, and seam independence. `node smoke.mjs` additionally runs the actual application handlers with synthetic events and the real NullEngine through forward/back loops, wall collision, pointer-lock transitions and reset. These are explicitly NOT physical-browser playtests. Actual user hardware reproduction and WebGL regression remain pending.
