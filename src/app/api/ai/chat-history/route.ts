import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user's subscription tier — use maybeSingle to avoid crash if profile missing
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .maybeSingle();

    const isPro = profile?.subscription_tier && profile.subscription_tier !== 'free';

    if (!isPro) {
      return NextResponse.json({ messages: [], isPro: false });
    }

    const { data: messages, error } = await supabase
      .from('ai_chat_messages')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(50);

    if (error) {
      console.error('Error fetching chat history:', error);
      return NextResponse.json({ messages: [], isPro: true });
    }

    return NextResponse.json({ messages: messages || [], isPro: true });
  } catch (err) {
    console.error('[GET /api/ai/chat-history]', err);
    return NextResponse.json({ messages: [], isPro: false });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check subscription — use maybeSingle to avoid crash
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .maybeSingle();

    const isPro = profile?.subscription_tier && profile.subscription_tier !== 'free';

    if (!isPro) {
      return NextResponse.json({ success: true, saved: false });
    }

    const body = await req.json();
    const { role, content, parsed_transactions, created_transactions } = body;

    const { error } = await supabase
      .from('ai_chat_messages')
      .insert({
        user_id: user.id,
        role,
        content,
        parsed_transactions: parsed_transactions || null,
        created_transactions: created_transactions || null,
      });

    if (error) {
      console.error('Error saving chat message:', error);
      return NextResponse.json({ success: false, saved: false });
    }

    return NextResponse.json({ success: true, saved: true });
  } catch (err) {
    console.error('[POST /api/ai/chat-history]', err);
    return NextResponse.json({ success: false, saved: false });
  }
}
