import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ensureUserData, ensureDefaultAccount } from '@/lib/ensure-user-data';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Ensure profile + account exist before any inserts
    await ensureUserData(supabase, user);

    const { transactions } = await request.json();

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json({ error: 'No transactions provided' }, { status: 400 });
    }

    if (transactions.length > 20) {
      return NextResponse.json({ error: 'Max 20 transactions per batch' }, { status: 400 });
    }

    const defaultAccount = await ensureDefaultAccount(supabase, user.id);
    if (!defaultAccount) {
      return NextResponse.json({ error: 'Failed to find or create default account' }, { status: 400 });
    }

    const created = [];

    for (const tx of transactions) {
      if (!tx.amount) continue;
      // Fall back to category name or generic label if description is empty
      if (!tx.description) tx.description = tx.category_name || 'Transaction';

      const amountCents = Math.round(Math.abs(parseFloat(tx.amount)) * 100);
      if (isNaN(amountCents) || amountCents <= 0) continue;

      // Find or create category
      let categoryId: string | null = null;
      if (tx.category_name) {
        const { data: existingCat } = await supabase
          .from('categories')
          .select('id')
          .eq('user_id', user.id)
          .ilike('name', tx.category_name)
          .eq('type', tx.type || 'expense')
          .maybeSingle();

        if (existingCat) {
          categoryId = existingCat.id;
        } else {
          const { data: newCat } = await supabase
            .from('categories')
            .insert({
              user_id: user.id,
              name: tx.category_name,
              type: tx.type || 'expense',
              icon: tx.category_icon || '📦',
              color: tx.category_color || '#94a3b8',
              display_order: 99,
            })
            .select('id')
            .single();
          categoryId = newCat?.id || null;
        }
      }

      const { data: newTx, error } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          type: tx.type || 'expense',
          category_id: categoryId,
          account_id: tx.account_id || defaultAccount.id,
          amount: amountCents,
          currency: tx.currency || defaultAccount.currency || 'PHP',
          description: tx.description,
          transaction_date: tx.transaction_date || new Date().toISOString(),
          is_ai_created: true,
          ai_confidence: tx.confidence || null,
        })
        .select('*, category:categories(id,name,icon,color), account:accounts!account_id(id,name,icon,color,currency)')
        .single();

      if (error) {
        console.error('Bulk insert error:', error.message);
        continue;
      }
      if (newTx) created.push(newTx);

      // Update account balance
      const balanceChange = (tx.type || 'expense') === 'income' ? amountCents : -amountCents;
      try {
        await supabase.rpc('adjust_account_balance', {
          p_account_id: tx.account_id || defaultAccount.id,
          p_delta: balanceChange,
        });
      } catch (rpcErr) {
        console.error('[bulk adjust_account_balance] RPC failed, using direct fallback:', rpcErr);
        const targetAccountId = tx.account_id || defaultAccount.id;
        const { data: acct } = await supabase
          .from('accounts').select('balance').eq('id', targetAccountId).single();
        if (acct) {
          await supabase.from('accounts')
            .update({ balance: (acct.balance || 0) + balanceChange })
            .eq('id', targetAccountId);
        }
      }
    }

    return NextResponse.json({
      created,
      count: created.length,
      message: `Saved ${created.length} transaction${created.length !== 1 ? 's' : ''}`,
    }, { status: 201 });
  } catch (error) {
    console.error('Bulk create error:', error);
    return NextResponse.json({ error: 'Failed to create transactions' }, { status: 500 });
  }
}

