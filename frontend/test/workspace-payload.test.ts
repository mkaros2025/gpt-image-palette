import { describe, expect, it } from 'vitest';

import { buildGenerationPayload, normalizeWorkspace } from '../src/lib/workspacePayload';

describe('workspace payload helpers', () => {
  it('normalizes empty workspace data without dropping user-editable fields', () => {
    const workspace = normalizeWorkspace({
      prompt: ' paper figure ',
      size: '',
      quality: '',
      colorSchemeId: '',
      customColors: null,
      count: 9,
      referenceImagePath: '/data/ref.png',
      referenceImageName: 'ref.png',
      referenceImageMimeType: 'image/png',
      updatedAt: 'now',
    });

    expect(workspace).toMatchObject({
      prompt: ' paper figure ',
      size: '1024x1024',
      quality: 'high',
      colorSchemeId: 'preset-okabe-ito',
      count: 4,
      referenceImagePath: '/data/ref.png',
    });
  });

  it('builds the generation payload expected by the backend', () => {
    const payload = buildGenerationPayload({
      prompt: 'cell diagram',
      size: '1536x1024',
      quality: 'medium',
      colorSchemeId: 'custom-a',
      customColors: null,
      count: 2,
      referenceImagePath: '/data/workspace/reference-images/a.png',
      referenceImageName: 'a.png',
      referenceImageMimeType: 'image/png',
      updatedAt: 'now',
    });

    expect(payload).toEqual({
      prompt: 'cell diagram',
      size: '1536x1024',
      quality: 'medium',
      colorSchemeId: 'custom-a',
      customColors: null,
      count: 2,
      referenceImagePath: '/data/workspace/reference-images/a.png',
      referenceImageName: 'a.png',
      referenceImageMimeType: 'image/png',
    });
  });
});
