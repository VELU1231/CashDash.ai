'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, Wallet, TrendUp, TrendDown, CreditCard,
  PiggyBank, ChartBar, PencilSimple, TrashSimple, Eye, EyeSlash,
  DotsThree, ArrowsClockwise
} from '@phosphor-icons/react';
import { formatCurrency, ACCOUNT_COLORS, ACCOUNT_ICONS } from '@/lib/utils';
import { toast } from 'sonner';
import type { Account, AccountFormData, AccountType } from '@/types';
import { IconDisplay } from '@/components/ui/icon-picker';

const ACCOUNT_TYPES: { value: AccountType; label: string; icon: string }[] = [
  { value: 'cash', label: 'Cash', icon: 'Money' },
  { value: 'checking', label: 'Checking', icon: 'Bank' },
  { value: 'savings', label: 'Savings', icon: 'PiggyBank' },
  { value: 'credit', label: 'Credit Card', icon: 'CreditCard' },
  { value: 'investment', label: 'Investment', icon: 'TrendUp' },
  { value: 'loan', label: 'Loan', icon: 'Receipt' },
  { value: 'other', label: 'Other', icon: 'Wallet' },
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
    <div className="space-y-6">
      {/* Header — Editorial */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight">Accounts</h1>
          <p className="text-sm text-muted-foreground mt-1 font-mono">{totalInAccounts} active accounts</p>
        </div>
        <motion.button
          onClick={() => setShowForm(true)}
          className="btn-primary !rounded-xl"
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
        >
          <Plus className="w-4 h-4" weight="bold" /> Add Account
        </motion.button>
      </div>

      {/* Net Worth Card — Glass with gradient */}
      <motion.div
        className="rounded-2xl p-7 text-white relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
          boxShadow: '0 8px 32px hsl(160 84% 39% / 0.25)',
        }}
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      >
        {/* Decorative glow */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-[80px] bg-white/10" />
        <div className="relative z-10">
          <p className="text-emerald-100 text-sm font-medium mb-1.5">Total Net Worth</p>
          <div className="text-4xl sm:text-5xl font-serif font-bold tracking-tight mb-5 editorial-number">
            {formatCurrency(totalBalance, 'USD')}
          </div>
          <div className="flex items-center gap-6 text-sm text-emerald-100 font-mono">
            <span>{accounts.filter(a => a.balance >= 0).length} positive</span>
            <span>{accounts.filter(a => a.balance < 0).length} negative</span>
            <span>{accounts.length} total</span>
          </div>
        </div>
      </motion.div>

      {/* Account Groups */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-card p-5 h-28 shimmer-bg" />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-20">
          <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-3" weight="light" />
          <h3 className="font-serif font-semibold text-lg mb-1.5">No accounts yet</h3>
          <p className="text-sm text-muted-foreground mb-5">Add your first financial account to get started</p>
          <button onClick={() => setShowForm(true)} className="btn-primary !rounded-xl">
            Add Account
          </button>
        </div>
      ) : (
        Object.entries(groupedByType).map(([type, accts]) => (
          <div key={type}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {ACCOUNT_TYPES.find(t => t.value === type)?.label || type}
              </span>
              <div className="flex-1 h-px" style={{ background: 'hsl(var(--foreground) / 0.04)' }} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {accts.map((account, i) => (
                <motion.div
                  key={account.id}
                  className="glass-card overflow-hidden"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className="p-5 group">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl"
                          style={{ background: `${account.color}15`, color: account.color }}>
                          <IconDisplay name={account.icon} className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-semibold text-sm">{account.name}</div>
                          <div className="text-xs text-muted-foreground capitalize">{account.type}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setForm({
                          name: '', type: account.type, icon: '🏦', color: account.color, currency: account.currency,
                          initial_balance: '0', description: '', parent_id: account.id
                        }); setShowForm(true); }}
                          className="p-1.5 rounded-lg hover:bg-foreground/[0.04] text-muted-foreground hover:text-emerald-500 transition-colors" title="Add Sub-account">
                          <Plus className="w-3.5 h-3.5" weight="regular" />
                        </button>
                        <button onClick={() => { setEditingAccount(account); setForm({
                          name: account.name, type: account.type, icon: account.icon,
                          color: account.color, currency: account.currency,
                          initial_balance: (account.initial_balance / 100).toString(),
                          description: account.description || '', parent_id: account.parent_id || '',
                        }); setShowForm(true); }}
                          className="p-1.5 rounded-lg hover:bg-foreground/[0.04] text-muted-foreground hover:text-foreground transition-colors">
                          <PencilSimple className="w-3.5 h-3.5" weight="light" />
                        </button>
                        <button onClick={() => deleteAccount(account.id)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors">
                          <TrashSimple className="w-3.5 h-3.5" weight="light" />
                        </button>
                      </div>
                    </div>

                    <div className={`text-2xl font-serif font-bold editorial-number ${account.balance >= 0 ? 'text-foreground' : 'text-red-400'}`}>
                      {formatCurrency(account.balance, account.currency)}
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-muted-foreground font-mono">{account.currency}</span>
                      <div className="h-1.5 flex-1 mx-3 rounded-full overflow-hidden" style={{ background: 'hsl(var(--foreground) / 0.04)' }}>
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: account.color }}
                          initial={{ width: 0 }}
                          animate={{ width: account.balance > 0 ? `${Math.min((account.balance / Math.max(...accounts.map(a => a.balance))) * 100, 100)}%` : '0%' }}
                          transition={{ duration: 0.8, delay: i * 0.05, ease: [0.4, 0, 0.2, 1] }}
                        />
                      </div>
                      {account.is_hidden && <EyeSlash className="w-3 h-3 text-muted-foreground" weight="light" />}
                    </div>
                  </div>

                  {account.subaccounts && account.subaccounts.length > 0 && (
                    <div className="px-5 py-3 space-y-2" style={{ borderTop: '1px solid hsl(var(--foreground) / 0.04)', background: 'hsl(var(--foreground) / 0.015)' }}>
                      {account.subaccounts.map(sub => (
                        <div key={sub.id} className="flex items-center justify-between group/sub">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs" style={{ background: `${sub.color}15`, color: sub.color }}>
                              <IconDisplay name={sub.icon} className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-xs font-medium">{sub.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-serif font-semibold editorial-number ${sub.balance >= 0 ? 'text-foreground' : 'text-red-400'}`}>
                              {formatCurrency(sub.balance, sub.currency)}
                            </span>
                            <div className="flex items-center opacity-0 group-hover/sub:opacity-100 transition-opacity">
                              <button onClick={() => { setEditingAccount(sub); setForm({
                                name: sub.name, type: sub.type, icon: sub.icon, color: sub.color, currency: sub.currency,
                                initial_balance: (sub.initial_balance / 100).toString(), description: sub.description || '', parent_id: account.id,
                              }); setShowForm(true); }} className="p-1 hover:bg-foreground/[0.04] rounded-lg text-muted-foreground"><PencilSimple className="w-3 h-3" weight="light" /></button>
                              <button onClick={() => deleteAccount(sub.id)} className="p-1 hover:bg-red-500/10 rounded-lg text-muted-foreground"><TrashSimple className="w-3 h-3" weight="light" /></button>
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

      {/* Add/Edit Account Modal — Glass */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'hsl(var(--background) / 0.6)', backdropFilter: 'blur(16px)' }}
          onClick={() => setShowForm(false)}>
          <motion.div
            className="w-full max-w-md float-panel p-6"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-lg font-serif font-semibold mb-6">{editingAccount ? 'Edit Account' : 'New Account'}</h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Account Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none input-animated"
                  style={{ border: '1px solid hsl(var(--foreground) / 0.06)', background: 'hsl(var(--foreground) / 0.02)' }}
                  placeholder="e.g. BDO Savings" />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Account Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {ACCOUNT_TYPES.map(t => (
                    <button key={t.value} onClick={() => setForm(f => ({ ...f, type: t.value, icon: t.icon }))}
                      className={`flex flex-col items-center gap-1 p-2.5 rounded-xl text-xs transition-all duration-200 ${
                        form.type === t.value ? 'bg-emerald-500/10 text-emerald-500' : 'text-muted-foreground hover:bg-foreground/[0.03]'
                      }`}
                      style={{ border: `1px solid ${form.type === t.value ? 'hsl(var(--primary) / 0.2)' : 'hsl(var(--foreground) / 0.04)'}` }}>
                      <span className="text-lg flex justify-center mb-1"><IconDisplay name={t.icon} className="w-5 h-5" /></span>
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Currency</label>
                  <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none"
                    style={{ border: '1px solid hsl(var(--foreground) / 0.06)', background: 'hsl(var(--foreground) / 0.02)' }}>
                    {['USD','PHP','EUR','GBP','JPY','INR','SGD','MYR','THB','AUD','CAD'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Initial Balance</label>
                  <input type="number" value={form.initial_balance} onChange={e => setForm(f => ({ ...f, initial_balance: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none font-mono"
                    style={{ border: '1px solid hsl(var(--foreground) / 0.06)', background: 'hsl(var(--foreground) / 0.02)' }}
                    placeholder="0.00" step="0.01" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Parent Account (Optional)</label>
                <select value={form.parent_id} onChange={e => setForm(f => ({ ...f, parent_id: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none"
                  style={{ border: '1px solid hsl(var(--foreground) / 0.06)', background: 'hsl(var(--foreground) / 0.02)' }}>
                  <option value="">None (Top-Level)</option>
                  {accounts.filter(a => a.id !== editingAccount?.id).map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Color</label>
                <div className="flex flex-wrap gap-2">
                  {ACCOUNT_COLORS.map(c => (
                    <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                      className={`w-7 h-7 rounded-full transition-all duration-200 ${form.color === c ? 'scale-125 ring-2 ring-offset-2 ring-emerald-500' : 'hover:scale-110'}`}
                      style={{ background: c }} />
                  ))}
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button onClick={() => { setShowForm(false); setEditingAccount(null); }}
                  className="btn-secondary flex-1 !rounded-xl">
                  Cancel
                </button>
                <motion.button onClick={saveAccount} disabled={saving}
                  className="btn-primary flex-1 !rounded-xl disabled:opacity-60"
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
