export type GatewayImageResult = {
  imageBase64: string;
  mimeType: string;
  width: number | null;
  height: number | null;
};

export type GatewayGenerateInput = {
  baseUrl: string;
  apiKey: string;
  prompt: string;
  size: string;
  quality: string;
  model?: string;
};

export type GatewayEditInput = GatewayGenerateInput & {
  referenceImageBytes: Buffer;
  referenceImageMimeType: string;
  referenceImageName?: string | null;
};

export type GatewayClient = ReturnType<typeof createGatewayClient>;

export function createGatewayClient(defaultModel = 'gpt-image-2') {
  return {
    async generateImage(input: GatewayGenerateInput): Promise<GatewayImageResult> {
      const payload = await postJson(input.baseUrl, input.apiKey, '/images/generations', {
        model: input.model ?? defaultModel,
        prompt: input.prompt,
        n: 1,
        size: input.size,
        quality: input.quality,
      });
      return coerceGatewayResult(payload, input.size);
    },
    async editImage(input: GatewayEditInput): Promise<GatewayImageResult> {
      const formData = new FormData();
      formData.append('model', input.model ?? defaultModel);
      formData.append('prompt', input.prompt);
      formData.append('n', '1');
      formData.append('size', input.size);
      formData.append('quality', input.quality);
      const blob = new Blob([input.referenceImageBytes], {
        type: input.referenceImageMimeType || 'image/png',
      });
      formData.append('image', blob, input.referenceImageName || 'reference.png');

      const payload = await postFormData(input.baseUrl, input.apiKey, '/images/edits', formData);
      return coerceGatewayResult(payload, input.size);
    },
    async testConnection(input: { baseUrl: string; apiKey: string }) {
      const response = await fetch(resolveEndpoint(input.baseUrl, '/models'), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${input.apiKey}`,
          Accept: 'application/json',
        },
      });
      await readGatewayResponse(response);
      return { ok: true };
    },
  };
}

async function postJson(baseUrl: string, apiKey: string, path: string, body: unknown) {
  const response = await fetch(resolveEndpoint(baseUrl, path), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });
  return readGatewayResponse(response);
}

async function postFormData(baseUrl: string, apiKey: string, path: string, formData: FormData) {
  const response = await fetch(resolveEndpoint(baseUrl, path), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
    body: formData,
  });
  return readGatewayResponse(response);
}

async function readGatewayResponse(response: Response) {
  const text = await response.text();
  let payload: unknown = text;

  try {
    payload = JSON.parse(text);
  } catch {
    // Leave as raw text for error messages.
  }

  if (!response.ok) {
    throw new Error(`Gateway HTTP ${response.status}: ${extractErrorMessage(payload, text)}`);
  }

  return payload;
}

function resolveEndpoint(baseUrl: string, path: string) {
  const normalizedBase = normalizeBaseUrl(baseUrl);
  return new URL(path.replace(/^\//, ''), `${normalizedBase}/`).toString();
}

function normalizeBaseUrl(baseUrl: string) {
  const trimmed = baseUrl.trim().replace(/\/+$/, '');
  if (!trimmed) {
    return trimmed;
  }

  return trimmed.endsWith('/v1') ? trimmed : `${trimmed}/v1`;
}

async function coerceGatewayResult(payload: unknown, fallbackSize: string): Promise<GatewayImageResult> {
  const base64 = extractImageBase64(payload);
  const url = extractImageUrl(payload);

  if (base64) {
    return {
      imageBase64: base64,
      mimeType: inferMimeType(Buffer.from(base64, 'base64')),
      width: parseDimension(fallbackSize, 0),
      height: parseDimension(fallbackSize, 1),
    };
  }

  if (url) {
    const downloaded = await downloadImageUrlAsBase64(url);
    if (downloaded) {
      return {
        imageBase64: downloaded,
        mimeType: inferMimeType(Buffer.from(downloaded, 'base64')),
        width: parseDimension(fallbackSize, 0),
        height: parseDimension(fallbackSize, 1),
      };
    }
    throw new Error(`Gateway returned image URL but download failed: ${url}`);
  }

  throw new Error('Gateway response did not contain image data.');
}

function extractImageBase64(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const data = (payload as { data?: unknown }).data;
  if (Array.isArray(data)) {
    for (const item of data) {
      if (item && typeof item === 'object') {
        const record = item as Record<string, unknown>;
        const value = record.b64_json ?? record.image_base64;
        if (typeof value === 'string' && value) {
          return value;
        }
      }
    }
  }

  const direct = payload as Record<string, unknown>;
  if (typeof direct.b64_json === 'string') {
    return direct.b64_json;
  }

  return null;
}

function extractImageUrl(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const data = (payload as { data?: unknown }).data;
  if (Array.isArray(data)) {
    for (const item of data) {
      if (item && typeof item === 'object') {
        const record = item as Record<string, unknown>;
        const value = record.url;
        if (typeof value === 'string' && value) {
          return value;
        }
      }
    }
  }

  return null;
}

function extractErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== 'object') {
    return fallback.slice(0, 500);
  }

  const record = payload as Record<string, unknown>;
  if (record.error && typeof record.error === 'object') {
    const errorRecord = record.error as Record<string, unknown>;
    if (typeof errorRecord.message === 'string') {
      return errorRecord.message;
    }
  }
  if (typeof record.message === 'string') {
    return record.message;
  }
  return fallback.slice(0, 500);
}

async function downloadImageUrlAsBase64(imageUrl: string) {
  const response = await fetch(imageUrl, {
    method: 'GET',
  });

  if (!response.ok) {
    return null;
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length === 0) {
    return null;
  }

  return bytes.toString('base64');
}

function inferMimeType(bytes: Buffer) {
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png';
  }
  if (bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) {
    return 'image/jpeg';
  }
  if (bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP') {
    return 'image/webp';
  }
  return 'image/png';
}

function parseDimension(size: string, index: 0 | 1) {
  const parts = size.split('x');
  const value = parts[index];
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : null;
}
