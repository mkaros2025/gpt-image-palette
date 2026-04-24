export type Settings = {
  baseUrl: string;
  apiKey: string;
  updatedAt: string;
};

export type PaletteColors = {
  primary: string;
  secondary: string;
  tertiary: string;
  text: string;
  fill: string;
  section_bg: string;
  border: string;
  arrow: string;
};

export type ColorScheme = {
  id: string;
  name: string;
  description: string;
  colors: PaletteColors;
  isDefault: boolean;
  isPreset: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

export type Workspace = {
  prompt: string;
  size: string;
  quality: string;
  colorSchemeId: string;
  customColors: PaletteColors | null;
  count: number;
  referenceImagePath: string | null;
  referenceImageName: string | null;
  referenceImageMimeType: string | null;
  updatedAt: string;
};

export type GenerationJob = {
  id: string;
  prompt: string;
  size: string;
  quality: string;
  colorSchemeId: string;
  count: number;
  status: string;
  completedCount: number;
  failedCount: number;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type HistoryItem = {
  id: string;
  jobId: string;
  prompt: string;
  size: string;
  quality: string;
  colorSchemeId: string;
  customColors: PaletteColors | null;
  referenceImagePath: string | null;
  imagePath: string | null;
  status: string;
  width: number | null;
  height: number | null;
  fileSize: number | null;
  errorMessage: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
  previewUrl: string | null;
  downloadUrl: string;
};
