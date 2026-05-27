import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User as UserIcon,
  Plug,
  Bell,
  AlertTriangle,
  Lock,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Phone,
  Brain,
  CheckCircle,
  XCircle,
  Loader2,
  Mail,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { PressButton } from '@/components/ui/PressButton';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import api from '@/lib/api';

// ── Validation Schemas ─────────────────────────────────────────────────────────

const profileSchema = z.object({
  name: z.string().min(1, 'Full name is required'),
  phoneNumber: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^\+?[1-9]\d{1,14}$/.test(val.replace(/\s+/g, '')),
      'Phone number must be a valid international format (e.g. +91XXXXXXXXXX)'
    ),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters long'),
    confirmNewPassword: z.string().min(1, 'Password confirmation is required'),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'New passwords do not match',
    path: ['confirmNewPassword'],
  });

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

type SettingsTab = 'profile' | 'integrations' | 'notifications' | 'danger';

interface IntegrationStatus {
  telegram: { connected: boolean };
  vapi: { connected: boolean; phoneNumber: string | null };
  groq: { connected: boolean };
}

export default function SettingsPage() {
  const { user, logout, updateUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Tab state (persistent in localStorage)
  const [activeTab, setActiveTab] = useState<SettingsTab>(() => {
    const saved = localStorage.getItem('settings_active_tab');
    if (saved === 'profile' || saved === 'integrations' || saved === 'notifications' || saved === 'danger') {
      return saved as SettingsTab;
    }
    return 'profile';
  });

  const handleTabChange = (tab: SettingsTab) => {
    setActiveTab(tab);
    localStorage.setItem('settings_active_tab', tab);
  };

  // ── Tab 1: Profile forms ───────────────────────────────────────────────────

  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [isPasswordUpdating, setIsPasswordUpdating] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
    reset: resetProfileForm,
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      phoneNumber: user?.phoneNumber || '',
    },
  });

  // Re-sync form with user context once loaded
  useEffect(() => {
    if (user) {
      resetProfileForm({
        name: user.name || '',
        phoneNumber: user.phoneNumber || '',
      });
    }
  }, [user, resetProfileForm]);

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    reset: resetPasswordForm,
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
  });

  const onProfileSubmit = async (data: ProfileFormValues) => {
    setIsProfileSaving(true);
    try {
      const res = await api.patch('/users/me', data);
      const updatedUser = res.data.data.user;
      
      // Update in-memory Auth context state
      updateUser({
        name: updatedUser.name,
        phoneNumber: updatedUser.phoneNumber,
      });

      toast({
        title: 'Profile updated successfully',
        description: 'Your details have been saved.',
        variant: 'default',
      });
    } catch (err: any) {
      toast({
        title: 'Error updating profile',
        description: err.response?.data?.message || 'Something went wrong.',
        variant: 'destructive',
      });
    } finally {
      setIsProfileSaving(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordFormValues) => {
    setIsPasswordUpdating(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      toast({
        title: 'Password updated successfully',
        description: 'You can now use your new password.',
        variant: 'default',
      });
      resetPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      });
    } catch (err: any) {
      toast({
        title: 'Failed to update password',
        description: err.response?.data?.message || 'Check your current password and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsPasswordUpdating(false);
    }
  };

  // Generate initials for profile placeholder avatar
  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : 'U';

  // ── Tab 2: Integrations Status ─────────────────────────────────────────────

  const [integrations, setIntegrations] = useState<IntegrationStatus | null>(null);
  const [isIntegrationsLoading, setIsIntegrationsLoading] = useState(false);
  const [isTelegramInstructionsOpen, setIsTelegramInstructionsOpen] = useState(false);

  const fetchIntegrationsStatus = async () => {
    setIsIntegrationsLoading(true);
    try {
      const res = await api.get('/settings/integrations');
      setIntegrations(res.data.data);
    } catch (err) {
      console.error('Failed to fetch integrations connection status:', err);
    } finally {
      setIsIntegrationsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'integrations') {
      fetchIntegrationsStatus();
    }
  }, [activeTab]);

  // ── Tab 3: Notifications localStorage switches ──────────────────────────────

  const [notifPreferences, setNotifPreferences] = useState({
    scheduled: true,
    confirmed: true,
    failed: true,
    reminder: false,
    weekly: false,
  });

  useEffect(() => {
    const saved = localStorage.getItem('notification_preferences');
    if (saved) {
      try {
        setNotifPreferences(JSON.parse(saved));
      } catch (err) {
        console.error('Failed parsing notification preferences:', err);
      }
    }
  }, []);

  const handleSwitchChange = (key: keyof typeof notifPreferences, checked: boolean) => {
    setNotifPreferences((prev) => ({
      ...prev,
      [key]: checked,
    }));
  };

  const saveNotifPreferences = () => {
    localStorage.setItem('notification_preferences', JSON.stringify(notifPreferences));
    toast({
      title: 'Preferences saved',
      description: 'Your notification preferences are saved to storage.',
      variant: 'default',
    });
  };

  // ── Tab 4: Danger Zone Actions ─────────────────────────────────────────────

  const [isMeetingsModalOpen, setIsMeetingsModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  
  const [meetingsConfirmText, setMeetingsConfirmText] = useState('');
  const [accountConfirmText, setAccountConfirmText] = useState('');
  
  const [isClearingMeetings, setIsClearingMeetings] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const handleClearMeetings = async () => {
    if (meetingsConfirmText !== 'DELETE') return;
    setIsClearingMeetings(true);
    try {
      const res = await api.delete('/meetings/all');
      toast({
        title: 'Meetings cleared',
        description: `Successfully deleted ${res.data.data?.count || 0} meetings.`,
        variant: 'default',
      });
      setIsMeetingsModalOpen(false);
      setMeetingsConfirmText('');
    } catch (err: any) {
      toast({
        title: 'Failed to clear meetings',
        description: err.response?.data?.message || 'Requires administrator privileges.',
        variant: 'destructive',
      });
    } finally {
      setIsClearingMeetings(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (accountConfirmText !== user?.email) return;
    setIsDeletingAccount(true);
    try {
      await api.delete('/users/me');
      toast({
        title: 'Account deleted',
        description: 'Your account and data have been permanently removed.',
        variant: 'default',
      });
      setIsAccountModalOpen(false);
      logout();
      navigate('/');
    } catch (err: any) {
      toast({
        title: 'Failed to delete account',
        description: err.response?.data?.message || 'Something went wrong.',
        variant: 'destructive',
      });
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="flex-1 min-w-0 overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-warm-900 dark:text-cream-50">Settings</h1>
        <p className="text-sm text-warm-500">Configure your account details, integrations, and preferences</p>
      </div>

      {/* Main Settings Panel */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Navigation list */}
        {/* Responsive Mobile Layout (horizontal row) vs Desktop Layout (left sidebar w-48) */}
        <div className="w-full md:w-48 shrink-0 overflow-x-auto md:overflow-x-visible">
          <div className="flex md:flex-col gap-1.5 p-1 md:p-2 bg-white/20 dark:bg-white/5 backdrop-blur-md rounded-2xl border border-white/40 dark:border-white/10 whitespace-nowrap min-w-max md:min-w-0">
            <button
              onClick={() => handleTabChange('profile')}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 border-l-2 md:border-l-2 md:border-t-0 border-t-2 border-transparent ${
                activeTab === 'profile'
                  ? 'bg-white/60 dark:bg-white/10 text-indigo-600 dark:text-indigo-400 border-indigo-500'
                  : 'text-warm-500 hover:text-indigo-500 hover:bg-white/30 dark:hover:bg-white/5'
              }`}
            >
              <UserIcon className="h-4 w-4 shrink-0" />
              <span>Profile</span>
            </button>
            <button
              onClick={() => handleTabChange('integrations')}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 border-l-2 md:border-l-2 md:border-t-0 border-t-2 border-transparent ${
                activeTab === 'integrations'
                  ? 'bg-white/60 dark:bg-white/10 text-indigo-600 dark:text-indigo-400 border-indigo-500'
                  : 'text-warm-500 hover:text-indigo-500 hover:bg-white/30 dark:hover:bg-white/5'
              }`}
            >
              <Plug className="h-4 w-4 shrink-0" />
              <span>Integrations</span>
            </button>
            <button
              onClick={() => handleTabChange('notifications')}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 border-l-2 md:border-l-2 md:border-t-0 border-t-2 border-transparent ${
                activeTab === 'notifications'
                  ? 'bg-white/60 dark:bg-white/10 text-indigo-600 dark:text-indigo-400 border-indigo-500'
                  : 'text-warm-500 hover:text-indigo-500 hover:bg-white/30 dark:hover:bg-white/5'
              }`}
            >
              <Bell className="h-4 w-4 shrink-0" />
              <span>Notifications</span>
            </button>
            <button
              onClick={() => handleTabChange('danger')}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 border-l-2 md:border-l-2 md:border-t-0 border-t-2 border-transparent ${
                activeTab === 'danger'
                  ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500'
                  : 'text-warm-500 hover:text-red-500 hover:bg-red-500/5'
              }`}
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Danger Zone</span>
            </button>
          </div>
        </div>

        {/* Right Content Panel */}
        <div className="flex-1 w-full min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              {/* ────────────────── PROFILE TAB ────────────────── */}
              {activeTab === 'profile' && (
                <>
                  {/* Personal info form card */}
                  <div className="glass-card rounded-2xl p-6 shadow-glass border border-white/20 dark:border-white/10 space-y-6">
                    <div className="border-b border-warm-100 dark:border-white/10 pb-4">
                      <h2 className="text-lg font-semibold text-warm-900 dark:text-cream-50">Personal Information</h2>
                      <p className="text-xs text-warm-500">Update your public profile details</p>
                    </div>

                    <div className="flex flex-col gap-6">
                      {/* Avatar */}
                      <div className="flex flex-col items-center sm:items-start gap-3">
                        <div className="h-20 w-20 rounded-full indigo-gradient text-white flex items-center justify-center font-bold text-2xl shadow-glass border-2 border-white">
                          {initials}
                        </div>
                        <div>
                          <button
                            type="button"
                            className="text-xs text-warm-400 hover:text-indigo-500 cursor-pointer font-medium transition-colors"
                            onClick={() =>
                              toast({
                                title: 'Avatar uploads are not supported yet',
                                description: 'Exora defaults to generating beautiful visual initial fallbacks.',
                                variant: 'default',
                              })
                            }
                          >
                            Change photo
                          </button>
                        </div>
                      </div>

                      {/* Details inputs */}
                      <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-4 max-w-lg">
                        <div className="space-y-2">
                          <Label htmlFor="name" className="text-xs font-semibold text-warm-700 dark:text-cream-100">
                            Full name
                          </Label>
                          <Input
                            id="name"
                            placeholder="John Doe"
                            className="bg-white/40 dark:bg-white/5 border-warm-200 dark:border-white/10 focus-visible:ring-indigo-500"
                            {...registerProfile('name')}
                          />
                          {profileErrors.name && (
                            <p className="text-xs text-red-500 mt-1">{profileErrors.name.message}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="email" className="text-xs font-semibold text-warm-700 dark:text-cream-100">
                            Email address
                          </Label>
                          <div className="relative">
                            <Input
                              id="email"
                              type="email"
                              disabled
                              value={user?.email || ''}
                              className="bg-cream-100/50 dark:bg-white/5 border-warm-200 dark:border-white/10 opacity-70 cursor-not-allowed pr-10"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-400">
                              <Lock className="h-4 w-4" />
                            </div>
                          </div>
                          <p className="text-[11px] text-warm-400 italic">Email cannot be changed</p>
                        </div>

                        <div className="space-y-2">
                          <Label
                            htmlFor="phoneNumber"
                            className="text-xs font-semibold text-warm-700 dark:text-cream-100"
                          >
                            Phone number
                          </Label>
                          <div className="relative">
                            <Input
                              id="phoneNumber"
                              placeholder="+91xxxxxxxxxx"
                              className="bg-white/40 dark:bg-white/5 border-warm-200 dark:border-white/10 focus-visible:ring-indigo-500 pl-10"
                              {...registerProfile('phoneNumber')}
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400">
                              <Phone className="h-4 w-4" />
                            </div>
                          </div>
                          {profileErrors.phoneNumber ? (
                            <p className="text-xs text-red-500 mt-1">{profileErrors.phoneNumber.message}</p>
                          ) : (
                            <p className="text-[11px] text-amber-600 dark:text-amber-400 leading-relaxed font-medium mt-1">
                              ⚠️ Used for AI voice confirmations before meetings
                            </p>
                          )}
                        </div>

                        <div className="pt-2">
                          <PressButton variant="primary" size="md" type="submit" disabled={isProfileSaving}>
                            <span className="flex items-center gap-2">
                              {isProfileSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                              Save changes
                            </span>
                          </PressButton>
                        </div>
                      </form>
                    </div>
                  </div>

                  {/* Password section card */}
                  <div className="glass-card rounded-2xl p-6 shadow-glass border border-white/20 dark:border-white/10 space-y-6">
                    <div className="border-b border-warm-100 dark:border-white/10 pb-4">
                      <h2 className="text-lg font-semibold text-warm-900 dark:text-cream-50">Change Password</h2>
                      <p className="text-xs text-warm-500">Secure your account credentials</p>
                    </div>

                    <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4 max-w-lg">
                      <div className="space-y-2">
                        <Label
                          htmlFor="currentPassword"
                          className="text-xs font-semibold text-warm-700 dark:text-cream-100"
                        >
                          Current password
                        </Label>
                        <div className="relative">
                          <Input
                            id="currentPassword"
                            type={showCurrentPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            className="bg-white/40 dark:bg-white/5 border-warm-200 dark:border-white/10 focus-visible:ring-indigo-500 pr-10"
                            {...registerPassword('currentPassword')}
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPassword((s) => !s)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-400 hover:text-warm-600 dark:hover:text-warm-200"
                          >
                            {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {passwordErrors.currentPassword && (
                          <p className="text-xs text-red-500 mt-1">{passwordErrors.currentPassword.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="newPassword" className="text-xs font-semibold text-warm-700 dark:text-cream-100">
                          New password
                        </Label>
                        <div className="relative">
                          <Input
                            id="newPassword"
                            type={showNewPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            className="bg-white/40 dark:bg-white/5 border-warm-200 dark:border-white/10 focus-visible:ring-indigo-500 pr-10"
                            {...registerPassword('newPassword')}
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword((s) => !s)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-400 hover:text-warm-600 dark:hover:text-warm-200"
                          >
                            {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {passwordErrors.newPassword && (
                          <p className="text-xs text-red-500 mt-1">{passwordErrors.newPassword.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="confirmNewPassword"
                          className="text-xs font-semibold text-warm-700 dark:text-cream-100"
                        >
                          Confirm new password
                        </Label>
                        <div className="relative">
                          <Input
                            id="confirmNewPassword"
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            className="bg-white/40 dark:bg-white/5 border-warm-200 dark:border-white/10 focus-visible:ring-indigo-500 pr-10"
                            {...registerPassword('confirmNewPassword')}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword((s) => !s)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-400 hover:text-warm-600 dark:hover:text-warm-200"
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {passwordErrors.confirmNewPassword && (
                          <p className="text-xs text-red-500 mt-1">{passwordErrors.confirmNewPassword.message}</p>
                        )}
                      </div>

                      <div className="pt-2">
                        <PressButton variant="secondary" size="md" type="submit" disabled={isPasswordUpdating}>
                          <span className="flex items-center gap-2">
                            {isPasswordUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
                            Update password
                          </span>
                        </PressButton>
                      </div>
                    </form>
                  </div>
                </>
              )}

              {/* ────────────────── INTEGRATIONS TAB ────────────────── */}
              {activeTab === 'integrations' && (
                <div className="glass-card rounded-2xl p-6 shadow-glass border border-white/20 dark:border-white/10 space-y-6">
                  <div className="border-b border-warm-100 dark:border-white/10 pb-4">
                    <h2 className="text-lg font-semibold text-warm-900 dark:text-cream-50">Integrations</h2>
                    <p className="text-xs text-warm-500">Configure third-party service connections for orchestration</p>
                  </div>

                  {isIntegrationsLoading ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-warm-500">
                      <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                      <p className="text-sm font-medium">Fetching integrations connectivity status...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-6">
                      {/* Integration 1: Telegram */}
                      <div className="bg-white/80 dark:bg-white/5 rounded-2xl p-5 border border-warm-200 dark:border-white/10 flex flex-col sm:flex-row gap-4 items-start relative overflow-hidden">
                        <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-500/20">
                          {/* Custom Blue Circle Paper Plane SVG */}
                          <svg className="h-6 w-6 text-blue-500 fill-current" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15.45-3.66 15.01-3.66 15.01s-.1.25-.3.25c-.15 0-.25-.1-.25-.1l-3.3-3.21-2.03 1.96c-.15.15-.3.15-.3 0l.3-3.86 6.36-6.1c.15-.15.1-.25-.1-.1l-7.86 4.95-3.66-1.15c-.25-.1-.25-.3 0-.4L21 7.15c.25-.1.4.05.3.3c0 .05-.36 1.35-.66 2.55z" />
                          </svg>
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-warm-900 dark:text-cream-50 text-sm">Telegram Bot</h3>
                            {integrations?.telegram.connected ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Connected
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-600 dark:text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                                Not configured
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-warm-500 leading-relaxed max-w-2xl">
                            Schedule meetings by messaging{' '}
                            <span className="font-mono text-indigo-600 dark:text-indigo-400">
                              @meetingagent_Exora_bot
                            </span>{' '}
                            on Telegram. The bot handles intent recognition, slot filling, and meeting creation
                            automatically.
                          </p>

                          {/* Setup instructions */}
                          <div className="pt-1">
                            <button
                              onClick={() => setIsTelegramInstructionsOpen((o) => !o)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-warm-600 hover:text-indigo-500 dark:text-warm-400 cursor-pointer"
                            >
                              <span>Setup Instructions</span>
                              {isTelegramInstructionsOpen ? (
                                <ChevronUp className="h-3 w-3" />
                              ) : (
                                <ChevronDown className="h-3 w-3" />
                              )}
                            </button>
                            {isTelegramInstructionsOpen && (
                              <div className="mt-2.5 p-3 rounded-xl bg-warm-50 dark:bg-white/5 border border-warm-150 dark:border-white/10 space-y-2 text-xs text-warm-600 dark:text-warm-300 leading-relaxed animate-in fade-in-50 duration-200">
                                <p className="font-medium text-warm-800 dark:text-cream-100">Quick Start guide:</p>
                                <ol className="list-decimal list-inside space-y-1">
                                  <li>Search @meetingagent_Exora_bot on Telegram</li>
                                  <li>Send /start to activate</li>
                                  <li>Try: Schedule a call with [name] tomorrow at 3pm</li>
                                </ol>
                              </div>
                            )}
                          </div>

                          <div className="pt-2">
                            <PressButton
                              variant="primary"
                              size="sm"
                              href="https://t.me/meetingagent_Exora_bot"
                            >
                              Open Telegram Bot
                            </PressButton>
                          </div>
                        </div>
                      </div>

                      {/* Integration 2: Vapi Voice Agent */}
                      <div className="bg-white/80 dark:bg-white/5 rounded-2xl p-5 border border-warm-200 dark:border-white/10 flex flex-col sm:flex-row gap-4 items-start relative overflow-hidden">
                        <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 border border-amber-500/20">
                          <Phone className="h-6 w-6 text-amber-500" />
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-warm-900 dark:text-cream-50 text-sm">Vapi Voice Agent</h3>
                            {integrations?.vapi.connected ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Connected
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-600 dark:text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                                Not configured
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-warm-500 leading-relaxed max-w-2xl">
                            Exora calls meeting participants 30 minutes before meetings to confirm attendance and collect
                            agenda topics via AI voice conversation.
                          </p>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 rounded-xl bg-warm-50 dark:bg-white/5 border border-warm-150 dark:border-white/10 text-xs mt-2 text-warm-600 dark:text-warm-300">
                            <div>
                              <span className="text-warm-400 block font-normal text-[10px]">Phone number</span>
                              <span className="font-semibold font-mono">
                                {integrations?.vapi.phoneNumber || 'Not set'}
                              </span>
                            </div>
                            <div>
                              <span className="text-warm-400 block font-normal text-[10px]">Assistant</span>
                              <span className="font-semibold">Exora Meeting Agent</span>
                            </div>
                            <div>
                              <span className="text-warm-400 block font-normal text-[10px]">Calls per day</span>
                              <span className="font-semibold">Unlimited (Vapi free tier)</span>
                            </div>
                          </div>

                          <div className="pt-2">
                            <PressButton
                              variant="secondary"
                              size="sm"
                              href="https://dashboard.vapi.ai"
                            >
                              View Vapi Dashboard
                            </PressButton>
                          </div>
                        </div>
                      </div>

                      {/* Integration 3: AI Engine */}
                      <div className="bg-white/80 dark:bg-white/5 rounded-2xl p-5 border border-warm-200 dark:border-white/10 flex flex-col sm:flex-row gap-4 items-start relative overflow-hidden">
                        <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0 border border-purple-500/20">
                          <Brain className="h-6 w-6 text-purple-500" />
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-warm-900 dark:text-cream-50 text-sm">AI Engine</h3>
                            {integrations?.groq.connected ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Connected
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-600 dark:text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                                Not configured
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-warm-500 leading-relaxed max-w-2xl">
                            Powered by Groq (primary) with OpenRouter as fallback. Used for intent extraction, agenda
                            parsing, and email drafting.
                          </p>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 rounded-xl bg-warm-50 dark:bg-white/5 border border-warm-150 dark:border-white/10 text-xs mt-2 text-warm-600 dark:text-warm-300">
                            <div>
                              <span className="text-warm-400 block font-normal text-[10px]">Primary model</span>
                              <span className="font-semibold">Groq — llama3-70b</span>
                            </div>
                            <div>
                              <span className="text-warm-400 block font-normal text-[10px]">Fallback model</span>
                              <span className="font-semibold">OpenRouter</span>
                            </div>
                            <div>
                              <span className="text-warm-400 block font-normal text-[10px]">Daily limit</span>
                              <span className="font-semibold">1,000 requests (free tier)</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ────────────────── NOTIFICATIONS TAB ────────────────── */}
              {activeTab === 'notifications' && (
                <div className="glass-card rounded-2xl p-6 shadow-glass border border-white/20 dark:border-white/10 space-y-6">
                  <div className="border-b border-warm-100 dark:border-white/10 pb-4">
                    <h2 className="text-lg font-semibold text-warm-900 dark:text-cream-50">Notification Preferences</h2>
                    <p className="text-xs text-warm-500">Choose when Exora contacts you</p>
                  </div>

                  <div className="space-y-5">
                    {/* Toggle 1: Meeting scheduled */}
                    <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-white/40 dark:bg-white/5 border border-warm-200/60 dark:border-white/10">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-semibold text-warm-900 dark:text-cream-100">
                          Meeting scheduled
                        </Label>
                        <p className="text-xs text-warm-500">Get notified when a new meeting is created</p>
                      </div>
                      <Switch
                        checked={notifPreferences.scheduled}
                        onCheckedChange={(checked) => handleSwitchChange('scheduled', checked)}
                      />
                    </div>

                    {/* Toggle 2: Participant confirmed */}
                    <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-white/40 dark:bg-white/5 border border-warm-200/60 dark:border-white/10">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-semibold text-warm-900 dark:text-cream-100">
                          Participant confirmed
                        </Label>
                        <p className="text-xs text-warm-500">When someone confirms via voice call</p>
                      </div>
                      <Switch
                        checked={notifPreferences.confirmed}
                        onCheckedChange={(checked) => handleSwitchChange('confirmed', checked)}
                      />
                    </div>

                    {/* Toggle 3: Voice call failed */}
                    <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-white/40 dark:bg-white/5 border border-warm-200/60 dark:border-white/10">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-semibold text-warm-900 dark:text-cream-100">
                          Voice call failed
                        </Label>
                        <p className="text-xs text-warm-500">When Exora can't reach a participant</p>
                      </div>
                      <Switch
                        checked={notifPreferences.failed}
                        onCheckedChange={(checked) => handleSwitchChange('failed', checked)}
                      />
                    </div>

                    {/* Toggle 4: Meeting reminder */}
                    <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-white/40 dark:bg-white/5 border border-warm-200/60 dark:border-white/10">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-semibold text-warm-900 dark:text-cream-100">
                          Meeting reminder
                        </Label>
                        <p className="text-xs text-warm-500">Reminder 1 hour before meetings</p>
                      </div>
                      <Switch
                        checked={notifPreferences.reminder}
                        onCheckedChange={(checked) => handleSwitchChange('reminder', checked)}
                      />
                    </div>

                    {/* Toggle 5: Weekly summary */}
                    <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-white/40 dark:bg-white/5 border border-warm-200/60 dark:border-white/10">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-semibold text-warm-900 dark:text-cream-100">
                          Weekly summary
                        </Label>
                        <p className="text-xs text-warm-500">A summary of your week every Monday morning</p>
                      </div>
                      <Switch
                        checked={notifPreferences.weekly}
                        onCheckedChange={(checked) => handleSwitchChange('weekly', checked)}
                      />
                    </div>

                    <div className="pt-3">
                      <PressButton variant="primary" size="md" onClick={saveNotifPreferences}>
                        Save preferences
                      </PressButton>
                    </div>
                  </div>
                </div>
              )}

              {/* ────────────────── DANGER ZONE TAB ────────────────── */}
              {activeTab === 'danger' && (
                <div className="glass-card rounded-2xl p-6 shadow-glass border border-red-200/70 dark:border-red-900/30 space-y-6">
                  <div className="border-b border-red-200/60 dark:border-red-900/20 pb-4">
                    <h2 className="text-lg font-bold text-red-600 dark:text-red-400">Danger Zone</h2>
                    <p className="text-xs text-warm-500">These actions are permanent and cannot be undone</p>
                  </div>

                  <div className="space-y-6">
                    {/* Action 1: Clear all meetings */}
                    <div className="bg-white/80 dark:bg-white/5 rounded-2xl p-4 border border-warm-200 dark:border-white/10 border-l-4 border-l-red-500 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <h3 className="font-semibold text-sm text-warm-900 dark:text-cream-50">Clear all meetings</h3>
                        <p className="text-xs text-warm-500 max-w-md leading-relaxed">
                          Delete all meetings and participant data from the platform. This action is irreversible.
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="font-medium shrink-0 shadow-sm"
                        onClick={() => setIsMeetingsModalOpen(true)}
                      >
                        Clear meetings
                      </Button>
                    </div>

                    {/* Action 2: Delete account */}
                    <div className="bg-white/80 dark:bg-white/5 rounded-2xl p-4 border border-warm-200 dark:border-white/10 border-l-4 border-l-red-600 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <h3 className="font-semibold text-sm text-warm-900 dark:text-cream-50">Delete account</h3>
                        <p className="text-xs text-warm-500 max-w-md leading-relaxed">
                          Permanently delete your user profile and all associated data. Your records will be deleted immediately.
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="font-medium shrink-0 shadow-sm bg-red-600 hover:bg-red-700"
                        onClick={() => setIsAccountModalOpen(true)}
                      >
                        Delete account
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── Confirmation Modal: Clear Meetings ── */}
      <Dialog open={isMeetingsModalOpen} onOpenChange={setIsMeetingsModalOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-zinc-950 border border-warm-200 dark:border-zinc-800 shadow-glass rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-warm-900 dark:text-cream-50">Are you absolutely sure?</DialogTitle>
            <DialogDescription className="text-xs text-warm-500 mt-2 leading-relaxed">
              This will permanently delete all meetings, agendas, event history, and voice logs. It cannot be recovered.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="meetingsConfirm" className="text-xs font-semibold text-warm-700 dark:text-cream-100">
              Type <span className="font-mono bg-red-500/10 text-red-600 dark:text-red-400 px-1 py-0.5 rounded font-bold">DELETE</span> to confirm:
            </Label>
            <Input
              id="meetingsConfirm"
              value={meetingsConfirmText}
              onChange={(e) => setMeetingsConfirmText(e.target.value)}
              placeholder="DELETE"
              className="bg-white/40 dark:bg-white/5 border-warm-200 dark:border-zinc-800 focus-visible:ring-red-500"
            />
          </div>
          <DialogFooter className="flex gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsMeetingsModalOpen(false);
                setMeetingsConfirmText('');
              }}
              className="border-warm-200 dark:border-zinc-800 dark:text-cream-100"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={meetingsConfirmText !== 'DELETE' || isClearingMeetings}
              onClick={handleClearMeetings}
            >
              {isClearingMeetings && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Clear all meetings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirmation Modal: Delete Account ── */}
      <Dialog open={isAccountModalOpen} onOpenChange={setIsAccountModalOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-zinc-950 border border-warm-200 dark:border-zinc-800 shadow-glass rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-red-600 dark:text-red-400">Permanently delete account?</DialogTitle>
            <DialogDescription className="text-xs text-warm-500 mt-2 leading-relaxed font-normal">
              You are about to permanently delete your account and all associated meetings, files, and transcripts. 
              This action is immediate and irreversible.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="accountConfirm" className="text-xs font-semibold text-warm-700 dark:text-cream-100">
              Type your email <span className="font-bold underline text-indigo-600 dark:text-indigo-400">{user?.email}</span> to confirm:
            </Label>
            <Input
              id="accountConfirm"
              value={accountConfirmText}
              onChange={(e) => setAccountConfirmText(e.target.value)}
              placeholder={user?.email || 'email@example.com'}
              className="bg-white/40 dark:bg-white/5 border-warm-200 dark:border-zinc-800 focus-visible:ring-red-500"
            />
          </div>
          <DialogFooter className="flex gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsAccountModalOpen(false);
                setAccountConfirmText('');
              }}
              className="border-warm-200 dark:border-zinc-800 dark:text-cream-100"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={accountConfirmText !== user?.email || isDeletingAccount}
              onClick={handleDeleteAccount}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeletingAccount && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Delete my account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
