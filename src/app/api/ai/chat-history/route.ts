import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ensureUserData } from '@/lib/ensure-user-data';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ messages: [], isPro: false });

    const profile = await ensureUserData(supabase, user);
    const isPro = profile?.subscription_tier && profile.subscription_tier !== 'free';

    if (!isPro) {
      return NextResponse.json({ messages: [], isPro: false });
    }

    const { data: messages } = await supabase
      .from('ai_chat_messages')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(50);

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
    if (!user) return NextResponse.json({ success: false, saved: false });

    const profile = await ensureUserData(supabase, user);
    const isPro = profile?.subscription_tier && profile.subscription_tier !== 'free';

    if (!isPro) {
      return NextResponse.json({ success: true, saved: false });
    }

    const body = await req.json();
    const { role, content, parsed_transactions, created_transactions } = body;

    await supabase.from('ai_chat_messages').insert({
      user_id: user.id,
      role,
      content,
      parsed_transactions: parsed_transactions || null,
      created_transactions: created_transactions || null,
    });

    return NextResponse.json({ success: true, saved: true });
  } catch (err) {
    console.error('[POST /api/ai/chat-history]', err);
    return NextResponse.json({ success: false, saved: false });
  }
}
