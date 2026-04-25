import type { Workspace } from './types';

export const DEFAULT_WORKSPACE: Workspace = {
  prompt: '',
  size: 'auto',
  quality: 'high',
  colorSchemeId: 'preset-okabe-ito',
  customColors: null,
  count: 1,
  referenceImages: [],
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
    referenceImages: normalizeReferenceImages(input?.referenceImages),
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
    referenceImages: normalizeReferenceImages(workspace.referenceImages),
  };
}

export function mergeReferenceImageFields(current: Workspace, serverWorkspace: Workspace): Workspace {
  return normalizeWorkspace({
    ...current,
    referenceImages: serverWorkspace.referenceImages,
    updatedAt: serverWorkspace.updatedAt,
  });
}

function clampCount(count: number) {
  return Math.min(4, Math.max(1, Math.trunc(count)));
}

function normalizeReferenceImages(referenceImages: Workspace['referenceImages'] | null | undefined) {
  if (!Array.isArray(referenceImages)) {
    return [];
  }

  return referenceImages
    .filter((image) => image && typeof image.path === 'string' && image.path.trim())
    .map((image) => ({
      path: image.path,
      name: typeof image.name === 'string' ? image.name : null,
      mimeType: typeof image.mimeType === 'string' ? image.mimeType : null,
    }));
}
