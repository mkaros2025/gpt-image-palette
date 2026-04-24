import type { SqliteDatabase } from '../db/client.js';

export type AppSettings = {
  baseUrl: string;
  apiKey: string;
  updatedAt: string;
};

type SettingsRow = {
  baseUrl: string;
  apiKey: string;
  updatedAt: string;
};

export function createSettingsRepo(db: SqliteDatabase) {
  const getStatement = db.prepare(
    `SELECT base_url AS baseUrl, api_key AS apiKey, updated_at AS updatedAt
     FROM app_settings
     WHERE id = 1`,
  );
  const upsertStatement = db.prepare(
    `INSERT INTO app_settings (id, base_url, api_key, updated_at)
     VALUES (1, @baseUrl, @apiKey, CURRENT_TIMESTAMP)
     ON CONFLICT(id) DO UPDATE SET
       base_url = excluded.base_url,
       api_key = excluded.api_key,
       updated_at = CURRENT_TIMESTAMP`,
  );

  function getSettings(): AppSettings {
    const row = getStatement.get() as SettingsRow | undefined;
    return (
      row ?? {
        baseUrl: '',
        apiKey: '',
        updatedAt: '',
      }
    );
  }

  return {
    getSettings,
    saveSettings(input: { baseUrl: string; apiKey: string }): AppSettings {
      upsertStatement.run(input);
      return getSettings();
    },
  };
}
