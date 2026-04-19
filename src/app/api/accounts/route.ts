import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('accounts')
    .select('*, subaccounts:accounts!parent_id(*)')
    .eq('user_id', user.id)
    .is('parent_id', null)
    .order('display_order');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data || [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
      currency: body.currency || 'USD',
      balance: initialBalance,
      initial_balance: initialBalance,
      description: body.description || null,
      parent_id: body.parent_id || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data }, { status: 201 });
}
