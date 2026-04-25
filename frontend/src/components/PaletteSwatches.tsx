import { PALETTE_SLOTS } from '../lib/paletteSlots';
import type { PaletteColors } from '../lib/types';

type Props = {
  colors: PaletteColors;
  className?: string;
  label?: string;
};

export function PaletteSwatches({ colors, className = '', label = '配色预览' }: Props) {
  const classNames = ['palette-swatches', className].filter(Boolean).join(' ');

  return (
    <span className={classNames} aria-label={label} role="img">
      {PALETTE_SLOTS.map((slot) => (
        <i key={slot} title={slot} style={{ backgroundColor: colors[slot] }} />
      ))}
    </span>
  );
}
