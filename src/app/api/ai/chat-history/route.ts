export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    
    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is Pro, Family, or Business
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();
      
    const isPro = profile && ['pro', 'family', 'business'].includes(profile.subscription_tier);

    if (!isPro) {
      return NextResponse.json({ isPro: false, messages: [] });
    }

    // Fetch the last 50 messages, ordered by oldest first so the chat UI displays them chronologically
    const { data: messages, error: messagesError } = await supabase
      .from('ai_chat_messages')
      .select('id, role, content, created_at, parsed_transactions, created_transactions')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (messagesError) {
      console.error('Error fetching chat history:', messagesError);
      return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
    }

    // Supabase returns newest first due to order by DESC, so we reverse it for the UI
    return NextResponse.json({ isPro: true, messages: messages.reverse() });

  } catch (error: any) {
    console.error('Chat history error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    
    const { error } = await supabase.from('ai_chat_messages').insert({
      user_id: user.id,
      role: body.role,
      content: body.content,
      parsed_transactions: body.parsed_transactions || null,
      created_transactions: body.created_transactions || null,
    });

    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Save message error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

