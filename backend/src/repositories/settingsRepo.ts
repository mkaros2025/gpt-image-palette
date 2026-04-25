import { readImageApiEnv, writeImageApiEnv } from '../config/envFile.js';

export type AppSettings = {
  baseUrl: string;
  apiKey: string;
};

export type SettingsRepo = ReturnType<typeof createSettingsRepo>;

export function createSettingsRepo(options: { envFilePath?: string } = {}) {
  function getSettings(): AppSettings {
    return (
      readImageApiEnv(options.envFilePath) ?? {
        baseUrl: '',
        apiKey: '',
      }
    );
  }

  return {
    getSettings,
    saveSettings(input: { baseUrl: string; apiKey: string }): AppSettings {
      writeImageApiEnv(input, options.envFilePath);
      return getSettings();
    },
  };
}
