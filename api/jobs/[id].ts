import { createClient } from '@supabase/supabase-js';
import { json } from '../integrations/_shared';
import type { JobRow } from '../../providers/types';
import { pollProviderJob } from '../../services/providerClients';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function supabaseAdmin() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}

function getIdFromUrl(req: Request): string | null {
  try {
    const url = new URL(req.url);
    const parts = url.pathname.split('/').filter(Boolean);
    return parts[parts.length - 1] || null;
  } catch {
    return null;
  }
}

export default async function handler(req: Request) {
  if (req.method !== 'GET') return json({ error: 'method_not_allowed' }, { status: 405 });

  try {
    const id = getIdFromUrl(req);
    if (!id) return json({ error: 'missing_id' }, { status: 400 });

    const sb = supabaseAdmin();

    const { data: job, error } = await sb.from('jobs').select('*').eq('id', id).single();
    if (error) return json({ error: error.message }, { status: 404 });

    const row = job as JobRow;
    if (row.status === 'running' && row.provider_job_id) {
      const polled = await pollProviderJob(row.provider_id, row.provider_job_id);
      const progress = typeof polled.progress === 'number' ? polled.progress : row.progress;

      // For MVP stub we don't produce output.
      const newStatus = polled.status === 'succeeded' ? 'succeeded' : polled.status === 'failed' ? 'failed' : 'running';

      const { data: updated } = await sb
        .from('jobs')
        .update({ status: newStatus, progress, error: polled.error || null, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single();

      return json({ job: (updated as JobRow) || row });
    }

    return json({ job: row });
  } catch (e: any) {
    return json({ error: e?.message || 'server_error' }, { status: 500 });
  }
}
