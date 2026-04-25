import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';

import { buildApp } from '../src/app';

describe('settings + workspace persistence', () => {
  it('persists gateway settings and draft state across restarts', async () => {
    const dataDir = mkdtempSync(join(tmpdir(), 'workbench-'));
    const envFilePath = join(dataDir, '.env');

    const first = await buildApp({ dataDir, envFilePath });
    await first.inject({
      method: 'PUT',
      url: '/api/settings',
      payload: { baseUrl: 'http://127.0.0.1:8080', apiKey: 'sk-test' },
    });
    await first.inject({
      method: 'PUT',
      url: '/api/workspace',
      payload: {
        prompt: 'cell diagram',
        size: '1024x1024',
        quality: 'high',
        colorSchemeId: 'preset-okabe-ito',
        customColors: null,
        count: 2,
      },
    });
    await first.close();

    const envFile = readFileSync(envFilePath, 'utf8');
    expect(envFile).toContain('IMAGE_API_BASE_URL=http://127.0.0.1:8080');
    expect(envFile).toContain('IMAGE_API_KEY=sk-test');

    const second = await buildApp({ dataDir, envFilePath });
    const settings = await second.inject({ method: 'GET', url: '/api/settings' });
    const workspace = await second.inject({ method: 'GET', url: '/api/workspace' });

    expect(settings.json()).toMatchObject({
      baseUrl: 'http://127.0.0.1:8080',
      apiKey: 'sk-test',
    });
    expect(workspace.json()).toMatchObject({
      prompt: 'cell diagram',
      size: '1024x1024',
      quality: 'high',
      colorSchemeId: 'preset-okabe-ito',
      count: 2,
    });

    await second.close();
  });

  it('opens an existing single-reference database after the reference image array schema change', async () => {
    const dataDir = mkdtempSync(join(tmpdir(), 'workbench-old-schema-'));
    const db = new Database(join(dataDir, 'app.db'));
    db.exec(`
      CREATE TABLE app_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        base_url TEXT NOT NULL DEFAULT '',
        api_key TEXT NOT NULL DEFAULT '',
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      INSERT INTO app_settings (id, base_url, api_key, updated_at)
      VALUES (1, '', '', CURRENT_TIMESTAMP);

      CREATE TABLE workspace_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        prompt TEXT NOT NULL DEFAULT '',
        size TEXT NOT NULL DEFAULT 'auto',
        quality TEXT NOT NULL DEFAULT 'high',
        color_scheme_id TEXT NOT NULL DEFAULT 'preset-okabe-ito',
        custom_colors_json TEXT,
        count INTEGER NOT NULL DEFAULT 1,
        reference_image_path TEXT,
        reference_image_name TEXT,
        reference_image_mime_type TEXT,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      INSERT INTO workspace_state (
        id,
        prompt,
        size,
        quality,
        color_scheme_id,
        custom_colors_json,
        count,
        reference_image_path,
        reference_image_name,
        reference_image_mime_type,
        updated_at
      )
      VALUES (1, 'old prompt', 'auto', 'high', 'preset-okabe-ito', NULL, 1, NULL, NULL, NULL, CURRENT_TIMESTAMP);
    `);
    db.close();

    const app = await buildApp({ dataDir });
    const workspace = await app.inject({ method: 'GET', url: '/api/workspace' });

    expect(workspace.statusCode).toBe(200);
    expect(workspace.json()).toMatchObject({
      prompt: 'old prompt',
      referenceImages: [],
    });

    await app.close();
  });

  it('ignores legacy database settings when the env file is missing', async () => {
    const dataDir = mkdtempSync(join(tmpdir(), 'workbench-db-settings-ignored-'));
    const envFilePath = join(dataDir, '.env');
    const db = new Database(join(dataDir, 'app.db'));
    db.exec(`
      CREATE TABLE app_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        base_url TEXT NOT NULL DEFAULT '',
        api_key TEXT NOT NULL DEFAULT '',
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      INSERT INTO app_settings (id, base_url, api_key, updated_at)
      VALUES (1, 'http://legacy.example', 'sk-legacy', CURRENT_TIMESTAMP);
    `);
    db.close();

    const app = await buildApp({ dataDir, envFilePath });
    const settings = await app.inject({ method: 'GET', url: '/api/settings' });

    expect(settings.json()).toMatchObject({
      baseUrl: '',
      apiKey: '',
    });

    await app.close();
  });

  it('reads API settings from the env file', async () => {
    const dataDir = mkdtempSync(join(tmpdir(), 'workbench-env-settings-'));
    const envFilePath = join(dataDir, '.env');
    const db = new Database(join(dataDir, 'app.db'));
    db.exec(`
      CREATE TABLE app_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        base_url TEXT NOT NULL DEFAULT '',
        api_key TEXT NOT NULL DEFAULT '',
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      INSERT INTO app_settings (id, base_url, api_key, updated_at)
      VALUES (1, 'http://legacy.example', 'sk-legacy', CURRENT_TIMESTAMP);
    `);
    db.close();
    writeFileSync(envFilePath, 'IMAGE_API_BASE_URL=http://env.example\nIMAGE_API_KEY=sk-env\n');

    const app = await buildApp({ dataDir, envFilePath });
    const settings = await app.inject({ method: 'GET', url: '/api/settings' });

    expect(settings.json()).toMatchObject({
      baseUrl: 'http://env.example',
      apiKey: 'sk-env',
    });

    await app.close();
  });
});
