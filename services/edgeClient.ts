/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export const SUPABASE_REF = 'wfjuolmetsbddtzewqhv';
export const SUPABASE_FUNCTIONS_BASE = `https://${SUPABASE_REF}.supabase.co/functions/v1`;

export function getOrCreateDeviceId(): string {
  const key = 'nw_device_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`).toString();
    localStorage.setItem(key, id);
  }
  return id;
}

export async function chatSend(message: string, thread_id?: string | null) {
  const device_id = getOrCreateDeviceId();
  const res = await fetch(`${SUPABASE_FUNCTIONS_BASE}/chat_send`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-device-id': device_id,
    },
    body: JSON.stringify({ device_id, thread_id: thread_id ?? null, message }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as any)?.error || 'chat_send failed');
  }
  return data as { thread_id: string; assistant: string };
}

export async function adminSetProviderKey(admin_pin: string, provider: string, api_key: string) {
  const res = await fetch(`${SUPABASE_FUNCTIONS_BASE}/admin_set_provider_key`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ admin_pin, provider, api_key }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.error || 'admin_set_provider_key failed');
  return data as { ok: true; provider: string };
}
