import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('subscription_tier, default_currency').eq('id', user.id).single();
    if (profile?.subscription_tier === 'free') {
      return NextResponse.json({ error: 'Upgrade to Pro for AI Insights' }, { status: 403 });
    }

    // Get this month's transactions
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    
    const { data: transactions } = await supabase
      .from('transactions')
      .select(`
        id, amount, currency, type, description, transaction_date,
        category:categories(name)
      `)
      .eq('user_id', user.id)
      .gte('transaction_date', startOfMonth);

    if (!transactions || transactions.length === 0) {
      return NextResponse.json({ insight: "Not enough data this month to generate an insight. Add some transactions!" });
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
    }, { totalExpense: 0, totalIncome: 0, categories: {} });

    const prompt = `You are an expert financial advisor. Here is a summary of my spending this month:
Total Income: ${summary.totalIncome / 100}
Total Expenses: ${summary.totalExpense / 100}
Expenses by Category: ${JSON.stringify(summary.categories)}

Provide a very brief (max 2 sentences), punchy, and actionable financial insight or warning based on this data. Be encouraging but direct. DO NOT include pleasantries, just the insight.`;

    const response = await fetch(process.env.OLLAMA_URL || 'http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemma4:31b-cloud',
        prompt: prompt,
        stream: false
      })
    });

    if (!response.ok) throw new Error('Ollama API error');
    
    const result = await response.json();
    return NextResponse.json({ insight: result.response });

  } catch (error: any) {
    console.error('Insights failed:', error);
    return NextResponse.json({ error: 'Failed to generate insights' }, { status: 500 });
  }
}
