
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AgentMessage, AgentRole, StoryboardFrame, GenerationMode, VeoModel, AspectRatio, Resolution, ImageFile, VideoFile } from '../types';
import { createDirectorSession, generateImage, generateVideo, generateCharacterReplacement } from '../services/geminiService';
import { saveChatMessage, getChatHistory, saveStoryboardFrame, getStoryboardFrames, deleteStoryboardFrame } from '../utils/db';
import { 
  Send, Clapperboard, Film, Users, MessageSquare, Video as VideoIcon, X, 
  Loader2, Sparkles, Plus, UserCircle, Trash2, Database, Zap, Download, AlertCircle, RefreshCw
} from 'lucide-react';

interface StudioAgentProps {
    onClose: () => void;
}

const AGENT_META: Record<AgentRole, { color: string, icon: any, name: string, bg: string }> = {
    Director: { color: 'text-white', icon: Clapperboard, name: 'СТЭНЛИ', bg: 'bg-indigo-600' },
    Producer: { color: 'text-green-400', icon: Users, name: 'МАРКУС', bg: 'bg-green-500/10' },
    Writer: { color: 'text-blue-400', icon: MessageSquare, name: 'ХЛОЯ', bg: 'bg-blue-500/10' },
    Cinematographer: { color: 'text-purple-400', icon: VideoIcon, name: 'ТЕКС', bg: 'bg-purple-500/10' },
    Researcher: { color: 'text-cyan-400', icon: Sparkles, name: 'ДАТА', bg: 'bg-cyan-500/10' },
};

type ViewMode = 'vault' | 'terminal' | 'dailies';

