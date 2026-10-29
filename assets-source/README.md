# 当前采用的雕像源资产

左侧：SMK / Shaderbytes 优化的米洛维纳斯；右侧：Filip 独立重塑的大卫。运行时优化资产在 `../apps/fps-demo/dist/assets/classical-statues/`；这里保留可编辑母版与必要原始素材，不是额外在线下载依赖。

## 维纳斯

`venus-uploaded-source/venus-preview.blend` 可在 Blender 中编辑，GLB 是 2 米高的可移植模型。原始 `mesh/retopo_2.obj` 有 24,058 三角面；原始断臂、衣褶和薄底板保留。`unpacked/textures/` 包含原作者法线、AO、粗糙度贴图。授权 CC0，来源详见同目录署名文件。游戏后续处理保留自定义角法线与正常法线纹理，不以细分面数掩饰断臂。

`render_preview.py` 从同仓库大卫 Blender 母版复用摄影棚，重新导入原始 OBJ；`finalize_preview.py` 输出 GLB、打包纹理并验证 2 米高与三角面数。需要 Blender 4.x。摄影棚相机和灯光不进入 GLB。

## 大卫

`david-uploaded-source/source/decimatedmichd.fbx` 是用户提供的原始 FBX。`normalized-source.blend` 保留归一化、去除独立底座/投石索之前的可编辑中间源；`david-preview.blend` 与 GLB 为采用版本。`finalize_preview.py` 从归一化母版生成采用版。152,556 三角面，身体、头发和眼睛三部分；保留原有姿势，不强行把抬起的一只脚拉到地面。

这是 Filip 的独立重塑，不是米开朗基罗原作的忠实扫描。授权 **CC BY 4.0，必须保留署名与修改说明**，详见 `ATTRIBUTION.md`。

## 重生成与历史字段

```sh
blender -b -t 2 --python assets-source/david-uploaded-source/finalize_preview.py
blender -b -t 2 --python assets-source/venus-uploaded-source/finalize_preview.py
```

从仓库根运行上述命令；生成脚本默认在各自源目录输出。大卫脚本重新生成时会产生工作图、测试数据与 Blender 备份，均不应无选择地提交。

`source-license.json`、`asset-metadata.json`、`test-results.json` 保留导入时的来源证据，可能仍写着 `previewOnly`、`gameModified:false` 或待审核；这些是**当时的预览状态**，不是当前游戏状态。当前游戏已使用这些模型的优化派生版。历史 metadata 中的 Library ID 是来源标识，不是下载令牌。

未纳入旧失败候选、全套重复截图、`.blend1`、下载重复 ZIP、传输脚本和临时日志。原工作目录保留；本次没有永久删除源文件。

### 游戏运行时资产导出（已适配此仓库布局）

```sh
blender -b -t 2 --python apps/fps-demo/tools/export-classical-statues.py -- .
# 校验时写到独立目录，不覆盖已提交的运行时资产：
blender -b -t 2 --python apps/fps-demo/tools/export-classical-statues.py -- . /tmp/statue-export-check
```

导出器读取 `assets-source/{venus,david}-uploaded-source/`，默认输出到 `apps/fps-demo/dist/assets/classical-statues/`；可省略仓库根参数，脚本会按自身位置定位。相比生产工作区版本，仅改了输入/输出路径参数与调用说明，法线转移、模型简化和几何算法没有修改。

大卫的两个 `.blend` 使用 Blender 可直接读取的无损 gzip 容器压缩，以避免传输大小限制；文件名保持不变，Blender 4.3.2 实际打开验证通过。解压字节与原始母版 SHA256 完全相同，不减少面数/贴图。见 blender-container-validation.json。
