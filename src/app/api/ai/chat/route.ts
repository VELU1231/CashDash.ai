import { streamText, tool } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { NextRequest } from 'next/server';
import { format } from 'date-fns';

// Create an OpenAI provider instance for Ollama cloud
const ollama = createOpenAI({
  apiKey: process.env.OLLAMA_API_KEY || 'ollama',
  baseURL: process.env.AI_BASE_URL || 'http://localhost:11434/v1',
});

export async function POST(req: NextRequest) {
  const { messages, currency = 'USD' } = await req.json();
  const today = format(new Date(), 'yyyy-MM-dd');

  const result = await streamText({
    model: ollama('gemma4:31b-cloud'),
    messages,
    system: `You are CashDash AI, a friendly, human-like, and proactive financial advisor and assistant.
Your goal is to help the user track their expenses, give financial advice, and suggest better spending habits.

RULES:
1. Always be conversational, friendly, and supportive.
2. If the user mentions spending money or earning income, ALWAYS use the \`extract_transactions\` tool to log it for them.
3. Don't just execute the task; ask a follow-up question or provide a brief, helpful insight (e.g., "I've noted that down! 🍔 That’s quite a bit on food today — are you eating out often?").
4. If they ask for financial advice, provide actionable tips based on general best practices.
5. Current date is ${today}. Default currency is ${currency}.
6. Keep your responses concise (1-3 sentences) unless explaining a complex topic.`,
    tools: {
      extract_transactions: tool({
        description: 'Extract financial transactions from the user\'s message so they can be logged to the database.',
        inputSchema: z.object({
          transactions: z.array(z.object({
            amount: z.number().describe('Amount in smallest currency unit (cents/centavos). e.g. $15.50 = 1550'),
            currency: z.string().describe('ISO 4217 currency code: USD, PHP, EUR, etc.'),
            description: z.string().describe('Short human-readable description'),
            category_name: z.string().describe('Category: Food & Drinks, Transportation, Shopping, Entertainment, Health, Housing, Salary, Freelance, etc.'),
            category_type: z.enum(['income', 'expense', 'transfer']).describe('Transaction type'),
            transaction_date: z.string().describe('Date in YYYY-MM-DD format'),
          })).describe('Array of extracted transactions'),
        }),
      }),
    },
  });

  return result.toTextStreamResponse();
}
