'use client';

import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts';
import {
  TrendUp, TrendDown, Wallet, ArrowsLeftRight,
  Brain, ArrowUpRight, ArrowDownRight,
  Plus, Target, Sparkle, Crown
} from '@phosphor-icons/react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { formatCurrency, getChartColor, formatRelativeDate } from '@/lib/utils';
import { ChartTooltip, EmptyChart, StatCardSkeleton, ChartSkeleton } from '@/components/ui/charts';
import type { Profile, Transaction, Account } from '@/types';

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

export function DashboardClient({ transactions, prevTransactions, accounts, trendData, profile, currentMonth, flags }: Props) {
  const currency = profile?.default_currency || 'USD';
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});
  const [insight, setInsight] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/exchange-rates?base=${currency}`)
      .then(res => res.json())
      .then(data => {
        if (data.rates) setExchangeRates(data.rates);
      })
      .catch(console.error);

    if (profile?.subscription_tier !== 'free' || process.env.NODE_ENV === 'development') {
      fetch('/api/ai/insights')
        .then(r => r.json())
        .then(data => {
          if (data.insight) setInsight(data.insight);
        }).catch(console.error);
    }
  }, [currency, profile?.subscription_tier]);

  // Helper to convert foreign currency to base currency
  const convert = (amount: number, fromCurr: string) => {
    if (!fromCurr || fromCurr === currency || !exchangeRates[fromCurr]) return amount;
    return amount / exchangeRates[fromCurr];
  };

  const stats = useMemo(() => {
    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + convert(t.amount, t.currency || 'USD'), 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + convert(t.amount, t.currency || 'USD'), 0);
    const prevIncome = prevTransactions.filter(t => t.type === 'income').reduce((s, t) => s + convert(t.amount, (t as any).currency || 'USD'), 0);
    const prevExpenses = prevTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + convert(t.amount, (t as any).currency || 'USD'), 0);
    const totalBalance = accounts.reduce((s, a) => s + convert(a.balance, a.currency || 'USD'), 0);
    const savingsRate = income > 0 ? Math.round((income - expenses) / income * 100) : 0;
    const incomePct = prevIncome > 0 ? ((income - prevIncome) / prevIncome) * 100 : 0;
    const expensePct = prevExpenses > 0 ? ((expenses - prevExpenses) / prevExpenses) * 100 : 0;
    return { income, expenses, totalBalance, savingsRate, incomePct, expensePct, net: income - expenses };
  }, [transactions, prevTransactions, accounts]);

  const categoryData = useMemo(() => {
    const grouped: Record<string, { name: string; icon: string; color: string; total: number; count: number }> = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
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
        fill: item.color || getChartColor(i),
      }));
  }, [transactions, stats.expenses, exchangeRates]);

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

  const dailyData = useMemo(() => {
    const daily: Record<string, number> = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
      const day = t.transaction_date.slice(0, 10);
      daily[day] = (daily[day] || 0) + convert(t.amount, t.currency || 'USD');
    });
    return Object.entries(daily)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({ date: format(parseISO(date), 'MMM d'), amount }));
  }, [transactions, exchangeRates]);

  const recentTransactions = transactions.slice(0, 8);

  const renderTooltip = (props: any) => <ChartTooltip {...props} currency={currency} />;

  return (
    <div className="space-y-6">
      {/* Header — Editorial Style */}
      <motion.div className="flex items-end justify-between" {...fadeUp} transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}>
        <div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1 font-mono">{currentMonth} overview</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/ai-assistant">
            <motion.button className="btn-secondary !rounded-xl"
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Sparkle className="w-4 h-4" weight="duotone" /> Ask AI
            </motion.button>
          </Link>
          <Link href="/dashboard/transactions/new">
            <motion.button className="btn-primary !rounded-xl"
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Plus className="w-4 h-4" weight="bold" /> Add transaction
            </motion.button>
          </Link>
        </div>
      </motion.div>

      {/* Upgrade Banner for Free Users */}
      {profile?.subscription_tier === 'free' && (
        <motion.div className="glass-card p-4 flex items-center justify-between"
          style={{ borderColor: 'hsl(var(--warm) / 0.2)' }}
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'hsl(var(--warm) / 0.12)' }}>
              <Crown className="w-5 h-5" weight="duotone" style={{ color: 'hsl(var(--warm))' }} />
            </div>
            <div>
              <h4 className="font-semibold text-sm" style={{ color: 'hsl(var(--warm))' }}>Upgrade to Pro</h4>
              <p className="text-xs text-muted-foreground">Unlock Multi-currency, Receipt Scanning, and AI Insights.</p>
            </div>
          </div>
          <Link href="/pricing">
            <button className="px-4 py-2 rounded-xl text-white text-sm font-medium transition-all duration-200 hover:shadow-glow-warm"
              style={{ background: 'hsl(var(--warm))' }}>
              Upgrade Now
            </button>
          </Link>
        </motion.div>
      )}

      {/* Proactive AI Insight — Editorial Card */}
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

      {/* Stat Cards — Editorial Numbers */}
      <motion.div className="grid grid-cols-2 lg:grid-cols-4 gap-4" initial="initial" animate="animate"
        variants={{ animate: { transition: { staggerChildren: 0.08 } } }}>
        {[
          { label: 'Total Balance', value: formatCurrency(stats.totalBalance, currency), icon: Wallet, color: 'text-emerald-500', bg: 'hsl(160 84% 39% / 0.08)', change: null, sub: `${accounts.length} accounts` },
          { label: 'Monthly Income', value: formatCurrency(stats.income, currency), icon: TrendUp, color: 'text-emerald-500', bg: 'hsl(160 84% 39% / 0.08)', change: stats.incomePct, sub: 'vs last month' },
          { label: 'Monthly Expenses', value: formatCurrency(stats.expenses, currency), icon: TrendDown, color: 'hsl(var(--warm))', bg: 'hsl(var(--warm) / 0.08)', change: stats.expensePct, sub: 'vs last month', invertChange: true },
          { label: 'Savings Rate', value: `${Math.max(0, stats.savingsRate)}%`, icon: Target, color: 'text-emerald-500', bg: 'hsl(280 45% 55% / 0.08)', change: null, sub: formatCurrency(stats.net, currency) + ' net' },
        ].map((stat) => {
          const Icon = stat.icon;
          const isPositive = stat.invertChange ? (stat.change ?? 0) < 0 : (stat.change ?? 0) >= 0;
          return (
            <motion.div key={stat.label} variants={fadeUp} className="stat-card group">
              <div className="flex items-start justify-between mb-4">
                <div className="p-2.5 rounded-xl" style={{ background: stat.bg }}>
                  <Icon className="w-4 h-4" weight="regular" style={{ color: typeof stat.color === 'string' && stat.color.startsWith('hsl') ? stat.color : undefined }} />
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

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Income vs Expenses */}
        <motion.div className="lg:col-span-2 glass-card p-5"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-serif font-semibold text-base">Income vs Expenses</h3>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">6-month trend</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />Income</span>
              <span className="flex items-center gap-1.5 text-muted-foreground"><span className="w-2.5 h-2.5 rounded-full" style={{ background: 'hsl(var(--warm))' }} />Expenses</span>
            </div>
          </div>
          {trendChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trendChartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D9722A" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#D9722A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--foreground) / 0.04)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false}
                  tickFormatter={(v: number) => formatCurrency(v, currency, { compact: true })} />
                <Tooltip content={renderTooltip} />
                <Area type="monotone" dataKey="income" name="Income" stroke="#10b981" strokeWidth={2} fill="url(#incomeGrad)" dot={{ r: 3, fill: '#10b981' }} />
                <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#D9722A" strokeWidth={2} fill="url(#expenseGrad)" dot={{ r: 3, fill: '#D9722A' }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="No data yet — add transactions to see trends" />
          )}
        </motion.div>

        {/* Category Pie */}
        <motion.div className="glass-card p-5"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <div className="mb-5">
            <h3 className="font-serif font-semibold text-base">Spending by Category</h3>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">This month</p>
          </div>
          {categoryData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="total" paddingAngle={2}>
                    {categoryData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip formatter={(value: number) => [formatCurrency(value, currency), '']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2.5 mt-3">
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
            <EmptyChart message="No expenses logged this month" />
          )}
        </motion.div>
      </div>

      {/* Daily Spending */}
      {dailyData.length > 0 && (
        <motion.div className="glass-card p-5"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <div className="mb-5">
            <h3 className="font-serif font-semibold text-base">Daily Spending</h3>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">Expense breakdown this month</p>
          </div>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={dailyData} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--foreground) / 0.04)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false}
                tickFormatter={(v: number) => formatCurrency(v, currency, { compact: true })} />
              <Tooltip formatter={(v: number) => [formatCurrency(v, currency), 'Spent']}
                contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
              <Bar dataKey="amount" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Bottom Row */}
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

      {/* Welcome Banner */}
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
              <motion.button className="mt-4 btn-primary"
                whileTap={{ scale: 0.97 }}>
                <Brain className="w-4 h-4" weight="regular" /> Open AI Assistant
              </motion.button>
            </Link>
          </div>
        </motion.div>
      )}
    </div>
  );
}
