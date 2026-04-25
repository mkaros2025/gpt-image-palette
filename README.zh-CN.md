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
- 在设置页把 API base URL 和 API Key 保存到 `.env`。

## 环境要求

- Node.js 22 或更高版本
- npm
- 一个可用的图片 API Key

## 运行

克隆仓库：

```bash
git clone --recurse-submodules https://github.com/mkaros2025/gpt-image-palette.git
cd gpt-image-palette
```

安装依赖：

```bash
npm install
```

构建并启动应用：

```bash
npm run build
npm run start
```

如有需要，可以先创建 `.env`：

```bash
cp .env.example .env
```

默认配置：

```dotenv
HOST=127.0.0.1
PORT=43175
DATA_DIR=./data
IMAGE_API_BASE_URL=
IMAGE_API_KEY=
```

打开：

```text
http://127.0.0.1:43175
```

进入应用后，打开设置页，把 API base URL 和 API Key 保存到 `.env`。

运行数据、上传的参考图和生成图片会保存在 `DATA_DIR` 下。

## 致谢

本项目在设计和功能上参考了：

- [academic-figure-generator](https://github.com/LigphiDonk/academic-figure-generator)
- [gpt-image-playground](https://github.com/alasano/gpt-image-playground)

内置 prompt 模板库来自：

- [awesome-gpt-image-2-prompts](https://github.com/EvoLinkAI/awesome-gpt-image-2-prompts)

该模板库通过 Git submodule 跟踪上游更新。

## License

见 [LICENSE](./LICENSE)。
