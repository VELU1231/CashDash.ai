'use client';

import { useState, useEffect } from 'react';
import { BookTemplate, Plus, Play, Edit3, Trash2, CalendarClock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency, formatRelativeDate } from '@/lib/utils';
import { toast } from 'sonner';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);
  const [form, setForm] = useState<any>({
    name: '', type: 'expense', amount: '', currency: 'USD', description: '',
    category_id: '', account_id: '', dest_account_id: '', schedule_type: 'monthly'
  });
  const [saving, setSaving] = useState(false);
  const [executing, setExecuting] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tplRes, accRes, catRes, profileRes] = await Promise.all([
        fetch('/api/templates').then(r => r.json()),
        fetch('/api/accounts').then(r => r.json()),
        fetch('/api/categories').then(r => r.json()),
        fetch('/api/profile').then(r => r.json()),
      ]);
      setTemplates(tplRes.data || []);
      setAccounts(accRes.data || []);
      setCategories(catRes.data || []);
      setProfile(profileRes.data || null);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async () => {
    if (!form.name || !form.account_id) { toast.error('Name and Account are required'); return; }
    setSaving(true);
    try {
      const method = editingTemplate ? 'PUT' : 'POST';
      const url = editingTemplate ? `/api/templates/${editingTemplate.id}` : '/api/templates';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(editingTemplate ? 'Template updated' : 'Template created');
      fetchData();
      setShowForm(false);
      setEditingTemplate(null);
      setForm({ name: '', type: 'expense', amount: '', currency: 'USD', description: '', category_id: '', account_id: '', dest_account_id: '', schedule_type: 'monthly' });
    } catch (e: any) {
      toast.error(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    try {
      await fetch(`/api/templates/${id}`, { method: 'DELETE' });
      toast.success('Template deleted');
      fetchData();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const executeTemplate = async (id: string) => {
    setExecuting(id);
    try {
      const res = await fetch(`/api/templates/${id}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Transaction created successfully!');
      fetchData(); // to update last_executed_at
    } catch (e: any) {
      toast.error(e.message || 'Failed to execute template');
    } finally {
      setExecuting(null);
    }
  };

  const filteredCategories = categories.filter(c => c.type === form.type);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {profile?.subscription_tier === 'free' && process.env.NODE_ENV !== 'development' ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-amber-500/20 bg-amber-500/5 shadow-soft p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
            <BookTemplate className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Templates are a Pro Feature</h2>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            Upgrade to the Pro tier to create recurring transaction templates and save time logging your bills and salaries.
          </p>
          <a href="/pricing" className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
            View Pricing
          </a>
        </motion.div>
      ) : (
        <>
          <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Templates</h1>
          <p className="text-sm text-muted-foreground">Manage recurring and frequent transactions</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all hover:shadow-glow">
          <Plus className="w-4 h-4" />
          Create Template
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-32 rounded-xl bg-card border border-border shimmer-bg" />)}
        </div>
      ) : templates.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card shadow-soft p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <BookTemplate className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No Templates Yet</h2>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            Create templates for bills, subscriptions, or salaries to quickly log them with one click.
          </p>
          <button onClick={() => setShowForm(true)} className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
            Create First Template
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(tpl => (
            <motion.div key={tpl.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card p-4 hover:shadow-soft transition-shadow flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-lg">
                    {tpl.category?.icon || (tpl.type === 'income' ? '💰' : tpl.type === 'expense' ? '💸' : '↔️')}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm line-clamp-1">{tpl.name}</h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><CalendarClock className="w-3 h-3"/> {tpl.schedule_type}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditingTemplate(tpl); setForm({ ...tpl, amount: tpl.amount ? (tpl.amount / 100).toString() : '', category_id: tpl.category_id || '', account_id: tpl.account_id || '', dest_account_id: tpl.dest_account_id || '' }); setShowForm(true); }} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md"><Edit3 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => deleteTemplate(tpl.id)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <div className="mt-auto">
                <div className="flex items-center justify-between text-sm mt-4 mb-3 bg-muted/50 p-2 rounded-lg">
                  <div className="text-xs text-muted-foreground">{tpl.account?.name}</div>
                  <div className={`font-semibold ${tpl.type === 'income' ? 'text-emerald-500' : tpl.type === 'expense' ? 'text-red-500' : 'text-blue-500'}`}>
                    {tpl.amount ? formatCurrency(tpl.amount, tpl.currency) : 'Variable'}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-[10px] text-muted-foreground">
                    {tpl.last_executed_at ? `Last run: ${formatRelativeDate(tpl.last_executed_at)}` : 'Never run'}
                  </div>
                  <button 
                    onClick={() => executeTemplate(tpl.id)}
                    disabled={executing === tpl.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors disabled:opacity-50"
                  >
                    {executing === tpl.id ? <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : <Play className="w-3 h-3 fill-primary" />}
                    Run Now
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <motion.div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl p-6 max-h-[90vh] overflow-y-auto" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-5">{editingTemplate ? 'Edit Template' : 'New Template'}</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Template Name *</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" placeholder="e.g. Monthly Netflix" />
              </div>
              
              <div className="flex bg-muted/50 p-1 rounded-xl">
                {(['expense', 'income', 'transfer'] as const).map(t => (
                  <button key={t} type="button" onClick={() => setForm({ ...form, type: t, category_id: '' })} className={`flex-1 py-1.5 text-xs font-medium capitalize rounded-lg transition-all ${form.type === t ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}>{t}</button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Amount (Optional)</label>
                  <input type="number" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" placeholder="Leave empty if variable" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Currency</label>
                  <select value={form.currency} onChange={e => setForm({...form, currency: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
                    {['USD','PHP','EUR','GBP','JPY'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">{form.type === 'transfer' ? 'From Account' : 'Account'} *</label>
                <select value={form.account_id} onChange={e => setForm({...form, account_id: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
                  <option value="">Select Account</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>

              {form.type === 'transfer' ? (
                <div>
                  <label className="text-sm font-medium mb-1 block">To Account *</label>
                  <select value={form.dest_account_id} onChange={e => setForm({...form, dest_account_id: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
                    <option value="">Select Account</option>
                    {accounts.filter(a => a.id !== form.account_id).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="text-sm font-medium mb-1 block">Category</label>
                  <select value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
                    <option value="">No Category</option>
                    {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="text-sm font-medium mb-1 block">Schedule</label>
                <select value={form.schedule_type} onChange={e => setForm({...form, schedule_type: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
                  <option value="manual">Manual (On-demand)</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
                <p className="text-[10px] text-muted-foreground mt-1">Note: Automated execution requires cron job setup. Use "Run Now" to execute manually.</p>
              </div>

              <div className="flex gap-3 pt-4 border-t border-border mt-6">
                <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-xl border border-input font-medium hover:bg-muted text-sm">Cancel</button>
                <button onClick={saveTemplate} disabled={saving} className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 shadow-md text-sm disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save Template'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
