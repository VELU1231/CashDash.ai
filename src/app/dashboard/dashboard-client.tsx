'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import {
  TrendUp, TrendDown, Wallet, ArrowsLeftRight,
  Brain, ArrowUpRight, ArrowDownRight,
  Plus, Target, Sparkle, Crown
} from '@phosphor-icons/react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { formatCurrency, getChartColor, formatRelativeDate } from '@/lib/utils';
import type { Profile, Transaction, Account } from '@/types';

// Lazy-load Chart.js components to reduce initial bundle (~180KB savings)
const AreaChartCard = dynamic(() => import('@/components/ui/chartjs-components').then(m => ({ default: m.AreaChartCard })), { ssr: false });
const BarChartCard = dynamic(() => import('@/components/ui/chartjs-components').then(m => ({ default: m.BarChartCard })), { ssr: false });
const DoughnutChartCard = dynamic(() => import('@/components/ui/chartjs-components').then(m => ({ default: m.DoughnutChartCard })), { ssr: false });

interface Props {
  transactions: Transaction[];
  prevTransactions: { type: string; amount: number }[];
  accounts: Account[];
  trendData: { type: string; amount: number; transaction_date: string; currency: string }[];
  profile: Profile | null;
  currentMonth: string;
  flags?: { showAI?: boolean; showDailyChart?: boolean; showInsights?: boolean };
}

const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };
const stagger = { animate: { transition: { staggerChildren: 0.08 } } };

// Premium chart colors
const CHART_PALETTE = [
  '#10b981', '#3b82f6', '#a855f7', '#f59e0b',
  '#ef4444', '#06b6d4', '#ec4899', '#64748b',
];

