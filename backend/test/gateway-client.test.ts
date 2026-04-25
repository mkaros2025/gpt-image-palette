import { afterEach, describe, expect, it, vi } from 'vitest';

import { createGatewayClient } from '../src/services/gatewayClient';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('gateway client', () => {
  it('uses the edits endpoint default model when sending a reference image', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [{ b64_json: Buffer.from([0x89, 0x50, 0x4e, 0x47]).toString('base64') }],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    vi.stubGlobal('fetch', fetchMock);

    const client = createGatewayClient();
    await client.editImage({
      baseUrl: 'https://img.aiapis.help/',
      apiKey: 'sk-test',
      prompt: 'edit prompt',
      size: '1024x1024',
      quality: 'high',
      referenceImages: [
        {
          bytes: Buffer.from('fake-image-a'),
          mimeType: 'image/png',
          name: 'reference-a.png',
        },
        {
          bytes: Buffer.from('fake-image-b'),
          mimeType: 'image/png',
          name: 'reference-b.png',
        },
      ],
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, requestInit] = fetchMock.mock.calls[0] ?? [];
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://img.aiapis.help/v1/images/edits');
    expect(requestInit?.body).toBeInstanceOf(FormData);
    expect((requestInit?.body as FormData).get('model')).toBe('gpt-image-2');
    expect((requestInit?.body as FormData).get('response_format')).toBe('b64_json');
    expect((requestInit?.body as FormData).getAll('image[]')).toHaveLength(2);
    expect((requestInit?.body as FormData).getAll('image[]')[0]).toBeInstanceOf(File);
    expect((requestInit?.body as FormData).get('image')).toBeNull();
  });

  it('resolves relative image URLs against the gateway base URL before downloading', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [{ url: '/p/img/img_49b33895fcf4433cbf09d11f/0?exp=1777189254952&sig=6a3e61c1d16db8020945b5a5' }],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
          {
            status: 200,
            headers: { 'Content-Type': 'image/png' },
          },
        ),
      );

    vi.stubGlobal('fetch', fetchMock);

    const client = createGatewayClient();
    const result = await client.generateImage({
      baseUrl: 'https://img.aiapis.help/',
      apiKey: 'sk-test',
      prompt: 'test prompt',
      size: '1024x1024',
      quality: 'high',
    });

    expect(result.imageBase64).toBe(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).toString('base64'));
    expect(result.mimeType).toBe('image/png');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://img.aiapis.help/v1/images/generations');
    const [, requestInit] = fetchMock.mock.calls[0] ?? [];
    expect(JSON.parse(String(requestInit?.body))).toMatchObject({
      model: 'gpt-image-2',
      prompt: 'test prompt',
      n: 1,
      size: '1024x1024',
      quality: 'high',
      response_format: 'b64_json',
    });
    expect(fetchMock.mock.calls[1]?.[0]).toBe('https://img.aiapis.help/p/img/img_49b33895fcf4433cbf09d11f/0?exp=1777189254952&sig=6a3e61c1d16db8020945b5a5');
  });
});
