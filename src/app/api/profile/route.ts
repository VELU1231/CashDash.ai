import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('profiles').select('*').eq('id', user.id).single();

  if (error && error.code === 'PGRST116') {
    // Self-healing: if the user exists in Auth but not in public profiles (e.g. after schema reset)
    // insert a new profile and default data.
    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        display_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
        avatar_url: user.user_metadata?.avatar_url || null,
        default_currency: 'USD',
        theme: 'system'
      })
      .select().single();
    
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

    // Ensure they have at least one account
    await supabase.from('accounts').insert({
      user_id: user.id,
      name: 'Main Wallet',
      type: 'cash',
      currency: 'USD',
      balance: 0,
      icon: 'Wallet',
      color: '#10b981'
    });

    return NextResponse.json({ data: newProfile });
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', user.id)
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}
