import { json } from './integrations/_shared';
import { listProviders } from '../providers/registry';

export default async function handler(req: Request) {
  if (req.method !== 'GET') return json({ error: 'method_not_allowed' }, { status: 405 });

  try {
    const providers = await listProviders();
    return json({ providers });
  } catch (e: any) {
    return json({ error: e?.message || 'server_error' }, { status: 500 });
  }
}
