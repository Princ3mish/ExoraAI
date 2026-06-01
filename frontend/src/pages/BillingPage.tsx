import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  TrendingUp,
  Minus,
  CheckCircle2,
  Loader2,
  Zap,
  Shield,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { PressButton } from '@/components/ui/PressButton';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@/lib/api';

// ── Types ────────────────────────────────────────────────────────────────────

interface CreditTransaction {
  id: string;
  amount: number;
  type: 'purchase' | 'deduction';
  reason: string;
  stripeSessionId: string | null;
  createdAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatReason(reason: string): string {
  const map: Record<string, string> = {
    credit_purchase: 'Credits purchased',
    meeting_created: 'Meeting scheduled',
    voice_call_initiated: 'Voice call',
    action: 'Action',
  };
  return map[reason] ?? reason.replace(/_/g, ' ');
}

// ── Success Banner ────────────────────────────────────────────────────────────

function SuccessBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -8 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="glass-card rounded-2xl p-6 border-2 border-emerald-400 bg-emerald-50/80 dark:bg-emerald-500/10 flex flex-col items-center text-center gap-3"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.1 }}
        className="h-14 w-14 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg"
      >
        <CheckCircle2 className="h-8 w-8 text-white" />
      </motion.div>
      <div>
        <h3 className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
          Payment successful!
        </h3>
        <p className="text-sm text-emerald-600 dark:text-emerald-300 mt-0.5">
          50 credits have been added to your account.
        </p>
      </div>
      <button
        onClick={onDismiss}
        className="text-xs text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-200 transition-colors underline underline-offset-2"
      >
        Dismiss
      </button>
    </motion.div>
  );
}

// ── Progress Bar ──────────────────────────────────────────────────────────────

