# 清理记录 · 2026-10-29

旧的 v18 FPS 导出目录已移到仓库外的 `project-cleanup-quarantine-20261029/export-fps-v18/`，由 v33 不可变提交替换。逐文件 SHA256、原路径和恢复路径见 cleanup-manifest.json；隔离目录旁有同样 manifest。需要回退时先保存当前改动，再从隔离目录恢复。没有永久删除唯一用户文件。

新版导出仅包含可运行源码、测试、当前模型源及许可、最终研究生成源、正式故事和参考文档。未纳入 node_modules、.git、平台身份/凭据、Library 传输 helper、帧缓存、编译中间文件、重复 ZIP/BLEND 备份、失败预览视频。工作区中这些研究历史仍保留，未误当作当前游戏资产，也未擅自清空。

旧教学应用与旧 v3 入口是有用的教学/回归内容，刻意保留，不按“旧”一律删除。

两个大卫 Blender 母版改为 Blender 原生兼容的无损 gzip 容器（保持 `.blend` 文件名）；原未压缩字节另外隔离，见 manifest 的 uncompressed-blender-sources 记录。Blender 打开与解压 SHA256 已验证，不降低模型精细度。
