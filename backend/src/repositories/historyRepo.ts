import { randomUUID } from 'node:crypto';
import type { SqliteDatabase } from '../db/client.js';

export type HistoryStatus = 'pending' | 'running' | 'completed' | 'failed';

export type HistoryImageRecord = {
  id: string;
  jobId: string;
  prompt: string;
  size: string;
  quality: string;
  colorSchemeId: string;
  customColors: Record<string, string> | null;
  referenceImagePath: string | null;
  imagePath: string | null;
  status: HistoryStatus;
  width: number | null;
  height: number | null;
  fileSize: number | null;
  error: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type HistoryJobRecord = {
  id: string;
  prompt: string;
  size: string;
  quality: string;
  colorSchemeId: string;
  customColors: Record<string, string> | null;
  count: number;
  referenceImagePath: string | null;
  status: 'pending' | 'running' | 'completed' | 'failed';
  completedCount: number;
  failedCount: number;
  error: string | null;
  createdAt: string;
  updatedAt: string;
};

export type HistoryJobWithImages = HistoryJobRecord & {
  images: HistoryImageRecord[];
};

export type CreateJobInput = {
  prompt: string;
  size: string;
  quality: string;
  colorSchemeId: string;
  customColors: Record<string, string> | null;
  count: number;
  referenceImagePath: string | null;
};

export type CreateImageInput = {
  jobId: string;
  prompt: string;
  size: string;
  quality: string;
  colorSchemeId: string;
  customColors: Record<string, string> | null;
  referenceImagePath: string | null;
  status: HistoryStatus;
  position: number;
  imagePath: string | null;
  width: number | null;
  height: number | null;
  fileSize: number | null;
  error: string | null;
};

export type HistoryRepo = ReturnType<typeof createMemoryHistoryRepo>;

export function createMemoryHistoryRepo() {
  const jobs = new Map<string, HistoryJobRecord>();
  const images = new Map<string, HistoryImageRecord>();

  function cloneImage(image: HistoryImageRecord): HistoryImageRecord {
    return {
      ...image,
      customColors: image.customColors ? { ...image.customColors } : null,
    };
  }

  function cloneJob(job: HistoryJobRecord): HistoryJobRecord {
    return {
      ...job,
      customColors: job.customColors ? { ...job.customColors } : null,
    };
  }

  function listImagesForJob(jobId: string) {
    return Array.from(images.values())
      .filter((image) => image.jobId === jobId)
      .sort((a, b) => a.position - b.position)
      .map(cloneImage);
  }

  function sortByNewest<T extends { createdAt: string; position?: number }>(rows: T[]) {
    return rows.sort((a, b) => {
      if (a.createdAt === b.createdAt) {
        return (a.position ?? 0) - (b.position ?? 0);
      }
      return a.createdAt < b.createdAt ? 1 : -1;
    });
  }

  async function createJob(input: CreateJobInput): Promise<HistoryJobRecord> {
    const now = new Date().toISOString();
    const job: HistoryJobRecord = {
      id: randomUUID(),
      prompt: input.prompt,
      size: input.size,
      quality: input.quality,
      colorSchemeId: input.colorSchemeId,
      customColors: input.customColors ? { ...input.customColors } : null,
      count: input.count,
      referenceImagePath: input.referenceImagePath,
      status: 'pending',
      completedCount: 0,
      failedCount: 0,
      error: null,
      createdAt: now,
      updatedAt: now,
    };
    jobs.set(job.id, job);
    return cloneJob(job);
  }

  async function updateJob(id: string, patch: Partial<HistoryJobRecord>): Promise<HistoryJobRecord> {
    const current = jobs.get(id);
    if (!current) {
      throw new Error(`Job not found: ${id}`);
    }
    const next: HistoryJobRecord = {
      ...current,
      ...patch,
      customColors: patch.customColors
        ? { ...patch.customColors }
        : patch.customColors === null
          ? null
          : current.customColors
            ? { ...current.customColors }
            : null,
      updatedAt: new Date().toISOString(),
    };
    jobs.set(id, next);
    return cloneJob(next);
  }

  async function getJob(id: string): Promise<HistoryJobRecord | null> {
    const job = jobs.get(id);
    return job ? cloneJob(job) : null;
  }

  async function listActiveJobs(): Promise<HistoryJobWithImages[]> {
    return sortByNewest(
      Array.from(jobs.values())
        .filter((job) => job.status === 'pending' || job.status === 'running')
        .map((job) => ({
          ...cloneJob(job),
          images: listImagesForJob(job.id),
        })),
    );
  }

  async function createImage(input: CreateImageInput): Promise<HistoryImageRecord> {
    const now = new Date().toISOString();
    const image: HistoryImageRecord = {
      id: randomUUID(),
      jobId: input.jobId,
      prompt: input.prompt,
      size: input.size,
      quality: input.quality,
      colorSchemeId: input.colorSchemeId,
      customColors: input.customColors ? { ...input.customColors } : null,
      referenceImagePath: input.referenceImagePath,
      imagePath: input.imagePath,
      status: input.status,
      width: input.width,
      height: input.height,
      fileSize: input.fileSize,
      error: input.error,
      position: input.position,
      createdAt: now,
      updatedAt: now,
    };
    images.set(image.id, image);
    return cloneImage(image);
  }

  async function updateImage(id: string, patch: Partial<HistoryImageRecord>): Promise<HistoryImageRecord> {
    const current = images.get(id);
    if (!current) {
      throw new Error(`Image not found: ${id}`);
    }
    const next: HistoryImageRecord = {
      ...current,
      ...patch,
      customColors: patch.customColors
        ? { ...patch.customColors }
        : patch.customColors === null
          ? null
          : current.customColors
            ? { ...current.customColors }
            : null,
      updatedAt: new Date().toISOString(),
    };
    images.set(id, next);
    return cloneImage(next);
  }

  async function getImage(id: string): Promise<HistoryImageRecord | null> {
    const image = images.get(id);
    return image ? cloneImage(image) : null;
  }

  async function listJobImages(jobId: string): Promise<HistoryImageRecord[]> {
    return listImagesForJob(jobId);
  }

  async function listCompletedImages(): Promise<HistoryImageRecord[]> {
    return sortByNewest(
      Array.from(images.values())
        .filter((image) => image.status === 'completed')
        .map(cloneImage),
    );
  }

  async function searchHistory(query: string): Promise<HistoryImageRecord[]> {
    const needle = query.trim().toLowerCase();
    return sortByNewest(
      Array.from(images.values())
        .filter((image) => image.status === 'completed' || image.status === 'failed')
        .filter((image) => !needle || image.prompt.toLowerCase().includes(needle))
        .map(cloneImage),
    );
  }

  async function deleteImage(id: string): Promise<void> {
    images.delete(id);
  }

  async function createCompletedImage(input: {
    jobId: string;
    prompt: string;
    status: 'completed';
    imagePath: string;
  }): Promise<HistoryImageRecord> {
    return createImage({
      jobId: input.jobId,
      prompt: input.prompt,
      size: '1024x1024',
      quality: 'high',
      colorSchemeId: 'preset-okabe-ito',
      customColors: null,
      referenceImagePath: null,
      status: input.status,
      position: images.size,
      imagePath: input.imagePath,
      width: 1024,
      height: 1024,
      fileSize: null,
      error: null,
    });
  }

  async function createFailedImage(input: {
    jobId: string;
    prompt: string;
    status: 'failed';
    error: string;
  }): Promise<HistoryImageRecord> {
    return createImage({
      jobId: input.jobId,
      prompt: input.prompt,
      size: '1024x1024',
      quality: 'high',
      colorSchemeId: 'preset-okabe-ito',
      customColors: null,
      referenceImagePath: null,
      status: input.status,
      position: images.size,
      imagePath: null,
      width: null,
      height: null,
      fileSize: null,
      error: input.error,
    });
  }

  return {
    createJob,
    updateJob,
    getJob,
    listActiveJobs,
    createImage,
    updateImage,
    getImage,
    listJobImages,
    listCompletedImages,
    searchHistory,
    deleteImage,
    createCompletedImage,
    createFailedImage,
  };
}

export function createSqliteHistoryRepo(db: SqliteDatabase) {
  const insertJobStatement = db.prepare(
    `INSERT INTO generation_jobs (
       id,
       prompt,
       size,
       quality,
       color_scheme_id,
       custom_colors_json,
       count,
       reference_image_path,
       status,
       completed_count,
       failed_count,
       error_message,
       created_at,
       updated_at
     ) VALUES (
       @id,
       @prompt,
       @size,
       @quality,
       @colorSchemeId,
       @customColorsJson,
       @count,
       @referenceImagePath,
       @status,
       @completedCount,
       @failedCount,
       @error,
       CURRENT_TIMESTAMP,
       CURRENT_TIMESTAMP
     )`,
  );

  const updateJobStatement = db.prepare(
    `UPDATE generation_jobs
     SET prompt = @prompt,
         size = @size,
         quality = @quality,
         color_scheme_id = @colorSchemeId,
         custom_colors_json = @customColorsJson,
         count = @count,
         reference_image_path = @referenceImagePath,
         status = @status,
         completed_count = @completedCount,
         failed_count = @failedCount,
         error_message = @error,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = @id`,
  );

  const selectJobStatement = db.prepare(
    `SELECT
       id,
       prompt,
       size,
       quality,
       color_scheme_id AS colorSchemeId,
       custom_colors_json AS customColorsJson,
       count,
       reference_image_path AS referenceImagePath,
       status,
       completed_count AS completedCount,
       failed_count AS failedCount,
       error_message AS error,
       created_at AS createdAt,
       updated_at AS updatedAt
     FROM generation_jobs
     WHERE id = ?`,
  );

  const selectActiveJobsStatement = db.prepare(
    `SELECT
       id,
       prompt,
       size,
       quality,
       color_scheme_id AS colorSchemeId,
       custom_colors_json AS customColorsJson,
       count,
       reference_image_path AS referenceImagePath,
       status,
       completed_count AS completedCount,
       failed_count AS failedCount,
       error_message AS error,
       created_at AS createdAt,
       updated_at AS updatedAt
     FROM generation_jobs
     WHERE status IN ('pending', 'running')
     ORDER BY created_at ASC`,
  );

  const selectImagesByJobStatement = db.prepare(
    `SELECT
       id,
       job_id AS jobId,
       prompt,
       size,
       quality,
       color_scheme_id AS colorSchemeId,
       custom_colors_json AS customColorsJson,
       reference_image_path AS referenceImagePath,
       image_path AS imagePath,
       status,
       width,
       height,
       file_size AS fileSize,
       error_message AS error,
       position,
       created_at AS createdAt,
       updated_at AS updatedAt
     FROM generation_images
     WHERE job_id = ?
     ORDER BY position ASC`,
  );

  const insertImageStatement = db.prepare(
    `INSERT INTO generation_images (
       id,
       job_id,
       prompt,
       size,
       quality,
       color_scheme_id,
       custom_colors_json,
       reference_image_path,
       image_path,
       status,
       width,
       height,
       file_size,
       error_message,
       position,
       created_at,
       updated_at
     ) VALUES (
       @id,
       @jobId,
       @prompt,
       @size,
       @quality,
       @colorSchemeId,
       @customColorsJson,
       @referenceImagePath,
       @imagePath,
       @status,
       @width,
       @height,
       @fileSize,
       @error,
       @position,
       CURRENT_TIMESTAMP,
       CURRENT_TIMESTAMP
     )`,
  );

  const updateImageStatement = db.prepare(
    `UPDATE generation_images
     SET prompt = @prompt,
         size = @size,
         quality = @quality,
         color_scheme_id = @colorSchemeId,
         custom_colors_json = @customColorsJson,
         reference_image_path = @referenceImagePath,
         image_path = @imagePath,
         status = @status,
         width = @width,
         height = @height,
         file_size = @fileSize,
         error_message = @error,
         position = @position,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = @id`,
  );

  const selectImageStatement = db.prepare(
    `SELECT
       id,
       job_id AS jobId,
       prompt,
       size,
       quality,
       color_scheme_id AS colorSchemeId,
       custom_colors_json AS customColorsJson,
       reference_image_path AS referenceImagePath,
       image_path AS imagePath,
       status,
       width,
       height,
       file_size AS fileSize,
       error_message AS error,
       position,
       created_at AS createdAt,
       updated_at AS updatedAt
     FROM generation_images
     WHERE id = ?`,
  );

  const selectCompletedImagesStatement = db.prepare(
    `SELECT
       id,
       job_id AS jobId,
       prompt,
       size,
       quality,
       color_scheme_id AS colorSchemeId,
       custom_colors_json AS customColorsJson,
       reference_image_path AS referenceImagePath,
       image_path AS imagePath,
       status,
       width,
       height,
       file_size AS fileSize,
       error_message AS error,
       position,
       created_at AS createdAt,
       updated_at AS updatedAt
     FROM generation_images
     WHERE status = 'completed'
     ORDER BY created_at DESC`,
  );

  const searchImagesStatement = db.prepare(
    `SELECT
       id,
       job_id AS jobId,
       prompt,
       size,
       quality,
       color_scheme_id AS colorSchemeId,
       custom_colors_json AS customColorsJson,
       reference_image_path AS referenceImagePath,
       image_path AS imagePath,
       status,
       width,
       height,
       file_size AS fileSize,
       error_message AS error,
       position,
       created_at AS createdAt,
       updated_at AS updatedAt
     FROM generation_images
     WHERE status IN ('completed', 'failed')
       AND lower(prompt) LIKE lower(?)
     ORDER BY created_at DESC`,
  );

  const deleteImageStatement = db.prepare('DELETE FROM generation_images WHERE id = ?');

  function parseCustomColors(raw: string | null) {
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, string>;
      }
    } catch {
      // Ignore malformed JSON.
    }

    return null;
  }

  function toJob(row: Record<string, unknown>): HistoryJobRecord {
    return {
      id: String(row.id),
      prompt: String(row.prompt),
      size: String(row.size),
      quality: String(row.quality),
      colorSchemeId: String(row.colorSchemeId),
      customColors: parseCustomColors((row.customColorsJson as string | null) ?? null),
      count: Number(row.count),
      referenceImagePath: (row.referenceImagePath as string | null) ?? null,
      status: row.status as HistoryJobRecord['status'],
      completedCount: Number(row.completedCount ?? 0),
      failedCount: Number(row.failedCount ?? 0),
      error: (row.error as string | null) ?? null,
      createdAt: String(row.createdAt),
      updatedAt: String(row.updatedAt),
    };
  }

  function toImage(row: Record<string, unknown>): HistoryImageRecord {
    return {
      id: String(row.id),
      jobId: String(row.jobId),
      prompt: String(row.prompt),
      size: String(row.size),
      quality: String(row.quality),
      colorSchemeId: String(row.colorSchemeId),
      customColors: parseCustomColors((row.customColorsJson as string | null) ?? null),
      referenceImagePath: (row.referenceImagePath as string | null) ?? null,
      imagePath: (row.imagePath as string | null) ?? null,
      status: row.status as HistoryStatus,
      width: row.width === null || row.width === undefined ? null : Number(row.width),
      height: row.height === null || row.height === undefined ? null : Number(row.height),
      fileSize: row.fileSize === null || row.fileSize === undefined ? null : Number(row.fileSize),
      error: (row.error as string | null) ?? null,
      position: Number(row.position ?? 0),
      createdAt: String(row.createdAt),
      updatedAt: String(row.updatedAt),
    };
  }

  return {
    async createJob(input: CreateJobInput) {
      const job: HistoryJobRecord = {
        id: randomUUID(),
        prompt: input.prompt,
        size: input.size,
        quality: input.quality,
        colorSchemeId: input.colorSchemeId,
        customColors: input.customColors ? { ...input.customColors } : null,
        count: input.count,
        referenceImagePath: input.referenceImagePath,
        status: 'pending',
        completedCount: 0,
        failedCount: 0,
        error: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      insertJobStatement.run({
        ...job,
        customColorsJson: job.customColors ? JSON.stringify(job.customColors) : null,
      });
      return job;
    },
    async updateJob(id: string, patch: Partial<HistoryJobRecord>) {
      const current = await this.getJob(id);
      if (!current) {
        throw new Error(`Job not found: ${id}`);
      }
      const next: HistoryJobRecord = {
        ...current,
        ...patch,
        customColors: patch.customColors
          ? { ...patch.customColors }
          : patch.customColors === null
            ? null
            : current.customColors
              ? { ...current.customColors }
              : null,
        updatedAt: new Date().toISOString(),
      };
      updateJobStatement.run({
        ...next,
        customColorsJson: next.customColors ? JSON.stringify(next.customColors) : null,
      });
      return next;
    },
    async getJob(id: string) {
      const row = selectJobStatement.get(id);
      return row ? toJob(row as Record<string, unknown>) : null;
    },
    async listActiveJobs() {
      const rows = selectActiveJobsStatement.all() as Record<string, unknown>[];
      return rows.map((row) => ({
        ...toJob(row),
        images: (selectImagesByJobStatement.all(row.id) as Record<string, unknown>[]).map((imageRow) =>
          toImage(imageRow),
        ),
      }));
    },
    async createImage(input: CreateImageInput) {
      const image: HistoryImageRecord = {
        id: randomUUID(),
        jobId: input.jobId,
        prompt: input.prompt,
        size: input.size,
        quality: input.quality,
        colorSchemeId: input.colorSchemeId,
        customColors: input.customColors ? { ...input.customColors } : null,
        referenceImagePath: input.referenceImagePath,
        imagePath: input.imagePath,
        status: input.status,
        width: input.width,
        height: input.height,
        fileSize: input.fileSize,
        error: input.error,
        position: input.position,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      insertImageStatement.run({
        ...image,
        customColorsJson: image.customColors ? JSON.stringify(image.customColors) : null,
      });
      return image;
    },
    async updateImage(id: string, patch: Partial<HistoryImageRecord>) {
      const current = await this.getImage(id);
      if (!current) {
        throw new Error(`Image not found: ${id}`);
      }
      const next: HistoryImageRecord = {
        ...current,
        ...patch,
        customColors: patch.customColors
          ? { ...patch.customColors }
          : patch.customColors === null
            ? null
            : current.customColors
              ? { ...current.customColors }
              : null,
        updatedAt: new Date().toISOString(),
      };
      updateImageStatement.run({
        ...next,
        customColorsJson: next.customColors ? JSON.stringify(next.customColors) : null,
      });
      return next;
    },
    async getImage(id: string) {
      const row = selectImageStatement.get(id);
      return row ? toImage(row as Record<string, unknown>) : null;
    },
    async listJobImages(jobId: string) {
      return (selectImagesByJobStatement.all(jobId) as Record<string, unknown>[]).map((imageRow) => toImage(imageRow));
    },
    async listCompletedImages() {
      return (selectCompletedImagesStatement.all() as Record<string, unknown>[]).map((imageRow) => toImage(imageRow));
    },
    async searchHistory(query: string) {
      const needle = `%${query.trim()}%`;
      return (searchImagesStatement.all(needle) as Record<string, unknown>[]).map((imageRow) => toImage(imageRow));
    },
    async deleteImage(id: string) {
      deleteImageStatement.run(id);
    },
    async createCompletedImage(input: {
      jobId: string;
      prompt: string;
      status: 'completed';
      imagePath: string;
    }) {
      return this.createImage({
        jobId: input.jobId,
        prompt: input.prompt,
        size: '1024x1024',
        quality: 'high',
        colorSchemeId: 'preset-okabe-ito',
        customColors: null,
        referenceImagePath: null,
        status: input.status,
        position: 0,
        imagePath: input.imagePath,
        width: 1024,
        height: 1024,
        fileSize: null,
        error: null,
      });
    },
    async createFailedImage(input: {
      jobId: string;
      prompt: string;
      status: 'failed';
      error: string;
    }) {
      return this.createImage({
        jobId: input.jobId,
        prompt: input.prompt,
        size: '1024x1024',
        quality: 'high',
        colorSchemeId: 'preset-okabe-ito',
        customColors: null,
        referenceImagePath: null,
        status: input.status,
        position: 0,
        imagePath: null,
        width: null,
        height: null,
        fileSize: null,
        error: input.error,
      });
    },
  };
}
