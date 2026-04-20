import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ensureUserData } from '@/lib/ensure-user-data';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await ensureUserData(supabase, user);

  const { data, error } = await supabase
    .from('bills')
    .select('*, category:categories(id,name,icon,color), account:accounts(id,name)')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('next_due_date', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data || [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await ensureUserData(supabase, user);

  const body = await request.json();
  const amountMin = Math.round(parseFloat(body.amount_min || body.amount || '0') * 100);
  const amountMax = Math.round(parseFloat(body.amount_max || body.amount || '0') * 100);

  const { data, error } = await supabase
    .from('bills')
    .insert({
      user_id: user.id,
      name: body.name,
      amount_min: amountMin,
      amount_max: amountMax,
      currency: body.currency || 'PHP',
      category_id: body.category_id || null,
      account_id: body.account_id || null,
      frequency: body.frequency || 'monthly',
      icon: body.icon || '📄',
      color: body.color || '#f59e0b',
      due_day: body.due_day ? parseInt(body.due_day) : null,
      next_due_date: body.next_due_date || null,
      is_auto_pay: body.is_auto_pay || false,
      is_active: true,
      notes: body.notes || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data }, { status: 201 });
}
