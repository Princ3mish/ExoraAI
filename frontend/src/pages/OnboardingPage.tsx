import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Users,
  CheckCircle2,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { PressButton } from '@/components/ui/PressButton';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

// ── Types ─────────────────────────────────────────────────────────────────────

type Screen = 1 | 2 | 3 | 4;

// ── Slide wrapper with framer-motion ─────────────────────────────────────────

const slideVariants = {
  enter: { opacity: 0, x: 40 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
};

// ── Screen 1: Welcome ─────────────────────────────────────────────────────────

function WelcomeScreen({ onNext }: { onNext: () => void }) {
  return (
    <motion.div
      key="welcome"
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="flex flex-col items-center text-center gap-8 w-full max-w-md"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4, type: 'spring', stiffness: 260, damping: 20 }}
      >
        <Logo variant="full" size="lg" />
      </motion.div>

      <div className="flex flex-col gap-3">
        <h1 className="text-4xl font-bold text-gradient tracking-tight">
          Welcome to Exora AI
        </h1>
        <p className="text-lg text-warm-500 leading-relaxed">
          Your AI-powered meeting assistant is ready.<br />
          Let's get you set up in under 2 minutes.
        </p>
      </div>

      <PressButton variant="primary" size="lg" type="button" onClick={onNext}>
        <span className="flex items-center gap-2">
          Get started <ArrowRight className="h-4 w-4" />
        </span>
      </PressButton>
    </motion.div>
  );
}

// ── Screen 2: Connect Telegram ────────────────────────────────────────────────

function TelegramScreen({
  alreadyLinked,
  onLinked,
  onNext,
  onSkip,
}: {
  alreadyLinked: boolean;
  onLinked: () => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [linked, setLinked] = useState(alreadyLinked);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

  useEffect(() => {
    if (linked) {
      const t = setTimeout(() => onNext(), 1500);
      return () => clearTimeout(t);
    }
  }, [linked, onNext]);

  const handleConnect = async () => {
    if (loading || linked) return;
    setLoading(true);
    try {
      const res = await api.get<{
        data: { botUrl: string };
      }>('/auth/telegram-token');
      window.open(res.data.data.botUrl, '_blank');

      pollRef.current = setInterval(async () => {
        try {
          const status = await api.get<{ data: { linked: boolean } }>('/auth/telegram-status');
          if (status.data.data.linked) {
            if (pollRef.current) clearInterval(pollRef.current);
            setLoading(false);
            setLinked(true);
            onLinked();
          }
        } catch {
          // silent
        }
      }, 3000);
    } catch (err) {
      console.error('[Onboarding] Telegram token error', err);
      setLoading(false);
    }
  };

  return (
    <motion.div
      key="telegram"
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="flex flex-col items-center text-center gap-7 w-full max-w-md"
    >
      <div className="h-20 w-20 rounded-2xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center shadow-glass">
        <MessageSquare className="h-10 w-10 text-indigo-500" />
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold text-warm-900 dark:text-cream-50">
          Connect your Telegram bot
        </h2>
        <p className="text-warm-500 leading-relaxed">
          Exora AI works through Telegram. Link your account to start<br />
          scheduling meetings with just a message.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {linked ? (
          <motion.div
            key="linked"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-3"
          >
            <div className="h-14 w-14 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
              <CheckCircle2 className="h-8 w-8 text-white" />
            </div>
            <p className="text-emerald-600 dark:text-emerald-400 font-semibold">
              Connected! Moving on…
            </p>
          </motion.div>
        ) : (
          <motion.div key="unlinked" className="flex flex-col items-center gap-4 w-full">
            <PressButton
              variant="primary"
              size="lg"
              type="button"
              onClick={handleConnect}
              disabled={loading}
              className="w-full max-w-xs"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Waiting for connection…
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Connect Telegram
                </span>
              )}
            </PressButton>
          </motion.div>
        )}
      </AnimatePresence>

      {!linked && (
        <button
          onClick={onSkip}
          className="text-sm text-warm-400 hover:text-warm-600 dark:hover:text-warm-300 transition-colors underline underline-offset-2"
        >
          Skip for now
        </button>
      )}
    </motion.div>
  );
}

// ── Screen 3: Add first contact ───────────────────────────────────────────────

