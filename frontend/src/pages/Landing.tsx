import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PressButton } from '@/components/ui/PressButton';
import { Logo } from '@/components/ui/Logo';
import {
  MessageSquare,
  Phone,
  Mail,
  Brain,
  Calendar,
  Zap,
  Send,
  PhoneCall,
  CheckCircle,
} from 'lucide-react';

// ── Scroll-aware navbar hook ───────────────────────────────────────────────────

function useScrolled(threshold = 10) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);
  return scrolled;
}

// ── Smooth scroll util ─────────────────────────────────────────────────────────

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

// ── Navbar ─────────────────────────────────────────────────────────────────────

function Navbar() {
  const scrolled = useScrolled();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'glass-panel shadow-glass-md' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Logo variant="full" size="md" />

          {/* Center nav links — desktop */}
          <div className="hidden md:flex items-center gap-8">
            {[
              { label: 'Features', id: 'features' },
              { label: 'How it Works', id: 'how-it-works' },
              { label: 'Pricing', id: 'pricing' },
            ].map(({ label, id }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className="text-sm font-medium text-warm-700 hover:text-indigo-600 transition-colors duration-200"
              >
                {label}
              </button>
            ))}
          </div>

          {/* Right buttons — desktop */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-medium text-warm-700 hover:text-warm-900 transition-colors px-4 py-2 rounded-xl hover:bg-warm-100/60"
            >
              Log in
            </Link>
            <PressButton href="/register" variant="primary" size="sm">
              Get Started
            </PressButton>
          </div>

          {/* Hamburger — mobile */}
          <button
            className="md:hidden text-warm-700 p-2"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <div className="space-y-1.5">
              <span className={`block h-0.5 w-6 bg-current transition-transform duration-200 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
              <span className={`block h-0.5 w-6 bg-current transition-opacity duration-200 ${menuOpen ? 'opacity-0' : ''}`} />
              <span className={`block h-0.5 w-6 bg-current transition-transform duration-200 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
            </div>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden glass-card rounded-2xl p-4 mb-4 flex flex-col gap-3"
          >
            {[
              { label: 'Features', id: 'features' },
              { label: 'How it Works', id: 'how-it-works' },
              { label: 'Pricing', id: 'pricing' },
            ].map(({ label, id }) => (
              <button
                key={id}
                onClick={() => { scrollTo(id); setMenuOpen(false); }}
                className="text-sm font-medium text-warm-700 text-left py-2 px-3 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
              >
                {label}
              </button>
            ))}
            <div className="border-t border-warm-200 pt-3 flex flex-col gap-2">
              <Link to="/login" className="text-sm font-medium text-warm-700 py-2 px-3 rounded-xl hover:bg-warm-100">Log in</Link>
              <PressButton href="/register" variant="primary" size="sm" className="w-full">
                Get Started
              </PressButton>
            </div>
          </motion.div>
        )}
      </div>
    </nav>
  );
}

