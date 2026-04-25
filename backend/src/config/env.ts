import { z } from 'zod';

import { loadEnvFileIntoProcess } from './envFile.js';

loadEnvFileIntoProcess();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('127.0.0.1'),
  PORT: z.coerce.number().int().positive().default(43175),
  DATA_DIR: z.string().default('./data'),
});

export const env = envSchema.parse(process.env);
