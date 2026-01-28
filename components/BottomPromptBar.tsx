
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { AnimatePresence, motion } from 'framer-motion';
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { AspectRatio, CameoProfile, GenerateVideoParams, GenerationMode, ImageFile, Resolution, VeoModel, VideoFile } from '../types';
import { ArrowUp, Plus, Wand2, Monitor, Smartphone, X, Loader2, Sparkles, Settings2, Database, LayoutGrid, Check, CheckSquare, Square } from 'lucide-react';
import { getUserProfiles, saveProfile } from '../utils/db';
import { getEnhancedSuggestions } from '../services/geminiService';

const defaultCameoProfiles: CameoProfile[] = [
  { id: '1', name: 'asr', group: 'KRAUZ', imageUrl: 'https://api.dicebear.com/7.x/avataaars/png?seed=asr&backgroundColor=transparent' },
  { id: '2', name: 'skirano', group: 'KRAUZ', imageUrl: 'https://api.dicebear.com/7.x/avataaars/png?seed=skirano&backgroundColor=transparent' },
  { id: '3', name: 'lc-99', group: 'KRAUZ', imageUrl: 'https://api.dicebear.com/7.x/avataaars/png?seed=lc99&backgroundColor=transparent' },
  { id: '4', name: 'sama', group: 'KRAUZ', imageUrl: 'https://api.dicebear.com/7.x/avataaars/png?seed=sama&backgroundColor=transparent' },
];

const fileToImageFile = (file: File): Promise<ImageFile> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({file, base64: (reader.result as string).split(',')[1]});
      reader.readAsDataURL(file);
    });
};

interface BottomPromptBarProps {
  onGenerate: (params: GenerateVideoParams) => void;
}

