import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const amountMin = body.amount_min !== undefined ? Math.round(parseFloat(body.amount_min) * 100) : undefined;
  const amountMax = body.amount_max !== undefined ? Math.round(parseFloat(body.amount_max) * 100) : undefined;

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.name !== undefined) update.name = body.name;
  if (amountMin !== undefined) update.amount_min = amountMin;
  if (amountMax !== undefined) update.amount_max = amountMax;
  if (body.currency !== undefined) update.currency = body.currency;
  if (body.category_id !== undefined) update.category_id = body.category_id || null;
  if (body.account_id !== undefined) update.account_id = body.account_id || null;
  if (body.frequency !== undefined) update.frequency = body.frequency;
  if (body.icon !== undefined) update.icon = body.icon;
  if (body.color !== undefined) update.color = body.color;
  if (body.due_day !== undefined) update.due_day = body.due_day ? parseInt(body.due_day) : null;
  if (body.next_due_date !== undefined) update.next_due_date = body.next_due_date || null;
  if (body.last_paid_date !== undefined) update.last_paid_date = body.last_paid_date || null;
  if (body.is_auto_pay !== undefined) update.is_auto_pay = body.is_auto_pay;
  if (body.is_active !== undefined) update.is_active = body.is_active;
  if (body.notes !== undefined) update.notes = body.notes || null;

  const { data, error } = await supabase
    .from('bills')
    .update(update)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await supabase.from('bills').delete().eq('id', id).eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
