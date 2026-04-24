'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlass, Funnel, X, ArrowsLeftRight, Brain,
  TrashSimple, PencilSimple, CheckCircle, CircleNotch, FloppyDisk, Paperclip,
  CaretLeft, CaretRight, Plus
} from '@phosphor-icons/react';
import { formatCurrency, formatDate, groupTransactionsByDate } from '@/lib/utils';
import { toast } from 'sonner';
import Link from 'next/link';
import { format, subMonths, addMonths } from 'date-fns';
import type { Transaction, TransactionFilters } from '@/types';

type SubTab = 'daily' | 'monthly' | 'total';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<TransactionFilters>({ type: 'all' });
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editForm, setEditForm] = useState({ description: '', amount: '', type: 'expense' as string });
  const [editSaving, setEditSaving] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [subTab, setSubTab] = useState<SubTab>('daily');
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setDebouncedSearch(search), 400);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [search]);

  const fetchTransactions = useCallback(async (reset = false) => {
    setLoading(true);
    try {
      const p = reset ? 1 : page;
      const params = new URLSearchParams({
        page: p.toString(),
        limit: '50',
        ...(filters.type && filters.type !== 'all' ? { type: filters.type } : {}),
        ...(filters.account_id ? { account_id: filters.account_id } : {}),
        ...(filters.category_id ? { category_id: filters.category_id } : {}),
        ...(filters.date_from ? { date_from: filters.date_from } : {}),
        ...(filters.date_to ? { date_to: filters.date_to } : {}),
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
      });
      const res = await fetch(`/api/transactions?${params}`);
      const data = await res.json();
      if (reset) {
        setTransactions(data.data || []);
        setPage(1);
      } else {
        setTransactions(prev => [...prev, ...(data.data || [])]);
      }
      setHasMore(data.has_more);
      setTotal(data.total || 0);
    } catch {
      toast.error('Failed to load');
    } finally {
      setLoading(false);
    }
  }, [filters, debouncedSearch, page]);

  useEffect(() => { fetchTransactions(true); }, [filters, debouncedSearch]);

  const deleteTransaction = async (id: string) => {
    try {
      await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
      setTransactions(prev => prev.filter(t => t.id !== id));
      setTotal(prev => prev - 1);
      toast.success('Deleted');
    } catch { toast.error('Failed'); }
  };

  const bulkDelete = async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
    setTransactions(prev => prev.filter(t => !selectedIds.has(t.id)));
    setTotal(prev => prev - ids.length);
    setSelectedIds(new Set());
    toast.success(`Deleted ${ids.length} transactions`);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const openEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setEditForm({ description: tx.description || '', amount: (tx.amount / 100).toFixed(2), type: tx.type });
  };

  const saveEdit = async () => {
    if (!editingTx) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/transactions/${editingTx.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: editForm.description, amount: editForm.amount, type: editForm.type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTransactions(prev => prev.map(t => t.id === editingTx.id ? { ...t, ...data.data } : t));
      setEditingTx(null);
      toast.success('Updated');
    } catch { toast.error('Failed'); } finally { setEditSaving(false); }
  };

  const grouped = groupTransactionsByDate(transactions);
  const incomeTotal = transactions.reduce((s, t) => s + (t.type === 'income' ? t.amount : 0), 0);
  const expenseTotal = transactions.reduce((s, t) => s + (t.type === 'expense' ? t.amount : 0), 0);
  const netTotal = incomeTotal - expenseTotal;
  const currency = transactions[0]?.currency || 'USD';

  const prevMonth = () => setCurrentDate(d => subMonths(d, 1));
  const nextMonth = () => setCurrentDate(d => addMonths(d, 1));

  return (
    <div className="space-y-0">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="p-1"><CaretLeft className="w-5 h-5" /></button>
          <span className="text-lg font-semibold">{format(currentDate, 'MMM yyyy')}</span>
          <button onClick={nextMonth} className="p-1"><CaretRight className="w-5 h-5" /></button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowSearch(!showSearch)} className="p-2">
            <MagnifyingGlass className="w-5 h-5 text-muted-foreground" />
          </button>
          <button onClick={() => setShowFilters(!showFilters)} className="p-2">
            <Funnel className={`w-5 h-5 ${showFilters ? 'text-primary' : 'text-muted-foreground'}`} />
          </button>
        </div>
      </div>

      {/* Type filter pills — always visible */}
      <div className="flex gap-1.5 px-4 pb-2">
        {(['all', 'income', 'expense', 'transfer'] as const).map(type => (
          <button key={type} onClick={() => setFilters(f => ({ ...f, type }))}
            className={`flex-1 py-2 rounded-2xl text-xs font-medium capitalize transition-all duration-200 ${
              filters.type === type ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-foreground/[0.04] text-muted-foreground hover:bg-foreground/[0.07]'
            }`}>
            {type === 'all' ? 'All' : type}
          </button>
        ))}
      </div>

      {/* Sub-tabs */}
      <div className="sub-tabs">
        {(['daily', 'monthly', 'total'] as const).map(tab => (
          <button key={tab} onClick={() => setSubTab(tab)}
            className={`sub-tab ${subTab === tab ? 'active' : ''}`}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Date range filter (expandable) */}
      {showFilters && (
        <div className="px-4 py-3 border-b border-border/20 bg-foreground/[0.02] space-y-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-muted-foreground block mb-1">From</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg border border-border/30 bg-background text-sm" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground block mb-1">To</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg border border-border/30 bg-background text-sm" />
            </div>
          </div>
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-xs text-red-400 font-medium">
              Clear All Filters
            </button>
          )}
        </div>
      )}

      {/* Summary row — Income / Expenses / Total */}
      <div className="grid grid-cols-3 text-center py-3 mx-2 rounded-2xl bg-foreground/[0.015]">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase">Income</p>
          <p className="text-sm font-semibold text-blue-400">{formatCurrency(incomeTotal, currency)}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase">Expenses</p>
          <p className="text-sm font-semibold text-red-400">{formatCurrency(expenseTotal, currency)}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase">Total</p>
          <p className={`text-sm font-semibold ${netTotal >= 0 ? 'text-foreground' : 'text-red-400'}`}>
            {formatCurrency(netTotal, currency)}
          </p>
        </div>
      </div>

      {/* Search bar (toggled) */}
      <AnimatePresence>
        {showSearch && (
          <motion.div className="px-4 py-2" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            <div className="relative">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                autoFocus
                className="w-full pl-9 pr-8 py-2.5 rounded-2xl text-sm bg-foreground/[0.03] border border-border/20 focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all duration-200"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk actions */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div className="flex items-center justify-between px-4 py-2 bg-foreground/[0.02]"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <span className="text-sm font-medium text-primary">{selectedIds.size} selected</span>
            <button onClick={bulkDelete} className="text-xs font-medium text-red-400 flex items-center gap-1">
              <TrashSimple className="w-3 h-3" /> Delete
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transaction list */}
      {loading && transactions.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : transactions.length === 0 ? (
        <EmptyState />
      ) : (
        <div>
          {Object.entries(grouped)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([date, txs]) => (
              <div key={date}>
                {/* Date header */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-foreground/[0.015] rounded-xl mx-2 mt-2">
                  <span className="text-xs font-medium text-muted-foreground">{formatDate(date, 'EEE, MMM d')}</span>
                  <span className="text-xs font-medium tabular-nums text-muted-foreground">
                    {formatCurrency(
                      txs.reduce((s, t) => s + (t.type === 'income' ? t.amount : t.type === 'expense' ? -t.amount : 0), 0),
                      txs[0]?.currency || currency, { showSign: true }
                    )}
                  </span>
                </div>

                {/* Transaction rows */}
                {txs.map((tx) => (
                  <div key={tx.id}
                    className={`flat-list-item px-4 ${selectedIds.has(tx.id) ? 'bg-primary/[0.03]' : ''}`}>
                    <button onClick={() => toggleSelect(tx.id)}
                      className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200 ${
                        selectedIds.has(tx.id) ? 'bg-primary scale-110' : 'border border-muted-foreground/15 hover:border-primary/40'
                      }`}>
                      {selectedIds.has(tx.id) && <CheckCircle className="w-3.5 h-3.5 text-white" weight="fill" />}
                    </button>

                    <div className="flat-list-icon">
                      <span className="text-base">{tx.category?.icon || (tx.type === 'income' ? '💰' : '💸')}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium truncate block">
                        {tx.description || tx.category?.name || 'Transaction'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {tx.category?.name}{tx.account ? ` · ${tx.account.name}` : ''}
                        {tx.attachments && tx.attachments.length > 0 && ' 📎'}
                      </span>
                    </div>

                    <span className={`text-sm font-semibold tabular-nums shrink-0 ${
                      tx.type === 'income' ? 'text-blue-400' : tx.type === 'expense' ? 'text-red-400' : 'text-foreground'
                    }`}>
                      {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                      {formatCurrency(tx.amount, tx.currency)}
                    </span>

                    <div className="flex items-center gap-1 shrink-0 opacity-60 hover:opacity-100 transition-opacity duration-200">
                      <button onClick={() => openEdit(tx)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-foreground/[0.04] hover:text-primary transition-all duration-200">
                        <PencilSimple className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteTransaction(tx.id)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-all duration-200">
                        <TrashSimple className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))}

          {hasMore && (
            <div className="flex justify-center py-4">
              <button onClick={() => { setPage(p => p + 1); fetchTransactions(); }}
                className="text-sm text-primary font-medium">
                Load more
              </button>
            </div>
          )}
        </div>
      )}

      {/* Edit Transaction Modal */}
      <AnimatePresence>
        {editingTx && (
          <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setEditingTx(null)}>
            <motion.div className="w-full max-w-md bg-card rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl"
              initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Edit Transaction</h3>
                <button onClick={() => setEditingTx(null)} className="p-1"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-0">
                <div className="underline-field">
                  <label>Description</label>
                  <input value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="underline-field">
                  <label>Amount</label>
                  <input type="number" step="0.01" value={editForm.amount}
                    onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
                <div className="underline-field">
                  <label>Type</label>
                  <select value={editForm.type} onChange={e => setEditForm(f => ({ ...f, type: e.target.value }))}>
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                    <option value="transfer">Transfer</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <motion.button onClick={saveEdit} disabled={editSaving}
                  className="flex-1 py-3 rounded-2xl text-sm font-semibold text-white disabled:opacity-60 transition-all duration-200"
                  style={{ background: '#ff6b6b' }}
                  whileTap={{ scale: 0.97 }}>
                  {editSaving ? 'Saving...' : 'Save'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-20 px-4">
      <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'hsl(var(--foreground) / 0.04)' }}>
        <ArrowsLeftRight className="w-6 h-6 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-lg mb-1">No transactions</h3>
      <p className="text-sm text-muted-foreground mb-5">Tap + to add your first transaction</p>
      <div className="flex items-center justify-center gap-3">
        <Link href="/dashboard/transactions/new" className="text-sm font-medium text-primary">
          + Manual Entry
        </Link>
        <Link href="/dashboard/ai-assistant" className="text-sm font-medium text-emerald-500">
          ✦ AI Entry
        </Link>
      </div>
    </div>
  );
}
