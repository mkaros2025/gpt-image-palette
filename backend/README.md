# Backend

Fastify API for PaperPalette.

## Scripts

```bash
npm run dev -w backend
npm run test -w backend
npm run build -w backend
npm run start -w backend
```

## Runtime data

- SQLite database: `DATA_DIR/app.db`
- Reference images: `DATA_DIR/workspace/reference-images/`
- Generated images: `DATA_DIR/generated-images/`

## Environment

- `HOST`
- `PORT` (default: `43175`)
- `DATA_DIR`

## Notes

- The backend owns settings persistence.
- The backend owns the draft workspace state.
- The backend owns generation history and file storage.
