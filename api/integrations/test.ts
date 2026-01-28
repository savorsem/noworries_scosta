import { createClient } from '@supabase/supabase-js';
import { json, requireAdmin, ProviderId } from './_shared';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function supabaseAdmin() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

async function getActiveSecret(sb: any, provider: ProviderId) {
  const { data, error } = await sb
    .from('integrations')
    .select('secret_enc, config')
    .eq('provider', provider)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  const secret_enc = data?.secret_enc as string | null;
  const secret = secret_enc ? Buffer.from(secret_enc, 'base64').toString('utf-8') : '';
  return { secret, config: (data?.config || {}) as any };
}

export default async function handler(req: Request) {
  const authResp = requireAdmin(req);
  if (authResp) return authResp;

  try {
    if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, { status: 405 });
    const { provider } = (await req.json()) as { provider: ProviderId };
    if (!provider) return json({ error: 'missing_provider' }, { status: 400 });

    const sb = supabaseAdmin();
    const { secret } = await getActiveSecret(sb, provider);
    if (!secret) return json({ ok: false, error: 'no_active_secret' }, { status: 400 });

    // Minimal “ping” per provider
    if (provider === 'openai') {
      const r = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${secret}` },
      });
      return json({ ok: r.ok, status: r.status });
    }

    if (provider === 'anthropic') {
      const r = await fetch('https://api.anthropic.com/v1/models', {
        headers: {
          'x-api-key': secret,
          'anthropic-version': '2023-06-01',
        },
      });
      return json({ ok: r.ok, status: r.status });
    }

    if (provider === 'replicate') {
      const r = await fetch('https://api.replicate.com/v1/account', {
        headers: { Authorization: `Token ${secret}` },
      });
      return json({ ok: r.ok, status: r.status });
    }

    if (provider === 'elevenlabs') {
      const r = await fetch('https://api.elevenlabs.io/v1/user', {
        headers: { 'xi-api-key': secret },
      });
      return json({ ok: r.ok, status: r.status });
    }

    if (provider === 'stability') {
      const r = await fetch('https://api.stability.ai/v1/user/account', {
        headers: { Authorization: `Bearer ${secret}` },
      });
      return json({ ok: r.ok, status: r.status });
    }

    if (provider === 'huggingface') {
      const r = await fetch('https://huggingface.co/api/whoami-v2', {
        headers: { Authorization: `Bearer ${secret}` },
      });
      return json({ ok: r.ok, status: r.status });
    }

    if (provider === 'telegram') {
      const r = await fetch(`https://api.telegram.org/bot${secret}/getMe`);
      return json({ ok: r.ok, status: r.status });
    }

    if (provider === 'google') {
      // Google OAuth tokens are different; handled later.
      return json({ ok: false, error: 'google_oauth_not_implemented_yet' }, { status: 501 });
    }

    if (provider === 'gemini') {
      // Gemini API key check via REST
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(secret)}`);
      return json({ ok: r.ok, status: r.status });
    }

    return json({ ok: false, error: 'unknown_provider' }, { status: 400 });
  } catch (e: any) {
    return json({ ok: false, error: e?.message || 'server_error' }, { status: 500 });
  }
}
