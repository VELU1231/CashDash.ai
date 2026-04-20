import { streamText, tool } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { format } from 'date-fns';

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

const model = process.env.AI_MODEL || 'gemma3:4b';

export async function POST(req: NextRequest) {
  try {
    const { messages, currency = 'USD' } = await req.json();
    const today = format(new Date(), 'yyyy-MM-dd');

    const provider = getProvider();

    const result = await streamText({
      model: provider(model),
      messages,
      system: `You are CashDash AI, a friendly, human-like, and proactive financial advisor and assistant.
Your goal is to help the user track their expenses, give financial advice, and suggest better spending habits.

RULES:
1. Always be conversational, friendly, and supportive.
2. If the user mentions spending money or earning income, ALWAYS use the \`extract_transactions\` tool to log it for them.
3. Don't just execute the task; ask a follow-up question or provide a brief, helpful insight.
4. If they ask for financial advice, provide actionable tips based on general best practices.
5. Current date is ${today}. Default currency is ${currency}.
6. Keep responses concise (1-3 sentences) unless explaining a complex topic.`,
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
