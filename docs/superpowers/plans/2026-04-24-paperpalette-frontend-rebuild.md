# PaperPalette Frontend Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild PaperPalette as a React + Vite + TypeScript frontend served by the existing Fastify backend, with a quiet four-page UI for generation, history, palette management, and settings.

**Architecture:** Keep Fastify as the single production service. Recreate `frontend/` as a Vite SPA for development, then restore Fastify static serving so `npm run build && npm run start` serves both API and frontend. Add backend support for persistent custom palettes and manual connection testing before wiring the UI to those APIs.

**Tech Stack:** Node.js 22+, TypeScript, Fastify, SQLite via `better-sqlite3`, React 19, Vite, Vitest, jsdom, npm workspaces, plain CSS.

---

## File Structure

Backend files:

- Modify `backend/src/db/schema.sql`: add persistent palette tables.
- Create `backend/src/repositories/paletteRepo.ts`: combine built-in presets with custom palettes and default selection.
- Modify `backend/src/lib/colorSchemes.ts`: define the fixed 8-slot schema and helper validators.
- Modify `backend/src/routes/colorSchemes.ts`: expose palette list/create/copy/rename/update/delete/default routes.
- Modify `backend/src/services/gatewayClient.ts`: add `testConnection()`.
- Modify `backend/src/routes/settings.ts`: add manual connection test route.
- Create `backend/src/plugins/staticAssets.ts`: serve the built frontend and SPA fallback.
- Modify `backend/src/app.ts`: accept `staticDir` again and register static frontend assets after API routes.
- Modify `backend/src/server.ts`: discover `../frontend/dist` in production.
- Create `backend/test/palettes.test.ts`: verify custom palette persistence and fixed slot validation.
- Create `backend/test/settings-connection.test.ts`: verify manual connection test behavior with injected fake gateway.

Frontend files:

- Create `frontend/package.json`: React/Vite workspace package.
- Create `frontend/index.html`: SPA host document.
- Create `frontend/vite.config.ts`: React plugin, alias, proxy `/api` and `/data` to Fastify.
- Create `frontend/tsconfig.json`, `frontend/tsconfig.app.json`, `frontend/tsconfig.node.json`: strict TypeScript config.
- Create `frontend/src/main.tsx`: React entry.
- Create `frontend/src/App.tsx`: shell, route state, data hydration, page switching.
- Create `frontend/src/styles.css`: quiet publication workbench styling.
- Create `frontend/src/lib/api.ts`: typed fetch wrapper.
- Create `frontend/src/lib/types.ts`: shared frontend API types.
- Create `frontend/src/lib/navigation.ts`: four-page nav definitions.
- Create `frontend/src/lib/workspacePayload.ts`: payload normalization for workspace/generation.
- Create `frontend/src/lib/paletteSlots.ts`: fixed 8-slot frontend palette contract.
- Create `frontend/src/components/AppShell.tsx`: lightweight top navigation and page container.
- Create `frontend/src/components/GeneratePage.tsx`: generation form, task status, latest image, recent gallery.
- Create `frontend/src/components/HistoryPage.tsx`: history table optimized for parameter reuse.
- Create `frontend/src/components/PalettesPage.tsx`: fixed 8-slot palette management.
- Create `frontend/src/components/SettingsPage.tsx`: baseURL/API key save and test connection.
- Create `frontend/src/components/ResultDetailDialog.tsx`: lightweight image detail view.
- Create `frontend/test/*.test.tsx`: focused tests for navigation, payloads, generation UI, history reuse, palettes, and settings.

Root files:

- Modify `package.json`: add `frontend` workspace and root scripts for backend + frontend build/test/dev.
- Modify `package-lock.json`: regenerate after workspace and dependency changes.
- Modify `README.md`: describe the restored frontend and single-service production deployment.

---

### Task 1: Backend Palette Persistence

**Files:**
- Modify: `backend/src/db/schema.sql`
- Modify: `backend/src/lib/colorSchemes.ts`
- Create: `backend/src/repositories/paletteRepo.ts`
- Modify: `backend/src/routes/colorSchemes.ts`
- Modify: `backend/src/app.ts`
- Create: `backend/test/palettes.test.ts`

- [ ] **Step 1: Write the failing test**

Create `backend/test/palettes.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { buildApp } from '../src/app';

const fullPalette = {
  primary: '#111111',
  secondary: '#222222',
  tertiary: '#333333',
  text: '#444444',
  fill: '#ffffff',
  section_bg: '#f5f5f5',
  border: '#cccccc',
  arrow: '#555555',
};

describe('palette persistence', () => {
  it('creates, edits, defaults, and persists custom palettes', async () => {
    const dataDir = mkdtempSync(join(tmpdir(), 'paperpalette-palettes-'));

    const first = await buildApp({ dataDir });
    const created = await first.inject({
      method: 'POST',
      url: '/api/color-schemes',
      payload: {
        name: 'Journal Figure',
        colors: fullPalette,
      },
    });

    expect(created.statusCode).toBe(201);
    const createdBody = created.json() as { id: string; isPreset: boolean };
    expect(createdBody.id).toMatch(/^custom-/);
    expect(createdBody.isPreset).toBe(false);

    const renamed = await first.inject({
      method: 'PATCH',
      url: `/api/color-schemes/${createdBody.id}`,
      payload: {
        name: 'Journal Figure Revised',
        colors: {
          ...fullPalette,
          primary: '#123456',
        },
      },
    });
    expect(renamed.statusCode).toBe(200);

    const defaulted = await first.inject({
      method: 'PUT',
      url: `/api/color-schemes/${createdBody.id}/default`,
    });
    expect(defaulted.statusCode).toBe(200);

    await first.close();

    const second = await buildApp({ dataDir });
    const list = await second.inject({ method: 'GET', url: '/api/color-schemes' });
    const palettes = list.json() as Array<{ id: string; name: string; isDefault: boolean; colors: Record<string, string> }>;
    const custom = palettes.find((palette) => palette.id === createdBody.id);

    expect(custom).toMatchObject({
      name: 'Journal Figure Revised',
      isDefault: true,
    });
    expect(custom?.colors.primary).toBe('#123456');

    await second.close();
  });

  it('rejects palettes that do not match the fixed 8-slot schema', async () => {
    const dataDir = mkdtempSync(join(tmpdir(), 'paperpalette-palettes-invalid-'));
    const app = await buildApp({ dataDir });

    const response = await app.inject({
      method: 'POST',
      url: '/api/color-schemes',
      payload: {
        name: 'Broken',
        colors: {
          primary: '#111111',
        },
      },
    });

    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it('copies a preset into an editable custom palette and deletes custom palettes only', async () => {
    const dataDir = mkdtempSync(join(tmpdir(), 'paperpalette-palettes-copy-'));
    const app = await buildApp({ dataDir });

    const copied = await app.inject({
      method: 'POST',
      url: '/api/color-schemes/preset-okabe-ito/copy',
      payload: { name: 'Okabe Copy' },
    });
    expect(copied.statusCode).toBe(201);
    const copiedBody = copied.json() as { id: string; colors: Record<string, string> };
    expect(copiedBody.id).toMatch(/^custom-/);
    expect(copiedBody.colors.primary).toBe('#0072B2');

    const deletePreset = await app.inject({
      method: 'DELETE',
      url: '/api/color-schemes/preset-okabe-ito',
    });
    expect(deletePreset.statusCode).toBe(400);

    const deleteCustom = await app.inject({
      method: 'DELETE',
      url: `/api/color-schemes/${copiedBody.id}`,
    });
    expect(deleteCustom.statusCode).toBe(200);

    await app.close();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm run test -w backend -- palettes.test.ts
```

Expected: FAIL because `POST /api/color-schemes`, palette copy, update, delete, and default routes do not exist.

- [ ] **Step 3: Write minimal implementation**

Update `backend/src/lib/colorSchemes.ts` to define the fixed slot contract:

