# 架构与入口

## Codex 版

`apps/fps-demo/dist/index.html` 运行第一章，`chapter2/index.html` 独立运行第二章。两章只共享本地 Babylon.js 与站点图标。第二章首屏不导入第一章的模型或状态。

- 第一章的交互入口按实际可见光路分配房间副本。远景合并舱壁与展品，保留原来的门洞、光路裁剪、房间方向和接缝运输。雕像的二进制网格按视距与画质异步读取。
- 第二章 `rules.mjs` 决定当前目标、台词和有效动作，`puzzles.mjs` 维护四维坐标、截面和货栈。`app.mjs` 绑定第一人称输入，`logbook.mjs` 用同一规则重放已保存的操作。
- `scene.mjs` 管理一个 WebGL 场景，只实例化当前小节。改变 W 时相机 XYZ 与朝向固定，环境在新切片中显现。`console.mjs` 和 `scope.mjs` 将同一组状态画进并列的切片窗口。T 捕获或释放指针，F 交互，N 在完成后进入下一小节。
- `npm run build:codex` 生成 `_site_codex/`。从已提交的开发树运行 `bash scripts/publish-codex.sh`，更新 GitHub Pages 的 `codex/` 并归档相同的产物树。发布脚本会检查 `codex/` 以外的路径，遇到并发推送冲突会停在普通快进检查。

见[剧本、空间约定与路线图](codex-review-and-roadmap.md)和[Chromium WebGL 验收记录](codex-playtest.md)。

## 指定基线中的模块


`apps/fps-demo/dist/index.html` 与 `chapter.html` 为第一章入口，`chapter.js` 绑定输入、任务及场景生命周期。

- `chapter-topology.js`：八胞邻接、切向框架与跨门运输。
- `chapter-motion.js` / `grounded-motion.js`：惯性运动、地面跳跃；下篇姿态以局部旋转维护，不强制与世界轴平行。
- `chapter-progress.js`：上篇阅读、下篇访问统计、无重复路线和镜面球。
- `station-renderer.js` + `optics.js` / `visible-optics.js`：portal 光路裁剪、80 槽对象池；直行前后十室与遮挡保护，不在每次跨门分配新场景。
- `hypotheses.js` / `model-content.js`：四个假说查看器与文案。
- `colored-tesseract.js` / `tesseract-reference.js`：精确拓扑、参考参数投影、逆向 XW 动画；同一实现供 W+ 全息与放大查看器使用。
- `tools/export-classical-statues.py`：雕像加工；运行资产及具体放置/光照模块见 dist。同一雕像几何、法线与材质在各入口复用。
- `v3.html`：旧四胞原型，只为历史回归保留。

教学应用 `apps/learning-demo` 独立 Canvas 实现：`geometry.mjs` 为投影与切片，`rooms-geometry.mjs` 为八胞边界，`campaign.mjs` 管章节状态。教学演示与 FPS 的进度不互通。

无需打包器；不要只复制 index.html。完整 dist（含本地引擎、模型、纹理）作为站点根发布。仓库不包含自动部署身份或平台访问令牌。
