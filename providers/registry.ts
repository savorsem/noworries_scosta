import type { ProviderCapability, ProviderId, ProviderPublic } from './types';
import { getEnabledIntegrations } from '../services/integrationsService';

const DEFAULT_CAPS: Record<string, ProviderCapability[]> = {
  heygen: ['talking_head'],
  veo: ['image_to_video'],
  sora: ['image_to_video', 'face_swap', 'character_swap'],
};

export async function listProviders(): Promise<ProviderPublic[]> {
  const integrations = await getEnabledIntegrations();

  return integrations.map((i) => {
    const caps = (i.capabilities?.length ? i.capabilities : DEFAULT_CAPS[i.provider_id]) || [];

    return {
      provider_id: i.provider_id as ProviderId,
      name: i.name || i.provider_id,
      enabled: !!i.enabled,
      status: i.enabled ? 'enabled' : 'disabled',
      capabilities: caps,
    } satisfies ProviderPublic;
  });
}
