import { describe, expect, it } from 'vitest';

import { buildGenerationPayload, mergeReferenceImageFields, normalizeWorkspace } from '../src/lib/workspacePayload';

describe('workspace payload helpers', () => {
  it('normalizes empty workspace data without dropping user-editable fields', () => {
    const workspace = normalizeWorkspace({
      prompt: ' paper figure ',
      size: '',
      quality: '',
      colorSchemeId: '',
      customColors: null,
      count: 9,
      referenceImages: [{
        path: '/data/ref.png',
        name: 'ref.png',
        mimeType: 'image/png',
      }],
      updatedAt: 'now',
    });

    expect(workspace).toMatchObject({
      prompt: ' paper figure ',
      size: 'auto',
      quality: 'high',
      colorSchemeId: 'preset-okabe-ito',
      count: 4,
      referenceImages: [{
        path: '/data/ref.png',
        name: 'ref.png',
        mimeType: 'image/png',
      }],
    });
  });

  it('preserves the explicit no-palette option', () => {
    const payload = buildGenerationPayload({
      prompt: 'cell diagram',
      size: 'auto',
      quality: 'high',
      colorSchemeId: 'none',
      customColors: null,
      count: 1,
      referenceImages: [],
      updatedAt: 'now',
    });

    expect(payload.colorSchemeId).toBe('none');
    expect(payload.size).toBe('auto');
  });

  it('builds the generation payload expected by the backend', () => {
    const payload = buildGenerationPayload({
      prompt: 'cell diagram',
      size: '1536x1024',
      quality: 'medium',
      colorSchemeId: 'custom-a',
      customColors: null,
      count: 2,
      referenceImages: [
        {
          path: '/data/workspace/reference-images/a.png',
          name: 'a.png',
          mimeType: 'image/png',
        },
        {
          path: '/data/workspace/reference-images/b.png',
          name: 'b.png',
          mimeType: 'image/png',
        },
      ],
      updatedAt: 'now',
    });

    expect(payload).toEqual({
      prompt: 'cell diagram',
      size: '1536x1024',
      quality: 'medium',
      colorSchemeId: 'custom-a',
      customColors: null,
      count: 2,
      referenceImages: [
        {
          path: '/data/workspace/reference-images/a.png',
          name: 'a.png',
          mimeType: 'image/png',
        },
        {
          path: '/data/workspace/reference-images/b.png',
          name: 'b.png',
          mimeType: 'image/png',
        },
      ],
    });
  });

  it('does not keep legacy single reference image fields', () => {
    const workspace = normalizeWorkspace({
      prompt: 'no ref',
    });

    expect(workspace.referenceImages).toEqual([]);
  });

  it('merges reference image server responses without overwriting local prompt edits', () => {
    const current = normalizeWorkspace({
      prompt: 'unsaved local prompt',
      size: '1024x1536',
      quality: 'high',
      colorSchemeId: 'none',
      customColors: null,
      count: 1,
      referenceImages: [
        {
          path: '/data/workspace/reference-images/a.png',
          name: 'a.png',
          mimeType: 'image/png',
        },
      ],
      updatedAt: 'local',
    });

    const serverResponse = normalizeWorkspace({
      prompt: 'old persisted prompt',
      size: 'auto',
      quality: 'medium',
      colorSchemeId: 'preset-okabe-ito',
      customColors: null,
      count: 4,
      referenceImages: [
        {
          path: '/data/workspace/reference-images/b.png',
          name: 'b.png',
          mimeType: 'image/png',
        },
        {
          path: '/data/workspace/reference-images/c.png',
          name: 'c.png',
          mimeType: 'image/png',
        },
      ],
      updatedAt: 'server',
    });

    expect(mergeReferenceImageFields(current, serverResponse)).toMatchObject({
      prompt: 'unsaved local prompt',
      size: '1024x1536',
      quality: 'high',
      colorSchemeId: 'none',
      count: 1,
      referenceImages: [
        {
          path: '/data/workspace/reference-images/b.png',
          name: 'b.png',
          mimeType: 'image/png',
        },
        {
          path: '/data/workspace/reference-images/c.png',
          name: 'c.png',
          mimeType: 'image/png',
        },
      ],
      updatedAt: 'server',
    });
  });
});
