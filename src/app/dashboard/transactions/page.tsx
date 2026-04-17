'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Filter, ArrowUpDown, ChevronDown, X,
  ArrowLeftRight, TrendingUp, TrendingDown, Brain,
  Calendar, Tag, Wallet, MoreHorizontal, Trash2, Edit3,
  CheckCircle2, Download, RefreshCw
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
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchTransactions = useCallback(async (reset = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: reset ? '1' : page.toString(),
        limit: '25',
        ...(filters.type && filters.type !== 'all' ? { type: filters.type } : {}),
        ...(filters.account_id ? { account_id: filters.account_id } : {}),
        ...(filters.category_id ? { category_id: filters.category_id } : {}),
        ...(filters.date_from ? { date_from: filters.date_from } : {}),
        ...(filters.date_to ? { date_to: filters.date_to } : {}),
        ...(search ? { search } : {}),
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
  }, [filters, search, page]);

  useEffect(() => { fetchTransactions(true); }, [filters, search]);

  const deleteTransaction = async (id: string) => {
    try {
      await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
      setTransactions(prev => prev.filter(t => t.id !== id));
      toast.success('Transaction deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const bulkDelete = async () => {
    for (const id of selectedIds) await deleteTransaction(id);
    setSelectedIds(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
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
            <motion.button
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20"
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            >
              <Brain className="w-4 h-4" /> AI Entry
            </motion.button>
          </Link>
          <Link href="/dashboard/transactions/new">
            <motion.button
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            >
              <Plus className="w-4 h-4" /> Add
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

        {/* Type filter pills */}
        <div className="hidden sm:flex items-center gap-1 p-1 rounded-lg border border-input bg-background">
          {(['all', 'income', 'expense', 'transfer'] as const).map(type => (
            <button
              key={type}
              onClick={() => setFilters(f => ({ ...f, type }))}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                filters.type === type
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>

        <motion.button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm ${showFilters ? 'border-primary text-primary bg-primary/5' : 'border-input text-muted-foreground hover:text-foreground'}`}
          whileTap={{ scale: 0.97 }}
        >
          <Filter className="w-3.5 h-3.5" /> Filters
        </motion.button>
      </div>

      {/* Extended filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl border border-border bg-muted/30"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
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
              <button onClick={() => setFilters({ type: 'all' })}
                className="px-3 py-1.5 rounded-lg border border-input text-xs text-muted-foreground hover:text-foreground w-full">
                Clear filters
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk actions bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            className="flex items-center justify-between px-4 py-2 rounded-xl bg-primary/5 border border-primary/20"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <span className="text-sm font-medium text-primary">{selectedIds.size} selected</span>
            <button onClick={bulkDelete}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-xs font-medium">
              <Trash2 className="w-3 h-3" /> Delete selected
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transaction list grouped by date */}
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
                  <span className="text-xs font-semibold text-muted-foreground">
                    {formatDate(date, 'EEEE, MMMM d')}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">
                    {formatCurrency(
                      txs.reduce((s, t) => s + (t.type === 'income' ? t.amount : t.type === 'expense' ? -t.amount : 0), 0),
                      txs[0]?.currency || 'USD',
                      { showSign: true }
                    )}
                  </span>
                </div>

                <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
                  {txs.map((tx, i) => (
                    <motion.div
                      key={tx.id}
                      className={`flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors ${selectedIds.has(tx.id) ? 'bg-primary/5' : ''}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.02 }}
                    >
                      {/* Checkbox */}
                      <button onClick={() => toggleSelect(tx.id)}
                        className={`shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                          selectedIds.has(tx.id) ? 'bg-primary border-primary' : 'border-muted-foreground/30 hover:border-primary'
                        }`}>
                        {selectedIds.has(tx.id) && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                      </button>

                      {/* Category icon */}
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0 bg-muted">
                        {tx.category?.icon || (tx.type === 'income' ? '💰' : tx.type === 'transfer' ? '↔️' : '💸')}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">
                            {tx.description || tx.category?.name || 'Transaction'}
                          </span>
                          {tx.is_ai_created && (
                            <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-semibold">AI</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {tx.category && (
                            <span className="text-xs text-muted-foreground">{tx.category.name}</span>
                          )}
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground">{tx.account?.name}</span>
                        </div>
                      </div>

                      {/* Amount */}
                      <div className={`text-sm font-semibold shrink-0 ${
                        tx.type === 'income' ? 'text-emerald-600' :
                        tx.type === 'expense' ? 'text-red-500' : 'text-blue-500'
                      }`}>
                        {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                        {formatCurrency(tx.amount, tx.currency)}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Link href={`/dashboard/transactions/${tx.id}`}>
                          <button className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </Link>
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

          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <motion.button
                onClick={() => { setPage(p => p + 1); fetchTransactions(); }}
                className="px-4 py-2 rounded-lg border border-input text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                whileTap={{ scale: 0.97 }}
              >
                Load more
              </motion.button>
            </div>
          )}
        </div>
      )}
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
    <motion.div
      className="text-center py-16"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
        <ArrowLeftRight className="w-7 h-7 text-muted-foreground" />
      </div>
      <h3 className="font-semibold mb-1">No transactions found</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Add your first transaction manually or use the AI assistant
      </p>
      <div className="flex items-center justify-center gap-3">
        <Link href="/dashboard/transactions/new">
          <button className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
            Add manually
          </button>
        </Link>
        <Link href="/dashboard/ai-assistant">
          <button className="px-4 py-2 rounded-lg border border-input text-sm font-medium flex items-center gap-2">
            <Brain className="w-4 h-4" /> Use AI
          </button>
        </Link>
      </div>
    </motion.div>
  );
}
