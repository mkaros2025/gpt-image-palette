# GPT Image Palette

[English](./README.md) | 中文

GPT Image Palette 是一个本地图片生成工作台，适用于兼容 `gpt-image-2` 的图片服务。它提供一个简洁的网页界面，用来编写 prompt、使用模板、上传参考图、选择配色、生成图片并管理历史结果。

## 项目功能

- 在生成页集中编写和复用图片 prompt。
- 浏览并使用内置的 `awesome-gpt-image-2-prompts` 模板库。
- 上传多张参考图，用于图生图生成。
- 选择图片尺寸、质量、生成数量和可选配色方案。
- 预览最新生成结果，并查看最近生成图片。
- 在历史页搜索、查看详情、下载、删除图片，也可以把历史记录带回生成页继续编辑。
- 在设置页保存 API base URL 和 API Key。

## 环境要求

- Node.js 22 或更高版本
- npm
- 一个可用的图片 API Key

## 开发运行

安装依赖：

```bash
npm install
```

启动应用：

```bash
npm run dev
```

打开：

```text
http://127.0.0.1:43174
```

后端默认运行在：

```text
http://127.0.0.1:43175
```

进入应用后，打开设置页，填写 API base URL 和 API Key。

## 生产部署

构建应用：

```bash
npm run build
```

启动生产服务：

```bash
npm run start
```

生产模式下，后端会同时提供 API 和构建后的前端页面。

## 配置

可以复制环境变量示例：

```bash
cp .env.example .env
```

默认配置：

```dotenv
HOST=127.0.0.1
PORT=43175
DATA_DIR=./backend/data
```

运行数据、上传的参考图和生成图片会保存在 `DATA_DIR` 下。

## 常用命令

```bash
npm run dev                      # 开发模式运行前后端
npm run build                    # 构建前后端
npm run start                    # 启动生产服务
npm run test                     # 运行测试
npm run update:prompt-templates  # 更新内置 prompt 模板库
```

## 致谢

本项目在设计和功能上参考了：

- [academic-figure-generator](https://github.com/LigphiDonk/academic-figure-generator)
- [gpt-image-playground](https://github.com/alasano/gpt-image-playground)

内置 prompt 模板库来自：

- [awesome-gpt-image-2-prompts](https://github.com/EvoLinkAI/awesome-gpt-image-2-prompts)

该模板库通过 `git subtree` 引入到本仓库。

## License

见 [LICENSE](./LICENSE)。
