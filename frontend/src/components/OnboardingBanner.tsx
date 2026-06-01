import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  UserPlus,
  Calendar,
  CheckCircle2,
  X,
  Loader2,
} from 'lucide-react';
import { PressButton } from '@/components/ui/PressButton';
import api from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface OnboardingBannerProps {
  userId: string;
  telegramLinked: boolean;
  contactsCount: number;
  meetingsCount: number;
  /** Called when the banner is dismissed or all steps complete */
  onDismiss: () => void;
  /** Called when Telegram link is confirmed via polling */
  onTelegramLinked: () => void;
}

// ── Step badge ────────────────────────────────────────────────────────────────

function StepDone() {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
      <CheckCircle2 className="h-3.5 w-3.5" />
      Done ✓
    </span>
  );
}

// ── Banner ────────────────────────────────────────────────────────────────────

export function OnboardingBanner({
  userId,
  telegramLinked,
  contactsCount,
  meetingsCount,
  onDismiss,
  onTelegramLinked,
}: OnboardingBannerProps) {
  const navigate = useNavigate();

  const [connectLoading, setConnectLoading] = useState(false);
  const [connectSuccess, setConnectSuccess] = useState(false);
  const [allDoneVisible, setAllDoneVisible] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isTgDone = telegramLinked || connectSuccess;
  const isContactsDone = contactsCount > 0;
  const isMeetingsDone = meetingsCount > 0;
  const stepsComplete = [isTgDone, isContactsDone, isMeetingsDone].filter(Boolean).length;

  // Stop polling on unmount
  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

  // When all steps complete, show success then auto-dismiss
  useEffect(() => {
    if (stepsComplete === 3) {
      setAllDoneVisible(true);
      const t = setTimeout(() => {
        localStorage.setItem(`onboarding_dismissed_${userId}`, 'true');
        onDismiss();
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [stepsComplete, userId, onDismiss]);

  const handleTelegramConnect = async () => {
    if (connectLoading || isTgDone) return;
    setConnectLoading(true);
    try {
      const res = await api.get<{
        data: { token: string; botUrl: string; botUrlWeb: string };
      }>('/auth/telegram-token');
      window.open(res.data.data.botUrl, '_blank');

      pollRef.current = setInterval(async () => {
        try {
          const status = await api.get<{ data: { linked: boolean } }>('/auth/telegram-status');
          if (status.data.data.linked) {
            if (pollRef.current) clearInterval(pollRef.current);
            setConnectLoading(false);
            setConnectSuccess(true);
            onTelegramLinked();
          }
        } catch {
          // silently ignore poll errors
        }
      }, 3000);
    } catch (err) {
      console.error('[OnboardingBanner] Telegram token error', err);
      setConnectLoading(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(`onboarding_dismissed_${userId}`, 'true');
    onDismiss();
  };

  return (
    <AnimatePresence>
      {allDoneVisible ? (
        // ── All done success state ───────────────────────────────────────────
        <motion.div
          key="success"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          className="mx-5 mt-4 rounded-2xl p-6 mb-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-center shadow-lg"
        >
          <p className="text-lg font-bold">🎉 You're all set!</p>
          <p className="text-sm text-white/80 mt-1">
            Exora AI is ready to manage your meetings. Enjoy!
          </p>
        </motion.div>
      ) : (
        // ── Step-by-step banner ─────────────────────────────────────────────
        <motion.div
          key="banner"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="mx-5 mt-4 mb-2 glass-card rounded-2xl p-5 border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/60 dark:bg-indigo-500/5 shrink-0"
        >
          {/* Header row */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-warm-900 dark:text-cream-50">
                Get started with Exora AI
              </p>
              <p className="text-xs text-warm-500 mt-0.5">
                Complete these steps to start scheduling meetings automatically.
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="text-warm-400 hover:text-warm-600 dark:hover:text-warm-200 transition-colors ml-4 shrink-0"
              aria-label="Dismiss onboarding banner"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Step cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Step 1: Connect Telegram */}
            <div className="bg-white/70 dark:bg-white/5 rounded-xl p-4 border border-white/60 dark:border-white/10 flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center shrink-0">
                  <MessageSquare className="h-4 w-4 text-indigo-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-warm-900 dark:text-cream-50">Connect Telegram</p>
                  <p className="text-[10px] text-warm-500 leading-tight mt-0.5">
                    Link your account to schedule meetings by message
                  </p>
                </div>
              </div>
              {isTgDone ? (
                <StepDone />
              ) : (
                <PressButton
                  variant="primary"
                  size="sm"
                  type="button"
                  onClick={handleTelegramConnect}
                  disabled={connectLoading}
                >
                  {connectLoading ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Waiting…
                    </span>
                  ) : (
                    'Connect now'
                  )}
                </PressButton>
              )}
            </div>

            {/* Step 2: Add a contact */}
            <div className="bg-white/70 dark:bg-white/5 rounded-xl p-4 border border-white/60 dark:border-white/10 flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shrink-0">
                  <UserPlus className="h-4 w-4 text-amber-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-warm-900 dark:text-cream-50">Add your first contact</p>
                  <p className="text-[10px] text-warm-500 leading-tight mt-0.5">
                    Add someone you meet with regularly
                  </p>
                </div>
              </div>
              {isContactsDone ? (
                <StepDone />
              ) : (
                <PressButton
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() => navigate('/dashboard/contacts')}
                >
                  Add contact
                </PressButton>
              )}
            </div>

            {/* Step 3: Schedule a meeting */}
            <div className="bg-white/70 dark:bg-white/5 rounded-xl p-4 border border-white/60 dark:border-white/10 flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <Calendar className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-warm-900 dark:text-cream-50">Schedule a meeting</p>
                  <p className="text-[10px] text-warm-500 leading-tight mt-0.5">
                    Use Telegram or the + New Meeting button
                  </p>
                </div>
              </div>
              {isMeetingsDone ? (
                <StepDone />
              ) : (
                <PressButton
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() => navigate('/dashboard/meetings')}
                >
                  New meeting
                </PressButton>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4 flex flex-col gap-1.5">
            <div className="w-full h-1.5 rounded-full bg-indigo-100 dark:bg-white/10 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-indigo-500"
                initial={{ width: 0 }}
                animate={{ width: `${(stepsComplete / 3) * 100}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
            <p className="text-xs text-warm-500">
              {stepsComplete} of 3 steps complete
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default OnboardingBanner;
