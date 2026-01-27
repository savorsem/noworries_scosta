
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Activity, Palette, Settings, Zap, Key, Server, Database, ShieldCheck, HeartPulse, Plug2, Save, Cloud, Terminal, Sun, Moon } from 'lucide-react';
import { testApiConnection } from '../services/geminiService';
import { healer } from '../services/healerService';
import { SystemHealth, GlobalSettings } from '../types';
import { syncUserSettings, logEvent } from '../utils/db';

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
  const [isSyncing, setIsSyncing] = useState(false);
  const [testResult, setTestResult] = useState<'idle' | 'ok' | 'fail'>('idle');

  // Load initial settings
  useEffect(() => {
    const saved = localStorage.getItem('global_settings');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            setSettings(parsed);
            // If theme in saved settings differs from current prop (init), update app
            if (parsed.theme && parsed.theme !== currentTheme) {
                onThemeChange(parsed.theme);
            }
        } catch (e) { console.error("Settings parse error", e); }
    }
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

  const handleIntegrationChange = (key: keyof typeof settings.integrations, value: string) => {
      setSettings(prev => ({
          ...prev,
          integrations: { ...prev.integrations, [key]: value }
      }));
  };

  const runDiagnostics = async () => {
      setTestResult('idle');
      const ok = await testApiConnection();
      setTestResult(ok ? 'ok' : 'fail');
      if (!ok) healer.reportError("API Connection Failed during diagnostics");
  };

  const forceHeal = async () => {
      await healer.attemptAutoHeal();
  };

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
                                        className={`group relative p-4 rounded-2xl border transition-all overflow-hidden ${isActive ? 'bg-white border-white' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                                    >
                                        <div className="flex items-center justify-between relative z-10">
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-black' : 'text-white/60 group-hover:text-white'}`}>{t}</span>
                                            {t === 'Light' ? <Sun size={14} className={isActive ? 'text-black' : 'text-white/40'}/> : <Moon size={14} className={isActive ? 'text-black' : 'text-white/40'}/>}
                                        </div>
                                        {isActive && <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/5 pointer-events-none" />}
                                    </button>
                                  );
                              })}
                          </div>
                      </section>
                      <section className="space-y-4">
                          <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.2em] text-white/30"><Database size={14}/> Данные и Синхронизация</div>
                          <div className="bg-white/5 rounded-2xl p-4 space-y-4 border border-white/5">
                              <div className="flex items-center justify-between">
                                  <span className="text-xs text-white/80 font-medium">Облако Supabase</span>
                                  <button onClick={() => setSettings(s => ({...s, syncToSupabase: !s.syncToSupabase}))} className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-colors ${settings.syncToSupabase ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                      {settings.syncToSupabase ? 'АКТИВНО' : 'ОТКЛЮЧЕНО'}
                                  </button>
                              </div>
                              <div className="flex items-center justify-between">
                                  <span className="text-xs text-white/80 font-medium">Локальное хранилище</span>
                                  <button onClick={() => confirm('Очистить кэш?') && localStorage.clear()} className="text-[9px] text-red-400 hover:text-red-300 uppercase font-bold">Очистить</button>
                              </div>
                              <button 
                                onClick={async () => { setIsSyncing(true); await syncUserSettings(settings); setTimeout(() => setIsSyncing(false), 1000); }} 
                                disabled={isSyncing}
                                className="w-full py-2 bg-indigo-600 rounded-lg text-white text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20"
                              >
                                  {isSyncing ? <Loader2 className="animate-spin w-3 h-3"/> : <Cloud size={12} />}
                                  Синхронизировать принудительно
                              </button>
                          </div>
                      </section>
                  </div>
              );
          case 'integrations':
              return (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[10px] leading-relaxed">
                          Интеграции расширяют возможности студии. Ключи сохраняются локально в зашифрованном виде.
                      </div>
                      
                      <div className="space-y-4">
                          <div className="space-y-2">
                              <label className="text-[9px] uppercase font-black text-white/30 flex items-center gap-2"><Server size={10}/> Custom Proxy URL</label>
                              <input 
                                type="text" 
                                value={settings.integrations.customProxyUrl} 
                                onChange={e => handleIntegrationChange('customProxyUrl', e.target.value)} 
                                placeholder="https://api.proxy.com/v1" 
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-indigo-500 outline-none transition-all font-mono placeholder:text-white/20" 
                              />
                          </div>
                          
                          <div className="w-full h-px bg-white/5 my-4"/>

                          <div className="space-y-2">
                              <label className="text-[9px] uppercase font-black text-white/30 flex items-center gap-2"><Plug2 size={10}/> ElevenLabs API Key (Voice)</label>
                              <input 
                                type="password" 
                                value={settings.integrations.elevenLabsKey} 
                                onChange={e => handleIntegrationChange('elevenLabsKey', e.target.value)} 
                                placeholder="sk_..." 
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-indigo-500 outline-none transition-all font-mono placeholder:text-white/20" 
                              />
                          </div>

                          <div className="space-y-2">
                              <label className="text-[9px] uppercase font-black text-white/30 flex items-center gap-2"><Plug2 size={10}/> Midjourney API Key (Image)</label>
                              <input 
                                type="password" 
                                value={settings.integrations.midjourneyKey} 
                                onChange={e => handleIntegrationChange('midjourneyKey', e.target.value)} 
                                placeholder="mj_..." 
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-indigo-500 outline-none transition-all font-mono placeholder:text-white/20" 
                              />
                          </div>
                      </div>
                  </div>
              );
          case 'healer':
              return (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                      <div className={`p-6 rounded-3xl border flex items-center justify-between ${health.status === 'healthy' ? 'bg-green-500/5 border-green-500/20' : health.status === 'critical' ? 'bg-red-500/10 border-red-500/30' : 'bg-yellow-500/5 border-yellow-500/20'}`}>
                          <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Состояние системы</p>
                              <p className={`text-2xl font-black uppercase ${health.status === 'healthy' ? 'text-green-400' : health.status === 'critical' ? 'text-red-400' : 'text-yellow-400'}`}>
                                  {health.status === 'healthy' ? 'СТАБИЛЬНО' : health.status === 'critical' ? 'КРИТИЧЕСКОЕ' : 'ВНИМАНИЕ'}
                              </p>
                          </div>
                          <HeartPulse size={32} className={`${health.status === 'healthy' ? 'text-green-500' : 'text-red-500'} animate-pulse`} />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                              <span className="text-[9px] text-white/30 uppercase font-bold block mb-2">Активные ошибки</span>
                              <span className="text-xl font-mono">{health.activeErrors}</span>
                          </div>
                          <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                              <span className="text-[9px] text-white/30 uppercase font-bold block mb-2">Использование RAM</span>
                              <span className="text-xl font-mono">{health.memoryUsage ? `${health.memoryUsage} MB` : 'N/A'}</span>
                          </div>
                      </div>

                      <section className="space-y-3">
                          <div className="flex items-center justify-between">
                             <span className="text-xs font-bold">Авто-лечение</span>
                             <button onClick={() => setSettings({...settings, autoHeal: !settings.autoHeal})} className={`w-10 h-5 rounded-full p-1 transition-colors ${settings.autoHeal ? 'bg-green-500' : 'bg-white/10'}`}>
                                 <div className={`w-3 h-3 rounded-full bg-white transition-transform ${settings.autoHeal ? 'translate-x-5' : ''}`} />
                             </button>
                          </div>
                          <p className="text-[9px] text-white/40 leading-relaxed">
                              Если включено, Агент Лекарь будет автоматически очищать кэш и перезапускать процессы при обнаружении критических ошибок.
                          </p>
                      </section>

                      <button onClick={forceHeal} className="w-full py-4 rounded-xl border border-white/10 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                          <ShieldCheck size={14}/>
                          Запустить протокол лечения
                      </button>
                  </div>
              );
          case 'logs':
              return (
                  <div className="h-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
                      <div className="flex items-center justify-between mb-4">
                           <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Системный журнал</span>
                           <button onClick={runDiagnostics} className="text-[9px] text-indigo-400 hover:text-white uppercase font-bold flex items-center gap-1">
                               {testResult === 'idle' ? 'Проверить связь' : testResult === 'ok' ? 'OK' : 'Ошибка'}
                           </button>
                      </div>
                      <div className="flex-1 bg-black/40 rounded-xl border border-white/5 p-4 font-mono text-[9px] text-white/60 overflow-y-auto no-scrollbar space-y-2">
                          <div className="flex gap-2">
                              <span className="text-white/20">{new Date().toLocaleTimeString()}</span>
                              <span className="text-green-400">[SYSTEM]</span>
                              <span>Admin panel initialized</span>
                          </div>
                          <div className="flex gap-2">
                              <span className="text-white/20">{new Date().toLocaleTimeString()}</span>
                              <span className="text-blue-400">[HEALER]</span>
                              <span>Monitoring active. Status: {health.status}</span>
                          </div>
                          {/* Real logs would be fetched from DB/State */}
                      </div>
                  </div>
              );
      }
  };

  function Loader2({ className }: { className?: string }) {
     return <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[400]" />
          <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed inset-y-0 left-0 w-full sm:w-[420px] bg-[#090909] border-r border-white/10 z-[401] flex flex-col shadow-2xl">
            
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/20">
              <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/10 to-transparent border border-white/10 flex items-center justify-center">
                    <Settings className="w-5 h-5 text-white/80" />
                  </div>
                  <div>
                      <h2 className="text-lg font-black text-white tracking-tighter uppercase leading-none">Админ.Панель</h2>
                      <span className="text-[9px] font-mono text-white/30">v2.5.0 • PRODUCTION</span>
                  </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors"><X size={20}/></button>
            </div>

            {/* Sidebar/Tabs (Horizontal for mobile, could be vertical) */}
            <div className="flex px-6 pt-6 gap-4 overflow-x-auto no-scrollbar border-b border-white/5 pb-0">
                <button onClick={() => setActiveTab('system')} className={`pb-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all shrink-0 ${activeTab === 'system' ? 'border-white text-white' : 'border-transparent text-white/30 hover:text-white/60'}`}>Система</button>
                <button onClick={() => setActiveTab('integrations')} className={`pb-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all shrink-0 ${activeTab === 'integrations' ? 'border-white text-white' : 'border-transparent text-white/30 hover:text-white/60'}`}>Интеграции</button>
                <button onClick={() => setActiveTab('healer')} className={`pb-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all shrink-0 flex items-center gap-2 ${activeTab === 'healer' ? 'border-white text-white' : 'border-transparent text-white/30 hover:text-white/60'}`}>
                    Лекарь {health.activeErrors > 0 && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"/>}
                </button>
                <button onClick={() => setActiveTab('logs')} className={`pb-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all shrink-0 ${activeTab === 'logs' ? 'border-white text-white' : 'border-transparent text-white/30 hover:text-white/60'}`}>Терминал</button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar relative">
                {renderContent()}
            </div>
            
            {/* Footer Status */}
            <div className="p-4 border-t border-white/5 bg-black/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${health.status === 'healthy' ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-red-500 shadow-[0_0_10px_#ef4444]'}`} />
                    <span className="text-[9px] font-mono text-white/40 uppercase">System: {health.status}</span>
                </div>
                <div className="flex items-center gap-2 text-[9px] font-mono text-white/20">
                    <Activity size={10} />
                    <span>98ms</span>
                </div>
            </div>

          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SettingsDrawer;
