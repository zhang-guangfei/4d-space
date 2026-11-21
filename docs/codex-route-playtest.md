# 航服、八胞导航与绘制质量实测

第一章从 W+ 的初次巡查开始，依次进入 X+、W− 和 X− 看模型，再回 W+ 看真相、打开六向通道。测试通过真实 Chromium 加载子目录下的游戏。巡查过程中，驾驶脚本读取摄像机、罗盘和任务文字，用六个常规喷气键绕过雕像、穿过舱门。摄像机位置、物理时钟和探索记录均由游戏更新。

## 不重复路线

巡查计数达到 24/24 后，在 W+ 的模型台启动挑战。按 T 释放指针，点击「显示路线提示」，静态展开图显示八个编号和七条金线。按钮保持焦点时，H 可以收起和重新打开路线。按 T 重新捕获后，测试用实际的 W 键确认人物恢复前进，再按图依次通过 W+、X+、Y+、X−、Y−、Z+、W−、Z−。每通过一扇门，分别核对当前标记、本轮已走胞集合与任务登记。第八胞完成后，返回 W+ 接触镜面球，结尾显示通往《折页之间》的入口。[开始时的金线](screenshots/codex/route-start.jpg) · [到达第四胞](screenshots/codex/route-in-progress.jpg) · [八胞走完](screenshots/codex/route-complete.jpg)

在 1280×720、1280×800、1440×900 和 1920×1080 下，分别验证罗盘、地图、提示按钮及上下 HUD 的 DOM 边界。上篇第一次进入时地图隐藏，六向通道解锁后才出现。浏览器监测覆盖页面异常、控制台错误、请求失败和 HTTP 错误。[沿途状态和布局原始记录](validation/codex-route-journey.json)

## 航服

在 W+ 低头、点击左键挥手，可见护膝、软靴、腕口及左右区分色。转正视线，按 Tab 用游戏内望远镜看四扇门以外的同一名巡航员。两张截图均使用 1440×900 的实际 WebGL 缓冲区。[第一人称挥手](screenshots/codex/crew-first-person.jpg) · [门中自像](screenshots/codex/crew-optical-return.jpg) · [实际参与绘制的模型](validation/codex-crew-webgl.json)

## 绘制质量与帧率

Chromium 156.0.8078.79、Playwright 1.62.0、WebGL 2，Intel Xeon Platinum 8573C，四核 CPU 配额，机器没有物理 GPU。下表两次运行分别独占工作区，使用同一 1280×720 窗口。自动档预热 7 秒，再测静止 5 秒和持续 Shift+W 约 5 秒。两次均实走 W+ → X+ → W− → X−。原生与高清档各从相同初始机位重新加载、预热 2 秒并取样 3 秒。呈现速度按实际 Babylon 场景绘制次数除以墙钟时间计算。两个后端均未持续达到 60 FPS，玩家显卡上的余量需要在对应机器实测。[SwiftShader 原始记录](validation/codex-route-swiftshader.json) · [Mesa llvmpipe 原始记录](validation/codex-route-llvmpipe.json)

| 场景、质量 | SwiftShader 实际缓冲 | FPS / P95 帧间隔 | Mesa llvmpipe 实际缓冲 | FPS / P95 帧间隔 |
| --- | --- | ---: | --- | ---: |
| 自动，静止 | 384×216 | 38.78 / 43.6 ms | 448×252 | 48.26 / 33.8 ms |
| 自动，穿门行走 | 384×216 | 36.01 / 50.4 ms | 448×252 | 52.33 / 33.5 ms |
| 原生，静止 | 1280×720 | 5.99 / 437.1 ms | 1280×720 | 22.62 / 123.8 ms |
| 高清，静止 | 1920×1080 | 4.09 / 491.1 ms | 1920×1080 | 13.97 / 168.3 ms |

两次独占冷启动的按钮就绪时间分别是 3097 ms 与 2559 ms，实际点击至菜单退出后的绘制机会分别是 44 ms 与 39 ms。独立的完整通关窗口记录 47 次成功资源响应，每个后端在三个档位合计记录 132 次响应。所有窗口均通过 JS 异常、console.error、资源请求失败和 HTTP 错误检测。

## 复现

在仓库根目录运行以下命令。脚本默认使用已安装的 Chromium，也接受 `--chromium` 和 `--url`。每次执行生成对应 JSON 和实机截图。

```sh
python scripts/codex-route-e2e.py --swiftshader --mode challenge
python scripts/codex-route-e2e.py --swiftshader --mode portraits
python scripts/codex-route-e2e.py --swiftshader --mode profile
```

Mesa 一列使用隔离的 Xorg 虚拟显示和系统软光栅，把上面性能命令的 `--swiftshader` 改为 `--mesa-gl`，在该显示器上设置 `LIBGL_ALWAYS_SOFTWARE=1 LP_NUM_THREADS=4` 后运行。
