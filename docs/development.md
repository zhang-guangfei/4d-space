# 开发、云环境与发布

## 云环境设置

将已有 GitHub 仓库 `zhang-guangfei/4d-space`、分支 `main` 绑定到 Codex 云环境。在仓库根执行 `bash scripts/cloud-setup.sh`，测试命令设 `npm run check && npm test`。普通游戏无需联网安装依赖、无需 OpenAI 或任何 API 密钥。

Node.js >=20、Python3 必需；静态预览需支持 WebGL 的浏览器。云环境如需外部端口预览：

```sh
python3 -m http.server 8000 --bind 0.0.0.0 --directory apps/fps-demo/dist
```

只通过平台既有端口转发访问，不开启新的公开共享权限。localhost 本地开发用 `npm run serve:fps`。

## 日常工作

修改 `apps/fps-demo/dist/` 实际 ES 模块，更新对应 `chapter-*-tests.mjs`。在仓库根运行全部检查；单独第一章运行 `npm --prefix apps/fps-demo run test:chapter`。研究视频另需 Python numpy/scipy/Pillow、C++编译器、ffmpeg；雕像编辑另需 Blender，均不影响游戏运行。

## 发布

1. 检查版本来源、授权、运行资源路径；不得上传 .env、访问令牌、.git、node_modules。
2. `npm run check && npm test`，再用实际 WebGL 桌面浏览器检查加载、跨门、重复开关模型、Esc、上下篇键位和视觉遮挡。
3. 将 `apps/fps-demo/dist/` 的完整内容发布到现有站点，保持访问范围。不需要构建命令。不同静态托管商可直接托管同一目录。
4. 校验首页、关键 JS 与雕像文件 HTTP200、站点版本；记录 source commit、发布版本和未验收项目。

Git 提交不等于站点发布。没有在仓库配置含凭证的自动部署，也没有添加新的收费服务。新增托管账号或域名属于另行配置。
