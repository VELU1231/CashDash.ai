'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts';
import {
  TrendingUp, TrendingDown, Wallet, ArrowLeftRight,
  Brain, ArrowUpRight, ArrowDownRight,
  Plus, Target, Sparkles, AlertCircle
} from 'lucide-react';
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

  const stats = useMemo(() => {
    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const prevIncome = prevTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const prevExpenses = prevTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
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
      grouped[key].total += t.amount;
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
  }, [transactions, stats.expenses]);

  const trendChartData = useMemo(() => {
    const monthly: Record<string, { month: string; label: string; income: number; expenses: number }> = {};
    trendData.forEach(tx => {
      const key = tx.transaction_date.slice(0, 7);
      if (!monthly[key]) {
        monthly[key] = { month: key, label: format(parseISO(`${key}-01`), 'MMM'), income: 0, expenses: 0 };
      }
      if (tx.type === 'income') monthly[key].income += tx.amount;
      if (tx.type === 'expense') monthly[key].expenses += tx.amount;
    });
    return Object.values(monthly).sort((a, b) => a.month.localeCompare(b.month));
  }, [trendData]);

  const dailyData = useMemo(() => {
    const daily: Record<string, number> = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
      const day = t.transaction_date.slice(0, 10);
      daily[day] = (daily[day] || 0) + t.amount;
    });
    return Object.entries(daily)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({ date: format(parseISO(date), 'MMM d'), amount }));
  }, [transactions]);

  const recentTransactions = transactions.slice(0, 8);

  const renderTooltip = (props: any) => <ChartTooltip {...props} currency={currency} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div className="flex items-center justify-between" {...fadeUp} transition={{ duration: 0.4 }}>
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{currentMonth} overview</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/ai-assistant">
            <motion.button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Sparkles className="w-4 h-4" /> Ask AI
            </motion.button>
          </Link>
          <Link href="/dashboard/ai-assistant">
            <motion.button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all hover:shadow-glow"
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Plus className="w-4 h-4" /> Add transaction
            </motion.button>
          </Link>
        </div>
      </motion.div>

      {/* Stat Cards */}
      <motion.div className="grid grid-cols-2 lg:grid-cols-4 gap-4" initial="initial" animate="animate"
        variants={{ animate: { transition: { staggerChildren: 0.08 } } }}>
        {[
          { label: 'Total Balance', value: formatCurrency(stats.totalBalance, currency), icon: Wallet, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/50', change: null, sub: `${accounts.length} accounts` },
          { label: 'Monthly Income', value: formatCurrency(stats.income, currency), icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/50', change: stats.incomePct, sub: 'vs last month' },
          { label: 'Monthly Expenses', value: formatCurrency(stats.expenses, currency), icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/50', change: stats.expensePct, sub: 'vs last month', invertChange: true },
          { label: 'Savings Rate', value: `${Math.max(0, stats.savingsRate)}%`, icon: Target, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/50', change: null, sub: formatCurrency(stats.net, currency) + ' net' },
        ].map((stat) => {
          const Icon = stat.icon;
          const isPositive = stat.invertChange ? (stat.change ?? 0) < 0 : (stat.change ?? 0) >= 0;
          return (
            <motion.div key={stat.label} variants={fadeUp} className="stat-card">
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-lg ${stat.bg}`}><Icon className={`w-4 h-4 ${stat.color}`} /></div>
                {stat.change !== null && (
                  <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                    {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {Math.abs(stat.change).toFixed(1)}%
                  </span>
                )}
              </div>
              <div className="text-2xl font-bold tracking-tight">{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
              <div className="text-[11px] text-muted-foreground/60 mt-0.5">{stat.sub}</div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Income vs Expenses */}
        <motion.div className="lg:col-span-2 rounded-xl border border-border bg-card p-5 shadow-soft"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-sm">Income vs Expenses</h3>
              <p className="text-xs text-muted-foreground">6-month trend</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />Income</span>
              <span className="flex items-center gap-1.5 text-muted-foreground"><span className="w-2.5 h-2.5 rounded-full bg-red-400" />Expenses</span>
            </div>
          </div>
          {trendChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trendChartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f87171" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false}
                  tickFormatter={(v: number) => formatCurrency(v, currency, { compact: true })} />
                <Tooltip content={renderTooltip} />
                <Area type="monotone" dataKey="income" name="Income" stroke="#10b981" strokeWidth={2} fill="url(#incomeGrad)" dot={{ r: 3, fill: '#10b981' }} />
                <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#f87171" strokeWidth={2} fill="url(#expenseGrad)" dot={{ r: 3, fill: '#f87171' }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="No data yet — add transactions to see trends" />
          )}
        </motion.div>

        {/* Category Pie */}
        <motion.div className="rounded-xl border border-border bg-card p-5 shadow-soft"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <div className="mb-4">
            <h3 className="font-semibold text-sm">Spending by Category</h3>
            <p className="text-xs text-muted-foreground">This month</p>
          </div>
          {categoryData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="total" paddingAngle={2}>
                    {categoryData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip formatter={(value: number) => [formatCurrency(value, currency), '']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {categoryData.slice(0, 4).map((cat, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-sm">{cat.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-medium truncate">{cat.name}</span>
                        <span className="text-xs text-muted-foreground">{cat.percentage}%</span>
                      </div>
                      <div className="h-1 bg-muted rounded-full overflow-hidden">
                        <motion.div className="h-full rounded-full" style={{ background: cat.fill }}
                          initial={{ width: 0 }} animate={{ width: `${cat.percentage}%` }}
                          transition={{ delay: 0.5 + i * 0.1, duration: 0.6 }} />
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
        <motion.div className="rounded-xl border border-border bg-card p-5 shadow-soft"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <div className="mb-4">
            <h3 className="font-semibold text-sm">Daily Spending</h3>
            <p className="text-xs text-muted-foreground">Expense breakdown this month</p>
          </div>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={dailyData} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false}
                tickFormatter={(v: number) => formatCurrency(v, currency, { compact: true })} />
              <Tooltip formatter={(v: number) => [formatCurrency(v, currency), 'Spent']}
                contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))' }} />
              <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Accounts */}
        <motion.div className="lg:col-span-2 rounded-xl border border-border bg-card p-5 shadow-soft"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">Accounts</h3>
            <Link href="/dashboard/accounts" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          {accounts.length > 0 ? (
            <div className="space-y-2">
              {accounts.slice(0, 6).map((account) => (
                <motion.div key={account.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors" whileHover={{ x: 2 }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0" style={{ background: `${account.color}20` }}>{account.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{account.name}</div>
                    <div className="text-xs text-muted-foreground capitalize">{account.type}</div>
                  </div>
                  <div className={`text-sm font-semibold ${account.balance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {formatCurrency(account.balance, account.currency)}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Wallet className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No accounts yet</p>
              <Link href="/dashboard/accounts" className="text-xs text-primary hover:underline">Add account</Link>
            </div>
          )}
        </motion.div>

        {/* Recent Transactions */}
        <motion.div className="lg:col-span-3 rounded-xl border border-border bg-card p-5 shadow-soft"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">Recent Transactions</h3>
            <Link href="/dashboard/transactions" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          {recentTransactions.length > 0 ? (
            <div className="space-y-1">
              {recentTransactions.map((tx, i) => (
                <motion.div key={tx.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.65 + i * 0.04 }} whileHover={{ x: 2 }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 bg-muted">
                    {tx.category?.icon || (tx.type === 'income' ? '💰' : tx.type === 'transfer' ? '↔️' : '💸')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{tx.description || tx.category?.name || 'Transaction'}</div>
                    <div className="text-xs text-muted-foreground">{formatRelativeDate(tx.transaction_date)}</div>
                  </div>
                  <div className={`text-sm font-semibold shrink-0 ${tx.type === 'income' ? 'text-emerald-600' : tx.type === 'expense' ? 'text-red-500' : 'text-blue-500'}`}>
                    {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                    {formatCurrency(tx.amount, tx.currency)}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <ArrowLeftRight className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No transactions this month</p>
              <div className="flex items-center justify-center gap-2 mt-2">
                <Link href="/dashboard/ai-assistant" className="text-xs text-primary hover:underline">Add manually</Link>
                <span className="text-xs text-muted-foreground">or</span>
                <Link href="/dashboard/ai-assistant" className="text-xs text-primary hover:underline">use AI</Link>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Welcome Banner */}
      {transactions.length === 0 && (
        <motion.div className="rounded-xl border border-primary/20 bg-primary/5 p-5 flex items-start gap-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm mb-1">👋 Welcome to CashDash.ai!</h3>
            <p className="text-sm text-muted-foreground">
              Get started by chatting with your AI assistant. Just say something like{' '}
              <em>&ldquo;I spent ₱150 on lunch and ₱50 on jeep fare&rdquo;</em> and CashDash will
              parse and let you confirm before saving.
            </p>
            <Link href="/dashboard/ai-assistant">
              <motion.button className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
                whileTap={{ scale: 0.97 }}>
                <Brain className="w-4 h-4" /> Open AI Assistant
              </motion.button>
            </Link>
          </div>
        </motion.div>
      )}
    </div>
  );
}
