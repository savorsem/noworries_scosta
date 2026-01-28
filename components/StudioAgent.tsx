/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AgentMessage, AgentRole, StoryboardFrame, GenerationMode, VeoModel, AspectRatio, Resolution } from '../types';
import { createDirectorSession, generateImage, generateVideo } from '../services/geminiService';
import { saveChatMessage, getChatHistory, saveStoryboardFrame, getStoryboardFrames, logEvent } from '../utils/db';
import { Send, Clapperboard, Film, Users, MessageSquare, Video, X, Globe, BrainCircuit, Loader2, Sparkles, Activity, Search } from 'lucide-react';

interface StudioAgentProps {
    onClose: () => void;
}

const AGENT_META: Record<AgentRole, { color: string, icon: any, name: string }> = {
    Director: { color: 'text-red-500', icon: Clapperboard, name: 'СТЭНЛИ (Режиссер)' },
    Producer: { color: 'text-green-500', icon: Users, name: 'МАРКУС (Продюсер)' },
    Writer: { color: 'text-blue-500', icon: MessageSquare, name: 'ХЛОЯ (Сценарист)' },
    Cinematographer: { color: 'text-purple-500', icon: Video, name: 'ТЕКС (Оператор)' },
    Researcher: { color: 'text-cyan-500', icon: Search, name: 'ДАТА (Аналитик)' },
};

