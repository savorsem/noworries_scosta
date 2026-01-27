
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { motion, AnimatePresence } from 'framer-motion';
import React, { useRef, useState, useEffect } from 'react';
import { FeedPost, PostStatus, VideoFilters, AspectRatio, Resolution } from '../types';
import { VeoLogo } from './icons';
import { AlertCircle, Download, SlidersHorizontal, Check, X, Play, Pause, Sun, Contrast, Droplets, Loader2, ChevronUp, Sparkles, RefreshCw } from 'lucide-react';

interface VideoCardProps {
  post: FeedPost;
  onUpdate?: (post: FeedPost) => void;
  onUpgrade?: () => void;
  onRegenerate?: () => void;
}

const defaultFilters: VideoFilters = {
  brightness: 100,
  contrast: 100,
  saturate: 100,
  grayscale: 0,
  sepia: 0,
};

const VideoCard: React.FC<VideoCardProps> = ({ post, onUpdate, onUpgrade, onRegenerate }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const lastTapRef = useRef<number>(0);
  const [currentFilters, setCurrentFilters] = useState<VideoFilters>(post.filters || defaultFilters);

  const status = post.status ?? PostStatus.SUCCESS;
  const isLandscape = post.aspectRatio === AspectRatio.LANDSCAPE;

  useEffect(() => {
    if (post.filters) setCurrentFilters(post.filters);
  }, [post.filters]);

  // Simulated progress for generation
  useEffect(() => {
    if (status === PostStatus.GENERATING || status === PostStatus.UPGRADING) {
        setProgress(5);
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 98) return 98;
                // Logarithmic-like slowdown: fast start, slow finish
                const remaining = 100 - prev;
                const bump = Math.random() * (remaining / 15);
                return prev + bump;
            });
        }, 800);
        return () => clearInterval(interval);
    } else {
        setProgress(0);
    }
  }, [status]);

  useEffect(() => {
    if (status === PostStatus.SUCCESS && videoRef.current && isVideoLoaded) {
        if (isPlaying) {
            videoRef.current.play().catch(() => setIsPlaying(false));
        } else {
            videoRef.current.pause();
        }
    }
  }, [isPlaying, isVideoLoaded, status]);

  const togglePlay = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsPlaying(!isPlaying);
    setShowControls(true);
    setTimeout(() => setShowControls(false), 2000);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
        togglePlay();
    } else {
        setShowControls(true);
        setTimeout(() => setShowControls(false), 2500);
    }
    lastTapRef.current = now;
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!post.videoUrl || status !== PostStatus.SUCCESS) return;
    try {
        const a = document.createElement('a');
        a.download = `noworries-veo-${post.id}.mp4`;
        a.href = post.videoUrl;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } catch (error) { console.error(error); }
  };

  const saveFilters = () => {
    if (onUpdate) onUpdate({ ...post, filters: currentFilters });
    setIsEditing(false);
  };

  const cancelFilters = () => {
    setCurrentFilters(post.filters || defaultFilters);
    setIsEditing(false);
  };

  const getFilterString = () => {
    return `brightness(${currentFilters.brightness}%) contrast(${currentFilters.contrast}%) saturate(${currentFilters.saturate}%) grayscale(${currentFilters.grayscale}%) sepia(${currentFilters.sepia}%)`;
  };

  const getProgressStage = (pct: number) => {
      if (pct < 15) return "Инициализация...";
      if (pct < 40) return "Анализ сцены...";
      if (pct < 70) return "Рендеринг Veo...";
      if (pct < 90) return "Сборка кадров...";
      return "Финальная обработка...";
  };

  const renderContent = () => {
    switch (status) {
      case PostStatus.GENERATING:
      case PostStatus.UPGRADING:
        return (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950 p-6 text-center overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/40 via-gray-950 to-gray-950 animate-pulse-subtle"></div>
            {(post.referenceImageBase64 || post.videoUrl) && (
              <div className="absolute inset-0 z-0 opacity-40 blur-sm scale-105">
                {post.videoUrl ? (
                    <video src={post.videoUrl} className="w-full h-full object-cover" muted loop autoPlay />
                ) : (
                    <img src={`data:image/png;base64,${post.referenceImageBase64}`} alt="Reference" className="w-full h-full object-cover" />
                )}
              </div>
            )}
            <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-xs">
              <div className="w-16 h-16 rounded-full border border-white/10 bg-black/50 backdrop-blur-xl flex items-center justify-center relative shadow-[0_0_30px_rgba(99,102,241,0.3)]">
                  <div className="absolute inset-0 rounded-full border-t-2 border-r-2 border-indigo-400 animate-spin"></div>
                  <VeoLogo className="w-6 h-6 text-white" />
              </div>
              
              <div className="space-y-3 w-full">
                <div className="flex justify-between items-end px-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-300 animate-pulse">
                         {status === PostStatus.UPGRADING ? 'Улучшение' : getProgressStage(progress)}
                    </span>
                    <span className="text-[10px] font-mono text-white/60">{Math.round(progress)}%</span>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                        className="h-full bg-gradient-to-r from-indigo-600 to-purple-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ type: 'spring', bounce: 0, duration: 0.5 }}
                    />
                </div>

                <p className="text-[10px] text-white/40 line-clamp-2 leading-relaxed pt-1">"{post.description}"</p>
              </div>
            </div>
          </div>
        );
      
      case PostStatus.ERROR:
        return (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/80 border border-red-500/20 p-6 text-center">
            <div className="p-4 rounded-full bg-red-500/10 mb-4">
                <AlertCircle className="w-8 h-8 text-red-500 opacity-80" />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-red-400 mb-2">Ошибка</p>
            <p className="text-xs text-white/60">{post.errorMessage || "Неизвестная ошибка"}</p>
          </div>
        );
      
      case PostStatus.SUCCESS:
      default:
        return (
          <div className="relative w-full h-full bg-black overflow-hidden" onClick={handleCardClick}>
            <video
              ref={videoRef}
              src={post.videoUrl}
              poster={post.referenceImageBase64 ? `data:image/png;base64,${post.referenceImageBase64}` : undefined}
              className={`w-full h-full object-cover transition-transform duration-[15s] ease-out ${isVideoPlaying ? 'scale-100' : 'scale-110'}`}
              style={{ filter: getFilterString() }}
              loop
              autoPlay
              muted
              playsInline
              preload="auto"
              onCanPlay={() => setIsVideoLoaded(true)}
              onPlaying={() => setIsVideoPlaying(true)}
              onPause={() => { setIsPlaying(false); setIsVideoPlaying(false); }}
              onPlay={() => setIsPlaying(true)}
            />
            
            <AnimatePresence>
                {!isVideoLoaded && (
                    <motion.div 
                        key="poster-overlay"
                        initial={{ opacity: 1 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.8, ease: "easeInOut" }}
                        className="absolute inset-0 z-10 bg-black"
                    >
                        {post.referenceImageBase64 ? (
                            <img 
                                src={`data:image/png;base64,${post.referenceImageBase64}`} 
                                alt="Постер"
                                className="w-full h-full object-cover"
                                style={{ filter: getFilterString() }}
                            />
                        ) : (
                            <div className="w-full h-full bg-gray-950 flex items-center justify-center">
                                <Loader2 className="w-8 h-8 text-white/10 animate-spin" />
                            </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
                            <Loader2 className="w-8 h-8 text-white/40 animate-spin" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showControls && (
                    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                        <div className="p-5 rounded-full bg-black/40 backdrop-blur-md text-white/90">
                            {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
          </div>
        );
    }
  };

  return (
    <motion.div
      className={`relative w-full h-full rounded-[32px] overflow-hidden bg-gray-900/40 border border-white/5 group shadow-2xl flex flex-col select-none ${isLandscape ? 'aspect-video sm:col-span-2' : 'aspect-[9/16]'}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      layout
    >
      <div className="flex-1 relative w-full h-full">
        {renderContent()}
      </div>

      <AnimatePresence>
        {isEditing && (
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="absolute inset-x-0 bottom-0 bg-neutral-950/95 p-5 z-40 rounded-t-3xl border-t border-white/10 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Техническая цветокоррекция</span>
                    <div className="flex gap-2">
                        <button onClick={cancelFilters} className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white"><X className="w-4 h-4" /></button>
                        <button onClick={saveFilters} className="p-2 rounded-full bg-white text-black"><Check className="w-4 h-4" /></button>
                    </div>
                </div>
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] uppercase font-bold text-white/30 w-16">Яркость</span>
                        <input type="range" min="50" max="150" value={currentFilters.brightness} onChange={e => setCurrentFilters({...currentFilters, brightness: Number(e.target.value)})} className="flex-grow" />
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] uppercase font-bold text-white/30 w-16">Контраст</span>
                        <input type="range" min="50" max="150" value={currentFilters.contrast} onChange={e => setCurrentFilters({...currentFilters, contrast: Number(e.target.value)})} className="flex-grow" />
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] uppercase font-bold text-white/30 w-16">Цвет</span>
                        <input type="range" min="0" max="200" value={currentFilters.saturate} onChange={e => setCurrentFilters({...currentFilters, saturate: Number(e.target.value)})} className="flex-grow" />
                    </div>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/40 border border-white/10 backdrop-blur-xl px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-white/90 shadow-lg z-20">
        <VeoLogo className="w-3 h-3 opacity-90" />
        {post.resolution === Resolution.P1080 ? (
          <span className="flex items-center gap-1.5 text-indigo-400">
            <Sparkles className="w-3 h-3" />
            1080p Master
          </span>
        ) : (
          <span>720p Предпросмотр</span>
        )}
      </div>

      <div className={`absolute bottom-0 left-0 w-full p-5 flex items-end justify-between z-20 pt-24 bg-gradient-to-t from-black/90 via-black/40 to-transparent transition-opacity duration-300 ${status !== PostStatus.SUCCESS || isEditing ? 'opacity-0' : 'opacity-100'}`}>
        <div className="flex-1 mr-4 pointer-events-none">
          <div className="flex items-center gap-2.5 mb-2">
            <img src={post.avatarUrl} alt={post.username} className="w-7 h-7 rounded-full border border-white/20" />
            <span className="font-semibold text-xs text-white/90 tracking-wide">{post.username}</span>
          </div>
          <p className="text-sm text-white line-clamp-2 font-light leading-snug">{post.description}</p>
        </div>
        <div className="flex flex-col gap-3 items-center shrink-0">
            {post.resolution !== Resolution.P1080 && onUpgrade && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onUpgrade(); }} 
                    className="p-3.5 rounded-full bg-indigo-500 border border-indigo-400 backdrop-blur-md hover:bg-indigo-600 transition-all text-white shadow-[0_0_20px_rgba(99,102,241,0.4)] group/upgrade"
                    title="Улучшить до 1080p Master"
                >
                    <div className="relative">
                        <ChevronUp className="w-5 h-5 group-hover/upgrade:-translate-y-0.5 transition-transform" />
                        <Sparkles className="w-2.5 h-2.5 absolute -top-1 -right-1 opacity-0 group-hover/upgrade:opacity-100 transition-opacity" />
                    </div>
                </button>
            )}
            
            {onRegenerate && post.originalParams && (
                 <button 
                    onClick={(e) => { e.stopPropagation(); onRegenerate(); }} 
                    className="p-3 rounded-full bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/20 transition-all text-white" 
                    title="Повторить генерацию"
                 >
                    <RefreshCw className="w-5 h-5" />
                 </button>
            )}

            <button onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} className="p-3 rounded-full bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/20 transition-all text-white" title="Настройки фильтров"><SlidersHorizontal className="w-5 h-5" /></button>
            <button onClick={handleDownload} className="p-3 rounded-full bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/20 transition-all text-white" title="Скачать"><Download className="w-5 h-5" /></button>
        </div>
      </div>
    </motion.div>
  );
};

export default VideoCard;
