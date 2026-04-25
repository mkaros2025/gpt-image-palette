import type { SqliteDatabase } from '../db/client.js';

export type CustomColors = Record<string, string> | null;

export type ReferenceImage = {
  path: string;
  name: string | null;
  mimeType: string | null;
};

export type WorkspaceState = {
  prompt: string;
  size: string;
  quality: string;
  colorSchemeId: string;
  customColors: CustomColors;
  count: number;
  referenceImages: ReferenceImage[];
  updatedAt: string;
};

type WorkspaceRow = {
  prompt: string;
  size: string;
  quality: string;
  colorSchemeId: string;
  customColorsJson: string | null;
  count: number;
  referenceImagesJson: string | null;
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
       reference_images_json AS referenceImagesJson,
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

  const setReferenceImagesStatement = db.prepare(
    `UPDATE workspace_state
     SET reference_images_json = @referenceImagesJson,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = 1`,
  );

  function getWorkspace(): WorkspaceState {
    const row = getStatement.get() as WorkspaceRow | undefined;
    if (!row) {
      return {
        prompt: '',
        size: 'auto',
        quality: 'high',
        colorSchemeId: 'preset-okabe-ito',
        customColors: null,
        count: 1,
        referenceImages: [],
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
      referenceImages: parseReferenceImages(row.referenceImagesJson),
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
    setReferenceImages(referenceImages: ReferenceImage[]): WorkspaceState {
      const normalized = referenceImages.filter((image) => image.path);
      setReferenceImagesStatement.run({
        referenceImagesJson: normalized.length ? JSON.stringify(normalized) : null,
      });
      return getWorkspace();
    },
    clearReferenceImages(): WorkspaceState {
      setReferenceImagesStatement.run({ referenceImagesJson: null });
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

function parseReferenceImages(raw: string | null): ReferenceImage[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => {
          if (!item || typeof item !== 'object') {
            return null;
          }
          const record = item as Record<string, unknown>;
          const path = typeof record.path === 'string' ? record.path : null;
          if (!path) {
            return null;
          }
          return {
            path,
            name: typeof record.name === 'string' ? record.name : null,
            mimeType: typeof record.mimeType === 'string' ? record.mimeType : null,
          };
        })
        .filter((item): item is ReferenceImage => Boolean(item));
    }
  } catch {
    // Ignore malformed JSON.
  }

  return [];
}