// ── Hero section ───────────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <section className="gradient-bg pt-24 pb-0 min-h-screen flex flex-col items-center justify-start overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex flex-col items-center">
        {/* Eyebrow badge */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.05 }}
          className="mt-12 mb-6"
        >
          <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-600 text-sm font-medium px-4 py-1.5 rounded-full border border-indigo-100 shadow-sm">
            ✦ AI-Powered Meeting Orchestration
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.15 }}
          className="text-5xl md:text-7xl font-bold text-warm-900 text-center leading-tight tracking-tight max-w-4xl"
        >
          Your meetings,{' '}
          <br />
          <span className="text-gradient">handled by AI.</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.25 }}
          className="mt-6 text-xl text-warm-500 text-center max-w-2xl leading-relaxed"
        >
          Exora AI schedules, confirms, and prepares your meetings automatically — via Telegram, voice calls, and email.
          You just show up.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.35 }}
          className="mt-10 flex flex-col sm:flex-row items-center gap-4"
        >
          <PressButton href="/register" variant="primary" size="lg">
            Start for free
          </PressButton>
          <PressButton onClick={() => scrollTo('how-it-works')} variant="secondary" size="lg">
            See how it works
          </PressButton>
        </motion.div>

        {/* Social proof */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.45 }}
          className="mt-5 text-sm text-warm-400"
        >
          Trusted by teams who hate scheduling back-and-forth
        </motion.p>

        {/* Hero visual — dashboard mockup */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut', delay: 0.55 }}
          className="relative mt-14 w-full max-w-4xl"
        >
          <div className="glass-card rounded-2xl shadow-glass-lg overflow-hidden border border-warm-200/50">
            {/* Mockup top bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-warm-100/80 bg-white/70">
              <div className="h-3 w-3 rounded-full bg-red-400" />
              <div className="h-3 w-3 rounded-full bg-yellow-400" />
              <div className="h-3 w-3 rounded-full bg-green-400" />
              <div className="flex-1 mx-4">
                <div className="bg-cream-100 rounded-md h-5 w-48 flex items-center px-2">
                  <span className="text-[10px] text-warm-400">app.exora.ai/dashboard</span>
                </div>
              </div>
            </div>

            {/* Mockup content */}
            <div className="p-5 bg-gradient-to-br from-cream-50/90 to-indigo-50/30">
              {/* Mini header */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <div className="text-xs font-semibold text-warm-900">Good morning, Sarah 👋</div>
                  <div className="text-[10px] text-warm-400 mt-0.5">Wednesday, May 21, 2026</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] text-warm-500 font-medium">Live</span>
                </div>
              </div>

              {/* Meeting cards */}
              <div className="space-y-3">
                <MockMeetingCard
                  color="bg-indigo-500"
                  time="10:00 AM"
                  title="Product Roadmap Review"
                  participants="Sarah K., James T., Priya M."
                  status="confirmed"
                  agenda="Q3 priorities · Launch timeline · Resource allocation"
                />
                <MockMeetingCard
                  color="bg-amber-500"
                  time="2:30 PM"
                  title="Design System Sync"
                  participants="Lisa B., Mark R."
                  status="pending"
                  agenda="Component library · Token updates"
                />
                <MockMeetingCard
                  color="bg-emerald-500"
                  time="4:00 PM"
                  title="Engineering Sprint Planning"
                  participants="Tom A., Dev Team"
                  status="confirmed"
                  agenda="Backlog grooming · Sprint goals · Blockers"
                />
              </div>
            </div>
          </div>

          {/* Gradient fade at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#F0EBE3] via-[#F0EBE3]/60 to-transparent pointer-events-none rounded-b-2xl" />
        </motion.div>
      </div>
    </section>
  );
}

function MockMeetingCard({
  color,
  time,
  title,
  participants,
  status,
  agenda,
}: {
  color: string;
  time: string;
  title: string;
  participants: string;
  status: 'confirmed' | 'pending';
  agenda: string;
}) {
  return (
    <div className="flex items-stretch gap-3 bg-white/70 rounded-xl border border-warm-100/80 p-3 shadow-sm">
      <div className={`w-1 rounded-full shrink-0 ${color}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-warm-900">{title}</p>
            <p className="text-[10px] text-warm-400 mt-0.5">{time} · {participants}</p>
          </div>
          <span
            className={`shrink-0 text-[9px] font-semibold px-2 py-0.5 rounded-full ${
              status === 'confirmed'
                ? 'bg-emerald-50 text-emerald-600'
                : 'bg-amber-50 text-amber-600'
            }`}
          >
            {status === 'confirmed' ? '✓ Confirmed' : '⏳ Pending'}
          </span>
        </div>
        <div className="mt-1.5 bg-indigo-50/60 rounded-lg px-2 py-1">
          <p className="text-[9px] text-indigo-600 font-medium">Agenda: {agenda}</p>
        </div>
      </div>
    </div>
  );
}

// ── Stats bar ──────────────────────────────────────────────────────────────────

function StatsSection() {
  const stats = [
    { value: '10x', label: 'Faster scheduling' },
    { value: 'Zero', label: 'Back-and-forth emails' },
    { value: '100%', label: 'Automated follow-ups' },
    { value: '30 min', label: 'Pre-meeting voice confirmation' },
  ];

  return (
    <section className="bg-cream-100 border-t border-b border-warm-200 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-0 md:divide-x md:divide-warm-200">
          {stats.map(({ value, label }) => (
            <div key={label} className="flex flex-col items-center text-center px-4">
              <span className="text-gradient text-3xl font-bold">{value}</span>
              <span className="mt-1.5 text-sm text-warm-500">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Features section ───────────────────────────────────────────────────────────

const features = [
  {
    icon: <MessageSquare className="h-5 w-5 text-indigo-500" />,
    iconBg: 'bg-indigo-100',
    title: 'Schedule via Telegram',
    description: 'Just tell the bot who you want to meet and when. It handles the rest.',
  },
  {
    icon: <Phone className="h-5 w-5 text-amber-600" />,
    iconBg: 'bg-amber-100',
    title: 'Voice confirmation calls',
    description: 'Exora calls participants 30 minutes before meetings to confirm attendance and collect agenda topics.',
  },
  {
    icon: <Mail className="h-5 w-5 text-emerald-600" />,
    iconBg: 'bg-green-100',
    title: 'Automatic email invites',
    description: 'Participants receive professional email invitations the moment a meeting is scheduled.',
  },
  {
    icon: <Brain className="h-5 w-5 text-purple-600" />,
    iconBg: 'bg-purple-100',
    title: 'AI agenda extraction',
    description: 'Spoken responses are transcribed and parsed by AI — agenda topics appear on your calendar automatically.',
  },
  {
    icon: <Calendar className="h-5 w-5 text-blue-600" />,
    iconBg: 'bg-blue-100',
    title: 'Smart calendar view',
    description: 'See all your meetings, confirmation status, and agenda topics in one clean timeline view.',
  },
  {
    icon: <Zap className="h-5 w-5 text-yellow-600" />,
    iconBg: 'bg-yellow-100',
    title: 'Works while you sleep',
    description: 'Cron jobs run every 5 minutes. Meetings are confirmed and prepared automatically, 24/7.',
  },
];

function FeaturesSection() {
  return (
    <section id="features" className="py-24 bg-white/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <span className="inline-block text-indigo-600 text-sm font-semibold tracking-wider uppercase mb-3">
            Everything automated
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-warm-900 leading-tight">
            One assistant.{' '}
            <span className="text-gradient">Every meeting task.</span>
          </h2>
          <p className="mt-4 text-lg text-warm-500 max-w-xl mx-auto">
            From the moment you decide to meet, Exora AI handles everything else.
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: 'easeOut' }}
              className="glass-card p-6 rounded-2xl hover:shadow-glass-md transition-all duration-300 group border border-warm-100/60"
            >
              <div className={`h-11 w-11 rounded-xl ${feature.iconBg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200`}>
                {feature.icon}
              </div>
              <h3 className="text-base font-semibold text-warm-900 mb-2">{feature.title}</h3>
              <p className="text-sm text-warm-500 leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── How it works ───────────────────────────────────────────────────────────────

const steps = [
  {
    number: '1',
    title: 'Message the bot',
    description: 'Open Telegram, tell Exora who you want to meet and when.',
    icon: <Send className="h-5 w-5 text-indigo-500" />,
  },
  {
    number: '2',
    title: 'Invites go out',
    description: 'Participants receive email invitations instantly. No back and forth.',
    icon: <Mail className="h-5 w-5 text-indigo-500" />,
  },
  {
    number: '3',
    title: 'AI calls to confirm',
    description: '30 minutes before the meeting, Exora calls each participant to confirm and collect agenda topics.',
    icon: <PhoneCall className="h-5 w-5 text-indigo-500" />,
  },
  {
    number: '4',
    title: 'You just show up',
    description: 'Open your calendar. See who\'s confirmed and what everyone wants to discuss.',
    icon: <CheckCircle className="h-5 w-5 text-indigo-500" />,
  },
];

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 gradient-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <span className="inline-block text-indigo-600 text-sm font-semibold tracking-wider uppercase mb-3">
            Simple by design
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-warm-900 leading-tight">
            From message to meeting{' '}
            <span className="text-gradient">in minutes.</span>
          </h2>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Dashed connector line — desktop */}
          <div className="hidden lg:block absolute top-10 left-[calc(12.5%+28px)] right-[calc(12.5%+28px)] h-px border-t-2 border-dashed border-warm-200 z-0" />

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 lg:gap-4 relative z-10">
            {steps.map((step, i) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.12, ease: 'easeOut' }}
                className="flex flex-col items-center text-center lg:px-2"
              >
                {/* Number badge */}
                <div className="h-14 w-14 rounded-full indigo-gradient flex items-center justify-center text-white font-bold text-lg shadow-glass-md mb-5 relative z-10">
                  {step.number}
                </div>
                {/* Icon */}
                <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center mb-4">
                  {step.icon}
                </div>
                <h3 className="text-base font-semibold text-warm-900 mb-2">{step.title}</h3>
                <p className="text-sm text-warm-500 leading-relaxed max-w-[220px]">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Pricing section ────────────────────────────────────────────────────────────

type FeatureItem = { text: string; included: boolean; badge?: string };

function FeatureRow({ feature }: { feature: FeatureItem }) {
  return (
    <li className="flex items-center gap-2.5 text-sm">
      {feature.included ? (
        <span className="h-5 w-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
          <svg className="h-3 w-3 text-emerald-600" fill="none" viewBox="0 0 12 12">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      ) : (
        <span className="h-5 w-5 rounded-full bg-warm-100 flex items-center justify-center shrink-0">
          <svg className="h-3 w-3 text-warm-300" fill="none" viewBox="0 0 12 12">
            <path d="M3 9l6-6M9 9L3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
      )}
      <span className={feature.included ? 'text-warm-700' : 'text-warm-300 line-through'}>
        {feature.text}
      </span>
      {feature.badge && (
        <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
          {feature.badge}
        </span>
      )}
    </li>
  );
}

const starterFeatures: FeatureItem[] = [
  { text: '10 meetings per month', included: true },
  { text: 'Telegram bot scheduling', included: true },
  { text: 'Email invitations', included: true },
  { text: 'Calendar view', included: true },
  { text: '5 contacts', included: true },
  { text: 'Voice confirmation calls', included: false },
  { text: 'Analytics', included: false },
  { text: 'Priority support', included: false },
];

const proFeatures: FeatureItem[] = [
  { text: 'Unlimited meetings', included: true },
  { text: 'Telegram bot scheduling', included: true },
  { text: 'Email invitations', included: true },
  { text: 'Calendar view', included: true },
  { text: 'Unlimited contacts', included: true },
  { text: 'Voice confirmation calls', included: true },
  { text: 'Analytics dashboard', included: true },
  { text: 'Priority support', included: true },
  { text: 'Custom meeting templates', included: true, badge: 'coming soon' },
];

const teamFeatures: FeatureItem[] = [
  { text: 'Everything in Pro', included: true },
  { text: '10 team members', included: true },
  { text: 'Shared calendar view', included: true },
  { text: 'Team analytics', included: true },
  { text: 'Admin controls', included: true },
  { text: 'API access', included: true },
  { text: 'Dedicated support', included: true },
  { text: 'Custom integrations', included: true },
];

const faqs = [
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. No contracts, no commitments. Cancel with one click.',
  },
  {
    q: 'What counts as a meeting?',
    a: 'Any meeting created via Telegram bot or manually through the dashboard.',
  },
  {
    q: 'Do voice calls cost extra?',
    a: 'Voice calls are included in Pro. Powered by Vapi AI.',
  },
];

