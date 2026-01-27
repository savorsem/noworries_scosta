
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
import { generateVideo, editImage, generateCharacterReplacement } from './services/geminiService';
import { FeedPost, GenerateVideoParams, PostStatus, GenerationMode, AspectRatio, Resolution } from './types';
import { Clapperboard, Menu, Sparkles, Activity, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getAllPosts, savePost } from './utils/db';

const App: React.FC = () => {
  const [feed, setFeed] = useState<FeedPost[]>([]);
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [toast, setToast] = useState<{msg: string, type: 'error' | 'success'} | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStudioOpen, setIsStudioOpen] = useState(true);
  const [theme, setTheme] = useState('obsidian');

  useEffect(() => {
    const checkKeySelection = async () => {
      if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey && !process.env.API_KEY) {
          setShowKeyDialog(true);
        }
      } else if (!process.env.API_KEY) {
        setShowKeyDialog(true);
      }
    };
    
    checkKeySelection();
    
    getAllPosts().then(posts => {
        setFeed(posts || []);
    });
  }, []);

  const showToast = (msg: string, type: 'error' | 'success' = 'success') => {
      setToast({ msg, type });
      setTimeout(() => setToast(null), 4000);
  };

  const handleGenerate = useCallback(async (params: GenerateVideoParams) => {
    const id = Date.now().toString();
    const newPost: FeedPost = {
      id,
      username: 'Студия_Ядро',
      avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Studio',
      description: params.mode === GenerationMode.CHARACTER_REPLACEMENT ? 'Замена персонажа...' : params.prompt,
      modelTag: params.model.split('-')[1].toUpperCase(),
      status: PostStatus.GENERATING,
      referenceImageBase64: params.startFrame?.base64,
      aspectRatio: params.aspectRatio,
      resolution: params.resolution,
      originalParams: params
    };

    setFeed(prev => [newPost, ...prev]);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
        let result;
        if (params.mode === GenerationMode.IMAGE_EDIT_TO_VIDEO && params.startFrame) {
            const editedB64 = await editImage(params.startFrame.base64, params.startFrame.file.type, params.prompt);
            result = await generateVideo({ ...params, startFrame: { ...params.startFrame, base64: editedB64 } });
        } else if (params.mode === GenerationMode.CHARACTER_REPLACEMENT) {
            result = await generateCharacterReplacement(params, (status) => {
                showToast(status, 'success');
            });
        } else {
            result = await generateVideo(params);
        }

        const update = { videoUrl: result.url, status: PostStatus.SUCCESS };
        setFeed(prev => prev.map(p => p.id === id ? { ...p, ...update } : p));
        savePost({ ...newPost, ...update }, result.blob);
        showToast("Кинематографичный кадр готов.");
    } catch (e: any) {
        setFeed(prev => prev.map(p => p.id === id ? { ...p, status: PostStatus.ERROR, errorMessage: e.message } : p));
        showToast(e.message, 'error');
    }
  }, []);

  const handleUpgrade = useCallback(async (post: FeedPost) => {
    if (!post.originalParams) return;
    if (post.resolution !== Resolution.P720) return;

    setFeed(prev => prev.map(p => p.id === post.id ? { ...p, status: PostStatus.UPGRADING } : p));
    showToast("Улучшение до 1080p Master...", "success");

    try {
        const upgradeParams: GenerateVideoParams = {
            ...post.originalParams,
            resolution: Resolution.P1080
        };

        const result = await generateVideo(upgradeParams);
        
        const update = { 
            videoUrl: result.url, 
            status: PostStatus.SUCCESS, 
            resolution: Resolution.P1080,
            originalParams: upgradeParams
        };
        
        setFeed(prev => prev.map(p => p.id === post.id ? { ...p, ...update } : p));
        savePost({ ...post, ...update }, result.blob);
        showToast("Улучшение до 1080p завершено.", "success");
    } catch (e: any) {
        setFeed(prev => prev.map(p => p.id === post.id ? { ...p, status: PostStatus.SUCCESS } : p));
        showToast(`Ошибка улучшения: ${e.message}`, "error");
    }
  }, []);

  const handleRegenerate = useCallback((post: FeedPost) => {
      if (!post.originalParams) return;
      handleGenerate(post.originalParams);
      showToast("Запущен повтор генерации...", "success");
  }, [handleGenerate]);

  return (
    <div className={`h-[100dvh] w-screen flex flex-col overflow-hidden bg-black font-sans selection:bg-white/10 ${theme}`} data-theme={theme}>
      <AnimatePresence>{showKeyDialog && <ApiKeyDialog onContinue={() => setShowKeyDialog(false)} />}</AnimatePresence>
      <SettingsDrawer isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} currentTheme={theme} onThemeChange={setTheme} />
      <AnimatePresence>{isStudioOpen && <StudioAgent onClose={() => setIsStudioOpen(false)} />}</AnimatePresence>
      
      <AnimatePresence>
        {toast && (
            <motion.div initial={{ opacity: 0, y: -40 }} animate={{ opacity: 1, y: 30 }} exit={{ opacity: 0, y: -40 }} className="fixed top-0 left-1/2 -translate-x-1/2 z-[300] px-6 py-4 rounded-3xl bg-neutral-900 border border-white/10 backdrop-blur-3xl shadow-2xl flex items-center gap-4">
                {toast.type === 'error' ? <AlertCircle className="text-red-500 w-5 h-5"/> : <CheckCircle2 className="text-green-500 w-5 h-5"/>}
                <span className="text-[11px] font-black uppercase tracking-widest text-white/80">{toast.msg}</span>
            </motion.div>
        )}
      </AnimatePresence>
      
      <main className="flex-1 h-full relative overflow-y-auto no-scrollbar pb-40">
        <header className="sticky top-0 z-40 w-full px-6 py-5 flex items-center justify-between bg-black/50 backdrop-blur-2xl border-b border-white/5">
            <div className="flex items-center gap-5">
                <button onClick={() => setIsSettingsOpen(true)} className="p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all"><Menu size={18}/></button>
                <div className="flex items-center gap-3">
                    <Clapperboard className="w-7 h-7 text-red-600" />
                    <h1 className="font-black text-2xl tracking-tighter text-white uppercase italic">БЕЗ ТРЕВОГ</h1>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <div className="hidden md:flex items-center gap-2.5 px-4 py-1.5 bg-white/5 border border-white/5 rounded-full">
                    <Activity size={12} className="text-green-500 animate-pulse"/>
                    <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Прямой поток</span>
                </div>
                <button onClick={() => setIsStudioOpen(true)} className="flex items-center gap-2.5 px-6 py-2.5 rounded-full bg-white text-black hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/10">
                    <Sparkles size={16} />
                    <span className="text-xs font-black uppercase tracking-tighter">В студию</span>
                </button>
            </div>
        </header>

        <div className="max-w-[1800px] mx-auto p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
            <AnimatePresence mode="popLayout">
              {feed.map(post => (
                <VideoCard 
                  key={post.id} 
                  post={post} 
                  onUpgrade={() => handleUpgrade(post)}
                  onRegenerate={() => handleRegenerate(post)}
                />
              ))}
              {feed.length === 0 && (
                  <div className="col-span-full h-[60vh] flex flex-col items-center justify-center opacity-10">
                      <Clapperboard size={80} className="mb-6"/>
                      <span className="text-xl font-black uppercase tracking-[0.4em]">Студия пуста</span>
                  </div>
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
