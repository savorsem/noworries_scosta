// Shared types/helpers for integrations API (Vercel Serverless)

export type ProviderId =
  | 'gemini'
  | 'openai'
  | 'anthropic'
  | 'replicate'
  | 'elevenlabs'
  | 'stability'
  | 'huggingface'
  | 'telegram'
  | 'google';

export type IntegrationAuthType = 'api_key' | 'oauth';

export type IntegrationConfig = {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  baseUrl?: string;
  limits?: {
    rpm?: number;
    tpm?: number;
  };
};

export type IntegrationRowPublic = {
  id: string;
  provider: ProviderId;
  auth_type: IntegrationAuthType;
  name: string;
  is_active: boolean;
  config: IntegrationConfig;
  updated_at: string;
};

export type IntegrationUpsertBody = {
  id?: string;
  provider: ProviderId;
  auth_type: IntegrationAuthType;
  name: string;
  is_active?: boolean;
  config?: IntegrationConfig;
  secret?: string; // API key or token (never returned)
};

export function json(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...(init || {}),
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...(init?.headers || {}),
    },
  });
}

export function requireAdmin(req: Request) {
  const pass = process.env.ADMIN_PASSCODE || '';
  const provided = req.headers.get('x-admin-passcode') || '';
  if (!pass || provided !== pass) {
    return json({ error: 'unauthorized' }, { status: 401 });
  }
  return null;
}

export function maskSecret(s?: string | null) {
  if (!s) return '';
  if (s.length <= 8) return '********';
  return `${s.slice(0, 4)}…${s.slice(-4)}`;
}
