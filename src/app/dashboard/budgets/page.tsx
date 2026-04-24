'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, ChartBar, Target, X, CircleNotch, FloppyDisk,
  PencilSimple, TrashSimple, Warning
} from '@phosphor-icons/react';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth } from 'date-fns';

interface Budget {
  id: string;
  name: string;
  category_id: string | null;
  amount: number;
  currency: string;
  period: string;
  icon: string;
  color: string;
  is_active: boolean;
  notes: string | null;
  // computed
  spent?: number;
  remaining?: number;
  percentage?: number;
  category?: { name: string; icon: string; color: string };
}

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: string;
}

const PERIOD_LABELS: Record<string, string> = {
  weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly',
};

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7', '#ec4899', '#06b6d4', '#f97316'];

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState('PHP');
  const [showForm, setShowForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  const [form, setForm] = useState({
    name: '',
    category_id: '',
    amount: '',
    period: 'monthly',
    icon: '📊',
    color: '#10b981',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [budgetsRes, catRes, profileRes] = await Promise.all([
        fetch('/api/budgets').then(r => r.json()),
        fetch('/api/categories').then(r => r.json()),
        fetch('/api/profile').then(r => r.json()),
      ]);
      const cats: Category[] = (catRes.data || []).filter((c: Category) => c.type === 'expense');
      setCategories(cats);
      setCurrency(profileRes.data?.default_currency || 'PHP');

      // Compute spending for each budget
      const now = new Date();
      const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');

      const txRes = await fetch(`/api/transactions?date_from=${monthStart}&date_to=${monthEnd}&type=expense&limit=200`);
      const txData = await txRes.json();
      const transactions = txData.data || [];

      const rawBudgets: Budget[] = budgetsRes.data || [];
      const enriched = rawBudgets.map((b: Budget) => {
        const relatedTxs = b.category_id
          ? transactions.filter((t: any) => t.category_id === b.category_id)
          : transactions;
        const spent = relatedTxs.reduce((s: number, t: any) => s + t.amount, 0);
        const remaining = b.amount - spent;
        const percentage = b.amount > 0 ? Math.min(100, Math.round((spent / b.amount) * 100)) : 0;
        return { ...b, spent, remaining, percentage };
      });

      setBudgets(enriched);
    } catch (err) {
      toast.error('Failed to load budgets');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingBudget(null);
    setForm({ name: '', category_id: '', amount: '', period: 'monthly', icon: '📊', color: '#10b981', notes: '' });
    setShowForm(true);
  };

  const openEdit = (b: Budget) => {
    setEditingBudget(b);
    setForm({
      name: b.name,
      category_id: b.category_id || '',
      amount: (b.amount / 100).toFixed(2),
      period: b.period,
      icon: b.icon,
      color: b.color,
      notes: b.notes || '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(form.amount);
    if (isNaN(amountNum) || amountNum <= 0) { toast.error('Enter a valid amount'); return; }

    setSaving(true);
    try {
      const payload = {
        name: form.name || (categories.find(c => c.id === form.category_id)?.name || 'Budget'),
        category_id: form.category_id || null,
        amount: Math.round(amountNum * 100),
        currency,
        period: form.period,
        icon: form.icon,
        color: form.color,
        notes: form.notes || null,
        is_active: true,
      };

      const url = editingBudget ? `/api/budgets/${editingBudget.id}` : '/api/budgets';
      const method = editingBudget ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(editingBudget ? 'Budget updated!' : 'Budget created!');
      setShowForm(false);
      loadAll();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save budget');
    } finally {
      setSaving(false);
    }
  };

  const deleteBudget = async (id: string) => {
    try {
      await fetch(`/api/budgets/${id}`, { method: 'DELETE' });
      setBudgets(prev => prev.filter(b => b.id !== id));
      toast.success('Budget deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const totalBudgeted = budgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent = budgets.reduce((s, b) => s + (b.spent || 0), 0);
  const overBudgetCount = budgets.filter(b => (b.spent || 0) > b.amount).length;

  return (
    <div className="mobile-page">
      <div className="mobile-page-header">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight">Budgets</h1>
          <p className="text-sm text-muted-foreground mt-1 font-mono">{format(new Date(), 'MMMM yyyy')} spending limits</p>
        </div>
        <div className="mobile-page-actions w-full sm:w-auto sm:justify-end">
          <motion.button onClick={openCreate} className="btn-primary !w-full !rounded-2xl sm:!w-auto"
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Plus className="w-4 h-4" weight="bold" /> New Budget
          </motion.button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: 'Total Budgeted', value: formatCurrency(totalBudgeted, currency), icon: ChartBar, color: '#3b82f6', bg: 'rgba(59,130,246,0.08)' },
          { label: 'Total Spent', value: formatCurrency(totalSpent, currency), icon: Target, color: totalSpent > totalBudgeted ? '#ef4444' : '#10b981', bg: totalSpent > totalBudgeted ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)' },
          { label: 'Over Budget', value: `${overBudgetCount} budget${overBudgetCount !== 1 ? 's' : ''}`, icon: Warning, color: overBudgetCount > 0 ? '#f59e0b' : '#10b981', bg: overBudgetCount > 0 ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.08)' },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <motion.div key={stat.label} className="stat-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="p-2.5 rounded-xl inline-flex mb-3" style={{ background: stat.bg }}>
                <Icon className="w-4 h-4" style={{ color: stat.color }} />
              </div>
              <div className="text-xl font-serif font-bold editorial-number">{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
            </motion.div>
          );
        })}
      </div>

      {/* Budget List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="glass-card h-24 shimmer-bg rounded-2xl" />)}
        </div>
      ) : budgets.length === 0 ? (
        <motion.div className="text-center py-16" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-primary/5">
            <ChartBar className="w-8 h-8 text-muted-foreground" weight="light" />
          </div>
          <h3 className="font-serif font-semibold text-lg mb-2">No budgets yet</h3>
          <p className="text-sm text-muted-foreground mb-5">Set monthly spending limits per category to stay on track</p>
          <motion.button onClick={openCreate} className="btn-primary !rounded-xl" whileTap={{ scale: 0.97 }}>
            <Plus className="w-4 h-4" /> Create First Budget
          </motion.button>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {budgets.map((b, i) => {
            const pct = b.percentage || 0;
            const isOver = (b.spent || 0) > b.amount;
            const isWarning = pct >= 80 && !isOver;
            const barColor = isOver ? '#ef4444' : isWarning ? '#f59e0b' : b.color;

            return (
              <motion.div key={b.id} className="glass-card p-5"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}>
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
                    style={{ background: `${b.color}15` }}>
                    {b.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <span className="font-semibold text-sm">{b.name}</span>
                        <span className="ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {PERIOD_LABELS[b.period]}
                        </span>
                        {isOver && (
                          <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-500">OVER</span>
                        )}
                        {isWarning && (
                          <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500">WARNING</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => openEdit(b)}
                          className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                          <PencilSimple className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteBudget(b.id)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors text-muted-foreground hover:text-red-400">
                          <TrashSimple className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
                      <motion.div className="h-full rounded-full"
                        style={{ background: barColor }}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, pct)}%` }}
                        transition={{ delay: 0.1 + i * 0.05, duration: 0.6, ease: [0.4, 0, 0.2, 1] }} />
                    </div>

                    {/* Amounts */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        Spent: <strong className="text-foreground">{formatCurrency(b.spent || 0, currency)}</strong>
                      </span>
                      <span className={`font-mono font-semibold ${isOver ? 'text-red-400' : 'text-muted-foreground'}`}>
                        {pct}% of {formatCurrency(b.amount, currency)}
                      </span>
                      <span className={`text-muted-foreground ${isOver ? 'text-red-400' : ''}`}>
                        {isOver ? 'Over by' : 'Left'}: <strong>{formatCurrency(Math.abs(b.remaining || 0), currency)}</strong>
                      </span>
                    </div>

                    {b.notes && <p className="text-[11px] text-muted-foreground mt-1.5 italic">{b.notes}</p>}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'hsl(var(--background) / 0.7)', backdropFilter: 'blur(16px)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowForm(false)}>
            <motion.div className="float-panel w-full max-w-md mx-4 p-6"
              initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-serif font-semibold">{editingBudget ? 'Edit Budget' : 'New Budget'}</h3>
                <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Category (optional)</label>
                  <select value={form.category_id} onChange={e => {
                    const cat = categories.find(c => c.id === e.target.value);
                    setForm(f => ({
                      ...f,
                      category_id: e.target.value,
                      icon: cat ? cat.icon : f.icon,
                      color: cat ? cat.color : f.color,
                      name: cat ? cat.name : f.name,
                    }));
                  }}
                    className="w-full px-3 py-2.5 rounded-xl text-sm border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="">All Expenses (no category limit)</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Budget Name</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl text-sm border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="e.g. Food & Dining" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Limit Amount *</label>
                    <input type="number" step="0.01" required value={form.amount}
                      onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl text-sm border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="5000" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Period</label>
                    <select value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl text-sm border border-input bg-background focus:outline-none">
                      {Object.entries(PERIOD_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Color</label>
                  <div className="flex gap-2 flex-wrap">
                    {COLORS.map(c => (
                      <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                        className={`w-7 h-7 rounded-full transition-all ${form.color === c ? 'ring-2 ring-offset-2 ring-foreground scale-110' : ''}`}
                        style={{ background: c }} />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Notes (optional)</label>
                  <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl text-sm border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Any notes about this budget..." />
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1 !rounded-xl">Cancel</button>
                  <motion.button type="submit" disabled={saving} className="btn-primary flex-1 !rounded-xl disabled:opacity-50" whileTap={{ scale: 0.97 }}>
                    {saving ? <CircleNotch className="w-4 h-4 animate-spin" /> : <FloppyDisk className="w-4 h-4" />}
                    {saving ? 'Saving...' : editingBudget ? 'Update' : 'Create Budget'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

