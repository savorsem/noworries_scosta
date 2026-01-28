import React, { useEffect, useMemo, useState } from 'react';
import { Plug2, RefreshCw, CheckCircle2, AlertCircle, Plus, Save } from 'lucide-react';

type ProviderId =
  | 'gemini'
  | 'openai'
  | 'anthropic'
  | 'replicate'
  | 'elevenlabs'
  | 'stability'
  | 'huggingface'
  | 'telegram'
  | 'google';

type IntegrationRow = {
  id: string;
  provider: ProviderId;
  auth_type: 'api_key' | 'oauth';
  name: string;
  is_active: boolean;
  config: any;
  updated_at: string;
};

type Draft = {
  id?: string;
  provider: ProviderId;
  auth_type: 'api_key' | 'oauth';
  name: string;
  is_active: boolean;
  secret?: string;
  config: {
    model?: string;
    temperature?: number;
    max_tokens?: number;
    baseUrl?: string;
  };
};

const PROVIDERS: { id: ProviderId; label: string; auth: 'api_key' | 'oauth' }[] = [
  { id: 'gemini', label: 'Gemini', auth: 'api_key' },
  { id: 'openai', label: 'OpenAI', auth: 'api_key' },
  { id: 'anthropic', label: 'Anthropic', auth: 'api_key' },
  { id: 'replicate', label: 'Replicate', auth: 'api_key' },
  { id: 'elevenlabs', label: 'ElevenLabs', auth: 'api_key' },
  { id: 'stability', label: 'Stability', auth: 'api_key' },
  { id: 'huggingface', label: 'HuggingFace', auth: 'api_key' },
  { id: 'telegram', label: 'Telegram', auth: 'api_key' },
  { id: 'google', label: 'Google (Sheets/Drive)', auth: 'oauth' },
];

