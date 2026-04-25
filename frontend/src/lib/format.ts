import type { ColorScheme } from './types';
import { NO_COLOR_SCHEME_ID } from './generationOptions';

export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return '未知时间';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export function getPaletteLabel(palettes: ColorScheme[], id: string) {
  if (id === NO_COLOR_SCHEME_ID) {
    return '无配色';
  }

  return palettes.find((palette) => palette.id === id)?.name ?? id;
}
