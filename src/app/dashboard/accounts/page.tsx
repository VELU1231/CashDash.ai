'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, Wallet, TrendingUp, TrendingDown, CreditCard,
  PiggyBank, BarChart3, Edit3, Trash2, Eye, EyeOff,
  MoreHorizontal, RefreshCw, Archive
} from 'lucide-react';
import { formatCurrency, ACCOUNT_COLORS, ACCOUNT_ICONS } from '@/lib/utils';
import { toast } from 'sonner';
import type { Account, AccountFormData, AccountType } from '@/types';

const ACCOUNT_TYPES: { value: AccountType; label: string; icon: string }[] = [
  { value: 'cash', label: 'Cash', icon: '💵' },
  { value: 'checking', label: 'Checking', icon: '🏦' },
  { value: 'savings', label: 'Savings', icon: '🏧' },
  { value: 'credit', label: 'Credit Card', icon: '💳' },
  { value: 'investment', label: 'Investment', icon: '📈' },
  { value: 'loan', label: 'Loan', icon: '📋' },
  { value: 'other', label: 'Other', icon: '💰' },
];

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<(Account & { subaccounts?: Account[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [form, setForm] = useState<AccountFormData>({
    name: '', type: 'cash', icon: '💰', color: '#10b981',
    currency: 'USD', initial_balance: '0', description: '', parent_id: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchAccounts(); }, []);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/accounts');
      const data = await res.json();
      setAccounts(data.data || []);
    } catch { toast.error('Failed to load accounts'); }
    finally { setLoading(false); }
  };

  const saveAccount = async () => {
    if (!form.name.trim()) { toast.error('Account name required'); return; }
    setSaving(true);
    try {
      const method = editingAccount ? 'PUT' : 'POST';
      const url = editingAccount ? `/api/accounts/${editingAccount.id}` : '/api/accounts';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (editingAccount) {
        toast.success('Account updated');
      } else {
        toast.success('Account created');
      }
      fetchAccounts();
      setShowForm(false);
      setEditingAccount(null);
      setForm({ name: '', type: 'cash', icon: '💰', color: '#10b981', currency: 'USD', initial_balance: '0', description: '', parent_id: '' });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to save');
    } finally { setSaving(false); }
  };

  const deleteAccount = async (id: string) => {
    if (!confirm('Delete this account? All transactions will be affected. Sub-accounts will also be deleted.')) return;
    try {
      await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
      toast.success('Account deleted');
      fetchAccounts();
    } catch { toast.error('Failed to delete'); }
  };

  const totalBalance = accounts.reduce((s, a) => {
    const subTotal = (a.subaccounts || []).reduce((ss, sub) => ss + sub.balance, 0);
    return s + a.balance + subTotal;
  }, 0);
  
  const totalInAccounts = accounts.length + accounts.reduce((s, a) => s + (a.subaccounts?.length || 0), 0);

  const groupedByType = accounts.reduce((groups, account) => {
    const type = account.type;
    if (!groups[type]) groups[type] = [];
    groups[type].push(account);
    return groups;
  }, {} as Record<string, (Account & { subaccounts?: Account[] })[]>);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Accounts</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{totalInAccounts} active accounts</p>
        </div>
        <motion.button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
        >
          <Plus className="w-4 h-4" /> Add Account
        </motion.button>
      </div>

      {/* Net Worth Card */}
      <motion.div
        className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-white shadow-glow"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      >
        <p className="text-emerald-100 text-sm font-medium mb-1">Total Net Worth</p>
        <div className="text-4xl font-bold tracking-tight mb-4">
          {formatCurrency(totalBalance, 'USD')}
        </div>
        <div className="flex items-center gap-6 text-sm text-emerald-100">
          <span>{accounts.filter(a => a.balance >= 0).length} positive</span>
          <span>{accounts.filter(a => a.balance < 0).length} negative</span>
          <span>{accounts.length} total accounts</span>
        </div>
      </motion.div>

      {/* Account Groups */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5 h-28 shimmer-bg" />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-16">
          <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold mb-1">No accounts yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Add your first financial account to get started</p>
          <button onClick={() => setShowForm(true)} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
            Add Account
          </button>
        </div>
      ) : (
        Object.entries(groupedByType).map(([type, accts]) => (
          <div key={type}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground capitalize">
                {ACCOUNT_TYPES.find(t => t.value === type)?.label || type}
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {accts.map((account, i) => (
                <motion.div
                  key={account.id}
                  className="rounded-xl border border-border bg-card overflow-hidden card-hover"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className="p-4 group">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                          style={{ background: `${account.color}20` }}>
                          {account.icon}
                        </div>
                        <div>
                          <div className="font-semibold text-sm">{account.name}</div>
                          <div className="text-xs text-muted-foreground capitalize">{account.type}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setForm({
                          name: '', type: account.type, icon: '🏦', color: account.color, currency: account.currency,
                          initial_balance: '0', description: '', parent_id: account.id
                        }); setShowForm(true); }}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors" title="Add Sub-account">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => { setEditingAccount(account); setForm({
                          name: account.name, type: account.type, icon: account.icon,
                          color: account.color, currency: account.currency,
                          initial_balance: (account.initial_balance / 100).toString(),
                          description: account.description || '', parent_id: account.parent_id || '',
                        }); setShowForm(true); }}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteAccount(account.id)}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className={`text-2xl font-bold ${account.balance >= 0 ? 'text-foreground' : 'text-red-500'}`}>
                      {formatCurrency(account.balance, account.currency)}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">{account.currency}</span>
                      <div className="h-1.5 flex-1 mx-3 rounded-full bg-muted overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: account.color }}
                          initial={{ width: 0 }}
                          animate={{ width: account.balance > 0 ? `${Math.min((account.balance / Math.max(...accounts.map(a => a.balance))) * 100, 100)}%` : '0%' }}
                          transition={{ duration: 0.8, delay: i * 0.05 }}
                        />
                      </div>
                      {account.is_hidden && <EyeOff className="w-3 h-3 text-muted-foreground" />}
                    </div>
                  </div>

                  {account.subaccounts && account.subaccounts.length > 0 && (
                    <div className="bg-muted/30 border-t border-border px-4 py-2 space-y-2">
                      {account.subaccounts.map(sub => (
                        <div key={sub.id} className="flex items-center justify-between group/sub">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded flex items-center justify-center text-xs" style={{ background: `${sub.color}20` }}>
                              {sub.icon}
                            </div>
                            <span className="text-xs font-medium">{sub.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-semibold ${sub.balance >= 0 ? 'text-foreground' : 'text-red-500'}`}>
                              {formatCurrency(sub.balance, sub.currency)}
                            </span>
                            <div className="flex items-center opacity-0 group-hover/sub:opacity-100 transition-opacity">
                              <button onClick={() => { setEditingAccount(sub); setForm({
                                name: sub.name, type: sub.type, icon: sub.icon, color: sub.color, currency: sub.currency,
                                initial_balance: (sub.initial_balance / 100).toString(), description: sub.description || '', parent_id: account.id,
                              }); setShowForm(true); }} className="p-1 hover:bg-muted rounded text-muted-foreground"><Edit3 className="w-3 h-3" /></button>
                              <button onClick={() => deleteAccount(sub.id)} className="p-1 hover:bg-destructive/10 rounded text-muted-foreground"><Trash2 className="w-3 h-3" /></button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Add/Edit Account Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowForm(false)}>
          <motion.div
            className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl p-6"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold mb-5">{editingAccount ? 'Edit Account' : 'New Account'}</h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Account Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="e.g. BDO Savings" />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Account Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {ACCOUNT_TYPES.map(t => (
                    <button key={t.value} onClick={() => setForm(f => ({ ...f, type: t.value, icon: t.icon }))}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-all ${
                        form.type === t.value ? 'border-primary bg-primary/5 text-primary' : 'border-input text-muted-foreground hover:border-primary/50'
                      }`}>
                      <span className="text-lg">{t.icon}</span>
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Currency</label>
                  <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none">
                    {['USD','PHP','EUR','GBP','JPY','INR','SGD','MYR','THB','AUD','CAD'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Initial Balance</label>
                  <input type="number" value={form.initial_balance} onChange={e => setForm(f => ({ ...f, initial_balance: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none"
                    placeholder="0.00" step="0.01" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Parent Account (Optional)</label>
                <select value={form.parent_id} onChange={e => setForm(f => ({ ...f, parent_id: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none">
                  <option value="">None (Top-Level)</option>
                  {accounts.filter(a => a.id !== editingAccount?.id).map(a => (
                    <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Color</label>
                <div className="flex flex-wrap gap-2">
                  {ACCOUNT_COLORS.map(c => (
                    <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                      className={`w-7 h-7 rounded-full transition-all ${form.color === c ? 'scale-125 ring-2 ring-offset-2 ring-primary' : 'hover:scale-110'}`}
                      style={{ background: c }} />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => { setShowForm(false); setEditingAccount(null); }}
                  className="flex-1 px-4 py-2 rounded-lg border border-input text-sm font-medium hover:bg-muted transition-colors">
                  Cancel
                </button>
                <motion.button onClick={saveAccount} disabled={saving}
                  className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60"
                  whileTap={{ scale: 0.97 }}>
                  {saving ? 'Saving...' : editingAccount ? 'Update' : 'Create Account'}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
