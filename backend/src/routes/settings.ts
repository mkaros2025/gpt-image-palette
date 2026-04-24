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
