# Backend

Fastify backend for gpt-image-palette. It owns settings, workspace drafts, palette persistence, generation calls, history, generated files, and production frontend static serving.

## Scripts

```bash
npm run dev -w backend
npm run test -w backend
npm run build -w backend
npm run start -w backend
```

## Runtime Data

- SQLite database: `DATA_DIR/app.db`
- Reference images: `DATA_DIR/workspace/reference-images/`
- Generated images: `DATA_DIR/generated-images/`
- Default local directory: `backend/data/`

## Environment

- `HOST`
- `PORT`，默认 `43175`
- `DATA_DIR`

## Notes

- Production serving is single-process: run root `npm run build`, then root `npm run start`.
- The frontend development server proxies API and data requests to the backend.
