import { randomUUID } from 'node:crypto';

import type { SqliteDatabase } from '../db/client.js';
import {
  COLOR_SCHEME_PRESETS,
  type ColorPalette,
  isCompleteColorPalette,
} from '../lib/colorSchemes.js';

export type ColorScheme = {
  id: string;
  name: string;
  description: string;
  colors: ColorPalette;
  isDefault: boolean;
  isPreset: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

type CustomPaletteRow = {
  id: string;
  name: string;
  colorsJson: string;
  createdAt: string;
  updatedAt: string;
};

export function createPaletteRepo(db: SqliteDatabase) {
  const listCustomStatement = db.prepare(
    `SELECT id, name, colors_json AS colorsJson, created_at AS createdAt, updated_at AS updatedAt
     FROM custom_color_schemes
     ORDER BY updated_at DESC, name ASC`,
  );
  const getCustomStatement = db.prepare(
    `SELECT id, name, colors_json AS colorsJson, created_at AS createdAt, updated_at AS updatedAt
     FROM custom_color_schemes
     WHERE id = ?`,
  );
  const insertCustomStatement = db.prepare(
    `INSERT INTO custom_color_schemes (id, name, colors_json, created_at, updated_at)
     VALUES (@id, @name, @colorsJson, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
  );
  const updateCustomStatement = db.prepare(
    `UPDATE custom_color_schemes
     SET name = @name,
         colors_json = @colorsJson,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = @id`,
  );
  const deleteCustomStatement = db.prepare(
    `DELETE FROM custom_color_schemes
     WHERE id = ?`,
  );
  const getDefaultStatement = db.prepare(
    `SELECT default_color_scheme_id AS defaultColorSchemeId
     FROM palette_preferences
     WHERE id = 1`,
  );
  const setDefaultStatement = db.prepare(
    `INSERT INTO palette_preferences (id, default_color_scheme_id, updated_at)
     VALUES (1, @id, CURRENT_TIMESTAMP)
     ON CONFLICT(id) DO UPDATE SET
       default_color_scheme_id = excluded.default_color_scheme_id,
       updated_at = CURRENT_TIMESTAMP`,
  );

  function getDefaultId() {
    const row = getDefaultStatement.get() as { defaultColorSchemeId: string } | undefined;
    return row?.defaultColorSchemeId ?? 'preset-okabe-ito';
  }

  function listColorSchemes(): ColorScheme[] {
    const defaultId = getDefaultId();
    return [
      ...COLOR_SCHEME_PRESETS.map((preset) => ({
        ...preset,
        isDefault: preset.id === defaultId,
        createdAt: null,
        updatedAt: null,
      })),
      ...(listCustomStatement.all() as CustomPaletteRow[]).map((row) => rowToColorScheme(row, defaultId)),
    ];
  }

  function getColorScheme(id: string): ColorScheme | null {
    const preset = COLOR_SCHEME_PRESETS.find((item) => item.id === id);
    const defaultId = getDefaultId();
    if (preset) {
      return {
        ...preset,
        isDefault: preset.id === defaultId,
        createdAt: null,
        updatedAt: null,
      };
    }

    const custom = getCustomStatement.get(id) as CustomPaletteRow | undefined;
    return custom ? rowToColorScheme(custom, defaultId) : null;
  }

  function createColorScheme(input: { name: string; colors: ColorPalette }) {
    const id = `custom-${randomUUID()}`;
    insertCustomStatement.run({
      id,
      name: input.name.trim(),
      colorsJson: JSON.stringify(input.colors),
    });
    return getColorScheme(id)!;
  }

  function copyColorScheme(sourceId: string, name: string) {
    const source = getColorScheme(sourceId);
    if (!source) {
      return null;
    }
    return createColorScheme({
      name: name.trim(),
      colors: source.colors,
    });
  }

  function updateColorScheme(id: string, input: { name: string; colors: ColorPalette }) {
    if (COLOR_SCHEME_PRESETS.some((preset) => preset.id === id)) {
      return { kind: 'preset' as const };
    }
    if (!getCustomStatement.get(id)) {
      return { kind: 'missing' as const };
    }
    updateCustomStatement.run({
      id,
      name: input.name.trim(),
      colorsJson: JSON.stringify(input.colors),
    });
    return { kind: 'updated' as const, palette: getColorScheme(id)! };
  }

  function deleteColorScheme(id: string) {
    if (COLOR_SCHEME_PRESETS.some((preset) => preset.id === id)) {
      return { kind: 'preset' as const };
    }
    deleteCustomStatement.run(id);
    if (getDefaultId() === id) {
      setDefaultStatement.run({ id: 'preset-okabe-ito' });
    }
    return { kind: 'deleted' as const };
  }

  function setDefaultColorScheme(id: string) {
    const palette = getColorScheme(id);
    if (!palette) {
      return null;
    }
    setDefaultStatement.run({ id });
    return getColorScheme(id)!;
  }

  return {
    listColorSchemes,
    getColorScheme,
    createColorScheme,
    copyColorScheme,
    updateColorScheme,
    deleteColorScheme,
    setDefaultColorScheme,
  };
}

function rowToColorScheme(row: CustomPaletteRow, defaultId: string): ColorScheme {
  const parsed = JSON.parse(row.colorsJson) as unknown;
  if (!isCompleteColorPalette(parsed)) {
    throw new Error(`Invalid stored color palette: ${row.id}`);
  }

  return {
    id: row.id,
    name: row.name,
    description: '自定义配色',
    colors: parsed,
    isDefault: row.id === defaultId,
    isPreset: false,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
