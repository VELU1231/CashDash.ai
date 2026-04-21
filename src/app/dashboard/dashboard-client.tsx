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
import { formatCurrency, formatRelativeDate } from '@/lib/utils';
import type { Profile, Transaction, Account } from '@/types';

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

  const statCards = [
    {
      label: 'Income',
      value: formatCurrency(stats.income, currency),
      change: stats.incomePct,
      icon: TrendUp,
      color: 'text-emerald-500',
      iconBg: 'bg-emerald-500/10',
      invertChange: false,
    },
    {
      label: 'Expenses',
      value: formatCurrency(stats.expenses, currency),
      change: stats.expensePct,
      icon: TrendDown,
      color: 'text-orange-500',
      iconBg: 'bg-orange-500/10',
      invertChange: true,
    },
    {
      label: 'Savings Rate',
      value: `${Math.max(0, stats.savingsRate)}%`,
      change: null,
      icon: Target,
      color: 'text-violet-500',
      iconBg: 'bg-violet-500/10',
      invertChange: false,
      subcopy: formatCurrency(stats.net, currency),
    },
    {
      label: 'Accounts',
      value: String(liveAccounts.length),
      change: null,
      icon: Wallet,
      color: 'text-primary',
      iconBg: 'bg-primary/10',
      invertChange: false,
      subcopy: refreshing ? 'Refreshing' : 'Active wallets',
    },
  ];

  const actionCards = [
    { href: '/dashboard/transactions/new', label: 'Add', subcopy: 'Quick expense', icon: Plus },
    { href: '/dashboard/transactions', label: 'History', subcopy: 'Review entries', icon: ArrowsLeftRight },
    { href: '/dashboard/accounts', label: 'Accounts', subcopy: 'Check balances', icon: Wallet },
    { href: '/dashboard/ai-assistant', label: 'AI', subcopy: 'Chat to log', icon: Brain, disabled: !flags?.showAI },
  ];

  return (
    <div className="space-y-4 md:space-y-6">
      <motion.section
        className="glass-card overflow-hidden"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
      >
        <div className="space-y-5 p-5 md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground">{currentMonth}</p>
              <h2 className="mt-2 text-3xl font-serif font-bold tracking-tight md:text-5xl">{formatCurrency(stats.totalBalance, currency)}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Available across {liveAccounts.length} account{liveAccounts.length === 1 ? '' : 's'}
                {refreshing ? '  •  syncing' : ''}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary md:h-14 md:w-14">
              <Wallet className="h-6 w-6" weight="duotone" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-border/70 bg-card/70 p-3.5">
              <p className="text-xs text-muted-foreground">This month in</p>
              <p className="mt-1 text-base font-semibold text-emerald-500">{formatCurrency(stats.income, currency, { compact: true })}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-card/70 p-3.5">
              <p className="text-xs text-muted-foreground">This month out</p>
              <p className="mt-1 text-base font-semibold text-orange-500">{formatCurrency(stats.expenses, currency, { compact: true })}</p>
            </div>
            <div className="col-span-2 rounded-2xl border border-border/70 bg-card/70 p-3.5 md:col-span-1">
              <p className="text-xs text-muted-foreground">Net flow</p>
              <p className={`mt-1 text-base font-semibold ${stats.net >= 0 ? 'text-primary' : 'text-red-500'}`}>
                {stats.net >= 0 ? '+' : '-'}{formatCurrency(Math.abs(stats.net), currency, { compact: true })}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 border-t border-border/70 bg-foreground/[0.015]">
          {actionCards.map(({ href, label, subcopy, icon: Icon, disabled }) => (
            <Link
              key={href}
              href={disabled ? '/dashboard' : href}
              className="border-r border-border/60 last:border-r-0"
            >
              <div className={`flex min-h-[84px] flex-col items-center justify-center gap-1.5 px-2 py-3 text-center transition-colors ${disabled ? 'opacity-40' : 'hover:bg-foreground/[0.025]'}`}>
                <Icon className="h-5 w-5 text-primary" weight="regular" />
                <span className="text-xs font-semibold text-foreground">{label}</span>
                <span className="text-[10px] text-muted-foreground">{subcopy}</span>
              </div>
            </Link>
          ))}
        </div>
      </motion.section>

      {profile?.subscription_tier === 'free' && (
        <motion.div
          className="glass-card flex items-center justify-between gap-4 p-4"
          style={{ borderColor: 'hsl(var(--primary) / 0.15)' }}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Crown className="h-5 w-5" weight="duotone" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Unlock Pro tools</h3>
              <p className="text-xs text-muted-foreground">Receipt scanning, richer insights, and multi-currency workflows.</p>
            </div>
          </div>
          <Link href="/pricing" className="shrink-0">
            <button className="btn-primary !h-10 !rounded-2xl !px-4 !py-0 !text-xs">Upgrade</button>
          </Link>
        </motion.div>
      )}

      {insight && (profile?.subscription_tier !== 'free' || process.env.NODE_ENV === 'development') && (
        <motion.div
          className="glass-card flex items-start gap-4 p-4"
          style={{ borderColor: 'hsl(var(--primary) / 0.12)' }}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sparkle className="h-5 w-5" weight="duotone" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">AI financial health report</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{insight}</p>
          </div>
        </motion.div>
      )}

      <motion.div className="grid grid-cols-2 gap-3 md:grid-cols-4" initial="initial" animate="animate" variants={stagger}>
        {statCards.map((stat) => {
          const Icon = stat.icon;
          const isPositive = stat.change === null ? true : stat.invertChange ? stat.change < 0 : stat.change >= 0;

          return (
            <motion.div key={stat.label} variants={fadeUp} className="rounded-[24px] border border-border/70 bg-card/80 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${stat.iconBg}`}>
                  <Icon className={`h-4.5 w-4.5 ${stat.color}`} weight="regular" />
                </div>
                {stat.change !== null && (
                  <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                    {isPositive ? <ArrowUpRight className="h-3 w-3" weight="bold" /> : <ArrowDownRight className="h-3 w-3" weight="bold" />}
                    {Math.abs(stat.change).toFixed(1)}%
                  </span>
                )}
              </div>
              <p className="mt-4 text-xs text-muted-foreground">{stat.label}</p>
              <p className="mt-1 text-lg font-semibold leading-tight text-foreground md:text-2xl">{stat.value}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{stat.subcopy || 'vs last month'}</p>
            </motion.div>
          );
        })}
      </motion.div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <motion.section className="glass-card p-5 md:p-6" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-foreground">Income vs expenses</h3>
              <p className="text-xs text-muted-foreground">Six month trend</p>
            </div>
            <Link href="/dashboard/analytics" className="text-xs font-medium text-primary">Open</Link>
          </div>
          {trendChartData.length > 0 ? (
            <AreaChartCard
              labels={trendChartData.map(item => item.label)}
              datasets={[
                { label: 'Income', data: trendChartData.map(item => item.income), borderColor: '#10b981', bgFrom: 'rgba(16,185,129,0.18)', bgTo: 'rgba(16,185,129,0)' },
                { label: 'Expenses', data: trendChartData.map(item => item.expenses), borderColor: '#f97316', bgFrom: 'rgba(249,115,22,0.16)', bgTo: 'rgba(249,115,22,0)' },
              ]}
              formatValue={fmtCompact}
              height={220}
            />
          ) : (
            <div className="flex h-[220px] flex-col items-center justify-center text-center text-muted-foreground">
              <TrendUp className="mb-3 h-9 w-9 opacity-25" weight="light" />
              <p className="text-sm">Add transactions to unlock monthly trends.</p>
            </div>
          )}
        </motion.section>

        <motion.section className="glass-card p-5 md:p-6" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-foreground">Category mix</h3>
              <p className="text-xs text-muted-foreground">Where your money is going</p>
            </div>
            <Link href="/dashboard/categories" className="text-xs font-medium text-primary">Manage</Link>
          </div>
          {categoryData.length > 0 ? (
            <>
              <DoughnutChartCard
                labels={categoryData.map(item => item.name)}
                data={categoryData.map(item => item.total)}
                colors={categoryData.map((item, index) => item.fill || CHART_PALETTE[index % CHART_PALETTE.length])}
                centerValue={formatCurrency(stats.expenses, currency, { compact: true })}
                centerLabel="Spent"
                height={170}
                formatValue={(value: number) => formatCurrency(value, currency)}
              />
              <div className="mt-4 space-y-2.5">
                {categoryData.slice(0, 4).map((item) => (
                  <div key={item.name} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/50 px-3 py-2.5">
                    <span className="text-base">{item.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium text-foreground">{item.name}</span>
                        <span className="text-xs text-muted-foreground">{item.percentage}%</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{formatCurrency(item.total, currency)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex h-[220px] flex-col items-center justify-center text-center text-muted-foreground">
              <Target className="mb-3 h-9 w-9 opacity-25" weight="light" />
              <p className="text-sm">Your expense categories will appear here.</p>
            </div>
          )}
        </motion.section>
      </div>

      {dailyData.length > 0 && (
        <motion.section className="glass-card p-5 md:p-6" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-foreground">Daily spending</h3>
              <p className="text-xs text-muted-foreground">This month&apos;s rhythm</p>
            </div>
            <span className="text-xs text-muted-foreground">{dailyData.length} days</span>
          </div>
          <BarChartCard
            labels={dailyData.map(item => item.date)}
            data={dailyData.map(item => item.amount)}
            colors={dailyData.map(() => '#10b981')}
            formatValue={fmtCompact}
            height={170}
          />
        </motion.section>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <motion.section className="glass-card p-5 md:p-6" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-foreground">Accounts</h3>
              <p className="text-xs text-muted-foreground">Your active wallets</p>
            </div>
            <Link href="/dashboard/accounts" className="text-xs font-medium text-primary">View all</Link>
          </div>
          {liveAccounts.length > 0 ? (
            <div className="space-y-2">
              {liveAccounts.slice(0, 6).map((account) => (
                <div key={account.id} className="flex items-center gap-3 rounded-[22px] border border-border/60 bg-card/55 px-3.5 py-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl text-lg" style={{ background: `${account.color}18` }}>
                    {account.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{account.name}</p>
                    <p className="text-xs capitalize text-muted-foreground">{account.type}</p>
                  </div>
                  <p className={`text-sm font-semibold ${account.balance >= 0 ? 'text-foreground' : 'text-red-500'}`}>
                    {formatCurrency(account.balance, account.currency)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-border p-6 text-center text-muted-foreground">
              <Wallet className="mx-auto mb-3 h-8 w-8 opacity-30" weight="light" />
              <p className="text-sm">No accounts yet.</p>
            </div>
          )}
        </motion.section>

        <motion.section className="glass-card p-5 md:p-6" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-foreground">Recent transactions</h3>
              <p className="text-xs text-muted-foreground">Latest activity in your wallet</p>
            </div>
            <Link href="/dashboard/transactions" className="text-xs font-medium text-primary">View all</Link>
          </div>
          {recentTransactions.length > 0 ? (
            <div className="space-y-2">
              {recentTransactions.map((tx, index) => (
                <motion.div
                  key={tx.id}
                  className="flex items-center gap-3 rounded-[22px] border border-border/60 bg-card/55 px-3.5 py-3"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.03 }}
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-foreground/[0.04] text-base">
                    {tx.category?.icon || (tx.type === 'income' ? '💰' : tx.type === 'transfer' ? '↔️' : '💸')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{tx.description || tx.category?.name || 'Transaction'}</p>
                    <p className="text-xs text-muted-foreground">{formatRelativeDate(tx.transaction_date)}</p>
                  </div>
                  <p className={`text-sm font-semibold ${tx.type === 'income' ? 'text-emerald-500' : tx.type === 'expense' ? 'text-red-500' : 'text-primary'}`}>
                    {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                    {formatCurrency(tx.amount, tx.currency)}
                  </p>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-border p-6 text-center text-muted-foreground">
              <ArrowsLeftRight className="mx-auto mb-3 h-8 w-8 opacity-30" weight="light" />
              <p className="text-sm">No transactions yet.</p>
            </div>
          )}
        </motion.section>
      </div>

      {transactions.length === 0 && (
        <motion.section
          className="glass-card flex items-start gap-4 p-5 md:p-6"
          style={{ borderColor: 'hsl(var(--primary) / 0.12)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Brain className="h-6 w-6" weight="duotone" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">Start with one message</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Say something like “I spent ₱150 on lunch and ₱50 on jeep fare” and CashDash will prepare the entry for you.
            </p>
            <Link href="/dashboard/ai-assistant">
              <motion.button className="btn-primary mt-4 !rounded-2xl" whileTap={{ scale: 0.97 }}>
                <Brain className="h-4 w-4" weight="regular" /> Open AI assistant
              </motion.button>
            </Link>
          </div>
        </motion.section>
      )}
    </div>
  );
}