```ts
export const COLOR_PALETTE_SLOTS = [
  'primary',
  'secondary',
  'tertiary',
  'text',
  'fill',
  'section_bg',
  'border',
  'arrow',
] as const;

export type ColorPaletteSlot = (typeof COLOR_PALETTE_SLOTS)[number];
export type ColorPalette = Record<ColorPaletteSlot, string>;

export type ColorSchemePreset = {
  id: string;
  name: string;
  description: string;
  colors: ColorPalette;
  isDefault: boolean;
  isPreset: true;
};

export function isCompleteColorPalette(input: unknown): input is ColorPalette {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return false;
  }

  const record = input as Record<string, unknown>;
  return COLOR_PALETTE_SLOTS.every((slot) => typeof record[slot] === 'string' && /^#[0-9a-fA-F]{6}$/.test(record[slot]));
}
```

Keep the existing three presets, but add `isPreset: true` to each preset object and type their `colors` as `ColorPalette`.

Append this helper:

```ts
export function findPreset(id: string) {
  return COLOR_SCHEME_PRESETS.find((preset) => preset.id === id)
    ?? COLOR_SCHEME_PRESETS.find((preset) => preset.isDefault)
    ?? COLOR_SCHEME_PRESETS[0];
}
```

Add tables to `backend/src/db/schema.sql` after the `workspace_state` insert:

```sql
CREATE TABLE IF NOT EXISTS custom_color_schemes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  colors_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS palette_preferences (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  default_color_scheme_id TEXT NOT NULL DEFAULT 'preset-okabe-ito',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO palette_preferences (id, default_color_scheme_id, updated_at)
VALUES (1, 'preset-okabe-ito', CURRENT_TIMESTAMP);
```

Create `backend/src/repositories/paletteRepo.ts`:

```ts
import { randomUUID } from 'node:crypto';

import type { SqliteDatabase } from '../db/client.js';
import {
  COLOR_SCHEME_PRESETS,
  type ColorPalette,
  isCompleteColorPalette,
} from '../lib/colorSchemes.js';

export type ColorScheme = {
  id: string;
  name: string;
  description: string;
  colors: ColorPalette;
  isDefault: boolean;
  isPreset: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

type CustomPaletteRow = {
  id: string;
  name: string;
  colorsJson: string;
  createdAt: string;
  updatedAt: string;
};

export function createPaletteRepo(db: SqliteDatabase) {
  const listCustomStatement = db.prepare(
    `SELECT id, name, colors_json AS colorsJson, created_at AS createdAt, updated_at AS updatedAt
     FROM custom_color_schemes
     ORDER BY updated_at DESC, name ASC`,
  );
  const getCustomStatement = db.prepare(
    `SELECT id, name, colors_json AS colorsJson, created_at AS createdAt, updated_at AS updatedAt
     FROM custom_color_schemes
     WHERE id = ?`,
  );
  const insertCustomStatement = db.prepare(
    `INSERT INTO custom_color_schemes (id, name, colors_json, created_at, updated_at)
     VALUES (@id, @name, @colorsJson, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
  );
  const updateCustomStatement = db.prepare(
    `UPDATE custom_color_schemes
     SET name = @name,
         colors_json = @colorsJson,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = @id`,
  );
  const deleteCustomStatement = db.prepare(
    `DELETE FROM custom_color_schemes
     WHERE id = ?`,
  );
  const getDefaultStatement = db.prepare(
    `SELECT default_color_scheme_id AS defaultColorSchemeId
     FROM palette_preferences
     WHERE id = 1`,
  );
  const setDefaultStatement = db.prepare(
    `INSERT INTO palette_preferences (id, default_color_scheme_id, updated_at)
     VALUES (1, @id, CURRENT_TIMESTAMP)
     ON CONFLICT(id) DO UPDATE SET
       default_color_scheme_id = excluded.default_color_scheme_id,
       updated_at = CURRENT_TIMESTAMP`,
  );

  function getDefaultId() {
    const row = getDefaultStatement.get() as { defaultColorSchemeId: string } | undefined;
    return row?.defaultColorSchemeId ?? 'preset-okabe-ito';
  }

  function listColorSchemes(): ColorScheme[] {
    const defaultId = getDefaultId();
    return [
      ...COLOR_SCHEME_PRESETS.map((preset) => ({
        ...preset,
        isDefault: preset.id === defaultId,
        createdAt: null,
        updatedAt: null,
      })),
      ...(listCustomStatement.all() as CustomPaletteRow[]).map((row) => rowToColorScheme(row, defaultId)),
    ];
  }

  function getColorScheme(id: string): ColorScheme | null {
    const preset = COLOR_SCHEME_PRESETS.find((item) => item.id === id);
    const defaultId = getDefaultId();
    if (preset) {
      return {
        ...preset,
        isDefault: preset.id === defaultId,
        createdAt: null,
        updatedAt: null,
      };
    }

    const custom = getCustomStatement.get(id) as CustomPaletteRow | undefined;
    return custom ? rowToColorScheme(custom, defaultId) : null;
  }

  function createColorScheme(input: { name: string; colors: ColorPalette }) {
    const id = `custom-${randomUUID()}`;
    insertCustomStatement.run({
      id,
      name: input.name.trim(),
      colorsJson: JSON.stringify(input.colors),
    });
    return getColorScheme(id)!;
  }

  function copyColorScheme(sourceId: string, name: string) {
    const source = getColorScheme(sourceId);
    if (!source) {
      return null;
    }
    return createColorScheme({
      name: name.trim(),
      colors: source.colors,
    });
  }

  function updateColorScheme(id: string, input: { name: string; colors: ColorPalette }) {
    if (COLOR_SCHEME_PRESETS.some((preset) => preset.id === id)) {
      return { kind: 'preset' as const };
    }
    if (!getCustomStatement.get(id)) {
      return { kind: 'missing' as const };
    }
    updateCustomStatement.run({
      id,
      name: input.name.trim(),
      colorsJson: JSON.stringify(input.colors),
    });
    return { kind: 'updated' as const, palette: getColorScheme(id)! };
  }

  function deleteColorScheme(id: string) {
    if (COLOR_SCHEME_PRESETS.some((preset) => preset.id === id)) {
      return { kind: 'preset' as const };
    }
    deleteCustomStatement.run(id);
    if (getDefaultId() === id) {
      setDefaultStatement.run({ id: 'preset-okabe-ito' });
    }
    return { kind: 'deleted' as const };
  }

  function setDefaultColorScheme(id: string) {
    const palette = getColorScheme(id);
    if (!palette) {
      return null;
    }
    setDefaultStatement.run({ id });
    return getColorScheme(id)!;
  }

  return {
    listColorSchemes,
    getColorScheme,
    createColorScheme,
    copyColorScheme,
    updateColorScheme,
    deleteColorScheme,
    setDefaultColorScheme,
  };
}

