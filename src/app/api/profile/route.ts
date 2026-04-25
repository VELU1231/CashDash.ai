import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ensureUserData } from '@/lib/ensure-user-data';

// Whitelist of fields that exist in the profiles DB table
const ALLOWED_FIELDS = [
  'display_name', 'avatar_url', 'default_currency', 'timezone', 'locale',
  'date_format', 'number_format', 'first_day_of_week', 'theme',
  'ai_enabled', 'ai_auto_categorize', 'ai_suggestions',
  'weekly_budget', 'monthly_budget',
];

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const profile = await ensureUserData(supabase, user);
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

    await ensureUserData(supabase, user);

    const body = await request.json();
    const safeUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const key of ALLOWED_FIELDS) {
      if (key in body) safeUpdate[key] = body[key];
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(safeUpdate)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error('[PUT /api/profile]', error.message);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ data });
  } catch (err) {
    console.error('[PUT /api/profile]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

