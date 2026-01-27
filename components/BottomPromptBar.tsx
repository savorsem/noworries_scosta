
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { AnimatePresence, motion } from 'framer-motion';
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { AspectRatio, CameoProfile, GenerateVideoParams, GenerationMode, ImageFile, Resolution, VeoModel, VideoFile } from '../types';
import { ArrowUp, Plus, Wand2, Monitor, Smartphone, X, Loader2, Video, Upload, Film, Sparkles, Eye, Folder, FolderPlus, LayoutGrid, UserCog } from 'lucide-react';
import { getUserProfiles, saveProfile, deleteProfile } from '../utils/db';
import { enhancePrompt, analyzeImage } from '../services/geminiService';

const defaultCameoProfiles: CameoProfile[] = [
  { id: '1', name: 'asr', group: 'Veo Stars', imageUrl: 'https://api.dicebear.com/7.x/avataaars/png?seed=asr&backgroundColor=transparent' },
  { id: '2', name: 'skirano', group: 'Veo Stars', imageUrl: 'https://api.dicebear.com/7.x/avataaars/png?seed=skirano&backgroundColor=transparent' },
  { id: '3', name: 'lc-99', group: 'Veo Stars', imageUrl: 'https://api.dicebear.com/7.x/avataaars/png?seed=lc99&backgroundColor=transparent' },
  { id: '4', name: 'sama', group: 'Veo Stars', imageUrl: 'https://api.dicebear.com/7.x/avataaars/png?seed=sama&backgroundColor=transparent' },
  { id: '5', name: 'justinem', group: 'Veo Stars', imageUrl: 'https://api.dicebear.com/7.x/avataaars/png?seed=justinem&backgroundColor=transparent' },
];

const fileToImageFile = (file: File): Promise<ImageFile> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
            const base64 = reader.result.split(',')[1];
            resolve({file, base64});
        } else reject(new Error('Ошибка чтения файла'));
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
};

const fileToVideoFile = (file: File): Promise<VideoFile> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
            const base64 = reader.result.split(',')[1];
            resolve({file, base64});
        } else reject(new Error('Ошибка чтения файла'));
      };
      reader.readAsDataURL(file);
    });
};

// Helper to extract the first frame of a video as an image
const extractFirstFrame = async (videoFile: File): Promise<ImageFile> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      video.currentTime = 0;
    };
    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg');
          const base64 = dataUrl.split(',')[1];
          resolve({ file: new File([], 'frame.jpg', { type: 'image/jpeg' }), base64 });
        } else {
          reject(new Error('Canvas context failed'));
        }
      } catch (e) {
        reject(e);
      }
    };
    video.onerror = () => reject(new Error('Video load failed'));
    video.src = URL.createObjectURL(videoFile);
  });
};

interface BottomPromptBarProps {
  onGenerate: (params: GenerateVideoParams) => void;
}

type TabMode = 'cameo' | 'v2v';
const ALL_GROUP = 'Все';
const GENERAL_GROUP = 'Общее';

