import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchJson, fetchBlob, HttpError } from './http';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('utils/http', () => {
  it('fetchJson returns parsed JSON on ok response', async () => {
    const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ hello: 'world' }),
    } as any);

    const data = await fetchJson<{ hello: string }>('https://example.com');
    expect(data.hello).toBe('world');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('fetchJson throws HttpError on non-ok response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Server Error',
      text: async () => 'boom',
    } as any);

    await expect(fetchJson('https://example.com')).rejects.toBeInstanceOf(HttpError);
  });

  it('fetchBlob returns blob on ok response', async () => {
    const blob = new Blob(['x'], { type: 'text/plain' });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      blob: async () => blob,
    } as any);

    const out = await fetchBlob('https://example.com');
    expect(out).toBe(blob);
  });

  it('fetchBlob throws HttpError on non-ok response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      text: async () => 'nope',
    } as any);

    await expect(fetchBlob('https://example.com')).rejects.toBeInstanceOf(HttpError);
  });
});
