'use client';
export const runtime = 'edge';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { formatCurrency } from '@/lib/utils';
import { format, subMonths, addMonths } from 'date-fns';
import { PromoCard } from '@/components/ads/promo-card';

const PieChartCard = dynamic(() => import('@/components/ui/chartjs-components').then(m => ({ default: m.PieChartCard })), { ssr: false });
const AreaChartCard = dynamic(() => import('@/components/ui/chartjs-components').then(m => ({ default: m.AreaChartCard })), { ssr: false });
const LineChartCard = dynamic(() => import('@/components/ui/chartjs-components').then(m => ({ default: m.LineChartCard })), { ssr: false });
const RadarChartCard = dynamic(() => import('@/components/ui/chartjs-components').then(m => ({ default: m.RadarChartCard })), { ssr: false });
const DoughnutChartCard = dynamic(() => import('@/components/ui/chartjs-components').then(m => ({ default: m.DoughnutChartCard })), { ssr: false });

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
  const [profileCurrency, setProfileCurrency] = useState('USD');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [analyticsRes, profileRes] = await Promise.all([
        fetch(`/api/analytics?period=${period}`),
        fetch('/api/profile'),
      ]);
      const analyticsJson = await analyticsRes.json();
      const profileJson = await profileRes.json();
      if (analyticsJson.data) {
        setData(analyticsJson.data);
        setSummary(analyticsJson.summary || { totalIncome: 0, totalExpenses: 0, avgDailySpend: 0, transactionCount: 0 });
      }
      if (profileJson.data?.default_currency) {
        setProfileCurrency(profileJson.data.default_currency);
      }
    } catch {}
    setLoading(false);
  }, [period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const prevMonth = () => setCurrentDate(d => subMonths(d, 1));
  const nextMonth = () => setCurrentDate(d => addMonths(d, 1));

  const categories = data?.categories || [];
  const monthly = data?.monthly || [];
  const totalAmount = activeTab === 'expenses' ? summary.totalExpenses : summary.totalIncome;
  const netAmount = summary.totalIncome - summary.totalExpenses;
  const savingsRate = summary.totalIncome > 0 ? Math.round((netAmount / summary.totalIncome) * 100) : 0;
  const cur = profileCurrency;

  const coloredCategories = categories.map((cat, i) => ({
    ...cat,
    assignedColor: cat.color || CHART_COLORS[i % CHART_COLORS.length],
  }));

  // Health score
  const healthScore = Math.min(100, Math.max(0,
    savingsRate > 0 ? Math.round(savingsRate * 1.5 + 30) : Math.max(0, 30 + savingsRate)
  ));
  const healthLabel = healthScore >= 80 ? 'Excellent' : healthScore >= 60 ? 'Good' : healthScore >= 40 ? 'Fair' : 'Needs Work';
  const healthColor = healthScore >= 80 ? '#69db7c' : healthScore >= 60 ? '#ffd43b' : healthScore >= 40 ? '#ffa94d' : '#ff6b6b';

  // Daily spending data from categories count
  const avgDaily = summary.avgDailySpend || (summary.totalExpenses > 0 ? Math.round(summary.totalExpenses / 30) : 0);

  const fmt = (v: number) => formatCurrency(v, cur);

  return (
    <div className="space-y-0 pb-24">
      {/* ── Header — month nav ── */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="p-1"><CaretLeft className="w-5 h-5" /></button>
          <span className="text-lg font-semibold">{format(currentDate, 'MMM yyyy')}</span>
          <button onClick={nextMonth} className="p-1"><CaretRight className="w-5 h-5" /></button>
        </div>
      </div>

      {/* ── Period pills ── */}
      <div className="flex gap-1 px-4 pb-3">
        {PERIODS.map(p => (
          <button key={p.value} onClick={() => setPeriod(p.value)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
              period === p.value ? 'bg-primary text-primary-foreground' : 'bg-foreground/[0.04] text-muted-foreground'
            }`}>{p.label}</button>
        ))}
      </div>

      {/* ── Income / Expenses tabs ── */}
      <div className="flex border-b border-border/30">
        <button onClick={() => setActiveTab('income')}
          className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
            activeTab === 'income' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-muted-foreground'
          }`}>Income</button>
        <button onClick={() => setActiveTab('expenses')}
          className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
            activeTab === 'expenses' ? 'text-red-400 border-b-2 border-red-400' : 'text-muted-foreground'
          }`}>Expenses</button>
      </div>

      {/* ── 4 summary stat boxes — always visible ── */}
      <div className="grid grid-cols-2 gap-px bg-border/10">
        <div className="bg-background px-4 py-3">
          <p className="text-[10px] text-muted-foreground uppercase">Total Income</p>
          <p className="text-base font-semibold text-blue-400 tabular-nums">{fmt(summary.totalIncome)}</p>
        </div>
        <div className="bg-background px-4 py-3">
          <p className="text-[10px] text-muted-foreground uppercase">Total Expenses</p>
          <p className="text-base font-semibold text-red-400 tabular-nums">{fmt(summary.totalExpenses)}</p>
        </div>
        <div className="bg-background px-4 py-3">
          <p className="text-[10px] text-muted-foreground uppercase">Net Savings</p>
          <p className={`text-base font-semibold tabular-nums ${netAmount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {netAmount >= 0 ? '+' : ''}{fmt(netAmount)}
          </p>
        </div>
        <div className="bg-background px-4 py-3">
          <p className="text-[10px] text-muted-foreground uppercase">Daily Average</p>
          <p className="text-base font-semibold text-muted-foreground tabular-nums">{fmt(avgDaily)}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* ══════ PIE CHART — always visible ══════ */}
          <SectionLabel title="Category Breakdown" />
          <div className="px-4 py-4">
            {coloredCategories.length > 0 ? (
              <PieChartCard
                labels={coloredCategories.map(c => `${c.icon} ${c.name}`)}
                data={coloredCategories.map(c => c.total)}
                colors={coloredCategories.map(c => c.assignedColor)}
                height={280}
                formatValue={fmt}
              />
            ) : (
              <EmptyChart text="No category data for this period" />
            )}
          </div>

          {/* ══════ CATEGORY LIST — always visible ══════ */}
          <SectionLabel title={`Categories (${coloredCategories.length})`} />
          <div>
            {coloredCategories.map((cat) => {
              const pct = totalAmount > 0 ? Math.round((cat.total / totalAmount) * 100) : 0;
              return (
                <div key={cat.name} className="flat-list-item px-4">
                  <span className="pct-badge" style={{ background: cat.assignedColor }}>{pct}%</span>
                  <span className="text-base">{cat.icon}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium block truncate">{cat.name}</span>
                    <span className="text-xs text-muted-foreground">{cat.count} transaction{cat.count !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold tabular-nums block">{fmt(cat.total)}</span>
                    <div className="budget-bar-track mt-1" style={{ width: 60 }}>
                      <div className="budget-bar-fill" style={{ width: `${pct}%`, background: cat.assignedColor }} />
                    </div>
                  </div>
                </div>
              );
            })}
            {coloredCategories.length === 0 && <EmptyChart text="No categories yet" />}
          </div>

          {/* ══════ INCOME VS EXPENSES TREND — always visible ══════ */}
          <SectionLabel title="Income vs Expenses Trend" />
          <div className="px-4 py-4">
            {monthly.length > 0 ? (
              <AreaChartCard
                labels={monthly.map(m => m.label)}
                datasets={[
                  { label: 'Income', data: monthly.map(m => m.income), borderColor: '#4dabf7', bgFrom: 'rgba(77,171,247,0.15)', bgTo: 'transparent' },
                  { label: 'Expenses', data: monthly.map(m => m.expenses), borderColor: '#ff6b6b', bgFrom: 'rgba(255,107,107,0.15)', bgTo: 'transparent' },
                ]}
                height={220}
                formatValue={fmt}
              />
            ) : (
              <EmptyChart text="Not enough data for trends yet" />
            )}
          </div>

          {/* ══════ NET CASH FLOW — always visible ══════ */}
          {monthly.length > 0 && (
            <>
              <SectionLabel title="Net Cash Flow" />
              <div className="px-4 py-4">
                <LineChartCard
                  labels={monthly.map(m => m.label)}
                  data={monthly.map(m => m.income - m.expenses)}
                  color={netAmount >= 0 ? '#69db7c' : '#ff6b6b'}
                  formatValue={fmt}
                  height={180}
                />
              </div>
            </>
          )}

          {/* ══════ FINANCIAL HEALTH SCORE — always visible ══════ */}
          <SectionLabel title="Financial Health Score" />
          <div className="px-4 py-4">
            <div className="flex items-center gap-5">
              <div className="relative w-20 h-20 shrink-0">
                <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="hsl(var(--foreground) / 0.06)" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke={healthColor} strokeWidth="3"
                    strokeDasharray={`${healthScore} ${100 - healthScore}`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold" style={{ color: healthColor }}>{healthScore}</span>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-lg font-semibold" style={{ color: healthColor }}>{healthLabel}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {savingsRate >= 20 ? 'Great savings discipline! Keep it up.' :
                   savingsRate >= 0 ? 'Room for improvement — try to save more.' :
                   'Spending exceeds income — review your expenses.'}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <HealthBar label="Savings Rate" value={Math.max(0, savingsRate)} color="#69db7c" />
              <HealthBar label="Spending Control" value={Math.min(100, Math.max(0, 100 - (summary.totalExpenses / Math.max(1, summary.totalIncome)) * 100))} color="#4dabf7" />
              <HealthBar label="Consistency" value={Math.min(100, (summary.transactionCount || 0) * 3)} color="#9775fa" />
            </div>
          </div>

          {/* ══════ SPENDING RADAR — always visible (3+ categories) ══════ */}
          {coloredCategories.length >= 3 && (
            <>
              <SectionLabel title="Spending Radar" />
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
            </>
          )}

          {/* ══════ TOP SPENDING INSIGHTS — CashDash unique ══════ */}
          {coloredCategories.length > 0 && (
            <>
              <SectionLabel title="Top Insights" />
              <div className="px-4 py-3 space-y-2">
                {coloredCategories.slice(0, 3).map((cat, i) => {
                  const pct = totalAmount > 0 ? Math.round((cat.total / totalAmount) * 100) : 0;
                  return (
                    <div key={cat.name} className="flex items-start gap-3 py-2">
                      <span className="text-lg">{cat.icon}</span>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        <span className="font-semibold text-foreground">{cat.name}</span> accounts for{' '}
                        <span className="font-semibold" style={{ color: cat.assignedColor }}>{pct}%</span> of your{' '}
                        {activeTab} ({fmt(cat.total)}) across {cat.count} transaction{cat.count !== 1 ? 's' : ''}.
                      </p>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ══════ EXPENSE DOUGHNUT — bonus chart ══════ */}
          {coloredCategories.length > 0 && (
            <>
              <SectionLabel title="Expense Distribution" />
              <div className="px-4 py-4">
                <DoughnutChartCard
                  labels={coloredCategories.map(c => c.name)}
                  data={coloredCategories.map(c => c.total)}
                  colors={coloredCategories.map(c => c.assignedColor)}
                  centerValue={fmt(summary.totalExpenses)}
                  centerLabel="Total Spent"
                  height={220}
                  formatValue={fmt}
                />
              </div>
            </>
          )}
        </>
      )}
      {/* Promo — 1 per page, free tier */}
      <div className="mt-4">
        <PromoCard page="analytics" />
      </div>
    </div>
  );
}

// ── Helper components ──

function SectionLabel({ title }: { title: string }) {
  return (
    <div className="px-4 pt-5 pb-1">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
    </div>
  );
}

function EmptyChart({ text }: { text: string }) {
  return <div className="text-center py-10 text-sm text-muted-foreground">{text}</div>;
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

