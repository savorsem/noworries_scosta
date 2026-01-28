import { createClient } from '@supabase/supabase-js';
import { json } from '../integrations/_shared';
import type { CreateJobRequest, JobRow } from '../../providers/types';
import { startProviderJob } from '../../services/providerClients';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function supabaseAdmin() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, { status: 405 });

  try {
    const body = (await req.json()) as CreateJobRequest;
    if (!body?.type || !body?.request?.provider_id || !body?.request?.mode) {
      return json({ error: 'missing_fields' }, { status: 400 });
    }

    const sb = supabaseAdmin();

    const jobId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Create job as queued
    const insertPayload = {
      id: jobId,
      type: body.type,
      status: 'queued',
      provider_id: body.request.provider_id,
      mode: body.request.mode,
      request: body.request,
      provider_job_id: null,
      output_asset_id: null,
      error: null,
      progress: null,
      created_at: now,
      updated_at: now,
    };

    const { error: insErr } = await sb.from('jobs').insert(insertPayload);
    if (insErr) return json({ error: insErr.message }, { status: 500 });

    // Start provider job
    const start = await startProviderJob(body.request);

    const { data: updated, error: updErr } = await sb
      .from('jobs')
      .update({ status: 'running', provider_job_id: start.provider_job_id, updated_at: new Date().toISOString() })
      .eq('id', jobId)
      .select('*')
      .single();

    if (updErr) return json({ error: updErr.message }, { status: 500 });

    return json({ job: updated as JobRow });
  } catch (e: any) {
    return json({ error: e?.message || 'server_error' }, { status: 500 });
  }
}
