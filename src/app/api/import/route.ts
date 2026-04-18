import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { account_id, transactions } = body;

    if (!account_id || !transactions || !Array.isArray(transactions)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Format transactions for bulk insert
    const insertData = transactions.map((tx: any) => {
      // Expecting tx.amount to be string or number, we convert to cents
      const amountFloat = parseFloat(tx.amount || '0');
      const amountCents = Math.round(Math.abs(amountFloat) * 100);
      
      // Determine type based on amount if not explicitly provided
      let type = tx.type;
      if (!type) {
        type = amountFloat >= 0 ? 'income' : 'expense';
      }

      return {
        user_id: user.id,
        account_id,
        type,
        amount: amountCents,
        currency: tx.currency || 'USD',
        description: tx.description || 'Imported Transaction',
        transaction_date: tx.date ? new Date(tx.date).toISOString() : new Date().toISOString(),
        is_ai_created: false
      };
    });

    const { data, error } = await supabase
      .from('transactions')
      .insert(insertData)
      .select();

    if (error) throw error;

    // Adjust account balance
    const totalChange = insertData.reduce((sum, tx) => {
      return sum + (tx.type === 'income' ? tx.amount : -tx.amount);
    }, 0);

    if (totalChange !== 0) {
      try {
        await supabase.rpc('adjust_account_balance', { p_account_id: account_id, p_delta: totalChange });
      } catch { /* ignore */ }
    }

    return NextResponse.json({ success: true, count: data.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
