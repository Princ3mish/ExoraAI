import { useEffect, useRef, useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { format } from 'date-fns';
import {
  CalendarDays,
  ListChecks,
  Users,
  LogOut,
  Moon,
  Send,
  Sun,
  ChevronLeft,
  ChevronRight,
  Menu,
  Activity,
  Settings,
  BarChart2,
  CheckCircle2,
  Loader2,
  Link,
  Zap,
  CreditCard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PressButton } from '@/components/ui/PressButton';
import { CalendarView } from '@/components/CalendarView';
import { ActivityPanel } from '@/components/ActivityPanel';
import { NotesPanel } from '@/components/NotesPanel';
import MeetingsPage from '@/pages/MeetingsPage';
import ContactsPage from '@/pages/ContactsPage';
import AnalyticsPage from '@/pages/AnalyticsPage';
import SettingsPage from '@/pages/SettingsPage';
import BillingPage from '@/pages/BillingPage';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/ui/Logo';
import { CreditsExhaustedModal } from '@/components/CreditsExhaustedModal';
import { OnboardingBanner } from '@/components/OnboardingBanner';


// ── Theme toggle ──────────────────────────────────────────────────────────────

function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const stored = localStorage.getItem('theme');
    return (stored === 'dark' ? 'dark' : 'light') as 'dark' | 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.classList.toggle('light', theme === 'light');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  return { theme, toggle };
}

// ── Layout Hook ───────────────────────────────────────────────────────────────

function useLayoutState() {
  const [isLeftOpen, setIsLeftOpen] = useState(() => localStorage.getItem('sidebar-left-open') !== 'false');
  const [isRightOpen, setIsRightOpen] = useState(() => localStorage.getItem('sidebar-right-open') !== 'false');
  const [isMobileLeftOpen, setIsMobileLeftOpen] = useState(false);
  const [isMobileRightOpen, setIsMobileRightOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('sidebar-left-open', isLeftOpen.toString());
  }, [isLeftOpen]);

  useEffect(() => {
    localStorage.setItem('sidebar-right-open', isRightOpen.toString());
  }, [isRightOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === '[') setIsLeftOpen((o) => !o);
      if (e.key === ']') setIsRightOpen((o) => !o);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    isLeftOpen, setIsLeftOpen,
    isRightOpen, setIsRightOpen,
    isMobileLeftOpen, setIsMobileLeftOpen,
    isMobileRightOpen, setIsMobileRightOpen,
  };
}

// ── Nav item ──────────────────────────────────────────────────────────────────

