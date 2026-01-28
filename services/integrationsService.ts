import { createClient } from '@supabase/supabase-js';

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

export type IntegrationRow = {
  id: string;
  provider_id: string;
  name: string;
  enabled: boolean;
  base_url: string | null;
  capabilities: string[] | null;
  config: Record<string, unknown> | null;
  secret_enc: string | null;
  updated_at: string;
};

export async function getEnabledIntegrations(): Promise<IntegrationRow[]> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from('integrations')
    .select('id, provider_id, name, enabled, base_url, capabilities, config, secret_enc, updated_at')
    .eq('enabled', true)
    .order('updated_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data as IntegrationRow[]) || [];
}

export async function getIntegrationByProvider(provider_id: string): Promise<IntegrationRow | null> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from('integrations')
    .select('id, provider_id, name, enabled, base_url, capabilities, config, secret_enc, updated_at')
    .eq('provider_id', provider_id)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as IntegrationRow) || null;
}
