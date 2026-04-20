import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.name !== undefined) update.name = body.name;
  if (body.target_amount !== undefined) update.target_amount = Math.round(parseFloat(body.target_amount) * 100);
  if (body.current_amount !== undefined) update.current_amount = Math.round(parseFloat(body.current_amount) * 100);
  if (body.currency !== undefined) update.currency = body.currency;
  if (body.icon !== undefined) update.icon = body.icon;
  if (body.color !== undefined) update.color = body.color;
  if (body.target_date !== undefined) update.target_date = body.target_date || null;
  if (body.notes !== undefined) update.notes = body.notes || null;
  if (body.is_completed !== undefined) update.is_completed = body.is_completed;
  if (body.account_id !== undefined) update.account_id = body.account_id || null;

  const { data, error } = await supabase
    .from('piggy_banks')
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

  const { error } = await supabase.from('piggy_banks').delete().eq('id', id).eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
