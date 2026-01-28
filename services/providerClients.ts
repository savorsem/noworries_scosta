import type { GenerateVideoRequest } from '../providers/types';
import { getIntegrationByProvider } from './integrationsService';

export type ProviderJobStartResult = { provider_job_id: string };
export type ProviderJobStatusResult = {
  status: 'running' | 'succeeded' | 'failed';
  progress?: number;
  output_url?: string;
  error?: string;
};

function decodeSecret(secret_enc: string | null): string | null {
  if (!secret_enc) return null;
  try {
    return Buffer.from(secret_enc, 'base64').toString('utf-8');
  } catch {
    return null;
  }
}

async function assertEnabled(provider_id: string) {
  const integ = await getIntegrationByProvider(provider_id);
  if (!integ || !integ.enabled) {
    throw new Error(`Provider disabled or missing: ${provider_id}`);
  }
  return integ;
}

export async function startProviderJob(req: GenerateVideoRequest): Promise<ProviderJobStartResult> {
  const integ = await assertEnabled(req.provider_id);
  const apiKey = decodeSecret(integ.secret_enc);

  // MVP: we don't call real providers here. This is a safe placeholder.
  // You will add official endpoints + auth later.
  if (!apiKey) {
    // Still allow creating a job but mark it as failed immediately by throwing.
    throw new Error(`Missing API key for provider: ${req.provider_id}`);
  }

  // Return a synthetic provider job id for now.
  return { provider_job_id: `stub_${req.provider_id}_${crypto.randomUUID()}` };
}

export async function pollProviderJob(provider_id: string, provider_job_id: string): Promise<ProviderJobStatusResult> {
  await assertEnabled(provider_id);
  // MVP stub: always running.
  return { status: 'running', progress: 10 };
}
