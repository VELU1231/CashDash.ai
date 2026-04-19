import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ensureUserData } from '@/lib/ensure-user-data';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await ensureUserData(supabase, user);

  const { data, error } = await supabase
    .from('transaction_templates')
    .select('*, category:categories(*), account:accounts!account_id(*), dest_account:accounts!dest_account_id(*)')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data || [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { name, type, amount, currency, description, category_id, account_id, dest_account_id, schedule_type } = body;

  const amountCents = amount ? Math.round(parseFloat(amount) * 100) : null;

  const { data, error } = await supabase
    .from('transaction_templates')
    .insert({
      user_id: user.id,
      name,
      type,
      amount: amountCents,
      currency: currency || 'USD',
      description: description || null,
      category_id: category_id || null,
      account_id,
      dest_account_id: dest_account_id || null,
      schedule_type: schedule_type || 'manual',
      is_active: true
    })
    .select('*, category:categories(*), account:accounts!account_id(*), dest_account:accounts!dest_account_id(*)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data }, { status: 201 });
}
