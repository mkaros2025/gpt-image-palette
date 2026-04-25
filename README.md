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
- Save your API base URL and API key in the settings page.

## Requirements

- Node.js 22 or newer
- npm
- A compatible image API key

## Development

Install dependencies:

```bash
npm install
```

Start the app:

```bash
npm run dev
```

Open:

```text
http://127.0.0.1:43174
```

The backend runs on:

```text
http://127.0.0.1:43175
```

Then open the Settings page and fill in your API base URL and API key.

## Production Deployment

Build the app:

```bash
npm run build
```

Start the production server:

```bash
npm run start
```

In production, the backend serves both the API and the built frontend.

## Configuration

You can copy the example environment file:

```bash
cp .env.example .env
```

Default values:

```dotenv
HOST=127.0.0.1
PORT=43175
DATA_DIR=./backend/data
```

Runtime data, uploaded reference images, and generated images are stored under `DATA_DIR`.

## Useful Commands

```bash
npm run dev                      # run frontend and backend in development mode
npm run build                    # build frontend and backend
npm run start                    # start production server
npm run test                     # run tests
npm run update:prompt-templates  # update bundled prompt templates
```

## Acknowledgements

This project takes inspiration from:

- [academic-figure-generator](https://github.com/LigphiDonk/academic-figure-generator)
- [gpt-image-playground](https://github.com/alasano/gpt-image-playground)

The bundled prompt template library is sourced from:

- [awesome-gpt-image-2-prompts](https://github.com/EvoLinkAI/awesome-gpt-image-2-prompts)

It is imported into this repository with `git subtree`.

## License

See [LICENSE](./LICENSE).
