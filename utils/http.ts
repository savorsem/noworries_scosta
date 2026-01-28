export class HttpError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public url: string,
    public bodyText?: string
  ) {
    super(`HTTP ${status} ${statusText} for ${url}`);
  }
}

export async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) {
    let bodyText: string | undefined;
    try {
      bodyText = await res.text();
    } catch {
      // ignore
    }
    throw new HttpError(res.status, res.statusText, typeof input === 'string' ? input : String(input), bodyText);
  }
  return (await res.json()) as T;
}
