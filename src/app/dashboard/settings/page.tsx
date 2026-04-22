'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gear, Coins, LockSimple, Calculator, Desktop,
  ArrowCounterClockwise, EnvelopeSimple, Question, ThumbsUp,
  CaretLeft, Moon, Sun, SunDim, SignOut
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { CURRENCIES } from '@/lib/utils';

const SETTINGS_ITEMS = [
  { id: 'configuration', icon: Gear, label: 'Configuration' },
  { id: 'accounts', icon: Coins, label: 'Accounts', href: '/dashboard/accounts' },
  { id: 'passcode', icon: LockSimple, label: 'Passcode' },
  { id: 'calcbox', icon: Calculator, label: 'CalcBox' },
  { id: 'sync', icon: Desktop, label: 'PC Manager' },
  { id: 'backup', icon: ArrowCounterClockwise, label: 'Backup' },
  { id: 'feedback', icon: EnvelopeSimple, label: 'Feedback' },
  { id: 'help', icon: Question, label: 'Help' },
  { id: 'recommend', icon: ThumbsUp, label: 'Recommend' },
];

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [view, setView] = useState<'grid' | 'configuration' | 'passcode'>('grid');
  const [loading, setLoading] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [hasPin, setHasPin] = useState(false);
  const [profile, setProfile] = useState({
    display_name: '',
    default_currency: 'USD',
    timezone: 'UTC',
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
    } catch {
      toast.error('Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const exportData = async () => {
    try {
      const res = await fetch('/api/export');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cashdash-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      toast.success('Export started!');
    } catch {
      toast.error('Export failed');
    }
  };

  const handleManageBilling = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/portal', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.url) window.location.href = data.url;
    } catch (err: any) {
      toast.error(err.message || 'Failed to open portal');
    } finally {
      setLoading(false);
    }
  };

  const savePin = () => {
    if (pinInput.length !== 4) return toast.error('PIN must be 4 digits');
    localStorage.setItem('app_pin', pinInput);
    setHasPin(true);
    setPinInput('');
    toast.success('App Lock PIN saved');
  };

  const removePin = () => {
    localStorage.removeItem('app_pin');
    setHasPin(false);
    toast.success('App Lock PIN removed');
  };

  const update = (key: string, value: unknown) => setProfile(p => ({ ...p, [key]: value }));
  const toggle = (key: string) => setProfile(p => ({ ...p, [key]: !(p as Record<string, unknown>)[key] }));

  const handleGridClick = (id: string, href?: string) => {
    if (href) { router.push(href); return; }
    if (id === 'configuration') { setView('configuration'); return; }
    if (id === 'passcode') { setView('passcode'); return; }
    if (id === 'backup') { exportData(); return; }
    if (id === 'feedback') { toast('Feedback: drvelu@outlook.com'); return; }
    if (id === 'help') { toast('Help center coming soon!'); return; }
    if (id === 'recommend') { toast('Share CashDash with friends!'); return; }
    if (id === 'calcbox') { toast('Calculator coming soon!'); return; }
    if (id === 'sync') { toast('PC sync coming soon!'); return; }
  };

  // ── Grid View ──
  if (view === 'grid') {
    return (
      <div className="space-y-0">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-2xl font-semibold">Settings</h1>
          </div>
          <span className="text-sm text-muted-foreground">v4.11.0</span>
        </div>

        {/* 3×3 grid */}
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

        {/* Quick actions below grid */}
        <div className="mt-4 space-y-0">
          <div className="config-section-header">Quick Settings</div>

          {/* Theme */}
          <div className="config-item" onClick={() => {
            const themes = ['light', 'dark', 'system'];
            const current = themes.indexOf(theme || 'system');
            setTheme(themes[(current + 1) % themes.length]);
          }}>
            <span className="config-label">Theme</span>
            <span className="config-value capitalize">{theme}</span>
          </div>

          {/* Currency */}
          <div className="config-item">
            <span className="config-label">Currency</span>
            <select
              value={profile.default_currency}
              onChange={e => { update('default_currency', e.target.value); saveProfile(); }}
              className="config-value bg-transparent border-none outline-none text-right cursor-pointer"
            >
              {Object.values(CURRENCIES).map(c => (
                <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
              ))}
            </select>
          </div>

          {/* AI */}
          <div className="config-item" onClick={() => { toggle('ai_enabled'); saveProfile(); }}>
            <span className="config-label">AI Assistant</span>
            <span className="config-value">{profile.ai_enabled ? 'ON' : 'OFF'}</span>
          </div>

          {/* Plan */}
          <div className="config-item" onClick={() => router.push('/pricing')}>
            <span className="config-label">Subscription</span>
            <span className="config-value capitalize">{profile.subscription_tier}</span>
          </div>

          {/* Billing */}
          {profile.subscription_tier !== 'free' && (
            <div className="config-item" onClick={handleManageBilling}>
              <span className="config-label">Manage Billing</span>
              <span className="config-value">Portal →</span>
            </div>
          )}

          {/* Sign Out */}
          <div className="config-item" onClick={() => {
            fetch('/auth/callback?action=signout').then(() => router.push('/login'));
          }}>
            <span className="config-label text-red-400">Sign Out</span>
            <SignOut className="w-4 h-4 text-red-400" />
          </div>
        </div>
      </div>
    );
  }

  // ── Configuration Detail View ──
  if (view === 'configuration') {
    return (
      <div className="space-y-0">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => setView('grid')} className="p-1">
            <CaretLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold">Configuration</h1>
        </div>

        <div className="config-section-header">Category/Repeat</div>
        <div className="config-item" onClick={() => router.push('/dashboard/categories')}>
          <span className="config-label">Income Category Setting</span>
          <span className="config-value">→</span>
        </div>
        <div className="config-item" onClick={() => router.push('/dashboard/categories')}>
          <span className="config-label">Expenses Category Setting</span>
          <span className="config-value">→</span>
        </div>
        <div className="config-item" onClick={() => toast('Subcategory toggle coming soon')}>
          <span className="config-label">Subcategory</span>
          <span className="config-value">ON</span>
        </div>
        <div className="config-item" onClick={() => router.push('/dashboard/budgets')}>
          <span className="config-label">Budget Setting</span>
          <span className="config-value">→</span>
        </div>
        <div className="config-item" onClick={() => router.push('/dashboard/bills')}>
          <span className="config-label">Repeat Setting</span>
          <span className="config-value">→</span>
        </div>

        <div className="config-section-header">Configuration</div>
        <div className="config-item">
          <span className="config-label">Main Currency Setting</span>
          <select
            value={profile.default_currency}
            onChange={e => { update('default_currency', e.target.value); saveProfile(); }}
            className="config-value bg-transparent border-none outline-none text-right cursor-pointer"
          >
            {Object.values(CURRENCIES).map(c => (
              <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
            ))}
          </select>
        </div>
        <div className="config-item">
          <span className="config-label">Date Format</span>
          <select
            value={profile.date_format}
            onChange={e => { update('date_format', e.target.value); saveProfile(); }}
            className="config-value bg-transparent border-none outline-none text-right cursor-pointer"
          >
            {['YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY', 'MMM D, YYYY'].map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
        <div className="config-item">
          <span className="config-label">Monthly Start Date</span>
          <span className="config-value">Every 1</span>
        </div>
        <div className="config-item">
          <span className="config-label">Weekly Start Day</span>
          <select
            value={profile.first_day_of_week}
            onChange={e => { update('first_day_of_week', Number(e.target.value)); saveProfile(); }}
            className="config-value bg-transparent border-none outline-none text-right cursor-pointer"
          >
            <option value={0}>Sunday</option>
            <option value={1}>Monday</option>
            <option value={6}>Saturday</option>
          </select>
        </div>

        <div className="config-section-header">Display</div>
        <div className="config-item" onClick={() => {
          const themes = ['light', 'dark', 'system'];
          const current = themes.indexOf(theme || 'system');
          setTheme(themes[(current + 1) % themes.length]);
        }}>
          <span className="config-label">Theme</span>
          <span className="config-value capitalize">{theme}</span>
        </div>
        <div className="config-item" onClick={() => { toggle('show_balance'); saveProfile(); }}>
          <span className="config-label">Show Balance</span>
          <span className="config-value">{profile.show_balance ? 'ON' : 'OFF'}</span>
        </div>
        <div className="config-item" onClick={() => { toggle('compact_mode'); saveProfile(); }}>
          <span className="config-label">Compact Mode</span>
          <span className="config-value">{profile.compact_mode ? 'ON' : 'OFF'}</span>
        </div>

        <div className="config-section-header">AI</div>
        <div className="config-item" onClick={() => { toggle('ai_enabled'); saveProfile(); }}>
          <span className="config-label">AI Assistant</span>
          <span className="config-value">{profile.ai_enabled ? 'ON' : 'OFF'}</span>
        </div>
        <div className="config-item" onClick={() => { toggle('ai_auto_categorize'); saveProfile(); }}>
          <span className="config-label">Auto-Categorize</span>
          <span className="config-value">{profile.ai_auto_categorize ? 'ON' : 'OFF'}</span>
        </div>
        <div className="config-item" onClick={() => { toggle('ai_suggestions'); saveProfile(); }}>
          <span className="config-label">AI Suggestions</span>
          <span className="config-value">{profile.ai_suggestions ? 'ON' : 'OFF'}</span>
        </div>

        <div className="config-section-header">Other</div>
        <div className="config-item" onClick={() => setView('passcode')}>
          <span className="config-label">Passcode</span>
          <span className="config-value">{hasPin ? 'ON' : 'OFF'}</span>
        </div>
        <div className="config-item" onClick={exportData}>
          <span className="config-label">Export Data</span>
          <span className="config-value">CSV →</span>
        </div>
        <div className="config-item" onClick={() => router.push('/dashboard/import-export')}>
          <span className="config-label">Import Data</span>
          <span className="config-value">→</span>
        </div>

        {/* Save button */}
        <div className="p-4">
          <motion.button
            onClick={saveProfile}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60"
            whileTap={{ scale: 0.97 }}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </motion.button>
        </div>
      </div>
    );
  }

  // ── Passcode View ──
  if (view === 'passcode') {
    return (
      <div className="space-y-0">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => setView('grid')} className="p-1">
            <CaretLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold">Passcode</h1>
        </div>

        <div className="px-4 py-6 space-y-4">
          {hasPin ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3">
                <span className="text-sm font-medium text-emerald-500">PIN Protection Active</span>
                <button onClick={removePin} className="text-sm text-red-400">Remove PIN</button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Set a 4-digit PIN to lock the app.</p>
              <div className="underline-field">
                <label>PIN Code</label>
                <input
                  type="password"
                  maxLength={4}
                  placeholder="0000"
                  value={pinInput}
                  onChange={e => setPinInput(e.target.value.replace(/\D/g, ''))}
                  className="text-center tracking-[0.5em]"
                />
              </div>
              <motion.button
                onClick={savePin}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
                whileTap={{ scale: 0.97 }}
              >
                Set PIN
              </motion.button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
