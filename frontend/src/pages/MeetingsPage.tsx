import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  CheckCircle,
  Clock,
  CalendarDays,
  Search,
  CalendarX,
  ChevronDown,
  ChevronUp,
  Phone,
  MoreHorizontal,
  Copy,
  Trash2,
  AlertTriangle,
  RefreshCw,
  UserCheck,
  X,
} from 'lucide-react';
import {
  format,
  parseISO,
  isThisWeek,
  isThisMonth,
  differenceInMinutes,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PressButton } from '@/components/ui/PressButton';
import { NewMeetingModal } from '@/components/NewMeetingModal';
import api from '@/lib/api';
import type { Meeting, ConfirmationStatus } from '@/types/meeting';

// ── Types ──────────────────────────────────────────────────────────────────────

type FilterKey = 'all' | 'confirmed' | 'pending' | 'cancelled' | 'this-week' | 'this-month';
type SortKey = 'newest' | 'oldest' | 'az' | 'confirmed-first';

// ── Helpers ────────────────────────────────────────────────────────────────────

function getStatusBorderColor(status: ConfirmationStatus): string {
  switch (status) {
    case 'confirmed': return 'border-l-emerald-500';
    case 'unconfirmed': return 'border-l-amber-400';
    case 'rescheduled': return 'border-l-blue-400';
    default: return 'border-l-warm-300';
  }
}

function getConfirmationBadge(status: ConfirmationStatus) {
  const map: Record<ConfirmationStatus, { label: string; cls: string }> = {
    confirmed: { label: '✓ Confirmed', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    unconfirmed: { label: '⏳ Pending', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    rescheduled: { label: '↻ Rescheduled', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  };
  const { label, cls } = map[status] ?? map.unconfirmed;
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cls}`}>
      {label}
    </span>
  );
}

function getVoiceBadge(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: '📞 Call pending', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    completed: { label: '✓ Called', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    failed: { label: '✗ Call failed', cls: 'bg-red-50 text-red-700 border-red-200' },
    no_answer: { label: '— No answer', cls: 'bg-warm-100 text-warm-600 border-warm-200' },
    skipped: { label: '— Skipped', cls: 'bg-warm-100 text-warm-500 border-warm-200' },
  };
  const { label, cls } = map[status] ?? { label: status, cls: 'bg-warm-100 text-warm-500 border-warm-200' };
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cls}`}>
      {label}
    </span>
  );
}

