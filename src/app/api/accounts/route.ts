import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ensureUserData } from '@/lib/ensure-user-data';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Ensure profile exists first (accounts FK references profiles)
    await ensureUserData(supabase, user);

    const { data, error } = await supabase
      .from('accounts')
      .select('*, subaccounts:accounts!parent_id(*)')
      .eq('user_id', user.id)
      .is('parent_id', null)
      .order('display_order');

    if (error) {
      console.error('[GET /api/accounts]', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ data: data || [] });
  } catch (err) {
    console.error('[GET /api/accounts]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Ensure profile exists first (accounts FK references profiles)
    await ensureUserData(supabase, user);

    const body = await request.json();
    const initialBalance = body.initial_balance
      ? Math.round(parseFloat(body.initial_balance) * 100) : 0;

    const { data, error } = await supabase
      .from('accounts')
      .insert({
        user_id: user.id,
        name: body.name,
        type: body.type || 'cash',
        icon: body.icon || '💰',
        color: body.color || '#10b981',
        currency: body.currency || 'PHP',
        balance: initialBalance,
        initial_balance: initialBalance,
        description: body.description || null,
        parent_id: body.parent_id || null,
      })
      .select()
      .single();

    if (error) {
      console.error('[POST /api/accounts]', error.message);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/accounts]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
