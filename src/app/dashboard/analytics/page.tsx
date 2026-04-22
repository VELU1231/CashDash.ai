'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CaretLeft, CaretRight, Heartbeat, TrendUp, TrendDown,
  ChartPieSlice, Target, Lightning, CaretDown, CaretUp
} from '@phosphor-icons/react';
import { formatCurrency } from '@/lib/utils';
import { format, subMonths, addMonths, subDays } from 'date-fns';

const PieChartCard = dynamic(() => import('@/components/ui/chartjs-components').then(m => ({ default: m.PieChartCard })), { ssr: false });
const DoughnutChartCard = dynamic(() => import('@/components/ui/chartjs-components').then(m => ({ default: m.DoughnutChartCard })), { ssr: false });
const LineChartCard = dynamic(() => import('@/components/ui/chartjs-components').then(m => ({ default: m.LineChartCard })), { ssr: false });
const AreaChartCard = dynamic(() => import('@/components/ui/chartjs-components').then(m => ({ default: m.AreaChartCard })), { ssr: false });
const RadarChartCard = dynamic(() => import('@/components/ui/chartjs-components').then(m => ({ default: m.RadarChartCard })), { ssr: false });

const CHART_COLORS = [
  '#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c',
  '#4dabf7', '#9775fa', '#f783ac', '#63e6be',
  '#748ffc', '#e599f7', '#a9e34b', '#38d9a9',
];

interface AnalyticsData {
  monthly: { month: string; label: string; income: number; expenses: number; net: number }[];
  daily: { date: string; label: string; income: number; expenses: number }[];
  categories: { name: string; icon: string; color: string; total: number; percentage: number; count: number }[];
}

interface HealthScores {
  savingsRate: { score: number; desc: string };
  spendingControl: { score: number; desc: string };
  incomeStability: { score: number; desc: string };
}

interface Summary {
  totalIncome: number;
  totalExpenses: number;
  avgDailySpend: number;
  transactionCount: number;
}

const PERIODS = [
  { label: '7D', value: '7d' },
  { label: '1M', value: '1m' },
  { label: '3M', value: '3m' },
  { label: '6M', value: '6m' },
  { label: '1Y', value: '1y' },
];

