
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
  const [isDownloading, setIsDownloading] = useState(false);
  
  const lastTapRef = useRef<number>(0);
  const [currentFilters, setCurrentFilters] = useState<VideoFilters>(post.filters || defaultFilters);

  const status = post.status ?? PostStatus.SUCCESS;
  const isLandscape = post.aspectRatio === AspectRatio.LANDSCAPE;

  useEffect(() => {
    if (post.filters) setCurrentFilters(post.filters);
  }, [post.filters]);

  useEffect(() => {
    if (status === PostStatus.GENERATING || status === PostStatus.UPGRADING) {
        setProgress(5);
        const interval = setInterval(() => {
            setProgress(prev => prev >= 98 ? 98 : prev + (100 - prev) / 20);
        }, 1000);
        return () => clearInterval(interval);
    }
  }, [status]);

  useEffect(() => {
    if (status === PostStatus.SUCCESS && videoRef.current && isVideoLoaded) {
        isPlaying ? videoRef.current.play().catch(() => {}) : videoRef.current.pause();
    }
  }, [isPlaying, isVideoLoaded, status]);

  const handleCardClick = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
        setIsPlaying(!isPlaying);
    } else {
        setShowControls(true);
        setTimeout(() => setShowControls(false), 2000);
    }
    lastTapRef.current = now;
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!post.videoUrl || isDownloading) return;
    setIsDownloading(true);
    try {
        const response = await fetch(post.videoUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `krauz-production-${post.id}.mp4`;
        a.click();
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Download failed", error);
    } finally {
        setIsDownloading(false);
    }
  };

  const getFilterString = () => `brightness(${currentFilters.brightness}%) contrast(${currentFilters.contrast}%) saturate(${currentFilters.saturate}%) grayscale(${currentFilters.grayscale}%) sepia(${currentFilters.sepia}%)`;

  return (
    <motion.div
      className={`relative w-full h-full rounded-[24px] overflow-hidden bg-[#0a0a0a] neural-border shadow-2xl flex flex-col select-none group ${isLandscape ? 'aspect-video sm:col-span-2' : 'aspect-[9/16]'}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      layout
    >
      <div className="flex-1 relative w-full h-full overflow-hidden" onClick={handleCardClick}>
        {status === PostStatus.GENERATING || status === PostStatus.UPGRADING ? (
            <div className="absolute inset-0 bg-[#050505] flex flex-col items-center justify-center p-8 overflow-hidden">
                <div className="absolute inset-0 opacity-20 blur-2xl scale-110">
                    {post.referenceImageBase64 && <img src={`data:image/png;base64,${post.referenceImageBase64}`} className="w-full h-full object-cover" />}
                </div>
                <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-[180px]">
                    <div className="w-12 h-12 rounded-full border border-white/5 flex items-center justify-center bg-white/[0.02] shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                        <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                    </div>
                    <div className="w-full space-y-3">
                        <div className="flex justify-between items-center px-1">
                            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-indigo-400 animate-pulse">Rendering</span>
                            <span className="text-[8px] font-mono text-white/40">{Math.round(progress)}%</span>
                        </div>
                        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                            <motion.div className="h-full bg-indigo-500" animate={{ width: `${progress}%` }} />
                        </div>
                    </div>
                </div>
            </div>
        ) : (
            <>
                <video
                    ref={videoRef}
                    src={post.videoUrl}
                    className="w-full h-full object-cover transition-transform duration-[10s] group-hover:scale-105"
                    style={{ filter: getFilterString() }}
                    loop muted autoPlay playsInline
                    onCanPlay={() => setIsVideoLoaded(true)}
                />
                <AnimatePresence>
                    {!isVideoLoaded && (
                        <div className="absolute inset-0 bg-black flex items-center justify-center">
                            <Loader2 className="w-6 h-6 text-white/10 animate-spin" />
                        </div>
                    )}
                </AnimatePresence>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </>
        )}

        <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full text-[8px] font-black uppercase tracking-widest text-white/60">
            <VeoLogo className="w-2.5 h-2.5" />
            {post.resolution === Resolution.P1080 ? 'Master' : 'Draft'}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 w-full p-5 flex items-end justify-between translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
        <div className="flex-1 mr-4">
            <div className="flex items-center gap-2 mb-1.5">
                <img src={post.avatarUrl} className="w-6 h-6 rounded-full border border-white/20" />
                <span className="text-[10px] font-bold text-white/80">{post.username}</span>
            </div>
            <p className="text-xs text-white/60 line-clamp-1 font-medium">{post.description}</p>
        </div>
        <div className="flex items-center gap-2 pointer-events-auto">
            <button onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} className="p-2.5 rounded-xl glass-card text-white/60 hover:text-white transition-colors">
                <SlidersHorizontal size={14} />
            </button>
            <button onClick={handleDownload} className="p-2.5 rounded-xl glass-card text-white/60 hover:text-white transition-colors">
                {isDownloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            </button>
        </div>
      </div>
      
      {/* Filter Overlay */}
      <AnimatePresence>
        {isEditing && (
            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="absolute inset-x-0 bottom-0 p-5 bg-[#0a0a0a]/95 backdrop-blur-2xl border-t border-white/10 z-50">
                <div className="flex justify-between items-center mb-6">
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/30">Color Grade</span>
                    <button onClick={() => setIsEditing(false)} className="p-1.5 bg-white rounded-lg text-black"><Check size={14} /></button>
                </div>
                <div className="space-y-4">
                    {['brightness', 'contrast', 'saturate'].map(f => (
                        <div key={f} className="flex items-center gap-4">
                            <span className="text-[8px] uppercase font-bold text-white/20 w-16">{f}</span>
                            <input type="range" min="50" max="150" value={(currentFilters as any)[f]} onChange={e => setCurrentFilters({...currentFilters, [f]: Number(e.target.value)})} className="flex-1" />
                        </div>
                    ))}
                </div>
            </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default VideoCard;
