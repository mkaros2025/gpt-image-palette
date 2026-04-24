import Database from 'better-sqlite3';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export type SqliteDatabase = import('better-sqlite3').Database;

function readSchema(): string {
  const candidates = [
    new URL('./schema.sql', import.meta.url),
    new URL('../../src/db/schema.sql', import.meta.url),
  ];

  for (const candidate of candidates) {
    try {
      return readFileSync(candidate, 'utf8');
    } catch {
      // Try the next location. The source tree is used in dev/test while the
      // dist tree is used after build if the SQL file is copied across.
    }
  }

  throw new Error('Unable to locate db schema');
}

export function openDatabase(dataDir: string): SqliteDatabase {
  mkdirSync(dataDir, { recursive: true });

  const dbPath = join(dataDir, 'app.db');
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(readSchema());

  return db;
}
