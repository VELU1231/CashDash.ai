'use client';
export const runtime = 'edge';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Receipt, X, CircleNotch, FloppyDisk,
  PencilSimple, TrashSimple, Warning, CheckCircle,
  CalendarCheck, Robot
} from '@phosphor-icons/react';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { format, parseISO, differenceInDays, isPast, isToday } from 'date-fns';

interface Bill {
  id: string;
  name: string;
  amount_min: number;
  amount_max: number;
  currency: string;
  frequency: string;
  icon: string;
  color: string;
  due_day: number | null;
  next_due_date: string | null;
  last_paid_date: string | null;
  is_auto_pay: boolean;
  is_active: boolean;
  notes: string | null;
  category?: { id: string; name: string; icon: string; color: string } | null;
}

const FREQUENCIES: Record<string, string> = {
  weekly: 'Weekly', biweekly: 'Bi-weekly', monthly: 'Monthly',
  quarterly: 'Quarterly', yearly: 'Yearly',
};

const BILL_ICONS = ['📄', '💡', '🌊', '📱', '🏠', '🚗', '🎬', '🏥', '📚', '💳', '🌐', '🔥'];
const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#a855f7', '#ec4899', '#06b6d4', '#f97316'];

export default function BillsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [currency, setCurrency] = useState('PHP');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', amount: '', frequency: 'monthly', icon: '📄',
    color: '#f59e0b', due_day: '', next_due_date: '', category_id: '',
    is_auto_pay: false, notes: '',
  });

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [billsRes, catRes, profileRes] = await Promise.all([
        fetch('/api/bills').then(r => r.json()),
        fetch('/api/categories').then(r => r.json()),
        fetch('/api/profile').then(r => r.json()),
      ]);
      setBills(billsRes.data || []);
      setCategories((catRes.data || []).filter((c: any) => c.type === 'expense'));
      setCurrency(profileRes.data?.default_currency || 'PHP');
    } catch { toast.error('Failed to load bills'); }
    finally { setLoading(false); }
  };

  const openCreate = () => {
    setEditingBill(null);
    setForm({ name: '', amount: '', frequency: 'monthly', icon: '📄', color: '#f59e0b', due_day: '', next_due_date: '', category_id: '', is_auto_pay: false, notes: '' });
    setShowForm(true);
  };

  const openEdit = (b: Bill) => {
    setEditingBill(b);
    setForm({
      name: b.name, amount: (b.amount_min / 100).toFixed(2),
      frequency: b.frequency, icon: b.icon, color: b.color,
      due_day: b.due_day?.toString() || '',
      next_due_date: b.next_due_date || '', category_id: b.category?.id || '',
      is_auto_pay: b.is_auto_pay, notes: b.notes || '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.amount) { toast.error('Name and amount are required'); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name, amount_min: form.amount, amount_max: form.amount,
        frequency: form.frequency, icon: form.icon, color: form.color, currency,
        due_day: form.due_day || null,
        next_due_date: form.next_due_date || null,
        category_id: form.category_id || null,
        is_auto_pay: form.is_auto_pay,
        notes: form.notes || null,
      };
      const url = editingBill ? `/api/bills/${editingBill.id}` : '/api/bills';
      const method = editingBill ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(editingBill ? 'Bill updated!' : 'Bill added!');
      setShowForm(false);
      loadAll();
    } catch (err: any) { toast.error(err.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const markPaid = async (bill: Bill) => {
    try {
      await fetch(`/api/bills/${bill.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ last_paid_date: format(new Date(), 'yyyy-MM-dd') }),
      });
      toast.success(`${bill.name} marked as paid!`);
      loadAll();
    } catch { toast.error('Failed to mark as paid'); }
  };

  const deleteBill = async (id: string) => {
    await fetch(`/api/bills/${id}`, { method: 'DELETE' });
    setBills(prev => prev.filter(b => b.id !== id));
    toast.success('Bill removed');
  };

  const getDueStatus = (bill: Bill) => {
    if (!bill.next_due_date) return { label: 'No due date', color: 'text-muted-foreground', urgent: false };
    const due = parseISO(bill.next_due_date);
    const days = differenceInDays(due, new Date());
    if (isPast(due) && !isToday(due)) return { label: `Overdue by ${Math.abs(days)}d`, color: 'text-red-500', urgent: true };
    if (isToday(due)) return { label: 'Due today!', color: 'text-amber-500', urgent: true };
    if (days <= 3) return { label: `Due in ${days}d`, color: 'text-amber-500', urgent: true };
    if (days <= 7) return { label: `Due in ${days}d`, color: 'text-yellow-500', urgent: false };
    return { label: `Due ${format(due, 'MMM d')}`, color: 'text-muted-foreground', urgent: false };
  };

  const upcomingCount = bills.filter(b => {
    if (!b.next_due_date) return false;
    return differenceInDays(parseISO(b.next_due_date), new Date()) <= 7;
  }).length;

  const totalMonthly = bills.filter(b => b.frequency === 'monthly').reduce((s, b) => s + b.amount_min, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight">Recurring Bills</h1>
          <p className="text-sm text-muted-foreground mt-1 font-mono">
            {bills.length} active · {upcomingCount > 0 ? `${upcomingCount} due soon` : 'All clear'}
          </p>
        </div>
        <motion.button onClick={openCreate} className="btn-primary !rounded-xl"
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Plus className="w-4 h-4" weight="bold" /> Add Bill
        </motion.button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Monthly Total', value: formatCurrency(totalMonthly, currency), icon: Receipt, color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
          { label: 'Due This Week', value: `${upcomingCount}`, icon: CalendarCheck, color: upcomingCount > 0 ? '#ef4444' : '#10b981', bg: upcomingCount > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)' },
          { label: 'Auto-Pay Active', value: `${bills.filter(b => b.is_auto_pay).length}`, icon: Robot, color: '#3b82f6', bg: 'rgba(59,130,246,0.08)' },
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

      {/* Bills list */}
      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="glass-card h-20 shimmer-bg rounded-2xl" />)}</div>
      ) : bills.length === 0 ? (
        <motion.div className="text-center py-16" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-primary/5">
            <Receipt className="w-8 h-8 text-muted-foreground" weight="light" />
          </div>
          <h3 className="font-serif font-semibold text-lg mb-2">No bills tracked</h3>
          <p className="text-sm text-muted-foreground mb-5">Track recurring bills like rent, subscriptions, and utilities</p>
          <motion.button onClick={openCreate} className="btn-primary !rounded-xl" whileTap={{ scale: 0.97 }}>
            <Plus className="w-4 h-4" /> Add First Bill
          </motion.button>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {bills.map((bill, i) => {
            const status = getDueStatus(bill);
            return (
              <motion.div key={bill.id} className="glass-card p-4"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}>
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
                    style={{ background: `${bill.color}15` }}>
                    {bill.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{bill.name}</span>
                      {bill.is_auto_pay && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-500">AUTO</span>
                      )}
                      {status.urgent && (
                        <Warning className="w-3.5 h-3.5 text-amber-500 shrink-0" weight="fill" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-muted-foreground">{FREQUENCIES[bill.frequency]}</span>
                      <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
                      {bill.last_paid_date && (
                        <span className="text-xs text-muted-foreground">
                          Last paid: {format(parseISO(bill.last_paid_date), 'MMM d')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-sm font-serif font-semibold editorial-number" style={{ color: bill.color }}>
                        {formatCurrency(bill.amount_min, currency)}
                      </div>
                      {bill.amount_max > bill.amount_min && (
                        <div className="text-[11px] text-muted-foreground font-mono">
                          up to {formatCurrency(bill.amount_max, currency)}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <motion.button onClick={() => markPaid(bill)}
                        className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 transition-colors"
                        title="Mark as paid" whileTap={{ scale: 0.9 }}>
                        <CheckCircle className="w-3.5 h-3.5" weight="regular" />
                      </motion.button>
                      <button onClick={() => openEdit(bill)}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                        <PencilSimple className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteBill(bill.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors text-muted-foreground hover:text-red-400">
                        <TrashSimple className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
                {bill.notes && <p className="text-[11px] text-muted-foreground mt-2 ml-15 italic pl-[60px]">{bill.notes}</p>}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'hsl(var(--background) / 0.7)', backdropFilter: 'blur(16px)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowForm(false)}>
            <motion.div className="float-panel w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }} transition={{ duration: 0.2 }}
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-serif font-semibold">{editingBill ? 'Edit Bill' : 'Add Recurring Bill'}</h3>
                <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Icon picker */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Icon</label>
                  <div className="flex flex-wrap gap-2">
                    {BILL_ICONS.map(ic => (
                      <button key={ic} type="button" onClick={() => setForm(f => ({ ...f, icon: ic }))}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all ${form.icon === ic ? 'ring-2 ring-primary ring-offset-1 bg-primary/10' : 'bg-muted hover:bg-muted/80'}`}>
                        {ic}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Bill Name *</label>
                  <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl text-sm border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="e.g. Netflix, Rent, Electric Bill" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Amount *</label>
                    <input type="number" step="0.01" required value={form.amount}
                      onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl text-sm border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="0.00" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Frequency</label>
                    <select value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl text-sm border border-input bg-background focus:outline-none">
                      {Object.entries(FREQUENCIES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Due Day (1-31)</label>
                    <input type="number" min="1" max="31" value={form.due_day}
                      onChange={e => setForm(f => ({ ...f, due_day: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl text-sm border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="e.g. 15" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Next Due Date</label>
                    <input type="date" value={form.next_due_date}
                      onChange={e => setForm(f => ({ ...f, next_due_date: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl text-sm border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Category</label>
                  <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl text-sm border border-input bg-background focus:outline-none">
                    <option value="">No Category</option>
                    {categories.map((c: any) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                  </select>
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
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_auto_pay} onChange={e => setForm(f => ({ ...f, is_auto_pay: e.target.checked }))}
                    className="w-4 h-4 rounded accent-emerald-500" />
                  <span className="text-sm font-medium">Auto-pay enabled</span>
                </label>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Notes (optional)</label>
                  <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl text-sm border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="e.g. Netflix Premium plan" />
                </div>
                <div className="flex gap-2.5 pt-2">
                  <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1 !rounded-xl">Cancel</button>
                  <motion.button type="submit" disabled={saving} className="btn-primary flex-1 !rounded-xl disabled:opacity-50" whileTap={{ scale: 0.97 }}>
                    {saving ? <CircleNotch className="w-4 h-4 animate-spin" /> : <FloppyDisk className="w-4 h-4" />}
                    {saving ? 'Saving...' : editingBill ? 'Update' : 'Add Bill'}
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

