import { useEffect, useRef } from 'react';

type WheelTargetInput = {
  scrollLeft: number;
  scrollWidth: number;
  clientWidth: number;
  deltaX: number;
  deltaY: number;
};

export function resolveHorizontalWheelTarget(input: WheelTargetInput) {
  const max = Math.max(0, input.scrollWidth - input.clientWidth);
  if (max === 0) {
    return input.scrollLeft;
  }

  const delta = Math.abs(input.deltaX) > Math.abs(input.deltaY) ? input.deltaX : input.deltaY;
  return Math.max(0, Math.min(max, input.scrollLeft + delta * 1.35));
}

export function useDampedHorizontalScroll<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const rail = ref.current;
    if (!rail) {
      return undefined;
    }

    let target = rail.scrollLeft;
    let current = rail.scrollLeft;
    let frame = 0;

    const animate = () => {
      current += (target - current) * 0.18;
      rail.scrollLeft = current;

      if (Math.abs(target - current) > 0.4) {
        frame = window.requestAnimationFrame(animate);
      } else {
        rail.scrollLeft = target;
        frame = 0;
      }
    };

    const onWheel = (event: WheelEvent) => {
      const next = resolveHorizontalWheelTarget({
        scrollLeft: target,
        scrollWidth: rail.scrollWidth,
        clientWidth: rail.clientWidth,
        deltaX: event.deltaX,
        deltaY: event.deltaY,
      });

      if (next === target && rail.scrollWidth <= rail.clientWidth) {
        return;
      }

      target = next;

      if (!frame) {
        current = rail.scrollLeft;
        frame = window.requestAnimationFrame(animate);
      }

      event.preventDefault();
    };

    rail.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      rail.removeEventListener('wheel', onWheel);
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, []);

  return ref;
}
