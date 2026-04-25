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

  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    timeZoneName: 'short',
  }).format(date);
}

export function getPaletteLabel(palettes: ColorScheme[], id: string) {
  if (id === NO_COLOR_SCHEME_ID) {
    return '无配色';
  }

  return palettes.find((palette) => palette.id === id)?.name ?? id;
}
