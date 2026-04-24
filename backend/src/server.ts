import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildApp } from './app.js';
import { env } from './config/env.js';

const moduleDir = dirname(fileURLToPath(import.meta.url));
const backendRoot = resolve(moduleDir, '..');
const dataDir = resolve(backendRoot, env.DATA_DIR);
const frontendDistDir = resolve(backendRoot, '../frontend/dist');
const staticDir = existsSync(join(frontendDistDir, 'index.html')) ? frontendDistDir : undefined;

const app = await buildApp({
  dataDir,
  staticDir,
  logger: true,
});

await app.listen({
  host: env.HOST,
  port: env.PORT,
});

app.log.info(`Server listening on ${env.HOST}:${env.PORT}`);
