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
