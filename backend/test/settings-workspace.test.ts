import { describe, expect, it } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { buildApp } from '../src/app';

describe('settings + workspace persistence', () => {
  it('persists gateway settings and draft state across restarts', async () => {
    const dataDir = mkdtempSync(join(tmpdir(), 'workbench-'));

    const first = await buildApp({ dataDir });
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

    const second = await buildApp({ dataDir });
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
});
