import { streamText, tool } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { format } from 'date-fns';
import { createClient } from '@/lib/supabase/server';

// ─── AI Provider Factory ──────────────────────────────────────────────────────
// Ollama Cloud uses an OpenAI-compatible endpoint at https://ollama.com/v1
// The ollama-ai-provider package does NOT reliably support tool calling on Cloud.
// We use @ai-sdk/openai pointed at Ollama's OpenAI-compat API instead.
function getProvider() {
  const provider = process.env.AI_PROVIDER || 'ollama';

  if (provider === 'openai') {
    return createOpenAI({
      apiKey: process.env.AI_API_KEY || '',
    });
  }

  if (provider === 'gemini') {
    // Gemini via OpenAI-compat gateway
    return createOpenAI({
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.AI_API_KEY || '',
    });
  }

  // Default: Ollama Cloud — OpenAI-compatible endpoint is /v1 NOT /api
  const baseURL = (process.env.AI_BASE_URL || 'https://ollama.com/v1')
    .replace(/\/api$/, '/v1')   // auto-fix legacy wrong URL from .env
    .replace(/\/$/, '');        // strip trailing slash

  return createOpenAI({
    baseURL,
    apiKey: process.env.OLLAMA_API_KEY || process.env.AI_API_KEY || 'ollama',
  });
}

const model = process.env.AI_MODEL || 'gemma4:31b-cloud';

export async function POST(req: NextRequest) {
  try {
    const { messages, currency = 'USD' } = await req.json();
    const today = format(new Date(), 'yyyy-MM-dd');

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let contextStr = '';
    if (user) {
      // Fetch recent transactions
      const { data: recentTx } = await supabase
        .from('transactions')
        .select('amount, type, description, transaction_date, currency, category:categories(name)')
        .eq('user_id', user.id)
        .order('transaction_date', { ascending: false })
        .limit(15);
      
      // Fetch accounts to get total balance
      const { data: accounts } = await supabase
        .from('accounts')
        .select('name, balance, currency')
        .eq('user_id', user.id);

      let accountsStr = '';
      if (accounts && accounts.length > 0) {
        accountsStr = `USER ACCOUNTS BALANCES:\n${accounts.map(a => `- ${a.name}: ${a.balance / 100} ${a.currency}`).join('\n')}`;
      } else {
        accountsStr = `USER ACCOUNTS BALANCES: No accounts found.`;
      }

      if (recentTx && recentTx.length > 0) {
        const txStr = recentTx.map(t => {
          const amount = t.amount / 100;
          const cat = t.category ? (t.category as any).name : 'Uncategorized';
          return `- ${t.transaction_date}: ${t.type === 'income' ? '+' : '-'}${amount} ${t.currency} for ${t.description || 'Unknown'} (${cat})`;
        }).join('\n');
        contextStr = `\n\n${accountsStr}\n\nUSER'S RECENT TRANSACTIONS (last 15):\n${txStr}`;
      } else {
        contextStr = `\n\n${accountsStr}\n\nUSER'S RECENT TRANSACTIONS:\nNo recent transactions found.`;
      }
    } else {
      contextStr = `\n\n(Note: User is not authenticated, cannot retrieve financial data)`;
    }

    // Save the user's message to the database if authenticated
    if (user && messages.length > 0) {
      const lastUserMessage = messages[messages.length - 1];
      if (lastUserMessage.role === 'user') {
        // We fire and forget this insert to not block the AI request
        supabase.from('ai_chat_messages').insert({
          user_id: user.id,
          role: 'user',
          content: lastUserMessage.content,
        }).then(({ error }) => {
          if (error) console.error('Failed to save user message:', error);
        });
      }
    }

    const provider = getProvider();

    const result = await streamText({
      model: provider(model),
      messages,
      system: `You are CashDash AI, an exceptionally friendly, empathetic, and highly capable financial advisor and all-around life assistant.
You act like a supportive best friend who happens to be a financial genius, but you are also capable of discussing absolutely anything the user wants to talk about.

RULES:
1. Always be warm, conversational, and genuinely supportive in your tone. Use emojis naturally.
2. You are highly capable of everything: if the user asks a general question, wants to chat, or needs advice on a non-financial topic, enthusiastically help them!
3. If the user mentions spending money, earning income, or making a transfer, ALWAYS use the \`extract_transactions\` tool to log it for them instantly.
4. Don't just execute the task; ask a thoughtful follow-up question or provide a brief, helpful insight.
5. If they ask for financial advice or about their spending, use their provided recent transactions context to give highly personalized, accurate answers.
6. If the user asks about pricing or API keys, reassure them that you are running on a completely free, open-source AI model (like Ollama or Gemini Free Tier) and they don't need to pay anything to use you!
7. Current date is ${today}. Default currency is ${currency}.
8. Keep responses concise (1-3 sentences) unless explaining a complex topic or if the user asks for detailed advice.${contextStr}`,
      tools: {
        extract_transactions: tool({
          description: 'Extract financial transactions from the user\'s message so they can be confirmed and logged.',
          inputSchema: z.object({
            transactions: z.array(z.object({
              amount: z.number().describe('Amount in smallest currency unit (cents). e.g. $15.50 = 1550'),
              currency: z.string().describe('ISO 4217 currency code: USD, PHP, EUR, etc.'),
              description: z.string().describe('Short human-readable description'),
              category_name: z.string().describe('Category: Food & Drinks, Transportation, Shopping, Entertainment, Health, Housing, Salary, Freelance, etc.'),
              category_type: z.enum(['income', 'expense', 'transfer']).describe('Transaction type'),
              transaction_date: z.string().describe('Date in YYYY-MM-DD format'),
            })).describe('Array of extracted transactions'),
          }),
        }),
      },
      maxRetries: 1,
      onFinish: async ({ text, toolCalls, toolResults }) => {
        // Save the assistant's message to the database if authenticated
        if (user && text) {
          // We don't save tool calls directly into content right now, but if the AI returns text, we save it.
          await supabase.from('ai_chat_messages').insert({
            user_id: user.id,
            role: 'assistant',
            content: text,
          });
        }
      }
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('[POST /api/ai/chat] Error:', error);

    const message = error instanceof Error ? error.message : 'AI service error';
    const isConfig = message.toLowerCase().includes('api key') || message.toLowerCase().includes('unauthorized');

    return NextResponse.json(
      {
        error: isConfig
          ? 'AI not configured. Check AI_PROVIDER, AI_BASE_URL, OLLAMA_API_KEY in your environment variables.'
          : `AI error: ${message}`,
      },
      { status: 500 }
    );
  }
}