const StudioAgent: React.FC<StudioAgentProps> = ({ onClose }) => {
    const [messages, setMessages] = useState<AgentMessage[]>([]);
    const [frames, setFrames] = useState<StoryboardFrame[]>([]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [useThinking, setUseThinking] = useState(true);
    const [session, setSession] = useState<any>(null);
    const [activeView, setActiveView] = useState<ViewMode>('terminal');
    const [assets, setAssets] = useState<{ images: ImageFile[], videos: VideoFile[] }>({ images: [], videos: [] });
    
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const initStudio = async () => {
            const [history, savedFrames] = await Promise.all([getChatHistory(), getStoryboardFrames()]);
            if (history.length > 0) setMessages(history);
            else {
                setMessages([{ id: 'init', role: 'Director', text: "Система KRAUZ ACADEMY активирована. Мы готовы к производству.", timestamp: Date.now() }]);
            }
            setFrames(savedFrames || []);
        };
        initStudio();
    }, []);

    useEffect(() => {
        setSession(createDirectorSession(undefined, useThinking));
    }, [useThinking]);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isThinking]);

    const handleSend = async () => {
        if (!input.trim() || !session || isThinking) return;
        const msgText = input;
        setInput('');
        
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'Producer', text: msgText, timestamp: Date.now(), isAction: true }]);
        setIsThinking(true);

        try {
            const res = await session.sendMessage({ message: `[VAULT: ${assets.images.length} assets] ${msgText}` });
            const text = res.text || '';
            const jsonMatch = text.match(/:::JSON([\s\S]*?):::/);
            if (jsonMatch) {
                const cmd = JSON.parse(jsonMatch[1]);
                if (cmd.action === 'generate_frame') processProduction(cmd.prompt);
            }
            const cleanText = text.replace(/:::JSON[\s\S]*?:::/, '').trim();
            if (cleanText) setMessages(prev => [...prev, { id: Date.now().toString(), role: 'Director', text: cleanText, timestamp: Date.now() }]);
        } catch (e) {
            console.error(e);
        } finally { setIsThinking(false); }
    };

    const processProduction = async (prompt: string) => {
        const frameId = Date.now().toString();
        setFrames(prev => [{ id: frameId, prompt, status: 'generating_image' }, ...prev]);
        try {
            const b64 = await generateImage(prompt);
            setFrames(prev => prev.map(f => f.id === frameId ? { ...f, imageUrl: `data:image/jpeg;base64,${b64}`, status: 'image_ready' } : f));
            const videoResult = await generateVideo({
                prompt, model: VeoModel.VEO_FAST, aspectRatio: AspectRatio.LANDSCAPE, resolution: Resolution.P720,
                mode: GenerationMode.TEXT_TO_VIDEO, startFrame: { file: new File([], "s.jpg"), base64: b64 }
            });
            setFrames(prev => prev.map(f => f.id === frameId ? { ...f, videoUrl: videoResult.url, status: 'complete' } : f));
        } catch (e) {
            setFrames(prev => prev.map(f => f.id === frameId ? { ...f, status: 'error' } : f));
        }
    };

    const handleDeleteFrame = async (id: string) => {
        await deleteStoryboardFrame(id);
        setFrames(prev => prev.filter(f => f.id !== id));
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[600] bg-[#030303] text-white flex flex-col overflow-hidden">
            
            <header className="h-16 px-6 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-2xl">
                <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                        <Clapperboard size={16} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-xs font-black uppercase tracking-[0.2em] leading-none">Production Console</h2>
                        <span className="text-[7px] text-indigo-500/60 font-black uppercase tracking-widest mt-1 block">Active Unit: Stanley v3.1</span>
                    </div>
                </div>

                <div className="flex md:hidden bg-white/5 p-1 rounded-xl">
                    <button onClick={() => setActiveView('vault')} className={`p-2 rounded-lg ${activeView === 'vault' ? 'bg-white/10' : 'text-white/20'}`}><Database size={14}/></button>
                    <button onClick={() => setActiveView('terminal')} className={`p-2 rounded-lg ${activeView === 'terminal' ? 'bg-white/10' : 'text-white/20'}`}><MessageSquare size={14}/></button>
                    <button onClick={() => setActiveView('dailies')} className={`p-2 rounded-lg ${activeView === 'dailies' ? 'bg-white/10' : 'text-white/20'}`}><Film size={14}/></button>
                </div>

                <div className="hidden md:flex items-center gap-3">
                    <button onClick={() => setUseThinking(!useThinking)} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${useThinking ? 'bg-indigo-600' : 'bg-white/5 text-white/20 border border-white/5'}`}>
                        {useThinking ? 'Logical Kernel Active' : 'Neural Core Standard'}
                    </button>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 text-white/40"><X size={18}/></button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                
                <aside className={`w-80 border-r border-white/5 bg-black/20 flex-col transition-all ${activeView === 'vault' ? 'flex' : 'hidden md:flex'}`}>
                    <div className="p-5 border-b border-white/5 flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">Asset Vault</span>
                        <button onClick={() => fileInputRef.current?.click()} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10"><Plus size={14}/></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-8 no-scrollbar">
                        <section>
                            <h4 className="text-[8px] font-black uppercase tracking-widest text-indigo-500/40 mb-4 px-1">Character Models</h4>
                            <div className="grid grid-cols-2 gap-2">
                                {assets.images.map((img, idx) => (
                                    <div key={idx} className="aspect-square rounded-xl bg-white/[0.02] border border-white/5 overflow-hidden relative group">
                                        <img src={`data:${img.file.type};base64,${img.base64}`} className="w-full h-full object-cover" />
                                        <button onClick={() => setAssets(a => ({...a, images: a.images.filter((_, i) => i !== idx)}))} className="absolute top-1.5 right-1.5 p-1 bg-black/60 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"><X size={10}/></button>
                                    </div>
                                ))}
                                <button onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-xl border border-dashed border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors">
                                    <Plus size={16} className="text-white/10" />
                                </button>
                            </div>
                        </section>
                        <input type="file" ref={fileInputRef} className="hidden" multiple onChange={(e) => {
                            const files = e.target.files;
                            if (!files) return;
                            for (let i = 0; i < files.length; i++) {
                                const file = files[i];
                                const reader = new FileReader();
                                reader.onload = () => {
                                    const base64 = (reader.result as string).split(',')[1];
                                    setAssets(prev => ({ ...prev, images: [...prev.images, { file, base64 }] }));
                                };
                                reader.readAsDataURL(file);
                            }
                        }} />
                    </div>
                </aside>

                <main className={`flex-1 flex flex-col bg-[#050505] relative ${activeView === 'terminal' ? 'flex' : 'hidden md:flex'}`}>
                    <div className="absolute inset-0 scanline opacity-[0.03]" />
                    <div className="flex-1 overflow-y-auto px-6 md:px-12 py-10 space-y-12 no-scrollbar">
                        {messages.map((m) => (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={m.id} className={`flex gap-6 ${m.isAction ? 'flex-row-reverse' : ''}`}>
                                {!m.isAction && (
                                    <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center border border-white/5 shadow-2xl ${AGENT_META[m.role]?.bg} ${AGENT_META[m.role]?.color}`}>
                                        {React.createElement(AGENT_META[m.role]?.icon, { size: 18 })}
                                    </div>
                                )}
                                <div className={`flex-1 max-w-[80%] space-y-2.5 ${m.isAction ? 'text-right' : ''}`}>
                                    <div className={`flex items-center gap-3 ${m.isAction ? 'justify-end' : ''}`}>
                                        <span className={`text-[8px] font-black uppercase tracking-[0.2em] ${m.isAction ? 'text-indigo-500' : AGENT_META[m.role]?.color}`}>
                                            {m.isAction ? 'OPERATOR' : AGENT_META[m.role]?.name}
                                        </span>
                                        <span className="text-[8px] text-white/10 font-mono">{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <div className={`p-5 rounded-[24px] text-sm leading-relaxed border border-white/5 ${m.isAction ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/10' : 'bg-[#0a0a0a] text-white/80 shadow-2xl'}`}>
                                        {m.text}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                        {isThinking && (
                            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 w-fit">
                                <div className="flex gap-1">
                                    <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                    <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 rounded-full bg-indigo-500/60" />
                                    <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 rounded-full bg-indigo-500/30" />
                                </div>
                                <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/30 animate-pulse">Syncing neural pathways...</span>
                            </div>
                        )}
                        <div ref={scrollRef} />
                    </div>

                    <div className="p-8 bg-[#050505] border-t border-white/5">
                        <div className="max-w-4xl mx-auto flex items-end gap-4">
                            <div className="flex-1 bg-white/[0.03] border border-white/10 rounded-[28px] focus-within:border-indigo-500/40 transition-all shadow-inner overflow-hidden">
                                <textarea 
                                    value={input} onChange={e => setInput(e.target.value)} 
                                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())} 
                                    placeholder="Enter directive..." 
                                    className="w-full bg-transparent py-5 px-7 text-sm text-white placeholder:text-white/10 focus:outline-none no-scrollbar resize-none"
                                    rows={1}
                                />
                            </div>
                            <button onClick={handleSend} disabled={!input.trim() || isThinking} className="p-5 bg-white text-black rounded-full hover:scale-105 active:scale-95 transition-all shadow-2xl disabled:opacity-50">
                                <Send size={20}/>
                            </button>
                        </div>
                    </div>
                </main>

                <aside className={`w-[450px] border-l border-white/5 bg-black/20 flex flex-col transition-all ${activeView === 'dailies' ? 'flex' : 'hidden md:flex'}`}>
                    <div className="p-5 border-b border-white/5 flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">Dailies Batch</span>
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_10px_#6366f1] animate-pulse" />
                            <span className="text-[8px] font-black uppercase text-indigo-500 tracking-widest">Live Flow</span>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
                        <AnimatePresence mode="popLayout">
                            {frames.map((f, i) => (
                                <motion.div key={f.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="group rounded-[32px] bg-[#080808] border border-white/5 overflow-hidden shadow-2xl">
                                    <div className="aspect-video relative bg-[#020202] flex items-center justify-center">
                                        {f.status === 'complete' && f.videoUrl ? (
                                            <video src={f.videoUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                                        ) : f.status === 'error' ? (
                                            <div className="text-red-500/20 flex flex-col items-center gap-3">
                                                <AlertCircle size={32} />
                                                <span className="text-[7px] font-black uppercase tracking-widest">Production Error</span>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-5">
                                                <Loader2 size={32} className="animate-spin text-white/5" />
                                                <span className="text-[7px] font-black uppercase tracking-[0.4em] text-indigo-500/60 animate-pulse">
                                                    {f.status === 'generating_image' ? 'Drafting' : 'Developing'}
                                                </span>
                                            </div>
                                        )}
                                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                            {f.videoUrl && <button onClick={() => {}} className="p-2.5 bg-black/60 backdrop-blur-xl rounded-xl border border-white/10 hover:bg-white/10"><Download size={14}/></button>}
                                            <button onClick={() => handleDeleteFrame(f.id)} className="p-2.5 bg-red-500/40 backdrop-blur-xl rounded-xl border border-red-500/20 hover:bg-red-500"><Trash2 size={14}/></button>
                                        </div>
                                        <div className="absolute top-4 left-4 px-2.5 py-1.5 bg-black/60 backdrop-blur-xl rounded-xl text-[7px] font-black text-white/40 border border-white/10 uppercase tracking-widest">Take #{frames.length - i}</div>
                                    </div>
                                    <div className="p-5">
                                        <p className="text-[10px] text-white/30 italic leading-relaxed">"{f.prompt}"</p>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </aside>
            </div>
        </motion.div>
    );
};

export default StudioAgent;
