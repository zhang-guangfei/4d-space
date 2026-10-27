# 四维空间体验 · 游戏与教学原型

本项目把第一人称空间探索、四维几何教学和剧情设计资料放在同一个可携带仓库中。**当前是研发原型，不是完整游戏。**

## 内容与状态

- `apps/fps-demo/`：四胞回环 FPS 稳定基线 v3；连续移动、碰撞、暂停与鼠标输入保护。**空间站第一章正在开发，尚未纳入此基线。**
- `apps/learning-demo/`：教学演示 v5，三个教学章节、十个小节；投影、截面、八胞边界行走和四维内部坐标实验。教学章节不等于游戏章节完成度。
- `docs/design/chapter-1-current.md`：当前空间站第一章方案（待实现/验收）；优先于旧审核稿。
- `docs/reference/`：运动原理解说与小说案例，含 PDF/DOCX。
- `docs/story/`：三章叙事参考《第九个房间不存在》，不是当前关卡实现说明。
- `docs/design/archive/`：已被空间站方案取代的旧剧情审核稿；仅留档，不能当作当前剧情设定。

## 本地运行

需要 Node.js 20+（测试）和 Python 3（静态服务）；无需安装 npm 依赖、API 密钥或后端。FPS 的 Babylon.js 已随仓库提供。

```sh
npm test
npm run check
npm run serve:fps
# 打开 http://localhost:8000/
```

另开终端运行教学版：

```sh
npm run serve:learning
# 打开 http://localhost:8001/ （几何）
# 打开 http://localhost:8001/rooms.html （章节实验）
```

FPS 需要支持 WebGL 的桌面浏览器。点击进入后用鼠标转向，WASD 行走，Esc 暂停/释放鼠标；暂停菜单调灵敏度和重置。教学版使用屏幕按钮、滑块及画布交互。不建议直接通过 `file://` 打开 ES 模块页面。

## 数学与实现边界

四维超立方体有 8 个三维立方胞、24 个二维正方形面、32 条棱、16 个顶点。八胞组成的是**三维边界**，不是四维内部。每个胞与 6 个非对面胞相邻；对面胞不能一步直接进入。

FPS 稳定基线仅实现 `W+ → X+ → W− → X− → W+` 四胞回环的局部展开和周期接缝，不是完整八胞空间，也不声称实现真实四维光线追踪。内部实验是独立的四坐标模型，必须与边界行走区分。

## 结构与验证

两个应用都是原生 HTML/CSS/JavaScript，无构建步骤；`dist` 就是可编辑源文件与静态发布目录。FPS 用 Babylon.js 渲染，教学版用 Canvas。详见 [架构](docs/architecture.md)、[验证](docs/validation.md) 和 [版本来源](docs/provenance.md)。

自动检查不能替代真实 WebGL/鼠标实测。当前云端浏览器曾报告不支持 WebGL，因此**用户设备上的镜头体验和实际游玩验收仍待确认**。

## 权利与隐私

这是面向用户 GitHub 的私有项目整理；没有授予用户代码或文档开源许可。第三方 Babylon.js 按其 Apache-2.0 许可使用，见 [第三方说明](THIRD_PARTY_NOTICES.md)。未包含账号凭据、托管配置、会话日志或私人助手笔记。