function rowToColorScheme(row: CustomPaletteRow, defaultId: string): ColorScheme {
  const parsed = JSON.parse(row.colorsJson) as unknown;
  if (!isCompleteColorPalette(parsed)) {
    throw new Error(`Invalid stored color palette: ${row.id}`);
  }

  return {
    id: row.id,
    name: row.name,
    description: '自定义配色',
    colors: parsed,
    isDefault: row.id === defaultId,
    isPreset: false,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
```

Replace `backend/src/routes/colorSchemes.ts`:

```ts
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import type { SqliteDatabase } from '../db/client.js';
import { COLOR_PALETTE_SLOTS } from '../lib/colorSchemes.js';
import { createPaletteRepo } from '../repositories/paletteRepo.js';

const colorValueSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const paletteColorsSchema = z.object(
  Object.fromEntries(COLOR_PALETTE_SLOTS.map((slot) => [slot, colorValueSchema])) as Record<
    (typeof COLOR_PALETTE_SLOTS)[number],
    typeof colorValueSchema
  >,
).strict();

const createPaletteSchema = z.object({
  name: z.string().trim().min(1),
  colors: paletteColorsSchema,
});

const copyPaletteSchema = z.object({
  name: z.string().trim().min(1),
});

export function registerColorSchemeRoutes(app: FastifyInstance, db: SqliteDatabase) {
  const repo = createPaletteRepo(db);

  app.get('/api/color-schemes', async () => repo.listColorSchemes());

  app.post('/api/color-schemes', async (request, reply) => {
    const input = createPaletteSchema.parse(request.body);
    return reply.code(201).send(repo.createColorScheme(input));
  });

  app.post('/api/color-schemes/:id/copy', async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = copyPaletteSchema.parse(request.body);
    const palette = repo.copyColorScheme(id, input.name);
    if (!palette) {
      return reply.code(404).send({ message: 'Palette not found.' });
    }
    return reply.code(201).send(palette);
  });

  app.patch('/api/color-schemes/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = createPaletteSchema.parse(request.body);
    const result = repo.updateColorScheme(id, input);
    if (result.kind === 'preset') {
      return reply.code(400).send({ message: 'Preset palettes cannot be edited.' });
    }
    if (result.kind === 'missing') {
      return reply.code(404).send({ message: 'Palette not found.' });
    }
    return result.palette;
  });

  app.delete('/api/color-schemes/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = repo.deleteColorScheme(id);
    if (result.kind === 'preset') {
      return reply.code(400).send({ message: 'Preset palettes cannot be deleted.' });
    }
    return { ok: true };
  });

  app.put('/api/color-schemes/:id/default', async (request, reply) => {
    const { id } = request.params as { id: string };
    const palette = repo.setDefaultColorScheme(id);
    if (!palette) {
      return reply.code(404).send({ message: 'Palette not found.' });
    }
    return palette;
  });
}
```

Update `backend/src/app.ts` route registration:

```ts
registerColorSchemeRoutes(app, db);
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm run test -w backend -- palettes.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add .
git commit -m "feat: add persistent palette management"
```

---

### Task 2: Settings Connection Test and Production Static Serving

**Files:**
- Modify: `backend/src/services/gatewayClient.ts`
- Modify: `backend/src/routes/settings.ts`
- Modify: `backend/src/app.ts`
- Modify: `backend/src/server.ts`
- Create: `backend/src/plugins/staticAssets.ts`
- Create: `backend/test/settings-connection.test.ts`

- [ ] **Step 1: Write the failing test**

Create `backend/test/settings-connection.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { buildApp } from '../src/app';