export default function AnalyticsPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'income' | 'expenses'>('expenses');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [summary, setSummary] = useState<Summary>({ totalIncome: 0, totalExpenses: 0, avgDailySpend: 0, transactionCount: 0 });
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('1m');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    pie: true,
    categories: true,
    trend: false,
    health: false,
    radar: false,
  });

  const toggleSection = (key: string) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?period=${period}`);
      const json = await res.json();
      if (json.data) {
        setData(json.data);
        setSummary(json.summary || { totalIncome: 0, totalExpenses: 0, avgDailySpend: 0, transactionCount: 0 });
      }
    } catch {}
    setLoading(false);
  }, [period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const prevMonth = () => setCurrentDate(d => subMonths(d, 1));
  const nextMonth = () => setCurrentDate(d => addMonths(d, 1));

  const categories = data?.categories || [];
  const monthly = data?.monthly || [];
  const daily = data?.daily || [];
  const totalAmount = activeTab === 'expenses' ? summary.totalExpenses : summary.totalIncome;
  const netAmount = summary.totalIncome - summary.totalExpenses;
  const savingsRate = summary.totalIncome > 0 ? Math.round((netAmount / summary.totalIncome) * 100) : 0;

  const coloredCategories = categories.map((cat, i) => ({
    ...cat,
    assignedColor: CHART_COLORS[i % CHART_COLORS.length],
  }));

  // Health score calculation
  const healthScore = Math.min(100, Math.max(0,
    savingsRate > 0 ? Math.round(savingsRate * 1.5 + 30) : Math.max(0, 30 + savingsRate)
  ));
  const healthLabel = healthScore >= 80 ? 'Excellent' : healthScore >= 60 ? 'Good' : healthScore >= 40 ? 'Fair' : 'Needs Work';
  const healthColor = healthScore >= 80 ? '#69db7c' : healthScore >= 60 ? '#ffd43b' : healthScore >= 40 ? '#ffa94d' : '#ff6b6b';

  return (
    <div className="space-y-0 pb-24">
      {/* Header — month nav */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="p-1"><CaretLeft className="w-5 h-5" /></button>
          <span className="text-lg font-semibold">{format(currentDate, 'MMM yyyy')}</span>
          <button onClick={nextMonth} className="p-1"><CaretRight className="w-5 h-5" /></button>
        </div>
      </div>

      {/* Period selector — pill row */}
      <div className="flex gap-1 px-4 pb-3">
        {PERIODS.map(p => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
              period === p.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-foreground/[0.04] text-muted-foreground'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Income / Expenses toggle */}
      <div className="flex border-b border-border/30">
        <button
          onClick={() => setActiveTab('income')}
          className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
            activeTab === 'income'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-muted-foreground'
          }`}
        >
          Income
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
            activeTab === 'expenses'
              ? 'text-red-400 border-b-2 border-red-400'
              : 'text-muted-foreground'
          }`}
        >
          Expenses
        </button>
      </div>

      {/* Summary cards — 4 stats */}
      <div className="grid grid-cols-2 gap-px bg-border/10">
        <div className="bg-background px-4 py-3">
          <p className="text-[10px] text-muted-foreground uppercase">Total Income</p>
          <p className="text-base font-semibold text-blue-400 tabular-nums">{formatCurrency(summary.totalIncome, 'USD')}</p>
        </div>
        <div className="bg-background px-4 py-3">
          <p className="text-[10px] text-muted-foreground uppercase">Total Expenses</p>
          <p className="text-base font-semibold text-red-400 tabular-nums">{formatCurrency(summary.totalExpenses, 'USD')}</p>
        </div>
        <div className="bg-background px-4 py-3">
          <p className="text-[10px] text-muted-foreground uppercase">Net Savings</p>
          <p className={`text-base font-semibold tabular-nums ${netAmount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {netAmount >= 0 ? '+' : ''}{formatCurrency(netAmount, 'USD')}
          </p>
        </div>
        <div className="bg-background px-4 py-3">
          <p className="text-[10px] text-muted-foreground uppercase">Savings Rate</p>
          <p className={`text-base font-semibold ${savingsRate >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {savingsRate}%
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* ── Section: Pie Chart ── */}
          <SectionHeader
            icon={ChartPieSlice}
            title="Category Breakdown"
            expanded={expandedSections.pie}
            onToggle={() => toggleSection('pie')}
          />
          {expandedSections.pie && (
            <div className="px-4 py-4">
              {coloredCategories.length > 0 ? (
                <PieChartCard
                  labels={coloredCategories.map(c => `${c.icon} ${c.name}`)}
                  data={coloredCategories.map(c => c.total)}
                  colors={coloredCategories.map(c => c.assignedColor)}
                  height={280}
                />
              ) : (
                <div className="text-center py-12 text-muted-foreground text-sm">No data for this period</div>
              )}
            </div>
          )}

          {/* ── Section: Category List ── */}
          <SectionHeader
            icon={Target}
            title={`Categories (${coloredCategories.length})`}
            expanded={expandedSections.categories}
            onToggle={() => toggleSection('categories')}
          />
          {expandedSections.categories && (
            <div>
              {coloredCategories.map((cat) => {
                const pct = totalAmount > 0 ? Math.round((cat.total / totalAmount) * 100) : 0;
                return (
                  <div key={cat.name} className="flat-list-item px-4">
                    <span className="pct-badge" style={{ background: cat.assignedColor }}>{pct}%</span>
                    <span className="text-base">{cat.icon}</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium block truncate">{cat.name}</span>
                      <span className="text-xs text-muted-foreground">{cat.count} transactions</span>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">{formatCurrency(cat.total, 'USD')}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Section: Income vs Expenses Trend ── */}
          <SectionHeader
            icon={TrendUp}
            title="Income vs Expenses Trend"
            expanded={expandedSections.trend}
            onToggle={() => toggleSection('trend')}
          />
          {expandedSections.trend && monthly.length > 0 && (
            <div className="px-4 py-4">
              <AreaChartCard
                labels={monthly.map(m => m.label)}
                datasets={[
                  { label: 'Income', data: monthly.map(m => m.income), borderColor: '#4dabf7', bgFrom: 'rgba(77,171,247,0.2)', bgTo: 'transparent' },
                  { label: 'Expenses', data: monthly.map(m => m.expenses), borderColor: '#ff6b6b', bgFrom: 'rgba(255,107,107,0.2)', bgTo: 'transparent' },
                ]}
                height={220}
              />
            </div>
          )}
          {expandedSections.trend && monthly.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">Not enough data for trends</div>
          )}

          {/* ── Section: Financial Health Score ── */}
          <SectionHeader
            icon={Heartbeat}
            title="Financial Health"
            expanded={expandedSections.health}
            onToggle={() => toggleSection('health')}
          />
          {expandedSections.health && (
            <div className="px-4 py-4 space-y-4">
              {/* Score ring */}
              <div className="flex items-center gap-5">
                <div className="relative w-20 h-20">
                  <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="hsl(var(--foreground) / 0.06)" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke={healthColor} strokeWidth="3"
                      strokeDasharray={`${healthScore} ${100 - healthScore}`} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-bold" style={{ color: healthColor }}>{healthScore}</span>
                  </div>
                </div>
                <div>
                  <p className="text-lg font-semibold" style={{ color: healthColor }}>{healthLabel}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {savingsRate >= 20 ? 'Great savings discipline!' :
                     savingsRate >= 0 ? 'Room for improvement' :
                     'Spending exceeds income'}
                  </p>
                </div>
              </div>

              {/* Breakdown bars */}
              <div className="space-y-3">
                <HealthBar label="Savings Rate" value={Math.max(0, savingsRate)} color="#69db7c" />
                <HealthBar label="Spending Control" value={Math.min(100, Math.max(0, 100 - (summary.totalExpenses / Math.max(1, summary.totalIncome)) * 100))} color="#4dabf7" />
                <HealthBar label="Consistency" value={Math.min(100, (summary.transactionCount || 0) * 3)} color="#9775fa" />
              </div>
            </div>
          )}

          {/* ── Section: Category Radar ── */}
          <SectionHeader
            icon={Lightning}
            title="Spending Radar"
            expanded={expandedSections.radar}
            onToggle={() => toggleSection('radar')}
          />
          {expandedSections.radar && coloredCategories.length >= 3 && (
            <div className="px-4 py-4">
              <RadarChartCard
                labels={coloredCategories.slice(0, 8).map(c => c.name)}
                datasets={[{
                  label: 'Spending',
                  data: coloredCategories.slice(0, 8).map(c => c.total),
                  color: '#ff6b6b',
                }]}
                height={260}
              />
            </div>
          )}
          {expandedSections.radar && coloredCategories.length < 3 && (
            <div className="text-center py-8 text-sm text-muted-foreground">Need at least 3 categories for radar</div>
          )}
        </>
      )}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, expanded, onToggle }: {
  icon: React.ElementType; title: string; expanded: boolean; onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-4 py-3 border-t border-border/10 active:bg-foreground/[0.02]"
    >
      <div className="flex items-center gap-2.5">
        <Icon className="w-4.5 h-4.5 text-muted-foreground" weight="regular" />
        <span className="text-sm font-semibold">{title}</span>
      </div>
      {expanded ? <CaretUp className="w-4 h-4 text-muted-foreground" /> : <CaretDown className="w-4 h-4 text-muted-foreground" />}
    </button>
  );
}

function HealthBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-semibold" style={{ color }}>{Math.round(value)}%</span>
      </div>
      <div className="budget-bar-track">
        <div className="budget-bar-fill" style={{ width: `${Math.min(100, value)}%`, background: color }} />
      </div>
    </div>
  );
}
