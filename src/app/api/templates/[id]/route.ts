import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { name, type, amount, currency, description, category_id, account_id, dest_account_id, schedule_type, is_active } = body;
  
  const amountCents = amount ? Math.round(parseFloat(amount) * 100) : null;

  const { data, error } = await supabase
    .from('transaction_templates')
    .update({
      name,
      type,
      amount: amountCents,
      currency,
      description,
      category_id,
      account_id,
      dest_account_id,
      schedule_type,
      is_active,
      updated_at: new Date().toISOString()
    })
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select('*, category:categories(*), account:accounts(*), dest_account:accounts!dest_account_id(*)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await supabase
    .from('transaction_templates')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}

// Execute Template
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 1. Fetch template
  const { data: template, error: fetchError } = await supabase
    .from('transaction_templates')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

  // 2. Create transaction from template
  const { data: tx, error: insertError } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      type: template.type,
      amount: template.amount || 0,
      currency: template.currency,
      description: template.description || template.name,
      category_id: template.category_id,
      account_id: template.account_id,
      dest_account_id: template.dest_account_id,
      transaction_date: new Date().toISOString(),
      is_ai_created: false
    })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  // Update account balance
  const balanceChange = tx.type === 'income' ? tx.amount : tx.type === 'expense' ? -tx.amount : 0;
  if (balanceChange !== 0) {
    try {
      await supabase.rpc('adjust_account_balance', { p_account_id: tx.account_id, p_delta: balanceChange });
    } catch { /* non-blocking */ }
  }

  // Update template last_executed_at
  await supabase
    .from('transaction_templates')
    .update({ last_executed_at: new Date().toISOString() })
    .eq('id', template.id);

  return NextResponse.json({ success: true, transaction: tx });
}