function UsageBar({
  label,
  used,
  limit,
  color,
}: {
  label: string;
  used: number;
  limit: number | null;
  color: string;
}) {
  const pct = limit ? Math.min((used / limit) * 100, 100) : 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-warm-600 dark:text-warm-400 font-medium">{label}</span>
        <span className="text-warm-500">
          {used}/{limit ?? '∞'} this month
        </span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-warm-200/60 dark:bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function BillingPage() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);

  const isPro = user?.plan === 'pro';
  const credits = user?.credits ?? 0;
  const maxCredits = 50;
  const creditPct = Math.min((credits / maxCredits) * 100, 100);
  const barColor =
    credits <= 5 ? '#ef4444' : credits <= 15 ? '#f59e0b' : '#6366f1';

  // ── Refresh user profile on mount so credits are always current ─────────
  // The login response only carries {id, email, name, role} — credits come
  // from /auth/me. Calling refreshUser() here ensures the display is correct
  // even immediately after login.
  useEffect(() => {
    refreshUser();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Handle success / cancel URL params on mount ──────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get('success') === 'true') {
      setShowSuccess(true);
      // Refresh user credits from server
      refreshUser();
      // Clean up URL param without reload
      const url = new URL(window.location.href);
      url.searchParams.delete('success');
      window.history.replaceState({}, '', url.toString());
    }

    if (params.get('cancelled') === 'true') {
      toast({
        title: 'Payment cancelled',
        description: 'No charge was made.',
      });
      const url = new URL(window.location.href);
      url.searchParams.delete('cancelled');
      window.history.replaceState({}, '', url.toString());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Fetch transaction history ─────────────────────────────────────────────
  useEffect(() => {
    let active = true;
    const fetchHistory = async () => {
      try {
        setHistoryLoading(true);
        const res = await api.get<{ data: { transactions: CreditTransaction[] } }>(
          '/billing/history',
        );
        if (active) setTransactions(res.data.data.transactions);
      } catch {
        // silently fail — history is not critical
      } finally {
        if (active) setHistoryLoading(false);
      }
    };
    fetchHistory();
    return () => {
      active = false;
    };
  }, [showSuccess]); // re-fetch after successful purchase

  // ── Purchase handler ─────────────────────────────────────────────────────
  const handlePurchase = async () => {
    console.log('[BillingPage] Starting checkout...');
    setLoading(true);
    try {
      const response = await api.post<{ url: string }>('/billing/create-checkout');
      if (response.data?.url) {
        console.log('[BillingPage] Redirecting to:', response.data.url);
        window.location.href = response.data.url;
      } else {
        throw new Error('No checkout URL returned from server');
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Could not start checkout. Please try again.';
      console.error('[BillingPage] Checkout error:', error);
      toast({
        title: 'Payment Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // ── Animation variants ────────────────────────────────────────────────────
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 260, damping: 25 } },
  };

  return (
    <div className="flex-1 p-5 md:p-6 overflow-y-auto space-y-6">
      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-warm-900 dark:text-cream-50 tracking-tight">
            Billing
          </h2>
          <p className="text-xs text-warm-500">
            Manage credits and purchase history.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20">
          <CreditCard className="h-3.5 w-3.5 text-indigo-500" />
          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            {isPro ? 'Pro Plan' : 'Free Plan'}
          </span>
        </div>
      </div>

      {/* ── SUCCESS BANNER ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showSuccess && (
          <SuccessBanner onDismiss={() => setShowSuccess(false)} />
        )}
      </AnimatePresence>

      {/* ── PLAN CARD ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left: Current Plan + Credits */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="show"
          className="glass-card rounded-2xl p-6 flex flex-col gap-5 border border-white/40 dark:border-slate-800/40"
        >
          {/* Plan badge */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-warm-700 dark:text-warm-300">
              Current Plan
            </span>
            {isPro ? (
              <span className="px-3 py-1 rounded-full text-xs font-bold text-white indigo-gradient shadow">
                Pro Plan
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-cream-100 dark:bg-white/10 text-warm-700 dark:text-warm-300 border border-warm-200 dark:border-white/10">
                Free Plan
              </span>
            )}
          </div>

          {/* Credits display */}
          <div className="flex flex-col items-center justify-center py-4 gap-1">
            <span className="text-gradient text-6xl font-bold tracking-tight">
              {isPro ? '∞' : credits}
            </span>
            <span className="text-sm text-warm-500 font-medium">
              credits remaining
            </span>
          </div>

          {/* Credit bar */}
          {!isPro && (
            <div className="w-full h-2 rounded-full bg-warm-200/60 dark:bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${creditPct}%`, background: barColor }}
              />
            </div>
          )}

          {/* Usage bars */}
          {user?.usage && (
            <div className="flex flex-col gap-3 pt-2 border-t border-white/20 dark:border-white/10">
              <span className="text-xs font-semibold text-warm-500 uppercase tracking-wider">
                This Month
              </span>
              <UsageBar
                label="Meetings"
                used={user.usage.meetingsThisMonth}
                limit={user.usage.meetingsLimit}
                color="#6366f1"
              />
              <UsageBar
                label="Voice calls"
                used={user.usage.voiceCallsThisMonth}
                limit={user.usage.voiceCallsLimit}
                color="#f59e0b"
              />
              <UsageBar
                label="Contacts"
                used={user.usage.contactsTotal}
                limit={user.usage.contactsLimit}
                color="#10b981"
              />
            </div>
          )}
        </motion.div>

        {/* Right: Purchase card or Pro message */}
        {isPro ? (
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="show"
            className="glass-card rounded-2xl p-6 flex flex-col items-center justify-center gap-4 border border-emerald-400/40 bg-emerald-50/30 dark:bg-emerald-500/5 text-center"
          >
            <div className="h-14 w-14 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg">
              <CheckCircle2 className="h-7 w-7 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-warm-900 dark:text-cream-50">
                You're on Pro
              </h3>
              <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
                Unlimited meetings, voice calls, and contacts.
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="show"
            className="glass-card rounded-2xl p-6 flex flex-col gap-5 border-2 border-indigo-400/60 dark:border-indigo-500/40 bg-indigo-50/30 dark:bg-indigo-500/5"
          >
            {/* Header */}
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl indigo-gradient flex items-center justify-center shadow">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-warm-900 dark:text-cream-50">
                  Buy Credits
                </h3>
                <p className="text-xs text-warm-500">One-time purchase, no subscription</p>
              </div>
            </div>

            {/* Package details */}
            <div className="flex flex-col items-center py-4 gap-1 border-y border-indigo-200/50 dark:border-indigo-500/20">
              <span className="text-gradient text-4xl font-bold tracking-tight">
                50 credits
              </span>
              <span className="text-xl font-bold text-warm-900 dark:text-cream-50">
                $10{' '}
                <span className="text-sm font-normal text-warm-500">one-time</span>
              </span>
              <span className="text-xs text-warm-400 mt-1">
                No subscription. Use at your own pace.
              </span>
            </div>

            {/* What you get */}
            <ul className="flex flex-col gap-2">
              {[
                '50 meeting schedules',
                '50 voice confirmation calls',
                'Never expires',
                'Email invites always free',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-warm-700 dark:text-warm-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>

            {/* CTA */}
            <div className="flex flex-col gap-2 mt-auto">
              <PressButton
                variant="primary"
                size="lg"
                type="button"
                className="w-full"
                onClick={handlePurchase}
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Redirecting to Stripe…
                  </span>
                ) : (
                  'Buy 50 credits — $10'
                )}
              </PressButton>

              <div className="flex items-center justify-center gap-1.5 text-xs text-warm-400">
                <Shield className="h-3.5 w-3.5" />
                Secured by Stripe
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* ── TRANSACTION HISTORY ───────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card rounded-2xl p-5 md:p-6 border border-white/40 dark:border-slate-800/40"
      >
        <div className="mb-4">
          <h3 className="font-semibold text-warm-900 dark:text-cream-50 text-lg">
            Credit history
          </h3>
          <p className="text-xs text-warm-400">
            All purchases and deductions for your account.
          </p>
        </div>

        {historyLoading ? (
          <div className="flex flex-col gap-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-xl bg-warm-200 dark:bg-warm-800" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <CreditCard className="h-10 w-10 text-warm-300 dark:text-warm-600" />
            <p className="text-sm text-warm-400">No transactions yet</p>
          </div>
        ) : (
          <div className="divide-y divide-warm-100 dark:divide-slate-800">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                {/* Left */}
                <div className="flex items-center gap-3">
                  <div
                    className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                      tx.type === 'purchase'
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500'
                        : 'bg-warm-100 dark:bg-white/5 text-warm-400'
                    }`}
                  >
                    {tx.type === 'purchase' ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <Minus className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <p
                      className={`text-xs font-semibold ${
                        tx.type === 'purchase'
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-warm-700 dark:text-warm-300'
                      }`}
                    >
                      {formatReason(tx.reason)}
                    </p>
                    <p className="text-[10px] text-warm-400">
                      {format(parseISO(tx.createdAt), 'MMM d, yyyy · h:mm a')}
                    </p>
                  </div>
                </div>

                {/* Right: amount */}
                <span
                  className={`text-sm font-bold ${
                    tx.type === 'purchase'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-warm-500'
                  }`}
                >
                  {tx.type === 'purchase'
                    ? `+${tx.amount} credits`
                    : `${tx.amount} credit`}
                </span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
