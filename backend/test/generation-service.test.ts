import { describe, expect, it } from 'vitest';

import { createMemoryHistoryRepo } from '../src/repositories/historyRepo';
import { createGenerationService } from '../src/services/generationService';

describe('generation service', () => {
  it('creates up to four output rows and completes them one by one', async () => {
    const repo = createMemoryHistoryRepo();
    const fileStore = {
      async writeFile(_path: string, _bytes: Buffer) {},
      async exists(_path: string) {
        return true;
      },
      async removeFile(_path: string) {},
      async readFile(_path: string) {
        return Buffer.from('fake');
      },
    };
    const responses = [
      { imageBase64: 'ZmFrZS0x', width: 1024, height: 1024 },
      { imageBase64: 'ZmFrZS0y', width: 1024, height: 1024 },
      { imageBase64: 'ZmFrZS0z', width: 1024, height: 1024 },
      { imageBase64: 'ZmFrZS00', width: 1024, height: 1024 },
    ];
    const gateway = {
      async generateImage() {
        const next = responses.shift();
        if (!next) {
          throw new Error('unexpected extra gateway call');
        }
        return next;
      },
      async editImage() {
        throw new Error('unexpected edit call');
      },
    };

    const service = createGenerationService({ repo, fileStore, gateway });
    const job = await service.startBatch({
      prompt: 'cell diagram',
      size: '1024x1024',
      quality: 'high',
      colorSchemeId: 'preset-okabe-ito',
      customColors: null,
      count: 4,
      referenceImages: [],
    });

    await service.waitForIdle();

    const items = await repo.listCompletedImages();
    expect(job.requestedCount).toBe(4);
    expect(items).toHaveLength(4);
    expect(items.every((item) => item.prompt === 'cell diagram')).toBe(true);
  });

  it('does not append palette instructions when color scheme is none', async () => {
    const repo = createMemoryHistoryRepo();
    const prompts: string[] = [];
    const fileStore = {
      async writeFile(_path: string, _bytes: Buffer) {},
      async exists(_path: string) {
        return false;
      },
      async removeFile(_path: string) {},
      async readFile(_path: string) {
        return Buffer.from('fake');
      },
    };
    const gateway = {
      async generateImage(input: { prompt: string }) {
        prompts.push(input.prompt);
        return { imageBase64: 'ZmFrZQ==', width: 1024, height: 1024 };
      },
      async editImage() {
        throw new Error('unexpected edit call');
      },
    };

    const service = createGenerationService({ repo, fileStore, gateway });
    await service.startBatch({
      prompt: 'plain prompt',
      size: 'auto',
      quality: 'high',
      colorSchemeId: 'none',
      customColors: null,
      count: 1,
      referenceImages: [],
    });

    await service.waitForIdle();

    expect(prompts).toEqual(['plain prompt']);
  });

  it('uses all stored relative file paths when the client submits public reference image URLs', async () => {
    const repo = createMemoryHistoryRepo();
    const existsCalls: string[] = [];
    const readCalls: string[] = [];
    const editInputs: Array<{ referenceImages: Array<{ name?: string | null; mimeType: string }> }> = [];
    const fileStore = {
      async writeFile(_path: string, _bytes: Buffer) {},
      async exists(path: string) {
        existsCalls.push(path);
        return path === 'workspace/reference-images/a.png' || path === 'workspace/reference-images/b.png';
      },
      async removeFile(_path: string) {},
      async readFile(path: string) {
        readCalls.push(path);
        return Buffer.from('fake');
      },
    };
    const gateway = {
      async generateImage() {
        throw new Error('unexpected generate call');
      },
      async editImage(input: { referenceImages: Array<{ name?: string | null; mimeType: string }> }) {
        editInputs.push(input);
        return { imageBase64: 'ZmFrZQ==', width: 1024, height: 1024, mimeType: 'image/png' };
      },
    };

    const service = createGenerationService({ repo, fileStore, gateway });
    await service.startBatch({
      prompt: 'edit prompt',
      size: '1024x1024',
      quality: 'high',
      colorSchemeId: 'none',
      customColors: null,
      count: 1,
      referenceImages: [
        {
          path: '/data/workspace/reference-images/a.png',
          name: 'reference-a.png',
          mimeType: 'image/png',
        },
        {
          path: '/data/workspace/reference-images/b.png',
          name: 'reference-b.png',
          mimeType: 'image/png',
        },
      ],
    });

    await service.waitForIdle();

    expect(existsCalls).toEqual(['workspace/reference-images/a.png', 'workspace/reference-images/b.png']);
    expect(readCalls).toEqual(['workspace/reference-images/a.png', 'workspace/reference-images/b.png']);
    expect(editInputs).toHaveLength(1);
    expect(editInputs[0]?.referenceImages).toMatchObject([
      { name: 'reference-a.png', mimeType: 'image/png' },
      { name: 'reference-b.png', mimeType: 'image/png' },
    ]);
  });

  it('keeps failed records searchable and deletes one image without removing siblings', async () => {
    const repo = createMemoryHistoryRepo();
    const first = await repo.createCompletedImage({
      jobId: 'job-a',
      prompt: 'cell diagram',
      status: 'completed',
      imagePath: '/tmp/a.png',
    });
    await repo.createFailedImage({
      jobId: 'job-a',
      prompt: 'cell membrane',
      status: 'failed',
      error: 'boom',
    });
    const second = await repo.createCompletedImage({
      jobId: 'job-b',
      prompt: 'network graph',
      status: 'completed',
      imagePath: '/tmp/b.png',
    });

    const search = await repo.searchHistory('cell');
    expect(search).toHaveLength(2);

    await repo.deleteImage(first.id);
    const remaining = await repo.listCompletedImages();
    expect(remaining.some((item) => item.id === second.id)).toBe(true);
  });
});
