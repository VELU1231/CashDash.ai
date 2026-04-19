import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Helper: ensure a profile + default account exist for the user
async function ensureProfile(supabase: any, user: any) {
  const { data: existing } = await supabase
    .from('profiles').select('*').eq('id', user.id).maybeSingle();

  if (existing) return existing;

  // Profile doesn't exist — create it (self-healing after schema reset)
  const displayName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    'User';

  const { data: newProfile, error: insertErr } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      display_name: displayName,
      avatar_url: user.user_metadata?.avatar_url || null,
      default_currency: 'PHP',
      theme: 'system',
    })
    .select()
    .single();

  if (insertErr) {
    console.error('Failed to create profile:', insertErr.message);
    return null;
  }

  // Create a default account
  await supabase.from('accounts').insert({
    user_id: user.id,
    name: 'Cash',
    type: 'cash',
    currency: 'PHP',
    balance: 0,
    initial_balance: 0,
    icon: '💵',
    color: '#10b981',
    display_order: 0,
  });

  // Create default categories
  const categories = [
    { name: 'Food & Drinks', type: 'expense', icon: '🍔', color: '#f59e0b', display_order: 1 },
    { name: 'Transportation', type: 'expense', icon: '🚌', color: '#3b82f6', display_order: 2 },
    { name: 'Shopping', type: 'expense', icon: '🛍️', color: '#ec4899', display_order: 3 },
    { name: 'Entertainment', type: 'expense', icon: '🎬', color: '#8b5cf6', display_order: 4 },
    { name: 'Health', type: 'expense', icon: '💊', color: '#ef4444', display_order: 5 },
    { name: 'Housing', type: 'expense', icon: '🏠', color: '#06b6d4', display_order: 6 },
    { name: 'Utilities', type: 'expense', icon: '⚡', color: '#f97316', display_order: 7 },
    { name: 'Other', type: 'expense', icon: '📦', color: '#94a3b8', display_order: 8 },
    { name: 'Salary', type: 'income', icon: '💼', color: '#10b981', display_order: 1 },
    { name: 'Freelance', type: 'income', icon: '💻', color: '#3b82f6', display_order: 2 },
    { name: 'Other Income', type: 'income', icon: '💰', color: '#84cc16', display_order: 3 },
  ];
  await supabase.from('categories').insert(
    categories.map(c => ({ user_id: user.id, ...c }))
  );

  return newProfile;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const profile = await ensureProfile(supabase, user);
    if (!profile) {
      return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 });
    }
    return NextResponse.json({ data: profile });
  } catch (err) {
    console.error('[GET /api/profile]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Ensure profile exists first
    await ensureProfile(supabase, user);

    const body = await request.json();

    // Only allow updating known columns — reject unknown fields
    const ALLOWED_FIELDS = [
      'display_name', 'avatar_url', 'default_currency', 'timezone', 'locale',
      'date_format', 'number_format', 'first_day_of_week', 'theme',
      'ai_enabled', 'ai_auto_categorize', 'ai_suggestions',
      'weekly_budget', 'monthly_budget',
    ];

    const safeUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const key of ALLOWED_FIELDS) {
      if (key in body) {
        safeUpdate[key] = body[key];
      }
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(safeUpdate)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error('[PUT /api/profile] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ data });
  } catch (err) {
    console.error('[PUT /api/profile]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
