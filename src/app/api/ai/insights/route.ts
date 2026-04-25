import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier, default_currency')
      .eq('id', user.id)
      .single();

    if (profile?.subscription_tier === 'free') {
      return NextResponse.json({ error: 'Upgrade to Pro for AI Insights' }, { status: 403 });
    }

    // Get this month's transactions
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    const { data: transactions } = await supabase
      .from('transactions')
      .select('id, amount, currency, type, description, transaction_date, category:categories(name)')
      .eq('user_id', user.id)
      .gte('transaction_date', startOfMonth);

    if (!transactions || transactions.length === 0) {
      return NextResponse.json({ insight: 'Not enough data this month to generate an insight. Add some transactions!' });
    }

    // Summarize data to save tokens
    const summary = transactions.reduce((acc: any, t) => {
      const cat = (t.category as any)?.name || 'Uncategorized';
      if (t.type === 'expense') {
        acc.totalExpense += t.amount;
        acc.categories[cat] = (acc.categories[cat] || 0) + t.amount;
      } else if (t.type === 'income') {
        acc.totalIncome += t.amount;
      }
      return acc;
    }, { totalExpense: 0, totalIncome: 0, categories: {} as Record<string, number> });

    const prompt = `You are an expert financial advisor. Here is a summary of my spending this month:
Total Income: ${summary.totalIncome / 100}
Total Expenses: ${summary.totalExpense / 100}
Expenses by Category: ${JSON.stringify(summary.categories)}

Provide a very brief (max 2 sentences), punchy, and actionable financial insight or warning based on this data. Be encouraging but direct. DO NOT include pleasantries, just the insight.`;

    // ─── Provider-agnostic AI call ───────────────────────────────────
    const provider = (process.env.AI_PROVIDER || 'ollama') as 'openai' | 'ollama' | 'gemini' | 'gateway';
    const baseUrl = process.env.AI_BASE_URL || 'http://localhost:11434';
    const model = process.env.AI_MODEL || 'gemma4:31b-cloud';
    const apiKey = process.env.AI_API_KEY;

    let insight = '';

    if (provider === 'openai' && apiKey) {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: model || 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 120,
        }),
      });
      const result = await res.json();
      insight = result.choices?.[0]?.message?.content || '';

    } else if (provider === 'gateway' && (apiKey || process.env.AI_GATEWAY_API_KEY)) {
      const gatewayKey = apiKey || process.env.AI_GATEWAY_API_KEY || '';
      const res = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${gatewayKey}` },
        body: JSON.stringify({
          model: model || 'google/gemma-4-31b-it',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 120,
        }),
      });
      const result = await res.json();
      insight = result.choices?.[0]?.message?.content || '';

    } else if (provider === 'gemini') {
      const geminiKey = apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';
      const geminiModel = model || 'gemini-2.0-flash';
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      );
      const result = await res.json();
      insight = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

    } else {
      // Ollama (default) — supports local and cloud deployments
      const ollamaUrl = baseUrl.replace(/\/+$/, '');
      const res = await fetch(`${ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt, stream: false }),
      });
      if (!res.ok) throw new Error(`AI provider error: ${res.status}`);
      const result = await res.json();
      insight = result.response || '';
    }

    return NextResponse.json({ insight: insight.trim() });

  } catch (error: any) {
    console.error('[GET /api/ai/insights] Failed:', error);
    return NextResponse.json({ error: 'Failed to generate insights' }, { status: 500 });
  }
}