async function apiFetch(path: string, passcode: string, init?: RequestInit) {
  const res = await fetch(path, {
    ...(init || {}),
    headers: {
      ...(init?.headers || {}),
      'x-admin-passcode': passcode,
      'content-type': 'application/json',
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}

export default function IntegrationsAdminPanel({ passcode }: { passcode: string }) {
  const [items, setItems] = useState<IntegrationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  const [draft, setDraft] = useState<Draft>({
    provider: 'openai',
    auth_type: 'api_key',
    name: 'New Integration',
    is_active: true,
    secret: '',
    config: { model: '', temperature: 0.7, max_tokens: 1024, baseUrl: '' },
  });

  const providersById = useMemo(() => Object.fromEntries(PROVIDERS.map((p) => [p.id, p])), []);

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/api/integrations', passcode, { method: 'GET' });
      setItems(data.integrations || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const upsert = async () => {
    setLoading(true);
    setError('');
    try {
      await apiFetch('/api/integrations', passcode, {
        method: 'POST',
        body: JSON.stringify({
          id: draft.id,
          provider: draft.provider,
          auth_type: draft.auth_type,
          name: draft.name,
          is_active: draft.is_active,
          secret: draft.secret,
          config: draft.config,
        }),
      });
      setToast({ msg: 'Saved', type: 'ok' });
      await refresh();
    } catch (e: any) {
      setError(e.message || 'Save failed');
      setToast({ msg: e.message || 'Save failed', type: 'err' });
    } finally {
      setLoading(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const test = async (provider: ProviderId) => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/api/integrations/test', passcode, {
        method: 'POST',
        body: JSON.stringify({ provider }),
      });
      if (data.ok) setToast({ msg: `Test OK (${provider})`, type: 'ok' });
      else setToast({ msg: `Test failed (${provider})`, type: 'err' });
    } catch (e: any) {
      setToast({ msg: e.message || 'Test failed', type: 'err' });
    } finally {
      setLoading(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const selectRow = (row: IntegrationRow) => {
    setDraft({
      id: row.id,
      provider: row.provider,
      auth_type: row.auth_type,
      name: row.name,
      is_active: row.is_active,
      secret: '',
      config: {
        model: row.config?.model || '',
        temperature: row.config?.temperature ?? 0.7,
        max_tokens: row.config?.max_tokens ?? 1024,
        baseUrl: row.config?.baseUrl || '',
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-white/10 flex items-center justify-center">
            <Plug2 size={18} className="text-white/70" />
          </div>
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40">Admin</div>
            <div className="text-white font-black">Integrations</div>
          </div>
        </div>
        <button
          onClick={refresh}
          className="px-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-white font-black hover:bg-white/10 transition flex items-center gap-2"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {toast && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm font-black flex items-center gap-2 ${
            toast.type === 'ok'
              ? 'bg-green-500/10 border-green-500/20 text-green-200'
              : 'bg-red-500/10 border-red-500/20 text-red-200'
          }`}
        >
          {toast.type === 'ok' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
          {toast.msg}
        </div>
      )}

      {error && (
        <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-4 text-red-200 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40">Existing</div>
            <button
              onClick={() =>
                setDraft({
                  provider: 'openai',
                  auth_type: 'api_key',
                  name: 'New Integration',
                  is_active: true,
                  secret: '',
                  config: { model: '', temperature: 0.7, max_tokens: 1024, baseUrl: '' },
                })
              }
              className="px-3 py-2 rounded-2xl bg-white text-black font-black hover:bg-white/90 transition flex items-center gap-2"
            >
              <Plus size={14} /> New
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {items.map((row) => (
              <button
                key={row.id}
                onClick={() => selectRow(row)}
                className="w-full text-left rounded-2xl border border-white/10 bg-black/30 hover:bg-black/40 transition p-3"
              >
                <div className="flex items-center justify-between">
                  <div className="text-white font-black">
                    {providersById[row.provider]?.label || row.provider}
                    {row.is_active && <span className="ml-2 text-[10px] uppercase tracking-[0.2em] text-green-300">active</span>}
                  </div>
                  <div className="text-white/40 text-xs">{new Date(row.updated_at).toLocaleString()}</div>
                </div>
                <div className="text-white/50 text-sm">{row.name}</div>
              </button>
            ))}
            {items.length === 0 && (
              <div className="text-white/40 text-sm">No integrations yet.</div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40">Editor</div>

          <div className="mt-4 grid grid-cols-1 gap-3">
            <label className="text-white/60 text-xs font-black uppercase tracking-[0.2em]">Provider</label>
            <select
              value={draft.provider}
              onChange={(e) => {
                const provider = e.target.value as ProviderId;
                setDraft((d) => ({
                  ...d,
                  provider,
                  auth_type: PROVIDERS.find((p) => p.id === provider)?.auth || 'api_key',
                }));
              }}
              className="rounded-2xl bg-black/40 border border-white/10 px-4 py-3 text-white"
            >
              {PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>

            <label className="text-white/60 text-xs font-black uppercase tracking-[0.2em]">Name</label>
            <input
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              className="rounded-2xl bg-black/40 border border-white/10 px-4 py-3 text-white"
            />

            {draft.auth_type === 'api_key' && (
              <>
                <label className="text-white/60 text-xs font-black uppercase tracking-[0.2em]">API Key / Token</label>
                <input
                  value={draft.secret || ''}
                  onChange={(e) => setDraft((d) => ({ ...d, secret: e.target.value }))}
                  placeholder="stored server-side"
                  type="password"
                  className="rounded-2xl bg-black/40 border border-white/10 px-4 py-3 text-white"
                />
              </>
            )}

            {draft.auth_type === 'oauth' && (
              <div className="rounded-2xl bg-yellow-500/10 border border-yellow-500/20 p-4 text-yellow-200 text-sm">
                Google OAuth: добавлю подключение после базового каркаса (кнопка Connect).
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="text-white/60 text-xs font-black uppercase tracking-[0.2em]">Model</label>
                <input
                  value={draft.config.model || ''}
                  onChange={(e) => setDraft((d) => ({ ...d, config: { ...d.config, model: e.target.value } }))}
                  className="w-full rounded-2xl bg-black/40 border border-white/10 px-4 py-3 text-white"
                />
              </div>
              <div>
                <label className="text-white/60 text-xs font-black uppercase tracking-[0.2em]">Temp</label>
                <input
                  value={String(draft.config.temperature ?? 0.7)}
                  onChange={(e) => setDraft((d) => ({ ...d, config: { ...d.config, temperature: Number(e.target.value) } }))}
                  className="w-full rounded-2xl bg-black/40 border border-white/10 px-4 py-3 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-white/60 text-xs font-black uppercase tracking-[0.2em]">Max tokens</label>
                <input
                  value={String(draft.config.max_tokens ?? 1024)}
                  onChange={(e) => setDraft((d) => ({ ...d, config: { ...d.config, max_tokens: Number(e.target.value) } }))}
                  className="w-full rounded-2xl bg-black/40 border border-white/10 px-4 py-3 text-white"
                />
              </div>
              <div>
                <label className="text-white/60 text-xs font-black uppercase tracking-[0.2em]">Base URL</label>
                <input
                  value={draft.config.baseUrl || ''}
                  onChange={(e) => setDraft((d) => ({ ...d, config: { ...d.config, baseUrl: e.target.value } }))}
                  className="w-full rounded-2xl bg-black/40 border border-white/10 px-4 py-3 text-white"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-white/70 text-sm">
              <input
                type="checkbox"
                checked={draft.is_active}
                onChange={(e) => setDraft((d) => ({ ...d, is_active: e.target.checked }))}
              />
              Set active (deactivates other entries for same provider)
            </label>

            <div className="flex gap-3 pt-2">
              <button
                disabled={loading}
                onClick={upsert}
                className="flex-1 rounded-2xl bg-white text-black font-black py-3 hover:bg-white/90 transition flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <Save size={14} /> Save
              </button>
              <button
                disabled={loading}
                onClick={() => test(draft.provider)}
                className="flex-1 rounded-2xl bg-white/5 border border-white/10 text-white font-black py-3 hover:bg-white/10 transition disabled:opacity-60"
              >
                Test
              </button>
            </div>

            {loading && <div className="text-white/40 text-sm">Working…</div>}
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white/5 border border-white/10 p-4 text-white/50 text-sm">
        Ключи и токены не сохраняются в localStorage и не возвращаются в UI. Управление доступно только с passcode.
      </div>
    </div>
  );
}
