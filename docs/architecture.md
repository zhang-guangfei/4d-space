# 架构

## FPS

`game.js` 负责场景、交互和状态；`physics.js` 负责周期四胞回环、墙体/门框/台座碰撞与移动细分；`look.js` 独立管理视角。渲染引擎为本地 vendored Babylon.js。测试使用 Node 断言以及引擎 NullEngine，不依赖网络。

## 教学演示

`geometry.mjs` 提供超立方体几何、旋转、投影和真实超平面截面；`app.mjs` 绑定几何 UI。`rooms-geometry.mjs` 提供八胞边界转换；`campaign.mjs` 与 `chapter-views.mjs` 提供教学章节状态和画面；`rooms.mjs` 绑定章节 UI。

## 可移植性

两个应用保持独立相对资源路径；分别作为静态站点运行，无云托管专用配置。移植时使用各自 `dist/` 为站点根目录，教学章节入口为 `rooms.html`。仓库不启用自动部署，也不包含外部账号或部署元数据。
