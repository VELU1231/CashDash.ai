'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendUp, TrendDown, ChartBar, ChartPieSlice,
  Target, Brain, Sparkle, Funnel, X, CalendarBlank,
  ArrowUp, ArrowDown, Equals
} from '@phosphor-icons/react';
import { formatCurrency } from '@/lib/utils';
import { format, subDays } from 'date-fns';

const AreaChartCard = dynamic(() => import('@/components/ui/chartjs-components').then(m => ({ default: m.AreaChartCard })), { ssr: false });
const BarChartCard = dynamic(() => import('@/components/ui/chartjs-components').then(m => ({ default: m.BarChartCard })), { ssr: false });
const DoughnutChartCard = dynamic(() => import('@/components/ui/chartjs-components').then(m => ({ default: m.DoughnutChartCard })), { ssr: false });
const TreemapChartCard = dynamic(() => import('@/components/ui/chartjs-components').then(m => ({ default: m.TreemapChartCard })), { ssr: false });
const MatrixChartCard = dynamic(() => import('@/components/ui/chartjs-components').then(m => ({ default: m.MatrixChartCard })), { ssr: false });
const RadarChartCard = dynamic(() => import('@/components/ui/chartjs-components').then(m => ({ default: m.RadarChartCard })), { ssr: false });
const PolarAreaChartCard = dynamic(() => import('@/components/ui/chartjs-components').then(m => ({ default: m.PolarAreaChartCard })), { ssr: false });
const ScatterChartCard = dynamic(() => import('@/components/ui/chartjs-components').then(m => ({ default: m.ScatterChartCard })), { ssr: false });
const BubbleChartCard = dynamic(() => import('@/components/ui/chartjs-components').then(m => ({ default: m.BubbleChartCard })), { ssr: false });
const PieChartCard = dynamic(() => import('@/components/ui/chartjs-components').then(m => ({ default: m.PieChartCard })), { ssr: false });
const MixedChartCard = dynamic(() => import('@/components/ui/chartjs-components').then(m => ({ default: m.MixedChartCard })), { ssr: false });

type WidgetType = 'income_trend' | 'net_flow' | 'category_doughnut' | 'category_treemap' | 'activity_heatmap' | 'health_score' | 'category_radar' | 'category_polar' | 'transaction_scatter' | 'category_bubble' | 'category_pie' | 'income_mixed';

interface WidgetDef {
  id: WidgetType;
  label: string;
  icon: any;
  defaultActive: boolean;
  group: 'Trends' | 'Distributions' | 'Advanced' | 'Metrics';
}

const AVAILABLE_WIDGETS: WidgetDef[] = [
  { id: 'income_trend', label: 'Income vs Expenses', icon: TrendUp, defaultActive: true, group: 'Trends' },
  { id: 'net_flow', label: 'Net Cash Flow', icon: ChartBar, defaultActive: true, group: 'Trends' },
  { id: 'income_mixed', label: 'Income vs Net (Mixed)', icon: TrendUp, defaultActive: false, group: 'Trends' },
  
  { id: 'category_doughnut', label: 'Category Doughnut', icon: ChartPieSlice, defaultActive: true, group: 'Distributions' },
  { id: 'category_pie', label: 'Category Pie', icon: ChartPieSlice, defaultActive: false, group: 'Distributions' },
  { id: 'category_treemap', label: 'Category Treemap', icon: Target, defaultActive: false, group: 'Distributions' },
  
  { id: 'category_radar', label: 'Category Radar', icon: Target, defaultActive: false, group: 'Advanced' },
  { id: 'category_polar', label: 'Category Polar Area', icon: Target, defaultActive: false, group: 'Advanced' },
  { id: 'category_bubble', label: 'Category Bubble', icon: Target, defaultActive: false, group: 'Advanced' },
  { id: 'transaction_scatter', label: 'Transaction Scatter', icon: Target, defaultActive: false, group: 'Advanced' },
  { id: 'activity_heatmap', label: 'Activity Matrix', icon: CalendarBlank, defaultActive: false, group: 'Advanced' },
  
  { id: 'health_score', label: 'Health Score', icon: Brain, defaultActive: true, group: 'Metrics' },
];

const PERIODS = [
  { label: '7 Days', value: '7d' },
  { label: '1 Month', value: '1m' },
  { label: '3 Months', value: '3m' },
  { label: '6 Months', value: '6m' },
  { label: '1 Year', value: '1y' },
];

