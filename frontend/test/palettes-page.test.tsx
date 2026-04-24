import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { PalettesPage } from '../src/components/PalettesPage';
import { PALETTE_SLOTS } from '../src/lib/paletteSlots';

const palette = {
  id: 'custom-a',
  name: 'Custom A',
  description: '自定义配色',
  isDefault: true,
  isPreset: false,
  createdAt: null,
  updatedAt: null,
  colors: {
    primary: '#111111',
    secondary: '#222222',
    tertiary: '#333333',
    text: '#444444',
    fill: '#ffffff',
    section_bg: '#f5f5f5',
    border: '#cccccc',
    arrow: '#555555',
  },
};

describe('PalettesPage', () => {
  it('renders fixed 8-slot palette editing controls', () => {
    const html = renderToStaticMarkup(
      <PalettesPage
        palettes={[palette]}
        selectedId="custom-a"
        onSelect={() => {}}
        onCreate={async () => {}}
        onCopy={async () => {}}
        onSave={async () => {}}
        onDelete={async () => {}}
        onSetDefault={async () => {}}
      />,
    );

    for (const slot of PALETTE_SLOTS) {
      expect(html).toContain(slot);
    }
    expect(html).toContain('设为默认');
    expect(html).toContain('保存配色');
  });
});
