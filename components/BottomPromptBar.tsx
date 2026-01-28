/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { AnimatePresence, motion } from 'framer-motion';
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { AspectRatio, GenerationMode, Resolution, VeoModel } from '../types';
import { Send, Sparkles, ImagePlus, Video, X, Settings2 } from 'lucide-react';

interface BottomPromptBarProps {
  onGenerate: (params: any) => void;
  isGenerating?: boolean;
  onOpenSettings?: () => void;
}

export default function BottomPromptBar({ onGenerate, isGenerating = false, onOpenSettings }: BottomPromptBarProps) {
  const [prompt, setPrompt] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [mode, setMode] = useState<GenerationMode>(GenerationMode.TEXT_TO_VIDEO);
  const [model, setModel] = useState<VeoModel>(VeoModel.VEO_FAST);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.PORTRAIT);
  const [resolution, setResolution] = useState<Resolution>(Resolution.P720);

  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const canSubmit = useMemo(() => prompt.trim().length > 0 && !isGenerating, [prompt, isGenerating]);

  useEffect(() => {
    // Auto-focus on mount for desktop, but avoid aggressive focus on mobile
    const isMobile = typeof window !== 'undefined' && window.matchMedia?.('(max-width: 768px)').matches;
    if (!isMobile) inputRef.current?.focus();
  }, []);

  const submit = () => {
    if (!canSubmit) return;
    onGenerate({ prompt, mode, model, aspectRatio, resolution });
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-[28px] border border-white/10 bg-black/50 backdrop-blur-2xl shadow-2xl">
          <div className="p-3 sm:p-4">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <textarea
                  ref={inputRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Опиши сцену..."
                  rows={1}
                  className="w-full resize-none rounded-2xl bg-white/5 px-4 py-3 text-sm sm:text-base text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-indigo-500/40 h-12"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      submit();
                    }
                  }}
                />
              </div>

              <button
                onClick={() => setShowAdvanced((v) => !v)}
                className="h-12 w-12 rounded-2xl border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 transition"
                aria-label="Настройки"
              >
                {showAdvanced ? <X size={18} /> : <Settings2 size={18} />}
              </button>

              <button
                onClick={submit}
                disabled={!canSubmit}
                className={`h-12 w-12 rounded-2xl transition flex items-center justify-center ${
                  canSubmit ? 'bg-indigo-500 hover:bg-indigo-400 text-black' : 'bg-white/10 text-white/30'
                }`}
                aria-label="Отправить"
              >
                {isGenerating ? <Sparkles size={18} className="animate-pulse" /> : <Send size={18} />}
              </button>
            </div>

            <AnimatePresence>
              {showAdvanced && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      className="h-12 rounded-2xl border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 transition text-sm"
                      onClick={() => setMode(GenerationMode.TEXT_TO_VIDEO)}
                    >
                      <span className="inline-flex items-center gap-2 justify-center">
                        <Sparkles size={16} /> Text→Video
                      </span>
                    </button>
                    <button
                      className="h-12 rounded-2xl border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 transition text-sm"
                      onClick={() => setMode(GenerationMode.FRAMES_TO_VIDEO)}
                    >
                      <span className="inline-flex items-center gap-2 justify-center">
                        <ImagePlus size={16} /> Frames
                      </span>
                    </button>
                    <button
                      className="h-12 rounded-2xl border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 transition text-sm"
                      onClick={() => setAspectRatio(AspectRatio.PORTRAIT)}
                    >
                      9:16
                    </button>
                    <button
                      className="h-12 rounded-2xl border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 transition text-sm"
                      onClick={() => setAspectRatio(AspectRatio.LANDSCAPE)}
                    >
                      16:9
                    </button>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <button
                      className="h-12 flex-1 rounded-2xl border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 transition text-sm"
                      onClick={() => onOpenSettings?.()}
                    >
                      Доп. настройки
                    </button>
                    <div className="text-xs sm:text-sm text-white/50 px-2">PWA-ready</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
