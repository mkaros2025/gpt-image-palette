import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import type { SqliteDatabase } from '../db/client.js';
import { createWorkspaceRepo, type ReferenceImage } from '../repositories/workspaceRepo.js';
import type { FileStore } from '../services/fileStore.js';
import { normalizeReferenceImage } from '../services/referenceImage.js';

const customColorsSchema = z.record(z.string(), z.string()).nullable().default(null);

const workspaceSchema = z.object({
  prompt: z.string(),
  size: z.string().trim().min(1),
  quality: z.string().trim().min(1),
  colorSchemeId: z.string().trim().min(1),
  customColors: customColorsSchema,
  count: z.coerce.number().int().min(1).max(4),
});

export function registerWorkspaceRoutes(app: FastifyInstance, db: SqliteDatabase, fileStore: FileStore) {
  const repo = createWorkspaceRepo(db);

  app.get('/api/workspace', async () => toWorkspaceResponse(await repo.getWorkspace(), fileStore));

  app.put('/api/workspace', async (request, reply) => {
    const input = workspaceSchema.parse(request.body);
    const workspace = repo.saveWorkspace(input);
    return reply.send(toWorkspaceResponse(workspace, fileStore));
  });

  app.post('/api/workspace/reference-images', async (request, reply) => {
    const current = await repo.getWorkspace();
    const uploaded: ReferenceImage[] = [];

    for await (const part of request.files()) {
      if (!part.mimetype.startsWith('image/')) {
        return reply.code(400).send({ message: 'Reference images must be image files.' });
      }

      let normalized;
      try {
        normalized = await normalizeReferenceImage(await part.toBuffer());
      } catch {
        return reply.code(400).send({ message: 'Reference image could not be processed.' });
      }

      const relativePath = fileStore.joinRelative(
        'workspace',
        'reference-images',
        `${Date.now()}-${randomSlug(8)}.${normalized.extension}`,
      );
      await fileStore.writeFile(relativePath, normalized.bytes);
      uploaded.push({
        path: relativePath,
        name: part.filename || normalized.filename,
        mimeType: normalized.mimeType,
      });
    }

    if (uploaded.length === 0) {
      return reply.code(400).send({ message: 'No reference images provided.' });
    }

    const workspace = repo.setReferenceImages([...current.referenceImages, ...uploaded]);
    return toWorkspaceResponse(workspace, fileStore);
  });

  app.delete('/api/workspace/reference-images/:index', async (request, reply) => {
    const { index: rawIndex } = request.params as { index: string };
    const index = Number.parseInt(rawIndex, 10);
    const current = await repo.getWorkspace();

    if (!Number.isInteger(index) || index < 0 || index >= current.referenceImages.length) {
      return reply.code(404).send({ message: 'Reference image not found.' });
    }

    const removed = current.referenceImages[index];
    if (removed) {
      await fileStore.removeFile(removed.path);
    }

    const workspace = repo.setReferenceImages(current.referenceImages.filter((_, itemIndex) => itemIndex !== index));
    return toWorkspaceResponse(workspace, fileStore);
  });

  app.delete('/api/workspace/reference-images', async () => {
    const current = await repo.getWorkspace();
    await Promise.all(current.referenceImages.map((image) => fileStore.removeFile(image.path)));
    const workspace = repo.clearReferenceImages();
    return toWorkspaceResponse(workspace, fileStore);
  });
}

function toWorkspaceResponse(workspace: Awaited<ReturnType<ReturnType<typeof createWorkspaceRepo>['getWorkspace']>>, fileStore: FileStore) {
  return {
    ...workspace,
    referenceImages: workspace.referenceImages.map((image) => ({
      ...image,
      path: fileStore.toPublicUrl(image.path),
    })),
  };
}

function randomSlug(length: number) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let output = '';
  for (let index = 0; index < length; index += 1) {
    output += chars[Math.floor(Math.random() * chars.length)];
  }
  return output;
}
