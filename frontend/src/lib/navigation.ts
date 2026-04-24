export const NAV_ITEMS = [
  { id: 'generate', label: '生成' },
  { id: 'history', label: '历史' },
  { id: 'palettes', label: '配色' },
  { id: 'settings', label: '设置' },
] as const;

export type PageId = (typeof NAV_ITEMS)[number]['id'];

export function normalizePageId(value: string | null): PageId {
  return NAV_ITEMS.some((item) => item.id === value) ? (value as PageId) : 'generate';
}
