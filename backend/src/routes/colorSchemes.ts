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
