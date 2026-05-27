import { useState } from 'react';
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
  isSameDay,
  parseISO,
  format,
  getHours,
  getMinutes,
} from 'date-fns';
import { ChevronLeft, ChevronRight, CalendarDays, AlertTriangle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { PressButton } from '@/components/ui/PressButton';
import { Skeleton } from '@/components/ui/skeleton';
import { MeetingCard } from '@/components/MeetingCard';
import { NewMeetingModal } from '@/components/NewMeetingModal';
import { useCalendar } from '@/hooks/useCalendar';
import type { Meeting } from '@/types/meeting';

const HOUR_START = 8;
const HOUR_END = 20; // 8 pm

function TimeAxis() {
  const hours = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i);
  return (
    <div className="flex flex-col" style={{ paddingTop: '2.5rem' }}>
      {hours.map((h) => (
        <div
          key={h}
          className="text-[10px] text-slate-500 pr-2 text-right"
          style={{ height: '4rem' }}
        >
          {format(new Date().setHours(h, 0), 'h a')}
        </div>
      ))}
    </div>
  );
}

function meetingTopOffset(meeting: Meeting): number {
  const dt = parseISO(meeting.startTime);
  const hours = getHours(dt) - HOUR_START;
  const mins = getMinutes(dt);
  const pxPerHour = 64; // 4rem = 64px
  return Math.max(0, hours * pxPerHour + (mins / 60) * pxPerHour);
}

interface DayColumnProps {
  day: Date;
  meetings: Meeting[];
  isToday: boolean;
  onTimeSlotClick?: (day: Date, hour: number) => void;
}