export function DashboardClient({ transactions, prevTransactions, accounts, trendData, profile, currentMonth, flags }: Props) {
  const currency = profile?.default_currency || 'USD';
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});
  const [insight, setInsight] = useState<string | null>(null);
  // Live refresh state — updated by dashboardRefresh events from AI assistant
  const [liveTransactions, setLiveTransactions] = useState<Transaction[]>(transactions);
  const [liveAccounts, setLiveAccounts] = useState<Account[]>(accounts);
  const [refreshing, setRefreshing] = useState(false);

  const refreshDashboard = useCallback(async () => {
    setRefreshing(true);
    try {
      const [txRes, accRes] = await Promise.all([
        fetch('/api/transactions?limit=50').then(r => r.json()),
        fetch('/api/accounts').then(r => r.json()),
      ]);
      if (txRes.data) setLiveTransactions(txRes.data);
      if (accRes.data) setLiveAccounts(accRes.data);
    } catch { /* silent */ }
    finally { setRefreshing(false); }
  }, []);

  useEffect(() => {
    const handler = () => refreshDashboard();
    window.addEventListener('dashboardRefresh', handler);
    return () => window.removeEventListener('dashboardRefresh', handler);
  }, [refreshDashboard]);

  // Sync if server-side props change (navigation)
  useEffect(() => { setLiveTransactions(transactions); }, [transactions]);
  useEffect(() => { setLiveAccounts(accounts); }, [accounts]);

  useEffect(() => {
    fetch(`/api/exchange-rates?base=${currency}`)
      .then(res => res.json())
      .then(data => { if (data.rates) setExchangeRates(data.rates); })
      .catch(console.error);

    if (profile?.subscription_tier !== 'free' || process.env.NODE_ENV === 'development') {
      fetch('/api/ai/insights')
        .then(r => r.json())
        .then(data => { if (data.insight) setInsight(data.insight); })
        .catch(console.error);
    }
  }, [currency, profile?.subscription_tier]);

  const convert = useCallback((amount: number, fromCurr: string) => {
    if (!fromCurr || fromCurr === currency || !exchangeRates[fromCurr]) return amount;
    return amount / exchangeRates[fromCurr];
  }, [currency, exchangeRates]);

  // ─── Computed Stats ──────────────────────────────────────────
  const stats = useMemo(() => {
    const income = liveTransactions.filter(t => t.type === 'income').reduce((s, t) => s + convert(t.amount, t.currency || 'USD'), 0);
    const expenses = liveTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + convert(t.amount, t.currency || 'USD'), 0);
    const prevIncome = prevTransactions.filter(t => t.type === 'income').reduce((s, t) => s + convert(t.amount, (t as any).currency || 'USD'), 0);
    const prevExpenses = prevTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + convert(t.amount, (t as any).currency || 'USD'), 0);
    const totalBalance = liveAccounts.reduce((s, a) => s + convert(a.balance, a.currency || 'USD'), 0);
    const savingsRate = income > 0 ? Math.round((income - expenses) / income * 100) : 0;
    const incomePct = prevIncome > 0 ? ((income - prevIncome) / prevIncome) * 100 : 0;
    const expensePct = prevExpenses > 0 ? ((expenses - prevExpenses) / prevExpenses) * 100 : 0;
    return { income, expenses, totalBalance, savingsRate, incomePct, expensePct, net: income - expenses };
  }, [liveTransactions, prevTransactions, liveAccounts, exchangeRates]);

  // ─── Category Breakdown ──────────────────────────────────────
  const categoryData = useMemo(() => {
    const grouped: Record<string, { name: string; icon: string; color: string; total: number; count: number }> = {};
    liveTransactions.filter(t => t.type === 'expense').forEach(t => {
      const cat = t.category;
      const key = cat?.id || 'uncategorized';
      if (!grouped[key]) {
        grouped[key] = { name: cat?.name || 'Uncategorized', icon: cat?.icon || '📦', color: cat?.color || '#94a3b8', total: 0, count: 0 };
      }
      grouped[key].total += convert(t.amount, t.currency || 'USD');
      grouped[key].count++;
    });
    return Object.values(grouped)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
      .map((item, i) => ({
        ...item,
        percentage: stats.expenses > 0 ? Math.round(item.total / stats.expenses * 100) : 0,
        fill: item.color || CHART_PALETTE[i % CHART_PALETTE.length],
      }));
  }, [liveTransactions, stats.expenses, exchangeRates]);

  // ─── Trend Data for Chart.js ─────────────────────────────────
  const trendChartData = useMemo(() => {
    const monthly: Record<string, { month: string; label: string; income: number; expenses: number }> = {};
    trendData.forEach(tx => {
      const key = tx.transaction_date.slice(0, 7);
      if (!monthly[key]) {
        monthly[key] = { month: key, label: format(parseISO(`${key}-01`), 'MMM'), income: 0, expenses: 0 };
      }
      if (tx.type === 'income') monthly[key].income += convert(tx.amount, tx.currency || 'USD');
      if (tx.type === 'expense') monthly[key].expenses += convert(tx.amount, tx.currency || 'USD');
    });
    return Object.values(monthly).sort((a, b) => a.month.localeCompare(b.month));
  }, [trendData, exchangeRates]);

  // ─── Daily Spending ──────────────────────────────────────────
  const dailyData = useMemo(() => {
    const daily: Record<string, number> = {};
    liveTransactions.filter(t => t.type === 'expense').forEach(t => {
      const day = t.transaction_date.slice(0, 10);
      daily[day] = (daily[day] || 0) + convert(t.amount, t.currency || 'USD');
    });
    return Object.entries(daily)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({ date: format(parseISO(date), 'MMM d'), amount }));
  }, [liveTransactions, exchangeRates]);

  const recentTransactions = liveTransactions.slice(0, 8);
  const fmtCompact = (v: number) => formatCurrency(v, currency, { compact: true });

  return (
    <div className="space-y-6">
      {/* ═══ Header ═══ */}
      <motion.div className="flex items-end justify-between" {...fadeUp} transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}>
        <div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1 font-mono">{currentMonth} overview</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/ai-assistant">
            <motion.button className="btn-secondary !rounded-xl" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Sparkle className="w-4 h-4" weight="duotone" /> Ask AI
            </motion.button>
          </Link>
          <Link href="/dashboard/transactions/new">
            <motion.button className="btn-primary !rounded-xl" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Plus className="w-4 h-4" weight="bold" /> Add transaction
            </motion.button>
          </Link>
        </div>
      </motion.div>

      {/* ═══ Upgrade Banner ═══ */}
      {profile?.subscription_tier === 'free' && (
        <motion.div className="glass-card p-4 flex items-center justify-between"
          style={{ borderColor: 'hsl(var(--primary) / 0.15)' }}
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'hsl(var(--primary) / 0.1)' }}>
              <Crown className="w-5 h-5" weight="duotone" style={{ color: 'hsl(var(--primary))' }} />
            </div>
            <div>
              <h4 className="font-semibold text-sm" style={{ color: 'hsl(var(--primary))' }}>Upgrade to Pro</h4>
              <p className="text-xs text-muted-foreground">Unlock Multi-currency, Receipt Scanning, and AI Insights.</p>
            </div>
          </div>
          <Link href="/pricing">
            <button className="px-4 py-2 rounded-xl text-white text-sm font-medium transition-all duration-200 hover:shadow-glow"
              style={{ background: 'hsl(var(--primary))' }}>
              Upgrade Now
            </button>
          </Link>
        </motion.div>
      )}

      {/* ═══ AI Insight ═══ */}
      {(profile?.subscription_tier !== 'free' || process.env.NODE_ENV === 'development') && insight && (
        <motion.div className="glass-card p-5 flex items-start gap-4"
          style={{ borderColor: 'hsl(var(--primary) / 0.12)' }}
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'hsl(var(--primary) / 0.1)' }}>
            <Sparkle className="w-5 h-5 text-emerald-500" weight="duotone" />
          </div>
          <div className="flex-1">
            <h4 className="font-serif font-semibold text-sm text-foreground mb-1.5">AI Financial Health Report</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">{insight}</p>
          </div>
        </motion.div>
      )}

      {/* ═══ Stat Cards ═══ */}
      <motion.div className="grid grid-cols-2 lg:grid-cols-4 gap-4" initial="initial" animate="animate" variants={stagger}>
        {[
          { label: 'Total Balance', value: formatCurrency(stats.totalBalance, currency), icon: Wallet, color: '#10b981', bg: 'rgba(16,185,129,0.08)', change: null, sub: `${liveAccounts.length} account${liveAccounts.length !== 1 ? 's' : ''}${refreshing ? ' ↻' : ''}` },
          { label: 'Monthly Income', value: formatCurrency(stats.income, currency), icon: TrendUp, color: '#10b981', bg: 'rgba(16,185,129,0.08)', change: stats.incomePct, sub: 'vs last month' },
          { label: 'Monthly Expenses', value: formatCurrency(stats.expenses, currency), icon: TrendDown, color: '#D9722A', bg: 'rgba(217,114,42,0.08)', change: stats.expensePct, sub: 'vs last month', invertChange: true },
          { label: 'Savings Rate', value: `${Math.max(0, stats.savingsRate)}%`, icon: Target, color: '#a855f7', bg: 'rgba(168,85,247,0.08)', change: null, sub: formatCurrency(stats.net, currency) + ' net' },
        ].map((stat) => {
          const Icon = stat.icon;
          const isPositive = stat.invertChange ? (stat.change ?? 0) < 0 : (stat.change ?? 0) >= 0;
          return (
            <motion.div key={stat.label} variants={fadeUp} className="stat-card group cursor-default">
              <div className="flex items-start justify-between mb-4">
                <div className="p-2.5 rounded-xl" style={{ background: stat.bg }}>
                  <Icon className="w-4 h-4" weight="regular" style={{ color: stat.color }} />
                </div>
                {stat.change !== null && (
                  <span className={`inline-flex items-center gap-0.5 text-xs font-medium font-mono ${isPositive ? 'text-emerald-500' : 'text-red-400'}`}>
                    {isPositive ? <ArrowUpRight className="w-3 h-3" weight="bold" /> : <ArrowDownRight className="w-3 h-3" weight="bold" />}
                    {Math.abs(stat.change).toFixed(1)}%
                  </span>
                )}
              </div>
              <div className="text-2xl sm:text-3xl font-serif font-bold tracking-tight editorial-number">{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-1.5 font-medium">{stat.label}</div>
              <div className="text-[11px] text-muted-foreground/50 mt-0.5 font-mono">{stat.sub}</div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* ═══ Charts Row ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Income vs Expenses — Chart.js Area */}
        <motion.div className="lg:col-span-2 glass-card p-5"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-serif font-semibold text-base">Income vs Expenses</h3>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">6-month trend</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />Income</span>
              <span className="flex items-center gap-1.5 text-muted-foreground"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#D9722A' }} />Expenses</span>
            </div>
          </div>
          {trendChartData.length > 0 ? (
            <AreaChartCard
              labels={trendChartData.map(d => d.label)}
              datasets={[
                { label: 'Income', data: trendChartData.map(d => d.income), borderColor: '#10b981', bgFrom: 'rgba(16,185,129,0.18)', bgTo: 'rgba(16,185,129,0)' },
                { label: 'Expenses', data: trendChartData.map(d => d.expenses), borderColor: '#D9722A', bgFrom: 'rgba(217,114,42,0.12)', bgTo: 'rgba(217,114,42,0)' },
              ]}
              formatValue={fmtCompact}
              height={220}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-[220px] text-muted-foreground">
              <TrendUp className="w-10 h-10 opacity-20 mb-2" />
              <p className="text-sm">No data yet — add transactions to see trends</p>
            </div>
          )}
        </motion.div>

        {/* Category Doughnut — Chart.js */}
        <motion.div className="glass-card p-5"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <div className="mb-5">
            <h3 className="font-serif font-semibold text-base">Spending by Category</h3>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">This month</p>
          </div>
          {categoryData.length > 0 ? (
            <>
              <DoughnutChartCard
                labels={categoryData.map(c => c.name)}
                data={categoryData.map(c => c.total)}
                colors={categoryData.map((c, i) => c.fill || CHART_PALETTE[i % CHART_PALETTE.length])}
                centerValue={formatCurrency(stats.expenses, currency, { compact: true })}
                centerLabel="Total spent"
                height={170}
                formatValue={(v: number) => formatCurrency(v, currency)}
              />
              <div className="space-y-2.5 mt-4">
                {categoryData.slice(0, 4).map((cat, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-sm">{cat.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-medium truncate">{cat.name}</span>
                        <span className="text-xs text-muted-foreground font-mono">{cat.percentage}%</span>
                      </div>
                      <div className="h-1 bg-foreground/[0.04] rounded-full overflow-hidden">
                        <motion.div className="h-full rounded-full" style={{ background: cat.fill }}
                          initial={{ width: 0 }} animate={{ width: `${cat.percentage}%` }}
                          transition={{ delay: 0.5 + i * 0.1, duration: 0.6, ease: [0.4, 0, 0.2, 1] }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
              <Target className="w-10 h-10 opacity-20 mb-2" />
              <p className="text-sm">No expenses logged this month</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* ═══ Daily Spending Bar Chart ═══ */}
      {dailyData.length > 0 && (
        <motion.div className="glass-card p-5"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <div className="mb-5">
            <h3 className="font-serif font-semibold text-base">Daily Spending</h3>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">Expense breakdown this month</p>
          </div>
          <BarChartCard
            labels={dailyData.map(d => d.date)}
            data={dailyData.map(d => d.amount)}
            colors={dailyData.map(() => '#10b981')}
            formatValue={fmtCompact}
            height={160}
          />
        </motion.div>
      )}

      {/* ═══ Bottom Row: Accounts + Recent Transactions ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Accounts */}
        <motion.div className="lg:col-span-2 glass-card p-5"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif font-semibold text-base">Accounts</h3>
            <Link href="/dashboard/accounts" className="text-xs text-emerald-500 hover:underline">View all</Link>
          </div>
          {accounts.length > 0 ? (
            <div className="space-y-1.5">
              {accounts.slice(0, 6).map((account) => (
                <motion.div key={account.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-foreground/[0.03] transition-all duration-200" whileHover={{ x: 2 }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm shrink-0" style={{ background: `${account.color}15` }}>{account.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{account.name}</div>
                    <div className="text-xs text-muted-foreground capitalize">{account.type}</div>
                  </div>
                  <div className={`text-sm font-serif font-semibold editorial-number ${account.balance >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                    {formatCurrency(account.balance, account.currency)}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Wallet className="w-8 h-8 text-muted-foreground mx-auto mb-2" weight="light" />
              <p className="text-sm text-muted-foreground">No accounts yet</p>
              <Link href="/dashboard/accounts" className="text-xs text-emerald-500 hover:underline">Add account</Link>
            </div>
          )}
        </motion.div>

        {/* Recent Transactions */}
        <motion.div className="lg:col-span-3 glass-card p-5"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif font-semibold text-base">Recent Transactions</h3>
            <Link href="/dashboard/transactions" className="text-xs text-emerald-500 hover:underline">View all</Link>
          </div>
          {recentTransactions.length > 0 ? (
            <div className="space-y-1">
              {recentTransactions.map((tx, i) => (
                <motion.div key={tx.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-foreground/[0.03] transition-all duration-200"
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.65 + i * 0.04 }} whileHover={{ x: 2 }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm shrink-0" style={{ background: 'hsl(var(--foreground) / 0.04)' }}>
                    {tx.category?.icon || (tx.type === 'income' ? '💰' : tx.type === 'transfer' ? '↔️' : '💸')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{tx.description || tx.category?.name || 'Transaction'}</div>
                    <div className="text-xs text-muted-foreground">{formatRelativeDate(tx.transaction_date)}</div>
                  </div>
                  <div className={`text-sm font-serif font-semibold editorial-number shrink-0 ${tx.type === 'income' ? 'text-emerald-500' : tx.type === 'expense' ? 'text-red-400' : 'text-blue-400'}`}>
                    {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                    {formatCurrency(tx.amount, tx.currency)}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <ArrowsLeftRight className="w-8 h-8 text-muted-foreground mx-auto mb-2" weight="light" />
              <p className="text-sm text-muted-foreground">No transactions this month</p>
              <div className="flex items-center justify-center gap-2 mt-2">
                <Link href="/dashboard/transactions/new" className="text-xs text-emerald-500 hover:underline">Add manually</Link>
                <span className="text-xs text-muted-foreground">or</span>
                <Link href="/dashboard/ai-assistant" className="text-xs text-emerald-500 hover:underline">use AI</Link>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* ═══ Welcome Banner ═══ */}
      {transactions.length === 0 && (
        <motion.div className="glass-card p-6 flex items-start gap-4"
          style={{ borderColor: 'hsl(var(--primary) / 0.12)' }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'hsl(var(--primary) / 0.1)' }}>
            <Brain className="w-6 h-6 text-emerald-500" weight="duotone" />
          </div>
          <div>
            <h3 className="font-serif font-semibold text-base mb-1">Welcome to CashDash.ai</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Get started by chatting with your AI assistant. Just say something like{' '}
              <em className="text-foreground/80">&ldquo;I spent ₱150 on lunch and ₱50 on jeep fare&rdquo;</em> and CashDash will
              parse and let you confirm before saving.
            </p>
            <Link href="/dashboard/ai-assistant">
              <motion.button className="mt-4 btn-primary" whileTap={{ scale: 0.97 }}>
                <Brain className="w-4 h-4" weight="regular" /> Open AI Assistant
              </motion.button>
            </Link>
          </div>
        </motion.div>
      )}
    </div>
  );
}
