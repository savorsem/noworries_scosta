/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Activity, Palette, Settings, Zap, Server, Database, ShieldCheck, HeartPulse, Plug2, Terminal, Sun, Moon, Lock } from 'lucide-react';
import { healer } from '../services/healerService';
import { SystemHealth, GlobalSettings } from '../types';
import { syncUserSettings } from '../utils/db';
import AdminPasscodeDialog from './AdminPasscodeDialog';
import IntegrationsAdminPanel from './IntegrationsAdminPanel';
import { getAdminPasscode, setAdminPasscode, clearAdminPasscode } from '../services/adminPasscode';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: string;
  onThemeChange: (theme: string) => void;
}

type SettingsTab = 'system' | 'integrations' | 'healer' | 'logs';

const SettingsDrawer: React.FC<SettingsDrawerProps> = ({ isOpen, onClose, currentTheme, onThemeChange }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('system');
  const [settings, setSettings] = useState<GlobalSettings>({
      theme: currentTheme,
      integrations: {
          customProxyUrl: '',
          elevenLabsKey: '',
          midjourneyKey: '',
          runwayKey: ''
      },
      autoHeal: true,
      syncToSupabase: true,
      debugMode: false
  });

  const [health, setHealth] = useState<SystemHealth>(healer.getStatus());
  const [isPassDialogOpen, setIsPassDialogOpen] = useState(false);
  const [adminPasscode, setAdminPasscodeState] = useState('');

  // Load initial settings (non-secret settings only)
  useEffect(() => {
    const saved = localStorage.getItem('global_settings');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            // IMPORTANT: do not trust legacy secret fields from localStorage
            parsed.integrations = { customProxyUrl: '' };
            setSettings(parsed);
            if (parsed.theme && parsed.theme !== currentTheme) {
                onThemeChange(parsed.theme);
            }
        } catch (e) { console.error("Settings parse error", e); }
    }
    setAdminPasscodeState(getAdminPasscode());
  }, []);

  // Subscribe to Healer
  useEffect(() => {
      const unsub = healer.subscribe(setHealth);
      return unsub;
  }, []);

  // Auto-save on change
  useEffect(() => {
      const newSettings = { ...settings, theme: currentTheme };
      localStorage.setItem('global_settings', JSON.stringify(newSettings));
      if (settings.syncToSupabase) {
          syncUserSettings(newSettings).catch(console.error);
      }
  }, [settings, currentTheme]);

  const renderContent = () => {
      switch (activeTab) {
          case 'system':
              return (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                      <section className="space-y-4">
                          <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.2em] text-white/30"><Palette size={14}/> Интерфейс</div>
                          <div className="grid grid-cols-2 gap-3">
                              {['Obsidian', 'Light', 'Neon', 'Sunset'].map(t => {
                                  const isActive = currentTheme === t.toLowerCase();
                                  return (
                                    <button 
                                        key={t} 
                                        onClick={() => onThemeChange(t.toLowerCase())} 
                                        className={`group relative p-4 rounded-2xl border transition-all overflow-hidden ${isActive ? 'bg-white border-white text-black' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'}`}
                                    >
                                      <div className="text-xs font-black uppercase tracking-[0.2em]">{t}</div>
                                    </button>
                                  );
                              })}
                          </div>
                      </section>
                  </div>
              );

          case 'integrations':
              return (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40">Security</div>
                        <div className="text-white font-black">Admin Integrations</div>
                        <div className="mt-1 text-white/50 text-sm">
                          Ключи интеграций хранятся на сервере (Supabase + Vercel API). В браузере не сохраняются.
                        </div>
                      </div>
                      <button
                        onClick={() => setIsPassDialogOpen(true)}
                        className="px-4 py-2 rounded-2xl bg-white text-black font-black hover:bg-white/90 transition flex items-center gap-2"
                      >
                        <Lock size={14} /> {adminPasscode ? 'Change' : 'Unlock'}
                      </button>
                    </div>

                    {adminPasscode && (
                      <div className="mt-3 flex justify-end">
                        <button
                          onClick={() => {
                            clearAdminPasscode();
                            setAdminPasscodeState('');
                          }}
                          className="px-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-white font-black hover:bg-white/10 transition"
                        >
                          Lock
                        </button>
                      </div>
                    )}
                  </div>

                  {adminPasscode ? (
                    <IntegrationsAdminPanel passcode={adminPasscode} />
                  ) : (
                    <div className="rounded-2xl border border-white/10 bg-black/30 p-6 text-white/60">
                      Unlock admin mode to manage integrations.
                    </div>
                  )}

                  <AdminPasscodeDialog
                    isOpen={isPassDialogOpen}
                    onClose={() => setIsPassDialogOpen(false)}
                    onSave={(p) => {
                      setAdminPasscode(p);
                      setAdminPasscodeState(p);
                    }}
                  />
                </div>
              );

          case 'healer':
              return (
                <div className="space-y-6">
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                    <div className="flex items-center justify-between">
                      <div className="text-white font-black">System Health</div>
                      <div className={`text-xs font-black uppercase tracking-[0.2em] ${health.status === 'healthy' ? 'text-green-300' : health.status === 'degraded' ? 'text-yellow-300' : 'text-red-300'}`}>{health.status}</div>
                    </div>
                    <div className="mt-3 text-white/50 text-sm">Active errors: {health.activeErrors}</div>
                  </div>
                </div>
              );

          case 'logs':
              return (
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-white/50 text-sm">
                  Logs UI coming soon.
                </div>
              );
      }
  };

  const tabs: { id: SettingsTab; label: string; icon: any }[] = [
      { id: 'system', label: 'System', icon: Settings },
      { id: 'integrations', label: 'Integrations', icon: Plug2 },
      { id: 'healer', label: 'Healer', icon: HeartPulse },
      { id: 'logs', label: 'Logs', icon: Terminal },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[999]"
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-2xl" onClick={onClose} />
          <motion.aside
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 30, opacity: 0 }}
            className="absolute right-0 top-0 h-full w-full max-w-[560px] border-l border-white/10 bg-black/70"
          >
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-white/10 flex items-center justify-center">
                  <Settings size={18} className="text-white/70" />
                </div>
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40">Settings</div>
                  <div className="text-white font-black">Control Panel</div>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition">
                <X size={16} className="text-white/60" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-4 gap-2">
                {tabs.map((t) => {
                  const Icon = t.icon;
                  const active = activeTab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setActiveTab(t.id)}
                      className={`rounded-2xl p-3 border text-left transition ${active ? 'bg-white text-black border-white' : 'bg-white/5 text-white border-white/10 hover:bg-white/10'}`}
                    >
                      <Icon size={16} className={active ? 'text-black' : 'text-white/70'} />
                      <div className="mt-2 text-[10px] font-black uppercase tracking-[0.2em]">{t.label}</div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6">
                {renderContent()}
              </div>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SettingsDrawer;
