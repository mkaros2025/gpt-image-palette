# gpt-image-palette

gpt-image-palette 是一个简约的科研配图生成工具。它包含 React 前端和 Fastify 后端，生产环境由 Fastify 同时提供页面、API 和本地生成文件访问。

## 功能

- 生成页：prompt、尺寸、质量、数量、配色、参考图、当前任务、最近结果画廊
- 历史页：表格 + 缩略图，支持搜索、下载、删除、带回生成页
- 配色页：固定 8 个语义色槽，支持预设和自定义方案管理
- 设置页：保存 `baseURL` / `API Key`，手动测试连接

## 部署方式

macOS、Linux、Windows 的命令一致：

1. 安装 Node.js 22 或更高版本。
2. 执行 `npm install`。
3. 开发模式运行 `npm run dev`。
4. 生产模式运行 `npm run build`，然后执行 `npm run start`。

## 说明

- 开发前端默认运行在 `http://127.0.0.1:43174`。
- 后端默认运行在 `http://127.0.0.1:43175`。
- 生产模式只需要启动 Fastify。
- 本地数据默认保存在 `backend/data/`。
