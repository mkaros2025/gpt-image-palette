import { describe, expect, it } from 'vitest';

import { resolveHorizontalWheelTarget } from '../src/lib/horizontalScroll';

describe('resolveHorizontalWheelTarget', () => {
  it('uses vertical wheel motion as horizontal motion and clamps to bounds', () => {
    expect(resolveHorizontalWheelTarget({
      scrollLeft: 20,
      scrollWidth: 1000,
      clientWidth: 400,
      deltaX: 0,
      deltaY: 100,
    })).toBe(155);

    expect(resolveHorizontalWheelTarget({
      scrollLeft: 580,
      scrollWidth: 1000,
      clientWidth: 400,
      deltaX: 0,
      deltaY: 100,
    })).toBe(600);

    expect(resolveHorizontalWheelTarget({
      scrollLeft: 10,
      scrollWidth: 1000,
      clientWidth: 400,
      deltaX: 0,
      deltaY: -100,
    })).toBe(0);
  });

  it('returns the current position when content does not overflow', () => {
    expect(resolveHorizontalWheelTarget({
      scrollLeft: 12,
      scrollWidth: 300,
      clientWidth: 400,
      deltaX: 0,
      deltaY: 100,
    })).toBe(12);
  });
});
