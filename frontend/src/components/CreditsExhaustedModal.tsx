/**
 * Phase S2: CreditsExhaustedModal
 *
 * Listens for the global `credits-exhausted` CustomEvent dispatched by api.ts
 * whenever the backend returns HTTP 402 Insufficient Credits.
 *
 * Shows a glassmorphism modal with:
 *   - "Buy 50 credits — $10" CTA (mailto / placeholder)
 *   - "Maybe later" dismiss
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, X, CreditCard, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CreditsExhaustedModalProps {
  /** Called when the user dismisses the modal */
  onDismiss?: () => void;
}

export function CreditsExhaustedModal({ onDismiss }: CreditsExhaustedModalProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('You have run out of credits.');

  useEffect(() => {
    const handleCreditsExhausted = (e: Event) => {
      const detail = (e as CustomEvent<{ message: string }>).detail;
      setMessage(detail?.message ?? 'You have run out of credits.');
      setOpen(true);
    };

    window.addEventListener('credits-exhausted', handleCreditsExhausted);
    return () => window.removeEventListener('credits-exhausted', handleCreditsExhausted);
  }, []);

  const handleDismiss = () => {
    setOpen(false);
    onDismiss?.();
  };

  const handleBuyCredits = () => {
    // Placeholder — wire to your billing provider (Stripe, etc.)
    window.open('mailto:billing@exora.ai?subject=Buy%2050%20Credits', '_blank');
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="credits-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
            onClick={handleDismiss}
          />

          {/* Modal */}
          <motion.div
            key="credits-modal"
            initial={{ opacity: 0, scale: 0.88, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            className="fixed inset-0 flex items-center justify-center z-[101] pointer-events-none p-4"
          >
            <div
              className="pointer-events-auto w-full max-w-sm rounded-2xl border border-white/20 bg-white/10 dark:bg-slate-900/60 backdrop-blur-xl shadow-2xl p-6 flex flex-col gap-5"
              style={{ boxShadow: '0 8px 40px 0 rgba(99,102,241,0.18), 0 2px 12px 0 rgba(0,0,0,0.25)' }}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' }}>
                    <Zap className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-warm-900 dark:text-cream-50">Credits Exhausted</h2>
                    <p className="text-xs text-warm-500 dark:text-warm-400 mt-0.5">Upgrade to continue using Exora AI</p>
                  </div>
                </div>
                <button
                  id="credits-modal-dismiss-x"
                  onClick={handleDismiss}
                  className="h-7 w-7 rounded-lg flex items-center justify-center text-warm-400 hover:text-warm-700 dark:hover:text-cream-100 hover:bg-white/10 transition-all"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Message */}
              <p className="text-sm text-warm-700 dark:text-warm-300 leading-relaxed">
                {message}
              </p>

              {/* Credit package highlight */}
              <div className="rounded-xl border border-indigo-200/40 dark:border-indigo-500/30 bg-indigo-50/60 dark:bg-indigo-500/10 px-4 py-3 flex items-center gap-3">
                <Sparkles className="h-4 w-4 text-indigo-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">50 Credits Pack</p>
                  <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70">50 meeting creations or voice calls</p>
                </div>
                <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300 shrink-0">$10</span>
              </div>

              {/* CTA buttons */}
              <div className="flex flex-col gap-2">
                <Button
                  id="credits-modal-buy-btn"
                  onClick={handleBuyCredits}
                  className="w-full h-10 text-sm font-semibold text-white rounded-xl"
                  style={{ background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' }}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Buy 50 credits — $10
                </Button>
                <button
                  id="credits-modal-later-btn"
                  onClick={handleDismiss}
                  className="w-full h-9 text-sm text-warm-500 dark:text-warm-400 hover:text-warm-800 dark:hover:text-cream-100 transition-colors rounded-xl"
                >
                  Maybe later
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
