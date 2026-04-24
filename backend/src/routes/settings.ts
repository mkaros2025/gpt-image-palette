import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import type { SqliteDatabase } from '../db/client.js';
import { createSettingsRepo } from '../repositories/settingsRepo.js';

const settingsSchema = z.object({
  baseUrl: z.string().trim().min(1),
  apiKey: z.string().trim().min(1),
});

export function registerSettingsRoutes(app: FastifyInstance, db: SqliteDatabase) {
  const repo = createSettingsRepo(db);

  app.get('/api/settings', async () => repo.getSettings());

  app.put('/api/settings', async (request, reply) => {
    const input = settingsSchema.parse(request.body);
    const settings = repo.saveSettings(input);
    return reply.send(settings);
  });
}
