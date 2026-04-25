import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import type { HistoryRepo } from '../repositories/historyRepo.js';
import type { GenerationService } from '../services/generationService.js';

const generationSchema = z.object({
  prompt: z.string().trim().min(1),
  size: z.string().trim().min(1),
  quality: z.string().trim().min(1),
  colorSchemeId: z.string().trim().min(1),
  customColors: z.record(z.string(), z.string()).nullable().default(null),
  count: z.coerce.number().int().min(1).max(4),
  referenceImages: z.array(z.object({
    path: z.string().trim().min(1),
    name: z.string().nullable().default(null),
    mimeType: z.string().nullable().default(null),
  })).default([]),
});

export function registerGenerationRoutes(
  app: FastifyInstance,
  generationService: GenerationService,
  repo: HistoryRepo,
) {
  app.post('/api/generations', async (request, reply) => {
    const input = generationSchema.parse(request.body);
    const job = await generationService.startBatch(input);
    return reply.status(202).send(job);
  });

  app.get('/api/generations/active', async () => repo.listActiveJobs());
}
