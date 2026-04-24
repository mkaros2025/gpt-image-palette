import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import type { SqliteDatabase } from '../db/client.js';
import { createWorkspaceRepo } from '../repositories/workspaceRepo.js';
import type { FileStore } from '../services/fileStore.js';

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

  app.post('/api/workspace/reference-image', async (request, reply) => {
    const current = await repo.getWorkspace();
    const part = await request.file();
    if (!part) {
      return reply.code(400).send({ message: 'No reference image provided.' });
    }

    if (!part.mimetype.startsWith('image/')) {
      return reply.code(400).send({ message: 'Reference image must be an image file.' });
    }

    if (current.referenceImagePath) {
      await fileStore.removeFile(current.referenceImagePath);
    }

    const extension = mimeTypeToExtension(part.mimetype, part.filename);
    const relativePath = fileStore.joinRelative(
      'workspace',
      'reference-images',
      `${Date.now()}-${randomSlug(8)}.${extension}`,
    );
    const bytes = await part.toBuffer();
    await fileStore.writeFile(relativePath, bytes);

    const workspace = repo.setReferenceImage({
      referenceImagePath: relativePath,
      referenceImageName: part.filename || 'reference-image',
      referenceImageMimeType: part.mimetype,
    });

    return toWorkspaceResponse(workspace, fileStore);
  });

  app.delete('/api/workspace/reference-image', async () => {
    const current = await repo.getWorkspace();
    if (current.referenceImagePath) {
      await fileStore.removeFile(current.referenceImagePath);
    }
    const workspace = repo.clearReferenceImage();
    return toWorkspaceResponse(workspace, fileStore);
  });
}

function toWorkspaceResponse(workspace: Awaited<ReturnType<ReturnType<typeof createWorkspaceRepo>['getWorkspace']>>, fileStore: FileStore) {
  return {
    ...workspace,
    referenceImagePath: workspace.referenceImagePath ? fileStore.toPublicUrl(workspace.referenceImagePath) : null,
  };
}

function mimeTypeToExtension(mimeType: string, filename?: string | null) {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/webp') return 'webp';
  const suffix = filename ? filename.split('.').pop() : null;
  return suffix || 'png';
}

function randomSlug(length: number) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let output = '';
  for (let index = 0; index < length; index += 1) {
    output += chars[Math.floor(Math.random() * chars.length)];
  }
  return output;
}
