import { describe, expect, it } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { buildApp } from '../src/app';

const fullPalette = {
  primary: '#111111',
  secondary: '#222222',
  tertiary: '#333333',
  text: '#444444',
  fill: '#ffffff',
  section_bg: '#f5f5f5',
  border: '#cccccc',
  arrow: '#555555',
};

describe('palette persistence', () => {
  it('creates, edits, defaults, and persists custom palettes', async () => {
    const dataDir = mkdtempSync(join(tmpdir(), 'gpt-image-palette-palettes-'));

    const first = await buildApp({ dataDir });
    const created = await first.inject({
      method: 'POST',
      url: '/api/color-schemes',
      payload: {
        name: 'Journal Figure',
        colors: fullPalette,
      },
    });

    expect(created.statusCode).toBe(201);
    const createdBody = created.json() as { id: string; isPreset: boolean };
    expect(createdBody.id).toMatch(/^custom-/);
    expect(createdBody.isPreset).toBe(false);

    const renamed = await first.inject({
      method: 'PATCH',
      url: `/api/color-schemes/${createdBody.id}`,
      payload: {
        name: 'Journal Figure Revised',
        colors: {
          ...fullPalette,
          primary: '#123456',
        },
      },
    });
    expect(renamed.statusCode).toBe(200);

    const defaulted = await first.inject({
      method: 'PUT',
      url: `/api/color-schemes/${createdBody.id}/default`,
    });
    expect(defaulted.statusCode).toBe(200);

    await first.close();

    const second = await buildApp({ dataDir });
    const list = await second.inject({ method: 'GET', url: '/api/color-schemes' });
    const palettes = list.json() as Array<{ id: string; name: string; isDefault: boolean; colors: Record<string, string> }>;
    const custom = palettes.find((palette) => palette.id === createdBody.id);

    expect(custom).toMatchObject({
      name: 'Journal Figure Revised',
      isDefault: true,
    });
    expect(custom?.colors.primary).toBe('#123456');

    await second.close();
  });

  it('rejects palettes that do not match the fixed 8-slot schema', async () => {
    const dataDir = mkdtempSync(join(tmpdir(), 'gpt-image-palette-palettes-invalid-'));
    const app = await buildApp({ dataDir });

    const response = await app.inject({
      method: 'POST',
      url: '/api/color-schemes',
      payload: {
        name: 'Broken',
        colors: {
          primary: '#111111',
        },
      },
    });

    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it('copies a preset into an editable custom palette and deletes custom palettes only', async () => {
    const dataDir = mkdtempSync(join(tmpdir(), 'gpt-image-palette-palettes-copy-'));
    const app = await buildApp({ dataDir });

    const copied = await app.inject({
      method: 'POST',
      url: '/api/color-schemes/preset-okabe-ito/copy',
      payload: { name: 'Okabe Copy' },
    });
    expect(copied.statusCode).toBe(201);
    const copiedBody = copied.json() as { id: string; colors: Record<string, string> };
    expect(copiedBody.id).toMatch(/^custom-/);
    expect(copiedBody.colors.primary).toBe('#0072B2');

    const deletePreset = await app.inject({
      method: 'DELETE',
      url: '/api/color-schemes/preset-okabe-ito',
    });
    expect(deletePreset.statusCode).toBe(400);

    const deleteCustom = await app.inject({
      method: 'DELETE',
      url: `/api/color-schemes/${copiedBody.id}`,
    });
    expect(deleteCustom.statusCode).toBe(200);

    await app.close();
  });
});
