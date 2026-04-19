import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('categories')
    .select('*, subcategories:categories!parent_id(id,name,icon,color,type)')
    .eq('user_id', user.id)
    .is('parent_id', null)
    .order('type').order('display_order');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data || [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { data, error } = await supabase
    .from('categories')
    .insert({
      user_id: user.id,
      name: body.name,
      type: body.type || 'expense',
      icon: body.icon || '📁',
      color: body.color || '#6366f1',
      parent_id: body.parent_id || null,
      display_order: body.display_order || 0,
    })
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data }, { status: 201 });
}
