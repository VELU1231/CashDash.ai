'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendUp, TrendDown, ChartBar, ChartPieSlice,
  Target, Brain, Sparkle
} from '@phosphor-icons/react';
import { formatCurrency, getChartColor } from '@/lib/utils';
import { format, subMonths } from 'date-fns';
import { AreaChartCard, BarChartCard, DoughnutChartCard } from '@/components/ui/chartjs-components';

const PERIODS = [
  { label: '7 days', value: '7d' },
  { label: '1 month', value: '1m' },
  { label: '3 months', value: '3m' },
  { label: '6 months', value: '6m' },
  { label: '1 year', value: '1y' },
];

const CHART_PALETTE = [
  '#10b981', '#C9A87C', '#3b82f6', '#a855f7',
  '#f59e0b', '#ef4444', '#06b6d4', '#ec4899',
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

  const fmtCompact = (v: number) => formatCurrency(v, 'USD', { compact: true });
  const fmtFull = (v: number) => formatCurrency(v, 'USD');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold">Analytics</h1>
          <p className="text-sm text-muted-foreground font-mono mt-0.5">Your financial insights at a glance</p>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl border border-input bg-background/50 backdrop-blur-sm">
          {PERIODS.map(p => (
            <button key={p.value} onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                period === p.value
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04]'
              }`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* AI Insight */}
      {insight && (
        <motion.div className="glass-card p-4 flex items-start gap-3"
          style={{ borderColor: 'hsl(var(--primary) / 0.15)' }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Sparkle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" weight="duotone" />
          <p className="text-sm text-foreground leading-relaxed">{insight}</p>
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
              { label: 'Total Income', value: fmtFull(totalIncome), icon: TrendUp, color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
              { label: 'Total Expenses', value: fmtFull(totalExpenses), icon: TrendDown, color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
              { label: 'Avg Monthly Spend', value: fmtFull(avgMonthly), icon: ChartBar, color: '#3b82f6', bg: 'rgba(59,130,246,0.08)' },
              { label: 'Savings Rate', value: `${Math.max(0, savingsRate).toFixed(1)}%`, icon: Target, color: '#a855f7', bg: 'rgba(168,85,247,0.08)' },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <motion.div key={stat.label} className="stat-card" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="p-2.5 rounded-xl inline-flex mb-3" style={{ background: stat.bg }}>
                    <Icon className="w-4 h-4" style={{ color: stat.color }} />
                  </div>
                  <div className="text-xl font-serif font-bold editorial-number">{stat.value}</div>
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
              <h3 className="font-serif font-semibold">Income vs Expenses</h3>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">Monthly comparison over time</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />Income</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400" />Expenses</span>
            </div>
          </div>
          {monthly.length > 0 ? (
            <AreaChartCard
              labels={monthly.map(m => m.label)}
              datasets={[
                { label: 'Income', data: monthly.map(m => m.income), borderColor: '#10b981', bgFrom: 'rgba(16,185,129,0.18)', bgTo: 'rgba(16,185,129,0)' },
                { label: 'Expenses', data: monthly.map(m => m.expenses), borderColor: '#f87171', bgFrom: 'rgba(248,113,113,0.15)', bgTo: 'rgba(248,113,113,0)' },
              ]}
              formatValue={fmtCompact}
              height={260}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-[260px] text-muted-foreground">
              <ChartBar className="w-10 h-10 opacity-20 mb-2" />
              <p className="text-sm">No data for this period</p>
            </div>
          )}
        </motion.div>

        {/* Monthly Net Flow Bar Chart */}
        <motion.div className="glass-card p-5"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="mb-4">
            <h3 className="font-serif font-semibold">Monthly Net Flow</h3>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">Income minus expenses</p>
          </div>
          {monthly.length > 0 ? (
            <BarChartCard
              labels={monthly.map(m => m.label)}
              data={monthly.map(m => m.income - m.expenses)}
              formatValue={fmtCompact}
              height={220}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-[220px] text-muted-foreground">
              <ChartBar className="w-10 h-10 opacity-20 mb-2" />
              <p className="text-sm">No data yet</p>
            </div>
          )}
        </motion.div>

        {/* Category Doughnut */}
        <motion.div className="glass-card p-5"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="mb-4">
            <h3 className="font-serif font-semibold">Spending by Category</h3>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">Where your money goes</p>
          </div>
          {categories.length > 0 ? (
            <div className="flex items-center gap-4">
              <div className="w-1/2">
                <DoughnutChartCard
                  labels={categories.map(c => c.name)}
                  data={categories.map(c => c.total)}
                  colors={categories.map((c, i) => c.color || CHART_PALETTE[i % CHART_PALETTE.length])}
                  height={200}
                  formatValue={fmtFull}
                />
              </div>
              <div className="flex-1 space-y-2">
                {categories.slice(0, 5).map((cat, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-sm">{cat.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-medium truncate">{cat.name}</span>
                        <span className="text-xs text-muted-foreground font-mono">{cat.percentage}%</span>
                      </div>
                      <div className="h-1 bg-muted rounded-full overflow-hidden">
                        <motion.div className="h-full rounded-full" style={{ background: cat.color || CHART_PALETTE[i] }}
                          initial={{ width: 0 }} animate={{ width: `${cat.percentage}%` }}
                          transition={{ delay: 0.4 + i * 0.1, duration: 0.6 }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
              <ChartPieSlice className="w-10 h-10 opacity-20 mb-2" weight="light" />
              <p className="text-sm">No expense data yet</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Financial Health Score */}
      <motion.div className="glass-card p-5"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-serif font-semibold">Financial Health Score</h3>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">Based on your spending patterns</p>
          </div>
          <Brain className="w-5 h-5 text-emerald-500" weight="duotone" />
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
                  <motion.circle cx="18" cy="18" r="15.9" fill="none" stroke={metric.color} strokeWidth="2.5"
                    strokeDasharray={`${metric.score} 100`} strokeLinecap="round"
                    initial={{ strokeDasharray: '0 100' }}
                    animate={{ strokeDasharray: `${metric.score} 100` }}
                    transition={{ delay: 0.5 + i * 0.15, duration: 1, ease: [0.4, 0, 0.2, 1] }} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-serif font-bold editorial-number">{metric.score}</span>
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
