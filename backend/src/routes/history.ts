import type { FastifyInstance } from 'fastify';

import type { HistoryRepo } from '../repositories/historyRepo.js';
import type { FileStore } from '../services/fileStore.js';

export function registerHistoryRoutes(app: FastifyInstance, repo: HistoryRepo, fileStore: FileStore) {
  app.get('/api/history', async (request) => {
    const query = (request.query as { query?: string }).query || '';
    const items = query ? await repo.searchHistory(query) : await repo.listCompletedImages();
    return items.map((item) => toHistoryResponse(item, fileStore));
  });

  app.get('/api/history/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const item = await repo.getImage(id);
    if (!item) {
      return reply.code(404).send({ message: 'Not Found' });
    }
    return toHistoryResponse(item, fileStore);
  });

  app.get('/api/history/:id/download', async (request, reply) => {
    const { id } = request.params as { id: string };
    const item = await repo.getImage(id);
    if (!item || !item.imagePath) {
      reply.code(404);
      return { message: 'Not Found' };
    }

    let bytes: Buffer;
    try {
      bytes = await fileStore.readFile(item.imagePath);
    } catch {
      reply.code(404);
      return { message: 'Not Found' };
    }

    reply.header('Content-Type', inferMimeType(item.imagePath));
    reply.header(
      'Content-Disposition',
      `attachment; filename="${safeFilename(`${item.id}.${extensionFromPath(item.imagePath)}`)}"`,
    );
    return reply.send(bytes);
  });

  app.delete('/api/history/:id', async (request) => {
    const { id } = request.params as { id: string };
    const item = await repo.getImage(id);
    if (item?.imagePath) {
      await fileStore.removeFile(item.imagePath);
    }
    await repo.deleteImage(id);
    return { ok: true };
  });
}

function toHistoryResponse(
  item: Awaited<ReturnType<HistoryRepo['getImage']>> extends infer T ? NonNullable<T> : never,
  fileStore: FileStore,
) {
  return {
    ...item,
    previewUrl: item.imagePath ? fileStore.toPublicUrl(item.imagePath) : null,
    downloadUrl: `/api/history/${item.id}/download`,
  };
}

function inferMimeType(path: string) {
  const ext = extensionFromPath(path);
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'webp') return 'image/webp';
  return 'image/png';
}

function extensionFromPath(path: string) {
  return path.split('.').pop()?.toLowerCase() || 'png';
}

function safeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]+/g, '_');
}
