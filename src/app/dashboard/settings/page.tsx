'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { motion } from 'framer-motion';
import {
  Gear, Coins, LockSimple, Calculator, Desktop,
  ArrowCounterClockwise, EnvelopeSimple, Question, ThumbsUp,
  CaretLeft, Moon, Sun, SunDim, SignOut, Brain,
  CreditCard, Bell, ShieldCheck, FileArrowDown, FileArrowUp,
  Tag, Repeat, Target, ChartLineUp, UserCircle,
  Palette, Globe, Clock, CalendarBlank
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { CURRENCIES } from '@/lib/utils';

// 4×3 grid — CashBash features + reference-inspired items
const SETTINGS_ITEMS = [
  { id: 'configuration', icon: Gear, label: 'Configuration' },
  { id: 'accounts', icon: Coins, label: 'Accounts', href: '/dashboard/accounts' },
  { id: 'categories', icon: Tag, label: 'Categories', href: '/dashboard/categories' },
  { id: 'budgets', icon: Target, label: 'Budgets', href: '/dashboard/budgets' },
  { id: 'bills', icon: Repeat, label: 'Recurring', href: '/dashboard/bills' },
  { id: 'goals', icon: ChartLineUp, label: 'Goals', href: '/dashboard/goals' },
  { id: 'passcode', icon: LockSimple, label: 'Passcode' },
  { id: 'ai', icon: Brain, label: 'AI Settings' },
  { id: 'billing', icon: CreditCard, label: 'Billing' },
  { id: 'backup', icon: ArrowCounterClockwise, label: 'Backup' },
  { id: 'feedback', icon: EnvelopeSimple, label: 'Feedback' },
  { id: 'help', icon: Question, label: 'Help' },
];

type ViewType = 'grid' | 'configuration' | 'passcode' | 'ai' | 'billing' | 'appearance' | 'profile' | 'notifications';

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [view, setView] = useState<ViewType>('grid');
  const [loading, setLoading] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [hasPin, setHasPin] = useState(false);
  const [profile, setProfile] = useState({
    display_name: '',
    default_currency: 'USD',
    timezone: 'UTC',
    locale: 'en',
    date_format: 'YYYY-MM-DD',
    first_day_of_week: 0,
    monthly_budget: '',
    weekly_budget: '',
    ai_enabled: true,
    ai_auto_categorize: true,
    ai_suggestions: true,
    show_balance: true,
    compact_mode: false,
    subscription_tier: 'free',
  });

  useEffect(() => {
    setHasPin(!!localStorage.getItem('app_pin'));
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/profile');
      const data = await res.json();
      if (data.data) {
        setProfile(prev => ({
          ...prev,
          ...data.data,
          monthly_budget: data.data.monthly_budget ? (data.data.monthly_budget / 100).toString() : '',
          weekly_budget: data.data.weekly_budget ? (data.data.weekly_budget / 100).toString() : '',
          subscription_tier: data.data.subscription_tier || 'free',
        }));
      }
    } catch {}
  };

  const saveProfile = async () => {
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        display_name: profile.display_name,
        default_currency: profile.default_currency,
        timezone: profile.timezone,
        locale: profile.locale,
        date_format: profile.date_format,
        first_day_of_week: profile.first_day_of_week,
        ai_enabled: profile.ai_enabled,
        ai_auto_categorize: profile.ai_auto_categorize,
        ai_suggestions: profile.ai_suggestions,
        monthly_budget: profile.monthly_budget ? Math.round(parseFloat(profile.monthly_budget) * 100) : null,
        weekly_budget: profile.weekly_budget ? Math.round(parseFloat(profile.weekly_budget) * 100) : null,
      };
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) toast.success('Settings saved!');
      else toast.error('Failed to save');
    } catch { toast.error('Failed to save'); }
    finally { setLoading(false); }
  };

  const exportData = async () => {
    try {
      const res = await fetch('/api/export');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cashbash-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      toast.success('Export started!');
    } catch { toast.error('Export failed'); }
  };

  const handleManageBilling = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/portal', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.url) window.location.href = data.url;
    } catch (err: any) { toast.error(err.message || 'Failed'); }
    finally { setLoading(false); }
  };

  const savePin = () => {
    if (pinInput.length !== 4) return toast.error('PIN must be 4 digits');
    localStorage.setItem('app_pin', pinInput);
    setHasPin(true); setPinInput('');
    toast.success('App Lock PIN saved');
  };
  const removePin = () => {
    localStorage.removeItem('app_pin');
    setHasPin(false);
    toast.success('PIN removed');
  };

  const update = (key: string, value: unknown) => setProfile(p => ({ ...p, [key]: value }));
  const toggle = (key: string) => setProfile(p => ({ ...p, [key]: !(p as Record<string, unknown>)[key] }));

  const handleGridClick = (id: string, href?: string) => {
    if (href) { router.push(href); return; }
    if (['configuration', 'passcode', 'ai', 'billing', 'appearance', 'profile', 'notifications'].includes(id)) {
      setView(id as ViewType); return;
    }
    if (id === 'backup') { exportData(); return; }
    if (id === 'feedback') { window.open('mailto:drvelu@outlook.com?subject=CashBash Feedback', '_blank'); return; }
    if (id === 'help') { toast('Help center coming soon!'); return; }
  };

  // ─── Back button helper ───
  const BackHeader = ({ title }: { title: string }) => (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border/10">
      <button onClick={() => setView('grid')} className="p-1"><CaretLeft className="w-5 h-5" /></button>
      <h1 className="text-xl font-semibold">{title}</h1>
    </div>
  );

  // ════════════════════════════════════════════
  // GRID VIEW
  // ════════════════════════════════════════════
  if (view === 'grid') {
    return (
      <div className="space-y-0 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">CashBash.ai</p>
            <h1 className="text-2xl font-semibold">Settings</h1>
          </div>
          <span className="text-xs text-muted-foreground">v4.11.0</span>
        </div>

        {/* Profile quick info */}
        <button onClick={() => setView('profile')} className="w-full flex items-center gap-3 px-4 py-3 border-y border-border/10 active:bg-foreground/[0.02]">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <UserCircle className="w-7 h-7 text-primary" weight="fill" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold">{profile.display_name || 'Set your name'}</p>
            <p className="text-xs text-muted-foreground capitalize">{profile.subscription_tier} Plan · {profile.default_currency}</p>
          </div>
          <CaretLeft className="w-4 h-4 text-muted-foreground rotate-180" />
        </button>

        {/* 4×3 grid */}
        <div className="settings-grid px-2">
          {SETTINGS_ITEMS.map(({ id, icon: Icon, label, href }) => (
            <motion.button
              key={id}
              className="settings-grid-item"
              onClick={() => handleGridClick(id, href as string)}
              whileTap={{ scale: 0.95 }}
            >
              <Icon className="icon" weight="regular" />
              <span className="label">{label}</span>
            </motion.button>
          ))}
        </div>

        {/* Quick settings below */}
        <div className="config-section-header">Quick Settings</div>

        <div className="config-item" onClick={() => setView('appearance')}>
          <div className="flex items-center gap-2.5">
            <Palette className="w-4 h-4 text-muted-foreground" />
            <span className="config-label">Appearance</span>
          </div>
          <span className="config-value capitalize">{theme}</span>
        </div>

        <div className="config-item" onClick={() => setView('notifications')}>
          <div className="flex items-center gap-2.5">
            <Bell className="w-4 h-4 text-muted-foreground" />
            <span className="config-label">Notifications</span>
          </div>
          <span className="config-value">→</span>
        </div>

        <div className="config-item" onClick={() => router.push('/dashboard/import-export')}>
          <div className="flex items-center gap-2.5">
            <FileArrowUp className="w-4 h-4 text-muted-foreground" />
            <span className="config-label">Import / Export</span>
          </div>
          <span className="config-value">→</span>
        </div>

        <div className="config-item" onClick={() => router.push('/dashboard/templates')}>
          <div className="flex items-center gap-2.5">
            <FileArrowDown className="w-4 h-4 text-muted-foreground" />
            <span className="config-label">Templates</span>
          </div>
          <span className="config-value">→</span>
        </div>

        <div className="config-item" onClick={() => router.push('/dashboard/tags')}>
          <div className="flex items-center gap-2.5">
            <Tag className="w-4 h-4 text-muted-foreground" />
            <span className="config-label">Tags</span>
          </div>
          <span className="config-value">→</span>
        </div>

        {/* Sign out */}
        <div className="mt-4 config-item" onClick={() => {
          fetch('/auth/callback?action=signout').then(() => router.push('/login'));
        }}>
          <div className="flex items-center gap-2.5">
            <SignOut className="w-4 h-4 text-red-400" />
            <span className="config-label text-red-400">Sign Out</span>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════
  // PROFILE VIEW
  // ════════════════════════════════════════════
  if (view === 'profile') {
    return (
      <div className="space-y-0 pb-24">
        <BackHeader title="Profile" />
        <div className="px-4 space-y-0">
          <div className="underline-field">
            <label>Display Name</label>
            <input value={profile.display_name} onChange={e => update('display_name', e.target.value)} placeholder="Your name" />
          </div>
          <div className="underline-field">
            <label>Monthly Budget</label>
            <input type="number" value={profile.monthly_budget} onChange={e => update('monthly_budget', e.target.value)} placeholder="e.g. 3000" />
          </div>
          <div className="underline-field">
            <label>Weekly Budget</label>
            <input type="number" value={profile.weekly_budget} onChange={e => update('weekly_budget', e.target.value)} placeholder="e.g. 750" />
          </div>
        </div>
        <div className="config-item" onClick={() => { toggle('show_balance'); }}>
          <span className="config-label">Show Balance</span>
          <span className="config-value">{profile.show_balance ? 'ON' : 'OFF'}</span>
        </div>
        <div className="config-item" onClick={() => { toggle('compact_mode'); }}>
          <span className="config-label">Compact Mode</span>
          <span className="config-value">{profile.compact_mode ? 'ON' : 'OFF'}</span>
        </div>
        <SaveButton loading={loading} onSave={saveProfile} />
      </div>
    );
  }

  // ════════════════════════════════════════════
  // CONFIGURATION VIEW
  // ════════════════════════════════════════════
  if (view === 'configuration') {
    return (
      <div className="space-y-0 pb-24">
        <BackHeader title="Configuration" />

        <div className="config-section-header">Category / Repeat</div>
        <ConfigLink label="Income Categories" onClick={() => router.push('/dashboard/categories')} />
        <ConfigLink label="Expense Categories" onClick={() => router.push('/dashboard/categories')} />
        <ConfigLink label="Budget Setting" onClick={() => router.push('/dashboard/budgets')} />
        <ConfigLink label="Recurring / Bills" onClick={() => router.push('/dashboard/bills')} />
        <ConfigLink label="Goals" onClick={() => router.push('/dashboard/goals')} />

        <div className="config-section-header">Currency & Locale</div>
        <div className="config-item">
          <span className="config-label">Main Currency</span>
          <select value={profile.default_currency}
            onChange={e => { update('default_currency', e.target.value); }}
            className="config-value bg-transparent border-none outline-none text-right cursor-pointer">
            {Object.values(CURRENCIES).map(c => (
              <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
            ))}
          </select>
        </div>
        <div className="config-item">
          <span className="config-label">Date Format</span>
          <select value={profile.date_format}
            onChange={e => update('date_format', e.target.value)}
            className="config-value bg-transparent border-none outline-none text-right cursor-pointer">
            {['YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY', 'MMM D, YYYY'].map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
        <div className="config-item">
          <span className="config-label">Weekly Start Day</span>
          <select value={profile.first_day_of_week}
            onChange={e => update('first_day_of_week', Number(e.target.value))}
            className="config-value bg-transparent border-none outline-none text-right cursor-pointer">
            <option value={0}>Sunday</option>
            <option value={1}>Monday</option>
            <option value={6}>Saturday</option>
          </select>
        </div>
        <div className="config-item">
          <span className="config-label">Monthly Start Date</span>
          <span className="config-value">Every 1</span>
        </div>

        <div className="config-section-header">Display</div>
        <div className="config-item" onClick={() => { toggle('show_balance'); }}>
          <span className="config-label">Show Balance</span>
          <span className="config-value">{profile.show_balance ? 'ON' : 'OFF'}</span>
        </div>
        <div className="config-item" onClick={() => { toggle('compact_mode'); }}>
          <span className="config-label">Compact Mode</span>
          <span className="config-value">{profile.compact_mode ? 'ON' : 'OFF'}</span>
        </div>

        <SaveButton loading={loading} onSave={saveProfile} />
      </div>
    );
  }

  // ════════════════════════════════════════════
  // AI SETTINGS VIEW
  // ════════════════════════════════════════════
  if (view === 'ai') {
    return (
      <div className="space-y-0 pb-24">
        <BackHeader title="AI Settings" />
        <div className="px-4 py-4">
          <div className="flex items-center gap-3 mb-3">
            <Brain className="w-5 h-5 text-primary" weight="duotone" />
            <p className="text-sm text-muted-foreground">CashBash AI learns your habits to auto-categorize and give smart suggestions.</p>
          </div>
        </div>
        <div className="config-item" onClick={() => { toggle('ai_enabled'); }}>
          <span className="config-label">AI Assistant</span>
          <TogglePill active={profile.ai_enabled} />
        </div>
        <div className="config-item" onClick={() => { toggle('ai_auto_categorize'); }}>
          <span className="config-label">Auto-Categorize</span>
          <TogglePill active={profile.ai_auto_categorize} />
        </div>
        <div className="config-item" onClick={() => { toggle('ai_suggestions'); }}>
          <span className="config-label">Smart Suggestions</span>
          <TogglePill active={profile.ai_suggestions} />
        </div>
        <ConfigLink label="AI Chat Assistant" onClick={() => router.push('/dashboard/ai-assistant')} />
        <SaveButton loading={loading} onSave={saveProfile} />
      </div>
    );
  }

  // ════════════════════════════════════════════
  // BILLING VIEW
  // ════════════════════════════════════════════
  if (view === 'billing') {
    return (
      <div className="space-y-0 pb-24">
        <BackHeader title="Billing & Subscription" />
        <div className="px-4 py-4">
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-sm font-semibold">Current Plan: <span className="text-primary capitalize">{profile.subscription_tier}</span></p>
            <p className="text-xs text-muted-foreground mt-1">
              {profile.subscription_tier === 'free'
                ? 'Upgrade to unlock AI features, unlimited accounts, and more.'
                : 'Thank you for being a Pro user!'}
            </p>
          </div>
        </div>
        {profile.subscription_tier === 'free' ? (
          <div className="config-item" onClick={() => router.push('/pricing')}>
            <span className="config-label text-primary font-semibold">Upgrade Plan</span>
            <span className="config-value">→</span>
          </div>
        ) : (
          <div className="config-item" onClick={handleManageBilling}>
            <span className="config-label">Manage Billing Portal</span>
            <span className="config-value">{loading ? '...' : '→'}</span>
          </div>
        )}
      </div>
    );
  }

  // ════════════════════════════════════════════
  // APPEARANCE VIEW
  // ════════════════════════════════════════════
  if (view === 'appearance') {
    return (
      <div className="space-y-0 pb-24">
        <BackHeader title="Appearance" />
        <div className="config-section-header">Theme</div>
        {[
          { value: 'light', icon: Sun, label: 'Light', desc: 'Clean and bright' },
          { value: 'dark', icon: Moon, label: 'Dark', desc: 'Easy on the eyes' },
          { value: 'system', icon: SunDim, label: 'System', desc: 'Follow OS setting' },
        ].map(t => {
          const Icon = t.icon;
          const isActive = theme === t.value;
          return (
            <div key={t.value} className="config-item" onClick={() => setTheme(t.value)}>
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} weight={isActive ? 'fill' : 'regular'} />
                <div>
                  <span className={`config-label ${isActive ? 'text-primary' : ''}`}>{t.label}</span>
                  <p className="text-xs text-muted-foreground">{t.desc}</p>
                </div>
              </div>
              {isActive && <span className="text-primary text-sm">✓</span>}
            </div>
          );
        })}
      </div>
    );
  }

  // ════════════════════════════════════════════
  // NOTIFICATIONS VIEW
  // ════════════════════════════════════════════
  if (view === 'notifications') {
    return (
      <div className="space-y-0 pb-24">
        <BackHeader title="Notifications" />
        {[
          { label: 'Budget Alerts', desc: 'Notify when approaching budget limit' },
          { label: 'Weekly Summary', desc: 'Weekly spending report every Sunday' },
          { label: 'AI Insights', desc: 'Receive AI-generated financial tips' },
          { label: 'Large Transactions', desc: 'Alert for transactions over your set limit' },
        ].map(item => (
          <div key={item.label} className="config-item" onClick={() => toast('Notifications coming soon!')}>
            <div>
              <span className="config-label">{item.label}</span>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
            <span className="config-value">OFF</span>
          </div>
        ))}
      </div>
    );
  }

  // ════════════════════════════════════════════
  // PASSCODE VIEW
  // ════════════════════════════════════════════
  if (view === 'passcode') {
    return (
      <div className="space-y-0 pb-24">
        <BackHeader title="Passcode" />
        <div className="px-4 py-6 space-y-4">
          {hasPin ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" weight="fill" />
                  <span className="text-sm font-medium text-emerald-500">PIN Protection Active</span>
                </div>
                <button onClick={removePin} className="text-sm text-red-400">Remove PIN</button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Set a 4-digit PIN to lock the app.</p>
              <div className="underline-field">
                <label>PIN Code</label>
                <input
                  type="password" maxLength={4} placeholder="0000" value={pinInput}
                  onChange={e => setPinInput(e.target.value.replace(/\D/g, ''))}
                  className="text-center tracking-[0.5em]"
                />
              </div>
              <motion.button onClick={savePin}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
                whileTap={{ scale: 0.97 }}>
                Set PIN
              </motion.button>
            </div>
          )}
        </div>
        <div className="config-section-header">Security</div>
        <div className="config-item" onClick={() => toast.success('Password reset email sent')}>
          <span className="config-label">Change Password</span>
          <span className="config-value">Email →</span>
        </div>
        <div className="config-item" onClick={() => toast('Contact support to delete account')}>
          <span className="config-label text-red-400">Delete Account</span>
          <span className="text-red-400 text-xs">Danger</span>
        </div>
      </div>
    );
  }

  return null;
}

// ─── Reusable pieces ───

function SaveButton({ loading, onSave }: { loading: boolean; onSave: () => void }) {
  return (
    <div className="p-4">
      <motion.button onClick={onSave} disabled={loading}
        className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60"
        whileTap={{ scale: 0.97 }}>
        {loading ? 'Saving...' : 'Save Changes'}
      </motion.button>
    </div>
  );
}

function ConfigLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div className="config-item" onClick={onClick}>
      <span className="config-label">{label}</span>
      <span className="config-value">→</span>
    </div>
  );
}

function TogglePill({ active }: { active: boolean }) {
  return (
    <div className={`relative w-11 h-6 rounded-full transition-colors ${active ? 'bg-primary' : 'bg-muted'}`}>
      <motion.div
        className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm"
        animate={{ x: active ? 20 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </div>
  );
}
