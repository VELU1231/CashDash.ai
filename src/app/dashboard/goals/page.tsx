'use client';
export const runtime = 'edge';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, PiggyBank, X, CircleNotch, FloppyDisk,
  PencilSimple, TrashSimple, CheckCircle, Target
} from '@phosphor-icons/react';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { format, parseISO, differenceInDays } from 'date-fns';

interface SavingsGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  currency: string;
  icon: string;
  color: string;
  target_date: string | null;
  is_completed: boolean;
  notes: string | null;
}

const GOAL_ICONS = ['🐷', '🏠', '✈️', '🎓', '🚗', '💍', '💻', '🎮', '🏖️', '💰', '🏋️', '🎸'];
const COLORS = ['#ec4899', '#10b981', '#3b82f6', '#f59e0b', '#a855f7', '#ef4444', '#06b6d4', '#f97316'];

export default function GoalsPage() {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [currency, setCurrency] = useState('PHP');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [addingFunds, setAddingFunds] = useState<SavingsGoal | null>(null);
  const [fundAmount, setFundAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', target_amount: '', current_amount: '0',
    icon: '🐷', color: '#ec4899', target_date: '', notes: '',
  });

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [goalsRes, profileRes] = await Promise.all([
        fetch('/api/goals').then(r => r.json()),
        fetch('/api/profile').then(r => r.json()),
      ]);
      setGoals(goalsRes.data || []);
      setCurrency(profileRes.data?.default_currency || 'PHP');
    } catch { toast.error('Failed to load goals'); }
    finally { setLoading(false); }
  };

  const openCreate = () => {
    setEditingGoal(null);
    setForm({ name: '', target_amount: '', current_amount: '0', icon: '🐷', color: '#ec4899', target_date: '', notes: '' });
    setShowForm(true);
  };

  const openEdit = (g: SavingsGoal) => {
    setEditingGoal(g);
    setForm({
      name: g.name,
      target_amount: (g.target_amount / 100).toFixed(2),
      current_amount: (g.current_amount / 100).toFixed(2),
      icon: g.icon, color: g.color,
      target_date: g.target_date || '',
      notes: g.notes || '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseFloat(form.target_amount);
    if (isNaN(target) || target <= 0) { toast.error('Enter a valid target amount'); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name, target_amount: form.target_amount,
        current_amount: form.current_amount || '0',
        icon: form.icon, color: form.color, currency,
        target_date: form.target_date || null,
        notes: form.notes || null,
      };
      const url = editingGoal ? `/api/goals/${editingGoal.id}` : '/api/goals';
      const method = editingGoal ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(editingGoal ? 'Goal updated!' : 'Goal created!');
      setShowForm(false);
      loadAll();
    } catch (err: any) { toast.error(err.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const addFunds = async () => {
    if (!addingFunds || !fundAmount) return;
    const add = parseFloat(fundAmount);
    if (isNaN(add) || add <= 0) { toast.error('Enter a valid amount'); return; }
    setSaving(true);
    try {
      const newAmount = (addingFunds.current_amount / 100) + add;
      const isCompleted = newAmount >= addingFunds.target_amount / 100;
      const res = await fetch(`/api/goals/${addingFunds.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_amount: newAmount.toFixed(2), is_completed: isCompleted }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (isCompleted) toast.success(`🎉 Goal "${addingFunds.name}" completed!`);
      else toast.success(`Added ${formatCurrency(add * 100, currency)} to "${addingFunds.name}"`);
      setAddingFunds(null);
      setFundAmount('');
      loadAll();
    } catch (err: any) { toast.error(err.message || 'Failed to add funds'); }
    finally { setSaving(false); }
  };

  const deleteGoal = async (id: string) => {
    await fetch(`/api/goals/${id}`, { method: 'DELETE' });
    setGoals(prev => prev.filter(g => g.id !== id));
    toast.success('Goal deleted');
  };

  const totalSaved = goals.reduce((s, g) => s + g.current_amount, 0);
  const totalTarget = goals.reduce((s, g) => s + g.target_amount, 0);
  const completedCount = goals.filter(g => g.is_completed).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight">Savings Goals</h1>
          <p className="text-sm text-muted-foreground mt-1 font-mono">
            {goals.length} goals · {completedCount} completed
          </p>
        </div>
        <motion.button onClick={openCreate} className="btn-primary !rounded-xl"
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Plus className="w-4 h-4" weight="bold" /> New Goal
        </motion.button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Saved', value: formatCurrency(totalSaved, currency), icon: PiggyBank, color: '#ec4899', bg: 'rgba(236,72,153,0.08)' },
          { label: 'Total Target', value: formatCurrency(totalTarget, currency), icon: Target, color: '#3b82f6', bg: 'rgba(59,130,246,0.08)' },
          { label: 'Completed', value: `${completedCount} / ${goals.length}`, icon: CheckCircle, color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <motion.div key={stat.label} className="stat-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="p-2.5 rounded-xl inline-flex mb-3" style={{ background: stat.bg }}>
                <Icon className="w-4 h-4" style={{ color: stat.color }} weight="regular" />
              </div>
              <div className="text-xl font-serif font-bold editorial-number">{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
            </motion.div>
          );
        })}
      </div>

      {/* Goals Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="glass-card h-40 shimmer-bg rounded-2xl" />)}
        </div>
      ) : goals.length === 0 ? (
        <motion.div className="text-center py-16" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-primary/5 text-3xl">🐷</div>
          <h3 className="font-serif font-semibold text-lg mb-2">No savings goals yet</h3>
          <p className="text-sm text-muted-foreground mb-5">Set goals for vacation, emergency fund, or big purchases</p>
          <motion.button onClick={openCreate} className="btn-primary !rounded-xl" whileTap={{ scale: 0.97 }}>
            <Plus className="w-4 h-4" /> Create First Goal
          </motion.button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {goals.map((goal, i) => {
            const pct = goal.target_amount > 0 ? Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100)) : 0;
            const remaining = goal.target_amount - goal.current_amount;
            const daysLeft = goal.target_date ? differenceInDays(parseISO(goal.target_date), new Date()) : null;

            return (
              <motion.div key={goal.id}
                className={`glass-card p-5 ${goal.is_completed ? 'ring-2 ring-emerald-500/30' : ''}`}
                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                      style={{ background: `${goal.color}15` }}>
                      {goal.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-sm">{goal.name}</span>
                        {goal.is_completed && <CheckCircle className="w-4 h-4 text-emerald-500" weight="fill" />}
                      </div>
                      {goal.target_date && (
                        <span className={`text-xs ${daysLeft !== null && daysLeft < 30 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                          {daysLeft !== null && daysLeft >= 0
                            ? `${daysLeft}d left · ${format(parseISO(goal.target_date), 'MMM d, yyyy')}`
                            : daysLeft !== null && daysLeft < 0
                              ? 'Past due date'
                              : format(parseISO(goal.target_date), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => openEdit(goal)}
                      className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                      <PencilSimple className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteGoal(goal.id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors text-muted-foreground hover:text-red-400">
                      <TrashSimple className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Progress */}
                <div className="space-y-2">
                  <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                    <motion.div className="h-full rounded-full"
                      style={{ background: goal.is_completed ? '#10b981' : goal.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ delay: 0.2 + i * 0.06, duration: 0.7, ease: [0.4, 0, 0.2, 1] }} />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold" style={{ color: goal.color }}>
                      {formatCurrency(goal.current_amount, currency)}
                    </span>
                    <span className="font-mono text-muted-foreground">{pct}%</span>
                    <span className="text-muted-foreground">{formatCurrency(goal.target_amount, currency)}</span>
                  </div>
                  {!goal.is_completed && remaining > 0 && (
                    <p className="text-[11px] text-muted-foreground font-mono">
                      {formatCurrency(remaining, currency)} more to go
                    </p>
                  )}
                </div>

                {!goal.is_completed && (
                  <motion.button
                    onClick={() => { setAddingFunds(goal); setFundAmount(''); }}
                    className="mt-3 w-full py-2 rounded-xl text-xs font-semibold transition-all"
                    style={{ background: `${goal.color}15`, color: goal.color }}
                    whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                    + Add Funds
                  </motion.button>
                )}

                {goal.notes && <p className="text-[11px] text-muted-foreground mt-2 italic">{goal.notes}</p>}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add Funds Modal */}
      <AnimatePresence>
        {addingFunds && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'hsl(var(--background) / 0.7)', backdropFilter: 'blur(16px)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setAddingFunds(null)}>
            <motion.div className="float-panel w-full max-w-sm mx-4 p-6"
              initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                  style={{ background: `${addingFunds.color}15` }}>{addingFunds.icon}</div>
                <div>
                  <h3 className="font-serif font-semibold">Add Funds</h3>
                  <p className="text-xs text-muted-foreground">{addingFunds.name}</p>
                </div>
              </div>
              <input type="number" step="0.01" value={fundAmount}
                onChange={e => setFundAmount(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-lg font-serif font-bold text-center border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 mb-4"
                placeholder="0.00" autoFocus />
              <div className="flex gap-2">
                <button onClick={() => setAddingFunds(null)} className="btn-secondary flex-1 !rounded-xl">Cancel</button>
                <motion.button onClick={addFunds} disabled={saving}
                  className="btn-primary flex-1 !rounded-xl disabled:opacity-50" whileTap={{ scale: 0.97 }}>
                  {saving ? <CircleNotch className="w-4 h-4 animate-spin" /> : '+ Add'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'hsl(var(--background) / 0.7)', backdropFilter: 'blur(16px)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowForm(false)}>
            <motion.div className="float-panel w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-serif font-semibold">{editingGoal ? 'Edit Goal' : 'New Savings Goal'}</h3>
                <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Icon</label>
                  <div className="flex flex-wrap gap-2">
                    {GOAL_ICONS.map(ic => (
                      <button key={ic} type="button" onClick={() => setForm(f => ({ ...f, icon: ic }))}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all ${form.icon === ic ? 'ring-2 ring-primary ring-offset-1 bg-primary/10' : 'bg-muted hover:bg-muted/80'}`}>
                        {ic}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Goal Name *</label>
                  <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl text-sm border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="e.g. Emergency Fund, Vacation" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Target Amount *</label>
                    <input type="number" step="0.01" required value={form.target_amount}
                      onChange={e => setForm(f => ({ ...f, target_amount: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl text-sm border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="50000" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Already Saved</label>
                    <input type="number" step="0.01" value={form.current_amount}
                      onChange={e => setForm(f => ({ ...f, current_amount: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl text-sm border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="0" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Target Date (optional)</label>
                  <input type="date" value={form.target_date}
                    onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl text-sm border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
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
                    placeholder="Why this goal matters..." />
                </div>
                <div className="flex gap-2.5 pt-2">
                  <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1 !rounded-xl">Cancel</button>
                  <motion.button type="submit" disabled={saving} className="btn-primary flex-1 !rounded-xl disabled:opacity-50" whileTap={{ scale: 0.97 }}>
                    {saving ? <CircleNotch className="w-4 h-4 animate-spin" /> : <FloppyDisk className="w-4 h-4" />}
                    {saving ? 'Saving...' : editingGoal ? 'Update' : 'Create Goal'}
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

