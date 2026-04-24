import type { SqliteDatabase } from '../db/client.js';

export type CustomColors = Record<string, string> | null;

export type WorkspaceState = {
  prompt: string;
  size: string;
  quality: string;
  colorSchemeId: string;
  customColors: CustomColors;
  count: number;
  referenceImagePath: string | null;
  referenceImageName: string | null;
  referenceImageMimeType: string | null;
  updatedAt: string;
};

type WorkspaceRow = {
  prompt: string;
  size: string;
  quality: string;
  colorSchemeId: string;
  customColorsJson: string | null;
  count: number;
  referenceImagePath: string | null;
  referenceImageName: string | null;
  referenceImageMimeType: string | null;
  updatedAt: string;
};

export function createWorkspaceRepo(db: SqliteDatabase) {
  const getStatement = db.prepare(
    `SELECT
       prompt,
       size,
       quality,
       color_scheme_id AS colorSchemeId,
       custom_colors_json AS customColorsJson,
       count,
       reference_image_path AS referenceImagePath,
       reference_image_name AS referenceImageName,
       reference_image_mime_type AS referenceImageMimeType,
       updated_at AS updatedAt
     FROM workspace_state
     WHERE id = 1`,
  );

  const upsertStatement = db.prepare(
    `INSERT INTO workspace_state (
       id,
       prompt,
       size,
       quality,
       color_scheme_id,
       custom_colors_json,
       count,
       updated_at
     )
     VALUES (
       1,
       @prompt,
       @size,
       @quality,
       @colorSchemeId,
       @customColorsJson,
       @count,
       CURRENT_TIMESTAMP
     )
     ON CONFLICT(id) DO UPDATE SET
       prompt = excluded.prompt,
       size = excluded.size,
       quality = excluded.quality,
       color_scheme_id = excluded.color_scheme_id,
       custom_colors_json = excluded.custom_colors_json,
        count = excluded.count,
       updated_at = CURRENT_TIMESTAMP`,
  );

  const setReferenceStatement = db.prepare(
    `UPDATE workspace_state
     SET reference_image_path = @referenceImagePath,
         reference_image_name = @referenceImageName,
         reference_image_mime_type = @referenceImageMimeType,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = 1`,
  );

  const clearReferenceStatement = db.prepare(
    `UPDATE workspace_state
     SET reference_image_path = NULL,
         reference_image_name = NULL,
         reference_image_mime_type = NULL,
         updated_at = CURRENT_TIMESTAMP
    WHERE id = 1`,
  );

  function getWorkspace(): WorkspaceState {
    const row = getStatement.get() as WorkspaceRow | undefined;
    if (!row) {
      return {
        prompt: '',
        size: '1024x1024',
        quality: 'high',
        colorSchemeId: 'preset-okabe-ito',
        customColors: null,
        count: 1,
        referenceImagePath: null,
        referenceImageName: null,
        referenceImageMimeType: null,
        updatedAt: '',
      };
    }

    return {
      prompt: row.prompt,
      size: row.size,
      quality: row.quality,
      colorSchemeId: row.colorSchemeId,
      customColors: parseCustomColors(row.customColorsJson),
      count: row.count,
      referenceImagePath: row.referenceImagePath,
      referenceImageName: row.referenceImageName,
      referenceImageMimeType: row.referenceImageMimeType,
      updatedAt: row.updatedAt,
    };
  }

  return {
    getWorkspace,
    saveWorkspace(input: {
      prompt: string;
      size: string;
      quality: string;
      colorSchemeId: string;
      customColors: CustomColors;
      count: number;
    }): WorkspaceState {
      upsertStatement.run({
        ...input,
        customColorsJson: input.customColors ? JSON.stringify(input.customColors) : null,
      });

      return getWorkspace();
    },
    setReferenceImage(input: {
      referenceImagePath: string;
      referenceImageName: string;
      referenceImageMimeType: string;
    }): WorkspaceState {
      setReferenceStatement.run(input);
      return getWorkspace();
    },
    clearReferenceImage(): WorkspaceState {
      clearReferenceStatement.run();
      return getWorkspace();
    },
  };
}

function parseCustomColors(raw: string | null): CustomColors {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
  } catch {
    // Ignore malformed JSON and fall back to null.
  }

  return null;
}
