import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Phone,
  CalendarCheck,
  Search,
  Calendar,
  Clock,
  Pencil,
  Check,
  X,
  UserX,
} from 'lucide-react';
import { format, isThisMonth, parseISO } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { PressButton } from '@/components/ui/PressButton';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import type { Meeting } from '@/types/meeting';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Contact {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string | null;
  role: string;
  avatarUrl?: string | null;
}

type FilterKey = 'all' | 'voice-ready' | 'no-phone';

// ── Helpers ────────────────────────────────────────────────────────────────────

function getInitials(name: string | null | undefined): string {
  if (!name) return 'U';
  return (
    name
      .split(' ')
      .map((n) => n[0] ?? '')
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U'
  );
}

const PHONE_RE = /^\+\d{10,15}$/;

function validatePhone(raw: string): string | null {
  const stripped = raw.replace(/\s+/g, '');
  if (!PHONE_RE.test(stripped)) return null;
  return stripped;
}

// ── Stat card ──────────────────────────────────────────────────────────────────

function StatCard({
  value,
  label,
  subtext,
  icon,
  iconBg,
}: {
  value: number;
  label: string;
  subtext?: string;
  icon: React.ReactNode;
  iconBg: string;
}) {
  return (
    <div className="glass-card p-4 rounded-xl flex items-center gap-3">
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-warm-900">{value}</p>
        <p className="text-xs text-warm-500 mt-0.5">{label}</p>
        {subtext && <p className="text-[10px] text-warm-400 mt-0.5">{subtext}</p>}
      </div>
    </div>
  );
}

// ── Skeleton card ──────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="glass-card p-5 rounded-2xl space-y-4 animate-pulse">
      <div className="flex flex-col items-center gap-2">
        <Skeleton className="h-16 w-16 rounded-full bg-warm-200/60" />
        <Skeleton className="h-4 w-28 bg-warm-200/60" />
        <Skeleton className="h-3 w-36 bg-warm-200/40" />
      </div>
      <div className="flex justify-between">
        <Skeleton className="h-8 w-16 rounded-lg bg-warm-200/40" />
        <Skeleton className="h-8 w-16 rounded-lg bg-warm-200/40" />
        <Skeleton className="h-8 w-16 rounded-lg bg-warm-200/40" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-7 flex-1 rounded-lg bg-warm-200/40" />
        <Skeleton className="h-7 w-7 rounded-lg bg-warm-200/40" />
      </div>
    </div>
  );
}

// ── Inline phone editor ────────────────────────────────────────────────────────

function PhoneEditor({
  contactId,
  initial,
  onSaved,
  onCancel,
}: {
  contactId: string;
  initial: string;
  onSaved: (phone: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    const cleaned = validatePhone(value);
    if (!cleaned) {
      setError('Must start with + and have 10–15 digits');
      return;
    }
    setSaving(true);
    try {
      await api.patch(`/users/${contactId}`, { phoneNumber: cleaned });
      toast({ title: 'Phone number saved', variant: 'default' });
      onSaved(cleaned);
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-2">
      <div className="flex items-center gap-1.5">
        <input
          type="tel"
          value={value}
          onChange={(e) => { setValue(e.target.value); setError(''); }}
          placeholder="+91xxxxxxxxxx"
          className="flex-1 h-8 px-2 text-sm rounded-lg border border-warm-200 bg-white/80 text-warm-900 placeholder:text-warm-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition-all"
          autoFocus
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onCancel(); }}
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="h-8 w-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center transition-colors disabled:opacity-50"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onCancel}
          className="h-8 w-8 rounded-lg bg-warm-100 border border-warm-200 text-warm-500 hover:bg-warm-200 flex items-center justify-center transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {error && <p className="text-[10px] text-red-500 mt-1">{error}</p>}
    </div>
  );
}

// ── Contact card ───────────────────────────────────────────────────────────────

