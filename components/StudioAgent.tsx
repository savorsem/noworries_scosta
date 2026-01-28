/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AgentMessage, AgentRole, StoryboardFrame, GenerationMode, VeoModel, AspectRatio, Resolution, ImageFile, VideoFile } from '../types';
import { createDirectorSession, generateImage, generateVideo } from '../services/geminiService';
import { getChatHistory, getStoryboardFrames, deleteStoryboardFrame } from '../utils/db';
import { 
  Send, Clapperboard, Film, Users, MessageSquare, Video as VideoIcon, X, 
  Loader2, Sparkles, Plus, Database, LucideIcon
} from 'lucide-react';
import { ChatSession } from '@google/generative-ai';

interface StudioAgentProps {
    onClose: () => void;
}

const AGENT_META: Record<AgentRole, { color: string, icon: LucideIcon, name: string, bg: string }> = {
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
    const [session, setSession] = useState<ChatSession | null>(null);
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
            const res = await session.sendMessage(`[VAULT: ${assets.images.length} assets] ${msgText}`);
            const text = res.response.text();
            
            const jsonMatch = text.match(/:::JSON([\s\S]*?):::/);
            if (jsonMatch) {
                try {
                    const cmd = JSON.parse(jsonMatch[1]);
                    if (cmd.action === 'generate_frame') processProduction(cmd.prompt);
                } catch (e) { console.error("JSON Parse Error", e); }
            }
            const cleanText = text.replace(/:::JSON[\s\S]*?:::/, '').trim();
            if (cleanText) setMessages(prev => [...prev, { id: Date.now().toString(), role: 'Director', text: cleanText, timestamp: Date.now() }]);
        } catch (e) {
            console.error(e);
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'Director', text: "Ошибка связи с ядром.", timestamp: Date.now() }]);
        } finally { setIsThinking(false); }
    };

    const processProduction = async (prompt: string) => {
        const frameId = Date.now().toString();
        setFrames(prev => [{ id: frameId, prompt, status: 'generating_image' }, ...prev]);
        try {
            const b64 = await generateImage(prompt);
            // Ensure we have data before setting status
            if (b64) {
                setFrames(prev => prev.map(f => f.id === frameId ? { ...f, imageUrl: `data:image/jpeg;base64,${b64}`, status: 'image_ready' } : f));
                const videoResult = await generateVideo({
                    prompt, model: VeoModel.VEO_FAST, aspectRatio: AspectRatio.LANDSCAPE, resolution: Resolution.P720,
                    mode: GenerationMode.TEXT_TO_VIDEO, startFrame: { file: new File([], "s.jpg"), base64: b64 }
                });
                setFrames(prev => prev.map(f => f.id === frameId ? { ...f, videoUrl: videoResult.url, status: 'complete' } : f));
            } else {
                // Handle case where generateImage returns empty string (mock)
                 setFrames(prev => prev.map(f => f.id === frameId ? { ...f, status: 'error' } : f));
            }
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
                <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 text-white/40"><X size={18}/></button>
            </header>

            <div className="flex-1 flex overflow-hidden">
                <main className="flex-1 flex flex-col bg-[#050505] relative">
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
                                    </div>
                                    <div className={`p-5 rounded-[24px] text-sm leading-relaxed border border-white/5 ${m.isAction ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/10' : 'bg-[#0a0a0a] text-white/80 shadow-2xl'}`}>
                                        {m.text}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                        {isThinking && (
                            <div className="flex items-center gap-4 p-4">
                                <Loader2 className="animate-spin text-indigo-500" />
                                <span className="text-xs text-white/50">Processing...</span>
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
            </div>
        </motion.div>
    );
};

export default StudioAgent;