function PricingSection() {
  return (
    <section id="pricing" className="py-24 bg-white/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <span className="inline-block text-indigo-600 text-sm font-semibold tracking-wider uppercase mb-3">
            Simple pricing
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-warm-900 leading-tight">
            Start free.{' '}
            <span className="text-gradient">Scale when ready.</span>
          </h2>
          <p className="mt-4 text-lg text-warm-500 max-w-xl mx-auto">
            No credit card required to get started. Upgrade when you need more.
          </p>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">

          {/* ── Starter ── */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0, ease: 'easeOut' }}
            className="glass-card rounded-2xl p-8 border border-warm-200 flex flex-col gap-6"
          >
            <div>
              <p className="text-sm font-semibold text-warm-500 mb-1">Starter</p>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-bold text-warm-900">$0</span>
                <span className="text-sm text-warm-400 mb-1">forever</span>
              </div>
              <p className="mt-3 text-sm text-warm-500 leading-relaxed">
                Perfect for individuals trying out AI meeting scheduling.
              </p>
            </div>
            <ul className="space-y-2.5 flex-1">
              {starterFeatures.map((f) => <FeatureRow key={f.text} feature={f} />)}
            </ul>
            <PressButton href="/register" variant="secondary" size="md" className="w-full">
              Get started free
            </PressButton>
          </motion.div>

          {/* ── Pro ── */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15, ease: 'easeOut' }}
            className="relative md:scale-105 flex flex-col"
          >
            {/* Floating animation wrapper */}
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="glass-card rounded-2xl p-8 border-2 border-indigo-400 shadow-glass-lg bg-white/80 flex flex-col gap-6"
            >
              {/* Most Popular badge */}
              <span className="absolute -top-3.5 right-6 indigo-gradient text-white text-xs font-semibold px-3 py-1 rounded-full shadow-glass">
                Most Popular
              </span>

              <div>
                <p className="text-sm font-semibold text-warm-500 mb-1">Pro</p>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-bold text-gradient">$12</span>
                  <span className="text-sm text-warm-400 mb-1">/ month</span>
                </div>
                <p className="mt-3 text-sm text-warm-500 leading-relaxed">
                  For professionals who run meetings daily.
                </p>
              </div>
              <ul className="space-y-2.5 flex-1">
                {proFeatures.map((f) => <FeatureRow key={f.text} feature={f} />)}
              </ul>
              <PressButton href="/register" variant="primary" size="md" className="w-full">
                Start Pro trial
              </PressButton>
            </motion.div>
          </motion.div>

          {/* ── Team ── */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3, ease: 'easeOut' }}
            className="glass-card rounded-2xl p-8 border border-warm-200 opacity-75 flex flex-col gap-6 relative"
          >
            {/* Coming soon badge */}
            <span className="absolute -top-3.5 right-6 bg-gradient-to-r from-amber-400 to-amber-500 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-sm">
              Coming soon
            </span>

            <div>
              <p className="text-sm font-semibold text-warm-500 mb-1">Team</p>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-bold text-warm-900">$39</span>
                <span className="text-sm text-warm-400 mb-1">/ month</span>
              </div>
              <p className="mt-3 text-sm text-warm-500 leading-relaxed">
                For teams that need shared scheduling and collaboration.
              </p>
            </div>
            <ul className="space-y-2.5 flex-1">
              {teamFeatures.map((f) => <FeatureRow key={f.text} feature={f} />)}
            </ul>
            <PressButton
              variant="secondary"
              size="md"
              className="w-full cursor-not-allowed opacity-60"
              disabled
            >
              Join waitlist
            </PressButton>
          </motion.div>
        </div>

        {/* FAQ row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12">
          {faqs.map((faq, i) => (
            <motion.div
              key={faq.q}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: 0.4 + i * 0.1, ease: 'easeOut' }}
              className="glass-card p-4 rounded-xl text-center border border-warm-100/60"
            >
              <p className="text-sm font-semibold text-warm-900">{faq.q}</p>
              <p className="mt-1 text-sm text-warm-500">{faq.a}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── CTA section ────────────────────────────────────────────────────────────────

function CTASection() {
  return (
    <section className="py-24 bg-white/60">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="indigo-gradient rounded-3xl px-8 py-16 md:py-20 text-center shadow-glass-lg relative overflow-hidden"
        >
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />

          <h2 className="relative text-4xl md:text-5xl font-bold text-white leading-tight">
            Ready to stop scheduling manually?
          </h2>
          <p className="relative mt-4 text-lg text-white/80 max-w-xl mx-auto">
            Join teams using Exora AI to automate their entire meeting workflow.
          </p>

          <div className="relative mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <PressButton href="/register" variant="secondary" size="lg">
              Get started free
            </PressButton>
            <PressButton href="https://t.me/meetingagent_Exora_bot" variant="accent" size="lg">
              Open Telegram Bot
            </PressButton>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ── Footer ─────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="py-12 bg-cream-100 border-t border-warm-200">
      <div className="flex flex-col items-center gap-3">
        <Logo variant="full" size="sm" />
        <p className="text-sm text-warm-500">Your AI-Powered Meeting Assistant</p>
        <p className="text-xs text-warm-400">© 2026 Exora AI</p>
        <p className="text-xs text-warm-300">Built with Groq, Vapi, and Telegram</p>
      </div>
    </footer>
  );
}

// ── Landing page ───────────────────────────────────────────────────────────────

export default function Landing() {
  return (
    <div className="min-h-screen text-warm-900">
      <Navbar />
      <HeroSection />
      <StatsSection />
      <FeaturesSection />
      <HowItWorksSection />
      <PricingSection />
      <CTASection />
      <Footer />
    </div>
  );
}
