'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { formatCurrency } from '@/lib/utils';
import { format, subMonths, addMonths } from 'date-fns';

const PieChartCard = dynamic(() => import('@/components/ui/chartjs-components').then(m => ({ default: m.PieChartCard })), { ssr: false });

const CHART_COLORS = [
  '#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c',
  '#4dabf7', '#9775fa', '#f783ac', '#63e6be',
  '#748ffc', '#e599f7', '#a9e34b', '#38d9a9',
];

interface AnalyticsData {
  categories: { name: string; icon: string; color: string; total: number; percentage: number; count: number }[];
}

interface Summary {
  totalIncome: number;
  totalExpenses: number;
}

export default function AnalyticsPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'income' | 'expenses'>('expenses');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [summary, setSummary] = useState<Summary>({ totalIncome: 0, totalExpenses: 0 });
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('1m');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?period=${period}`);
      const json = await res.json();
      if (json.data) {
        setData(json.data);
        setSummary(json.summary || { totalIncome: 0, totalExpenses: 0 });
      }
    } catch {}
    setLoading(false);
  }, [period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const prevMonth = () => setCurrentDate(d => subMonths(d, 1));
  const nextMonth = () => setCurrentDate(d => addMonths(d, 1));

  const categories = data?.categories || [];
  const totalAmount = activeTab === 'expenses' ? summary.totalExpenses : summary.totalIncome;

  // Assign colors to categories
  const coloredCategories = categories.map((cat, i) => ({
    ...cat,
    assignedColor: CHART_COLORS[i % CHART_COLORS.length],
  }));

  return (
    <div className="space-y-0">
      {/* Header — month nav */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="p-1"><CaretLeft className="w-5 h-5" /></button>
          <span className="text-lg font-semibold">{format(currentDate, 'MMM yyyy')}</span>
          <button onClick={nextMonth} className="p-1"><CaretRight className="w-5 h-5" /></button>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="text-sm bg-transparent border border-border/50 rounded-lg px-2 py-1 text-muted-foreground"
        >
          <option value="1m">Monthly</option>
          <option value="3m">Quarterly</option>
          <option value="6m">Half Year</option>
          <option value="1y">Yearly</option>
        </select>
      </div>

      {/* Income / Expenses toggle */}
      <div className="flex border-b border-border/30">
        <button
          onClick={() => setActiveTab('income')}
          className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
            activeTab === 'income'
              ? 'text-foreground border-b-2 border-foreground'
              : 'text-muted-foreground'
          }`}
        >
          Income {formatCurrency(summary.totalIncome, 'USD')}
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
            activeTab === 'expenses'
              ? 'text-foreground border-b-2 border-red-400'
              : 'text-muted-foreground'
          }`}
        >
          Expenses {formatCurrency(summary.totalExpenses, 'USD')}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Large Pie Chart */}
          <div className="px-4 py-6">
            {coloredCategories.length > 0 ? (
              <PieChartCard
                labels={coloredCategories.map(c => `${c.icon} ${c.name}`)}
                data={coloredCategories.map(c => c.total)}
                colors={coloredCategories.map(c => c.assignedColor)}
                height={300}
              />
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <p className="text-sm">No data for this period</p>
              </div>
            )}
          </div>

          {/* Category list with % badges */}
          <div className="divide-y divide-border/20">
            {coloredCategories.map((cat) => {
              const pct = totalAmount > 0 ? Math.round((cat.total / totalAmount) * 100) : 0;
              return (
                <div key={cat.name} className="flat-list-item px-4">
                  <span
                    className="pct-badge"
                    style={{ background: cat.assignedColor }}
                  >
                    {pct}%
                  </span>
                  <span className="text-lg mr-1">{cat.icon}</span>
                  <span className="flex-1 text-sm font-medium">{cat.name}</span>
                  <span className="text-sm font-semibold tabular-nums">
                    {formatCurrency(cat.total, 'USD')}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
