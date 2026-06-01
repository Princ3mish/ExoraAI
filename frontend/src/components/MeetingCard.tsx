import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { Clock, Users, Mic, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Meeting, VoiceCallStatus, ConfirmationStatus, ParticipantStatus } from '@/types/meeting';

// ── Badge helpers ────────────────────────────────────────────────────────────

const voiceVariant: Record<string, { label: string; className: string }> = {
  pending:          { label: 'Pending',     className: 'bg-amber-50 text-amber-600 border-amber-200' },
  in_progress:      { label: 'In Progress', className: 'bg-blue-50 text-blue-600 border-blue-200' },
  initiated:        { label: 'Initiated',   className: 'bg-blue-50 text-blue-500 border-blue-200' },
  completed:        { label: 'Completed',   className: 'bg-green-50 text-green-700 border-green-200' },
  failed:           { label: 'Failed',      className: 'bg-red-50 text-red-600 border-red-200' },
  no_answer:        { label: 'No Answer',   className: 'bg-warm-100 text-warm-500 border-warm-300' },
  skipped_no_phone: { label: 'Skipped',     className: 'bg-warm-100 text-warm-400 border-warm-200' },
  test_initiated:   { label: 'Test Call',   className: 'bg-indigo-50 text-indigo-500 border-indigo-200' },
};

const confirmVariant: Record<string, { label: string; className: string }> = {
  unconfirmed: { label: 'Unconfirmed', className: 'bg-amber-50 text-amber-600 border-amber-200' },
  confirmed:   { label: 'Confirmed',   className: 'bg-green-50 text-green-700 border-green-200' },
  rescheduled: { label: 'Rescheduled', className: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
};

const participantDot: Record<string, string> = {
  ACCEPTED:  'bg-green-400',
  confirmed: 'bg-green-400',
  PENDING:   'bg-amber-400',
  pending:   'bg-amber-400',
  REJECTED:  'bg-red-400',
  declined:  'bg-red-400',
};

// Left border color based on confirmation status
const leftBorderColor: Record<string, string> = {
  confirmed:   'border-l-green-400',
  unconfirmed: 'border-l-amber-400',
  rescheduled: 'border-l-indigo-500',
};

// Safe fallback getters — never crash on unknown backend values
const getVoiceVariant = (status: string) =>
  voiceVariant[status] ?? { label: status ?? 'Unknown', className: 'bg-warm-100 text-warm-500 border-warm-200' };

const getConfirmVariant = (status: string) =>
  confirmVariant[status] ?? { label: status ?? 'Unknown', className: 'bg-warm-100 text-warm-500 border-warm-200' };

const getLeftBorder = (status: string) =>
  leftBorderColor[status] ?? 'border-l-warm-300';

const getParticipantDot = (status: string) =>
  participantDot[status] ?? 'bg-warm-300';


// ── Component ────────────────────────────────────────────────────────────────

interface MeetingCardProps {
  meeting: Meeting;
  index?: number;
}

export function MeetingCard({ meeting, index = 0 }: MeetingCardProps) {
  const voice = getVoiceVariant(meeting.voiceCallStatus);
  const confirm = getConfirmVariant(meeting.confirmationStatus);
  const borderColor = getLeftBorder(meeting.confirmationStatus);

  const parsedTime = parseISO(meeting.startTime);
  const timeLabel = format(parsedTime, 'h:mm a');
  const dateLabel = format(parsedTime, 'EEE, MMM d');

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01, boxShadow: '0 12px 40px rgba(0, 0, 0, 0.10)' }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: 'easeOut' }}
    >
      <div className={`glass-card border-l-[3px] ${borderColor} overflow-hidden`}>
        {/* Header */}
        <div className="pb-2 pt-4 px-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-warm-900 dark:text-cream-50 truncate leading-tight">{meeting.title}</h3>
              <div className="flex items-center gap-1.5 mt-1 text-warm-500 text-xs">
                <Clock className="h-3 w-3 shrink-0" />
                <span>{dateLabel} · {timeLabel}</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 rounded-full ${voice.className}`}>
                <Mic className="h-2.5 w-2.5 mr-1" />
                {voice.label}
              </Badge>
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 rounded-full ${confirm.className}`}>
                {meeting.confirmationStatus === 'confirmed'
                  ? <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                  : meeting.confirmationStatus === 'rescheduled'
                    ? <AlertCircle className="h-2.5 w-2.5 mr-1" />
                    : <XCircle className="h-2.5 w-2.5 mr-1" />}
                {confirm.label}
              </Badge>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 pb-4 space-y-3">
          {/* Participants */}
          {meeting.participants.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-[11px] text-warm-500 mb-1.5">
                <Users className="h-3 w-3" />
                <span>Participants</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {meeting.participants.map((p) => (
                  <div key={p.userId} className="flex items-center gap-1 bg-cream-100 dark:bg-white/5 rounded-full px-2 py-0.5">
                    <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${getParticipantDot(p.status)}`} />
                    <span className="text-[11px] text-warm-700 dark:text-warm-300">{p.user?.name || p.user?.email || 'Unknown'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Agenda */}
          <div>
            <div className="text-[11px] text-warm-500 mb-1.5">Agenda</div>
            {meeting.agendaTopics.length > 0 ? (
              <ul className="space-y-0.5">
                {meeting.agendaTopics.map((topic, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[11px]">
                    <span className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 rounded-md px-1.5 py-0.5 leading-tight">{topic}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[11px] text-warm-500 italic">
                Agenda pending voice confirmation
              </p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
