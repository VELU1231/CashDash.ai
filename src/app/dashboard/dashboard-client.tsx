'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import {
  TrendUp, TrendDown, Wallet, ArrowsLeftRight,
  Brain, ArrowUpRight, ArrowDownRight,
  Target, Sparkle, Crown
} from '@phosphor-icons/react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { formatCurrency, formatRelativeDate } from '@/lib/utils';
import type { Profile, Transaction, Account } from '@/types';

const AreaChartCard = dynamic(() => import('@/components/ui/chartjs-components').then(m => ({ default: m.AreaChartCard })), { ssr: false });
const LineChartCard = dynamic(() => import('@/components/ui/chartjs-components').then(m => ({ default: m.LineChartCard })), { ssr: false });
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

const fadeUp = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } };
const stagger = { animate: { transition: { staggerChildren: 0.06 } } };

const CHART_PALETTE = [
  '#10b981', '#3b82f6', '#a855f7', '#f59e0b',
  '#ef4444', '#06b6d4', '#ec4899', '#64748b',
];

export function DashboardClient({ transactions, prevTransactions, accounts, trendData, profile, currentMonth, flags }: Props) {
  const currency = profile?.default_currency || 'USD';
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});
  const [insight, setInsight] = useState<string | null>(null);
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
    } catch {
      // Keep the current screen state if background refresh fails.
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const handler = () => refreshDashboard();
    window.addEventListener('dashboardRefresh', handler);
    return () => window.removeEventListener('dashboardRefresh', handler);
  }, [refreshDashboard]);

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

  const stats = useMemo(() => {
    const income = liveTransactions.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + convert(tx.amount, tx.currency || 'USD'), 0);
    const expenses = liveTransactions.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + convert(tx.amount, tx.currency || 'USD'), 0);
    const prevIncome = prevTransactions.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + convert(tx.amount, (tx as { currency?: string }).currency || 'USD'), 0);
    const prevExpenses = prevTransactions.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + convert(tx.amount, (tx as { currency?: string }).currency || 'USD'), 0);
    const totalBalance = liveAccounts.reduce((sum, account) => sum + convert(account.balance, account.currency || 'USD'), 0);
    const savingsRate = income > 0 ? Math.round(((income - expenses) / income) * 100) : 0;
    const incomePct = prevIncome > 0 ? ((income - prevIncome) / prevIncome) * 100 : 0;
    const expensePct = prevExpenses > 0 ? ((expenses - prevExpenses) / prevExpenses) * 100 : 0;

    return {
      income,
      expenses,
      totalBalance,
      savingsRate,
      incomePct,
      expensePct,
      net: income - expenses,
    };
  }, [convert, liveAccounts, liveTransactions, prevTransactions]);

  const categoryData = useMemo(() => {
    const grouped: Record<string, { name: string; icon: string; color: string; total: number; count: number }> = {};

    liveTransactions.filter(tx => tx.type === 'expense').forEach(tx => {
      const category = tx.category;
      const key = category?.id || 'uncategorized';
      if (!grouped[key]) {
        grouped[key] = {
          name: category?.name || 'Uncategorized',
          icon: category?.icon || '📦',
          color: category?.color || '#94a3b8',
          total: 0,
          count: 0,
        };
      }

      grouped[key].total += convert(tx.amount, tx.currency || 'USD');
      grouped[key].count += 1;
    });

    return Object.values(grouped)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
      .map((item, index) => ({
        ...item,
        percentage: stats.expenses > 0 ? Math.round((item.total / stats.expenses) * 100) : 0,
        fill: item.color || CHART_PALETTE[index % CHART_PALETTE.length],
      }));
  }, [convert, liveTransactions, stats.expenses]);

  const trendChartData = useMemo(() => {
    const monthly: Record<string, { month: string; label: string; income: number; expenses: number }> = {};

    trendData.forEach(tx => {
      const key = tx.transaction_date.slice(0, 7);
      if (!monthly[key]) {
        monthly[key] = {
          month: key,
          label: format(parseISO(`${key}-01`), 'MMM'),
          income: 0,
          expenses: 0,
        };
      }

      if (tx.type === 'income') monthly[key].income += convert(tx.amount, tx.currency || 'USD');
      if (tx.type === 'expense') monthly[key].expenses += convert(tx.amount, tx.currency || 'USD');
    });

    return Object.values(monthly).sort((a, b) => a.month.localeCompare(b.month));
  }, [convert, trendData]);

  const dailyData = useMemo(() => {
    const daily: Record<string, number> = {};

    liveTransactions.filter(tx => tx.type === 'expense').forEach(tx => {
      const day = tx.transaction_date.slice(0, 10);
      daily[day] = (daily[day] || 0) + convert(tx.amount, tx.currency || 'USD');
    });

    return Object.entries(daily)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({ date: format(parseISO(date), 'MMM d'), amount }));
  }, [convert, liveTransactions]);

  const recentTransactions = liveTransactions.slice(0, 8);
  const fmtCompact = (value: number) => formatCurrency(value, currency, { compact: true });

  return (
    <div className="space-y-3 md:space-y-5">
      {/* ─── Hero Balance Card ─── */}
      <motion.section
        className="glass-card overflow-hidden"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      >
        <div className="p-4 md:p-6">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">{currentMonth}</p>
          <h2 className="mt-1.5 text-2xl font-serif font-bold tracking-tight md:text-4xl">{formatCurrency(stats.totalBalance, currency)}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {liveAccounts.length} account{liveAccounts.length === 1 ? '' : 's'}
            {refreshing ? '  ·  syncing' : ''}
          </p>

          {/* Inline Income / Expense / Net row */}
          <div className="mt-4 flex items-center gap-0 text-center" style={{ borderTop: '1px solid hsl(var(--foreground) / 0.04)' }}>
            <div className="flex-1 py-3">
              <p className="text-[10px] text-muted-foreground">Income</p>
              <p className="mt-0.5 text-sm font-semibold text-emerald-500">{fmtCompact(stats.income)}</p>
            </div>
            <div className="w-px self-stretch bg-border/40" />
            <div className="flex-1 py-3">
              <p className="text-[10px] text-muted-foreground">Expenses</p>
              <p className="mt-0.5 text-sm font-semibold text-orange-500">{fmtCompact(stats.expenses)}</p>
            </div>
            <div className="w-px self-stretch bg-border/40" />
            <div className="flex-1 py-3">
              <p className="text-[10px] text-muted-foreground">Net</p>
              <p className={`mt-0.5 text-sm font-semibold ${stats.net >= 0 ? 'text-primary' : 'text-red-500'}`}>
                {stats.net >= 0 ? '+' : ''}{fmtCompact(stats.net)}
              </p>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ─── AI Insight ─── */}
      {insight && (profile?.subscription_tier !== 'free' || process.env.NODE_ENV === 'development') && (
        <motion.div
          className="glass-card flex items-start gap-3 p-3.5"
          style={{ borderColor: 'hsl(var(--primary) / 0.1)' }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        >
          <Sparkle className="h-4 w-4 shrink-0 mt-0.5 text-primary" weight="duotone" />
          <p className="text-xs leading-relaxed text-muted-foreground">{insight}</p>
        </motion.div>
      )}

      {/* ─── Stat Cards ─── */}
      <motion.div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3" initial="initial" animate="animate" variants={stagger}>
        {[
          {
            label: 'Income', value: formatCurrency(stats.income, currency),
            change: stats.incomePct, icon: TrendUp,
            color: 'text-emerald-500', iconBg: 'bg-emerald-500/10', invertChange: false,
          },
          {
            label: 'Expenses', value: formatCurrency(stats.expenses, currency),
            change: stats.expensePct, icon: TrendDown,
            color: 'text-orange-500', iconBg: 'bg-orange-500/10', invertChange: true,
          },
          {
            label: 'Savings', value: `${Math.max(0, stats.savingsRate)}%`,
            change: null, icon: Target,
            color: 'text-violet-500', iconBg: 'bg-violet-500/10', invertChange: false,
            subcopy: fmtCompact(stats.net),
          },
          {
            label: 'Accounts', value: String(liveAccounts.length),
            change: null, icon: Wallet,
            color: 'text-primary', iconBg: 'bg-primary/10', invertChange: false,
            subcopy: refreshing ? 'Syncing' : 'Active',
          },
        ].map((stat) => {
          const Icon = stat.icon;
          const isPositive = stat.change === null ? true : stat.invertChange ? stat.change < 0 : stat.change >= 0;

          return (
            <motion.div key={stat.label} variants={fadeUp} className="rounded-2xl border border-border/60 bg-card/70 p-3 md:p-4">
              <div className="flex items-center justify-between gap-1">
                <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${stat.iconBg}`}>
                  <Icon className="h-3.5 w-3.5 ${stat.color}" weight="regular" style={{ color: 'inherit' }} />
                </div>
                {stat.change !== null && (
                  <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                    {isPositive ? <ArrowUpRight className="h-2.5 w-2.5" weight="bold" /> : <ArrowDownRight className="h-2.5 w-2.5" weight="bold" />}
                    {Math.abs(stat.change).toFixed(1)}%
                  </span>
                )}
              </div>
              <p className="mt-2.5 text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
              <p className="mt-0.5 text-base font-semibold leading-tight text-foreground md:text-lg">{stat.value}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">{stat.subcopy || 'vs last month'}</p>
            </motion.div>
          );
        })}
      </motion.div>

      {/* ─── Charts Row ─── */}
      <div className="grid grid-cols-1 gap-3 md:gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        {/* Income vs Expenses — Area/Line Chart */}
        <motion.section className="glass-card p-4 md:p-5" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Income vs Expenses</h3>
              <p className="text-[10px] text-muted-foreground">Six month trend</p>
            </div>
            <Link href="/dashboard/analytics" className="text-[10px] font-medium text-primary">Open</Link>
          </div>
          {trendChartData.length > 0 ? (
            <AreaChartCard
              labels={trendChartData.map(item => item.label)}
              datasets={[
                { label: 'Income', data: trendChartData.map(item => item.income), borderColor: '#10b981', bgFrom: 'rgba(16,185,129,0.15)', bgTo: 'rgba(16,185,129,0)' },
                { label: 'Expenses', data: trendChartData.map(item => item.expenses), borderColor: '#f97316', bgFrom: 'rgba(249,115,22,0.12)', bgTo: 'rgba(249,115,22,0)' },
              ]}
              formatValue={fmtCompact}
              height={200}
            />
          ) : (
            <div className="flex h-[200px] flex-col items-center justify-center text-center text-muted-foreground">
              <TrendUp className="mb-2 h-8 w-8 opacity-20" weight="light" />
              <p className="text-xs">Add transactions to see trends</p>
            </div>
          )}
        </motion.section>

        {/* Category Mix — Doughnut + flat list */}
        <motion.section className="glass-card p-4 md:p-5" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Category Mix</h3>
              <p className="text-[10px] text-muted-foreground">Where your money goes</p>
            </div>
            <Link href="/dashboard/categories" className="text-[10px] font-medium text-primary">Manage</Link>
          </div>
          {categoryData.length > 0 ? (
            <>
              <DoughnutChartCard
                labels={categoryData.map(item => item.name)}
                data={categoryData.map(item => item.total)}
                colors={categoryData.map((item, index) => item.fill || CHART_PALETTE[index % CHART_PALETTE.length])}
                centerValue={fmtCompact(stats.expenses)}
                centerLabel="Spent"
                height={150}
                formatValue={(value: number) => formatCurrency(value, currency)}
              />
              <div className="mt-3">
                {categoryData.slice(0, 4).map((item) => (
                  <div key={item.name} className="flat-list-item">
                    <div className="flat-list-icon">{item.icon}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-medium text-foreground">{item.name}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{item.percentage}%</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{formatCurrency(item.total, currency)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex h-[200px] flex-col items-center justify-center text-center text-muted-foreground">
              <Target className="mb-2 h-8 w-8 opacity-20" weight="light" />
              <p className="text-xs">Categories appear when you add expenses</p>
            </div>
          )}
        </motion.section>
      </div>

      {/* ─── Daily Spending — Line Chart (was bar) ─── */}
      {dailyData.length > 0 && (
        <motion.section className="glass-card p-4 md:p-5" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Daily Spending</h3>
              <p className="text-[10px] text-muted-foreground">This month&apos;s rhythm</p>
            </div>
            <span className="text-[10px] text-muted-foreground">{dailyData.length} days</span>
          </div>
          <LineChartCard
            labels={dailyData.map(item => item.date)}
            data={dailyData.map(item => item.amount)}
            color="#10b981"
            formatValue={fmtCompact}
            height={160}
          />
        </motion.section>
      )}

      {/* ─── Accounts + Recent Transactions ─── */}
      <div className="grid grid-cols-1 gap-3 md:gap-4 xl:grid-cols-2">
        {/* Accounts — flat list */}
        <motion.section className="glass-card overflow-hidden" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <div className="flex items-center justify-between px-4 pt-4 pb-1">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Accounts</h3>
              <p className="text-[10px] text-muted-foreground">Your wallets</p>
            </div>
            <Link href="/dashboard/accounts" className="text-[10px] font-medium text-primary">All</Link>
          </div>
          {liveAccounts.length > 0 ? (
            <div>
              {liveAccounts.slice(0, 5).map((account) => (
                <div key={account.id} className="flat-list-item">
                  <div className="flat-list-icon" style={{ background: `${account.color}15` }}>
                    {account.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground">{account.name}</p>
                    <p className="text-[10px] capitalize text-muted-foreground">{account.type}</p>
                  </div>
                  <p className={`text-xs font-semibold tabular-nums ${account.balance >= 0 ? 'text-foreground' : 'text-red-500'}`}>
                    {formatCurrency(account.balance, account.currency)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 py-8 text-center text-muted-foreground">
              <Wallet className="mx-auto mb-2 h-7 w-7 opacity-25" weight="light" />
              <p className="text-xs">No accounts yet</p>
            </div>
          )}
        </motion.section>

        {/* Recent Transactions — flat list */}
        <motion.section className="glass-card overflow-hidden" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="flex items-center justify-between px-4 pt-4 pb-1">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Recent</h3>
              <p className="text-[10px] text-muted-foreground">Latest activity</p>
            </div>
            <Link href="/dashboard/transactions" className="text-[10px] font-medium text-primary">All</Link>
          </div>
          {recentTransactions.length > 0 ? (
            <div>
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="flat-list-item">
                  <div className="flat-list-icon">
                    {tx.category?.icon || (tx.type === 'income' ? '💰' : tx.type === 'transfer' ? '↔️' : '💸')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground">{tx.description || tx.category?.name || 'Transaction'}</p>
                    <p className="text-[10px] text-muted-foreground">{formatRelativeDate(tx.transaction_date)}</p>
                  </div>
                  <p className={`text-xs font-semibold tabular-nums ${tx.type === 'income' ? 'text-emerald-500' : tx.type === 'expense' ? 'text-red-500' : 'text-primary'}`}>
                    {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                    {formatCurrency(tx.amount, tx.currency)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 py-8 text-center text-muted-foreground">
              <ArrowsLeftRight className="mx-auto mb-2 h-7 w-7 opacity-25" weight="light" />
              <p className="text-xs">No transactions yet</p>
            </div>
          )}
        </motion.section>
      </div>

      {/* ─── Empty State CTA ─── */}
      {transactions.length === 0 && (
        <motion.section
          className="glass-card flex items-start gap-3 p-4"
          style={{ borderColor: 'hsl(var(--primary) / 0.1)' }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Brain className="h-5 w-5" weight="duotone" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Start with one message</h3>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Say something like &ldquo;I spent ₱150 on lunch&rdquo; and CashBash will log it for you.
            </p>
            <Link href="/dashboard/ai-assistant">
              <motion.span className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground" whileTap={{ scale: 0.97 }}>
                <Brain className="h-3.5 w-3.5" weight="regular" /> Open AI
              </motion.span>
            </Link>
          </div>
        </motion.section>
      )}
    </div>
  );
}
