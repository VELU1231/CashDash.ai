import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DashboardClient } from './dashboard-client';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { aiAssistantFlag, dailyChartFlag, aiInsightsFlag } from '@/flags';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Dashboard | CashDash.ai' };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Evaluate feature flags server-side
  const [showAI, showDailyChart, showInsights] = await Promise.all([
    aiAssistantFlag(),
    dailyChartFlag(),
    aiInsightsFlag(),
  ]);

  const now = new Date();
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');
  const prevMonthStart = format(startOfMonth(subMonths(now, 1)), 'yyyy-MM-dd');
  const prevMonthEnd = format(endOfMonth(subMonths(now, 1)), 'yyyy-MM-dd');

  // Fetch this month's transactions
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*, category:categories(id,name,icon,color,type), account:accounts(id,name,icon,color,currency)')
    .eq('user_id', user.id)
    .gte('transaction_date', monthStart)
    .lte('transaction_date', monthEnd)
    .order('transaction_date', { ascending: false });

  // Last month transactions for comparison
  const { data: prevTransactions } = await supabase
    .from('transactions')
    .select('type, amount')
    .eq('user_id', user.id)
    .gte('transaction_date', prevMonthStart)
    .lte('transaction_date', prevMonthEnd);

  // Accounts with balances
  const { data: accounts } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_hidden', false)
    .order('display_order');

  // 6-month trend data
  const sixMonthsAgo = format(startOfMonth(subMonths(now, 5)), 'yyyy-MM-dd');
  const { data: trendData } = await supabase
    .from('transactions')
    .select('type, amount, transaction_date, currency')
    .eq('user_id', user.id)
    .gte('transaction_date', sixMonthsAgo)
    .order('transaction_date');

  // Profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return (
    <DashboardClient
      transactions={transactions || []}
      prevTransactions={prevTransactions || []}
      accounts={accounts || []}
      trendData={trendData || []}
      profile={profile}
      currentMonth={format(now, 'MMMM yyyy')}
      flags={{ showAI, showDailyChart, showInsights }}
    />
  );
}