function DayColumn({ day, meetings, isToday, onTimeSlotClick }: DayColumnProps) {
  const totalHeight = (HOUR_END - HOUR_START + 1) * 64;

  return (
    <div className="flex flex-col min-w-0 flex-1">
      {/* Day header */}
      <div
        className={`flex flex-col items-center pb-2 mb-1 border-b ${
          isToday ? 'border-blue-500/50' : 'border-slate-200 dark:border-slate-700/40'
        }`}
      >
        <span className="text-[10px] uppercase tracking-wider text-slate-500">
          {format(day, 'EEE')}
        </span>
        <span
          className={`text-sm font-semibold mt-0.5 h-6 w-6 flex items-center justify-center rounded-full ${
            isToday ? 'bg-blue-500 text-white' : 'text-slate-300 dark:text-slate-700 dark:text-slate-300'
          }`}
        >
          {format(day, 'd')}
        </span>
      </div>

      {/* Timeline */}
      <div className="relative" style={{ height: totalHeight }}>
        {/* Hour lines */}
        {Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => (
          <div
            key={i}
            className="absolute left-0 right-0 border-t border-slate-200 dark:border-slate-700/30 hover:bg-blue-500/10 cursor-pointer transition-colors z-10"
            style={{ top: i * 64, height: 64 }}
            onClick={() => onTimeSlotClick?.(day, HOUR_START + i)}
          />
        ))}

        {/* Meetings */}
        {meetings.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2 pt-8">
            <CalendarDays className="h-5 w-5 text-slate-300 dark:text-slate-700 mb-1.5" />
            <p className="text-[10px] text-slate-400 dark:text-slate-600 leading-snug">
              No meetings —<br />schedule via Telegram
            </p>
          </div>
        ) : (
          meetings.map((m, i) => (
            <div
              key={m.id}
              className="absolute left-1 right-1"
              style={{ top: meetingTopOffset(m) }}
            >
              <MeetingCard meeting={m} index={i} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function SkeletonDay() {
  return (
    <div className="flex flex-col flex-1 min-w-0">
      <div className="flex flex-col items-center pb-2 mb-1 border-b border-slate-200 dark:border-slate-700/40">
        <Skeleton className="h-3 w-8 bg-slate-200 dark:bg-slate-700/60 mb-1" />
        <Skeleton className="h-5 w-5 rounded-full bg-slate-200 dark:bg-slate-700/60" />
      </div>
      <div className="space-y-2 pt-2">
        {[1, 2].map((k) => (
          <Skeleton key={k} className="h-24 w-full rounded-lg bg-slate-200 dark:bg-slate-700/40" />
        ))}
      </div>
    </div>
  );
}

export function CalendarView() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalInitialDate, setModalInitialDate] = useState<Date | undefined>(undefined);
  const [modalInitialTime, setModalInitialTime] = useState<{hour: string, min: string, ampm: string} | undefined>(undefined);

  const today = new Date();
  const centerDate = addWeeks(today, weekOffset);

  const weekStart = startOfWeek(centerDate, { weekStartsOn: 1 }); // Mon
  const weekEnd = endOfWeek(centerDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const { meetings, loading, error, refetch } = useCalendar(centerDate, 7);

  const getMeetingsForDay = (day: Date) =>
    meetings.filter((m) => isSameDay(parseISO(m.startTime), day));

  return (
    <div className="flex flex-col h-full">
      {/* Week navigation header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {loading ? 'Refreshing…' : `${meetings.length} meeting${meetings.length !== 1 ? 's' : ''} this week`}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            id="cal-prev-week"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-400 dark:text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100"
            onClick={() => setWeekOffset((o) => o - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            id="cal-today"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-slate-400 dark:text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100"
            onClick={() => setWeekOffset(0)}
          >
            Today
          </Button>
          <Button
            id="cal-next-week"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-400 dark:text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100"
            onClick={() => setWeekOffset((o) => o + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <PressButton
            variant="primary"
            size="sm"
            className="ml-2"
            onClick={() => {
              setModalInitialDate(undefined);
              setModalInitialTime(undefined);
              setModalOpen(true);
            }}
          >
            + New Meeting
          </PressButton>
        </div>
      </div>

      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center justify-between gap-3 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2.5 mb-4 text-sm text-red-400"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
            <Button
              id="cal-retry"
              variant="ghost"
              size="sm"
              className="h-7 text-red-400 hover:text-red-300 gap-1.5"
              onClick={refetch}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Calendar grid — scrollable */}
      <div className="flex-1 overflow-y-auto">
        {/* Desktop: 7-column week view */}
        <div className="hidden md:flex gap-2">
          <TimeAxis />
          {loading
            ? days.map((d) => <SkeletonDay key={d.toISOString()} />)
            : days.map((day) => (
                <DayColumn
                  key={day.toISOString()}
                  day={day}
                  meetings={getMeetingsForDay(day)}
                  isToday={isSameDay(day, today)}
                  onTimeSlotClick={(d, h) => {
                    setModalInitialDate(d);
                    const ampm = h >= 12 ? 'PM' : 'AM';
                    let hour12 = h % 12;
                    if (hour12 === 0) hour12 = 12;
                    setModalInitialTime({ hour: String(hour12), min: '00', ampm });
                    setModalOpen(true);
                  }}
                />
              ))}
        </div>

        {/* Mobile: single-column stacked view */}
        <div className="md:hidden space-y-6">
          {loading
            ? [1, 2, 3].map((k) => <SkeletonDay key={k} />)
            : days.map((day) => (
                <div key={day.toISOString()}>
                  <div
                    className={`text-xs font-semibold mb-2 ${
                      isSameDay(day, today) ? 'text-blue-400' : 'text-slate-400 dark:text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {format(day, 'EEEE, MMMM d')}
                  </div>
                  {getMeetingsForDay(day).length === 0 ? (
                    <p className="text-xs text-slate-400 dark:text-slate-600 italic">
                      No meetings — schedule via Telegram
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {getMeetingsForDay(day).map((m, i) => (
                        <MeetingCard key={m.id} meeting={m} index={i} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
        </div>
      </div>

      <NewMeetingModal 
        open={modalOpen} 
        onOpenChange={setModalOpen} 
        onSuccess={refetch} 
        initialDate={modalInitialDate} 
        initialTime={modalInitialTime} 
      />
    </div>
  );
}