describe('settings connection test', () => {
  it('tests the saved gateway settings on demand', async () => {
    const dataDir = mkdtempSync(join(tmpdir(), 'paperpalette-settings-test-'));
    const app = await buildApp({
      dataDir,
      gateway: {
        async generateImage() {
          throw new Error('not used');
        },
        async editImage() {
          throw new Error('not used');
        },
        async testConnection(input) {
          expect(input).toEqual({
            baseUrl: 'http://example.test',
            apiKey: 'sk-test',
          });
          return { ok: true };
        },
      },
    });

    await app.inject({
      method: 'PUT',
      url: '/api/settings',
      payload: {
        baseUrl: 'http://example.test',
        apiKey: 'sk-test',
      },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/settings/test-connection',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });

    await app.close();
  });

  it('returns a concise failure response when the gateway rejects the configuration', async () => {
    const dataDir = mkdtempSync(join(tmpdir(), 'paperpalette-settings-test-fail-'));
    const app = await buildApp({
      dataDir,
      gateway: {
        async generateImage() {
          throw new Error('not used');
        },
        async editImage() {
          throw new Error('not used');
        },
        async testConnection() {
          throw new Error('Gateway HTTP 401: invalid key');
        },
      },
    });

    await app.inject({
      method: 'PUT',
      url: '/api/settings',
      payload: {
        baseUrl: 'http://example.test',
        apiKey: 'bad-key',
      },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/settings/test-connection',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      ok: false,
      message: 'Gateway HTTP 401: invalid key',
    });

    await app.close();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm run test -w backend -- settings-connection.test.ts
```

Expected: FAIL because `buildApp` does not accept an injected gateway and `/api/settings/test-connection` does not exist.

- [ ] **Step 3: Write minimal implementation**

Update `backend/src/services/gatewayClient.ts` return object:

```ts
return {
  async generateImage(input: GatewayGenerateInput): Promise<GatewayImageResult> {
    const payload = await postJson(input.baseUrl, input.apiKey, '/images/generations', {
      model: input.model ?? defaultModel,
      prompt: input.prompt,
      n: 1,
      size: input.size,
      quality: input.quality,
    });
    return coerceGatewayResult(payload, input.size);
  },
  async editImage(input: GatewayEditInput): Promise<GatewayImageResult> {
    const formData = new FormData();
    formData.append('model', input.model ?? defaultModel);
    formData.append('prompt', input.prompt);
    formData.append('n', '1');
    formData.append('size', input.size);
    formData.append('quality', input.quality);
    const blob = new Blob([input.referenceImageBytes], {
      type: input.referenceImageMimeType || 'image/png',
    });
    formData.append('image', blob, input.referenceImageName || 'reference.png');

    const payload = await postFormData(input.baseUrl, input.apiKey, '/images/edits', formData);
    return coerceGatewayResult(payload, input.size);
  },
  async testConnection(input: { baseUrl: string; apiKey: string }) {
    const response = await fetch(resolveEndpoint(input.baseUrl, '/models'), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        Accept: 'application/json',
      },
    });
    await readGatewayResponse(response);
    return { ok: true };
  },
};
```

Update `backend/src/app.ts` option type and gateway creation:

```ts
import type { GatewayClient } from './services/gatewayClient.js';

export type BuildAppOptions = {
  dataDir: string;
  staticDir?: string;
  logger?: boolean;
  gateway?: GatewayClient;
};

const gateway = options.gateway ?? createGatewayClient();
```

Update settings route registration in `backend/src/app.ts`:

```ts
registerSettingsRoutes(app, db, gateway);
```

Replace `backend/src/routes/settings.ts`:

```ts
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import type { SqliteDatabase } from '../db/client.js';
import { createSettingsRepo } from '../repositories/settingsRepo.js';
import type { GatewayClient } from '../services/gatewayClient.js';

const settingsSchema = z.object({
  baseUrl: z.string().trim().min(1),
  apiKey: z.string().trim().min(1),
});

export function registerSettingsRoutes(app: FastifyInstance, db: SqliteDatabase, gateway: GatewayClient) {
  const repo = createSettingsRepo(db);

  app.get('/api/settings', async () => repo.getSettings());

  app.put('/api/settings', async (request, reply) => {
    const input = settingsSchema.parse(request.body);
    const settings = repo.saveSettings(input);
    return reply.send(settings);
  });

  app.post('/api/settings/test-connection', async () => {
    const settings = repo.getSettings();
    try {
      await gateway.testConnection({
        baseUrl: settings.baseUrl,
        apiKey: settings.apiKey,
      });
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  });
}
```

Create `backend/src/plugins/staticAssets.ts`:

```ts
import fastifyStatic from '@fastify/static';
import type { FastifyInstance } from 'fastify';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export async function registerStaticAssets(app: FastifyInstance, rootDir: string) {
  if (!existsSync(join(rootDir, 'index.html'))) {
    return;
  }

  await app.register(fastifyStatic, {
    root: rootDir,
    prefix: '/',
    decorateReply: false,
  });

  app.setNotFoundHandler((request, reply) => {
    const url = request.raw.url ?? '';
    const pathname = url.split('?', 1)[0];

    if (pathname.startsWith('/api/') || pathname.startsWith('/data/')) {
      reply.code(404).send({ message: 'Not Found' });
      return;
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      reply.code(404).send({ message: 'Not Found' });
      return;
    }

    if (pathname.includes('.')) {
      reply.code(404).send({ message: 'Not Found' });
      return;
    }

    reply.sendFile('index.html');
  });
}
```

Update `backend/src/app.ts` after API route registration:

```ts
if (options.staticDir) {
  const { registerStaticAssets } = await import('./plugins/staticAssets.js');
  await registerStaticAssets(app, options.staticDir);
}
```

Update `backend/src/server.ts`:

```ts
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildApp } from './app.js';
import { env } from './config/env.js';

const moduleDir = dirname(fileURLToPath(import.meta.url));
const backendRoot = resolve(moduleDir, '..');
const dataDir = resolve(backendRoot, env.DATA_DIR);
const frontendDistDir = resolve(backendRoot, '../frontend/dist');
const staticDir = existsSync(join(frontendDistDir, 'index.html')) ? frontendDistDir : undefined;

const app = await buildApp({
  dataDir,
  staticDir,
  logger: true,
});

await app.listen({
  host: env.HOST,
  port: env.PORT,
});

app.log.info(`Server listening on ${env.HOST}:${env.PORT}`);
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm run test -w backend -- settings-connection.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add .
git commit -m "feat: add settings connection test"
```

---

### Task 3: Frontend Workspace Bootstrap

**Files:**
- Modify: `package.json`
- Create: `frontend/package.json`
- Create: `frontend/index.html`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tsconfig.app.json`
- Create: `frontend/tsconfig.node.json`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/styles.css`
- Create: `frontend/src/lib/navigation.ts`
- Create: `frontend/test/navigation.test.ts`
- Modify: `package-lock.json`

- [ ] **Step 1: Write the failing test**

Create `frontend/test/navigation.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { NAV_ITEMS, normalizePageId } from '../src/lib/navigation';

describe('navigation model', () => {
  it('exposes the four confirmed pages in order', () => {
    expect(NAV_ITEMS.map((item) => item.id)).toEqual(['generate', 'history', 'palettes', 'settings']);
    expect(NAV_ITEMS.map((item) => item.label)).toEqual(['生成', '历史', '配色', '设置']);
  });

  it('normalizes unknown pages to generate', () => {
    expect(normalizePageId('history')).toBe('history');
    expect(normalizePageId('unknown')).toBe('generate');
    expect(normalizePageId(null)).toBe('generate');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm run test -w frontend -- navigation.test.ts
```

Expected: FAIL because the `frontend` workspace does not exist.

- [ ] **Step 3: Write minimal implementation**

Update root `package.json`:

```json
{
  "name": "paperpalette",
  "private": true,
  "version": "0.3.0",
  "description": "PaperPalette: Fastify image generation app",
  "workspaces": [
    "backend",
    "frontend"
  ],
  "scripts": {
    "dev": "concurrently -n backend,frontend -c cyan,magenta \"npm run dev -w backend\" \"npm run dev -w frontend\"",
    "build": "npm run build -w backend && npm run build -w frontend",
    "start": "npm run start -w backend",
    "test": "npm run test -w backend && npm run test -w frontend"
  },
  "devDependencies": {
    "concurrently": "^9.2.1"
  },
  "engines": {
    "node": ">=22"
  }
}
```

Create `frontend/package.json`:

```json
{
  "name": "frontend",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite --host 127.0.0.1 --port 43174 --strictPort",
    "build": "tsc -b && vite build",
    "test": "vitest run",
    "typecheck": "tsc -b --pretty false"
  },
  "dependencies": {
    "@vitejs/plugin-react": "^5.1.1",
    "vite": "^7.3.2",
    "typescript": "^5.9.3",
    "react": "^19.2.0",
    "react-dom": "^19.2.0"
  },
  "devDependencies": {
    "@types/node": "^24.11.0",
    "@types/react": "^19.2.7",
    "@types/react-dom": "^19.2.3",
    "jsdom": "^27.2.0",
    "vitest": "^3.2.4"
  }
}
```

Create `frontend/vite.config.ts`:

```ts
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');
  const backendOrigin = env.VITE_BACKEND_ORIGIN || 'http://127.0.0.1:43175';

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    test: {
      environment: 'jsdom',
      globals: false,
    },
    server: {
      host: '127.0.0.1',
      port: 43174,
      strictPort: true,
      proxy: {
        '/api': {
          target: backendOrigin,
          changeOrigin: true,
        },
        '/data': {
          target: backendOrigin,
          changeOrigin: true,
        },
      },
    },
  };
});
```

Create `frontend/tsconfig.json`:

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

Create `frontend/tsconfig.app.json`:

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src", "test"]
}
```

Create `frontend/tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "ES2023",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "Bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "noEmit": true
  },
  "include": ["vite.config.ts"]
}
```

Create `frontend/index.html`:

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>PaperPalette</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Create `frontend/src/lib/navigation.ts`:

```ts
export const NAV_ITEMS = [
  { id: 'generate', label: '生成' },
  { id: 'history', label: '历史' },
  { id: 'palettes', label: '配色' },
  { id: 'settings', label: '设置' },
] as const;

export type PageId = (typeof NAV_ITEMS)[number]['id'];

export function normalizePageId(value: string | null): PageId {
  return NAV_ITEMS.some((item) => item.id === value) ? (value as PageId) : 'generate';
}
```

Create `frontend/src/App.tsx`:

```tsx
import { useState } from 'react';

import { NAV_ITEMS, normalizePageId, type PageId } from './lib/navigation';
import './styles.css';

export function App() {
  const [page, setPage] = useState<PageId>(() => {
    if (typeof window === 'undefined') {
      return 'generate';
    }
    return normalizePageId(window.location.hash.replace('#/', ''));
  });

  const selectPage = (next: PageId) => {
    if (typeof window !== 'undefined') {
      window.location.hash = `/${next}`;
    }
    setPage(next);
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand-button" type="button" onClick={() => selectPage('generate')}>
          PaperPalette
        </button>
        <nav className="topnav" aria-label="主导航">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={item.id === page ? 'nav-link nav-link--active' : 'nav-link'}
              type="button"
              onClick={() => selectPage(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>
      <section className="page-frame">
        <p className="empty-state">页面待实现</p>
      </section>
    </main>
  );
}
```

Create `frontend/src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

Create `frontend/src/styles.css`:

```css
:root {
  color: #20201f;
  background: #fbfaf7;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans", Ubuntu, Arial, sans-serif;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
  background: #fbfaf7;
}

button,
input,
select,
textarea {
  font: inherit;
}

.app-shell {
  min-height: 100vh;
  padding: 18px 24px 28px;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  max-width: 1240px;
  margin: 0 auto 18px;
  border-bottom: 1px solid #dedbd2;
  padding-bottom: 10px;
}

.brand-button,
.nav-link {
  border: 0;
  background: transparent;
  color: #20201f;
  cursor: pointer;
}

.brand-button {
  padding: 0;
  font-weight: 650;
}

.topnav {
  display: flex;
  align-items: center;
  gap: 4px;
}

.nav-link {
  border-radius: 6px;
  padding: 6px 10px;
  color: #666259;
}

.nav-link--active {
  color: #20201f;
  background: #efede6;
}

.page-frame {
  max-width: 1240px;
  margin: 0 auto;
}

.empty-state {
  margin: 0;
  color: #777268;
}
```

Run:

```bash
npm install
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm run test -w frontend -- navigation.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add .
git commit -m "feat: bootstrap react frontend"
```

---

### Task 4: Frontend API Types, Payloads, and App Data Shell

**Files:**
- Create: `frontend/src/lib/types.ts`
- Create: `frontend/src/lib/api.ts`
- Create: `frontend/src/lib/workspacePayload.ts`
- Modify: `frontend/src/App.tsx`
- Create: `frontend/test/workspace-payload.test.ts`

- [ ] **Step 1: Write the failing test**

Create `frontend/test/workspace-payload.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { buildGenerationPayload, normalizeWorkspace } from '../src/lib/workspacePayload';

describe('workspace payload helpers', () => {
  it('normalizes empty workspace data without dropping user-editable fields', () => {
    const workspace = normalizeWorkspace({
      prompt: ' paper figure ',
      size: '',
      quality: '',
      colorSchemeId: '',
      customColors: null,
      count: 9,
      referenceImagePath: '/data/ref.png',
      referenceImageName: 'ref.png',
      referenceImageMimeType: 'image/png',
      updatedAt: 'now',
    });

    expect(workspace).toMatchObject({
      prompt: ' paper figure ',
      size: '1024x1024',
      quality: 'high',
      colorSchemeId: 'preset-okabe-ito',
      count: 4,
      referenceImagePath: '/data/ref.png',
    });
  });

  it('builds the generation payload expected by the backend', () => {
    const payload = buildGenerationPayload({
      prompt: 'cell diagram',
      size: '1536x1024',
      quality: 'medium',
      colorSchemeId: 'custom-a',
      customColors: null,
      count: 2,
      referenceImagePath: '/data/workspace/reference-images/a.png',
      referenceImageName: 'a.png',
      referenceImageMimeType: 'image/png',
      updatedAt: 'now',
    });

    expect(payload).toEqual({
      prompt: 'cell diagram',
      size: '1536x1024',
      quality: 'medium',
      colorSchemeId: 'custom-a',
      customColors: null,
      count: 2,
      referenceImagePath: '/data/workspace/reference-images/a.png',
      referenceImageName: 'a.png',
      referenceImageMimeType: 'image/png',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm run test -w frontend -- workspace-payload.test.ts
```

Expected: FAIL because `workspacePayload.ts` does not exist.

- [ ] **Step 3: Write minimal implementation**

Create `frontend/src/lib/types.ts`:

```ts
export type Settings = {
  baseUrl: string;
  apiKey: string;
  updatedAt: string;
};

export type PaletteColors = {
  primary: string;
  secondary: string;
  tertiary: string;
  text: string;
  fill: string;
  section_bg: string;
  border: string;
  arrow: string;
};

export type ColorScheme = {
  id: string;
  name: string;
  description: string;
  colors: PaletteColors;
  isDefault: boolean;
  isPreset: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

export type Workspace = {
  prompt: string;
  size: string;
  quality: string;
  colorSchemeId: string;
  customColors: PaletteColors | null;
  count: number;
  referenceImagePath: string | null;
  referenceImageName: string | null;
  referenceImageMimeType: string | null;
  updatedAt: string;
};

export type GenerationJob = {
  id: string;
  prompt: string;
  size: string;
  quality: string;
  colorSchemeId: string;
  count: number;
  status: string;
  completedCount: number;
  failedCount: number;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type HistoryItem = {
  id: string;
  jobId: string;
  prompt: string;
  size: string;
  quality: string;
  colorSchemeId: string;
  customColors: PaletteColors | null;
  referenceImagePath: string | null;
  imagePath: string | null;
  status: string;
  width: number | null;
  height: number | null;
  fileSize: number | null;
  errorMessage: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
  previewUrl: string | null;
  downloadUrl: string;
};
```

Create `frontend/src/lib/api.ts`:

```ts
const API_BASE = '/api';

export async function apiGet<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'GET' });
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: body instanceof FormData ? undefined : { 'Content-Type': 'application/json' },
    body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
  });
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
}

export async function apiDelete<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'DELETE' });
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: init.headers,
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = payload && typeof payload.message === 'string' ? payload.message : `Request failed: ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}
```

Create `frontend/src/lib/workspacePayload.ts`:

```ts
import type { Workspace } from './types';

export const DEFAULT_WORKSPACE: Workspace = {
  prompt: '',
  size: '1024x1024',
  quality: 'high',
  colorSchemeId: 'preset-okabe-ito',
  customColors: null,
  count: 1,
  referenceImagePath: null,
  referenceImageName: null,
  referenceImageMimeType: null,
  updatedAt: '',
};

export function normalizeWorkspace(input: Partial<Workspace> | null | undefined): Workspace {
  return {
    ...DEFAULT_WORKSPACE,
    ...(input ?? {}),
    size: input?.size || DEFAULT_WORKSPACE.size,
    quality: input?.quality || DEFAULT_WORKSPACE.quality,
    colorSchemeId: input?.colorSchemeId || DEFAULT_WORKSPACE.colorSchemeId,
    count: clampCount(input?.count ?? DEFAULT_WORKSPACE.count),
  };
}

export function buildWorkspacePayload(workspace: Workspace) {
  return {
    prompt: workspace.prompt,
    size: workspace.size,
    quality: workspace.quality,
    colorSchemeId: workspace.colorSchemeId,
    customColors: workspace.customColors,
    count: clampCount(workspace.count),
  };
}

export function buildGenerationPayload(workspace: Workspace) {
  return {
    ...buildWorkspacePayload(workspace),
    referenceImagePath: workspace.referenceImagePath,
    referenceImageName: workspace.referenceImageName,
    referenceImageMimeType: workspace.referenceImageMimeType,
  };
}

function clampCount(count: number) {
  return Math.min(4, Math.max(1, Math.trunc(count)));
}
```

Update `frontend/src/App.tsx` to hydrate settings, workspace, palettes, history, and active jobs at app level. Use `useState` for durable objects so page switching never resets them. The implementation should import `apiGet`, `normalizeWorkspace`, and the shared types, then load:

```ts
const [settings, setSettings] = useState<Settings>({ baseUrl: '', apiKey: '', updatedAt: '' });
const [workspace, setWorkspace] = useState<Workspace>(DEFAULT_WORKSPACE);
const [palettes, setPalettes] = useState<ColorScheme[]>([]);
const [history, setHistory] = useState<HistoryItem[]>([]);
const [activeJobs, setActiveJobs] = useState<GenerationJob[]>([]);
const [loadError, setLoadError] = useState<string | null>(null);

useEffect(() => {
  let active = true;
  Promise.all([
    apiGet<Settings>('/settings'),
    apiGet<Workspace>('/workspace'),
    apiGet<ColorScheme[]>('/color-schemes'),
    apiGet<HistoryItem[]>('/history'),
    apiGet<GenerationJob[]>('/generations/active'),
  ])
    .then(([nextSettings, nextWorkspace, nextPalettes, nextHistory, nextActiveJobs]) => {
      if (!active) return;
      setSettings(nextSettings);
      setWorkspace(normalizeWorkspace(nextWorkspace));
      setPalettes(nextPalettes);
      setHistory(nextHistory);
      setActiveJobs(nextActiveJobs);
    })
    .catch((error) => {
      if (!active) return;
      setLoadError(error instanceof Error ? error.message : String(error));
    });

  return () => {
    active = false;
  };
}, []);
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm run test -w frontend -- workspace-payload.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add .
git commit -m "feat: add frontend data shell"
```

---

### Task 5: Generate Page

**Files:**
- Create: `frontend/src/components/GeneratePage.tsx`
- Create: `frontend/src/components/ResultDetailDialog.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/styles.css`
- Create: `frontend/test/generate-page.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `frontend/test/generate-page.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { GeneratePage } from '../src/components/GeneratePage';
import { DEFAULT_WORKSPACE } from '../src/lib/workspacePayload';

const palette = {
  id: 'preset-okabe-ito',
  name: 'Okabe-Ito',
  description: '',
  isDefault: true,
  isPreset: true,
  createdAt: null,
  updatedAt: null,
  colors: {
    primary: '#0072B2',
    secondary: '#E69F00',
    tertiary: '#009E73',
    text: '#333333',
    fill: '#FFFFFF',
    section_bg: '#F7F7F7',
    border: '#CCCCCC',
    arrow: '#4D4D4D',
  },
};

describe('GeneratePage', () => {
  it('renders the confirmed left input column, right latest result column, and bottom gallery', () => {
    const html = renderToStaticMarkup(
      <GeneratePage
        settings={{ baseUrl: '', apiKey: '', updatedAt: '' }}
        workspace={DEFAULT_WORKSPACE}
        palettes={[palette]}
        activeJobs={[]}
        history={[]}
        onWorkspaceChange={() => {}}
        onSaveWorkspace={async () => {}}
        onUploadReferenceImage={async () => {}}
        onRemoveReferenceImage={async () => {}}
        onGenerate={async () => {}}
        onOpenSettings={() => {}}
        onRefreshHistory={async () => {}}
      />,
    );

    expect(html).toContain('Prompt');
    expect(html).toContain('参考图');
    expect(html).toContain('当前任务');
    expect(html).toContain('最近一次生成');
    expect(html).toContain('最近结果');
    expect(html).toContain('去设置');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm run test -w frontend -- generate-page.test.tsx
```

Expected: FAIL because `GeneratePage.tsx` does not exist.

- [ ] **Step 3: Write minimal implementation**

Create `frontend/src/components/ResultDetailDialog.tsx`:

```tsx
import type { HistoryItem } from '../lib/types';

type Props = {
  item: HistoryItem | null;
  onClose: () => void;
  onDelete: (id: string) => Promise<void>;
};

export function ResultDetailDialog({ item, onClose, onDelete }: Props) {
  if (!item) {
    return null;
  }

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <section className="result-dialog" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        {item.previewUrl ? <img src={item.previewUrl} alt="" className="result-dialog__image" /> : null}
        <div className="result-dialog__body">
          <h2>生成详情</h2>
          <dl className="detail-list">
            <dt>Prompt</dt>
            <dd>{item.prompt}</dd>
            <dt>尺寸</dt>
            <dd>{item.size}</dd>
            <dt>质量</dt>
            <dd>{item.quality}</dd>
            <dt>配色</dt>
            <dd>{item.colorSchemeId}</dd>
          </dl>
          <div className="button-row">
            <a className="quiet-button" href={item.downloadUrl}>下载</a>
            <button className="quiet-button danger-text" type="button" onClick={() => onDelete(item.id)}>删除</button>
            <button className="quiet-button" type="button" onClick={onClose}>关闭</button>
          </div>
        </div>
      </section>
    </div>
  );
}
```

Create `frontend/src/components/GeneratePage.tsx` with controlled inputs:

```tsx
import { useState } from 'react';

import type { ColorScheme, GenerationJob, HistoryItem, Settings, Workspace } from '../lib/types';
import { ResultDetailDialog } from './ResultDetailDialog';

type Props = {
  settings: Settings;
  workspace: Workspace;
  palettes: ColorScheme[];
  activeJobs: GenerationJob[];
  history: HistoryItem[];
  onWorkspaceChange: (next: Workspace) => void;
  onSaveWorkspace: () => Promise<void>;
  onUploadReferenceImage: (file: File) => Promise<void>;
  onRemoveReferenceImage: () => Promise<void>;
  onGenerate: () => Promise<void>;
  onOpenSettings: () => void;
  onRefreshHistory: () => Promise<void>;
};

export function GeneratePage(props: Props) {
  const [selectedResult, setSelectedResult] = useState<HistoryItem | null>(null);
  const missingSettings = !props.settings.baseUrl || !props.settings.apiKey;
  const latest = props.history[0] ?? null;
  const recent = props.history.slice(0, 12);

  return (
    <div className="generate-page">
      <section className="generate-grid">
        <form
          className="panel panel--input"
          onSubmit={(event) => {
            event.preventDefault();
            void props.onGenerate();
          }}
        >
          <label className="field field--stacked">
            <span>Prompt</span>
            <textarea
              className="prompt-input"
              value={props.workspace.prompt}
              onChange={(event) => props.onWorkspaceChange({ ...props.workspace, prompt: event.target.value })}
            />
          </label>

          <div className="form-grid">
            <label className="field">
              <span>尺寸</span>
              <select value={props.workspace.size} onChange={(event) => props.onWorkspaceChange({ ...props.workspace, size: event.target.value })}>
                <option value="1024x1024">1024x1024</option>
                <option value="1536x1024">1536x1024</option>
                <option value="1024x1536">1024x1536</option>
              </select>
            </label>
            <label className="field">
              <span>质量</span>
              <select value={props.workspace.quality} onChange={(event) => props.onWorkspaceChange({ ...props.workspace, quality: event.target.value })}>
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
              </select>
            </label>
            <label className="field">
              <span>数量</span>
              <input type="number" min={1} max={4} value={props.workspace.count} onChange={(event) => props.onWorkspaceChange({ ...props.workspace, count: Number(event.target.value) })} />
            </label>
            <label className="field">
              <span>配色</span>
              <select value={props.workspace.colorSchemeId} onChange={(event) => props.onWorkspaceChange({ ...props.workspace, colorSchemeId: event.target.value, customColors: null })}>
                {props.palettes.map((palette) => (
                  <option key={palette.id} value={palette.id}>{palette.name}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="reference-box">
            <span>参考图</span>
            {props.workspace.referenceImagePath ? (
              <div className="reference-preview">
                <img src={props.workspace.referenceImagePath} alt="" />
                <button className="quiet-button" type="button" onClick={() => void props.onRemoveReferenceImage()}>移除</button>
              </div>
            ) : (
              <input type="file" accept="image/*" onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                if (file) void props.onUploadReferenceImage(file);
              }} />
            )}
          </div>

          {missingSettings ? (
            <p className="inline-hint">缺少 baseURL 或 API Key。<button type="button" className="link-button" onClick={props.onOpenSettings}>去设置</button></p>
          ) : null}

          <button className="primary-button" type="submit" disabled={!props.workspace.prompt.trim() || missingSettings}>生成</button>
        </form>

        <aside className="panel panel--status">
          <h1>当前任务</h1>
          <p className="status-line">{props.activeJobs.length ? `${props.activeJobs.length} 个任务进行中` : '暂无任务'}</p>
          <h2>最近一次生成</h2>
          {latest?.previewUrl ? <img className="latest-image" src={latest.previewUrl} alt="" /> : <p className="empty-state">暂无结果</p>}
        </aside>
      </section>

      <section className="recent-gallery" aria-label="最近结果">
        <div className="section-heading">
          <h2>最近结果</h2>
        </div>
        <div className="gallery-strip">
          {recent.length ? recent.map((item) => (
            <button key={item.id} type="button" className="gallery-item" onClick={() => setSelectedResult(item)}>
              {item.previewUrl ? <img src={item.previewUrl} alt="" /> : <span>无预览</span>}
            </button>
          )) : <p className="empty-state">暂无结果</p>}
        </div>
      </section>

      <ResultDetailDialog item={selectedResult} onClose={() => setSelectedResult(null)} onDelete={async (id) => {
        await fetch(`/api/history/${id}`, { method: 'DELETE' });
        setSelectedResult(null);
        await props.onRefreshHistory();
      }} />
    </div>
  );
}
```

Update `frontend/src/App.tsx` to render `GeneratePage` for `page === 'generate'` and wire API handlers with `apiPut`, `apiPost`, `apiDelete`, `buildWorkspacePayload`, and `buildGenerationPayload`.

Add CSS classes used above to `frontend/src/styles.css`: `.generate-grid`, `.panel`, `.field`, `.prompt-input`, `.form-grid`, `.reference-box`, `.latest-image`, `.recent-gallery`, `.gallery-strip`, `.gallery-item`, `.dialog-backdrop`, `.result-dialog`, `.primary-button`, `.quiet-button`, `.link-button`, `.inline-hint`.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm run test -w frontend -- generate-page.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add .
git commit -m "feat: build generate page"
```

---

### Task 6: Settings Page

**Files:**
- Create: `frontend/src/components/SettingsPage.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/styles.css`
- Create: `frontend/test/settings-page.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `frontend/test/settings-page.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { SettingsPage } from '../src/components/SettingsPage';

describe('SettingsPage', () => {
  it('renders baseURL, full API key, save, and manual test controls', () => {
    const html = renderToStaticMarkup(
      <SettingsPage
        settings={{ baseUrl: 'http://localhost:43175', apiKey: 'sk-visible', updatedAt: '' }}
        status={null}
        onSettingsChange={() => {}}
        onSave={async () => {}}
        onTestConnection={async () => {}}
      />,
    );

    expect(html).toContain('baseURL');
    expect(html).toContain('API Key');
    expect(html).toContain('sk-visible');
    expect(html).toContain('保存');
    expect(html).toContain('测试连接');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm run test -w frontend -- settings-page.test.tsx
```

Expected: FAIL because `SettingsPage.tsx` does not exist.

- [ ] **Step 3: Write minimal implementation**

Create `frontend/src/components/SettingsPage.tsx`:

```tsx
import type { Settings } from '../lib/types';

type Props = {
  settings: Settings;
  status: string | null;
  onSettingsChange: (next: Settings) => void;
  onSave: () => Promise<void>;
  onTestConnection: () => Promise<void>;
};

export function SettingsPage({ settings, status, onSettingsChange, onSave, onTestConnection }: Props) {
  return (
    <section className="settings-page narrow-page">
      <div className="section-heading">
        <h1>设置</h1>
      </div>
      <form className="panel settings-form" onSubmit={(event) => {
        event.preventDefault();
        void onSave();
      }}>
        <label className="field field--stacked">
          <span>baseURL</span>
          <input value={settings.baseUrl} onChange={(event) => onSettingsChange({ ...settings, baseUrl: event.target.value })} />
        </label>
        <label className="field field--stacked">
          <span>API Key</span>
          <input value={settings.apiKey} onChange={(event) => onSettingsChange({ ...settings, apiKey: event.target.value })} />
        </label>
        {status ? <p className="inline-status">{status}</p> : null}
        <div className="button-row">
          <button className="primary-button" type="submit">保存</button>
          <button className="quiet-button" type="button" onClick={() => void onTestConnection()}>测试连接</button>
        </div>
      </form>
    </section>
  );
}
```

Update `frontend/src/App.tsx` to render `SettingsPage` and wire:

```ts
const [settingsStatus, setSettingsStatus] = useState<string | null>(null);

const saveSettings = async () => {
  const saved = await apiPut<Settings>('/settings', {
    baseUrl: settings.baseUrl,
    apiKey: settings.apiKey,
  });
  setSettings(saved);
  setSettingsStatus('已保存');
};

const testConnection = async () => {
  const result = await apiPost<{ ok: boolean; message?: string }>('/settings/test-connection');
  setSettingsStatus(result.ok ? '连接成功' : result.message ?? '连接失败');
};
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm run test -w frontend -- settings-page.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add .
git commit -m "feat: build settings page"
```

---

### Task 7: Palettes Page

**Files:**
- Create: `frontend/src/lib/paletteSlots.ts`
- Create: `frontend/src/components/PalettesPage.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/styles.css`
- Create: `frontend/test/palettes-page.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `frontend/test/palettes-page.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { PalettesPage } from '../src/components/PalettesPage';
import { PALETTE_SLOTS } from '../src/lib/paletteSlots';

const palette = {
  id: 'custom-a',
  name: 'Custom A',
  description: '自定义配色',
  isDefault: true,
  isPreset: false,
  createdAt: null,
  updatedAt: null,
  colors: {
    primary: '#111111',
    secondary: '#222222',
    tertiary: '#333333',
    text: '#444444',
    fill: '#ffffff',
    section_bg: '#f5f5f5',
    border: '#cccccc',
    arrow: '#555555',
  },
};

describe('PalettesPage', () => {
  it('renders fixed 8-slot palette editing controls', () => {
    const html = renderToStaticMarkup(
      <PalettesPage
        palettes={[palette]}
        selectedId="custom-a"
        onSelect={() => {}}
        onCreate={async () => {}}
        onCopy={async () => {}}
        onSave={async () => {}}
        onDelete={async () => {}}
        onSetDefault={async () => {}}
      />,
    );

    for (const slot of PALETTE_SLOTS) {
      expect(html).toContain(slot);
    }
    expect(html).toContain('设为默认');
    expect(html).toContain('保存配色');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm run test -w frontend -- palettes-page.test.tsx
```

Expected: FAIL because `PalettesPage.tsx` and `paletteSlots.ts` do not exist.

- [ ] **Step 3: Write minimal implementation**

Create `frontend/src/lib/paletteSlots.ts`:

```ts
export const PALETTE_SLOTS = [
  'primary',
  'secondary',
  'tertiary',
  'text',
  'fill',
  'section_bg',
  'border',
  'arrow',
] as const;
```

Create `frontend/src/components/PalettesPage.tsx` with:

```tsx
import { useEffect, useState } from 'react';

import { PALETTE_SLOTS } from '../lib/paletteSlots';
import type { ColorScheme, PaletteColors } from '../lib/types';

type Props = {
  palettes: ColorScheme[];
  selectedId: string;
  onSelect: (id: string) => void;
  onCreate: (name: string, colors: PaletteColors) => Promise<void>;
  onCopy: (id: string, name: string) => Promise<void>;
  onSave: (id: string, name: string, colors: PaletteColors) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onSetDefault: (id: string) => Promise<void>;
};

export function PalettesPage(props: Props) {
  const selected = props.palettes.find((palette) => palette.id === props.selectedId) ?? props.palettes[0] ?? null;
  const [name, setName] = useState(selected?.name ?? '');
  const [colors, setColors] = useState<PaletteColors | null>(selected?.colors ?? null);

  useEffect(() => {
    setName(selected?.name ?? '');
    setColors(selected?.colors ?? null);
  }, [selected?.id]);

  if (!selected || !colors) {
    return <p className="empty-state">暂无配色</p>;
  }

  return (
    <section className="palette-page split-page">
      <aside className="panel palette-list">
        <div className="section-heading">
          <h1>配色</h1>
          <button className="quiet-button" type="button" onClick={() => void props.onCreate('新配色', colors)}>新建</button>
        </div>
        {props.palettes.map((palette) => (
          <button key={palette.id} className={palette.id === selected.id ? 'list-row list-row--active' : 'list-row'} type="button" onClick={() => props.onSelect(palette.id)}>
            <span>{palette.name}</span>
            <small>{palette.isPreset ? '预设' : '自定义'}{palette.isDefault ? ' / 默认' : ''}</small>
          </button>
        ))}
      </aside>
      <form className="panel palette-editor" onSubmit={(event) => {
        event.preventDefault();
        if (!selected.isPreset) void props.onSave(selected.id, name, colors);
      }}>
        <label className="field field--stacked">
          <span>名称</span>
          <input value={name} disabled={selected.isPreset} onChange={(event) => setName(event.target.value)} />
        </label>
        <div className="color-slot-grid">
          {PALETTE_SLOTS.map((slot) => (
            <label className="color-slot" key={slot}>
              <span>{slot}</span>
              <input type="color" value={colors[slot]} disabled={selected.isPreset} onChange={(event) => setColors({ ...colors, [slot]: event.target.value })} />
              <input value={colors[slot]} disabled={selected.isPreset} onChange={(event) => setColors({ ...colors, [slot]: event.target.value })} />
            </label>
          ))}
        </div>
        <div className="button-row">
          {selected.isPreset ? (
            <button className="primary-button" type="button" onClick={() => void props.onCopy(selected.id, `${selected.name} Copy`)}>复制为自定义</button>
          ) : (
            <button className="primary-button" type="submit">保存配色</button>
          )}
          <button className="quiet-button" type="button" onClick={() => void props.onSetDefault(selected.id)}>设为默认</button>
          {!selected.isPreset ? <button className="quiet-button danger-text" type="button" onClick={() => void props.onDelete(selected.id)}>删除</button> : null}
        </div>
      </form>
    </section>
  );
}
```

Update `frontend/src/App.tsx` to wire palette API actions:

```ts
const createPalette = async (name: string, colors: PaletteColors) => {
  await apiPost<ColorScheme>('/color-schemes', { name, colors });
  await refreshPalettes();
};

const copyPalette = async (id: string, name: string) => {
  await apiPost<ColorScheme>(`/color-schemes/${id}/copy`, { name });
  await refreshPalettes();
};

const savePalette = async (id: string, name: string, colors: PaletteColors) => {
  await apiPatch<ColorScheme>(`/color-schemes/${id}`, { name, colors });
  await refreshPalettes();
};

const deletePalette = async (id: string) => {
  if (window.confirm('删除这个配色？')) {
    await apiDelete<{ ok: boolean }>(`/color-schemes/${id}`);
    await refreshPalettes();
  }
};

const setDefaultPalette = async (id: string) => {
  await apiPut<ColorScheme>(`/color-schemes/${id}/default`);
  await refreshPalettes();
};
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm run test -w frontend -- palettes-page.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add .
git commit -m "feat: build palette management page"
```

---

### Task 8: History Page

**Files:**
- Create: `frontend/src/components/HistoryPage.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/styles.css`
- Create: `frontend/test/history-page.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `frontend/test/history-page.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { HistoryPage } from '../src/components/HistoryPage';

const item = {
  id: 'image-1',
  jobId: 'job-1',
  prompt: 'cell diagram prompt',
  size: '1024x1024',
  quality: 'high',
  colorSchemeId: 'preset-okabe-ito',
  customColors: null,
  referenceImagePath: null,
  imagePath: 'generated/image.png',
  status: 'completed',
  width: 1024,
  height: 1024,
  fileSize: 1024,
  errorMessage: null,
  position: 0,
  createdAt: '2026-04-24T00:00:00Z',
  updatedAt: '2026-04-24T00:00:00Z',
  previewUrl: '/data/generated/image.png',
  downloadUrl: '/api/history/image-1/download',
};

describe('HistoryPage', () => {
  it('renders a table-first history view with reuse as a primary row action', () => {
    const html = renderToStaticMarkup(
      <HistoryPage
        items={[item]}
        query=""
        onQueryChange={() => {}}
        onSearch={async () => {}}
        onReuse={() => {}}
        onDelete={async () => {}}
      />,
    );

    expect(html).toContain('cell diagram prompt');
    expect(html).toContain('1024x1024');
    expect(html).toContain('high');
    expect(html).toContain('带回生成页');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm run test -w frontend -- history-page.test.tsx
```

Expected: FAIL because `HistoryPage.tsx` does not exist.

- [ ] **Step 3: Write minimal implementation**

Create `frontend/src/components/HistoryPage.tsx`:

```tsx
import type { HistoryItem, Workspace } from '../lib/types';

type Props = {
  items: HistoryItem[];
  query: string;
  onQueryChange: (query: string) => void;
  onSearch: () => Promise<void>;
  onReuse: (workspacePatch: Partial<Workspace>) => void;
  onDelete: (id: string) => Promise<void>;
};

export function HistoryPage({ items, query, onQueryChange, onSearch, onReuse, onDelete }: Props) {
  return (
    <section className="history-page">
      <div className="section-heading">
        <h1>历史</h1>
        <form className="search-form" onSubmit={(event) => {
          event.preventDefault();
          void onSearch();
        }}>
          <input value={query} placeholder="搜索 prompt" onChange={(event) => onQueryChange(event.target.value)} />
          <button className="quiet-button" type="submit">搜索</button>
        </form>
      </div>
      <div className="history-table-wrap">
        <table className="history-table">
          <thead>
            <tr>
              <th>图片</th>
              <th>Prompt</th>
              <th>尺寸</th>
              <th>质量</th>
              <th>配色</th>
              <th>时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.previewUrl ? <img className="history-thumb" src={item.previewUrl} alt="" /> : null}</td>
                <td className="prompt-cell">{item.prompt}</td>
                <td>{item.size}</td>
                <td>{item.quality}</td>
                <td>{item.colorSchemeId}</td>
                <td>{new Date(item.createdAt).toLocaleString()}</td>
                <td>
                  <div className="table-actions">
                    <button className="quiet-button" type="button" onClick={() => onReuse({
                      prompt: item.prompt,
                      size: item.size,
                      quality: item.quality,
                      colorSchemeId: item.colorSchemeId,
                      customColors: item.customColors,
                    })}>带回生成页</button>
                    <a className="quiet-button" href={item.downloadUrl}>下载</a>
                    <button className="quiet-button danger-text" type="button" onClick={() => void onDelete(item.id)}>删除</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 ? <p className="empty-state">暂无结果</p> : null}
      </div>
    </section>
  );
}
```

Update `frontend/src/App.tsx`:

```ts
const [historyQuery, setHistoryQuery] = useState('');

const searchHistory = async () => {
  const suffix = historyQuery.trim() ? `?query=${encodeURIComponent(historyQuery.trim())}` : '';
  setHistory(await apiGet<HistoryItem[]>(`/history${suffix}`));
};

const reuseHistoryItem = (patch: Partial<Workspace>) => {
  setWorkspace(normalizeWorkspace({ ...workspace, ...patch }));
  selectPage('generate');
};

const deleteHistoryItem = async (id: string) => {
  if (window.confirm('删除这张图片？')) {
    await apiDelete<{ ok: boolean }>(`/history/${id}`);
    await searchHistory();
  }
};
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm run test -w frontend -- history-page.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add .
git commit -m "feat: build history page"
```

---

### Task 9: Final Styling, Production Build, and Documentation

**Files:**
- Modify: `frontend/src/styles.css`
- Modify: `README.md`
- Modify: `backend/README.md`
- Modify: `scripts/setup.sh`
- Modify: `scripts/start-services.sh`
- Modify: `scripts/status-services.sh`
- Modify: `scripts/stop-services.sh`

- [ ] **Step 1: Write the failing verification checklist**

Create `frontend/test/app-shell.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { App } from '../src/App';

describe('App shell', () => {
  it('does not render marketing or onboarding copy in the default shell', () => {
    const html = renderToStaticMarkup(<App />);

    expect(html).toContain('PaperPalette');
    expect(html).toContain('生成');
    expect(html).toContain('历史');
    expect(html).toContain('配色');
    expect(html).toContain('设置');
    expect(html).not.toContain('欢迎');
    expect(html).not.toContain('开始使用');
  });
});
```

- [ ] **Step 2: Run test to verify it fails or exposes missing wiring**

Run:

```bash
npm run test -w frontend -- app-shell.test.tsx
```

Expected: FAIL if `App` requires browser-only globals during server rendering or if shell labels are not present.

- [ ] **Step 3: Finish implementation and docs**

Update `frontend/src/styles.css` so the final UI follows these concrete constraints:

```css
:root {
  --paper: #fbfaf7;
  --surface: #ffffff;
  --ink: #20201f;
  --muted: #6f6a60;
  --line: #dedbd2;
  --accent: #2f5d50;
  --danger: #9b2f2f;
  --radius: 7px;
}

.primary-button {
  border: 1px solid var(--accent);
  border-radius: var(--radius);
  background: var(--accent);
  color: white;
  min-height: 38px;
  padding: 0 14px;
  cursor: pointer;
}

.quiet-button {
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--ink);
  min-height: 34px;
  padding: 0 10px;
  text-decoration: none;
  cursor: pointer;
}

.danger-text {
  color: var(--danger);
}

.panel {
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
  padding: 16px;
}
```

Update scripts so they match the restored app:

`scripts/setup.sh`:

```bash
#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

npm install
```

`scripts/start-services.sh`:

```bash
#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

npm run dev
```

`scripts/status-services.sh`:

```bash
#!/bin/bash
set -euo pipefail

echo "Use npm run dev for development and npm run start after npm run build for production."
```

`scripts/stop-services.sh`:

```bash
#!/bin/bash
set -euo pipefail

pkill -f "tsx watch src/server.ts" >/dev/null 2>&1 || true
pkill -f "vite --host 127.0.0.1 --port 43174" >/dev/null 2>&1 || true
```

Update `README.md`:

```md
# PaperPalette

PaperPalette 是一个简约的科研配图生成工具。它包含 React 前端和 Fastify 后端，生产环境由 Fastify 同时提供页面、API 和本地生成文件访问。

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
```

- [ ] **Step 4: Run full verification**

Run:

```bash
npm run test
npm run build
npm audit --omit=dev
```

Expected:

- `npm run test`: PASS for backend and frontend tests.
- `npm run build`: PASS and creates `backend/dist` plus `frontend/dist`.
- `npm audit --omit=dev`: reports 0 production vulnerabilities.

- [ ] **Step 5: Commit**

Run:

```bash
git add .
git commit -m "chore: finalize frontend rebuild"
```

---

## Self-Review

Spec coverage:

- Four pages are covered in Tasks 3, 5, 6, 7, and 8.
- Generate page confirmed layout is covered in Task 5.
- History table and parameter reuse are covered in Task 8.
- Fixed 8-slot palette management and backend persistence are covered in Tasks 1 and 7.
- Settings save/test separation is covered in Tasks 2 and 6.
- Fastify production serving is covered in Tasks 2 and 9.
- Root scripts and deployment docs are covered in Tasks 3 and 9.

Placeholder scan:

- The plan contains no placeholder markers and no deferred implementation markers.
- Each task has a failing test, verification command, implementation guidance, passing test command, and commit step.

Type consistency:

- Palette slots are consistently `primary`, `secondary`, `tertiary`, `text`, `fill`, `section_bg`, `border`, `arrow`.
- Page IDs are consistently `generate`, `history`, `palettes`, `settings`.
- Backend palette route names match frontend API calls.
- Settings connection route is consistently `POST /api/settings/test-connection`.
