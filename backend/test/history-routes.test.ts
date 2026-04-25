import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';

import { createMemoryHistoryRepo } from '../src/repositories/historyRepo';
import { registerHistoryRoutes } from '../src/routes/history';

describe('history routes', () => {
  it('includes failed generation records with their error message in regular history', async () => {
    const repo = createMemoryHistoryRepo();
    await repo.createFailedImage({
      jobId: 'job-failed',
      prompt: 'broken gateway request',
      status: 'failed',
      error: 'Gateway HTTP 401: invalid key',
    });
    const app = Fastify();

    registerHistoryRoutes(app, repo, {
      async readFile() {
        return Buffer.from('');
      },
      async writeFile() {},
      async exists() {
        return false;
      },
      async removeFile() {},
      toPublicUrl(path: string) {
        return `/data/${path}`;
      },
    });

    const response = await app.inject({ method: 'GET', url: '/api/history' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([
      expect.objectContaining({
        prompt: 'broken gateway request',
        status: 'failed',
        previewUrl: null,
        errorMessage: 'Gateway HTTP 401: invalid key',
      }),
    ]);
    expect(response.json()[0]).not.toHaveProperty('error');

    await app.close();
  });
});
