import { useEffect, useRef, useState, useCallback } from 'react';
import { Brain, Server, User, AlertCircle, Phone, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { apiClient } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AIEvent {
  id: string;
  type: string;
  message: string;
  status: string;
  meetingId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

const EVENT_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; border: string; label: string }> = {
  AI_ACTION:    { icon: Brain,        color: 'text-violet-400',  bg: 'bg-violet-500/10',  border: 'border-violet-500/20', label: 'AI' },
  SYSTEM:       { icon: Server,       color: 'text-slate-400',   bg: 'bg-slate-500/10',   border: 'border-slate-500/20',  label: 'System' },
  USER_RESPONSE:{ icon: User,         color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20',label: 'User' },
  ERROR:        { icon: AlertCircle,  color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20',    label: 'Error' },
  SIMULATION:   { icon: Phone,        color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20',  label: 'Call' },
};

const STATUS_DOT: Record<string, string> = {
  success: 'bg-emerald-400',
  pending: 'bg-amber-400 animate-pulse',
  failed:  'bg-red-400',
};

interface AIAssistantPanelProps {
  onRetry?: (event: AIEvent) => void;
}

export default function AIAssistantPanel({ onRetry }: AIAssistantPanelProps) {
  const [events, setEvents] = useState<AIEvent[]>([]);
  const [pollError, setPollError] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const sinceRef = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (sinceRef.current) params.since = sinceRef.current;
      const res = await apiClient.get('/events', { params });
      const newEvents: AIEvent[] = res.data?.data?.events || [];
      if (newEvents.length > 0) {
        setEvents(prev => {
          const existingIds = new Set(prev.map((e: AIEvent) => e.id));
          const fresh = newEvents.filter((e: AIEvent) => !existingIds.has(e.id));
          if (fresh.length === 0) return prev;
          sinceRef.current = fresh[fresh.length - 1].createdAt;
          return [...prev, ...fresh].slice(-200);
        });
      }
      setPollError(false);
      setErrorCount(0);
    } catch {
      setErrorCount(c => {
        const next = c + 1;
        if (next >= 3) setPollError(true);
        return next;
      });
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    intervalRef.current = setInterval(fetchEvents, 4000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchEvents]);

  useEffect(() => {
    if (events.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [events]);

  const handleManualRefresh = () => {
    setPollError(false);
    setErrorCount(0);
    fetchEvents();
    if (!intervalRef.current) {
      intervalRef.current = setInterval(fetchEvents, 4000);
    }
  };

  return (
    <div className="flex flex-col h-full bg-card border rounded-xl overflow-hidden shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-violet-400" />
          <span className="font-semibold text-sm">AI Activity Log</span>
        </div>
        <div className="flex items-center gap-2">
          {pollError ? (
            <WifiOff className="h-3.5 w-3.5 text-red-400" />
          ) : (
            <Wifi className="h-3.5 w-3.5 text-emerald-400" />
          )}
          <span className="text-xs text-muted-foreground">{pollError ? 'Disconnected' : 'Live'}</span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleManualRefresh} title="Refresh">
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Connection lost banner */}
      {pollError && (
        <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20 flex items-center justify-between">
          <span className="text-xs text-red-400">Connection lost — updates paused</span>
          <Button size="sm" variant="outline" className="h-6 text-xs" onClick={handleManualRefresh}>
            Reconnect
          </Button>
        </div>
      )}

      {/* Event timeline */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {events.length === 0 && (
            <div className="text-center text-muted-foreground text-xs py-8">
              <Brain className="h-8 w-8 mx-auto mb-2 opacity-20" />
              <p className="font-medium">Waiting for AI activity…</p>
              <p className="mt-1 opacity-60">Create a meeting to see events here</p>
            </div>
          )}
          {events.map(event => {
            const cfg = EVENT_CONFIG[event.type] || EVENT_CONFIG['SYSTEM'];
            const Icon = cfg.icon;
            return (
              <div key={event.id} className={`flex gap-3 p-3 rounded-lg ${cfg.bg} border ${cfg.border}`}>
                <div className={`flex-shrink-0 mt-0.5 ${cfg.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <Badge variant="outline" className={`text-[10px] px-1 py-0 h-4 ${cfg.color} border-current`}>
                      {cfg.label}
                    </Badge>
                    <div className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[event.status] || 'bg-slate-400'}`} />
                    <span className="text-[10px] text-muted-foreground ml-auto flex-shrink-0">
                      {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-xs text-foreground/90 leading-relaxed break-words">{event.message}</p>
                  {event.type === 'ERROR' && onRetry && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-5 text-[10px] mt-1.5 text-red-400 border-red-400/30 hover:bg-red-400/10"
                      onClick={() => onRetry(event)}
                    >
                      Retry
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
    </div>
  );
}
