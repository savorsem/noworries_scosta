
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { AnimatePresence, motion } from 'framer-motion';
import React, { useCallback, useEffect, useState } from 'react';
import ApiKeyDialog from './components/ApiKeyDialog';
import BottomPromptBar from './components/BottomPromptBar';
import VideoCard from './components/VideoCard';
import SettingsDrawer from './components/SettingsDrawer';
import StudioAgent from './components/StudioAgent';
import { generateVideo, generateCharacterReplacement } from './services/geminiService';
import { FeedPost, GenerateVideoParams, PostStatus, GenerationMode, Resolution } from './types';
import { Clapperboard, Menu, Sparkles, Activity, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getAllPosts, savePost } from './utils/db';

const App: React.FC = () => {
  const [feed, setFeed] = useState<FeedPost[]>([]);
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [toast, setToast] = useState<{msg: string, type: 'error' | 'success'} | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [theme, setTheme] = useState('obsidian');

  useEffect(() => {
    const checkKeySelection = async () => {
      const aistudio = (window as any).aistudio;
      // Check environment variable (Vite style)
      const envKey = import.meta.env.VITE_GEMINI_API_KEY;

      if (aistudio) {
        const hasKey = await aistudio.hasSelectedApiKey();
        if (!hasKey && !envKey) setShowKeyDialog(true);
      } else if (!envKey) {
          setShowKeyDialog(true);
      }
    };
    checkKeySelection();
    getAllPosts().then(posts => setFeed(posts || []));
  }, []);

  const showToast = (msg: string, type: 'error' | 'success' = 'success') => {
      setToast({ msg, type });
      setTimeout(() => setToast(null), 4000);
  };

  const handleGenerate = useCallback(async (params: GenerateVideoParams) => {
    const id = Date.now().toString();
    const newPost: FeedPost = {
      id, username: 'Director_Stanley', avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Stanley',
      description: params.prompt, modelTag: params.model.split('-')[1].toUpperCase(),
      status: PostStatus.GENERATING, referenceImageBase64: params.startFrame?.base64,
      aspectRatio: params.aspectRatio, resolution: params.resolution, originalParams: params
    };

    setFeed(prev => [newPost, ...prev]);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
        let result;
        if (params.mode === GenerationMode.CHARACTER_REPLACEMENT) {
            result = await generateCharacterReplacement(params, (status) => showToast(status, 'success'));
        } else {
            result = await generateVideo(params);
        }

        const update = { videoUrl: result.url, status: PostStatus.SUCCESS };
        setFeed(prev => prev.map(p => p.id === id ? { ...p, ...update } : p));
        savePost({ ...newPost, ...update }, result.blob);
        showToast("Продакшн завершен.");
    } catch (e: any) {
        const errorMessage = e.message || "Ошибка рендеринга";
        setFeed(prev => prev.map(p => p.id === id ? { ...p, status: PostStatus.ERROR, errorMessage } : p));
        showToast(errorMessage, 'error');
    }
  }, []);

  return (
    <div className={`h-[100dvh] w-screen flex flex-col overflow-hidden font-sans selection:bg-indigo-500/30 ${theme}`} style={{ backgroundColor: '#030303' }}>
      
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-30">
        <div className="absolute top-0 -left-1/4 w-1/2 h-1/2 bg-indigo-600/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 -right-1/4 w-1/2 h-1/2 bg-purple-600/10 blur-[120px] rounded-full" />
      </div>

      <AnimatePresence>{showKeyDialog && <ApiKeyDialog onContinue={() => setShowKeyDialog(false)} />}</AnimatePresence>
      <SettingsDrawer isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} currentTheme={theme} onThemeChange={setTheme} />
      <AnimatePresence>{isStudioOpen && <StudioAgent onClose={() => setIsStudioOpen(false)} />}</AnimatePresence>
      
      <AnimatePresence>
        {toast && (
            <motion.div initial={{ opacity: 0, y: -20, scale: 0.9 }} animate={{ opacity: 1, y: 30, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="fixed top-0 left-1/2 -translate-x-1/2 z-[1000] px-5 py-2.5 rounded-2xl glass-card neural-glow flex items-center gap-3">
                {toast.type === 'error' ? <AlertCircle size={14} className="text-red-500"/> : <CheckCircle2 size={14} className="text-green-500"/>}
                <span className="text-[10px] font-black uppercase tracking-widest text-white/90">{toast.msg}</span>
            </motion.div>
        )}
      </AnimatePresence>
      
      <main className="flex-1 h-full relative overflow-y-auto no-scrollbar pb-44">
        <header className="sticky top-0 z-50 w-full px-6 py-4 flex items-center justify-between bg-black/40 backdrop-blur-2xl border-b border-white/5 transition-all">
            <div className="flex items-center gap-4">
                <button onClick={() => setIsSettingsOpen(true)} className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                    <Menu size={18} className="text-white/60" />
                </button>
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
                      <Clapperboard size={16} className="text-white" />
                    </div>
                    <h1 className="font-black text-lg tracking-widest text-white uppercase italic">KRAUZ<span className="text-indigo-500">ACADEMY</span></h1>
                </div>
            </div>
            
            <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/5 rounded-full">
                    <Activity size={10} className="text-indigo-500 animate-pulse"/>
                    <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em]">Neural Stream</span>
                </div>
                <button onClick={() => setIsStudioOpen(true)} className="group flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black hover:bg-indigo-50 transition-all shadow-xl hover:shadow-indigo-500/10">
                    <Sparkles size={14} className="group-hover:rotate-12 transition-transform" />
                    <span className="text-[9px] font-black uppercase tracking-wider">Workstation</span>
                </button>
            </div>
        </header>

        <div className="max-w-[1920px] mx-auto p-6 md:p-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
            <AnimatePresence mode="popLayout">
              {feed.map(post => <VideoCard key={post.id} post={post} />)}
              {feed.length === 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-full h-[60vh] flex flex-col items-center justify-center space-y-4">
                      <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-2">
                        <Clapperboard size={32} className="text-white/10"/>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/10">Empty Production Queue</span>
                  </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      <BottomPromptBar onGenerate={handleGenerate} />
    </div>
  );
};

export default App;
