# 维度之外 · Codex 版

第一章《回廊空间站》的入口为 `dist/index.html` 或 `dist/chapter.html`，第二章《折页之间》为 `dist/chapter2/index.html`。在仓库根目录运行 `npm test` 检查拓扑、门户光学、碰撞、两章规则和进度。第一章基线规则见 [第一章设计记录](CHAPTER-1.md)，本版叙事与验收目标见 [评审与路线图](../../docs/codex-review-and-roadmap.md)。

第一章六门罗盘随视线、抬头和翻滚更新。上篇区分可通行舱门和观测窗，下篇显示相邻房号和到访次数。站在 X+ 舱的两面侧窗分别能观察维纳斯和大卫的正面。Tab 切换望远镜，在暂停设置中可选择原生分辨率观看雕像细节。

美术源文件保存在仓库的 `assets-source`。运行以下命令可以从相同 GLB 重新导出三角网格、艺术家法线、环境遮蔽和相对路径 LOD 清单，也可以重新绘制舱板纹理。

```sh
blender -b -t 2 --python apps/fps-demo/tools/export-classical-statues.py -- .
python apps/fps-demo/tools/paint-hull.py
```

维纳斯的远景/近景分别为 5,999/24,058 个三角形。大卫的远景/中景/近景分别为 8,000/32,000/152,556 个三角形。远景二进制合计 466,324 字节，两章使用各自的入口，近景几何按观察距离加载。舱板绘制脚本依赖 Python Pillow。

下文保留早期 v3 四胞原型的操作和验证记录，历史入口在源码的 `dist/v3.html`。

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
