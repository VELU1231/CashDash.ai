import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseFinancialText } from '@/lib/ai-parser';
import { parseNaturalLanguageTransaction } from '@/lib/smart-parser';
import { ensureUserData } from '@/lib/ensure-user-data';
import type { TransactionType } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await ensureUserData(supabase, user);

    const { message, currency = 'USD', parseOnly = false } = await request.json();
    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('default_currency, ai_enabled')
      .eq('id', user.id)
      .maybeSingle();

    const defaultCurrency = profile?.default_currency || currency;

    let parsed: any;

    // ─── Instant "Zero-AI" NLP Fallback ──────────────────────────────────
    const instantParse = parseNaturalLanguageTransaction(message, defaultCurrency);
    
    if (instantParse) {
      parsed = {
        transactions: [{
          description: instantParse.description,
          amount: instantParse.amount,
          currency: instantParse.currency,
          transaction_date: instantParse.date,
          category_type: instantParse.type,
          category_name: 'General',
          confidence: 100,
        }],
        message: 'Parsed instantly without AI.',
      };
    } else {
      // Parse with AI
      parsed = await parseFinancialText(message, {
        provider: (process.env.AI_PROVIDER || 'ollama') as 'openai' | 'ollama' | 'gemini',
        apiKey: process.env.AI_API_KEY,
        baseUrl: process.env.AI_BASE_URL,
        model: process.env.AI_MODEL,
      }, defaultCurrency);
    }

    // If AI returned a conversational message but no transactions, return that message
    if (!parsed.transactions?.length) {
      // If the AI gave a real message (not from rule-based fallback), use it
      if (parsed.message && parsed.message.length > 10) {
        return NextResponse.json({ parsed, created: [], message: 'No transactions found' });
      }

      // Otherwise, generate a conversational response
      try {
        const { generateConversationalResponse } = await import('@/lib/ai-parser');
        const chatReply = await generateConversationalResponse(message, {
          provider: (process.env.AI_PROVIDER || 'ollama') as 'openai' | 'ollama' | 'gemini',
          apiKey: process.env.AI_API_KEY,
          baseUrl: process.env.AI_BASE_URL,
          model: process.env.AI_MODEL,
        });
        return NextResponse.json({
          parsed: { ...parsed, message: chatReply },
          created: [],
          message: 'No transactions found',
        });
      } catch {
        // Final fallback
        return NextResponse.json({
          parsed: { ...parsed, message: "Hey there! 👋 I'm CashDash AI. I can help you track expenses, give financial tips, or just chat. Try telling me what you spent today!" },
          created: [],
          message: 'No transactions found',
        });
      }
    }

    // ─── Parse-only mode: return parsed data for user confirmation ───────
    if (parseOnly) {
      return NextResponse.json({
        parsed,
        created: [],
        message: `Found ${parsed.transactions.length} transaction(s). Awaiting confirmation.`,
      });
    }

    // ─── Auto-save mode (legacy / direct API calls) ─────────────────────
    const created = [];

    for (const tx of parsed.transactions) {
      try {
        // Find or create category
        let categoryId: string | null = null;

        if (tx.category_name) {
          const { data: existingCat } = await supabase
            .from('categories')
            .select('id')
            .eq('user_id', user.id)
            .ilike('name', tx.category_name)
            .eq('type', tx.category_type)
            .maybeSingle();

          if (existingCat) {
            categoryId = existingCat.id;
          } else {
            const { data: newCat } = await supabase
              .from('categories')
              .insert({
                user_id: user.id,
                name: tx.category_name,
                type: tx.category_type as TransactionType,
                icon: getCategoryIcon(tx.category_name),
                color: getCategoryColor(tx.category_name),
                display_order: 99,
              })
              .select('id')
              .single();
            categoryId = newCat?.id || null;
          }
        }

        // Find default account
        const { data: defaultAccount } = await supabase
          .from('accounts')
          .select('id, currency, balance')
          .eq('user_id', user.id)
          .eq('is_hidden', false)
          .order('display_order')
          .limit(1)
          .single();

        const accountId = defaultAccount?.id;
        if (!accountId) continue;

        const { data: newTx } = await supabase
          .from('transactions')
          .insert({
            user_id: user.id,
            type: tx.category_type,
            category_id: categoryId,
            account_id: accountId,
            amount: Math.abs(tx.amount),
            currency: tx.currency || defaultAccount.currency || defaultCurrency,
            description: tx.description,
            transaction_date: tx.transaction_date,
            is_ai_created: true,
            ai_confidence: tx.confidence,
          })
          .select('*, category:categories(*), account:accounts!account_id(*)')
          .single();

        if (newTx) created.push(newTx);

        // Update balance
        const balanceChange = tx.category_type === 'income' ? Math.abs(tx.amount) : -Math.abs(tx.amount);
        try {
          await supabase.rpc('adjust_account_balance', {
            p_account_id: accountId,
            p_delta: balanceChange,
          });
        } catch { /* non-blocking */ }
      } catch (txError) {
        console.error('Error creating transaction:', txError);
      }
    }

    return NextResponse.json({
      parsed,
      created,
      message: `Logged ${created.length} transactions`,
    });

  } catch (error) {
    console.error('AI parse error:', error);
    return NextResponse.json({ error: 'Failed to process message' }, { status: 500 });
  }
}

function getCategoryIcon(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('food') || lower.includes('restaurant') || lower.includes('cafe')) return '🍔';
  if (lower.includes('transport')) return '🚌';
  if (lower.includes('entertainment')) return '🎬';
  if (lower.includes('health')) return '💊';
  if (lower.includes('shopping')) return '🛍️';
  if (lower.includes('salary')) return '💼';
  if (lower.includes('freelance')) return '💻';
  if (lower.includes('investment')) return '📈';
  if (lower.includes('housing') || lower.includes('rent')) return '🏠';
  if (lower.includes('education')) return '📚';
  if (lower.includes('utilities')) return '⚡';
  return '📦';
}

function getCategoryColor(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('food')) return '#f59e0b';
  if (lower.includes('transport')) return '#3b82f6';
  if (lower.includes('entertainment')) return '#8b5cf6';
  if (lower.includes('health')) return '#ef4444';
  if (lower.includes('shopping')) return '#ec4899';
  if (lower.includes('salary') || lower.includes('income')) return '#10b981';
  if (lower.includes('investment')) return '#f59e0b';
  if (lower.includes('housing')) return '#06b6d4';
  return '#94a3b8';
}
