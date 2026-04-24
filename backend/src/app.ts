import fastifyMultipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyInstance } from 'fastify';
import { resolve } from 'node:path';
import { ZodError } from 'zod';

import { openDatabase } from './db/client.js';
import { createFileStore } from './services/fileStore.js';
import { createGatewayClient, type GatewayClient } from './services/gatewayClient.js';
import { createGenerationService } from './services/generationService.js';
import { createSqliteHistoryRepo } from './repositories/historyRepo.js';
import { createSettingsRepo } from './repositories/settingsRepo.js';
import { createWorkspaceRepo } from './repositories/workspaceRepo.js';
import { registerColorSchemeRoutes } from './routes/colorSchemes.js';
import { registerGenerationRoutes } from './routes/generations.js';
import { registerHistoryRoutes } from './routes/history.js';
import { registerSettingsRoutes } from './routes/settings.js';
import { registerWorkspaceRoutes } from './routes/workspace.js';

export type BuildAppOptions = {
  dataDir: string;
  staticDir?: string;
  logger?: boolean;
  gateway?: GatewayClient;
};

export async function buildApp(options: BuildAppOptions): Promise<FastifyInstance> {
  const db = openDatabase(options.dataDir);
  const fileStore = createFileStore(options.dataDir);
  const settingsRepo = createSettingsRepo(db);
  const workspaceRepo = createWorkspaceRepo(db);
  const historyRepo = createSqliteHistoryRepo(db);
  const gateway = options.gateway ?? createGatewayClient();
  const generationService = createGenerationService({
    repo: historyRepo,
    fileStore,
    gateway,
    getGatewayConfig: () => settingsRepo.getSettings(),
  });
  const app = Fastify({
    logger: options.logger ?? false,
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      reply.code(400).send({
        message: 'Invalid request body.',
        issues: error.issues,
      });
      return;
    }

    reply.send(error);
  });

  await app.register(fastifyMultipart, {
    limits: {
      fileSize: 10 * 1024 * 1024,
    },
  });
  await app.register(fastifyStatic, {
    root: resolve(options.dataDir),
    prefix: '/data/',
    decorateReply: false,
  });

  app.addHook('onClose', async () => {
    db.close();
  });

  registerSettingsRoutes(app, db, gateway);
  registerWorkspaceRoutes(app, db, fileStore);
  registerColorSchemeRoutes(app, db);
  registerGenerationRoutes(app, generationService, historyRepo);
  registerHistoryRoutes(app, historyRepo, fileStore);

  if (options.staticDir) {
    const { registerStaticAssets } = await import('./plugins/staticAssets.js');
    await registerStaticAssets(app, options.staticDir);
  }

  return app;
}
