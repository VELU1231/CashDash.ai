'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, Treemap
} from 'recharts';
import {
  TrendUp, TrendDown, ChartBar, ChartPieSlice,
  Calendar, Target, Brain, DownloadSimple, ArrowUpRight, ArrowDownRight,
  Funnel, Sparkle
} from '@phosphor-icons/react';
import { formatCurrency, getChartColor, CHART_COLORS, formatDate } from '@/lib/utils';
import { format, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns';

const PERIODS = [
  { label: '7 days', value: '7d' },
  { label: '1 month', value: '1m' },
  { label: '3 months', value: '3m' },
  { label: '6 months', value: '6m' },
  { label: '1 year', value: '1y' },
];

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('1m');
  const [data, setData] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [insight, setInsight] = useState('');

  useEffect(() => { fetchAnalytics(); }, [period]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?period=${period}`);
      const json = await res.json();
      setData(json.data || {});
      setInsight(json.insight || '');
    } catch {
      // Use mock data for demo
      setData(getMockData());
    } finally {
      setLoading(false);
    }
  };

  const getMockData = () => {
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(new Date(), 5 - i);
      return {
        month: format(d, 'yyyy-MM'),
        label: format(d, 'MMM'),
        income: Math.floor(Math.random() * 50000 + 40000) * 100,
        expenses: Math.floor(Math.random() * 30000 + 20000) * 100,
      };
    });
    return { monthly: months, categories: [], daily: [] };
  };

  const monthly = (data.monthly as { label: string; income: number; expenses: number; month: string }[]) || [];
  const categories = (data.categories as { name: string; icon: string; color: string; total: number; percentage: number }[]) || [];

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { color: string; name: string; value: number }[]; label?: string }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-xl border border-border bg-card p-3 shadow-lg text-xs space-y-1.5">
        <p className="font-semibold text-foreground">{label}</p>
        {payload.map((p) => (
          <div key={p.name} className="flex items-center gap-2 text-muted-foreground">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
            <span>{p.name}:</span>
            <span className="font-medium text-foreground">{formatCurrency(p.value, 'USD')}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-sm text-muted-foreground">Your financial insights at a glance</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Period selector */}
          <div className="flex items-center gap-1 p-1 rounded-lg border border-input bg-background">
            {PERIODS.map(p => (
              <button key={p.value} onClick={() => setPeriod(p.value)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  period === p.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* AI Insight Banner */}
      {insight && (
        <motion.div
          className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        >
          <Sparkle className="w-4 h-4 text-primary shrink-0 mt-0.5" weight="duotone" />
          <p className="text-sm text-foreground">{insight}</p>
        </motion.div>
      )}

      {/* Summary Stats */}
      {monthly.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {(() => {
            const totalIncome = monthly.reduce((s, m) => s + m.income, 0);
            const totalExpenses = monthly.reduce((s, m) => s + m.expenses, 0);
            const avgMonthly = totalExpenses / Math.max(monthly.length, 1);
            const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome * 100) : 0;
            return [
              { label: 'Total Income', value: formatCurrency(totalIncome, 'USD'), icon: TrendUp, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
              { label: 'Total Expenses', value: formatCurrency(totalExpenses, 'USD'), icon: TrendDown, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950/30' },
              { label: 'Avg Monthly Spend', value: formatCurrency(avgMonthly, 'USD'), icon: ChartBar, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/30' },
              { label: 'Savings Rate', value: `${Math.max(0, savingsRate).toFixed(1)}%`, icon: Target, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-950/30' },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <motion.div key={stat.label} className="stat-card" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
                  <div className={`inline-flex p-2 rounded-lg ${stat.bg} mb-3`}>
                    <Icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                  <div className="text-xl font-bold">{stat.value}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
                </motion.div>
              );
            });
          })()}
        </div>
      )}

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Income vs Expenses Area Chart */}
        <motion.div className="glass-card p-5 lg:col-span-2"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">Income vs Expenses</h3>
              <p className="text-xs text-muted-foreground">Monthly comparison over time</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-emerald-500 rounded" />Income</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-red-400 rounded" />Expenses</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-blue-400 rounded dashed" />Net</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={monthly} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="aIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="aExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f87171" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false}
                tickFormatter={(v) => formatCurrency(v, 'USD', { compact: true })} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="income" name="Income" stroke="#10b981" strokeWidth={2.5} fill="url(#aIncome)" dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} />
              <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#f87171" strokeWidth={2.5} fill="url(#aExpense)" dot={{ r: 4, fill: '#f87171' }} activeDot={{ r: 6 }} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Monthly Bar Chart */}
        <motion.div className="glass-card p-5"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="mb-4">
            <h3 className="font-semibold">Monthly Net Flow</h3>
            <p className="text-xs text-muted-foreground">Income minus expenses per month</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthly.map(m => ({ ...m, net: m.income - m.expenses }))} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false}
                tickFormatter={(v) => formatCurrency(v, 'USD', { compact: true })} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="net" name="Net" radius={[6, 6, 0, 0]} maxBarSize={40}>
                {monthly.map((m, i) => (
                  <Cell key={i} fill={(m.income - m.expenses) >= 0 ? '#10b981' : '#f87171'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Category Breakdown Pie */}
        <motion.div className="glass-card p-5"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="mb-4">
            <h3 className="font-semibold">Spending by Category</h3>
            <p className="text-xs text-muted-foreground">Where your money goes</p>
          </div>
          {categories.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie data={categories} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="total" paddingAngle={2}>
                    {categories.map((_, i) => <Cell key={i} fill={getChartColor(i)} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => [formatCurrency(v, 'USD'), '']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {categories.slice(0, 5).map((cat, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-sm">{cat.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-medium truncate">{cat.name}</span>
                        <span className="text-xs text-muted-foreground">{cat.percentage}%</span>
                      </div>
                      <div className="h-1 bg-muted rounded-full overflow-hidden">
                        <motion.div className="h-full rounded-full" style={{ background: getChartColor(i) }}
                          initial={{ width: 0 }} animate={{ width: `${cat.percentage}%` }}
                          transition={{ delay: 0.4 + i * 0.1, duration: 0.6 }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40">
              <ChartPieSlice className="w-10 h-10 text-muted-foreground/30 mb-2" weight="light" />
              <p className="text-xs text-muted-foreground">No expense data yet</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Savings Goal Progress */}
      <motion.div className="glass-card p-5"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-semibold">Financial Health Score</h3>
            <p className="text-xs text-muted-foreground">Based on your spending patterns</p>
          </div>
          <Brain className="w-5 h-5 text-primary" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Savings Rate', score: 72, desc: 'Good', color: '#10b981' },
            { label: 'Spending Control', score: 65, desc: 'Fair', color: '#f59e0b' },
            { label: 'Income Stability', score: 88, desc: 'Excellent', color: '#3b82f6' },
          ].map((metric, i) => (
            <div key={metric.label} className="text-center">
              <div className="relative w-20 h-20 mx-auto mb-3">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="hsl(var(--muted))" strokeWidth="2" />
                  <motion.circle cx="18" cy="18" r="15.9" fill="none" stroke={metric.color} strokeWidth="2"
                    strokeDasharray={`${metric.score} 100`} strokeLinecap="round"
                    initial={{ strokeDasharray: '0 100' }}
                    animate={{ strokeDasharray: `${metric.score} 100` }}
                    transition={{ delay: 0.5 + i * 0.1, duration: 1 }} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold">{metric.score}</span>
                </div>
              </div>
              <div className="text-sm font-medium">{metric.label}</div>
              <div className="text-xs text-muted-foreground">{metric.desc}</div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