function ContactCard({
  contact,
  meetings,
  onPhoneUpdated,
}: {
  contact: Contact;
  meetings: Meeting[];
  onPhoneUpdated: (id: string, phone: string) => void;
}) {
  const navigate = useNavigate();
  const [editingPhone, setEditingPhone] = useState(false);

  // Meetings involving this contact
  const myMeetings = useMemo(
    () => meetings.filter((m) => (m.participants ?? []).some((p) => p.userId === contact.id)),
    [meetings, contact.id],
  );

  const lastMeeting = useMemo(() => {
    if (myMeetings.length === 0) return null;
    return myMeetings.reduce((a, b) =>
      new Date(a.startTime) > new Date(b.startTime) ? a : b,
    );
  }, [myMeetings]);

  const lastMeetingLabel = lastMeeting
    ? format(parseISO(lastMeeting.startTime), 'MMM d')
    : 'Never';

  const isVoiceReady = !!contact.phoneNumber;

  const handleViewMeetings = () => {
    navigate(`/dashboard/meetings?participant=${contact.id}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.2 }}
      className="glass-card p-5 rounded-2xl flex flex-col gap-4 hover:shadow-glass-md transition-shadow duration-200"
    >
      {/* Avatar + name + email */}
      <div className="flex flex-col items-center text-center gap-2">
        <div className="h-16 w-16 rounded-full indigo-gradient flex items-center justify-center shadow-glass shrink-0">
          <span className="text-xl font-bold text-white">{getInitials(contact.name)}</span>
        </div>
        <div>
          <p className="font-semibold text-warm-900 text-base leading-tight">{contact.name || 'Unnamed'}</p>
          <p className="text-sm text-warm-500 truncate max-w-[200px]">{contact.email}</p>
        </div>
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-3 gap-1 text-center">
        <div className="flex flex-col items-center gap-0.5 py-2 rounded-xl bg-indigo-50/60">
          <Calendar className="h-3.5 w-3.5 text-indigo-400" />
          <span className="text-sm font-bold text-warm-900">{myMeetings.length}</span>
          <span className="text-[9px] text-warm-500">Meetings</span>
        </div>
        <div className="flex flex-col items-center gap-0.5 py-2 rounded-xl bg-warm-100/60">
          <Clock className="h-3.5 w-3.5 text-warm-400" />
          <span className="text-[11px] font-semibold text-warm-800 leading-tight">{lastMeetingLabel}</span>
          <span className="text-[9px] text-warm-500">Last met</span>
        </div>
        <div className="flex flex-col items-center gap-0.5 py-2 rounded-xl bg-warm-100/60">
          {isVoiceReady ? (
            <>
              <div className="h-2 w-2 rounded-full bg-emerald-400 mt-0.5" />
              <span className="text-[10px] font-semibold text-emerald-600">Ready</span>
              <span className="text-[9px] text-warm-500">Voice</span>
            </>
          ) : (
            <>
              <div className="h-2 w-2 rounded-full bg-amber-400 mt-0.5" />
              <span className="text-[10px] font-semibold text-amber-600">Setup</span>
              <span className="text-[9px] text-warm-500">Phone</span>
            </>
          )}
        </div>
      </div>

      {/* Phone section */}
      <div>
        {editingPhone ? (
          <PhoneEditor
            contactId={contact.id}
            initial={contact.phoneNumber ?? ''}
            onSaved={(phone) => {
              onPhoneUpdated(contact.id, phone);
              setEditingPhone(false);
            }}
            onCancel={() => setEditingPhone(false)}
          />
        ) : contact.phoneNumber ? (
          <div className="flex items-center gap-2 text-warm-600 text-sm">
            <Phone className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <span className="truncate">{contact.phoneNumber}</span>
          </div>
        ) : (
          <button
            onClick={() => setEditingPhone(true)}
            className="text-sm text-amber-500 underline underline-offset-2 hover:text-amber-600 transition-colors"
          >
            Add phone number
          </button>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 mt-auto">
        <button
          onClick={handleViewMeetings}
          className="flex-1 h-8 rounded-lg border border-indigo-200 text-indigo-500 text-xs font-medium hover:bg-indigo-50 transition-colors"
        >
          View meetings
        </button>
        <button
          onClick={() => setEditingPhone(true)}
          className="h-8 w-8 rounded-lg border border-warm-200 text-warm-500 hover:bg-warm-100 transition-colors flex items-center justify-center"
          title="Edit phone number"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

// ── Add Contact modal ──────────────────────────────────────────────────────────

function AddContactModal({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const reset = () => { setName(''); setEmail(''); setPhone(''); setError(''); };

  useEffect(() => { if (!open) reset(); }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) { setError('Name is required.'); return; }
    if (!/^\S+@\S+\.\S+$/.test(email)) { setError('Please enter a valid email.'); return; }
    if (phone.trim() && !validatePhone(phone)) {
      setError('Phone must start with + and have 10–15 digits.');
      return;
    }

    setSubmitting(true);
    try {
      const password = crypto.randomUUID();
      await api.post('/auth/register', {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role: 'USER',
        phoneNumber: phone.trim() ? validatePhone(phone) : undefined,
      });
      toast({ title: 'Contact added successfully', variant: 'default' });
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message ?? 'Failed to add contact.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] bg-white border-warm-200">
        <DialogHeader>
          <DialogTitle className="text-warm-900">Add Contact</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-warm-700">Full Name *</Label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              required
              className="w-full h-9 px-3 rounded-xl bg-white/80 border border-warm-200 text-sm text-warm-900 placeholder:text-warm-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-warm-700">Email *</Label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
              required
              className="w-full h-9 px-3 rounded-xl bg-white/80 border border-warm-200 text-sm text-warm-900 placeholder:text-warm-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-warm-700">Phone Number</Label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91xxxxxxxxxx"
              className="w-full h-9 px-3 rounded-xl bg-white/80 border border-warm-200 text-sm text-warm-900 placeholder:text-warm-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition-all"
            />
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-[11px] text-amber-700 leading-relaxed">
              Adding a phone number allows Exora to call this contact before meetings for voice confirmation.
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-9 px-4 rounded-xl border border-warm-200 text-sm text-warm-600 hover:bg-warm-100 transition-colors"
            >
              Cancel
            </button>
            <PressButton type="submit" variant="primary" size="sm" disabled={submitting}>
              {submitting ? 'Adding…' : 'Add Contact'}
            </PressButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────────

function EmptyState({
  search,
  onAdd,
}: {
  search: string;
  onAdd: () => void;
}) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
      <UserX className="h-16 w-16 text-warm-300 mb-5" />
      {search ? (
        <>
          <h3 className="text-base font-semibold text-warm-700 mb-2">No contacts found</h3>
          <p className="text-sm text-warm-500 max-w-xs">No contacts match "{search}". Try a different name or email.</p>
        </>
      ) : (
        <>
          <h3 className="text-base font-semibold text-warm-700 mb-2">No contacts yet</h3>
          <p className="text-sm text-warm-500 max-w-xs mb-6">
            Contacts are added automatically when you schedule meetings, or you can add them manually.
          </p>
          <PressButton variant="primary" size="md" onClick={onAdd}>
            + Add Contact
          </PressButton>
        </>
      )}
    </div>
  );
}

// ── Main ContactsPage ──────────────────────────────────────────────────────────

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [modalOpen, setModalOpen] = useState(false);

  // ── Fetch data ──────────────────────────────────────────────────────────────

  const fetchContacts = useCallback(async () => {
    try {
      const [usersRes, meetingsRes] = await Promise.all([
        api.get<{ data: Contact[] }>('/users'),
        api.get<{ data: Meeting[] }>('/meetings'),
      ]);
      setContacts(usersRes.data.data ?? []);
      setMeetings(meetingsRes.data.data ?? []);
    } catch {
      // silently handle; 401 handled by interceptor
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  // ── Stats ───────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const userContacts = contacts.filter((c) => c.role === 'USER' || !c.role);
    const withPhone = userContacts.filter((c) => !!c.phoneNumber);
    const activeThisMonth = userContacts.filter((c) =>
      meetings.some(
        (m) =>
          (m.participants ?? []).some((p) => p.userId === c.id) &&
          isThisMonth(parseISO(m.startTime)),
      ),
    );
    return {
      total: userContacts.length,
      voiceReady: withPhone.length,
      activeThisMonth: activeThisMonth.length,
    };
  }, [contacts, meetings]);

  // ── Phone update ────────────────────────────────────────────────────────────

  const handlePhoneUpdated = useCallback((id: string, phone: string) => {
    setContacts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, phoneNumber: phone } : c)),
    );
  }, []);

  // ── Filtered contacts ───────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let result = contacts.filter((c) => c.role === 'USER' || !c.role);

    switch (activeFilter) {
      case 'voice-ready':
        result = result.filter((c) => !!c.phoneNumber);
        break;
      case 'no-phone':
        result = result.filter((c) => !c.phoneNumber);
        break;
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          (c.name ?? '').toLowerCase().includes(q) ||
          (c.email ?? '').toLowerCase().includes(q),
      );
    }

    return result;
  }, [contacts, activeFilter, search]);

  const filters: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'voice-ready', label: 'Voice-ready' },
    { key: 'no-phone', label: 'No phone' },
  ];

  return (
    <div className="flex flex-col h-full gap-5 overflow-y-auto p-5">
      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-warm-900">Contacts</h1>
          <p className="text-sm text-warm-500 mt-0.5">Everyone you've scheduled meetings with</p>
        </div>
        <PressButton variant="primary" size="sm" onClick={() => setModalOpen(true)}>
          + Add Contact
        </PressButton>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
        <StatCard
          value={stats.total}
          label="Total contacts"
          icon={<Users className="h-5 w-5 text-indigo-500" />}
          iconBg="bg-indigo-50"
        />
        <StatCard
          value={stats.voiceReady}
          label="Voice-ready"
          subtext="Can receive AI calls"
          icon={<Phone className="h-5 w-5 text-emerald-500" />}
          iconBg="bg-emerald-50"
        />
        <StatCard
          value={stats.activeThisMonth}
          label="Active this month"
          icon={<CalendarCheck className="h-5 w-5 text-amber-500" />}
          iconBg="bg-amber-50"
        />
      </div>

      {/* ── Search + filter bar ── */}
      <div className="glass-panel rounded-xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-warm-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-9 pr-3 h-9 rounded-xl bg-white/80 border border-warm-200 text-sm text-warm-900 placeholder:text-warm-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition-all"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto">
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
      </div>

      {/* ── Contact grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 flex-1">
        {loading ? (
          <>
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </>
        ) : filtered.length === 0 ? (
          <EmptyState search={search} onAdd={() => setModalOpen(true)} />
        ) : (
          <AnimatePresence initial={false}>
            {filtered.map((contact, i) => (
              <motion.div
                key={contact.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, delay: i * 0.03 }}
              >
                <ContactCard
                  contact={contact}
                  meetings={meetings}
                  onPhoneUpdated={handlePhoneUpdated}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* ── Add Contact Modal ── */}
      <AddContactModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={fetchContacts}
      />
    </div>
  );
}
