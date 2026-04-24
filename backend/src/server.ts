import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildApp } from './app.js';
import { env } from './config/env.js';

const moduleDir = dirname(fileURLToPath(import.meta.url));
const backendRoot = resolve(moduleDir, '..');
const dataDir = resolve(backendRoot, env.DATA_DIR);

const app = await buildApp({
  dataDir,
  logger: true,
});

await app.listen({
  host: env.HOST,
  port: env.PORT,
});

app.log.info(`Server listening on ${env.HOST}:${env.PORT}`);
