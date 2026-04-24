import { describe, expect, it } from 'vitest';

import { NAV_ITEMS, normalizePageId } from '../src/lib/navigation';

describe('navigation model', () => {
  it('exposes the four confirmed pages in order', () => {
    expect(NAV_ITEMS.map((item) => item.id)).toEqual(['generate', 'history', 'palettes', 'settings']);
    expect(NAV_ITEMS.map((item) => item.label)).toEqual(['生成', '历史', '配色', '设置']);
  });

  it('normalizes unknown pages to generate', () => {
    expect(normalizePageId('history')).toBe('history');
    expect(normalizePageId('unknown')).toBe('generate');
    expect(normalizePageId(null)).toBe('generate');
  });
});
