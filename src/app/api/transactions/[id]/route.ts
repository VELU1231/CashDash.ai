import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('transactions')
    .select('*, category:categories(*), account:accounts!account_id(*), dest_account:accounts!dest_account_id(*)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ data });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const amountCents = body.amount ? Math.round(parseFloat(body.amount) * 100) : undefined;

  // Whitelist only valid transaction columns to prevent Supabase column-not-found errors
  const allowedFields: Record<string, unknown> = {};
  const ALLOWED_KEYS = [
    'type', 'currency', 'description', 'note',
    'category_id', 'account_id', 'dest_account_id', 'transaction_date',
  ];
  for (const key of ALLOWED_KEYS) {
    if (body[key] !== undefined) allowedFields[key] = body[key];
  }
  if (amountCents !== undefined) allowedFields.amount = amountCents;
  allowedFields.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('transactions')
    .update(allowedFields)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*, category:categories(*), account:accounts!account_id(*)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
