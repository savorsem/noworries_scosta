
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { AnimatePresence, motion } from 'framer-motion';
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { AspectRatio, CameoProfile, GenerateVideoParams, GenerationMode, ImageFile, Resolution, VeoModel, VideoFile } from '../types';
import { ArrowUp, Plus, Wand2, Monitor, Smartphone, X, Loader2, Video, Upload, Film, Sparkles, Eye, Folder, FolderPlus, LayoutGrid, UserCog, Images, Trash2, Image as ImageIcon, Layers, Copy } from 'lucide-react';
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

type TabMode = 'cameo' | 'v2v' | 'frames';
const ALL_GROUP = 'Все';
const GENERAL_GROUP = 'Общее';

const BottomPromptBar: React.FC<BottomPromptBarProps> = ({ onGenerate }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [prompt, setPrompt] = useState('');
  
  // Multi-select for cameos
  const [selectedCameoIds, setSelectedCameoIds] = useState<string[]>([]);
  
  const [activeTab, setActiveTab] = useState<TabMode>('cameo');
  const [selectedModel, setSelectedModel] = useState<VeoModel>(VeoModel.VEO_FAST);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.PORTRAIT);
  const [startFrame, setStartFrame] = useState<ImageFile | null>(null);
  const [inputVideo, setInputVideo] = useState<VideoFile | null>(null);
  const [sequenceFrames, setSequenceFrames] = useState<ImageFile[]>([]);
  
  // Batch mode for frames
  const [isBatchFrameMode, setIsBatchFrameMode] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
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

  const handleCameoSelect = (id: string) => {
      setSelectedCameoIds(prev => {
          if (prev.includes(id)) return prev.filter(pId => pId !== id);
          return [...prev, id];
      });
  };

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
            setSelectedCameoIds([newProfile.id]); // Select only the new one
        } catch (err) {
            console.error("Загрузка не удалась", err);
        } finally {
            setIsUploading(false);
            e.target.value = ''; 
        }
    }
  };

  const handleSequenceUpload = async (files: FileList | null) => {
    if (!files) return;
    setIsUploading(true);
    const newFrames: ImageFile[] = [];
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith('image/')) {
          const imgFile = await fileToImageFile(file);
          newFrames.push(imgFile);
        }
      }
      setSequenceFrames(prev => [...prev, ...newFrames]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
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
          setSelectedCameoIds(prev => prev.filter(pid => pid !== id));
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
      
      // Prioritize last selected cameo for analysis
      if (activeTab === 'cameo' && selectedCameoIds.length > 0) {
           const lastId = selectedCameoIds[selectedCameoIds.length - 1];
           const cameo = profiles.find(c => c.id === lastId);
           if (cameo && cameo.imageUrl.includes('base64,')) {
               const base64 = cameo.imageUrl.split('base64,')[1];
               imageToAnalyze = { file: new File([], 'cameo.png'), base64 };
           }
      } else if (activeTab === 'frames' && sequenceFrames.length > 0) {
           imageToAnalyze = sequenceFrames[0];
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleSequenceUpload(e.dataTransfer.files);
  };

  const removeFrame = (index: number) => {
      setSequenceFrames(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (overrideMode?: GenerationMode) => {
    const isCharReplacement = overrideMode === GenerationMode.CHARACTER_REPLACEMENT;
    
    // Basic validation
    if (!prompt.trim() && !inputVideo && !isCharReplacement && sequenceFrames.length === 0) return;

    // --- BATCH CAMEO PROCESSING (SINGLE TAB) ---
    if (activeTab === 'cameo' && selectedCameoIds.length > 0) {
        // Iterate through all selected cameos and trigger a generation for each
        for (const cameoId of selectedCameoIds) {
            const cameo = profiles.find(c => c.id === cameoId);
            if (!cameo) continue;

            let referenceImages: ImageFile[] | undefined;
            try {
                const res = await fetch(cameo.imageUrl);
                const blob = await res.blob();
                const base64 = cameo.imageUrl.includes('base64,') 
                    ? cameo.imageUrl.split('base64,')[1]
                    : '';
                referenceImages = [{ file: new File([blob], 'ref.png', { type: blob.type }), base64 }];
            } catch (e) {
                console.error("Failed to load cameo image", e);
                continue;
            }

            onGenerate({
                prompt: `${prompt} (Персонаж: ${cameo.name})`,
                model: selectedModel,
                aspectRatio,
                resolution: Resolution.P720,
                mode: GenerationMode.REFERENCES_TO_VIDEO,
                referenceImages,
                startFrame: startFrame || undefined,
            });
        }
        
        // Cleanup
        setPrompt('');
        setInputVideo(null);
        setStartFrame(null);
        setSelectedCameoIds([]);
        return;
    }

    // --- VIDEO TO VIDEO & CHARACTER REPLACEMENT (V2V TAB) ---
    if (activeTab === 'v2v' && inputVideo) {
        let mode = GenerationMode.VIDEO_TO_VIDEO;
        let referenceImages: ImageFile[] | undefined;

        // If a character is selected in V2V tab, it implies Character Replacement
        if (selectedCameoIds.length > 0) {
            mode = GenerationMode.CHARACTER_REPLACEMENT;
            const cameoId = selectedCameoIds[0];
            const cameo = profiles.find(c => c.id === cameoId);
            if (cameo) {
                try {
                    const res = await fetch(cameo.imageUrl);
                    const blob = await res.blob();
                    const base64 = cameo.imageUrl.includes('base64,') 
                        ? cameo.imageUrl.split('base64,')[1]
                        : '';
                    referenceImages = [{ file: new File([blob], 'ref.png', { type: blob.type }), base64 }];
                } catch (e) {
                    console.error("Failed to load replacement character image", e);
                }
            }
        }

        onGenerate({
            prompt: mode === GenerationMode.CHARACTER_REPLACEMENT ? (prompt || "Character replacement") : prompt,
            model: selectedModel,
            aspectRatio,
            resolution: Resolution.P720,
            mode,
            inputVideo,
            startFrame, // Extracted from video upload
            referenceImages
        });

        setPrompt('');
        setInputVideo(null);
        setStartFrame(null);
        setSelectedCameoIds([]);
        return;
    }

    // --- BATCH / SEQUENCE FRAMES PROCESSING ---
    if (activeTab === 'frames' && sequenceFrames.length > 0) {
        if (isBatchFrameMode) {
             // BATCH MODE: 1 Frame -> 1 Video (Parallel)
             for (const frame of sequenceFrames) {
                 onGenerate({
                     prompt,
                     model: selectedModel,
                     aspectRatio,
                     resolution: Resolution.P720,
                     mode: GenerationMode.TEXT_TO_VIDEO, // Essentially Image-to-Video
                     startFrame: frame, // Each frame becomes the start frame for a new video
                 });
             }
        } else {
            // SEQUENCE MODE: All frames -> 1 Video
            // We pass sequenceFrames as referenceImages to guide the model, 
            // and the first frame as startFrame to ensure continuity.
            onGenerate({
                prompt,
                model: selectedModel,
                aspectRatio,
                resolution: Resolution.P720,
                mode: GenerationMode.FRAMES_TO_VIDEO,
                referenceImages: sequenceFrames,
                startFrame: sequenceFrames[0]
            });
        }
        
        setPrompt('');
        setSequenceFrames([]);
        return;
    }

    // --- STANDARD SINGLE GENERATION (Fallback) ---
    onGenerate({
      prompt,
      model: selectedModel,
      aspectRatio,
      resolution: Resolution.P720,
      mode: GenerationMode.TEXT_TO_VIDEO,
      startFrame: startFrame || undefined,
      inputVideo: inputVideo || undefined,
    });
    
    setPrompt('');
    setInputVideo(null);
    setStartFrame(null);
  };

  const getGenerateButtonText = () => {
      if (activeTab === 'cameo' && selectedCameoIds.length > 1) return `Пакет (${selectedCameoIds.length})`;
      if (activeTab === 'frames' && isBatchFrameMode && sequenceFrames.length > 1) return `Пакет (${sequenceFrames.length})`;
      if (activeTab === 'v2v' && inputVideo && selectedCameoIds.length > 0) return 'Заменить';
      return undefined; // Render Icon by default
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
                    <button onClick={() => { setActiveTab('cameo'); setSelectedCameoIds([]); }} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${activeTab === 'cameo' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'}`}>Персонаж</button>
                    <button onClick={() => { setActiveTab('frames'); setSelectedCameoIds([]); }} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${activeTab === 'frames' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'}`}>Кадры</button>
                    <button onClick={() => { setActiveTab('v2v'); setSelectedCameoIds([]); }} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${activeTab === 'v2v' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'}`}>Видео-в-Видео</button>
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
                        
                        <div className="space-y-2 pt-2 border-t border-white/5">
                             <div className="flex justify-between items-center">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Персонаж для замены</p>
                                {inputVideo && selectedCameoIds.length > 0 && (
                                    <span className="text-[9px] font-black uppercase tracking-wider text-green-400">
                                        Режим замены включен
                                    </span>
                                )}
                             </div>
                             <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                                {profiles.map(profile => (
                                    <div key={profile.id} onClick={() => { setSelectedCameoIds([profile.id]); }} className={`relative shrink-0 w-12 h-12 rounded-xl border-2 transition-all cursor-pointer overflow-hidden ${selectedCameoIds.includes(profile.id) ? 'border-green-500 scale-105 opacity-100' : 'border-transparent opacity-50 grayscale hover:grayscale-0'}`}>
                                        <img src={profile.imageUrl} alt={profile.name} className="w-full h-full object-cover" />
                                        {selectedCameoIds.includes(profile.id) && <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center"><UserCog size={16} className="text-white drop-shadow-md"/></div>}
                                    </div>
                                ))}
                             </div>
                        </div>
                    </div>
                )}

                {activeTab === 'frames' && (
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5 space-y-4">
                        <div className="flex items-center justify-between mb-2">
                             <div className="flex gap-2">
                                 <button 
                                    onClick={() => setIsBatchFrameMode(false)}
                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${!isBatchFrameMode ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-black/20 text-white/40 hover:bg-black/40'}`}
                                 >
                                    <Film size={12} /> Сцена
                                 </button>
                                 <button 
                                    onClick={() => setIsBatchFrameMode(true)}
                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${isBatchFrameMode ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-black/20 text-white/40 hover:bg-black/40'}`}
                                 >
                                    <Layers size={12} /> Пакет
                                 </button>
                             </div>
                             <span className="text-[9px] text-white/30 uppercase tracking-widest font-bold">
                                 {isBatchFrameMode ? "Каждый кадр → Отдельное видео" : "Все кадры → Одно видео"}
                             </span>
                        </div>

                        <div 
                            className={`w-full h-24 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer relative ${isDragging ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/10 hover:border-white/20 hover:bg-white/5'}`}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                        >
                            <input 
                                type="file" 
                                multiple 
                                accept="image/*" 
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                onChange={(e) => handleSequenceUpload(e.target.files)}
                            />
                            {isUploading ? (
                                <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
                            ) : (
                                <>
                                    <Images className={`w-6 h-6 mb-2 ${isDragging ? 'text-indigo-400' : 'text-white/20'}`} />
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">
                                        {isDragging ? 'Отпустите файлы' : 'Перетащите кадры сюда'}
                                    </span>
                                </>
                            )}
                        </div>

                        {sequenceFrames.length > 0 && (
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                                        {isBatchFrameMode ? 'Пакет кадров' : 'Сценарий'} ({sequenceFrames.length})
                                    </span>
                                    <button onClick={() => setSequenceFrames([])} className="text-[9px] text-red-400 hover:text-red-300 uppercase font-black tracking-wider">Очистить</button>
                                </div>
                                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                                    {sequenceFrames.map((frame, idx) => (
                                        <div key={idx} className="relative shrink-0 w-20 h-14 bg-black rounded-lg overflow-hidden border border-white/10 group">
                                            <img src={`data:${frame.file.type};base64,${frame.base64}`} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                                            <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/60 rounded text-[8px] font-mono text-white/80">{idx + 1}</div>
                                            <button 
                                                onClick={() => removeFrame(idx)}
                                                className="absolute top-1 right-1 p-1 bg-red-500/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                                            >
                                                <X size={8} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {sequenceFrames.length === 0 && (
                            <p className="text-center text-[10px] text-white/20 py-2">Загрузите серию изображений для обработки.</p>
                        )}
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

                        {selectedCameoIds.length > 0 && (
                            <div className="flex justify-between items-center px-1">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">
                                    {selectedCameoIds.length === 1 
                                        ? profiles.find(p => p.id === selectedCameoIds[0])?.name || 'Персонаж'
                                        : `Выбрано: ${selectedCameoIds.length}`
                                    }
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
                                    <div key={profile.id} onClick={() => handleCameoSelect(profile.id)} className={`relative shrink-0 w-12 h-12 rounded-full border-2 transition-all cursor-pointer overflow-hidden ${selectedCameoIds.includes(profile.id) ? 'border-indigo-500 scale-110' : 'border-transparent'}`}>
                                        <img src={profile.imageUrl} alt={profile.name} className="w-full h-full object-cover" />
                                        {selectedCameoIds.includes(profile.id) && <div className="absolute inset-0 bg-indigo-500/30 flex items-center justify-center"><div className="w-2 h-2 bg-white rounded-full shadow-lg" /></div>}
                                        {profile.id.startsWith('user-') && (
                                            <button onClick={(e) => handleRemoveProfile(profile.id, e)} className="absolute top-0 right-0 p-0.5 bg-red-500 rounded-full opacity-0 hover:opacity-100 transition-opacity z-10">
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
                    <select 
                        value={selectedModel} 
                        onChange={e => setSelectedModel(e.target.value as VeoModel)} 
                        className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white/80 focus:outline-none"
                    >
                      <optgroup label="Veo 3.1 (Актуальные)">
                          <option value={VeoModel.VEO_FAST}>⚡ Veo 3.1 Fast (Быстрая/Preview)</option>
                          <option value={VeoModel.VEO_31}>🌟 Veo 3.1 Pro (Высокое качество)</option>
                      </optgroup>
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
                placeholder={activeTab === 'v2v' ? "Опишите, как изменить видео..." : activeTab === 'frames' ? (isBatchFrameMode ? "Опишите общее действие для всех кадров..." : "Опишите сцену для последовательности...") : "Опишите ваше кинематографическое видение..."}
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
            <button 
                onClick={() => handleSubmit()} 
                disabled={!prompt.trim() && !inputVideo && sequenceFrames.length === 0} 
                className={`p-4 rounded-full transition-all shadow-xl shadow-white/5 hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center gap-2 ${
                    (selectedCameoIds.length > 1 || (isBatchFrameMode && sequenceFrames.length > 1) || (activeTab === 'v2v' && selectedCameoIds.length > 0)) 
                    ? 'bg-indigo-600 text-white px-6' 
                    : 'bg-white text-black'
                }`}
            >
              {getGenerateButtonText() ? (
                  <>
                    <span className="text-[10px] font-black uppercase tracking-wider">{getGenerateButtonText()}</span>
                    <Copy size={16} />
                  </>
              ) : (
                  <ArrowUp size={20} />
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default BottomPromptBar;
