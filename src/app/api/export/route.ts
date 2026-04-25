import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('transactions')
    .select(`
      *,
      category:categories(name,icon),
      account:accounts!account_id(name,currency)
    `)
    .eq('user_id', user.id)
    .order('transaction_date', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Build CSV
  const headers = ['Date', 'Type', 'Amount', 'Currency', 'Description', 'Category', 'Account', 'Note'];
  const rows = (data || []).map(tx => [
    tx.transaction_date?.slice(0, 10),
    tx.type,
    (tx.amount / 100).toFixed(2),
    tx.currency,
    `"${(tx.description || '').replace(/"/g, '""')}"`,
    tx.category?.name || '',
    tx.account?.name || '',
    `"${(tx.note || '').replace(/"/g, '""')}"`,
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="cashbash-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

