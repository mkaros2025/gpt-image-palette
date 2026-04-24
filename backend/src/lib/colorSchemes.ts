export const COLOR_PALETTE_SLOTS = [
  'primary',
  'secondary',
  'tertiary',
  'text',
  'fill',
  'section_bg',
  'border',
  'arrow',
] as const;

export type ColorPaletteSlot = (typeof COLOR_PALETTE_SLOTS)[number];
export type ColorPalette = Record<ColorPaletteSlot, string>;

export type ColorSchemePreset = {
  id: string;
  name: string;
  description: string;
  colors: ColorPalette;
  isDefault: boolean;
  isPreset: true;
};

export const COLOR_SCHEME_PRESETS: ColorSchemePreset[] = [
  {
    id: 'preset-okabe-ito',
    name: 'Okabe-Ito',
    description: '色盲友好，信息密度高时最稳妥',
    isDefault: true,
    isPreset: true,
    colors: {
      primary: '#0072B2',
      secondary: '#E69F00',
      tertiary: '#009E73',
      text: '#333333',
      fill: '#FFFFFF',
      section_bg: '#F7F7F7',
      border: '#CCCCCC',
      arrow: '#4D4D4D',
    },
  },
  {
    id: 'preset-paper-neutral',
    name: 'Paper Neutral',
    description: '偏出版物风格，适合架构和流程图',
    isDefault: false,
    isPreset: true,
    colors: {
      primary: '#1F2937',
      secondary: '#B08968',
      tertiary: '#6B9080',
      text: '#111827',
      fill: '#FFFFFF',
      section_bg: '#F5F1EA',
      border: '#C8BFB1',
      arrow: '#3F3F46',
    },
  },
  {
    id: 'preset-ink-warm',
    name: 'Ink Warm',
    description: '带一点暖色纸张感，更像手工整理的工作台',
    isDefault: false,
    isPreset: true,
    colors: {
      primary: '#8A4F3D',
      secondary: '#C9865D',
      tertiary: '#6C8A7D',
      text: '#2A2624',
      fill: '#FFFDF9',
      section_bg: '#F6EFE7',
      border: '#C9B8A6',
      arrow: '#4B433F',
    },
  },
];

export function resolveColorPalette(
  colorSchemeId: string,
  customColors: Record<string, string> | null,
): Record<string, string> {
  if (customColors) {
    return { ...customColors };
  }

  return { ...findPreset(colorSchemeId).colors };
}

export function getColorSchemesResponse() {
  return COLOR_SCHEME_PRESETS.map(({ id, name, description, colors, isDefault, isPreset }) => ({
    id,
    name,
    description,
    colors: { ...colors },
    isDefault,
    isPreset,
    createdAt: null,
    updatedAt: null,
  }));
}

export function formatColorPalettePrompt(colors: Record<string, string>): string {
  const lines = Object.entries(colors).map(([role, value]) => `- ${role}: ${value}`);
  return [
    'Use the following semantic color palette:',
    ...lines,
    'Keep the composition clean, publication-ready, and consistent with the palette roles.',
  ].join('\n');
}

export function findPreset(id: string) {
  return COLOR_SCHEME_PRESETS.find((preset) => preset.id === id)
    ?? COLOR_SCHEME_PRESETS.find((preset) => preset.isDefault)
    ?? COLOR_SCHEME_PRESETS[0];
}

export function isCompleteColorPalette(input: unknown): input is ColorPalette {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return false;
  }

  const record = input as Record<string, unknown>;
  return COLOR_PALETTE_SLOTS.every((slot) => {
    const value = record[slot];
    return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
  });
}
