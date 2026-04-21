import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { format, subMonths, subDays, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || '1m';
  const filterCategory = searchParams.get('category_id') || null;
  const filterAccount = searchParams.get('account_id') || null;

  // Get user profile for currency
  const { data: profile } = await supabase
    .from('profiles')
    .select('default_currency')
    .eq('id', user.id)
    .maybeSingle();
  const currency = profile?.default_currency || 'PHP';

  // ─── Determine date range ───────────────────────────────────────────
  const now = new Date();
  let startDate: string;
  let endDate: string;

  if (period === '7d') {
    startDate = format(startOfDay(subDays(now, 6)), 'yyyy-MM-dd');
    endDate = format(endOfDay(now), 'yyyy-MM-dd');
  } else {
    let monthsBack = 1;
    if (period === '3m') monthsBack = 3;
    else if (period === '6m') monthsBack = 6;
    else if (period === '1y') monthsBack = 12;
    startDate = format(startOfMonth(subMonths(now, monthsBack - 1)), 'yyyy-MM-dd');
    endDate = format(endOfMonth(now), 'yyyy-MM-dd');
  }

  // Ensure full-day coverage for TIMESTAMPTZ column (avoid missing end-of-day transactions)
  const endDateFull = `${endDate}T23:59:59`;

  // ─── Build query ────────────────────────────────────────────────────
  let query = supabase
    .from('transactions')
    .select('type, amount, currency, transaction_date, category:categories(id,name,icon,color), account:accounts!account_id(id,name)')
    .eq('user_id', user.id)
    .gte('transaction_date', startDate)
    .lte('transaction_date', endDateFull);

  if (filterCategory) query = query.eq('category_id', filterCategory);
  if (filterAccount) query = query.eq('account_id', filterAccount);

  const { data: transactions } = await query;
  const txs = transactions || [];

  // ─── Monthly aggregation ────────────────────────────────────────────
  const monthlyMap: Record<string, { month: string; label: string; income: number; expenses: number; net: number }> = {};
  txs.forEach(tx => {
    const key = tx.transaction_date.slice(0, 7);
    if (!monthlyMap[key]) {
      monthlyMap[key] = {
        month: key,
        label: format(new Date(`${key}-01`), period === '1y' ? 'MMM yy' : 'MMM'),
        income: 0, expenses: 0, net: 0,
      };
    }
    if (tx.type === 'income') { monthlyMap[key].income += tx.amount; monthlyMap[key].net += tx.amount; }
    if (tx.type === 'expense') { monthlyMap[key].expenses += tx.amount; monthlyMap[key].net -= tx.amount; }
  });
  const monthly = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month));

  // ─── Daily aggregation (for 7d view) ───────────────────────────────
  const dailyMap: Record<string, { date: string; label: string; income: number; expenses: number }> = {};
  txs.forEach(tx => {
    const key = tx.transaction_date.slice(0, 10);
    if (!dailyMap[key]) {
      dailyMap[key] = { date: key, label: format(new Date(key), 'MMM d'), income: 0, expenses: 0 };
    }
    if (tx.type === 'income') dailyMap[key].income += tx.amount;
    if (tx.type === 'expense') dailyMap[key].expenses += tx.amount;
  });
  const daily = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

  // ─── Category breakdown ─────────────────────────────────────────────
  const catMap: Record<string, { name: string; icon: string; color: string; total: number; count: number }> = {};
  txs.filter(t => t.type === 'expense').forEach(tx => {
    const cat = tx.category as { id?: string; name?: string; icon?: string; color?: string } | null;
    const key = (cat as any)?.id || 'other';
    if (!catMap[key]) {
      catMap[key] = { name: (cat as any)?.name || 'Other', icon: (cat as any)?.icon || '📦', color: (cat as any)?.color || '#94a3b8', total: 0, count: 0 };
    }
    catMap[key].total += tx.amount;
    catMap[key].count++;
  });

  const totalExpenses = Object.values(catMap).reduce((s, c) => s + c.total, 0);
  const totalIncome = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const categories = Object.values(catMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)
    .map(c => ({ ...c, percentage: totalExpenses > 0 ? Math.round(c.total / totalExpenses * 100) : 0 }));

  // ─── Real Financial Health Scores ───────────────────────────────────
  const savingsRate = totalIncome > 0 ? Math.round((totalIncome - totalExpenses) / totalIncome * 100) : 0;

  // Savings Rate Score: 0-100 based on savings rate (30%+ = perfect 100)
  const savingsScore = Math.min(100, Math.round((savingsRate / 30) * 100));

  // Spending Control Score: based on expense consistency month-over-month
  const monthlyExpenses = monthly.map(m => m.expenses);
  let spendingScore = 70; // base
  if (monthlyExpenses.length >= 2) {
    const lastTwo = monthlyExpenses.slice(-2);
    const change = lastTwo[0] > 0 ? ((lastTwo[1] - lastTwo[0]) / lastTwo[0]) * 100 : 0;
    if (change < -10) spendingScore = 90;      // spending decreased — great
    else if (change < 5) spendingScore = 75;   // stable
    else if (change < 20) spendingScore = 55;  // slightly increased
    else spendingScore = 35;                   // large spike
  }

  // Income Stability Score: how many months had income
  const monthsWithIncome = monthly.filter(m => m.income > 0).length;
  const incomeScore = monthly.length > 0 ? Math.round((monthsWithIncome / Math.max(monthly.length, 1)) * 100) : 0;

  const healthScores = {
    savingsRate: { score: Math.max(0, savingsScore), desc: savingsScore >= 80 ? 'Excellent' : savingsScore >= 50 ? 'Good' : savingsScore >= 30 ? 'Fair' : 'Needs Work' },
    spendingControl: { score: Math.max(0, spendingScore), desc: spendingScore >= 80 ? 'Excellent' : spendingScore >= 60 ? 'Good' : spendingScore >= 40 ? 'Fair' : 'Needs Work' },
    incomeStability: { score: Math.max(0, incomeScore), desc: incomeScore >= 80 ? 'Excellent' : incomeScore >= 50 ? 'Good' : incomeScore >= 30 ? 'Fair' : 'No Data' },
  };

  // ─── AI Insight ─────────────────────────────────────────────────────
  const topCategory = categories[0];
  let insight = '';
  if (topCategory) {
    if (savingsRate > 30) {
      insight = `🎉 Excellent! You're saving ${savingsRate}% of your income. Your biggest expense is ${topCategory.name} — keep it up!`;
    } else if (savingsRate > 15) {
      insight = `👍 You saved ${savingsRate}% this period. Consider trimming ${topCategory.name} spending to boost savings further.`;
    } else if (savingsRate > 0) {
      insight = `💡 You saved ${savingsRate}% this period. Your top spending category is ${topCategory.name} — reviewing it could help significantly.`;
    } else if (totalIncome === 0) {
      insight = `📊 No income recorded this period. Add your salary or income sources to see your savings rate.`;
    } else {
      insight = `⚠️ Expenses exceeded income this period. Focus on reducing ${topCategory.name}${categories[1] ? ` and ${categories[1].name}` : ''} spending.`;
    }
  } else if (txs.length === 0) {
    insight = `👋 No transactions in this period. Start tracking your spending to see insights!`;
  }

  return NextResponse.json({
    data: { monthly, daily, categories },
    insight,
    period,
    currency,
    date_range: { start: startDate, end: endDate },
    summary: {
      totalIncome,
      totalExpenses,
      savingsRate,
      transactionCount: txs.length,
    },
    healthScores,
  });
}
