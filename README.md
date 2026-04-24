# PaperPalette

PaperPalette 是一个用于科研配图生成的 Fastify API 服务。当前项目不包含前端页面。

## 功能

- 保存图片服务 `baseURL` 和 `API Key`
- 保存 prompt、尺寸、质量、配色方案和参考图
- 调用图片生成模型
- 保存生成历史和生成结果文件
- 提供图片历史查询与删除接口

## 部署方式

macOS、Linux、Windows 的命令完全一致：

1. 安装 Node.js 22 或更高版本。
2. 在项目根目录执行 `npm install`。
3. 开发模式运行 `npm run dev`。
4. 生产模式运行 `npm run build`，然后执行 `npm run start`。

Windows 下可以在 PowerShell、命令提示符或 Windows Terminal 中执行这些命令。

## 说明

- 服务默认监听 `http://127.0.0.1:43175`。
- 本地数据默认保存在 `backend/data/`。
- 默认端口不使用 `8000`。
