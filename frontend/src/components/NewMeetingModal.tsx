import { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, isBefore, startOfDay, addHours, startOfHour } from 'date-fns';
import { CalendarIcon, X, CheckCircle2, Loader2, Search, Phone, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

const PHONE_RE = /^\+[1-9]\d{9,14}$/;

const formSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Max 100 characters'),
  date: z.date({ required_error: 'Date is required' }),
  timeHour: z.string(),
  timeMin: z.string(),
  timeAmPm: z.string(),
  durationMins: z.number(),
  participantIds: z.array(z.string()).min(1, 'At least 1 participant required'),
  description: z.string().max(500, 'Max 500 characters').optional(),
  enableVoiceCall: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

interface NewMeetingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  initialDate?: Date;
  initialTime?: { hour: string; min: string; ampm: string };
}

interface UserRes {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string | null;
}

/** Per-participant phone collection state */
interface PhoneState {
  /** The value in the inline input (before saving) */
  draft: string;
  /** Whether a save request is in-flight */
  saving: boolean;
  /** Error message from last save attempt */
  error?: string;
  /** Saved phone number (set after successful PATCH) */
  saved?: string;
}

export function NewMeetingModal({ open, onOpenChange, onSuccess, initialDate, initialTime }: NewMeetingModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successState, setSuccessState] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserRes[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserRes[]>([]);
  /**
   * phoneStates tracks inline phone-collection state for participants that are
   * missing a phone number. Key = user.id.
   */
  const [phoneStates, setPhoneStates] = useState<Record<string, PhoneState>>({});
  const { toast } = useToast();

  const now = new Date();
  const nextHour = startOfHour(addHours(now, 1));
  const defaultHour = format(nextHour, 'h');
  const defaultAmPm = format(nextHour, 'a');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      date: initialDate || addHours(now, 24),
      timeHour: initialTime?.hour || defaultHour,
      timeMin: initialTime?.min || '00',
      timeAmPm: initialTime?.ampm || defaultAmPm,
      durationMins: 30,
      participantIds: [],
      description: '',
      enableVoiceCall: true,
    },
  });

  const enableVoiceCall = form.watch('enableVoiceCall');

  useEffect(() => {
    if (open) {
      if (initialDate) form.setValue('date', initialDate);
      if (initialTime) {
        form.setValue('timeHour', initialTime.hour);
        form.setValue('timeMin', initialTime.min);
        form.setValue('timeAmPm', initialTime.ampm);
      }
    } else {
      form.reset();
      setSelectedUsers([]);
      setSearchQuery('');
      setSuccessState(false);
      setSearchResults([]);
      setPhoneStates({});
    }
  }, [open, initialDate, initialTime, form]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim().length > 0) {
        try {
          const res = await api.get(`/users?search=${encodeURIComponent(searchQuery)}`);
          if (res.data?.data) {
            setSearchResults(res.data.data as UserRes[]);
          }
        } catch (e) {
          console.error(e);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  /** Determine the effective phone number for a participant (saved > db > null) */
  const effectivePhone = (user: UserRes): string | null => {
    const saved = phoneStates[user.id]?.saved;
    if (saved) return saved;
    return user.phoneNumber || null;
  };

  const isVoiceReady = (user: UserRes) => Boolean(effectivePhone(user));

  const toggleUser = (user: UserRes) => {
    if (selectedUsers.some(u => u.id === user.id)) return;
    const newSelected = [...selectedUsers, user];
    setSelectedUsers(newSelected);
    form.setValue('participantIds', newSelected.map(u => u.id), { shouldValidate: true });
    setSearchQuery('');
    setSearchResults([]);

    // If participant has no phone, initialise their phone state
    if (!user.phoneNumber) {
      setPhoneStates(prev => ({
        ...prev,
        [user.id]: { draft: '', saving: false },
      }));
    }
  };

  const removeUser = (id: string) => {
    const newSelected = selectedUsers.filter(u => u.id !== id);
    setSelectedUsers(newSelected);
    form.setValue('participantIds', newSelected.map(u => u.id), { shouldValidate: true });
    setPhoneStates(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const updatePhoneDraft = (userId: string, value: string) => {
    setPhoneStates(prev => ({
      ...prev,
      [userId]: { ...(prev[userId] || { saving: false }), draft: value, error: undefined },
    }));
  };

  const savePhone = async (user: UserRes) => {
    const state = phoneStates[user.id];
    if (!state) return;

    const cleaned = state.draft.trim().replace(/\s+/g, '');
    if (!PHONE_RE.test(cleaned)) {
      setPhoneStates(prev => ({
        ...prev,
        [user.id]: { ...prev[user.id], error: 'Use international format, e.g. +91xxxxxxxxxx' },
      }));
      return;
    }

    setPhoneStates(prev => ({ ...prev, [user.id]: { ...prev[user.id], saving: true, error: undefined } }));
    try {
      await api.patch(`/users/${user.id}`, { phoneNumber: cleaned });
      setPhoneStates(prev => ({
        ...prev,
        [user.id]: { draft: cleaned, saving: false, saved: cleaned },
      }));
      // Clear any root error if it was about this participant
      form.clearErrors('root');
    } catch (e: any) {
      setPhoneStates(prev => ({
        ...prev,
        [user.id]: { ...prev[user.id], saving: false, error: e.response?.data?.message || 'Failed to save phone number.' },
      }));
    }
  };

  /** Participants missing a phone when voice call is on */
  const voiceMissingPhones = (): UserRes[] => {
    if (!enableVoiceCall) return [];
    return selectedUsers.filter(u => !isVoiceReady(u));
  };

  const onSubmit = async (data: FormValues) => {
    // Voice-call gate: block if any participant still missing phone
    if (data.enableVoiceCall) {
      const missing = voiceMissingPhones();
      if (missing.length > 0) {
        const names = missing.map(u => u.name || u.email).join(', ');
        form.setError('root', {
          message: `Voice confirmation is enabled but ${names} has no phone number. Add their number above or disable voice confirmation.`,
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      let h = parseInt(data.timeHour, 10);
      if (data.timeAmPm === 'PM' && h !== 12) h += 12;
      if (data.timeAmPm === 'AM' && h === 12) h = 0;

      const dt = new Date(data.date);
      dt.setHours(h, parseInt(data.timeMin, 10), 0, 0);

      await api.post('/meetings', {
        title: data.title,
        startTime: dt.toISOString(),
        endTime: new Date(dt.getTime() + data.durationMins * 60000).toISOString(),
        durationMins: data.durationMins,
        participantIds: data.participantIds,
        description: data.description,
        voiceCallStatus: data.enableVoiceCall ? 'pending' : 'skipped',
      });

      setSuccessState(true);
      toast({
        title: 'Meeting scheduled successfully',
        variant: 'default',
      });
      onSuccess();
      setTimeout(() => {
        onOpenChange(false);
      }, 2000);
    } catch (e: any) {
      console.error(e);
      form.setError('root', { message: e.response?.data?.message || 'Failed to schedule meeting.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const missingPhoneParticipants = voiceMissingPhones();
  const hasVoiceBlocker = enableVoiceCall && missingPhoneParticipants.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <AnimatePresence mode="wait">
          {successState ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center p-12 text-center h-[500px]"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.1 }}
                className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-4"
              >
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </motion.div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">Meeting scheduled!</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Participants will receive email invites shortly.
                {form.getValues('enableVoiceCall') && " They'll also receive a confirmation call 30 minutes before the meeting."}
              </p>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <DialogHeader className="p-6 pb-0">
                <DialogTitle className="text-xl">New Meeting</DialogTitle>
              </DialogHeader>

              <div className="p-6 overflow-y-auto max-h-[80vh]">
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  {form.formState.errors.root && (
                    <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200 dark:border-red-800">
                      {form.formState.errors.root.message}
                    </div>
                  )}

                  {/* ── Title ─────────────────────────────────────────────── */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Meeting Title</Label>
                    <Input placeholder="e.g. Product sync, 1:1 with Rahul" {...form.register('title')} />
                    {form.formState.errors.title && <p className="text-[10px] text-red-500">{form.formState.errors.title.message}</p>}
                  </div>

                  {/* ── Date + Time ───────────────────────────────────────── */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5 flex flex-col">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn('w-full justify-start text-left font-normal', !form.watch('date') && 'text-muted-foreground')}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {form.watch('date') ? format(form.watch('date'), 'PPP') : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 z-[100]">
                          <Calendar
                            mode="single"
                            selected={form.watch('date')}
                            onSelect={(d) => d && form.setValue('date', d, { shouldValidate: true })}
                            disabled={(date) => isBefore(startOfDay(date), startOfDay(new Date()))}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      {form.formState.errors.date && <p className="text-[10px] text-red-500">{form.formState.errors.date.message}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Time</Label>
                      <div className="flex gap-1.5">
                        <Select value={form.watch('timeHour')} onValueChange={v => form.setValue('timeHour', v)}>
                          <SelectTrigger className="w-[65px] px-2"><SelectValue /></SelectTrigger>
                          <SelectContent className="z-[100]">
                            {Array.from({ length: 12 }, (_, i) => String(i + 1)).map(h => (
                              <SelectItem key={h} value={h}>{h}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select value={form.watch('timeMin')} onValueChange={v => form.setValue('timeMin', v)}>
                          <SelectTrigger className="w-[65px] px-2"><SelectValue /></SelectTrigger>
                          <SelectContent className="z-[100]">
                            {['00', '15', '30', '45'].map(m => (
                              <SelectItem key={m} value={m}>{m}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select value={form.watch('timeAmPm')} onValueChange={v => form.setValue('timeAmPm', v)}>
                          <SelectTrigger className="w-[65px] px-2"><SelectValue /></SelectTrigger>
                          <SelectContent className="z-[100]">
                            <SelectItem value="AM">AM</SelectItem>
                            <SelectItem value="PM">PM</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* ── Duration ──────────────────────────────────────────── */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Duration</Label>
                    <Select value={String(form.watch('durationMins'))} onValueChange={v => form.setValue('durationMins', parseInt(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent className="z-[100]">
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="45">45 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="90">1.5 hours</SelectItem>
                        <SelectItem value="120">2 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* ── Participants ───────────────────────────────────────── */}
                  <div className="space-y-1.5 relative">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Participants</Label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Type a name or email to search..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      {searchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
                          {searchResults.map(u => (
                            <div
                              key={u.id}
                              className="px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer flex flex-col"
                              onClick={() => toggleUser(u)}
                            >
                              <span className="font-medium text-slate-900 dark:text-slate-100">{u.name || 'Unnamed'}</span>
                              <span className="text-xs text-slate-500 flex items-center gap-1">
                                {u.email}
                                {u.phoneNumber
                                  ? <span className="ml-1 text-emerald-600 font-medium">· ✓ voice-ready</span>
                                  : <span className="ml-1 text-amber-500 font-medium">· no phone</span>
                                }
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {form.formState.errors.participantIds && (
                      <p className="text-[10px] text-red-500">{form.formState.errors.participantIds.message}</p>
                    )}

                    {/* ── Chips ── */}
                    {selectedUsers.length > 0 && (
                      <div className="flex flex-col gap-2 pt-2">
                        {selectedUsers.map(u => {
                          const ready = isVoiceReady(u);
                          const ps = phoneStates[u.id];

                          return (
                            <div key={u.id} className="flex flex-col gap-1">
                              {/* Chip row */}
                              <div
                                className={cn(
                                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border self-start',
                                  ready
                                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                                    : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700',
                                )}
                              >
                                <span>{u.name || u.email}</span>
                                {ready ? (
                                  <Phone className="h-3 w-3 text-emerald-500" aria-label="Voice-ready" />
                                ) : (
                                  <AlertTriangle className="h-3 w-3 text-amber-500" aria-label="No phone" />
                                )}
                                <button
                                  type="button"
                                  onClick={() => removeUser(u.id)}
                                  className="hover:text-red-500 ml-0.5"
                                  aria-label={`Remove ${u.name || u.email}`}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>

                              {/* Phone collection — only when not yet voice-ready */}
                              <AnimatePresence>
                                {!ready && ps && !ps.saved && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="ml-1 mt-0.5 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 space-y-2">
                                      <p className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                        <span>
                                          <strong>{u.name || u.email}</strong> has no phone number. Add it so Exora can call them before the meeting.
                                        </span>
                                      </p>
                                      <div className="flex gap-2">
                                        <Input
                                          id={`phone-input-${u.id}`}
                                          value={ps.draft}
                                          onChange={(e) => updatePhoneDraft(u.id, e.target.value)}
                                          placeholder="+91xxxxxxxxxx"
                                          className="h-8 text-xs"
                                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), savePhone(u))}
                                        />
                                        <Button
                                          type="button"
                                          size="sm"
                                          className="h-8 text-xs shrink-0"
                                          disabled={ps.saving || !ps.draft.trim()}
                                          onClick={() => savePhone(u)}
                                        >
                                          {ps.saving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                                        </Button>
                                      </div>
                                      {ps.error && (
                                        <p className="text-[10px] text-red-500">{ps.error}</p>
                                      )}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>

                              {/* Voice-ready badge (appears after saving) */}
                              <AnimatePresence>
                                {ps?.saved && (
                                  <motion.p
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="ml-1 text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1"
                                  >
                                    <Phone className="h-3 w-3" /> ✓ Voice-ready ({ps.saved})
                                  </motion.p>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* ── Voice-call validation error ── */}
                    <AnimatePresence>
                      {hasVoiceBlocker && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-2 p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400 flex items-start gap-1.5">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                            <span>
                              Voice confirmation is enabled but{' '}
                              <strong>{missingPhoneParticipants.map(u => u.name || u.email).join(', ')}</strong>{' '}
                              {missingPhoneParticipants.length === 1 ? 'has' : 'have'} no phone number.
                              Add their number above or disable voice confirmation.
                            </span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* ── Description ───────────────────────────────────────── */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex justify-between">
                      <span>Description / Notes <span className="text-slate-400 font-normal">(optional)</span></span>
                      <span className="text-slate-400 font-normal">{form.watch('description')?.length || 0}/500</span>
                    </Label>
                    <Textarea
                      placeholder="What is this meeting about? Any context for participants?"
                      className="resize-none h-20"
                      maxLength={500}
                      {...form.register('description')}
                    />
                  </div>

                  {/* ── Voice call toggle ─────────────────────────────────── */}
                  <div className="flex items-center justify-between py-3 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex flex-col gap-0.5">
                      <Label className="text-sm font-medium text-slate-900 dark:text-slate-100">Voice confirmation call</Label>
                      <span className="text-xs text-slate-500">Call participants before meeting for confirmation</span>
                    </div>
                    <Switch
                      checked={enableVoiceCall}
                      onCheckedChange={(c) => {
                        form.setValue('enableVoiceCall', c);
                        // Clear root error when user disables voice calls
                        if (!c) form.clearErrors('root');
                      }}
                    />
                  </div>

                  {/* ── Submit ────────────────────────────────────────────── */}
                  <div className="pt-2 flex justify-end">
                    <Button
                      type="submit"
                      disabled={isSubmitting || hasVoiceBlocker}
                      className="w-full sm:w-auto"
                    >
                      {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Schedule Meeting
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
