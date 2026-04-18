'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, MagnifyingGlass, Funnel, X, ArrowsLeftRight, TrendUp, TrendDown, Brain,
  TrashSimple, PencilSimple, CheckCircle, CircleNotch, FloppyDisk, Paperclip
} from '@phosphor-icons/react';
import { formatCurrency, formatRelativeDate, formatDate, groupTransactionsByDate } from '@/lib/utils';
import { toast } from 'sonner';
import Link from 'next/link';
import type { Transaction, TransactionFilters } from '@/types';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<TransactionFilters>({ type: 'all' });
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editForm, setEditForm] = useState({ description: '', amount: '', type: 'expense' as string });
  const [editSaving, setEditSaving] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Debounce search input
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
        limit: '25',
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
      toast.error('Failed to load transactions');
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
      toast.success('Transaction deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const bulkDelete = async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
    }
    setTransactions(prev => prev.filter(t => !selectedIds.has(t.id)));
    setTotal(prev => prev - ids.length);
    setSelectedIds(new Set());
    toast.success(`Deleted ${ids.length} transactions`);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  // ─── Edit Modal Logic ─────────────────────────────────────────────────
  const openEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setEditForm({
      description: tx.description || '',
      amount: (tx.amount / 100).toFixed(2),
      type: tx.type,
    });
  };

  const saveEdit = async () => {
    if (!editingTx) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/transactions/${editingTx.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: editForm.description,
          amount: editForm.amount,
          type: editForm.type,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setTransactions(prev => prev.map(t => t.id === editingTx.id ? { ...t, ...data.data } : t));
      setEditingTx(null);
      toast.success('Transaction updated');
    } catch {
      toast.error('Failed to update');
    } finally {
      setEditSaving(false);
    }
  };

  const grouped = groupTransactionsByDate(transactions);

  return (
    <div className="space-y-5">
      {/* Header — Editorial */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight">Transactions</h1>
          <p className="text-sm text-muted-foreground mt-1 font-mono">{total.toLocaleString()} total</p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link href="/dashboard/transactions/new">
            <motion.button className="btn-secondary !rounded-xl !text-[13px]"
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Plus className="w-4 h-4" weight="regular" /> Manual Entry
            </motion.button>
          </Link>
          <Link href="/dashboard/ai-assistant">
            <motion.button className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200"
              style={{ background: 'hsl(var(--primary) / 0.08)', color: 'hsl(var(--primary))' }}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Brain className="w-4 h-4" weight="duotone" /> AI Entry
            </motion.button>
          </Link>
        </div>
      </div>

      {/* Search + Filter bar */}
      <div className="flex items-center gap-2.5">
        <div className="relative flex-1">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" weight="light" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search transactions..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm focus:outline-none input-animated"
            style={{
              border: '1px solid hsl(var(--foreground) / 0.06)',
              background: 'hsl(var(--card) / 0.5)',
              backdropFilter: 'blur(8px)',
            }}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5 text-muted-foreground" weight="light" />
            </button>
          )}
        </div>

        <div className="hidden sm:flex items-center gap-1 p-1 rounded-xl"
          style={{ border: '1px solid hsl(var(--foreground) / 0.06)', background: 'hsl(var(--card) / 0.4)' }}>
          {(['all', 'income', 'expense', 'transfer'] as const).map(type => (
            <button key={type} onClick={() => setFilters(f => ({ ...f, type }))}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                filters.type === type ? 'bg-emerald-500 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}>
              {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>

        <motion.button onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm transition-all duration-200 ${showFilters ? 'text-emerald-500' : 'text-muted-foreground hover:text-foreground'}`}
          style={{ border: `1px solid ${showFilters ? 'hsl(var(--primary) / 0.2)' : 'hsl(var(--foreground) / 0.06)'}`, background: showFilters ? 'hsl(var(--primary) / 0.05)' : 'transparent' }}
          whileTap={{ scale: 0.97 }}>
          <Funnel className="w-3.5 h-3.5" weight="light" /> Filters
        </motion.button>
      </div>

      {/* Extended filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 glass-card"
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">From date</label>
              <input type="date" value={filters.date_from || ''} onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl text-xs focus:outline-none input-animated"
                style={{ border: '1px solid hsl(var(--foreground) / 0.06)', background: 'hsl(var(--foreground) / 0.02)' }} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">To date</label>
              <input type="date" value={filters.date_to || ''} onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl text-xs focus:outline-none input-animated"
                style={{ border: '1px solid hsl(var(--foreground) / 0.06)', background: 'hsl(var(--foreground) / 0.02)' }} />
            </div>
            <div className="flex items-end">
              <button onClick={() => { setFilters({ type: 'all' }); setSearch(''); }}
                className="px-3 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground w-full transition-all duration-200"
                style={{ border: '1px solid hsl(var(--foreground) / 0.06)' }}>
                Clear all
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk actions */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div className="flex items-center justify-between px-4 py-2.5 glass-card"
            style={{ borderColor: 'hsl(var(--primary) / 0.15)' }}
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <span className="text-sm font-medium text-emerald-500">{selectedIds.size} selected</span>
            <button onClick={bulkDelete}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors">
              <TrashSimple className="w-3 h-3" weight="regular" /> Delete selected
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transaction list */}
      {loading && transactions.length === 0 ? (
        <TransactionSkeleton />
      ) : transactions.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([date, txs]) => (
              <div key={date}>
                <div className="flex items-center gap-3 mb-2.5">
                  <span className="text-xs font-semibold text-muted-foreground">{formatDate(date, 'EEEE, MMMM d')}</span>
                  <div className="flex-1 h-px" style={{ background: 'hsl(var(--foreground) / 0.04)' }} />
                  <span className="text-xs text-muted-foreground font-mono">
                    {formatCurrency(
                      txs.reduce((s, t) => s + (t.type === 'income' ? t.amount : t.type === 'expense' ? -t.amount : 0), 0),
                      txs[0]?.currency || 'USD', { showSign: true }
                    )}
                  </span>
                </div>

                <div className="glass-card overflow-hidden"
                  style={{ borderRadius: '16px' }}>
                  {txs.map((tx, i) => (
                    <motion.div key={tx.id}
                      className={`flex items-center gap-3 px-4 py-3.5 transition-all duration-200 ${selectedIds.has(tx.id) ? 'bg-emerald-500/[0.04]' : 'hover:bg-foreground/[0.02]'}`}
                      style={i < txs.length - 1 ? { borderBottom: '1px solid hsl(var(--foreground) / 0.03)' } : {}}
                      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}>
                      <button onClick={() => toggleSelect(tx.id)}
                        className={`shrink-0 w-4 h-4 rounded flex items-center justify-center transition-all duration-200 ${
                          selectedIds.has(tx.id) ? 'bg-emerald-500' : 'border border-muted-foreground/20 hover:border-emerald-500/50'
                        }`}>
                        {selectedIds.has(tx.id) && <CheckCircle className="w-3 h-3 text-white" weight="fill" />}
                      </button>

                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0" style={{ background: 'hsl(var(--foreground) / 0.04)' }}>
                        {tx.category?.icon || (tx.type === 'income' ? '💰' : tx.type === 'transfer' ? '↔️' : '💸')}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{tx.description || tx.category?.name || 'Transaction'}</span>
                          {tx.is_ai_created && (
                            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-semibold"
                              style={{ background: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))' }}>AI</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {tx.category && <span className="text-xs text-muted-foreground">{tx.category.name}</span>}
                          <span className="text-xs text-muted-foreground/40">·</span>
                          <span className="text-xs text-muted-foreground">{tx.account?.name}</span>
                          {tx.attachments && tx.attachments.length > 0 && (
                            <>
                              <span className="text-xs text-muted-foreground/40">·</span>
                              <Paperclip className="w-3 h-3 text-muted-foreground" weight="light" />
                            </>
                          )}
                        </div>
                      </div>

                      <div className={`text-sm font-serif font-semibold editorial-number shrink-0 ${
                        tx.type === 'income' ? 'text-emerald-500' : tx.type === 'expense' ? 'text-red-400' : 'text-blue-400'
                      }`}>
                        {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                        {formatCurrency(tx.amount, tx.currency)}
                      </div>

                      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(tx)}
                          className="p-1.5 rounded-lg hover:bg-foreground/[0.04] transition-colors text-muted-foreground hover:text-foreground">
                          <PencilSimple className="w-3.5 h-3.5" weight="light" />
                        </button>
                        <button onClick={() => deleteTransaction(tx.id)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors text-muted-foreground hover:text-red-400">
                          <TrashSimple className="w-3.5 h-3.5" weight="light" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}

          {hasMore && (
            <div className="flex justify-center pt-2">
              <motion.button onClick={() => { setPage(p => p + 1); fetchTransactions(); }}
                className="btn-secondary !rounded-xl"
                whileTap={{ scale: 0.97 }}>
                Load more
              </motion.button>
            </div>
          )}
        </div>
      )}

      {/* ─── Edit Transaction Modal — Glass ─── */}
      <AnimatePresence>
        {editingTx && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'hsl(var(--background) / 0.6)', backdropFilter: 'blur(16px)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setEditingTx(null)}>
            <motion.div className="float-panel w-full max-w-md mx-4 p-6"
              initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-serif font-semibold">Edit Transaction</h3>
                <button onClick={() => setEditingTx(null)} className="p-1.5 rounded-lg hover:bg-foreground/[0.04] transition-colors">
                  <X className="w-4 h-4" weight="light" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Description</label>
                  <input value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none input-animated"
                    style={{ border: '1px solid hsl(var(--foreground) / 0.06)', background: 'hsl(var(--foreground) / 0.02)' }} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Amount</label>
                    <input type="number" step="0.01" value={editForm.amount}
                      onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none input-animated font-mono"
                      style={{ border: '1px solid hsl(var(--foreground) / 0.06)', background: 'hsl(var(--foreground) / 0.02)' }} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Type</label>
                    <select value={editForm.type} onChange={e => setEditForm(f => ({ ...f, type: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none"
                      style={{ border: '1px solid hsl(var(--foreground) / 0.06)', background: 'hsl(var(--foreground) / 0.02)' }}>
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                      <option value="transfer">Transfer</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2.5 pt-2">
                  <button onClick={() => setEditingTx(null)}
                    className="btn-secondary flex-1 !rounded-xl">
                    Cancel
                  </button>
                  <motion.button onClick={saveEdit} disabled={editSaving}
                    className="btn-primary flex-1 !rounded-xl disabled:opacity-50"
                    whileTap={{ scale: 0.97 }}>
                    {editSaving ? <CircleNotch className="w-4 h-4 animate-spin" weight="regular" /> : <FloppyDisk className="w-4 h-4" weight="regular" />}
                    {editSaving ? 'Saving...' : 'Save'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TransactionSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="glass-card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl shimmer-bg" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 rounded shimmer-bg w-40" />
            <div className="h-2.5 rounded shimmer-bg w-24" />
          </div>
          <div className="h-4 rounded shimmer-bg w-16" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <motion.div className="text-center py-20" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: 'hsl(var(--foreground) / 0.04)' }}>
        <ArrowsLeftRight className="w-7 h-7 text-muted-foreground" weight="light" />
      </div>
      <h3 className="font-serif font-semibold text-lg mb-1.5">No transactions found</h3>
      <p className="text-sm text-muted-foreground mb-5">Add your first transaction manually or use the AI assistant</p>
      <div className="flex items-center justify-center gap-3">
        <Link href="/dashboard/transactions/new">
          <motion.button className="btn-secondary !rounded-xl" whileTap={{ scale: 0.97 }}>
            <Plus className="w-4 h-4" weight="regular" /> Manual Entry
          </motion.button>
        </Link>
        <Link href="/dashboard/ai-assistant">
          <motion.button className="btn-primary !rounded-xl" whileTap={{ scale: 0.97 }}>
            <Brain className="w-4 h-4" weight="duotone" /> Add with AI
          </motion.button>
        </Link>
      </div>
    </motion.div>
  );
}
