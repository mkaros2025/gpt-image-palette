import type { Workspace } from './types';

export const DEFAULT_WORKSPACE: Workspace = {
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

export function normalizeWorkspace(input: Partial<Workspace> | null | undefined): Workspace {
  return {
    ...DEFAULT_WORKSPACE,
    ...(input ?? {}),
    size: input?.size || DEFAULT_WORKSPACE.size,
    quality: input?.quality || DEFAULT_WORKSPACE.quality,
    colorSchemeId: input?.colorSchemeId || DEFAULT_WORKSPACE.colorSchemeId,
    count: clampCount(input?.count ?? DEFAULT_WORKSPACE.count),
  };
}

export function buildWorkspacePayload(workspace: Workspace) {
  return {
    prompt: workspace.prompt,
    size: workspace.size,
    quality: workspace.quality,
    colorSchemeId: workspace.colorSchemeId,
    customColors: workspace.customColors,
    count: clampCount(workspace.count),
  };
}

export function buildGenerationPayload(workspace: Workspace) {
  return {
    ...buildWorkspacePayload(workspace),
    referenceImagePath: workspace.referenceImagePath,
    referenceImageName: workspace.referenceImageName,
    referenceImageMimeType: workspace.referenceImageMimeType,
  };
}

function clampCount(count: number) {
  return Math.min(4, Math.max(1, Math.trunc(count)));
}
