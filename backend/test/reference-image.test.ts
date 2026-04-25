import { describe, expect, it } from 'vitest';
import sharp from 'sharp';

import { normalizeReferenceImage } from '../src/services/referenceImage';

describe('reference image normalization', () => {
  it('converts uploads to square PNG files with transparent padding', async () => {
    const input = await sharp({
      create: {
        width: 4,
        height: 2,
        channels: 3,
        background: { r: 220, g: 40, b: 90 },
      },
    })
      .jpeg()
      .toBuffer();

    const output = await normalizeReferenceImage(input);
    const metadata = await sharp(output.bytes).metadata();

    expect(output.mimeType).toBe('image/png');
    expect(output.extension).toBe('png');
    expect(output.filename).toBe('reference.png');
    expect(metadata.format).toBe('png');
    expect(metadata.width).toBe(4);
    expect(metadata.height).toBe(4);

    const topLeft = await sharp(output.bytes)
      .ensureAlpha()
      .extract({ left: 0, top: 0, width: 1, height: 1 })
      .raw()
      .toBuffer();
    const center = await sharp(output.bytes)
      .ensureAlpha()
      .extract({ left: 1, top: 1, width: 1, height: 1 })
      .raw()
      .toBuffer();

    expect(Array.from(topLeft)).toEqual([0, 0, 0, 0]);
    expect(center[3]).toBe(255);
  });
});