function ContactScreen({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const navigate = useNavigate();

  const handleGoToContacts = () => {
    // Mark onboarding complete before navigating so we don't loop back
    onNext();
    navigate('/dashboard/contacts');
  };

  return (
    <motion.div
      key="contacts"
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="flex flex-col items-center text-center gap-7 w-full max-w-md"
    >
      <div className="h-20 w-20 rounded-2xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shadow-glass">
        <Users className="h-10 w-10 text-amber-500" />
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold text-warm-900 dark:text-cream-50">
          Who do you meet with?
        </h2>
        <p className="text-warm-500 leading-relaxed">
          Add your first contact. Their email lets Exora send them<br />
          meeting invitations automatically.
        </p>
      </div>

      <div className="flex flex-col items-center gap-3 w-full">
        <PressButton
          variant="primary"
          size="lg"
          type="button"
          onClick={handleGoToContacts}
          className="w-full max-w-xs"
        >
          <span className="flex items-center justify-center gap-2">
            <Users className="h-4 w-4" />
            Add contact
          </span>
        </PressButton>
        <button
          onClick={onNext}
          className="text-sm text-warm-400 hover:text-warm-600 dark:hover:text-warm-300 transition-colors underline underline-offset-2"
        >
          Skip for now
        </button>
      </div>
    </motion.div>
  );
}

// ── Screen 4: All set ─────────────────────────────────────────────────────────

function ReadyScreen({ userId, onFinish }: { userId: string; onFinish: () => void }) {
  const navigate = useNavigate();

  const handleDashboard = () => {
    localStorage.setItem(`onboarding_complete_${userId}`, 'true');
    onFinish();
    navigate('/dashboard');
  };

  return (
    <motion.div
      key="ready"
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="flex flex-col items-center text-center gap-8 w-full max-w-md"
    >
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
        className="h-24 w-24 rounded-full bg-emerald-500 flex items-center justify-center shadow-glass-lg"
      >
        <CheckCircle2 className="h-14 w-14 text-white" />
      </motion.div>

      <div className="flex flex-col gap-3">
        <h2 className="text-3xl font-bold text-warm-900 dark:text-cream-50">
          You're all set! 🎉
        </h2>
        <p className="text-warm-500 leading-relaxed max-w-sm">
          Exora AI will now handle your meeting scheduling, confirmations, and
          preparation automatically.
        </p>
      </div>

      <div className="flex flex-col items-center gap-3 w-full">
        <PressButton
          variant="primary"
          size="lg"
          type="button"
          onClick={handleDashboard}
          className="w-full max-w-xs"
        >
          <span className="flex items-center justify-center gap-2">
            Go to dashboard <ArrowRight className="h-4 w-4" />
          </span>
        </PressButton>
        <PressButton
          variant="secondary"
          size="md"
          href="https://t.me/meetingagent_Exora_bot"
          className="w-full max-w-xs"
        >
          Open Telegram Bot
        </PressButton>
      </div>
    </motion.div>
  );
}

// ── Progress dots ─────────────────────────────────────────────────────────────

function ProgressDots({ current, total }: { current: Screen; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          animate={{
            width: current === (i + 1) ? 24 : 8,
            backgroundColor: current > i ? '#6366F1' : '#D4C5B0',
          }}
          transition={{ duration: 0.3 }}
          className="h-2 rounded-full"
        />
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const [screen, setScreen] = useState<Screen>(1);

  // Guard: if onboarding already done, redirect to dashboard
  useEffect(() => {
    if (user?.id) {
      const done = localStorage.getItem(`onboarding_complete_${user.id}`);
      if (done === 'true') navigate('/dashboard', { replace: true });
    }
  }, [user?.id, navigate]);

  if (!user) return null;

  const goTo = (s: Screen) => setScreen(s);

  const handleTelegramLinked = () => {
    updateUser({ telegramLinked: true });
  };

  const handleFinish = () => {
    localStorage.setItem(`onboarding_complete_${user.id}`, 'true');
  };

  return (
    <div className="gradient-bg min-h-screen w-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg flex flex-col items-center gap-10">
        {/* Step indicator — hidden on screen 1 */}
        {screen > 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-2"
          >
            <ProgressDots current={screen} total={4} />
            <p className="text-xs text-warm-400">Step {screen} of 4</p>
          </motion.div>
        )}

        {/* Screen content */}
        <AnimatePresence mode="wait">
          {screen === 1 && (
            <WelcomeScreen key="s1" onNext={() => goTo(2)} />
          )}
          {screen === 2 && (
            <TelegramScreen
              key="s2"
              alreadyLinked={user.telegramLinked ?? false}
              onLinked={handleTelegramLinked}
              onNext={() => goTo(3)}
              onSkip={() => goTo(3)}
            />
          )}
          {screen === 3 && (
            <ContactScreen
              key="s3"
              onNext={() => goTo(4)}
              onSkip={() => goTo(4)}
            />
          )}
          {screen === 4 && (
            <ReadyScreen key="s4" userId={user.id} onFinish={handleFinish} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
