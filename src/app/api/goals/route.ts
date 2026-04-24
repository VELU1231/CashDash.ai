export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ensureUserData } from '@/lib/ensure-user-data';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await ensureUserData(supabase, user);

  const { data, error } = await supabase
    .from('piggy_banks')
    .select('*, account:accounts(id,name,currency)')
    .eq('user_id', user.id)
    .order('display_order')
    .order('created_at');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data || [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await ensureUserData(supabase, user);

  const body = await request.json();
  const targetAmount = Math.round(parseFloat(body.target_amount || '0') * 100);
  const currentAmount = Math.round(parseFloat(body.current_amount || '0') * 100);

  if (!body.name || targetAmount <= 0) {
    return NextResponse.json({ error: 'Name and target amount are required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('piggy_banks')
    .insert({
      user_id: user.id,
      account_id: body.account_id || null,
      name: body.name,
      target_amount: targetAmount,
      current_amount: currentAmount,
      currency: body.currency || 'PHP',
      icon: body.icon || '🐷',
      color: body.color || '#ec4899',
      target_date: body.target_date || null,
      notes: body.notes || null,
      display_order: body.display_order || 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data }, { status: 201 });
}

