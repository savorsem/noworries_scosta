/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Activity, Palette, Settings, Zap, Key, Server, Database, ShieldCheck, HeartPulse, Plug2, Save, Cloud, Terminal, Sun, Moon } from 'lucide-react';
import { getAllSettings, saveSettings } from '../utils/db';
import { adminSetProviderKey } from '../services/edgeClient';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: string;
  onThemeChange: (theme: string) => void;
}

const themes = [
  { id: 'obsidian', name: 'Obsidian', description: 'Deep black with neon accents' },
  { id: 'neon', name: 'Neon', description: 'Cyberpunk vibrant colors' },
  { id: 'cinematic', name: 'Cinematic', description: 'Film-grade contrast' },
  { id: 'minimal', name: 'Minimal', description: 'Clean and focused' },
];

const SettingsDrawer: React.FC<SettingsDrawerProps> = ({ isOpen, onClose, currentTheme, onThemeChange }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'theme' | 'integrations' | 'system'>('general');
  const [settings, setSettings] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  // --- Admin Keys (PIN protected) ---
  const [adminPin, setAdminPin] = useState('');
  const [provider, setProvider] = useState('gemini');
  const [providerKey, setProviderKey] = useState('');
  const [adminStatus, setAdminStatus] = useState<string | null>(null);

  const saveAdminKey = async () => {
    try {
      setAdminStatus(null);
      await adminSetProviderKey(adminPin, provider, providerKey);
      setAdminStatus('Saved');
      setProviderKey('');
    } catch (e: any) {
      setAdminStatus(e?.message || 'Failed');
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    getAllSettings().then((s) => setSettings(s)).catch(() => setSettings(null));
  }, [isOpen]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveSettings(settings);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1000] flex"
        >
          <div className="absolute inset-0 bg-black/60" onClick={onClose} />
          <motion.div
            initial={{ x: -420 }}
            animate={{ x: 0 }}
            exit={{ x: -420 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="relative w-[420px] max-w-[90vw] h-full bg-black/80 backdrop-blur-2xl border-r border-white/10"
          >
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
                  <Settings size={18} className="text-indigo-300" />
                </div>
                <div>
                  <div className="text-white font-black tracking-widest uppercase text-sm">Settings</div>
                  <div className="text-white/40 text-xs">Device-scoped memory + server keys</div>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10">
                <X size={18} className="text-white/60" />
              </button>
            </div>

            <div className="p-4 flex gap-2 border-b border-white/10">
              {(
                [
                  { id: 'general', label: 'General', icon: Zap },
                  { id: 'theme', label: 'Theme', icon: Palette },
                  { id: 'integrations', label: 'Integrations', icon: Plug2 },
                  { id: 'system', label: 'System', icon: ShieldCheck },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex-1 px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 ${
                    activeTab === t.id ? 'bg-white text-black border-white' : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <t.icon size={14} />
                  {t.label}
                </button>
              ))}
            </div>

            <div className="p-6 overflow-y-auto h-[calc(100%-140px)] space-y-6">
              {activeTab === 'theme' && (
                <div className="space-y-4">
                  <div className="text-white/80 text-xs font-black uppercase tracking-widest">Themes</div>
                  <div className="grid grid-cols-1 gap-3">
                    {themes.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => onThemeChange(t.id)}
                        className={`p-4 rounded-2xl border text-left ${currentTheme === t.id ? 'border-indigo-500/50 bg-indigo-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-white font-black text-sm">{t.name}</div>
                            <div className="text-white/40 text-xs">{t.description}</div>
                          </div>
                          {currentTheme === t.id ? <Sun size={16} className="text-indigo-300" /> : <Moon size={16} className="text-white/30" />}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'integrations' && (
                <div className="space-y-5">
                  <div className="text-white/80 text-xs font-black uppercase tracking-widest">Admin Provider Keys (PIN)</div>

                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                    <div className="text-white/50 text-[10px] font-black uppercase tracking-wider">Admin PIN</div>
                    <input
                      type="password"
                      value={adminPin}
                      onChange={(e) => setAdminPin(e.target.value)}
                      placeholder="Enter admin PIN"
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-sm outline-none focus:border-indigo-500/50"
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-white/50 text-[10px] font-black uppercase tracking-wider mb-1">Provider</div>
                        <select
                          value={provider}
                          onChange={(e) => setProvider(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-sm outline-none focus:border-indigo-500/50"
                        >
                          <option value="gemini">Gemini</option>
                          <option value="openai">OpenAI</option>
                          <option value="elevenlabs">ElevenLabs</option>
                          <option value="runway">Runway</option>
                        </select>
                      </div>
                      <div>
                        <div className="text-white/50 text-[10px] font-black uppercase tracking-wider mb-1">Key</div>
                        <input
                          value={providerKey}
                          onChange={(e) => setProviderKey(e.target.value)}
                          placeholder="Paste API key"
                          className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-sm outline-none focus:border-indigo-500/50"
                        />
                      </div>
                    </div>

                    <button
                      onClick={saveAdminKey}
                      className="w-full px-4 py-2.5 rounded-xl bg-white text-black font-black uppercase tracking-wider text-[10px] hover:bg-indigo-50"
                    >
                      Save Provider Key
                    </button>

                    {adminStatus && <div className="text-white/50 text-xs">{adminStatus}</div>}

                    <div className="text-white/30 text-xs">
                      This updates the server-side default key. Users can still use their own device key later.
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                    <div className="text-white/80 text-xs font-black uppercase tracking-widest mb-2">Next</div>
                    <div className="text-white/40 text-sm">Device-level “Use my key” will be added next (per device_id).</div>
                  </div>
                </div>
              )}

              {activeTab === 'system' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-3">
                      <Database size={18} className="text-indigo-300" />
                      <div>
                        <div className="text-white font-black text-sm">Supabase backend enabled</div>
                        <div className="text-white/40 text-xs">Edge Functions + device memory</div>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-3">
                      <HeartPulse size={18} className="text-green-400" />
                      <div>
                        <div className="text-white font-black text-sm">Status</div>
                        <div className="text-white/40 text-xs">Functions are active</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'general' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-3">
                      <Server size={18} className="text-indigo-300" />
                      <div>
                        <div className="text-white font-black text-sm">Server-side keys</div>
                        <div className="text-white/40 text-xs">Gemini moved off client bundle</div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full px-4 py-2.5 rounded-xl bg-white text-black font-black uppercase tracking-wider text-[10px] hover:bg-indigo-50 disabled:opacity-60"
                  >
                    {isSaving ? 'Saving…' : 'Save settings'}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SettingsDrawer;
