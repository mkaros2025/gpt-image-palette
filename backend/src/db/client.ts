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
  migrateSchema(db);

  return db;
}

function migrateSchema(db: SqliteDatabase) {
  addColumnIfMissing(db, 'workspace_state', 'reference_images_json', 'TEXT');
  addColumnIfMissing(db, 'generation_jobs', 'reference_images_json', 'TEXT');
  addColumnIfMissing(db, 'generation_images', 'reference_images_json', 'TEXT');
}

function addColumnIfMissing(db: SqliteDatabase, table: string, column: string, definition: string) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (columns.some((item) => item.name === column)) {
    return;
  }

  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}
