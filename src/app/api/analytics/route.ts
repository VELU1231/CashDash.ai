import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || '1m';

  // Determine date range based on period
  const now = new Date();
  let monthsBack = 1;
  if (period === '7d') monthsBack = 1;
  else if (period === '3m') monthsBack = 3;
  else if (period === '6m') monthsBack = 6;
  else if (period === '1y') monthsBack = 12;

  const startDate = format(startOfMonth(subMonths(now, monthsBack - 1)), 'yyyy-MM-dd');
  const endDate = format(endOfMonth(now), 'yyyy-MM-dd');

  // Fetch transactions in range
  const { data: transactions } = await supabase
    .from('transactions')
    .select('type, amount, currency, transaction_date, category:categories(id,name,icon,color)')
    .eq('user_id', user.id)
    .gte('transaction_date', startDate)
    .lte('transaction_date', endDate);

  const txs = transactions || [];

  // Monthly aggregation
  const monthlyMap: Record<string, { month: string; label: string; income: number; expenses: number }> = {};
  txs.forEach(tx => {
    const key = tx.transaction_date.slice(0, 7);
    if (!monthlyMap[key]) {
      monthlyMap[key] = {
        month: key,
        label: format(new Date(`${key}-01`), 'MMM'),
        income: 0, expenses: 0,
      };
    }
    if (tx.type === 'income') monthlyMap[key].income += tx.amount;
    if (tx.type === 'expense') monthlyMap[key].expenses += tx.amount;
  });
  const monthly = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month));

  // Category breakdown
  const catMap: Record<string, { name: string; icon: string; color: string; total: number; count: number }> = {};
  txs.filter(t => t.type === 'expense').forEach(tx => {
    const cat = tx.category as { id?: string; name?: string; icon?: string; color?: string } | null;
    const key = (cat as { id?: string })?.id || 'other';
    if (!catMap[key]) {
      catMap[key] = { name: (cat as { name?: string })?.name || 'Other', icon: (cat as { icon?: string })?.icon || '📦', color: (cat as { color?: string })?.color || '#94a3b8', total: 0, count: 0 };
    }
    catMap[key].total += tx.amount;
    catMap[key].count++;
  });

  const totalExpenses = Object.values(catMap).reduce((s, c) => s + c.total, 0);
  const categories = Object.values(catMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)
    .map(c => ({ ...c, percentage: totalExpenses > 0 ? Math.round(c.total / totalExpenses * 100) : 0 }));

  // Simple AI insight generation (rule-based if no LLM)
  const totalIncome = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const savingsRate = totalIncome > 0 ? Math.round((totalIncome - totalExpenses) / totalIncome * 100) : 0;
  const topCategory = categories[0];

  let insight = '';
  if (topCategory) {
    if (savingsRate > 30) {
      insight = `🎉 Excellent! You're saving ${savingsRate}% of your income. Your biggest expense is ${topCategory.name} — keep it up!`;
    } else if (savingsRate > 15) {
      insight = `👍 You saved ${savingsRate}% this period. Consider trimming ${topCategory.name} spending to boost savings further.`;
    } else if (savingsRate > 0) {
      insight = `💡 You saved ${savingsRate}% this period. Your top spending category is ${topCategory.name} — reviewing it could help significantly.`;
    } else {
      insight = `⚠️ Expenses exceeded income this period. Focus on reducing ${topCategory.name} and ${categories[1]?.name || 'other'} spending.`;
    }
  }

  return NextResponse.json({
    data: { monthly, categories },
    insight,
    period,
    date_range: { start: startDate, end: endDate },
  });
}
