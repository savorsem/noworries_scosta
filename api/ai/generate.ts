import { json } from '../integrations/_shared';

export default async function handler(req: Request) {
  // Placeholder for unified generation endpoint.
  // Next step: use active provider from Supabase and route to OpenAI/Anthropic/etc.
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, { status: 405 });
  return json({ ok: false, error: 'not_implemented' }, { status: 501 });
}
