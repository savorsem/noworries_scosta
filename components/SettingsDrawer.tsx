
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Activity, Palette, Settings, Zap, Key } from 'lucide-react';
import { testApiConnection } from '../services/geminiService';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: string;
  onThemeChange: (theme: string) => void;
}

const SettingsDrawer: React.FC<SettingsDrawerProps> = ({ isOpen, onClose, currentTheme, onThemeChange }) => {
  const [proxyUrl, setProxyUrl] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'idle' | 'ok' | 'fail'>('idle');

  useEffect(() => {
    setProxyUrl(localStorage.getItem('custom_api_proxy') || '');
  }, [isOpen]);

  const applyConfig = () => {
      localStorage.setItem('custom_api_proxy', proxyUrl);
      alert('Конфигурация прокси обновлена.');
  };

  const runDiagnostics = async () => {
      setIsTesting(true);
      const ok = await testApiConnection();
      setTestResult(ok ? 'ok' : 'fail');
      setIsTesting(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/90 backdrop-blur-2xl z-[400]" />
          <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} className="fixed inset-y-0 left-0 w-[380px] bg-neutral-950 border-r border-white/10 z-[401] flex flex-col shadow-2xl">
            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-black/20">
              <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <Settings className="w-5 h-5 text-white/40" />
                  </div>
                  <h2 className="text-xl font-black text-white tracking-tighter uppercase">Админ-панель</h2>
              </div>
              <button onClick={onClose} className="p-2 text-white/20 hover:text-white transition-colors"><X /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-10 no-scrollbar">
              <section className="space-y-6">
                  <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.2em] text-white/30"><Key size={14}/> Сетевые шлюзы</div>
                  <div className="space-y-4">
                      <div className="space-y-2">
                          <label className="text-[9px] uppercase font-black text-white/20 ml-2">URL прокси (опционально)</label>
                          <input type="text" value={proxyUrl} onChange={(e) => setProxyUrl(e.target.value)} placeholder="https://api.proxy.com..." className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs text-white focus:border-white/30 outline-none transition-all" />
                      </div>
                      <button onClick={applyConfig} className="w-full py-4 bg-white text-black text-[11px] font-black uppercase rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-white/5">Обновить прокси</button>
                  </div>
              </section>

              <section className="space-y-6">
                  <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.2em] text-white/30"><Palette size={14}/> Дизайн и темы</div>
                  <div className="grid grid-cols-2 gap-3">
                      {['Obsidian', 'Neon', 'Sunset'].map(t => (
                          <button key={t} onClick={() => onThemeChange(t.toLowerCase())} className={`py-4 rounded-2xl border transition-all text-[10px] font-black uppercase tracking-widest ${currentTheme === t.toLowerCase() ? 'bg-white text-black border-white' : 'bg-white/5 border-white/5 text-white/40'}`}>{t}</button>
                      ))}
                  </div>
              </section>

              <section className="space-y-6">
                  <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.2em] text-white/30"><Activity size={14}/> Диагностика потока</div>
                  <button onClick={runDiagnostics} disabled={isTesting} className="w-full flex items-center justify-between p-5 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group">
                      <div className="flex items-center gap-5">
                        <div className={`w-2.5 h-2.5 rounded-full ${testResult === 'ok' ? 'bg-green-500 shadow-[0_0_15px_#22c55e]' : testResult === 'fail' ? 'bg-red-500 shadow-[0_0_15px_#ef4444]' : 'bg-white/10'}`} />
                        <div className="text-left">
                            <p className="text-xs font-black text-white uppercase tracking-widest">Состояние канала</p>
                            <p className="text-[10px] text-white/20 uppercase mt-1">{isTesting ? 'Анализ...' : testResult === 'ok' ? 'Связь установлена' : 'Доступ закрыт'}</p>
                        </div>
                      </div>
                      <Zap size={16} className="text-white/10 group-hover:text-white transition-colors"/>
                  </button>
              </section>

              <section className="space-y-4 pt-8 border-t border-white/5">
                  <button onClick={() => confirm('Сбросить все данные кэша?') && localStorage.clear()} className="w-full p-5 rounded-3xl border border-red-500/10 bg-red-500/5 text-red-500 text-[10px] font-black uppercase tracking-[0.3em] hover:bg-red-500 hover:text-white transition-all">
                      Сброс настроек
                  </button>
              </section>
            </div>
            
            <div className="p-10 border-t border-white/5 flex flex-col items-center gap-3">
                <span className="text-[10px] font-black text-white/10 tracking-[0.4em] uppercase">Noworries Studio Pro v2.5</span>
                <span className="text-[8px] font-mono text-white/5 uppercase">Защищенный туннель активен</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SettingsDrawer;
