import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { KeyRound, X } from 'lucide-react';

export default function AdminPasscodeDialog({
  isOpen,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (passcode: string) => void;
}) {
  const [value, setValue] = useState('');

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xl p-4"
        >
          <motion.div
            initial={{ y: 12, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 12, opacity: 0, scale: 0.98 }}
            className="w-full max-w-md rounded-3xl border border-white/10 bg-black/70 p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-2xl bg-white/10 flex items-center justify-center">
                  <KeyRound size={18} className="text-white/70" />
                </div>
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40">Admin</div>
                  <div className="text-white font-black">Passcode</div>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition">
                <X size={16} className="text-white/60" />
              </button>
            </div>

            <p className="mt-4 text-sm text-white/60">
              Введите admin passcode, чтобы управлять интеграциями (ключи не сохраняются в браузере).
            </p>

            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="ADMIN_PASSCODE"
              type="password"
              className="mt-4 w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-white outline-none focus:border-white/30"
            />

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => {
                  onSave(value);
                  setValue('');
                  onClose();
                }}
                className="flex-1 rounded-2xl bg-white text-black font-black py-3 hover:bg-white/90 transition"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setValue('');
                  onClose();
                }}
                className="flex-1 rounded-2xl bg-white/5 border border-white/10 text-white font-black py-3 hover:bg-white/10 transition"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
