import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const type = searchParams.get('type');
    const account_id = searchParams.get('account_id');
    const category_id = searchParams.get('category_id');
    const date_from = searchParams.get('date_from');
    const date_to = searchParams.get('date_to');
    const search = searchParams.get('search');
    const offset = (page - 1) * limit;

    let query = supabase
      .from('transactions')
      .select(`
        *,
        category:categories(id, name, icon, color, type),
        account:accounts(id, name, icon, color, currency),
        dest_account:accounts!dest_account_id(id, name, icon, color, currency)
      `, { count: 'exact' })
      .eq('user_id', user.id)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (type && type !== 'all') query = query.eq('type', type);
    if (account_id) query = query.eq('account_id', account_id);
    if (category_id) query = query.eq('category_id', category_id);
    if (date_from) query = query.gte('transaction_date', date_from);
    if (date_to) query = query.lte('transaction_date', date_to);
    if (search) query = query.ilike('description', `%${search}%`);

    const { data, error, count } = await query;
    if (error) throw error;

    return NextResponse.json({
      data: data || [],
      total: count || 0,
      page,
      per_page: limit,
      has_more: (count || 0) > offset + limit,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { type, amount, currency, description, note, category_id, account_id, dest_account_id, transaction_date, tag_ids } = body;

    if (!type || !amount || !account_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const amountCents = Math.round(parseFloat(amount) * 100);

    const { data: tx, error } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        type,
        amount: amountCents,
        currency: currency || 'USD',
        description: description || null,
        note: note || null,
        category_id: category_id || null,
        account_id,
        dest_account_id: dest_account_id || null,
        transaction_date: transaction_date || new Date().toISOString(),
        is_ai_created: false,
      })
      .select('*, category:categories(*), account:accounts(*)')
      .single();

    if (error) throw error;

    // Update account balance
    const balanceChange = type === 'income' ? amountCents : type === 'expense' ? -amountCents : 0;
    if (balanceChange !== 0) {
      await supabase.rpc('adjust_account_balance', {
        p_account_id: account_id,
        p_delta: balanceChange,
      }).catch(() => {});
    }

    // Add tags if provided
    if (tag_ids?.length > 0) {
      await supabase.from('transaction_tags').insert(
        tag_ids.map((tid: string) => ({ transaction_id: tx.id, tag_id: tid }))
      );
    }

    return NextResponse.json({ data: tx }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 });
  }
}
