import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ensureUserData, ensureDefaultAccount } from '@/lib/ensure-user-data';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await ensureUserData(supabase, user);

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
        account:accounts(id, name, icon, color, currency)
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
    console.error('[GET /api/transactions] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await ensureUserData(supabase, user);

    const body = await request.json();
    const { 
      type, amount, currency, description, note, 
      category_id, account_id, dest_account_id, transaction_date, tag_ids,
      attachment_path, attachment_name, attachment_size, attachment_type 
    } = body;

    // If no account_id provided, use the default account
    let resolvedAccountId = account_id;
    if (!resolvedAccountId) {
      const defaultAccount = await ensureDefaultAccount(supabase, user.id);
      resolvedAccountId = defaultAccount?.id;
    }

    if (!type || !amount || !resolvedAccountId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const amountCents = Math.round(parseFloat(amount) * 100);

    const { data: tx, error } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        type,
        amount: amountCents,
        currency: currency || 'PHP',
        description: description || null,
        note: note || null,
        category_id: category_id || null,
        account_id: resolvedAccountId,
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
      try {
        await supabase.rpc('adjust_account_balance', {
          p_account_id: resolvedAccountId,
          p_delta: balanceChange,
        });
      } catch { /* non-blocking */ }
    }

    // Add tags if provided
    if (tag_ids?.length > 0) {
      await supabase.from('transaction_tags').insert(
        tag_ids.map((tid: string) => ({ transaction_id: tx.id, tag_id: tid }))
      );
    }

    // Add attachment if provided
    if (attachment_path) {
      await supabase.from('transaction_attachments').insert({
        transaction_id: tx.id,
        user_id: user.id,
        file_path: attachment_path,
        file_name: attachment_name || 'attachment',
        file_size: attachment_size || null,
        mime_type: attachment_type || null,
      });
    }

    return NextResponse.json({ data: tx }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/transactions] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create transaction';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
