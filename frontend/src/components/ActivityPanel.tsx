import { useState, useEffect, useCallback } from 'react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Phone, CheckCircle2, XCircle, Clock, RefreshCw, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';

// ── Types ────────────────────────────────────────────────────────────────────

type EntryType = 'bot' | 'voice';
type Outcome = 'success' | 'failed' | 'pending' | 'no_answer';

interface ActivityEntry {
  id: string;
  type: EntryType;
  timestamp: string; // ISO
  outcome: Outcome;
  summary: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function mapOutcome(raw?: string): Outcome {
  if (!raw) return 'pending';
  const lower = raw.toLowerCase();
  if (lower.includes('success') || lower.includes('complet') || lower.includes('confirm')) return 'success';
  if (lower.includes('fail') || lower.includes('error')) return 'failed';
  if (lower.includes('no_answer') || lower.includes('no answer') || lower.includes('busy')) return 'no_answer';
  return 'pending';
}

const outcomeIcon: Record<Outcome, React.ReactNode> = {
  success:   <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />,
  failed:    <XCircle className="h-3.5 w-3.5 text-red-500" />,
  pending:   <Clock className="h-3.5 w-3.5 text-amber-500" />,
  no_answer: <Phone className="h-3.5 w-3.5 text-warm-400" />,
};

const outcomeBadge: Record<Outcome, string> = {
  success:   'bg-green-50 text-green-700 border-green-200',
  failed:    'bg-red-50 text-red-600 border-red-200',
  pending:   'bg-amber-50 text-amber-600 border-amber-200',
  no_answer: 'bg-warm-100 text-warm-500 border-warm-300',
};

// ── Component ─────────────────────────────────────────────────────────────────

const POLL_MS = 15_000;

export function ActivityPanel() {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivity = useCallback(async () => {
    try {
      const [botRes, voiceRes] = await Promise.all([
        api.get('/bot/session').catch(() => null),
        api.get('/voice/logs').catch(() => null),
      ]);

      if (!botRes && !voiceRes) {
        throw new Error('Failed to connect to API');
      }

      setError(null);

      const botSessions = botRes?.data?.data || [];
      const voiceLogs = voiceRes?.data?.data || [];

      console.log('[ActivityPanel] bot sessions:', botSessions);
      console.log('[ActivityPanel] voice logs:', voiceLogs);

      const botEntries: ActivityEntry[] = (Array.isArray(botSessions) ? botSessions : []).map((s: Record<string, unknown>) => ({
        id: `bot-${s.id as string}`,
        type: 'bot' as const,
        timestamp: s.createdAt as string,
        outcome: mapOutcome(s.status as string | undefined),
        summary: (s.summary ?? s.lastMessage ?? 'Bot session recorded') as string,
      }));

      const voiceEntries: ActivityEntry[] = (Array.isArray(voiceLogs) ? voiceLogs : []).map((v: Record<string, unknown>) => ({
        id: `voice-${v.id as string}`,
        type: 'voice' as const,
        timestamp: (v.calledAt || v.createdAt || new Date().toISOString()) as string,
        outcome: mapOutcome((v.outcome ?? v.status) as string | undefined),
        summary: (v.summary ?? v.notes ?? 'Voice call recorded') as string,
      }));

      const all = [...botEntries, ...voiceEntries]
        .filter(e => e.timestamp)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setEntries(all);
    } catch (err: unknown) {
      console.error('[ActivityPanel] Fetch error:', err);
      setError('Unable to load feed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivity();
    const id = window.setInterval(fetchActivity, POLL_MS);
    return () => window.clearInterval(id);
  }, [fetchActivity]);

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h2 className="text-sm font-semibold text-warm-900 dark:text-cream-50">Activity Feed</h2>
          <p className="text-xs text-warm-500 mt-0.5">Live — refreshes every 15 s</p>
        </div>
        <Button
          id="activity-refresh"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-warm-500 hover:text-indigo-500"
          onClick={() => {
            setLoading(true);
            fetchActivity();
          }}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
        </Button>
      </div>

      {/* Feed */}
      <ScrollArea className="flex-1 -mr-2 pr-2">
        {error ? (
          <div className="flex flex-col items-center justify-center text-center py-12 px-4 gap-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-xl">
            <AlertCircle className="h-6 w-6 text-red-500" />
            <p className="text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchActivity} className="h-7 mt-2 text-xs rounded-xl">
              Retry
            </Button>
          </div>
        ) : loading && entries.length === 0 ? (
          <div className="space-y-2.5">
            {[1, 2, 3, 4].map((k) => (
              <Skeleton key={k} className="h-16 w-full rounded-xl bg-warm-100 dark:bg-white/5" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-16 px-4 gap-3">
            <div className="h-10 w-10 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
              <Bot className="h-5 w-5 text-warm-300 dark:text-warm-400" />
            </div>
            <p className="text-xs text-warm-500 leading-relaxed">
              No activity yet — send a message to your Telegram bot to get started
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            <div className="space-y-2 pb-4">
              {entries.map((entry, i) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: i * 0.04 }}
                  className={`flex gap-3 rounded-xl bg-white dark:bg-white/5 shadow-card border-l-[3px] p-3 transition-shadow hover:shadow-glass ${
                    entry.type === 'bot' ? 'border-l-indigo-400' : 'border-l-amber-400'
                  }`}
                >
                  {/* Icon */}
                  <div className="shrink-0 mt-0.5">
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center ${
                      entry.type === 'bot'
                        ? 'bg-indigo-100 dark:bg-indigo-500/15'
                        : 'bg-amber-100 dark:bg-amber-500/15'
                    }`}>
                      {entry.type === 'bot'
                        ? <Bot className="h-3.5 w-3.5 text-indigo-500" />
                        : <Phone className="h-3.5 w-3.5 text-amber-500" />}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-medium text-warm-700 dark:text-warm-300 capitalize">
                        {entry.type === 'bot' ? 'Bot session' : 'Voice call'}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border flex items-center gap-1 ${outcomeBadge[entry.outcome]}`}>
                        {outcomeIcon[entry.outcome]}
                        {entry.outcome.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-[11px] text-warm-500 dark:text-warm-400 leading-snug line-clamp-2">
                      {entry.summary}
                    </p>
                    <p className="text-[10px] text-warm-400">
                      {formatDistanceToNow(parseISO(entry.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </ScrollArea>
    </div>
  );
}
