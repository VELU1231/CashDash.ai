export const runtime = 'edge';
import { start } from 'workflow/api';
import { handleNewUserOnboarding } from '@/workflows/user-onboarding';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { workflow, ...params } = await request.json();

    switch (workflow) {
      case 'onboarding':
        await start(handleNewUserOnboarding, [user.id, user.email || '']);
        return NextResponse.json({ message: 'Onboarding workflow started' });

      default:
        return NextResponse.json({ error: 'Unknown workflow' }, { status: 400 });
    }
  } catch (error) {
    console.error('Workflow start error:', error);
    return NextResponse.json({ error: 'Failed to start workflow' }, { status: 500 });
  }
}

