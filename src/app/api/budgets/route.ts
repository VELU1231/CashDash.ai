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
    .from('budgets')
    .select('*, category:categories(id,name,icon,color)')
    .eq('user_id', user.id)
    .eq('is_active', true)
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

  if (!body.amount || body.amount <= 0) {
    return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('budgets')
    .insert({
      user_id: user.id,
      name: body.name || 'Budget',
      category_id: body.category_id || null,
      amount: body.amount,
      currency: body.currency || 'PHP',
      period: body.period || 'monthly',
      icon: body.icon || '📊',
      color: body.color || '#3b82f6',
      is_active: true,
      notes: body.notes || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data }, { status: 201 });
}

