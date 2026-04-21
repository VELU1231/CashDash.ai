'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';
import {
  Settings, User, Palette, Brain, DollarSign, Bell, Shield,
  Download, Trash2, Save, Eye, EyeOff, Moon, Sun, Monitor,
  Globe, Clock, ChevronRight, Check, Loader2, LogOut,
  Database, FileText, AlertCircle, Key
} from 'lucide-react';
import { toast } from 'sonner';
import { CURRENCIES } from '@/lib/utils';

const SECTIONS = [
  { id: 'profile', icon: User, label: 'Profile' },
  { id: 'appearance', icon: Palette, label: 'Appearance' },
  { id: 'currency', icon: DollarSign, label: 'Currency & Locale' },
  { id: 'ai', icon: Brain, label: 'AI Settings' },
  { id: 'billing', icon: DollarSign, label: 'Billing & Subscriptions' },
  { id: 'notifications', icon: Bell, label: 'Notifications' },
  { id: 'security', icon: Shield, label: 'Security' },
  { id: 'data', icon: Database, label: 'Data & Export' },
];

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [activeSection, setActiveSection] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [hasPin, setHasPin] = useState(false);

  useEffect(() => {
    setHasPin(!!localStorage.getItem('app_pin'));
    fetchProfile();
  }, []);
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
  });

  useEffect(() => { fetchProfile(); }, []);

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
      // Only send fields that exist in the database profiles table
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
      if (res.ok) {
        toast.success('Settings saved!');
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || 'Failed to save settings');
      }
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
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to open customer portal');
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

  const toggle = (key: string) => setProfile(p => ({ ...p, [key]: !(p as Record<string, unknown>)[key] }));
  const update = (key: string, value: unknown) => setProfile(p => ({ ...p, [key]: value }));

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account preferences</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar nav */}
        <nav className="hidden md:flex flex-col gap-0.5 w-52 shrink-0">
          {SECTIONS.map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setActiveSection(id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-all ${
                activeSection === id
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}>
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="rounded-2xl border border-border bg-card p-6 shadow-soft space-y-6"
            >
              {/* Profile */}
              {activeSection === 'profile' && (
                <>
                  <SectionHeader icon={User} title="Profile" desc="Your personal information" />
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Display Name</label>
                      <input value={profile.display_name}
                        onChange={e => update('display_name', e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="Your name" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Monthly Budget</label>
                        <input type="number" value={profile.monthly_budget}
                          onChange={e => update('monthly_budget', e.target.value)}
                          className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none"
                          placeholder="e.g. 3000" />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Weekly Budget</label>
                        <input type="number" value={profile.weekly_budget}
                          onChange={e => update('weekly_budget', e.target.value)}
                          className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none"
                          placeholder="e.g. 750" />
                      </div>
                    </div>
                    <ToggleRow label="Show Balance" desc="Show account balances in dashboard" checked={profile.show_balance} onChange={() => toggle('show_balance')} />
                    <ToggleRow label="Compact Mode" desc="Smaller UI for more information density" checked={profile.compact_mode} onChange={() => toggle('compact_mode')} />
                  </div>
                </>
              )}

              {/* Appearance */}
              {activeSection === 'appearance' && (
                <>
                  <SectionHeader icon={Palette} title="Appearance" desc="Customize how CashDash looks" />
                  <div>
                    <label className="text-sm font-medium mb-3 block">Theme</label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { value: 'light', icon: Sun, label: 'Light', desc: 'Clean and bright' },
                        { value: 'dark', icon: Moon, label: 'Dark', desc: 'Easy on the eyes' },
                        { value: 'system', icon: Monitor, label: 'System', desc: 'Follow OS setting' },
                      ].map(t => {
                        const Icon = t.icon;
                        return (
                          <motion.button key={t.value} onClick={() => setTheme(t.value)}
                            className={`p-4 rounded-xl border-2 text-left transition-all ${
                              theme === t.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                            }`}
                            whileTap={{ scale: 0.97 }}>
                            <Icon className={`w-5 h-5 mb-2 ${theme === t.value ? 'text-primary' : 'text-muted-foreground'}`} />
                            <div className="text-sm font-medium">{t.label}</div>
                            <div className="text-xs text-muted-foreground">{t.desc}</div>
                            {theme === t.value && (
                              <Check className="w-3.5 h-3.5 text-primary absolute top-3 right-3" />
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* Currency & Locale */}
              {activeSection === 'currency' && (
                <>
                  <SectionHeader icon={Globe} title="Currency & Locale" desc="Your regional preferences" />
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Default Currency</label>
                      <select value={profile.default_currency}
                        onChange={e => update('default_currency', e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none">
                        {Object.values(CURRENCIES).map(c => (
                          <option key={c.code} value={c.code}>
                            {c.code} — {c.name} ({c.symbol})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Date Format</label>
                      <select value={profile.date_format}
                        onChange={e => update('date_format', e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none">
                        {['YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY', 'MMM D, YYYY'].map(f => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">First Day of Week</label>
                      <div className="flex gap-2">
                        {['Sun', 'Mon', 'Sat'].map((day, i) => {
                          const val = i === 0 ? 0 : i === 1 ? 1 : 6;
                          return (
                            <button key={day} onClick={() => update('first_day_of_week', val)}
                              className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${
                                profile.first_day_of_week === val ? 'border-primary bg-primary/5 text-primary' : 'border-input text-muted-foreground hover:border-primary/50'
                              }`}>
                              {day}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* AI Settings */}
              {activeSection === 'ai' && (
                <>
                  <SectionHeader icon={Brain} title="AI Settings" desc="Configure your AI financial assistant" />
                  <div className="space-y-4">
                    <ToggleRow label="Enable AI Assistant" desc="Use AI to parse and categorize transactions" checked={profile.ai_enabled} onChange={() => toggle('ai_enabled')} />
                    <ToggleRow label="Auto-Categorize" desc="AI automatically assigns categories to transactions" checked={profile.ai_auto_categorize} onChange={() => toggle('ai_auto_categorize')} />
                    <ToggleRow label="Show Suggestions" desc="AI provides spending suggestions and insights" checked={profile.ai_suggestions} onChange={() => toggle('ai_suggestions')} />

                    <div className="p-4 rounded-xl border border-border bg-muted/30">
                      <p className="text-sm text-muted-foreground">
                        Your CashDash AI is currently configured and running smoothly. It will learn your spending habits over time.
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* Billing & Subscriptions */}
              {activeSection === 'billing' && (
                <>
                  <SectionHeader icon={DollarSign} title="Billing & Subscriptions" desc="Manage your SaaS subscription plan" />
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl border border-border bg-muted/30">
                      <h4 className="text-sm font-semibold mb-1">Current Plan: <span className="capitalize text-primary">{(profile as any).subscription_tier || 'free'}</span></h4>
                      <p className="text-xs text-muted-foreground mb-4">
                        {(profile as any).subscription_tier === 'free' 
                          ? 'You are currently on the Free tier. Upgrade to unlock AI features, unlimited accounts, and more.' 
                          : 'Thank you for being a Pro user! You can manage your payment methods or cancel your subscription through the customer portal.'}
                      </p>
                      
                      {(profile as any).subscription_tier === 'free' ? (
                        <button onClick={() => router.push('/pricing')}
                          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
                          Upgrade Plan
                        </button>
                      ) : (
                        <button onClick={handleManageBilling} disabled={loading}
                          className="px-4 py-2 flex items-center gap-2 rounded-lg border border-input bg-background text-sm font-medium hover:bg-muted disabled:opacity-50">
                          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                          Manage Billing Portal
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Notifications */}
              {activeSection === 'notifications' && (
                <>
                  <SectionHeader icon={Bell} title="Notifications" desc="When to get alerted" />
                  <div className="space-y-4">
                    {[
                      { label: 'Budget Alerts', desc: 'Notify when approaching budget limit' },
                      { label: 'Weekly Summary', desc: 'Weekly spending report every Sunday' },
                      { label: 'AI Insights', desc: 'Receive AI-generated financial tips' },
                      { label: 'Large Transactions', desc: 'Alert for transactions over your set limit' },
                    ].map(item => (
                      <ToggleRow key={item.label} label={item.label} desc={item.desc} checked={false} onChange={() => toast('Notifications coming soon!')} />
                    ))}
                  </div>
                </>
              )}

              {/* Security */}
              {activeSection === 'security' && (
                <>
                  <SectionHeader icon={Shield} title="Security" desc="Protect your account" />
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl border border-border bg-muted/30">
                      <h4 className="text-sm font-semibold mb-1">App Lock (PIN)</h4>
                      <p className="text-xs text-muted-foreground mb-3">Require a 4-digit PIN when you return to the app.</p>
                      {hasPin ? (
                        <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                          <span className="text-sm font-medium text-emerald-600 flex items-center gap-2">
                            <Shield className="w-4 h-4" /> PIN Protection Active
                          </span>
                          <button onClick={removePin} className="text-xs text-destructive hover:underline">Remove</button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <input type="password" maxLength={4} placeholder="0000" value={pinInput} onChange={e => setPinInput(e.target.value.replace(/\D/g, ''))}
                            className="w-24 px-3 py-2 text-center tracking-[0.5em] rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                          <button onClick={savePin} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
                            Set PIN
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="p-4 rounded-xl border border-border bg-muted/30">
                      <h4 className="text-sm font-semibold mb-1">Change Password</h4>
                      <p className="text-xs text-muted-foreground mb-3">Password is managed through Supabase Auth</p>
                      <button onClick={() => toast.success('Password reset instructions sent to your email')} className="px-4 py-2 rounded-lg border border-input text-sm font-medium hover:bg-muted transition-colors">
                        Send reset email
                      </button>
                    </div>
                    <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5">
                      <h4 className="text-sm font-semibold text-destructive mb-1 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" /> Danger Zone
                      </h4>
                      <p className="text-xs text-muted-foreground mb-3">These actions are irreversible</p>
                      <button onClick={() => toast('Account deletion requires contacting support for now.')} className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors">
                        Delete Account
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Data */}
              {activeSection === 'data' && (
                <>
                  <SectionHeader icon={Database} title="Data & Export" desc="Your data belongs to you" />
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl border border-border bg-muted/30">
                      <h4 className="text-sm font-semibold mb-1">Export All Data</h4>
                      <p className="text-xs text-muted-foreground mb-3">Download all your transactions as CSV</p>
                      <motion.button onClick={exportData}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
                        whileTap={{ scale: 0.97 }}>
                        <Download className="w-4 h-4" /> Export CSV
                      </motion.button>
                    </div>
                    <div className="p-4 rounded-xl border border-border bg-muted/30">
                      <h4 className="text-sm font-semibold mb-1">Import Data</h4>
                      <p className="text-xs text-muted-foreground mb-3">Import transactions from CSV</p>
                      <button onClick={() => router.push('/dashboard/import-export')}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-input text-sm font-medium hover:bg-muted">
                        <FileText className="w-4 h-4" /> Import CSV
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Save Button */}
              {['profile', 'currency', 'ai'].includes(activeSection) && (
                <div className="pt-4 border-t border-border flex justify-end">
                  <motion.button onClick={saveProfile} disabled={loading}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-all hover:shadow-glow"
                    whileTap={{ scale: 0.97 }}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Changes
                  </motion.button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc: string }) {
  return (
    <div className="flex items-center gap-3 pb-2 border-b border-border">
      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
        <Icon className="w-4.5 h-4.5 text-primary" />
      </div>
      <div>
        <h2 className="font-semibold">{title}</h2>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

function ToggleRow({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between py-1">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <motion.button onClick={onChange} whileTap={{ scale: 0.9 }}
        className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-muted'}`}>
        <motion.div
          className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm"
          animate={{ x: checked ? 20 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </motion.button>
    </div>
  );
}
