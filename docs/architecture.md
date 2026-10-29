# 架构与入口

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
