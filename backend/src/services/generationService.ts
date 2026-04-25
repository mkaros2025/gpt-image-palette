import { randomUUID } from 'node:crypto';
import { posix } from 'node:path';

import { formatColorPalettePrompt, resolveColorPalette } from '../lib/colorSchemes.js';
import type { HistoryRepo } from '../repositories/historyRepo.js';
import type { FileStore } from './fileStore.js';
import type { GatewayClient } from './gatewayClient.js';

const NO_COLOR_SCHEME_ID = 'none';

export type ReferenceImageInput = {
  path: string;
  name: string | null;
  mimeType: string | null;
};

export type StartBatchInput = {
  prompt: string;
  size: string;
  quality: string;
  colorSchemeId: string;
  customColors: Record<string, string> | null;
  count: number;
  referenceImages: ReferenceImageInput[];
};

export type GenerationServiceOptions = {
  repo: HistoryRepo;
  fileStore: FileStore;
  gateway: GatewayClient;
  getGatewayConfig?: () => { baseUrl: string; apiKey: string };
};

export type GenerationService = ReturnType<typeof createGenerationService>;

export function createGenerationService(options: GenerationServiceOptions) {
  let queue = Promise.resolve();

  async function startBatch(input: StartBatchInput) {
    const referenceImages = normalizeReferenceImages(input.referenceImages);
    const job = await options.repo.createJob({
      prompt: input.prompt,
      size: input.size,
      quality: input.quality,
      colorSchemeId: input.colorSchemeId,
      customColors: input.customColors,
      count: clampCount(input.count),
      referenceImages,
    });

    const images: Array<{ id: string }> = [];
    for (let index = 0; index < job.count; index += 1) {
      const image = await options.repo.createImage({
        jobId: job.id,
        prompt: input.prompt,
        size: input.size,
        quality: input.quality,
        colorSchemeId: input.colorSchemeId,
        customColors: input.customColors,
        referenceImages,
        status: 'pending',
        position: index,
        imagePath: null,
        width: null,
        height: null,
        fileSize: null,
        error: null,
      });
      images.push(image);
    }

    queue = queue
      .then(() => processBatch(job.id, images, { ...input, referenceImages }))
      .catch((error) => {
        // Keep the chain alive. A failed batch has already been recorded in the repo.
        console.error('generation queue error', error);
      });

    return {
      id: job.id,
      requestedCount: job.count,
      status: job.status,
    };
  }

  async function processBatch(jobId: string, images: Array<{ id: string }>, input: StartBatchInput) {
    await options.repo.updateJob(jobId, { status: 'running' as const });

    let completedCount = 0;
    let failedCount = 0;
    const palettePrompt = input.colorSchemeId === NO_COLOR_SCHEME_ID
      ? null
      : formatColorPalettePrompt(resolveColorPalette(input.colorSchemeId, input.customColors));

    for (const image of images) {
      await options.repo.updateImage(image.id, { status: 'running' as const });

      const imageRecord = await options.repo.getImage(image.id);
      if (!imageRecord) {
        continue;
      }

      try {
        const gatewayConfig = options.getGatewayConfig?.();
        const prompt = palettePrompt ? `${imageRecord.prompt}\n\n${palettePrompt}` : imageRecord.prompt;
        const existingReferenceImages = [];
        for (const image of input.referenceImages) {
          if (await options.fileStore.exists(image.path)) {
            existingReferenceImages.push(image);
          }
        }

        const result = existingReferenceImages.length
          ? await options.gateway.editImage({
              baseUrl: gatewayConfig?.baseUrl ?? '',
              apiKey: gatewayConfig?.apiKey ?? '',
              prompt,
              size: imageRecord.size,
              quality: imageRecord.quality,
              referenceImages: await Promise.all(existingReferenceImages.map(async (image) => ({
                bytes: await options.fileStore.readFile(image.path),
                mimeType: image.mimeType ?? 'image/png',
                name: image.name ?? 'reference.png',
              }))),
            })
          : await options.gateway.generateImage({
              baseUrl: gatewayConfig?.baseUrl ?? '',
              apiKey: gatewayConfig?.apiKey ?? '',
              prompt,
              size: imageRecord.size,
              quality: imageRecord.quality,
            });

        const extension = mimeToExtension(result.mimeType);
        const relativePath = posix.join(
          'generated-images',
          jobId,
          `${image.id}.${extension}`,
        );
        const bytes = Buffer.from(result.imageBase64, 'base64');
        await options.fileStore.writeFile(relativePath, bytes);

        await options.repo.updateImage(image.id, {
          status: 'completed',
          imagePath: relativePath,
          width: result.width ?? parseSize(imageRecord.size).width,
          height: result.height ?? parseSize(imageRecord.size).height,
          fileSize: bytes.length,
          error: null,
        });
        completedCount += 1;
      } catch (error) {
        await options.repo.updateImage(image.id, {
          status: 'failed',
          error: error instanceof Error ? error.message : String(error),
        });
        failedCount += 1;
      }

      await options.repo.updateJob(jobId, {
        completedCount,
        failedCount,
      });
    }

    await options.repo.updateJob(jobId, {
      status: 'completed',
      completedCount,
      failedCount,
    });
  }

  async function waitForIdle() {
    await queue;
  }

  return {
    startBatch,
    waitForIdle,
  };
}

function clampCount(count: number) {
  return Math.min(4, Math.max(1, Math.trunc(count)));
}

function normalizeReferenceImages(referenceImages: ReferenceImageInput[] | null | undefined) {
  if (!Array.isArray(referenceImages)) {
    return [];
  }

  return referenceImages
    .filter((image) => image?.path)
    .map((image) => ({
      path: image.path.startsWith('/data/')
        ? image.path.slice('/data/'.length)
        : image.path.replace(/^\/+/, ''),
      name: image.name ?? null,
      mimeType: image.mimeType ?? null,
    }));
}

function parseSize(size: string) {
  const [widthRaw, heightRaw] = size.split('x');
  const width = Number.parseInt(widthRaw ?? '', 10);
  const height = Number.parseInt(heightRaw ?? '', 10);
  return {
    width: Number.isFinite(width) ? width : 1024,
    height: Number.isFinite(height) ? height : 1024,
  };
}

function mimeToExtension(mimeType: string) {
  return {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
  }[mimeType] ?? 'png';
}
