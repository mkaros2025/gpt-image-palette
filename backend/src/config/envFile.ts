import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const moduleDir = dirname(fileURLToPath(import.meta.url));

export const defaultEnvFilePath = resolve(moduleDir, '../../..', '.env');

export type ImageApiEnv = {
  baseUrl: string;
  apiKey: string;
};

export function loadEnvFileIntoProcess(envFilePath = defaultEnvFilePath) {
  const values = readEnvFile(envFilePath);
  for (const [key, value] of Object.entries(values)) {
    process.env[key] ??= value;
  }
}

export function readImageApiEnv(envFilePath = defaultEnvFilePath): ImageApiEnv | undefined {
  const values = readEnvFile(envFilePath);
  const baseUrl = values.IMAGE_API_BASE_URL?.trim() ?? '';
  const apiKey = values.IMAGE_API_KEY?.trim() ?? '';
  if (!baseUrl && !apiKey) {
    return undefined;
  }
  return { baseUrl, apiKey };
}

export function writeImageApiEnv(input: ImageApiEnv, envFilePath = defaultEnvFilePath) {
  const next = updateEnvText(existsSync(envFilePath) ? readFileSync(envFilePath, 'utf8') : '', {
    IMAGE_API_BASE_URL: input.baseUrl,
    IMAGE_API_KEY: input.apiKey,
  });
  writeFileSync(envFilePath, next);
}

function readEnvFile(envFilePath: string): Record<string, string> {
  if (!existsSync(envFilePath)) {
    return {};
  }

  const values: Record<string, string> = {};
  for (const line of readFileSync(envFilePath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/);
    if (!match) {
      continue;
    }
    values[match[1]] = unquoteEnvValue(match[2]);
  }
  return values;
}

function updateEnvText(source: string, updates: Record<string, string>) {
  const pending = new Set(Object.keys(updates));
  const lines = source ? source.replace(/\r\n/g, '\n').split('\n') : [];
  const nextLines = lines.map((line) => {
    const match = line.match(/^(\s*)([A-Za-z_][A-Za-z0-9_]*)(=.*)$/);
    if (!match || !pending.has(match[2])) {
      return line;
    }
    pending.delete(match[2]);
    return `${match[1]}${match[2]}=${quoteEnvValue(updates[match[2]])}`;
  });

  if (nextLines.length > 0 && nextLines[nextLines.length - 1] !== '') {
    nextLines.push('');
  }
  for (const key of pending) {
    nextLines.push(`${key}=${quoteEnvValue(updates[key])}`);
  }

  return `${nextLines.join('\n').replace(/\n*$/, '')}\n`;
}

function quoteEnvValue(value: string) {
  if (/^[A-Za-z0-9_./: -]*$/.test(value)) {
    return value;
  }
  return JSON.stringify(value);
}

function unquoteEnvValue(value: string) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}