const BottomPromptBar: React.FC<BottomPromptBarProps> = ({ onGenerate }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [prompt, setPrompt] = useState('');
  const [selectedCameoId, setSelectedCameoId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabMode>('cameo');
  const [selectedModel, setSelectedModel] = useState<VeoModel>(VeoModel.VEO_FAST);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.PORTRAIT);
  const [startFrame, setStartFrame] = useState<ImageFile | null>(null);
  const [inputVideo, setInputVideo] = useState<VideoFile | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [profiles, setProfiles] = useState<CameoProfile[]>(defaultCameoProfiles);
  
  // Grouping state
  const [activeGroup, setActiveGroup] = useState<string>(ALL_GROUP);
  const [tempGroups, setTempGroups] = useState<string[]>([]);

  const inputRef = useRef<HTMLTextAreaElement>(null);

  const loadProfiles = async () => {
    try {
        const userProfiles = await getUserProfiles();
        const combined = [...userProfiles.reverse(), ...defaultCameoProfiles];
        setProfiles(combined);
    } catch (e) {
        console.error("Не удалось загрузить профили", e);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  const availableGroups = useMemo(() => {
      const groups = new Set<string>();
      groups.add(ALL_GROUP);
      profiles.forEach(p => groups.add(p.group || GENERAL_GROUP));
      tempGroups.forEach(g => groups.add(g));
      return Array.from(groups).sort((a, b) => {
          if (a === ALL_GROUP) return -1;
          if (b === ALL_GROUP) return 1;
          return a.localeCompare(b);
      });
  }, [profiles, tempGroups]);

  const filteredProfiles = useMemo(() => {
      if (activeGroup === ALL_GROUP) return profiles;
      return profiles.filter(p => (p.group || GENERAL_GROUP) === activeGroup);
  }, [profiles, activeGroup]);

  const handleCreateGroup = () => {
      const name = window.prompt("Название новой папки:");
      if (name && name.trim()) {
          const cleanName = name.trim();
          setTempGroups(prev => [...prev, cleanName]);
          setActiveGroup(cleanName);
      }
  };

  const handleCameoSelect = (id: string) => setSelectedCameoId(selectedCameoId === id ? null : id);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
        setIsUploading(true);
        try {
            const imgFile = await fileToImageFile(file);
            const groupToSave = activeGroup === ALL_GROUP ? GENERAL_GROUP : activeGroup;
            
            const newProfile: CameoProfile = { 
                id: `user-${Date.now()}`, 
                name: 'Свой персонаж', 
                imageUrl: `data:${file.type};base64,${imgFile.base64}`,
                group: groupToSave
            };
            await saveProfile(newProfile);
            await loadProfiles();
            setSelectedCameoId(newProfile.id);
        } catch (err) {
            console.error("Загрузка не удалась", err);
        } finally {
            setIsUploading(false);
            e.target.value = ''; 
        }
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
        setIsUploading(true);
        try {
            const videoFile = await fileToVideoFile(file);
            setInputVideo(videoFile);
            const frame = await extractFirstFrame(file);
            setStartFrame(frame);
        } catch (err) {
            console.error(err);
        } finally {
            setIsUploading(false);
            e.target.value = '';
        }
    }
  };

  const handleRemoveProfile = async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!id.startsWith('user-')) return;
      if (confirm('Удалить этого персонажа?')) {
          await deleteProfile(id);
          if (selectedCameoId === id) setSelectedCameoId(null);
          await loadProfiles();
      }
  };

  const handleEnhancePrompt = async () => {
      if (!prompt.trim() || isEnhancing) return;
      setIsEnhancing(true);
      try {
          const enhanced = await enhancePrompt(prompt);
          setPrompt(enhanced);
      } catch (e) {
          console.error("Failed to enhance prompt", e);
      } finally {
          setIsEnhancing(false);
      }
  };

  const handleAnalyzeContent = async () => {
      if (isAnalyzing) return;
      
      let imageToAnalyze: ImageFile | null = null;
      
      if (activeTab === 'cameo' && selectedCameoId) {
           const cameo = profiles.find(c => c.id === selectedCameoId);
           if (cameo && cameo.imageUrl.includes('base64,')) {
               const base64 = cameo.imageUrl.split('base64,')[1];
               imageToAnalyze = { file: new File([], 'cameo.png'), base64 };
           }
      }
      if (!imageToAnalyze && startFrame) {
          imageToAnalyze = startFrame;
      }

      if (!imageToAnalyze) return;

      setIsAnalyzing(true);
      try {
          const description = await analyzeImage(imageToAnalyze.base64, imageToAnalyze.file.type || 'image/jpeg');
          setPrompt(prev => prev ? `${prev}\n\nСтиль: ${description}` : description);
      } catch (e) {
          console.error("Failed to analyze", e);
      } finally {
          setIsAnalyzing(false);
      }
  };

  const handleSubmit = async (overrideMode?: GenerationMode) => {
    // If we're doing character replacement, we don't strictly need a prompt as we generate it, 
    // but if it's normal generation, we might.
    if (!prompt.trim() && !inputVideo && overrideMode !== GenerationMode.CHARACTER_REPLACEMENT) return;
    
    let mode = overrideMode || GenerationMode.TEXT_TO_VIDEO;
    let referenceImages: ImageFile[] | undefined;
    
    // Character Reference Logic
    if (selectedCameoId) {
      const cameo = profiles.find(c => c.id === selectedCameoId);
      if (cameo) {
          const res = await fetch(cameo.imageUrl);
          const blob = await res.blob();
          const base64 = cameo.imageUrl.includes('base64,') 
            ? cameo.imageUrl.split('base64,')[1]
            : ''; 
          referenceImages = [{ file: new File([blob], 'ref.png', { type: blob.type }), base64 }];
      }
    }

    if (!overrideMode) {
        if (activeTab === 'v2v' && inputVideo) {
            mode = GenerationMode.VIDEO_TO_VIDEO;
        } else if (referenceImages) {
            mode = GenerationMode.REFERENCES_TO_VIDEO;
        }
    }

    onGenerate({
      prompt,
      model: selectedModel,
      aspectRatio,
      resolution: Resolution.P720,
      mode,
      referenceImages,
      startFrame, // This will be the first frame of the video if V2V is active
      inputVideo,
    });
    
    setPrompt('');
    setInputVideo(null);
    setStartFrame(null);
    setSelectedCameoId(null);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none pb-[env(safe-area-inset-bottom)] mb-2 md:mb-6">
      <motion.div className="w-full max-w-2xl mx-2 md:mx-4 bg-neutral-900/90 border border-white/10 backdrop-blur-2xl shadow-2xl rounded-[32px] overflow-hidden pointer-events-auto relative ring-1 ring-white/5">
        <div className="p-4 md:p-6 space-y-4">
          <AnimatePresence>
            {isExpanded && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-4 overflow-hidden">
                
                {/* Tabs */}
                <div className="flex bg-black/20 rounded-xl p-1 w-fit mb-2">
                    <button onClick={() => setActiveTab('cameo')} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${activeTab === 'cameo' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'}`}>Персонаж</button>
                    <button onClick={() => setActiveTab('v2v')} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${activeTab === 'v2v' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'}`}>Видео-в-Видео</button>
                </div>

                {activeTab === 'v2v' && (
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex flex-col gap-4">
                        <div className="flex items-center gap-4">
                             <div className="relative w-24 h-24 rounded-xl bg-black/40 border border-dashed border-white/20 flex flex-col items-center justify-center shrink-0 overflow-hidden group">
                                {inputVideo ? (
                                    <>
                                        <video src={URL.createObjectURL(inputVideo.file)} className="w-full h-full object-cover opacity-60" muted />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                            <Video className="w-6 h-6 text-white" />
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); setInputVideo(null); setStartFrame(null); }} className="absolute top-1 right-1 p-1 bg-black/60 rounded-full hover:bg-black transition-colors"><X size={10} /></button>
                                    </>
                                ) : (
                                    <>
                                        {isUploading ? <Loader2 className="w-6 h-6 text-white/40 animate-spin" /> : <Upload className="w-6 h-6 text-white/20 group-hover:text-white/40 transition-colors" />}
                                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="video/*" onChange={handleVideoUpload} />
                                    </>
                                )}
                             </div>
                             <div className="flex-1 space-y-2">
                                <div className="flex justify-between items-center">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Загрузка видео</p>
                                    {inputVideo && (
                                        <button onClick={handleAnalyzeContent} disabled={isAnalyzing} className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-50">
                                            {isAnalyzing ? <Loader2 size={10} className="animate-spin"/> : <Eye size={10} />}
                                            Описать сцену
                                        </button>
                                    )}
                                </div>
                                <p className="text-xs text-white/60 leading-relaxed line-clamp-2">
                                    {inputVideo ? `Выбран: ${inputVideo.file.name}` : "Загрузите видео, чтобы изменить его стиль или заменить персонажа."}
                                </p>
                             </div>
                        </div>
                        
                        <div className="space-y-2">
                             <div className="flex justify-between items-center">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Персонаж для замены</p>
                                {inputVideo && selectedCameoId && (
                                    <button 
                                        onClick={() => handleSubmit(GenerationMode.CHARACTER_REPLACEMENT)}
                                        className="flex items-center gap-2 px-3 py-1 bg-indigo-600 rounded-lg text-[10px] font-bold uppercase text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 transition-all animate-pulse"
                                    >
                                        <UserCog size={12} />
                                        Полная замена
                                    </button>
                                )}
                             </div>
                             <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                                {profiles.map(profile => (
                                    <div key={profile.id} onClick={() => handleCameoSelect(profile.id)} className={`relative shrink-0 w-10 h-10 rounded-lg border-2 transition-all cursor-pointer overflow-hidden ${selectedCameoId === profile.id ? 'border-indigo-500 scale-105 opacity-100' : 'border-transparent opacity-50 grayscale hover:grayscale-0'}`}>
                                        <img src={profile.imageUrl} alt={profile.name} className="w-full h-full object-cover" />
                                    </div>
                                ))}
                             </div>
                        </div>
                    </div>
                )}

                {activeTab === 'cameo' && (
                    <div className="space-y-4">
                        {/* Folder Bar */}
                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                            <button onClick={handleCreateGroup} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all shrink-0">
                                <FolderPlus size={12} />
                            </button>
                            {availableGroups.map(group => (
                                <button
                                    key={group}
                                    onClick={() => setActiveGroup(group)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shrink-0 transition-all ${
                                        activeGroup === group 
                                        ? 'bg-white text-black border-white' 
                                        : 'bg-white/5 text-white/40 border-transparent hover:text-white hover:border-white/10'
                                    }`}
                                >
                                    {group === ALL_GROUP ? <LayoutGrid size={10} /> : <Folder size={10} />}
                                    {group}
                                </button>
                            ))}
                        </div>

                        {selectedCameoId && (
                            <div className="flex justify-between items-center px-1">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">
                                    {profiles.find(p => p.id === selectedCameoId)?.name || 'Персонаж'}
                                </span>
                                <button onClick={handleAnalyzeContent} disabled={isAnalyzing} className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-50">
                                    {isAnalyzing ? <Loader2 size={10} className="animate-spin"/> : <Eye size={10} />}
                                    Описать
                                </button>
                            </div>
                        )}

                        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 min-h-[56px] items-center">
                            <label className="shrink-0 w-12 h-12 rounded-full border border-dashed border-white/20 flex items-center justify-center cursor-pointer hover:bg-white/5 transition-colors group relative" title={`Загрузить в: ${activeGroup}`}>
                                <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                                {isUploading ? <Loader2 className="w-5 h-5 animate-spin text-white/40" /> : <Plus size={20} className="text-white/40 group-hover:text-white" />}
                            </label>
                            
                            {filteredProfiles.length === 0 ? (
                                <span className="text-[10px] text-white/20 px-2">Папка пуста</span>
                            ) : (
                                filteredProfiles.map(profile => (
                                    <div key={profile.id} onClick={() => handleCameoSelect(profile.id)} className={`relative shrink-0 w-12 h-12 rounded-full border-2 transition-all cursor-pointer overflow-hidden ${selectedCameoId === profile.id ? 'border-indigo-500 scale-110' : 'border-transparent'}`}>
                                    <img src={profile.imageUrl} alt={profile.name} className="w-full h-full object-cover" />
                                    {profile.id.startsWith('user-') && (
                                        <button onClick={(e) => handleRemoveProfile(profile.id, e)} className="absolute top-0 right-0 p-0.5 bg-red-500 rounded-full opacity-0 hover:opacity-100 transition-opacity">
                                        <X size={8} />
                                        </button>
                                    )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <select value={selectedModel} onChange={e => setSelectedModel(e.target.value as VeoModel)} className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white/60 focus:outline-none">
                      <option value={VeoModel.VEO_FAST}>Быстрая (3.1 Fast)</option>
                      <option value={VeoModel.VEO_31}>Продвинутая (3.1 Pro)</option>
                      <option value={VeoModel.VEO_2}>Veo 2</option>
                    </select>
                    <button onClick={() => setAspectRatio(aspectRatio === AspectRatio.LANDSCAPE ? AspectRatio.PORTRAIT : AspectRatio.LANDSCAPE)} className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white transition-colors" title="Сменить ориентацию">
                      {aspectRatio === AspectRatio.LANDSCAPE ? <Monitor size={14} /> : <Smartphone size={14} />}
                    </button>
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-white/20">Управление студией</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-end gap-3">
            <div className="flex-1 relative bg-white/5 border border-white/10 rounded-[24px] overflow-hidden focus-within:border-white/30 transition-all">
              <textarea 
                ref={inputRef}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
                placeholder={activeTab === 'v2v' ? "Опишите, как изменить видео..." : "Опишите ваше кинематографическое видение..."}
                className="w-full bg-transparent p-4 pr-12 text-sm text-white placeholder:text-white/20 resize-none max-h-32 min-h-[56px] focus:outline-none no-scrollbar"
                rows={1}
              />
              <div className="absolute right-3 bottom-3 flex items-center gap-2">
                <button 
                  onClick={handleEnhancePrompt} 
                  disabled={isEnhancing || !prompt.trim()}
                  className={`p-1.5 rounded-full transition-all ${isEnhancing ? 'bg-indigo-500 text-white animate-pulse' : 'bg-white/5 text-white/40 hover:text-indigo-400 hover:bg-white/10'}`}
                  title="Улучшить промпт (AI)"
                >
                  <Sparkles size={16} />
                </button>
                <button onClick={() => setIsExpanded(!isExpanded)} className="p-1.5 rounded-full bg-white/5 text-white/40 hover:text-white transition-colors">
                    <Wand2 size={16} />
                </button>
              </div>
            </div>
            <button onClick={() => handleSubmit()} disabled={!prompt.trim() && !inputVideo} className="p-4 rounded-full bg-white text-black disabled:bg-white/10 disabled:text-white/20 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/5">
              <ArrowUp size={20} />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default BottomPromptBar;
