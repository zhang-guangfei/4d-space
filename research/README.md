# 八胞体动画：参数反推与可复现生成

这里保留的是最终动画的数学、生成代码与验证依据，不是把参考 GIF 倒放后当作生成结果。

## 内容

- `cube-parameter-inference/`：16 个顶点、32 条边、固定镜头、XW 匀速旋转的独立模型；519 个角点观测、训练/留出数据、模型比较和条件 bootstrap 区间。
- `grounded-cast-inferred/`：最终反向运动、贴地人物、两雕像、等三维柱径和逐像素 Z 缓冲的软件渲染器。保留最终 MP4、接触表和数值 QA。
- `inferred-cube-video/`：无人物的正向生成及参考对照，作为参数反推证据。
- `observer-source/`：从早期预览抽取的程序化宇航员几何；没有携带被替代的动画和帧数据。
- `reverse-cube-reference/`：参考 GIF、早期拟合初值、雕像简化几何。
- `cube-reference-replica/`：仅保留后续推理依赖的射影初值及生成脚本。该早期复刻并未达到像素重合，见其中 QA；没有把失败视频当成最终成果。
- `projection-identifiability.md`：为什么单视图不能唯一确定原场景所有参数。

## 数学与限制

参考：Jason Hise，公共领域 [8-cell-simple.gif](https://commons.wikimedia.org/wiki/File:8-cell-simple.gif)。GIF 为 48 帧，每帧 70 ms；无标记形状每 3.36 秒重复，同一有身份顶点绕行一周是 13.44 秒。

采用四维边长 2 的规范化尺度，4D 透视距离约 3.0544，3D 相机距离约 5.5917，方位 31.723°、仰角 19.476°、滚转 −1.764°。参数是从图像估计的可解释生成模型，**不是恢复原作者 Maya 文件，也不是逐像素完全重合**。留出角点坐标 RMSE 约 2.68 px（256px 参考画布）；尺度、轴名、符号及四分之一圈顶点置换存在歧义。

中央人物是固定在屏幕中央附近、贴合连续中央地面包络的展示参照，**不是始终属于同一物理胞的居民**。两雕像严格嵌入各自胞并随同一 4D 变换。展示坐标 Z± 对应游戏坐标 Y±（左维纳斯、右大卫）。32 根柱的半径统一为投影后 3D 空间的 0.035；透视下屏幕粗细仍会随深度变化。

最终软件视频用不透明逐像素 Z 缓冲验证遮挡；游戏 Babylon 透明面采用质心排序近似，不能把视频 QA 等同于游戏 GPU 验收。本云环境未完成真实 WebGL、物理鼠标或设备帧率验收。

## 重新生成

需要 Node.js 20+、Python 3（numpy、Pillow、scipy）、C++ 编译器和 FFmpeg。下面命令从本目录执行：

```sh
python -m pip install -r requirements.txt
node generate-scenes.mjs
c++ -O3 -shared -fPIC grounded-cast-inferred/raster.cpp -o grounded-cast-inferred/raster.so
python grounded-cast-inferred/validate_ground.py
python grounded-cast-inferred/render.py --sample  # 先生成 8 帧检查
python grounded-cast-inferred/render.py           # 完整 192 帧
ffmpeg -y -framerate 100/7 -i grounded-cast-inferred/frame-%03d.png -c:v libx264 -crf 18 -pix_fmt yuv420p -movflags +faststart grounded-cast-inferred/generated.mp4
```

纯几何正向预览：`python inferred-cube-video/render.py`，编码方式相同。渲染会写帧图与 QA 文件；建议在复制出的工作目录运行，避免覆盖保留的验收证据。

重新拟合（计算较慢，会更新对应报告）：

```sh
python cube-parameter-inference/infer.py
python cube-parameter-inference/validate_models.py
python cube-parameter-inference/bootstrap.py
python cube-parameter-inference/make_model.py
```

`make_model.py` 更新参数说明与 CSV，不自动改写 `model.mjs`：新拟合结果必须经人工核对、同步生成模型后再生成动画。`projective.npy` 为射影拟合初值，必要时先执行 `python cube-reference-replica/fit_projective.py`。

## 授权

参考 GIF：Jason Hise / public domain。人物程序几何随项目源保存；雕像抽样数据来自 `../assets-source/` 所列维纳斯 CC0 和 Filip 大卫 CC BY 4.0，署名和修改说明见相应 `ATTRIBUTION.md`。不要把大卫误标为米开朗基罗原作的扫描模型。