function getInitials(name: string | undefined | null): string {
  if (!name) return 'U';
  return name
    .split(' ')
    .map((n) => n[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';
}

function durationLabel(startTime: string, endTime: string): string {
  const mins = differenceInMinutes(parseISO(endTime), parseISO(startTime));
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function isThisWeekStrict(dateStr: string): boolean {
  const dt = parseISO(dateStr);
  const start = startOfWeek(new Date(), { weekStartsOn: 1 });
  const end = endOfWeek(new Date(), { weekStartsOn: 1 });
  return dt >= start && dt <= end;
}

// ── Stat card ──────────────────────────────────────────────────────────────────

function StatCard({
  value,
  label,
  icon,
  iconColor,
}: {
  value: number;
  label: string;
  icon: React.ReactNode;
  iconColor: string;
}) {
  return (
    <div className="glass-card p-4 rounded-xl flex items-center gap-3">
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${iconColor}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-warm-900">{value}</p>
        <p className="text-xs text-warm-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ── Skeleton row ───────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="bg-white/80 rounded-xl p-4 border-l-4 border-l-warm-200 shadow-card animate-pulse">
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0 space-y-2">
          <Skeleton className="h-4 w-48 bg-warm-200/60" />
          <Skeleton className="h-3 w-32 bg-warm-200/40" />
        </div>
        <div className="hidden md:flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-7 w-7 rounded-full bg-warm-200/60" />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-16 rounded-full bg-warm-200/40" />
          <Skeleton className="h-5 w-20 rounded-full bg-warm-200/40" />
        </div>
      </div>
    </div>
  );
}

// ── Expanded detail ────────────────────────────────────────────────────────────

function ExpandedDetail({ meeting }: { meeting: Meeting }) {
  return (
    <div className="px-4 pb-4 pt-2 border-t border-warm-100 mt-3 space-y-4">
      {/* Participants */}
      <div>
        <p className="text-xs font-semibold text-warm-700 uppercase tracking-wide mb-2">Participants</p>
        <div className="space-y-1.5">
          {(meeting.participants ?? []).map((p) => (
            <div key={p.userId} className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-bold text-indigo-600">{getInitials(p.user?.name ?? p.user?.email)}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-warm-900 truncate">{p.user?.name ?? 'Unknown'}</p>
                <p className="text-[10px] text-warm-400 truncate">{p.user?.email ?? ''}</p>
              </div>
              <span className={`h-2 w-2 rounded-full shrink-0 ${
                p.status === 'confirmed' ? 'bg-emerald-400' :
                p.status === 'declined' ? 'bg-red-400' : 'bg-amber-400'
              }`} title={p.status} />
            </div>
          ))}
        </div>
      </div>

      {/* Agenda topics */}
      <div>
        <p className="text-xs font-semibold text-warm-700 uppercase tracking-wide mb-2">Agenda Topics</p>
        {meeting.agendaTopics.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {meeting.agendaTopics.map((topic, i) => (
              <span
                key={i}
                className="bg-indigo-50 text-indigo-700 text-[11px] font-medium px-2.5 py-1 rounded-full border border-indigo-100"
              >
                {topic}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs italic text-warm-400">Awaiting voice confirmation…</p>
        )}
      </div>

      {/* Voice response snippets */}
      {meeting.participants.some((p) => p.voiceResponse) && (
        <div>
          <p className="text-xs font-semibold text-warm-700 uppercase tracking-wide mb-2">Voice Responses</p>
          <div className="space-y-1.5">
            {meeting.participants
              .filter((p) => p.voiceResponse)
              .slice(0, 2)
              .map((p) => (
                <div key={p.userId} className="glass-card rounded-lg p-2.5 text-[11px] text-warm-600">
                  <span className="font-semibold text-warm-800">{p.user?.name ?? 'Participant'}: </span>
                  {p.voiceResponse}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Schedule voice call CTA */}
      {meeting.voiceCallStatus === 'pending' && (
        <div className="pt-1">
          <PressButton variant="accent" size="sm">
            <span className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" />
              Schedule voice call
            </span>
          </PressButton>
        </div>
      )}
    </div>
  );
}

// ── Meeting row ────────────────────────────────────────────────────────────────

function MeetingRow({
  meeting,
  expanded,
  onToggle,
  onNewMeeting,
}: {
  meeting: Meeting;
  expanded: boolean;
  onToggle: () => void;
  onNewMeeting: () => void;
}) {
  const participants = meeting.participants ?? [];
  const visibleParticipants = participants.slice(0, 3);
  const extraCount = participants.length - 3;

  return (
    <div
      className={`bg-white/80 rounded-xl border-l-4 ${getStatusBorderColor(meeting.confirmationStatus)} shadow-card hover:shadow-glass transition-all duration-200 overflow-hidden`}
    >
      {/* Main row */}
      <div
        className="flex items-center gap-4 p-4 cursor-pointer"
        onClick={onToggle}
      >
        {/* Left: title + time + duration */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-warm-900 text-sm truncate">{meeting.title}</p>
            <span className="bg-cream-100 text-warm-600 text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0">
              {durationLabel(meeting.startTime, meeting.endTime)}
            </span>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <Clock className="h-3 w-3 text-warm-400 shrink-0" />
            <p className="text-xs text-warm-500">
              {format(parseISO(meeting.startTime), 'EEE, MMM d · h:mm a')}
              {' → '}
              {format(parseISO(meeting.endTime), 'h:mm a')}
            </p>
          </div>
        </div>

        {/* Center: participant avatars (hidden mobile) */}
        <div className="hidden md:flex items-center gap-1.5 shrink-0">
          <div className="flex -space-x-2">
            {visibleParticipants.map((p) => (
              <div
                key={p.userId}
                className="h-7 w-7 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center"
                title={p.user?.name ?? p.user?.email ?? 'Participant'}
              >
                <span className="text-[9px] font-bold text-indigo-600">
                  {getInitials(p.user?.name ?? p.user?.email)}
                </span>
              </div>
            ))}
          </div>
          {extraCount > 0 && (
            <span className="text-[10px] text-warm-400 font-medium">+{extraCount}</span>
          )}
          <span className="text-[10px] text-warm-400 ml-1">
            {participants.length} participant{participants.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Right: badges + expand + menu */}
        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          <div className="hidden sm:flex items-center gap-1.5">
            {getVoiceBadge(meeting.voiceCallStatus)}
            {getConfirmationBadge(meeting.confirmationStatus)}
          </div>

          {/* Expand chevron */}
          <button
            onClick={onToggle}
            className="p-1 rounded-lg hover:bg-warm-100 transition-colors text-warm-400"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {/* Three-dot menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 rounded-lg hover:bg-warm-100 transition-colors text-warm-400">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 z-50">
              <DropdownMenuItem
                className="gap-2 cursor-pointer"
                onClick={onToggle}
              >
                <CalendarDays className="h-4 w-4" />
                View details
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2 cursor-pointer"
                onClick={() => navigator.clipboard.writeText(meeting.id)}
              >
                <Copy className="h-4 w-4" />
                Copy meeting ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2 text-red-600 focus:text-red-600 cursor-pointer">
                <Trash2 className="h-4 w-4" />
                Cancel meeting
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile badges */}
      <div className="sm:hidden flex gap-1.5 px-4 pb-3 -mt-1 flex-wrap">
        {getVoiceBadge(meeting.voiceCallStatus)}
        {getConfirmationBadge(meeting.confirmationStatus)}
      </div>

      {/* Expanded detail with animation */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="expanded"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <ExpandedDetail meeting={meeting} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────────

function EmptyState({
  search,
  filter,
  onNewMeeting,
}: {
  search: string;
  filter: FilterKey;
  onNewMeeting: () => void;
}) {
  const filterLabels: Record<FilterKey, string> = {
    all: '',
    confirmed: 'confirmed',
    pending: 'pending',
    cancelled: 'cancelled',
    'this-week': "this week's",
    'this-month': "this month's",
  };

  let heading = 'No meetings found';
  let subtext = '';

  if (search) {
    subtext = 'No meetings match your search. Try a different title or participant name.';
  } else if (filter !== 'all') {
    subtext = `No ${filterLabels[filter]} meetings yet.`;
  } else {
    subtext = 'Schedule your first meeting via Telegram or click + New Meeting.';
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <CalendarX className="h-16 w-16 text-warm-300 mb-5" />
      <h3 className="text-base font-semibold text-warm-700 mb-2">{heading}</h3>
      <p className="text-sm text-warm-500 max-w-xs mb-6">{subtext}</p>
      {filter === 'all' && !search && (
        <PressButton variant="primary" size="md" onClick={onNewMeeting}>
          + New Meeting
        </PressButton>
      )}
    </div>
  );
}

// ── Main MeetingsPage ──────────────────────────────────────────────────────────

export default function MeetingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const participantId = searchParams.get('participant');

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [participantName, setParticipantName] = useState<string | null>(null);

  // ── Data fetch ──────────────────────────────────────────────────────────────

  const fetchMeetings = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get<{ data: Meeting[] }>('/meetings');
      setMeetings(res.data.data ?? []);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number }; message?: string };
      if (axiosErr?.response?.status === 401) return;
      setError(axiosErr?.message ?? 'Failed to load meetings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  // Resolve participant name from meeting data when ?participant= is set
  useEffect(() => {
    if (!participantId || meetings.length === 0) return;
    for (const m of meetings) {
      const found = (m.participants ?? []).find((p) => p.userId === participantId);
      if (found?.user?.name) {
        setParticipantName(found.user.name);
        return;
      }
    }
  }, [participantId, meetings]);

  // ── Stats ───────────────────────────────────────────────────────────────────

  const stats = useMemo(() => ({
    total: meetings.length,
    confirmed: meetings.filter((m) => m.confirmationStatus === 'confirmed').length,
    pending: meetings.filter((m) => m.confirmationStatus === 'unconfirmed').length,
    thisWeek: meetings.filter((m) => isThisWeekStrict(m.startTime)).length,
  }), [meetings]);

  // ── Filter + search + sort ──────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let result = [...meetings];

    // Participant filter (from ?participant= query param)
    if (participantId) {
      result = result.filter((m) =>
        (m.participants ?? []).some((p) => p.userId === participantId),
      );
    }

    // Filter
    switch (activeFilter) {
      case 'confirmed':
        result = result.filter((m) => m.confirmationStatus === 'confirmed');
        break;
      case 'pending':
        result = result.filter((m) => m.confirmationStatus === 'unconfirmed');
        break;
      case 'cancelled':
        result = result.filter((m) => m.status === 'cancelled');
        break;
      case 'this-week':
        result = result.filter((m) => isThisWeekStrict(m.startTime));
        break;
      case 'this-month':
        result = result.filter((m) => isThisMonth(parseISO(m.startTime)));
        break;
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          (m.participants ?? []).some(
            (p) =>
              (p.user?.name ?? '').toLowerCase().includes(q) ||
              (p.user?.email ?? '').toLowerCase().includes(q),
          ),
      );
    }

    // Sort
    switch (sortKey) {
      case 'newest':
        result.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
        break;
      case 'oldest':
        result.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        break;
      case 'az':
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'confirmed-first':
        result.sort((a) => (a.confirmationStatus === 'confirmed' ? -1 : 1));
        break;
    }

    return result;
  }, [meetings, activeFilter, search, sortKey]);

  // ── Filters config ──────────────────────────────────────────────────────────

  const filters: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'pending', label: 'Pending' },
    { key: 'cancelled', label: 'Cancelled' },
    { key: 'this-week', label: 'This week' },
    { key: 'this-month', label: 'This month' },
  ];

  return (
    <div className="flex flex-col h-full gap-5 overflow-y-auto p-5">
      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-warm-900">Meetings</h1>
          <p className="text-sm text-warm-500 mt-0.5">All your scheduled meetings in one place</p>
        </div>
        <PressButton
          variant="primary"
          size="sm"
          onClick={() => setModalOpen(true)}
        >
          + New Meeting
        </PressButton>
      </div>

      {/* ── Participant filter banner ── */}
      <AnimatePresence>
        {participantId && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center justify-between gap-3 rounded-xl bg-indigo-50 border border-indigo-200 px-4 py-3 text-sm text-indigo-700 shrink-0"
          >
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 shrink-0" />
              <span>
                Showing meetings with{' '}
                <strong>{participantName ?? 'contact'}</strong>
              </span>
            </div>
            <button
              onClick={() => setSearchParams({})}
              className="text-indigo-400 hover:text-indigo-700 transition-colors"
              title="Clear contact filter"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Error banner ── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center justify-between gap-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 shrink-0"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={fetchMeetings}
              className="flex items-center gap-1.5 text-xs font-medium hover:text-red-800 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
        <StatCard
          value={stats.total}
          label="Total meetings"
          icon={<Calendar className="h-5 w-5 text-indigo-500" />}
          iconColor="bg-indigo-50"
        />
        <StatCard
          value={stats.confirmed}
          label="Confirmed"
          icon={<CheckCircle className="h-5 w-5 text-emerald-500" />}
          iconColor="bg-emerald-50"
        />
        <StatCard
          value={stats.pending}
          label="Awaiting confirmation"
          icon={<Clock className="h-5 w-5 text-amber-500" />}
          iconColor="bg-amber-50"
        />
        <StatCard
          value={stats.thisWeek}
          label="This week"
          icon={<CalendarDays className="h-5 w-5 text-purple-500" />}
          iconColor="bg-purple-50"
        />
      </div>

      {/* ── Filter + sort bar ── */}
      <div className="glass-panel rounded-xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-warm-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by title or participant..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 h-9 rounded-xl bg-white/80 border border-warm-200 text-sm text-warm-900 placeholder:text-warm-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition-all"
          />
        </div>

        {/* Filter pills — horizontally scrollable */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
          {filters.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-all duration-150 ${
                activeFilter === key
                  ? 'bg-indigo-500 text-white shadow-sm'
                  : 'bg-cream-100 text-warm-600 hover:bg-indigo-50 hover:text-indigo-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="shrink-0">
          <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
            <SelectTrigger className="h-9 text-xs w-36 bg-white/80 border-warm-200 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-50">
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="az">A to Z</SelectItem>
              <SelectItem value="confirmed-first">Confirmed first</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Meeting list ── */}
      <div className="flex flex-col gap-2 flex-1">
        {loading ? (
          <>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </>
        ) : filtered.length === 0 ? (
          <EmptyState
            search={search}
            filter={activeFilter}
            onNewMeeting={() => setModalOpen(true)}
          />
        ) : (
          <AnimatePresence initial={false}>
            {filtered.map((meeting, i) => (
              <motion.div
                key={meeting.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, delay: i * 0.03 }}
              >
                <MeetingRow
                  meeting={meeting}
                  expanded={expandedId === meeting.id}
                  onToggle={() =>
                    setExpandedId((prev) => (prev === meeting.id ? null : meeting.id))
                  }
                  onNewMeeting={() => setModalOpen(true)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* ── New Meeting Modal ── */}
      <NewMeetingModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={fetchMeetings}
      />
    </div>
  );
}
