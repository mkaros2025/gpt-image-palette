import sharp from 'sharp';

const MAX_OUTPUT_BYTES = 4 * 1024 * 1024;
const MIN_EDGE = 512;
const RESIZE_FACTOR = 0.9;

export type NormalizedReferenceImage = {
  bytes: Buffer;
  filename: string;
  mimeType: 'image/png';
  extension: 'png';
};

export async function normalizeReferenceImage(input: Buffer): Promise<NormalizedReferenceImage> {
  const metadata = await sharp(input).metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;

  if (width <= 0 || height <= 0) {
    throw new Error('Reference image is invalid.');
  }

  let edge = Math.max(width, height);
  let output = await renderSquarePng(input, edge);

  while (output.length > MAX_OUTPUT_BYTES && edge > MIN_EDGE) {
    edge = Math.max(MIN_EDGE, Math.floor(edge * RESIZE_FACTOR));
    output = await renderSquarePng(input, edge);
  }

  return {
    bytes: output,
    filename: 'reference.png',
    mimeType: 'image/png',
    extension: 'png',
  };
}

async function renderSquarePng(input: Buffer, edge: number) {
  return sharp(input)
    .resize(edge, edge, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      withoutEnlargement: true,
    })
    .png({
      compressionLevel: 9,
      adaptiveFiltering: true,
      force: true,
    })
    .toBuffer();
}