const BottomPromptBar: React.FC<BottomPromptBarProps> = ({ onGenerate }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [selectedCameoIds, setSelectedCameoIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'cameo' | 'v2v' | 'frames'>('cameo');
  const [selectedModel, setSelectedModel] = useState<VeoModel>(VeoModel.VEO_FAST);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.PORTRAIT);
  
  const [isUploading, setIsUploading] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [promptSuggestions, setPromptSuggestions] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<CameoProfile[]>(defaultCameoProfiles);

  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    getUserProfiles().then(u => setProfiles([...u.reverse(), ...defaultCameoProfiles]));
  }, []);

  const handleEnhancePrompt = async () => {
      if (!prompt.trim() || isEnhancing) return;
      setIsEnhancing(true);
      try {
          const suggestions = await getEnhancedSuggestions(prompt, `Режим: ${activeTab}, Формат: ${aspectRatio}`);
          setPromptSuggestions(suggestions);
      } finally { setIsEnhancing(false); }
  };

  const handleSubmit = async () => {
    if (!prompt.trim()) return;
    if (activeTab === 'cameo' && selectedCameoIds.length > 0) {
        for (const id of selectedCameoIds) {
            const cameo = profiles.find(p => p.id === id);
            if (!cameo) continue;
            const res = await fetch(cameo.imageUrl);
            const blob = await res.blob();
            onGenerate({
                prompt: `${prompt} (Style: ${cameo.name})`,
                model: selectedModel, aspectRatio, resolution: Resolution.P720,
                mode: GenerationMode.REFERENCES_TO_VIDEO,
                referenceImages: [{ file: new File([blob], 'ref.png'), base64: cameo.imageUrl.split('base64,')[1] || '' }]
            });
        }
    } else {
        onGenerate({
            prompt, model: selectedModel, aspectRatio, resolution: Resolution.P720,
            mode: GenerationMode.TEXT_TO_VIDEO
        });
    }
    setPrompt('');
    setSelectedCameoIds([]);
    setIsExpanded(false);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] flex justify-center pb-10 px-6 pointer-events-none">
      <motion.div className="w-full max-w-lg bg-black/80 border border-white/5 backdrop-blur-3xl shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)] rounded-[40px] overflow-hidden pointer-events-auto ring-1 ring-white/10">
        
        <AnimatePresence>
            {promptSuggestions.length > 0 && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="p-5 bg-indigo-600/5 border-b border-white/5">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-[7px] font-black uppercase tracking-[0.2em] text-indigo-400">AI Enhancement</span>
                        <button onClick={() => setPromptSuggestions([])} className="text-white/20 hover:text-white"><X size={10}/></button>
                    </div>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                        {promptSuggestions.map((s, i) => (
                            <button key={i} onClick={() => { setPrompt(s); setPromptSuggestions([]); }} className="shrink-0 px-4 py-2 rounded-2xl bg-white/5 border border-white/5 text-[10px] text-white/50 hover:text-white hover:bg-indigo-500/20 hover:border-indigo-500/30 transition-all max-w-[200px] truncate">
                                {s}
                            </button>
                        ))}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

        <div className="p-5 space-y-4">
          <AnimatePresence>
            {isExpanded && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-6 overflow-hidden">
                
                <div className="flex gap-1.5 bg-white/[0.03] p-1 rounded-2xl w-fit">
                    {['cameo', 'frames', 'v2v'].map(t => (
                        <button key={t} onClick={() => setActiveTab(t as any)} className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${activeTab === t ? 'bg-white/10 text-white shadow-xl shadow-white/5' : 'text-white/20 hover:text-white/40'}`}>
                            {t === 'cameo' ? 'Model' : t === 'frames' ? 'Sequence' : 'Re-Style'}
                        </button>
                    ))}
                </div>

                {activeTab === 'cameo' && (
                    <div className="flex gap-3 overflow-x-auto no-scrollbar py-2 items-center">
                        <label className="shrink-0 w-12 h-12 rounded-full border border-dashed border-white/10 flex items-center justify-center cursor-pointer hover:bg-white/5 transition-colors">
                            <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    setIsUploading(true);
                                    const img = await fileToImageFile(file);
                                    await saveProfile({ id: `u-${Date.now()}`, name: file.name.split('.')[0], imageUrl: `data:${file.type};base64,${img.base64}` });
                                    setIsUploading(false);
                                    getUserProfiles().then(u => setProfiles([...u.reverse(), ...defaultCameoProfiles]));
                                }
                            }} />
                            {isUploading ? <Loader2 className="w-4 h-4 animate-spin text-white/20" /> : <Plus size={18} className="text-white/20" />}
                        </label>
                        {profiles.map(p => (
                            <button key={p.id} onClick={() => setSelectedCameoIds(prev => prev.includes(p.id) ? prev.filter(i => i !== p.id) : [...prev, p.id])} className={`relative shrink-0 w-12 h-12 rounded-full border-2 transition-all ${selectedCameoIds.includes(p.id) ? 'border-indigo-500 scale-110 shadow-lg shadow-indigo-500/20' : 'border-transparent opacity-40 grayscale'}`}>
                                <img src={p.imageUrl} className="w-full h-full object-cover" />
                            </button>
                        ))}
                    </div>
                )}

                <div className="flex items-center justify-between border-t border-white/5 pt-5 pb-2">
                  <div className="flex items-center gap-3">
                    <select value={selectedModel} onChange={e => setSelectedModel(e.target.value as VeoModel)} className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-[9px] font-bold text-white/50 outline-none hover:text-white transition-colors">
                        <option value={VeoModel.VEO_FAST}>Veo 3.1 Fast</option>
                        <option value={VeoModel.VEO_31}>Veo 3.1 Pro</option>
                    </select>
                    <button onClick={() => setAspectRatio(aspectRatio === AspectRatio.LANDSCAPE ? AspectRatio.PORTRAIT : AspectRatio.LANDSCAPE)} className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white transition-colors">
                      {aspectRatio === AspectRatio.LANDSCAPE ? <Monitor size={14}/> : <Smartphone size={14}/>}
                    </button>
                  </div>
                  <span className="text-[7px] font-black uppercase tracking-[0.3em] text-white/10">Academy Protocol</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-end gap-4">
            <div className="flex-1 relative bg-white/[0.04] border border-white/10 rounded-[28px] focus-within:border-white/20 transition-all shadow-inner overflow-hidden">
              <textarea 
                ref={inputRef} value={prompt} onChange={e => setPrompt(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSubmit())}
                placeholder="Visualize your thought..." 
                className="w-full bg-transparent p-5 pr-16 text-sm text-white placeholder:text-white/10 resize-none max-h-32 min-h-[58px] focus:outline-none no-scrollbar font-medium"
                rows={1}
              />
              <div className="absolute right-4 bottom-3.5 flex items-center gap-2">
                <button onClick={handleEnhancePrompt} disabled={isEnhancing || !prompt.trim()} className={`p-1.5 rounded-lg transition-all ${isEnhancing ? 'bg-indigo-600 text-white' : 'text-white/20 hover:text-indigo-400'}`}>
                  <Sparkles size={16} />
                </button>
                <button onClick={() => setIsExpanded(!isExpanded)} className={`p-1.5 rounded-lg transition-all ${isExpanded ? 'text-indigo-400' : 'text-white/20'}`}>
                    <Settings2 size={16} />
                </button>
              </div>
            </div>
            <button onClick={handleSubmit} disabled={!prompt.trim()} className="p-5 bg-white text-black rounded-full hover:scale-105 active:scale-95 transition-all shadow-2xl disabled:opacity-40 group">
                <ArrowUp size={24} className="group-hover:-translate-y-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default BottomPromptBar;
