import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Diagnostic endpoint — will be removed after debugging
export async function GET() {
  const diagnostics: Record<string, any> = {
    timestamp: new Date().toISOString(),
    env: {
      SUPABASE_URL_SET: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_URL_PREFIX: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
      ANON_KEY_SET: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      ANON_KEY_PREFIX: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...',
      AI_PROVIDER: process.env.AI_PROVIDER || '(not set)',
      AI_BASE_URL: process.env.AI_BASE_URL || '(not set)',
      AI_MODEL: process.env.AI_MODEL || '(not set)',
      OLLAMA_KEY_SET: !!process.env.OLLAMA_API_KEY,
    },
    auth: { user: null as any, error: null as any },
    tables: {} as Record<string, any>,
  };

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    diagnostics.auth.user = user ? { id: user.id, email: user.email } : null;
    diagnostics.auth.error = authError?.message || null;

    if (user) {
      // Test profiles table
      const { data: profile, error: profileErr } = await supabase
        .from('profiles').select('id, subscription_tier, default_currency').eq('id', user.id).maybeSingle();
      diagnostics.tables.profiles = { exists: !!profile, data: profile, error: profileErr?.message };

      // Test accounts table
      const { data: accounts, error: accountErr } = await supabase
        .from('accounts').select('id, name').eq('user_id', user.id).limit(3);
      diagnostics.tables.accounts = { count: accounts?.length || 0, error: accountErr?.message };

      // Test categories table
      const { data: categories, error: catErr } = await supabase
        .from('categories').select('id, name').eq('user_id', user.id).limit(3);
      diagnostics.tables.categories = { count: categories?.length || 0, error: catErr?.message };

      // Test transactions table
      const { data: txns, error: txErr } = await supabase
        .from('transactions').select('id').eq('user_id', user.id).limit(1);
      diagnostics.tables.transactions = { count: txns?.length || 0, error: txErr?.message };

      // Test ai_chat_messages table
      const { data: chat, error: chatErr } = await supabase
        .from('ai_chat_messages').select('id').eq('user_id', user.id).limit(1);
      diagnostics.tables.ai_chat_messages = { count: chat?.length || 0, error: chatErr?.message };
    }
  } catch (err: any) {
    diagnostics.fatal_error = err.message;
  }

  return NextResponse.json(diagnostics, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