function NavItem({
  icon,
  label,
  path,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  path: string;
  onClick?: () => void;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const active = location.pathname === path || (path !== '/dashboard' && location.pathname.startsWith(path));

  const handleClick = () => {
    navigate(path);
    onClick?.();
  };

  return (
    <button
      onClick={handleClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all duration-150 border-l-2 text-left ${
        active
          ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500'
          : 'text-warm-500 dark:text-warm-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-500 border-transparent'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

// ── Credits Widget ────────────────────────────────────────────────────────────

function CreditsWidget({ credits, plan, usage }: {
  credits?: number;
  plan?: string;
  usage?: {
    meetingsThisMonth: number;
    meetingsLimit: number | null;
  };
}) {
  const isPro = plan === 'pro';
  const creditsNum = credits ?? 0;
  // Show progress bar up to 50 credits (default starting amount)
  const maxCredits = 50;
  const pct = Math.min((creditsNum / maxCredits) * 100, 100);
  const barColor = creditsNum <= 5 ? '#ef4444' : creditsNum <= 15 ? '#f59e0b' : '#6366f1';

  return (
    <div className="rounded-xl border border-white/20 dark:border-white/10 bg-white/30 dark:bg-white/5 p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-warm-700 dark:text-warm-300 flex items-center gap-1.5">
          <Zap className="h-3 w-3 text-indigo-500" />
          Credits
        </span>
        <span className="text-xs font-semibold" style={{ color: barColor }}>
          {isPro ? '∞' : creditsNum}
        </span>
      </div>
      {!isPro && (
        <div className="w-full h-1.5 rounded-full bg-warm-200/60 dark:bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: barColor }}
          />
        </div>
      )}
      <div className="flex items-center justify-between text-[10px] text-warm-500">
        <span>{isPro ? 'Pro Plan' : `${plan ?? 'free'} plan`}</span>
        {!isPro && usage && (
          <span>{usage.meetingsThisMonth}/{usage.meetingsLimit ?? '∞'} mtgs this mo.</span>
        )}
      </div>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

interface SidebarProps {
  userName: string;
  userEmail: string;
  telegramLinked?: boolean;
  credits?: number;
  plan?: string;
  usage?: {
    meetingsThisMonth: number;
    meetingsLimit: number | null;
  };
  onLogout: () => void;
  onTelegramLinked: () => void;
  theme: 'dark' | 'light';
  onThemeToggle: () => void;
  onNavClick?: () => void;
}

function Sidebar({ userName, userEmail, telegramLinked, credits, plan, usage, onLogout, onTelegramLinked, theme, onThemeToggle, onNavClick }: SidebarProps) {
  const initials = userName
    ? userName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : userEmail.slice(0, 2).toUpperCase();

  const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME ?? 'meetingagent_Exora_bot';

  const [connectLoading, setConnectLoading] = useState(false);
  const [connectSuccess, setConnectSuccess] = useState(false);
  const [webFallbackUrl, setWebFallbackUrl] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  // Clean up poll on unmount
  useEffect(() => () => stopPolling(), []);

  const handleConnect = async () => {
    if (connectLoading || telegramLinked || connectSuccess) return;
    setConnectLoading(true);
    try {
      const res = await api.get<{ data: { token: string; botUrl: string; botUrlWeb: string; expiresIn: number } }>('/auth/telegram-token');
      const { botUrl, botUrlWeb } = res.data.data;
      window.open(botUrl, '_blank');
      // Store web fallback so user can click it if tg:// handler is missing
      setWebFallbackUrl(botUrlWeb);

      // Start polling for link completion every 3 s
      pollRef.current = setInterval(async () => {
        try {
          const statusRes = await api.get<{ data: { linked: boolean } }>('/auth/telegram-status');
          if (statusRes.data.data.linked) {
            stopPolling();
            setConnectLoading(false);
            setConnectSuccess(true);
            setWebFallbackUrl(null);
            onTelegramLinked();
          }
        } catch {
          // ignore poll errors silently
        }
      }, 3000);
    } catch (err) {
      console.error('Failed to get Telegram token', err);
      setConnectLoading(false);
    }
  };

  return (
    <aside className="glass-sidebar flex flex-col w-60 shrink-0 h-full py-5 px-4 gap-4">
      {/* Logo */}
      <div className="px-1 mb-2">
        <Logo variant="full" size="md" />
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1">
        <NavItem
          icon={<CalendarDays className="h-4 w-4" />}
          label="Calendar"
          path="/dashboard"
          onClick={onNavClick}
        />
        <NavItem
          icon={<ListChecks className="h-4 w-4" />}
          label="Meetings"
          path="/dashboard/meetings"
          onClick={onNavClick}
        />
        <NavItem
          icon={<Users className="h-4 w-4" />}
          label="Contacts"
          path="/dashboard/contacts"
          onClick={onNavClick}
        />
        <NavItem
          icon={<BarChart2 className="h-4 w-4" />}
          label="Analytics"
          path="/dashboard/analytics"
          onClick={onNavClick}
        />
        <NavItem
          icon={<CreditCard className="h-4 w-4" />}
          label="Billing"
          path="/dashboard/billing"
          onClick={onNavClick}
        />
      </nav>

      <Separator className="bg-white/20 dark:bg-white/10" />

      {/* Telegram CTA */}
      <PressButton
        href={`https://t.me/${botUsername}`}
        variant="primary"
        size="md"
        className="w-full"
      >
        <span className="flex items-center justify-center gap-2">
          <Send className="h-4 w-4 shrink-0" />
          Open Telegram Bot
        </span>
      </PressButton>

      {/* Connect Telegram status / button */}
      {(telegramLinked || connectSuccess) ? (
        <div
          id="telegram-connected-indicator"
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20"
        >
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Telegram connected</span>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <button
            id="connect-telegram-btn"
            onClick={handleConnect}
            disabled={connectLoading}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border border-amber-300 dark:border-amber-500/40 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed w-full"
          >
            {connectLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                <span>Waiting for link…</span>
              </>
            ) : (
              <>
                <Link className="h-3.5 w-3.5 shrink-0" />
                <span>Connect Telegram →</span>
              </>
            )}
          </button>
          {/* Escape hatch: if tg:// handler not registered, open Telegram Web instead */}
          {connectLoading && webFallbackUrl && (
            <a
              id="telegram-web-fallback"
              href={webFallbackUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-center text-warm-500 hover:text-indigo-500 underline underline-offset-2 transition-colors px-1"
            >
              App not opening? Use Telegram Web ↗
            </a>
          )}
        </div>
      )}

      {/* Credits Widget */}
      <CreditsWidget credits={credits} plan={plan} usage={usage} />

      {/* Spacer */}
      <div className="flex-1" />

      <NavItem
        icon={<Settings className="h-4 w-4" />}
        label="Settings"
        path="/dashboard/settings"
        onClick={onNavClick}
      />

      {/* Theme toggle */}
      <button
        id="theme-toggle"
        onClick={onThemeToggle}
        className="flex items-center gap-2 text-xs text-warm-500 hover:text-warm-900 dark:hover:text-warm-300 transition-colors px-1 py-1"
      >
        {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        {theme === 'dark' ? 'Light mode' : 'Dark mode'}
      </button>

      <Separator className="bg-white/20 dark:bg-white/10" />

      {/* User info + logout */}
      <div className="flex items-center gap-2.5">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="indigo-gradient text-white text-xs font-semibold">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-warm-900 dark:text-cream-50 truncate">{userName || 'User'}</p>
          <p className="text-[10px] text-warm-500 truncate">{userEmail}</p>
        </div>
        <Button
          id="logout-button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-warm-500 hover:text-red-500 shrink-0"
          onClick={onLogout}
          title="Logout"
        >
          <LogOut className="h-3.5 w-3.5" />
        </Button>
      </div>
    </aside>
  );
}

// ── Top bar ───────────────────────────────────────────────────────────────────

function TopBar({ userName, onMobileMenu, onMobileActivity }: { userName: string; onMobileMenu: () => void; onMobileActivity: () => void }) {
  const location = useLocation();
  const isMeetings = location.pathname.startsWith('/dashboard/meetings');
  const now = new Date();

  return (
    <header className="flex items-center justify-between px-4 md:px-6 py-3.5 border-b border-white/40 bg-transparent backdrop-blur-sm shrink-0">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="md:hidden h-8 w-8 -ml-2 text-warm-500" onClick={onMobileMenu}>
          <Menu className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-sm font-semibold text-warm-900 dark:text-cream-50">
            {isMeetings ? 'Meetings' : `Good ${getGreeting()}, ${userName || 'there'} 👋`}
          </h1>
          <p className="text-xs text-warm-500 hidden sm:block">{format(now, "EEEE, MMMM d, yyyy '·' h:mm a")}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="md:hidden h-8 w-8 -mr-2 text-warm-500" onClick={onMobileActivity}>
           <div className="relative">
             <Activity className="h-4 w-4" />
             <div className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
           </div>
        </Button>
        <div className="hidden md:flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-warm-500">Live</span>
        </div>
      </div>
    </header>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

// ── Dashboard page ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user, logout, updateUser } = useAuth();
  const { theme, toggle } = useTheme();
  const layout = useLayoutState();

  // ── Onboarding banner state ───────────────────────────────────────────────
  const [bannerDismissed, setBannerDismissed] = useState(() => {
    const uid = user?.id ?? '';
    return localStorage.getItem(`onboarding_dismissed_${uid}`) === 'true';
  });
  const [contactsCount, setContactsCount] = useState(0);
  const [meetingsCount, setMeetingsCount] = useState(0);

  // Fetch counts once so OnboardingBanner can show accurate step status
  useEffect(() => {
    let active = true;
    const fetchCounts = async () => {
      try {
        const [contactsRes, meetingsRes] = await Promise.all([
          api.get<{ data: { contacts: unknown[] } }>('/contacts'),
          api.get<{ data: { meetings: unknown[] } }>('/meetings'),
        ]);
        if (active) {
          setContactsCount(contactsRes.data.data.contacts?.length ?? 0);
          setMeetingsCount(meetingsRes.data.data.meetings?.length ?? 0);
        }
      } catch {
        // Non-critical — banner just shows buttons as incomplete
      }
    };
    fetchCounts();
    return () => { active = false; };
  }, []);

  const handleTelegramLinked = () => {
    updateUser({ telegramLinked: true });
  };

  const handleBannerDismiss = () => {
    const uid = user?.id ?? '';
    setBannerDismissed(true);
    localStorage.setItem(`onboarding_dismissed_${uid}`, 'true');
  };

  // Show the onboarding banner for users who haven't dismissed and haven't done all steps
  const isOnboardingComplete =
    (user?.telegramLinked ?? false) && contactsCount > 0 && meetingsCount > 0;
  const showBanner = !bannerDismissed && !isOnboardingComplete;

  const userName = user?.name ?? '';
  const userEmail = user?.email ?? '';

  return (
    <div className={`flex h-screen w-screen overflow-hidden ${theme === 'dark' ? 'gradient-bg-dark' : 'gradient-bg'} text-warm-900 dark:text-cream-50`}>
      
      {/* ── Left Sidebar Panel (Desktop) ── */}
      <div className="hidden md:flex relative shrink-0 z-20 h-full">
        <motion.div
          animate={{ width: layout.isLeftOpen ? 240 : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="relative h-full"
        >
          <div className="absolute inset-0 overflow-hidden">
            <motion.div animate={{ opacity: layout.isLeftOpen ? 1 : 0 }} className="w-60 h-full">
              <Sidebar
                userName={userName}
                userEmail={userEmail}
                telegramLinked={user?.telegramLinked}
                credits={user?.credits}
                plan={user?.plan}
                usage={user?.usage ? { meetingsThisMonth: user.usage.meetingsThisMonth, meetingsLimit: user.usage.meetingsLimit } : undefined}
                onLogout={logout}
                onTelegramLinked={handleTelegramLinked}
                theme={theme}
                onThemeToggle={toggle}
              />
            </motion.div>
          </div>
        </motion.div>

        {/* Thin strip indicator */}
        <AnimatePresence>
          {!layout.isLeftOpen && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-y-0 left-0 w-1 bg-indigo-500/20 hover:bg-indigo-500/40 transition-colors cursor-pointer z-10 flex flex-col items-center pt-[22px]" 
              title="Open sidebar ["
              onClick={() => layout.setIsLeftOpen(true)}
            >
              <div className="absolute h-6 w-6 rounded indigo-gradient flex items-center justify-center left-0 overflow-hidden shadow-glass">
                <CalendarDays className="h-3.5 w-3.5 text-white" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toggle button */}
        <button
          onClick={() => layout.setIsLeftOpen(!layout.isLeftOpen)}
          className="absolute top-1/2 -translate-y-1/2 -right-3 z-30 h-6 w-6 rounded-full bg-white dark:bg-slate-800 border border-warm-300/40 shadow-card flex items-center justify-center text-warm-500 hover:text-indigo-500 transition-colors"
          title={layout.isLeftOpen ? "Close sidebar [" : "Open sidebar ["}
        >
          {layout.isLeftOpen ? <ChevronLeft className="h-3.5 w-3.5 ml-[-1px]" /> : <ChevronRight className="h-3.5 w-3.5 mr-[-1px]" />}
        </button>
      </div>

      {/* ── Main Content Area ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar 
          userName={userName} 
          onMobileMenu={() => layout.setIsMobileLeftOpen(true)}
          onMobileActivity={() => layout.setIsMobileRightOpen(true)}
        />

        <div className="flex flex-1 min-h-0 overflow-hidden relative">
          
          {/* Nested routes */}
          <main className="flex-1 min-w-0 overflow-hidden flex flex-col">
            {/* Onboarding banner — Phase S6 */}
            <AnimatePresence>
              {user && showBanner && (
                <OnboardingBanner
                  userId={user.id}
                  telegramLinked={user.telegramLinked ?? false}
                  contactsCount={contactsCount}
                  meetingsCount={meetingsCount}
                  onDismiss={handleBannerDismiss}
                  onTelegramLinked={handleTelegramLinked}
                />
              )}
            </AnimatePresence>

            <Routes>
              <Route index element={
                <div className="flex-1 min-w-0 overflow-hidden p-5 flex flex-col h-full">
                  <CalendarView />
                </div>
              } />
              <Route path="meetings" element={<MeetingsPage />} />
              <Route path="contacts" element={<ContactsPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="billing" element={<BillingPage />} />

            </Routes>
          </main>

          {/* ── Right Activity Panel (Desktop) — only on calendar view ── */}
          <div className="hidden lg:flex relative shrink-0 z-20 h-full">
            <motion.div
              animate={{ width: layout.isRightOpen ? 280 : 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="relative h-full"
            >
              <div className="absolute inset-0 overflow-hidden glass-panel">
                <motion.div animate={{ opacity: layout.isRightOpen ? 1 : 0 }} className="w-[280px] h-full p-4 flex flex-col">
                  <Tabs defaultValue="activity" className="flex flex-col h-full w-full">
                    <TabsList className="w-full grid grid-cols-2 mb-4 shrink-0 bg-cream-100/60 dark:bg-white/5">
                      <TabsTrigger value="activity" className="data-[state=active]:bg-white dark:data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400">Activity</TabsTrigger>
                      <TabsTrigger value="notes" className="data-[state=active]:bg-white dark:data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400">Notes</TabsTrigger>
                    </TabsList>
                    <TabsContent value="activity" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden">
                      <ActivityPanel />
                    </TabsContent>
                    <TabsContent value="notes" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden">
                      <NotesPanel />
                    </TabsContent>
                  </Tabs>
                </motion.div>
              </div>
            </motion.div>

            {/* Thin strip indicator */}
            <AnimatePresence>
              {!layout.isRightOpen && (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-y-0 right-0 w-1 bg-indigo-500/20 hover:bg-indigo-500/40 transition-colors cursor-pointer z-10 flex flex-col items-center pt-6" 
                  title="Open activity feed ]"
                  onClick={() => layout.setIsRightOpen(true)}
                >
                  <div className="absolute top-[26px] right-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Toggle button */}
            <button
              onClick={() => layout.setIsRightOpen(!layout.isRightOpen)}
              className="absolute top-1/2 -translate-y-1/2 -left-3 z-30 h-6 w-6 rounded-full bg-white dark:bg-slate-800 border border-warm-300/40 shadow-card flex items-center justify-center text-warm-500 hover:text-indigo-500 transition-colors"
              title={layout.isRightOpen ? "Close activity feed ]" : "Open activity feed ]"}
            >
              {layout.isRightOpen ? <ChevronRight className="h-3.5 w-3.5 mr-[-1px]" /> : <ChevronLeft className="h-3.5 w-3.5 ml-[-1px]" />}
            </button>
          </div>
          
        </div>
      </div>

      {/* ── Mobile Overlays ── */}
      
      {/* Mobile left sidebar drawer */}
      <AnimatePresence>
        {layout.isMobileLeftOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-warm-900/30 backdrop-blur-sm z-40 md:hidden cursor-pointer"
              onClick={() => layout.setIsMobileLeftOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-64 z-50 md:hidden shadow-glass-lg"
            >
              <Sidebar
                userName={userName}
                userEmail={userEmail}
                telegramLinked={user?.telegramLinked}
                credits={user?.credits}
                plan={user?.plan}
                usage={user?.usage ? { meetingsThisMonth: user.usage.meetingsThisMonth, meetingsLimit: user.usage.meetingsLimit } : undefined}
                onLogout={logout}
                onTelegramLinked={handleTelegramLinked}
                theme={theme}
                onThemeToggle={toggle}
                onNavClick={() => layout.setIsMobileLeftOpen(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile right activity sheet */}
      <AnimatePresence>
        {layout.isMobileRightOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-warm-900/30 backdrop-blur-sm z-40 lg:hidden cursor-pointer"
              onClick={() => layout.setIsMobileRightOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-x-0 bottom-0 h-[80vh] z-50 lg:hidden shadow-glass-lg rounded-t-2xl overflow-hidden flex flex-col glass-panel border-t border-white/20"
            >
               {/* Drag handle pill */}
               <div 
                 className="w-full flex justify-center py-3 shrink-0 cursor-pointer" 
                 onClick={() => layout.setIsMobileRightOpen(false)}
               >
                 <div className="w-12 h-1.5 rounded-full bg-warm-300/60" />
               </div>
               <div className="flex-1 overflow-hidden p-4 pt-0">
                  <Tabs defaultValue="activity" className="flex flex-col h-full w-full">
                    <TabsList className="w-full grid grid-cols-2 mb-4 shrink-0 bg-cream-100/60 dark:bg-white/5">
                      <TabsTrigger value="activity">Activity</TabsTrigger>
                      <TabsTrigger value="notes">Notes</TabsTrigger>
                    </TabsList>
                    <TabsContent value="activity" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden">
                      <ActivityPanel />
                    </TabsContent>
                    <TabsContent value="notes" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden">
                      <NotesPanel />
                    </TabsContent>
                  </Tabs>
               </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Credits Exhausted Modal — listens for global 'credits-exhausted' event */}
      <CreditsExhaustedModal />

    </div>
  );
}
