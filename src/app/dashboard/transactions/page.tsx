'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Filter, X, ArrowLeftRight, TrendingUp, TrendingDown, Brain,
  Trash2, Edit3, CheckCircle2, Loader2, Save, Paperclip
} from 'lucide-react';
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
      next.has(id) ? next.delete(id) : next.add(id);
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{total.toLocaleString()} total</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/ai-assistant">
            <motion.button className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20"
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Brain className="w-4 h-4" /> AI Entry
            </motion.button>
          </Link>
        </div>
      </div>

      {/* Search + Filter bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search transactions..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </div>

        <div className="hidden sm:flex items-center gap-1 p-1 rounded-lg border border-input bg-background">
          {(['all', 'income', 'expense', 'transfer'] as const).map(type => (
            <button key={type} onClick={() => setFilters(f => ({ ...f, type }))}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                filters.type === type ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}>
              {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>

        <motion.button onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm ${showFilters ? 'border-primary text-primary bg-primary/5' : 'border-input text-muted-foreground hover:text-foreground'}`}
          whileTap={{ scale: 0.97 }}>
          <Filter className="w-3.5 h-3.5" /> Filters
        </motion.button>
      </div>

      {/* Extended filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl border border-border bg-muted/30"
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">From date</label>
              <input type="date" value={filters.date_from || ''} onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))}
                className="w-full px-3 py-1.5 rounded-lg border border-input bg-background text-xs focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">To date</label>
              <input type="date" value={filters.date_to || ''} onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))}
                className="w-full px-3 py-1.5 rounded-lg border border-input bg-background text-xs focus:outline-none" />
            </div>
            <div className="flex items-end">
              <button onClick={() => { setFilters({ type: 'all' }); setSearch(''); }}
                className="px-3 py-1.5 rounded-lg border border-input text-xs text-muted-foreground hover:text-foreground w-full">
                Clear all
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk actions */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div className="flex items-center justify-between px-4 py-2 rounded-xl bg-primary/5 border border-primary/20"
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <span className="text-sm font-medium text-primary">{selectedIds.size} selected</span>
            <button onClick={bulkDelete}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-xs font-medium">
              <Trash2 className="w-3 h-3" /> Delete selected
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
        <div className="space-y-4">
          {Object.entries(grouped)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([date, txs]) => (
              <div key={date}>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-semibold text-muted-foreground">{formatDate(date, 'EEEE, MMMM d')}</span>
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">
                    {formatCurrency(
                      txs.reduce((s, t) => s + (t.type === 'income' ? t.amount : t.type === 'expense' ? -t.amount : 0), 0),
                      txs[0]?.currency || 'USD', { showSign: true }
                    )}
                  </span>
                </div>

                <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
                  {txs.map((tx, i) => (
                    <motion.div key={tx.id}
                      className={`flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors ${selectedIds.has(tx.id) ? 'bg-primary/5' : ''}`}
                      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}>
                      <button onClick={() => toggleSelect(tx.id)}
                        className={`shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                          selectedIds.has(tx.id) ? 'bg-primary border-primary' : 'border-muted-foreground/30 hover:border-primary'
                        }`}>
                        {selectedIds.has(tx.id) && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                      </button>

                      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0 bg-muted">
                        {tx.category?.icon || (tx.type === 'income' ? '💰' : tx.type === 'transfer' ? '↔️' : '💸')}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{tx.description || tx.category?.name || 'Transaction'}</span>
                          {tx.is_ai_created && (
                            <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-semibold">AI</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {tx.category && <span className="text-xs text-muted-foreground">{tx.category.name}</span>}
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground">{tx.account?.name}</span>
                          {tx.attachments && tx.attachments.length > 0 && (
                            <>
                              <span className="text-xs text-muted-foreground">·</span>
                              <Paperclip className="w-3 h-3 text-muted-foreground" />
                            </>
                          )}
                        </div>
                      </div>

                      <div className={`text-sm font-semibold shrink-0 ${
                        tx.type === 'income' ? 'text-emerald-600' : tx.type === 'expense' ? 'text-red-500' : 'text-blue-500'
                      }`}>
                        {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                        {formatCurrency(tx.amount, tx.currency)}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => openEdit(tx)}
                          className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteTransaction(tx.id)}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-3.5 h-3.5" />
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
                className="px-4 py-2 rounded-lg border border-input text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                whileTap={{ scale: 0.97 }}>
                Load more
              </motion.button>
            </div>
          )}
        </div>
      )}

      {/* ─── Edit Transaction Modal ─── */}
      <AnimatePresence>
        {editingTx && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setEditingTx(null)}>
            <motion.div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6"
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold">Edit Transaction</h3>
                <button onClick={() => setEditingTx(null)} className="p-1 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Description</label>
                  <input value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Amount</label>
                    <input type="number" step="0.01" value={editForm.amount}
                      onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Type</label>
                    <select value={editForm.type} onChange={e => setEditForm(f => ({ ...f, type: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none">
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                      <option value="transfer">Transfer</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setEditingTx(null)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-input text-sm font-medium hover:bg-muted transition-colors">
                    Cancel
                  </button>
                  <motion.button onClick={saveEdit} disabled={editSaving}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 hover:bg-primary/90"
                    whileTap={{ scale: 0.97 }}>
                    {editSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
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
        <div key={i} className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg shimmer-bg" />
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
    <motion.div className="text-center py-16" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
        <ArrowLeftRight className="w-7 h-7 text-muted-foreground" />
      </div>
      <h3 className="font-semibold mb-1">No transactions found</h3>
      <p className="text-sm text-muted-foreground mb-4">Add your first transaction manually or use the AI assistant</p>
      <div className="flex items-center justify-center gap-3">
        <Link href="/dashboard/ai-assistant">
          <button className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Add with AI</button>
        </Link>
      </div>
    </motion.div>
  );
}