const CHART_PALETTE = [
  '#10b981', '#C9A87C', '#3b82f6', '#a855f7',
  '#f59e0b', '#ef4444', '#06b6d4', '#ec4899',
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
  savingsRate: number;
  transactionCount: number;
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('1m');
  const [data, setData] = useState<AnalyticsData>({ monthly: [], daily: [], categories: [] });
  const [summary, setSummary] = useState<Summary>({ totalIncome: 0, totalExpenses: 0, savingsRate: 0, transactionCount: 0 });
  const [healthScores, setHealthScores] = useState<HealthScores | null>(null);
  const [loading, setLoading] = useState(true);
  const [insight, setInsight] = useState('');
  const [currency, setCurrency] = useState('PHP');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Widget visibility toggles
  const [activeWidgets, setActiveWidgets] = useState<WidgetType[]>([]);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [showAddWidgetMenu, setShowAddWidgetMenu] = useState(false);
  const [trendChartType, setTrendChartType] = useState<'area' | 'bar'>('area');

  useEffect(() => {
    const saved = localStorage.getItem('cashdash_widgets');
    if (saved) {
      try {
        setActiveWidgets(JSON.parse(saved));
      } catch {
        setActiveWidgets(AVAILABLE_WIDGETS.filter(w => w.defaultActive).map(w => w.id));
      }
    } else {
      setActiveWidgets(AVAILABLE_WIDGETS.filter(w => w.defaultActive).map(w => w.id));
    }
  }, []);

  const toggleWidget = (id: WidgetType) => {
    setActiveWidgets(prev => {
      const next = prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id];
      localStorage.setItem('cashdash_widgets', JSON.stringify(next));
      return next;
    });
  };

  // Filters
  const [categories, setCategories] = useState<{ id: string; name: string; icon: string }[]>([]);
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterAccount, setFilterAccount] = useState('');

  useEffect(() => {
    // Load filter options
    Promise.all([
      fetch('/api/categories').then(r => r.json()),
      fetch('/api/accounts').then(r => r.json()),
    ]).then(([catRes, accRes]) => {
      setCategories(catRes.data || []);
      setAccounts(accRes.data || []);
    }).catch(() => {});
  }, []);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ period });
      if (filterCategory) params.set('category_id', filterCategory);
      if (filterAccount) params.set('account_id', filterAccount);

      const res = await fetch(`/api/analytics?${params}`);
      const json = await res.json();
      setData(json.data || { monthly: [], daily: [], categories: [] });
      setSummary(json.summary || { totalIncome: 0, totalExpenses: 0, savingsRate: 0, transactionCount: 0 });
      setHealthScores(json.healthScores || null);
      setInsight(json.insight || '');
      setCurrency(json.currency || 'PHP');
      setDateRange(json.date_range || { start: '', end: '' });
    } catch {
      setData({ monthly: [], daily: [], categories: [] });
    } finally {
      setLoading(false);
    }
  }, [period, filterCategory, filterAccount]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  const fmtCompact = (v: number) => formatCurrency(v, currency, { compact: true });
  const fmtFull = (v: number) => formatCurrency(v, currency);

  const chartData = period === '7d' ? data.daily : data.monthly;
  const hasActiveFilters = filterCategory || filterAccount;

  return (
    <div className="mobile-page">
      <div className="mobile-page-header items-start sm:items-end">
        <div>
          <h1 className="text-2xl font-serif font-bold">Analytics</h1>
          <p className="text-sm text-muted-foreground font-mono mt-0.5">
            {dateRange.start && dateRange.end
              ? `${format(new Date(dateRange.start), 'MMM d')} – ${format(new Date(dateRange.end), 'MMM d, yyyy')}`
              : 'Your financial insights'}
            {summary.transactionCount > 0 && ` · ${summary.transactionCount} transactions`}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto">
          <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-input bg-background/50 p-1 pb-2 backdrop-blur-sm scrollbar-thin">
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
          <motion.button
            onClick={() => setShowFiltersPanel(!showFiltersPanel)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
              hasActiveFilters || showFiltersPanel
                ? 'border-primary/30 bg-primary/5 text-primary'
                : 'border-input text-muted-foreground hover:text-foreground'
            }`}
            whileTap={{ scale: 0.97 }}
          >
            <Funnel className="w-3.5 h-3.5" weight={hasActiveFilters ? 'fill' : 'light'} />
            Filters {hasActiveFilters ? '●' : ''}
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {showFiltersPanel && (
          <motion.div
            className="glass-card grid grid-cols-1 gap-3 p-4 sm:grid-cols-4"
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
          >
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Category</label>
              <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl text-xs focus:outline-none border border-input bg-background">
                <option value="">All Categories</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Account</label>
              <select value={filterAccount} onChange={e => setFilterAccount(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl text-xs focus:outline-none border border-input bg-background">
                <option value="">All Accounts</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="flex items-end col-span-2 sm:col-span-2 gap-2">
              <button onClick={() => { setFilterCategory(''); setFilterAccount(''); }}
                className="flex-1 px-3 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground border border-input transition-all">
                Clear filters
              </button>
              <button onClick={() => setShowFiltersPanel(false)}
                className="px-3 py-2 rounded-xl text-xs border border-input hover:bg-muted transition-all">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <motion.button onClick={() => setShowAddWidgetMenu(!showAddWidgetMenu)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-input text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
            whileTap={{ scale: 0.97 }}>
            <Target className="w-3.5 h-3.5" /> Customize Widgets
          </motion.button>
          
          <AnimatePresence>
            {showAddWidgetMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowAddWidgetMenu(false)} />
                <motion.div className="absolute top-full left-0 mt-2 w-56 bg-card border border-input rounded-xl shadow-xl z-50 overflow-hidden"
                  initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}>
                  <div className="px-3 py-2 border-b border-input bg-muted/30">
                    <span className="text-xs font-medium text-muted-foreground">Select Widgets</span>
                  </div>
                  <div className="p-1 max-h-[400px] overflow-y-auto">
                    {['Trends', 'Distributions', 'Advanced', 'Metrics'].map((group) => (
                      <div key={group} className="mb-2">
                        <div className="px-2.5 py-1 text-[10px] uppercase font-bold text-muted-foreground/70 tracking-wider">{group}</div>
                        {AVAILABLE_WIDGETS.filter(w => w.group === group).map(widget => {
                          const isActive = activeWidgets.includes(widget.id);
                          const Icon = widget.icon;
                          return (
                            <button key={widget.id} onClick={() => toggleWidget(widget.id)}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-sm transition-all ${
                                isActive ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-foreground'
                              }`}>
                              <span className="flex items-center gap-2"><Icon className="w-4 h-4" /> {widget.label}</span>
                              {isActive && <div className="w-2 h-2 rounded-full bg-primary" />}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
        
        {/* Active widget badges */}
        <div className="flex max-w-full gap-1.5 overflow-x-auto scrollbar-thin sm:flex-wrap">
          {activeWidgets.map(wId => {
            const widget = AVAILABLE_WIDGETS.find(w => w.id === wId);
            if (!widget) return null;
            return (
              <span key={wId} className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-[10px] text-muted-foreground">
                {widget.label} <button onClick={() => toggleWidget(wId)} className="hover:text-foreground"><X className="w-3 h-3" /></button>
              </span>
            );
          })}
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
      {!loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: 'Total Income', value: fmtFull(summary.totalIncome), icon: TrendUp,
              color: '#10b981', bg: 'rgba(16,185,129,0.08)',
              sub: `${summary.transactionCount} transactions`
            },
            {
              label: 'Total Expenses', value: fmtFull(summary.totalExpenses), icon: TrendDown,
              color: '#ef4444', bg: 'rgba(239,68,68,0.08)',
              sub: data.categories[0] ? `Top: ${data.categories[0].name}` : 'No expenses'
            },
            {
              label: 'Net Savings', value: fmtFull(summary.totalIncome - summary.totalExpenses), icon: Equals,
              color: summary.totalIncome >= summary.totalExpenses ? '#10b981' : '#ef4444',
              bg: summary.totalIncome >= summary.totalExpenses ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
              sub: 'Income minus expenses'
            },
            {
              label: 'Savings Rate', value: `${Math.max(0, summary.savingsRate)}%`, icon: Target,
              color: '#a855f7', bg: 'rgba(168,85,247,0.08)',
              sub: summary.savingsRate > 20 ? '🎉 Great job!' : summary.savingsRate > 0 ? 'Keep going!' : 'Expenses > Income'
            },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <motion.div key={stat.label} className="stat-card" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
                <div className="p-2.5 rounded-xl inline-flex mb-3" style={{ background: stat.bg }}>
                  <Icon className="w-4 h-4" style={{ color: stat.color }} />
                </div>
                <div className="text-xl font-serif font-bold editorial-number" style={{ color: stat.color === '#10b981' || stat.color === '#a855f7' ? undefined : stat.color }}>{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
                <div className="text-[11px] text-muted-foreground/60 mt-0.5 font-mono">{stat.sub}</div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Income vs Expenses */}
        {activeWidgets.includes('income_trend') && (
          <motion.div className="glass-card p-5 lg:col-span-2"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-serif font-semibold">Income vs Expenses</h3>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  {period === '7d' ? 'Daily breakdown' : 'Monthly comparison'}
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex bg-muted/50 rounded-md p-0.5">
                  <button onClick={() => setTrendChartType('area')} className={`px-2 py-1 rounded-sm ${trendChartType === 'area' ? 'bg-background shadow-sm text-foreground' : ''}`}>Area</button>
                  <button onClick={() => setTrendChartType('bar')} className={`px-2 py-1 rounded-sm ${trendChartType === 'bar' ? 'bg-background shadow-sm text-foreground' : ''}`}>Bar</button>
                </div>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />Income</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400" />Expenses</span>
              </div>
            </div>
            {chartData.length > 0 ? (
              trendChartType === 'area' ? (
                <AreaChartCard
                  labels={chartData.map(m => m.label)}
                  datasets={[
                    { label: 'Income', data: chartData.map(m => m.income), borderColor: '#10b981', bgFrom: 'rgba(16,185,129,0.18)', bgTo: 'rgba(16,185,129,0)' },
                    { label: 'Expenses', data: chartData.map(m => m.expenses), borderColor: '#f87171', bgFrom: 'rgba(248,113,113,0.15)', bgTo: 'rgba(248,113,113,0)' },
                  ]}
                  formatValue={fmtCompact}
                  height={260}
                  showTrendline={true}
                  budgetLimit={summary.totalIncome > 0 ? summary.totalIncome * 0.7 : 50000} // Example dynamic budget limit (70% of income)
                />
              ) : (
                <BarChartCard
                  labels={chartData.map(m => m.label)}
                  data={[...chartData.map(m => m.income), ...chartData.map(m => m.expenses)]} 
                  colors={[...chartData.map(() => '#10b981'), ...chartData.map(() => '#f87171')]}
                  formatValue={fmtCompact}
                  height={260}
                  budgetLimit={summary.totalIncome > 0 ? summary.totalIncome * 0.7 : 50000}
                />
              )
            ) : (
              <div className="flex flex-col items-center justify-center h-[260px] text-muted-foreground">
                <ChartBar className="w-10 h-10 opacity-20 mb-2" />
                <p className="text-sm">No data for this period</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Monthly Net Flow */}
        {activeWidgets.includes('net_flow') && (
          <motion.div className="glass-card p-5"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="mb-4">
              <h3 className="font-serif font-semibold">Net Cash Flow</h3>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">Income minus expenses per period</p>
            </div>
            {chartData.length > 0 ? (
              <BarChartCard
                labels={chartData.map(m => m.label)}
                data={chartData.map(m => m.income - m.expenses)}
                colors={chartData.map(m => m.income >= m.expenses ? '#10b981' : '#f87171')}
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
        )}

        {/* Category Breakdown */}
        {activeWidgets.includes('category_doughnut') && (
          <motion.div className="glass-card p-5"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <div className="mb-4">
              <h3 className="font-serif font-semibold">Spending by Category</h3>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">Where your money goes</p>
            </div>
            {data.categories.length > 0 ? (
              <div>
                <DoughnutChartCard
                  labels={data.categories.map(c => c.name)}
                  data={data.categories.map(c => c.total)}
                  colors={data.categories.map((c, i) => c.color || CHART_PALETTE[i % CHART_PALETTE.length])}
                  height={180}
                  formatValue={fmtFull}
                  centerValue={fmtCompact(summary.totalExpenses)}
                  centerLabel="Total spent"
                />
                <div className="space-y-2 mt-4">
                  {data.categories.slice(0, 6).map((cat, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <span className="text-sm shrink-0">{cat.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-medium truncate">{cat.name}</span>
                          <span className="text-xs text-muted-foreground font-mono ml-2 shrink-0">{cat.percentage}%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <motion.div className="h-full rounded-full" style={{ background: cat.color || CHART_PALETTE[i] }}
                            initial={{ width: 0 }} animate={{ width: `${cat.percentage}%` }}
                            transition={{ delay: 0.4 + i * 0.07, duration: 0.5 }} />
                        </div>
                        <div className="text-[10px] text-muted-foreground/60 mt-0.5 font-mono">{fmtFull(cat.total)} · {cat.count} txn{cat.count !== 1 ? 's' : ''}</div>
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
        )}

        {/* Category Treemap */}
        {activeWidgets.includes('category_treemap') && (
          <motion.div className="glass-card p-5 lg:col-span-2"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <div className="mb-4">
              <h3 className="font-serif font-semibold">Spending Distribution Treemap</h3>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">Hierarchical view of your expenses</p>
            </div>
            {data.categories.length > 0 ? (
              <TreemapChartCard
                data={data.categories}
                keyField="name"
                valueField="total"
                colorField="color"
                colors={CHART_PALETTE}
                height={280}
                formatValue={fmtFull}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-[280px] text-muted-foreground">
                <Target className="w-10 h-10 opacity-20 mb-2" weight="light" />
                <p className="text-sm">No expense data yet</p>
              </div>
            )}
          </motion.div>
        )}

        {/* PIE CHART */}
        {activeWidgets.includes('category_pie') && (
          <motion.div className="glass-card p-5"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <div className="mb-4">
              <h3 className="font-serif font-semibold">Spending Proportions</h3>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">Category Pie Chart</p>
            </div>
            {data.categories.length > 0 ? (
              <PieChartCard
                labels={data.categories.map(c => c.name)}
                data={data.categories.map(c => c.total)}
                colors={data.categories.map((c, i) => c.color || CHART_PALETTE[i % CHART_PALETTE.length])}
                height={220}
                formatValue={fmtFull}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-[220px] text-muted-foreground">
                <ChartPieSlice className="w-10 h-10 opacity-20 mb-2" weight="light" />
                <p className="text-sm">No expense data yet</p>
              </div>
            )}
          </motion.div>
        )}

        {/* RADAR CHART */}
        {activeWidgets.includes('category_radar') && (
          <motion.div className="glass-card p-5"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <div className="mb-4">
              <h3 className="font-serif font-semibold">Spending Radar</h3>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">Radial category balance</p>
            </div>
            {data.categories.length > 0 ? (
              <RadarChartCard
                labels={data.categories.map(c => c.name)}
                datasets={[{
                  label: 'Spending',
                  data: data.categories.map(c => c.total),
                  color: '#10b981'
                }]}
                height={280}
                formatValue={fmtFull}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-[280px] text-muted-foreground">
                <Target className="w-10 h-10 opacity-20 mb-2" weight="light" />
                <p className="text-sm">No data yet</p>
              </div>
            )}
          </motion.div>
        )}

        {/* POLAR AREA CHART */}
        {activeWidgets.includes('category_polar') && (
          <motion.div className="glass-card p-5 lg:col-span-2"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <div className="mb-4">
              <h3 className="font-serif font-semibold">Spending Imbalance</h3>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">Polar Area Distribution</p>
            </div>
            {data.categories.length > 0 ? (
              <PolarAreaChartCard
                labels={data.categories.map(c => c.name)}
                data={data.categories.map(c => c.total)}
                colors={data.categories.map((c, i) => c.color || CHART_PALETTE[i % CHART_PALETTE.length])}
                height={320}
                formatValue={fmtFull}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-[320px] text-muted-foreground">
                <Target className="w-10 h-10 opacity-20 mb-2" weight="light" />
                <p className="text-sm">No data yet</p>
              </div>
            )}
          </motion.div>
        )}

        {/* BUBBLE CHART */}
        {activeWidgets.includes('category_bubble') && (
          <motion.div className="glass-card p-5 lg:col-span-2"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <div className="mb-4">
              <h3 className="font-serif font-semibold">Category Density</h3>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">Frequency vs Total Amount vs Avg Size</p>
            </div>
            {data.categories.length > 0 ? (
              <BubbleChartCard
                datasets={data.categories.map((c, i) => ({
                  label: c.name,
                  data: [{
                    x: c.count,
                    y: c.total,
                    r: Math.max(5, Math.min((c.total / Math.max(1, c.count)) / 500, 30)) // Calculate average transaction size as radius
                  }],
                  color: c.color || CHART_PALETTE[i % CHART_PALETTE.length]
                }))}
                height={320}
                formatValue={fmtFull}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-[320px] text-muted-foreground">
                <Target className="w-10 h-10 opacity-20 mb-2" weight="light" />
                <p className="text-sm">No data yet</p>
              </div>
            )}
          </motion.div>
        )}

        {/* SCATTER CHART */}
        {activeWidgets.includes('transaction_scatter') && (
          <motion.div className="glass-card p-5 lg:col-span-2"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <div className="mb-4">
              <h3 className="font-serif font-semibold">Expense Scatter Plot</h3>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">Daily expense anomalies (High-density view)</p>
            </div>
            {data.daily.length > 0 ? (
              <ScatterChartCard
                datasets={[{
                  label: 'Daily Expenses',
                  data: data.daily.map((d, i) => ({ x: i + 1, y: d.expenses })),
                  color: '#f87171'
                }]}
                height={300}
                formatValue={fmtFull}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                <Target className="w-10 h-10 opacity-20 mb-2" weight="light" />
                <p className="text-sm">No data yet</p>
              </div>
            )}
          </motion.div>
        )}

        {/* MIXED CHART */}
        {activeWidgets.includes('income_mixed') && (
          <motion.div className="glass-card p-5 lg:col-span-2"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <div className="mb-4">
              <h3 className="font-serif font-semibold">Net vs Expenses Overlay</h3>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">Mixed Chart</p>
            </div>
            {chartData.length > 0 ? (
              <MixedChartCard
                labels={chartData.map(m => m.label)}
                barData={chartData.map(m => m.expenses)}
                lineData={chartData.map(m => m.income - m.expenses)}
                barColor="#f87171"
                lineColor="#10b981"
                height={300}
                formatValue={fmtCompact}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                <TrendUp className="w-10 h-10 opacity-20 mb-2" weight="light" />
                <p className="text-sm">No data yet</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Activity Matrix */}
        {activeWidgets.includes('activity_heatmap') && (
          <motion.div className="glass-card p-5 lg:col-span-2"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <div className="mb-4">
              <h3 className="font-serif font-semibold">Spending Matrix</h3>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">Activity heatmap over time</p>
            </div>
            {data.daily.length > 0 ? (
              <MatrixChartCard
                data={data.daily.map((d) => {
                  const date = new Date(d.date);
                  return {
                    x: format(date, 'EEE'), // Mon, Tue
                    y: `Week ${Math.ceil(date.getDate() / 7)}`, // Week 1, 2
                    v: d.expenses
                  };
                })}
                xLabels={['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']}
                yLabels={['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5']}
                height={280}
                formatValue={fmtFull}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-[280px] text-muted-foreground">
                <CalendarBlank className="w-10 h-10 opacity-20 mb-2" weight="light" />
                <p className="text-sm">No activity data yet</p>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Financial Health Score — Real Data */}
      {activeWidgets.includes('health_score') && healthScores && (
        <motion.div className="glass-card p-5"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-serif font-semibold">Financial Health Score</h3>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">Computed from your real data</p>
            </div>
            <Brain className="w-5 h-5 text-emerald-500" weight="duotone" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Savings Rate', ...healthScores.savingsRate, color: healthScores.savingsRate.score >= 60 ? '#10b981' : healthScores.savingsRate.score >= 30 ? '#f59e0b' : '#ef4444' },
              { label: 'Spending Control', ...healthScores.spendingControl, color: healthScores.spendingControl.score >= 60 ? '#10b981' : healthScores.spendingControl.score >= 40 ? '#f59e0b' : '#ef4444' },
              { label: 'Income Stability', ...healthScores.incomeStability, color: healthScores.incomeStability.score >= 60 ? '#3b82f6' : healthScores.incomeStability.score >= 30 ? '#f59e0b' : '#94a3b8' },
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
          <p className="text-[11px] text-muted-foreground/50 text-center mt-4 font-mono">
            Scores update as you log more transactions
          </p>
        </motion.div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="glass-card h-[200px] shimmer-bg rounded-2xl" />
          ))}
        </div>
      )}
    </div>
  );
}
