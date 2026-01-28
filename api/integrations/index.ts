import { createClient } from '@supabase/supabase-js';
import { IntegrationUpsertBody, json, requireAdmin, ProviderId, IntegrationRowPublic } from './_shared';

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

function toPublicRow(row: any): IntegrationRowPublic {
  return {
    id: row.id,
    provider: row.provider as ProviderId,
    auth_type: row.auth_type,
    name: row.name,
    is_active: !!row.is_active,
    config: row.config || {},
    updated_at: row.updated_at,
  };
}

export default async function handler(req: Request) {
  const authResp = requireAdmin(req);
  if (authResp) return authResp;

  try {
    const sb = supabaseAdmin();

    if (req.method === 'GET') {
      const { data, error } = await sb
        .from('integrations')
        .select('id, provider, auth_type, name, is_active, config, updated_at')
        .order('updated_at', { ascending: false });
      if (error) return json({ error: error.message }, { status: 500 });
      return json({ integrations: (data || []).map(toPublicRow) });
    }

    if (req.method === 'POST') {
      const body = (await req.json()) as IntegrationUpsertBody;
      if (!body?.provider || !body?.auth_type || !body?.name) {
        return json({ error: 'missing_fields' }, { status: 400 });
      }

      const payload: any = {
        provider: body.provider,
        auth_type: body.auth_type,
        name: body.name,
        config: body.config || {},
      };

      if (typeof body.is_active === 'boolean') payload.is_active = body.is_active;

      // secret handling: store in secret_enc for now (base64) — replace with real encryption later
      if (typeof body.secret === 'string' && body.secret.trim()) {
        payload.secret_enc = Buffer.from(body.secret.trim(), 'utf-8').toString('base64');
      }

      if (body.id) payload.id = body.id;

      // if setting active, deactivate others for that provider
      if (payload.is_active) {
        await sb.from('integrations').update({ is_active: false }).eq('provider', payload.provider);
      }

      const { data, error } = await sb
        .from('integrations')
        .upsert(payload)
        .select('id, provider, auth_type, name, is_active, config, updated_at')
        .single();

      if (error) return json({ error: error.message }, { status: 500 });
      return json({ integration: toPublicRow(data) });
    }

    return json({ error: 'method_not_allowed' }, { status: 405 });
  } catch (e: any) {
    return json({ error: e?.message || 'server_error' }, { status: 500 });
  }
}