const StudioAgent: React.FC<StudioAgentProps> = ({ onClose }) => {
    const [messages, setMessages] = useState<AgentMessage[]>([]);
    const [frames, setFrames] = useState<StoryboardFrame[]>([]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [activeTab, setActiveTab] = useState<'monitor' | 'crew'>('monitor');
    const [useThinking, setUseThinking] = useState(false);
    const [session, setSession] = useState<any>(null);
    const [currentAgent, setCurrentAgent] = useState<AgentRole>('Director');
    
    const scrollRef = useRef<HTMLDivElement>(null);

    // Initialize session and load history
    useEffect(() => {
        const initStudio = async () => {
            try {
                // 1. Load History
                const history = await getChatHistory();
                if (history.length > 0) {
                    setMessages(history);
                } else {
                    const initMsg: AgentMessage = { id: 'init', role: 'Director', text: "Стэнли на связи. Среда производства откалибрована. Каков наш сценарий?", timestamp: Date.now() };
                    setMessages([initMsg]);
                    saveChatMessage(initMsg); // Save initial message if new session
                }

                // 2. Load Frames
                const savedFrames = await getStoryboardFrames();
                setFrames(savedFrames);
            } catch (e) {
                console.error("Failed to load studio history", e);
            }
        };

        const s = createDirectorSession(undefined, useThinking);
        setSession(s);
        initStudio();
    }, [useThinking]);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isThinking]);

    const handleSend = async () => {
        if (!input.trim() || !session) return;
        const msgText = input;
        setInput('');
        
        const userMsg: AgentMessage = { id: Date.now().toString(), role: 'Producer', text: `(ДИРЕКТИВА): ${msgText}`, timestamp: Date.now(), isAction: true };
        setMessages(prev => [...prev, userMsg]);
        saveChatMessage(userMsg); // Save to DB
        
        setIsThinking(true);

        try {
            const res = await session.sendMessage({ message: msgText });
            const text = res.text || '';
            
            let role: AgentRole = 'Director';
            if (text.toLowerCase().includes('свет') || text.toLowerCase().includes('объектив')) role = 'Cinematographer';
            else if (text.toLowerCase().includes('сценарий') || text.toLowerCase().includes('персонаж')) role = 'Writer';
            
            setCurrentAgent(role);

            const jsonMatch = text.match(/:::JSON([\s\S]*?):::/);
            if (jsonMatch) {
                try {
                    const cmd = JSON.parse(jsonMatch[1]);
                    if (cmd.action === 'generate_frame') processFrame(cmd.prompt);
                } catch (e) {
                    console.error("JSON parse error", e);
                }
            }

            const cleanText = text.replace(/:::JSON[\s\S]*?:::/, '');
            const agentMsg: AgentMessage = { id: Date.now().toString(), role: role, text: cleanText, timestamp: Date.now() };
            
            setMessages(prev => [...prev, agentMsg]);
            saveChatMessage(agentMsg); // Save to DB

        } catch (e: any) {
            const errorMsg: AgentMessage = { id: 'err-' + Date.now(), role: 'Director', text: "Сигнал студии прерван. Проверьте соединение.", timestamp: Date.now() };
            setMessages(prev => [...prev, errorMsg]);
            logEvent('error', 'Studio Agent Error', { error: e.message });
        } finally {
            setIsThinking(false);
        }
    };

    const processFrame = async (prompt: string) => {
        const frameId = Date.now().toString();
        const frame: StoryboardFrame = { id: frameId, prompt, status: 'generating_image' };
        
        setFrames(prev => [...prev, frame]);
        setActiveTab('monitor');
        // Save initial state
        saveStoryboardFrame(frame);
        
        try {
            // 1. Generate Image
            const b64 = await generateImage(prompt);
            const imageUrl = `data:image/jpeg;base64,${b64}`;
            
            // Update local state and DB with Image
            const frameWithImage: StoryboardFrame = { ...frame, imageUrl: imageUrl, status: 'image_ready' };
            setFrames(prev => prev.map(f => f.id === frameId ? frameWithImage : f));
            
            // Save to DB (this handles upload)
            const savedImageParams = await saveStoryboardFrame(frameWithImage);
            
            // 2. Generate Video
            const { url, blob } = await generateVideo({
                prompt, model: VeoModel.VEO_FAST, aspectRatio: AspectRatio.LANDSCAPE, resolution: Resolution.P720,
                mode: GenerationMode.FRAMES_TO_VIDEO, startFrame: { file: new File([], "f.jpg"), base64: b64 }
            });

            // Update local state with local URL for immediate playback
            setFrames(prev => prev.map(f => f.id === frameId ? { ...f, videoUrl: url, status: 'complete' } : f));

            // 3. Save to DB (Update with Video URL by uploading the blob we got from generateVideo)
            // We pass the blob URL temporarily, but saveStoryboardFrame needs logic to fetch it if it's a blob url
            // To make it robust, let's construct the object correctly
            const finalFrame: StoryboardFrame = { 
                ...frameWithImage, 
                // Use the Cloud URL if available from previous save, otherwise keep local
                imageUrl: savedImageParams?.imageUrl || imageUrl, 
                videoUrl: url, // saveStoryboardFrame will fetch this blob url and upload it
                status: 'complete' 
            };
            
            await saveStoryboardFrame(finalFrame);
            logEvent('info', 'Storyboard frame generated', { prompt });

        } catch (e: any) {
            setFrames(prev => prev.map(f => f.id === frameId ? { ...f, status: 'error' } : f));
            saveStoryboardFrame({ ...frame, status: 'error' });
            logEvent('error', 'Frame generation failed', { error: e.message });
        }
    };

    const activeFrame = frames[frames.length - 1];

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[500] bg-[#050505] text-white flex flex-col md:flex-row font-sans overflow-hidden">
            <div className="w-full md:w-[450px] flex flex-col border-r border-white/5 bg-black/40 backdrop-blur-3xl">
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Activity className="w-4 h-4 text-red-600 animate-pulse" />
                        <span className="text-[11px] font-black tracking-[0.3em] uppercase text-white/80">Связь производства</span>
                    </div>
                    <button onClick={onClose} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"><X size={18}/></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
                    {messages.map(m => (
                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} key={m.id} className={`flex gap-4 ${m.isAction ? 'opacity-30' : ''}`}>
                            <div className={`w-10 h-10 rounded-2xl shrink-0 flex items-center justify-center bg-white/5 border border-white/10 ${AGENT_META[m.role]?.color}`}>
                                {React.createElement(AGENT_META[m.role]?.icon, { size: 18 })}
                            </div>
                            <div className="space-y-1.5 flex-1">
                                <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${AGENT_META[m.role]?.color}`}>{AGENT_META[m.role]?.name}</span>
                                <p className="text-sm text-white/80 leading-relaxed font-medium">{m.text}</p>
                            </div>
                        </motion.div>
                    ))}
                    {isThinking && (
                        <div className="flex items-center gap-4 px-3">
                            <Loader2 size={16} className="animate-spin text-white/20" />
                            <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Обработка видения...</span>
                        </div>
                    )}
                    <div ref={scrollRef} />
                </div>

                <div className="p-6 bg-black/60 border-t border-white/5 space-y-5">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setUseThinking(!useThinking)} className={`px-4 py-2 rounded-full text-[10px] font-black uppercase transition-all flex items-center gap-3 ${useThinking ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30' : 'bg-white/5 text-white/30'}`}>
                            <BrainCircuit size={14}/> Глубокое мышление
                        </button>
                    </div>
                    <div className="relative">
                        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder="Направляйте ваше видение..." className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-6 pr-16 text-sm focus:outline-none focus:border-white/40 transition-all" />
                        <button onClick={handleSend} className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-white text-black rounded-xl hover:scale-105 active:scale-95 transition-all shadow-xl"><Send size={18}/></button>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col relative bg-[#020202]">
                <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20 flex bg-black/50 backdrop-blur-3xl border border-white/10 rounded-full p-1 shadow-2xl">
                    <button onClick={() => setActiveTab('monitor')} className={`px-8 py-2.5 rounded-full text-[10px] font-black uppercase tracking-var transition-all ${activeTab === 'monitor' ? 'bg-white text-black' : 'text-white/20 hover:text-white'}`}>Монитор</button>
                    <button onClick={() => setActiveTab('crew')} className={`px-8 py-2.5 rounded-full text-[10px] font-black uppercase tracking-var transition-all ${activeTab === 'crew' ? 'bg-white text-black' : 'text-white/20 hover:text-white'}`}>Группа</button>
                </div>

                <div className="flex-1 flex items-center justify-center p-12">
                    <div className="w-full max-w-5xl aspect-video bg-black rounded-[40px] overflow-hidden border border-white/5 shadow-2xl relative group">
                        <AnimatePresence mode="wait">
                            {activeFrame?.status === 'complete' ? (
                                <motion.video key="video" initial={{ opacity: 0 }} animate={{ opacity: 1 }} src={activeFrame.videoUrl} autoPlay loop muted className="w-full h-full object-contain" />
                            ) : activeFrame?.imageUrl ? (
                                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative w-full h-full">
                                    <img src={activeFrame.imageUrl} className="w-full h-full object-contain opacity-30 blur-xl" />
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
                                        <Loader2 size={48} className="animate-spin text-white/10" />
                                        <div className="flex flex-col items-center gap-2">
                                            <span className="text-[11px] font-black tracking-[0.6em] uppercase text-white/20 animate-pulse">Рендеринг кадра</span>
                                            <span className="text-[9px] font-mono text-white/10">{Resolution.P1080} @ 24FPS</span>
                                        </div>
                                    </div>
                                </motion.div>
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center gap-6">
                                    <Sparkles size={48} className="text-white/5" />
                                    <span className="text-[11px] font-black tracking-[0.8em] uppercase text-white/10">Сцена в режиме ожидания</span>
                                </div>
                            )}
                        </AnimatePresence>

                        <div className="absolute inset-0 pointer-events-none p-10 flex flex-col justify-between">
                            <div className="flex justify-between items-start opacity-30">
                                <div className="font-mono text-[11px] text-red-600 flex items-center gap-3"><div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse"/> ЗАПИСЬ АКТИВНА</div>
                                <div className="font-mono text-[11px] tracking-widest uppercase">Камера_A Master</div>
                            </div>
                            <div className="flex justify-between items-end opacity-20">
                                <div className="font-mono text-[10px]">ВРЕМЯ: {new Date().toLocaleTimeString()}</div>
                                <div className="font-mono text-[10px]">NOWORRIES STUDIO v2.5</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="h-40 bg-black/60 border-t border-white/5 p-6 flex gap-6 overflow-x-auto no-scrollbar">
                    {frames.map((f, i) => (
                        <div key={f.id} onClick={() => { setFrames(prev => [...prev.filter(x => x.id !== f.id), f]); setActiveTab('monitor'); }} className="h-full aspect-video rounded-2xl bg-white/5 border border-white/10 overflow-hidden shrink-0 relative hover:scale-105 transition-all cursor-pointer group">
                            {f.imageUrl && <img src={f.imageUrl} className="w-full h-full object-cover" />}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Film size={20}/>
                            </div>
                            <div className="absolute top-2 left-2 px-2 py-1 bg-black/80 rounded-lg text-[9px] font-mono border border-white/5">#{i+1}</div>
                        </div>
                    ))}
                    {frames.length === 0 && (
                        <div className="flex-1 flex items-center justify-center opacity-5 text-[11px] font-black uppercase tracking-[0.6em]">Конвейер кадров готов</div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default StudioAgent;
