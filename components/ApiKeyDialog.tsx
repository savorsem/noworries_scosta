/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// Deprecated: keys are managed via Supabase Edge Functions + SettingsDrawer.
// Keeping the file to avoid breaking imports in older branches.

import React from 'react';

interface ApiKeyDialogProps {
  onContinue: () => void;
}

export default function ApiKeyDialog({ onContinue }: ApiKeyDialogProps) {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/80 backdrop-blur-2xl p-6">
        <div className="text-white font-black tracking-widest uppercase text-sm mb-2">API keys moved</div>
        <div className="text-white/50 text-sm mb-5">
          Keys are now managed in <span className="text-white">Settings → Integrations</span>.
        </div>
        <button
          onClick={onContinue}
          className="w-full px-4 py-2.5 rounded-xl bg-white text-black font-black uppercase tracking-wider text-[10px] hover:bg-indigo-50"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
