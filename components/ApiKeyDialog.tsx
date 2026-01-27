
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { Key, RotateCcw } from 'lucide-react';

interface ApiKeyDialogProps {
  onContinue: () => void;
}

const ApiKeyDialog: React.FC<ApiKeyDialogProps> = ({ onContinue }) => {
  const handleSelectKey = async () => {
    // Fix: Use any-casting for window to access aistudio and avoid global type definition conflicts
    const aistudio = (window as any).aistudio;
    if (aistudio) {
      await aistudio.openSelectKey();
    }
    onContinue();
  };

  const handleReset = async () => {
    // Fix: Use any-casting for window to access aistudio and avoid global type definition conflicts
    const aistudio = (window as any).aistudio;
    if (aistudio) {
      await aistudio.openSelectKey();
    }
    onContinue();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 transition-opacity duration-300">
      <div className="bg-neutral-900/60 border border-white/10 backdrop-blur-2xl rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] max-w-md w-full p-8 text-center flex flex-col items-center ring-1 ring-white/5 relative overflow-hidden">
        
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-20 bg-white/5 blur-3xl pointer-events-none"></div>

        <div className="bg-white/5 p-5 rounded-full mb-6 ring-1 ring-white/10 shadow-[inset_0_0_20px_rgba(255,255,255,0.05)] relative z-10">
          <Key className="w-8 h-8 text-white opacity-90" />
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-3 tracking-wide drop-shadow-md">Требуется конфигурация</h2>
        
        <p className="text-gray-300 mb-8 text-sm leading-relaxed font-light">
          Это приложение использует Veo, для которого требуется API-ключ из платного проекта Google Cloud с включенным биллингом.
        </p>
        
        <button
          onClick={handleSelectKey}
          className="w-full px-6 py-3.5 bg-white hover:bg-gray-100 text-black font-bold rounded-xl transition-all duration-300 text-sm tracking-wider uppercase shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_35px_rgba(255,255,255,0.4)] hover:scale-105 active:scale-95"
        >
          Выбрать API ключ
        </button>

        <div className="w-full h-px bg-white/10 my-6"></div>

        <button
          onClick={handleReset}
          className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white transition-all rounded-lg hover:bg-white/5 w-full border border-white/5 hover:border-white/10 group"
        >
          <RotateCcw className="w-3.5 h-3.5 group-hover:rotate-[-45deg] transition-transform" />
          Сбросить и выбрать заново
        </button>

        <p className="text-gray-500 mt-6 text-xs font-medium">
          Узнайте больше о{' '}
          <a
            href="https://ai.google.dev/gemini-api/docs/billing"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white hover:text-gray-300 transition-colors underline underline-offset-2 decoration-white/30 hover:decoration-white"
          >
            оплате
          </a>{' '}
          и{' '}
          <a
            href="https://ai.google.dev/gemini-api/docs/pricing#veo-3"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white hover:text-gray-300 transition-colors underline underline-offset-2 decoration-white/30 hover:decoration-white"
          >
            ценах
          </a>.
        </p>
      </div>
    </div>
  );
};

export default ApiKeyDialog;
