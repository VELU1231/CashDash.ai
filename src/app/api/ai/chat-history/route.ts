import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check user's subscription tier
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .single();

  const isPro = profile?.subscription_tier !== 'free';

  if (!isPro) {
    // Return empty array for free users (ephemeral only)
    return NextResponse.json({ messages: [], isPro: false });
  }

  // Fetch past messages for Pro users
  const { data: messages, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(50); // Get last 50 messages

  if (error) {
    console.error('Error fetching chat history:', error);
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }

  return NextResponse.json({ messages: messages || [], isPro: true });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check user's subscription tier
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .single();

  const isPro = profile?.subscription_tier !== 'free';

  if (!isPro) {
    // Do not save for free users
    return NextResponse.json({ success: true, saved: false });
  }

  try {
    const body = await req.json();
    const { role, content, parsed_transactions, created_transactions } = body;

    const { error } = await supabase
      .from('chat_messages')
      .insert({
        user_id: user.id,
        role,
        content,
        parsed_transactions: parsed_transactions || null,
        created_transactions: created_transactions || null,
      });

    if (error) throw error;

    return NextResponse.json({ success: true, saved: true });
  } catch (error) {
    console.error('Error saving chat message:', error);
    return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
  }
}
