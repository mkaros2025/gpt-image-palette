import fastifyStatic from '@fastify/static';
import type { FastifyInstance } from 'fastify';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export async function registerStaticAssets(app: FastifyInstance, rootDir: string) {
  if (!existsSync(join(rootDir, 'index.html'))) {
    return;
  }

  await app.register(fastifyStatic, {
    root: rootDir,
    prefix: '/',
    decorateReply: false,
  });

  app.setNotFoundHandler((request, reply) => {
    const url = request.raw.url ?? '';
    const pathname = url.split('?', 1)[0];

    if (pathname.startsWith('/api/') || pathname.startsWith('/data/')) {
      reply.code(404).send({ message: 'Not Found' });
      return;
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      reply.code(404).send({ message: 'Not Found' });
      return;
    }

    if (pathname.includes('.')) {
      reply.code(404).send({ message: 'Not Found' });
      return;
    }

    reply.sendFile('index.html');
  });
}
