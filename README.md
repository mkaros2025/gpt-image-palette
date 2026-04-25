# GPT Image Palette

English | [中文](./README.zh-CN.md)

GPT Image Palette is a local image-generation workspace for `gpt-image-2` compatible services. It gives you a clean web UI for writing prompts, using prompt templates, uploading reference images, applying color palettes, generating images, and managing history.

## What It Does

- Write and reuse image prompts in a focused generation workspace.
- Browse and apply bundled prompt templates from `awesome-gpt-image-2-prompts`.
- Upload multiple reference images for image-to-image generation.
- Choose image size, quality, output count, and optional color palettes.
- Preview the latest result and review recent outputs.
- Manage generated image history with search, detail view, download, delete, and reuse.
- Save your API base URL and API key from the settings page into `.env`.

## Requirements

- Node.js 22.12 or newer
- npm
- A compatible image API key

## Run

Clone the repository:

```bash
git clone --recurse-submodules https://github.com/mkaros2025/gpt-image-palette.git
cd gpt-image-palette
```

Install dependencies:

```bash
nvm use
npm install
```

`package-lock.json` is committed on purpose. Do not commit `node_modules/`, and do not copy one machine's `node_modules/` directory to another machine.

Build and start the app:

```bash
npm run build
npm run start
```

If needed, create a `.env` file first:

```bash
cp .env.example .env
```

Default values:

```dotenv
HOST=127.0.0.1
PORT=43175
DATA_DIR=./data
IMAGE_API_BASE_URL=
IMAGE_API_KEY=
```

Open:

```text
http://127.0.0.1:43175
```

Then open the Settings page and save your API base URL and API key into `.env`.

Runtime data, uploaded reference images, and generated images are stored under `DATA_DIR`.

## Troubleshooting

If `npm install` or `npm run dev` fails with a missing platform package such as `@rollup/rollup-darwin-arm64`, rebuild the lockfile and dependencies with the repo's Node/npm version:

```bash
rm -rf node_modules package-lock.json
npm install
```

## Acknowledgements

This project takes inspiration from:

- [academic-figure-generator](https://github.com/LigphiDonk/academic-figure-generator)
- [gpt-image-playground](https://github.com/alasano/gpt-image-playground)

The bundled prompt template library is sourced from:

- [awesome-gpt-image-2-prompts](https://github.com/EvoLinkAI/awesome-gpt-image-2-prompts)

It is tracked as a Git submodule for upstream updates.

## License

See [LICENSE](./LICENSE).
