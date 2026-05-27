import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { parseISO, format as formatFns } from 'date-fns';
import {
  Calendar,
  CalendarDays,
  TrendingUp,
  PhoneCall,
  CheckCircle,
  Bot,
  BarChart2,
  ArrowUpRight,
  ArrowDownRight,
  MessageSquare,
  Phone,
  Send,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { PressButton } from '@/components/ui/PressButton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import api from '@/lib/api';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// ── Types ────────────────────────────────────────────────────────────────────

interface OverviewData {
  totalMeetings: number;
  thisWeek: number;
  lastWeek: number;
  thisMonth: number;
  confirmationRate: number;
  voiceCallSuccessRate: number;
  totalCalls: number;
}

interface MeetingPerDay {
  date: string;
  count: number;
}

interface StatusBreakdown {
  confirmed: number;
  unconfirmed: number;
  cancelled: number;
}

interface VoiceCallBreakdown {
  completed: number;
  failed: number;
  pending: number;
  skipped: number;
}

interface ParticipantMetric {
  name: string;
  email: string;
  meetingCount: number;
}

interface ActivityItem {
  date: string;
  type: 'meeting' | 'voice' | 'bot';
  description: string;
}

interface AnalyticsResponse {
  overview: OverviewData;
  meetingsPerDay: MeetingPerDay[];
  statusBreakdown: StatusBreakdown;
  voiceCallBreakdown: VoiceCallBreakdown;
  topParticipants: ParticipantMetric[];
  recentActivity: ActivityItem[];
}

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<string>('30days');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyticsResponse | null>(null);

  // Helper: Get from/to query range strings
  const getDateRangeParams = (range: string) => {
    const to = new Date();
    let from = new Date();
    if (range === '7days') {
      from.setDate(to.getDate() - 7);
    } else if (range === '30days') {
      from.setDate(to.getDate() - 30);
    } else if (range === '3months') {
      from.setMonth(to.getMonth() - 3);
    } else if (range === 'alltime') {
      from = new Date('2025-01-01'); // Beginning of tracking
    }
    return {
      from: from.toISOString(),
      to: to.toISOString(),
    };
  };

  useEffect(() => {
    let active = true;

    async function fetchAnalytics() {
      try {
        setLoading(true);
        setError(null);
        const { from, to } = getDateRangeParams(dateRange);
        
        const response = await api.get('/analytics/summary', {
          params: { from, to },
        });


        if (active) {
          setData(response.data.data);
        }
      } catch (err: any) {
        console.error('Failed to load analytics', err);
        if (active) {
          setError(err.response?.data?.message || 'Failed to fetch analytics statistics.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchAnalytics();

    return () => {
      active = false;
    };
  }, [dateRange]);

  // Handle formatters
  const formatXAxis = (tickItem: string) => {
    try {
      const date = parseISO(tickItem);
      return formatFns(date, 'MMM d');
    } catch (_) {
      return tickItem;
    }
  };

  const getInitials = (name: string, email: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return (email || 'U').slice(0, 2).toUpperCase();
  };

  // Custom tooltips
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      let dateStr = label;
      try {
        dateStr = formatFns(parseISO(label), 'MMMM d, yyyy');
      } catch (_) {}
      return (
        <div className="glass-card p-3 rounded-xl border border-white/20 dark:border-slate-800 shadow-lg text-xs bg-white/90 dark:bg-slate-900/90">
          <p className="font-semibold text-warm-900 dark:text-cream-50">{dateStr}</p>
          <p className="text-indigo-600 dark:text-indigo-400 mt-1 font-medium">
            Meetings: <span className="font-bold text-sm ml-1">{payload[0].value}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  // ── Skeletons loaders ──────────────────────────────────────────────────────

  if (loading && !data) {
    return (
      <div className="flex-1 p-5 md:p-6 overflow-y-auto space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-7 w-36 bg-warm-200 dark:bg-warm-800" />
            <Skeleton className="h-4 w-60 bg-warm-200 dark:bg-warm-800" />
          </div>
          <Skeleton className="h-9 w-36 bg-warm-200 dark:bg-warm-800 rounded-xl" />
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl bg-warm-200 dark:bg-warm-800" />
          ))}
        </div>

        {/* Chart Area */}
        <Skeleton className="h-[280px] w-full rounded-2xl bg-warm-200 dark:bg-warm-800" />

        {/* Donuts Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-72 rounded-2xl bg-warm-200 dark:bg-warm-800" />
          <Skeleton className="h-72 rounded-2xl bg-warm-200 dark:bg-warm-800" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <BarChart2 className="h-14 w-14 text-red-400 mb-3 animate-pulse" />
        <h3 className="font-semibold text-lg text-warm-900 dark:text-cream-50">Error Loading Analytics</h3>
        <p className="text-warm-500 text-sm max-w-sm mt-1 mb-4">{error}</p>
        <PressButton variant="primary" onClick={() => setDateRange('30days')}>
          Retry Loading Summary
        </PressButton>
      </div>
    );
  }

  // Guaranteed model payload
  const metrics = data!;
  
  // Decide whether application is fully empty
  const isEmpty = metrics.overview.totalMeetings === 0 && metrics.overview.totalCalls === 0;

  // Pie chart breakdowns formatting
  const meetingStatusData = [
    { name: 'Confirmed', value: metrics.statusBreakdown.confirmed, color: '#10B981' },
    { name: 'Unconfirmed', value: metrics.statusBreakdown.unconfirmed, color: '#F59E0B' },
    { name: 'Cancelled', value: metrics.statusBreakdown.cancelled, color: '#EF4444' },
  ].filter((item) => item.value > 0 || isEmpty); // keep some mock if fully empty to render empty chart

  const voiceOutcomeData = [
    { name: 'Completed', value: metrics.voiceCallBreakdown.completed, color: '#10B981' },
    { name: 'Failed', value: metrics.voiceCallBreakdown.failed, color: '#EF4444' },
    { name: 'Pending', value: metrics.voiceCallBreakdown.pending, color: '#F59E0B' },
    { name: 'Skipped', value: metrics.voiceCallBreakdown.skipped, color: '#94A3B8' },
  ].filter((item) => item.value > 0 || isEmpty);

  // Animations configuration
  const cardContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const cardItem = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 25 } },
  };

  const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME ?? 'meetingagent_Exora_bot';

  return (
    <div className="flex-1 p-5 md:p-6 overflow-y-auto space-y-6">
      
      {/* ── TOP HEADER ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-warm-900 dark:text-cream-50 tracking-tight">Analytics</h2>
          <p className="text-xs text-warm-500">Meeting volume and AI orchestrations performance summary.</p>
        </div>

        <div className="shrink-0 self-end sm:self-auto">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="h-9 text-xs w-40 bg-white/80 dark:bg-slate-900/80 border-warm-200 dark:border-slate-800 rounded-xl font-medium focus:ring-indigo-500">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent className="z-50 bg-white dark:bg-slate-900 border-warm-200 dark:border-slate-800">
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="3months">Last 3 months</SelectItem>
              <SelectItem value="alltime">All time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── EMPTY STATE OR FULL DATA CONTAINER ────────────────────────────────── */}
      {isEmpty ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-white/40 dark:border-slate-800/40 shadow-glass"
        >
          <div className="h-16 w-16 rounded-2xl indigo-gradient flex items-center justify-center text-white mb-4 shadow-glass">
            <BarChart2 className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-warm-900 dark:text-cream-50">No Analytics Data Yet</h3>
          <p className="text-warm-500 text-sm max-w-sm mt-1 mb-5">
            Create or schedule your first automated meeting to unlock real-time intelligence feeds, performance charts, and call summaries.
          </p>
          <PressButton
            href={`https://t.me/${botUsername}`}
            variant="primary"
            size="md"
          >
            <span className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              Schedule via Telegram
            </span>
          </PressButton>
        </motion.div>
      ) : null}

      {/* ── SECTION 1: OVERVIEW STAT CARDS ────────────────────────────────────── */}
      <motion.div
        variants={cardContainer}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {/* Card 1: Total Meetings */}
        <motion.div variants={cardItem} className="glass-card p-5 rounded-2xl flex flex-col justify-between min-h-[110px] relative overflow-hidden group border border-white/40 dark:border-slate-800/40">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-warm-500 uppercase tracking-wider block">Total Meetings</span>
              <span className="text-gradient text-3xl md:text-4xl font-bold mt-1 block">
                {metrics.overview.totalMeetings.toLocaleString()}
              </span>
            </div>
            <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
              <Calendar className="h-5 w-5" />
            </div>
          </div>
          <span className="text-[10px] text-warm-400 mt-2 block font-medium">All meetings scheduled in period</span>
        </motion.div>

        {/* Card 2: This Week */}
        <motion.div variants={cardItem} className="glass-card p-5 rounded-2xl flex flex-col justify-between min-h-[110px] border border-white/40 dark:border-slate-800/40">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-warm-500 uppercase tracking-wider block">This Week</span>
              <span className="text-warm-900 dark:text-cream-50 text-3xl md:text-4xl font-bold mt-1 block">
                {metrics.overview.thisWeek.toLocaleString()}
              </span>
            </div>
            <div className="h-9 w-9 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
              <CalendarDays className="h-5 w-5" />
            </div>
          </div>
          
          {/* vs last week subtext math */}
          {(() => {
            const diff = metrics.overview.thisWeek - metrics.overview.lastWeek;
            const isUp = diff >= 0;
            const absDiff = Math.abs(diff);
            return (
              <div className="flex items-center gap-1 mt-2 text-[10px]">
                {isUp ? (
                  <ArrowUpRight className="h-3 w-3 text-emerald-500 shrink-0" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-rose-500 shrink-0" />
                )}
                <span className={isUp ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-rose-600 dark:text-rose-400 font-semibold"}>
                  {absDiff} {isUp ? 'more' : 'less'}
                </span>
                <span className="text-warm-400">vs last week ({metrics.overview.lastWeek})</span>
              </div>
            );
          })()}
        </motion.div>

        {/* Card 3: This Month */}
        <motion.div variants={cardItem} className="glass-card p-5 rounded-2xl flex flex-col justify-between min-h-[110px] border border-white/40 dark:border-slate-800/40">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-warm-500 uppercase tracking-wider block">This Month</span>
              <span className="text-warm-900 dark:text-cream-50 text-3xl md:text-4xl font-bold mt-1 block">
                {metrics.overview.thisMonth.toLocaleString()}
              </span>
            </div>
            <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <span className="text-[10px] text-warm-400 mt-2 block font-medium">Out of the last 30 active days</span>
        </motion.div>

        {/* Card 4: Confirmation Rate */}
        <motion.div variants={cardItem} className="glass-card p-5 rounded-2xl flex flex-col justify-between min-h-[110px] border border-white/40 dark:border-slate-800/40">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-warm-500 uppercase tracking-wider block">Confirmation Rate</span>
              <span className="text-warm-900 dark:text-cream-50 text-3xl md:text-4xl font-bold mt-1 block">
                {Math.round(metrics.overview.confirmationRate)}%
              </span>
            </div>
            <div className="h-9 w-9 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <PhoneCall className="h-5 w-5" />
            </div>
          </div>
          
          <div className="mt-2">
            <div className="w-full bg-cream-200 dark:bg-warm-850 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${metrics.overview.confirmationRate}%` }}
              />
            </div>
            <span className="text-[9px] text-warm-400 mt-1 block">Meetings verified via AI agent</span>
          </div>
        </motion.div>

        {/* Card 5: Voice Call Success */}
        <motion.div variants={cardItem} className="glass-card p-5 rounded-2xl flex flex-col justify-between min-h-[110px] border border-white/40 dark:border-slate-800/40">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-warm-500 uppercase tracking-wider block">Call Success Rate</span>
              <span className="text-warm-900 dark:text-cream-50 text-3xl md:text-4xl font-bold mt-1 block">
                {Math.round(metrics.overview.voiceCallSuccessRate)}%
              </span>
            </div>
            <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <CheckCircle className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-2">
            <div className="w-full bg-cream-200 dark:bg-warm-850 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${metrics.overview.voiceCallSuccessRate}%` }}
              />
            </div>
            <span className="text-[9px] text-warm-400 mt-1 block">Completed calls / total attempts</span>
          </div>
        </motion.div>

        {/* Card 6: AI Calls Made */}
        <motion.div variants={cardItem} className="glass-card p-5 rounded-2xl flex flex-col justify-between min-h-[110px] border border-white/40 dark:border-slate-800/40">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-warm-500 uppercase tracking-wider block">AI Calls Placed</span>
              <span className="text-warm-900 dark:text-cream-50 text-3xl md:text-4xl font-bold mt-1 block">
                {metrics.overview.totalCalls.toLocaleString()}
              </span>
            </div>
            <div className="h-9 w-9 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
              <Bot className="h-5 w-5" />
            </div>
          </div>
          <span className="text-[10px] text-warm-400 mt-2 block font-medium">Outbound synthesized voice logs</span>
        </motion.div>
      </motion.div>

      {/* ── SECTION 2: MEETINGS OVER TIME CHART ───────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card rounded-2xl p-5 md:p-6 border border-white/40 dark:border-slate-800/40"
      >
        <div className="mb-4">
          <h3 className="font-semibold text-warm-900 dark:text-cream-50 text-lg">Meetings Scheduled</h3>
          <p className="text-xs text-warm-400">Daily scheduling throughput metrics.</p>
        </div>

        <div className="w-full h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={metrics.meetingsPerDay}
              margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorMeetings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tickFormatter={formatXAxis}
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#A8A29E', fontSize: 10 }}
                dy={10}
                interval={Math.ceil(metrics.meetingsPerDay.length / 6)}
              />
              <YAxis
                allowDecimals={false}
                minTickGap={10}
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#A8A29E', fontSize: 10 }}
                domain={[0, 'auto']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#6366F1"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorMeetings)"
                activeDot={{ r: 4, strokeWidth: 0, fill: '#6366F1' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* ── SECTION 3: TWO DONUT CHARTS SIDE BY SIDE ─────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Donut 1: Meeting Status Breakdown */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-card rounded-2xl p-5 md:p-6 flex flex-col border border-white/40 dark:border-slate-800/40"
        >
          <div className="mb-2">
            <h3 className="font-semibold text-warm-900 dark:text-cream-50 text-base">Meeting Status</h3>
            <p className="text-xs text-warm-400">Distribution of structured calendar events.</p>
          </div>

          <div className="relative flex-1 flex flex-col items-center justify-center min-h-[220px]">
            {/* Chart + Label Overlay */}
            <div className="relative h-44 w-44 flex items-center justify-center shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={meetingStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {meetingStatusData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-bold text-warm-900 dark:text-cream-50">
                  {metrics.overview.totalMeetings}
                </span>
                <span className="text-[9px] uppercase tracking-wider text-warm-400 font-medium">meetings</span>
              </div>
            </div>

            {/* Custom Legend underneath */}
            <div className="w-full grid grid-cols-3 gap-2 mt-4 text-xs shrink-0">
              {meetingStatusData.map((item, idx) => {
                const total = metrics.overview.totalMeetings;
                const percent = total > 0 ? Math.round((item.value / total) * 100) : 0;
                return (
                  <div key={idx} className="flex flex-col items-center p-2 bg-cream-50/40 dark:bg-white/5 rounded-xl text-center">
                    <div className="flex items-center gap-1.5 justify-center mb-0.5">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-[10px] text-warm-500 font-medium truncate">{item.name}</span>
                    </div>
                    <div className="text-xs font-bold text-warm-900 dark:text-cream-50">
                      {item.value} <span className="text-[9px] font-normal text-warm-400">({percent}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Donut 2: Voice Call Outcomes */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-card rounded-2xl p-5 md:p-6 flex flex-col border border-white/40 dark:border-slate-800/40"
        >
          <div className="mb-2">
            <h3 className="font-semibold text-warm-900 dark:text-cream-50 text-base">Voice Call Outcomes</h3>
            <p className="text-xs text-warm-400">AI outbound dialer performance statistics.</p>
          </div>

          <div className="relative flex-1 flex flex-col items-center justify-center min-h-[220px]">
            {/* Chart + Label Overlay */}
            <div className="relative h-44 w-44 flex items-center justify-center shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={voiceOutcomeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {voiceOutcomeData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-bold text-warm-900 dark:text-cream-50">
                  {metrics.overview.totalCalls}
                </span>
                <span className="text-[9px] uppercase tracking-wider text-warm-400 font-medium">calls</span>
              </div>
            </div>

            {/* Custom Legend underneath */}
            <div className="w-full grid grid-cols-4 gap-1.5 mt-4 text-[10px] shrink-0">
              {voiceOutcomeData.map((item, idx) => {
                const total = metrics.overview.totalCalls;
                const percent = total > 0 ? Math.round((item.value / total) * 100) : 0;
                return (
                  <div key={idx} className="flex flex-col items-center p-1.5 bg-cream-50/40 dark:bg-white/5 rounded-xl text-center">
                    <div className="flex items-center gap-1 justify-center mb-0.5 w-full">
                      <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-[9px] text-warm-500 font-medium truncate max-w-full">{item.name}</span>
                    </div>
                    <div className="text-xs font-bold text-warm-900 dark:text-cream-50">
                      {item.value} <span className="text-[8px] font-normal text-warm-400">({percent}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>

      </div>

      {/* ── SECTION 4: SPLIT LAYOUT (PARTICIPANTS & RECENT FEED) ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top Participants List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-2xl p-5 md:p-6 flex flex-col border border-white/40 dark:border-slate-800/40"
        >
          <div className="mb-4">
            <h3 className="font-semibold text-warm-900 dark:text-cream-50 text-lg">Most Active Participants</h3>
            <p className="text-xs text-warm-400">By total scheduled meeting invitations.</p>
          </div>

          <div className="flex-1 flex flex-col justify-start">
            {metrics.topParticipants.length === 0 ? (
              <p className="text-sm italic text-warm-400 py-6 text-center">No meeting data yet</p>
            ) : (
              <div className="divide-y divide-warm-100 dark:divide-slate-800">
                {metrics.topParticipants.map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-warm-400 font-bold w-4 shrink-0">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <Avatar className="h-8 w-8 shrink-0 shadow-glass">
                        <AvatarFallback className="indigo-gradient text-white text-xs font-semibold">
                          {getInitials(p.name, p.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-warm-900 dark:text-cream-50 truncate">
                          {p.name || 'Unknown User'}
                        </p>
                        <p className="text-[10px] text-warm-400 truncate">{p.email}</p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400">
                        {p.meetingCount} {p.meetingCount === 1 ? 'meeting' : 'meetings'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Recent Activity Feed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-2xl p-5 md:p-6 flex flex-col border border-white/40 dark:border-slate-800/40"
        >
          <div className="mb-4">
            <h3 className="font-semibold text-warm-900 dark:text-cream-50 text-lg">Recent Activity</h3>
            <p className="text-xs text-warm-400">Latest orchestration agent transactions.</p>
          </div>

          <div className="flex-1 flex flex-col justify-start">
            {metrics.recentActivity.length === 0 ? (
              <p className="text-sm italic text-warm-400 py-6 text-center">No recent activity</p>
            ) : (
              <div className="divide-y divide-warm-100 dark:divide-slate-800 max-h-[300px] overflow-y-auto pr-1">
                {metrics.recentActivity.map((item, idx) => (
                  <div key={idx} className="flex gap-3 py-2.5 first:pt-0 last:pb-0">
                    {/* Activity Icon */}
                    <div className="shrink-0 mt-0.5">
                      {item.type === 'meeting' ? (
                        <div className="h-7 w-7 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                          <Calendar className="h-4 w-4" />
                        </div>
                      ) : item.type === 'voice' ? (
                        <div className="h-7 w-7 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-500 flex items-center justify-center">
                          <Phone className="h-4 w-4" />
                        </div>
                      ) : (
                        <div className="h-7 w-7 rounded-lg bg-purple-50 dark:bg-purple-500/10 text-purple-500 flex items-center justify-center">
                          <MessageSquare className="h-4 w-4" />
                        </div>
                      )}
                    </div>

                    {/* Activity details */}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-warm-700 dark:text-cream-100 line-clamp-2">
                        {item.description}
                      </p>
                      <span className="text-[9px] text-warm-400 dark:text-warm-500">
                        {formatFns(parseISO(item.date), 'MMM d, h:mm a')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

      </div>

    </div>
  );
}
