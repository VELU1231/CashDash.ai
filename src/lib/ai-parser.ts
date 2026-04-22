// ────────────────────────────────────────────────────────────────────────────────
// CashBash.ai - AI Financial Parser (Vercel AI SDK)
// Uses: generateText + Output.object() with Zod schemas
// Supports: OpenAI, Google Gemini, Ollama (local + cloud)
// Falls back to rule-based parser when AI is unavailable
// ────────────────────────────────────────────────────────────────────────────────

import { generateText, Output } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';
import { format } from 'date-fns';
import type { AIParseResponse, ParsedTransaction, TransactionType } from '@/types';
import { AI_CATEGORY_MAP } from '@/lib/utils';

// ─── Zod Schema for Structured Output ─────────────────────────────────────────

const TransactionSchema = z.object({
  amount: z.number().describe('Amount in smallest currency unit (cents/centavos). e.g. $15.50 = 1550'),
  currency: z.string().describe('ISO 4217 currency code: USD, PHP, EUR, GBP, JPY, INR, etc.'),
  description: z.string().describe('Short human-readable description of the transaction'),
  category_name: z.string().describe('Category: Food & Drinks, Transportation, Shopping, Entertainment, Health, Housing, Salary, Freelance, etc.'),
  category_type: z.enum(['income', 'expense', 'transfer']).describe('Transaction type'),
  transaction_date: z.string().describe('Date in YYYY-MM-DD format'),
  confidence: z.number().min(0).max(1).describe('Confidence score 0-1'),
  raw_text: z.string().describe('The original text fragment this was parsed from'),
});

const ParseResponseSchema = z.object({
  message: z.string().describe('A friendly, conversational response or advice to the user'),
  transactions: z.array(TransactionSchema).describe('Array of parsed transactions'),
  corrections: z.array(z.string()).describe('Corrections if user is fixing a previous entry'),
  suggestions: z.array(z.string()).describe('Helpful financial tips or observations'),
  raw_analysis: z.string().describe('Brief summary of what was parsed'),
});

// ─── Provider Factory ─────────────────────────────────────────────────────────

interface LLMConfig {
  provider: 'gateway' | 'openai' | 'ollama' | 'gemini';
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

function getModel(config: LLMConfig) {
  const provider = config.provider || 'ollama';

  // ─── Vercel AI Gateway ──────────────────────────────────────────────
  // One API key → hundreds of models. Set AI_PROVIDER=gateway
  // Model format: "provider/model" e.g. "google/gemma-4-31b-it", "openai/gpt-4o-mini"
  if (provider === 'gateway') {
    const gateway = createOpenAI({
      apiKey: process.env.AI_GATEWAY_API_KEY || process.env.AI_API_KEY || '',
      baseURL: 'https://ai-gateway.vercel.sh/v1',
    });
    return gateway(config.model || process.env.AI_MODEL || 'google/gemma-4-31b-it');
  }

  // ─── Google Gemini (direct) ─────────────────────────────────────────
  if (provider === 'gemini' || provider === 'google' as any) {
    const google = createGoogleGenerativeAI({
      apiKey: config.apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.AI_API_KEY || '',
    });
    return google(config.model || 'gemini-2.0-flash');
  }

  // ─── Ollama (local or cloud via OpenAI-compatible API) ──────────────
  if (provider === 'ollama') {
    const rawURL = (config.baseUrl || process.env.AI_BASE_URL || 'https://ollama.com/v1')
      .replace(/\/api$/, '/v1')   // auto-fix legacy wrong URL
      .replace(/\/+$/, '');       // strip trailing slashes
    // Ensure URL ends with /v1 exactly once
    const ollamaURL = rawURL.endsWith('/v1') ? rawURL : rawURL + '/v1';
    const ollama = createOpenAI({
      apiKey: process.env.OLLAMA_API_KEY || 'ollama',
      baseURL: ollamaURL,
    });
    return ollama(config.model || process.env.AI_MODEL || 'gemma4:31b-cloud');
  }

  // ─── OpenAI (direct) ───────────────────────────────────────────────
  const openai = createOpenAI({
    apiKey: config.apiKey || process.env.OPENAI_API_KEY || process.env.AI_API_KEY || '',
    baseURL: config.baseUrl || process.env.AI_BASE_URL || undefined,
  });
  return openai(config.model || 'gpt-4o-mini');
}

// ─── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are CashBash AI, a friendly and expert financial advisor and transaction parser.
Your job is to act like a helpful friend who manages the user's finances. Always include a friendly, encouraging, or advisory message in your response.

RULES:
1. Provide a friendly conversational 'message' (e.g., "I've noted that down! Spending ₱150 on coffee adds up, maybe try brewing at home tomorrow?")
2. Extract ALL transactions mentioned (can be multiple in one sentence)
3. Detect currency from context:
   - "pesos" or "₱" → PHP
   - "dollars" or "$" → USD
   - "euros" or "€" → EUR
   - "pounds" or "£" → GBP
4. Default date is TODAY unless specified (e.g., "yesterday", "last friday")
5. Map descriptions to smart categories:
   - coffee/cafe/food/restaurant/grocery → Food & Drinks (expense)
   - bus/taxi/uber/grab/train/jeep/fare → Transportation (expense)
   - netflix/spotify/movie/game → Entertainment (expense)
   - medicine/hospital/doctor/gym → Health (expense)
   - shopping/clothes/shoes → Shopping (expense)
   - salary/paycheck/bonus → Salary (income)
   - freelance/project/payment received → Freelance (income)
6. Amounts must be in CENTS (smallest unit). $15.50 = 1550, ₱150 = 15000
7. Confidence 0.0-1.0 based on clarity
8. Handle corrections: "change X to Y" or "update X"`;

// ─── Main Parse Function (Vercel AI SDK) ──────────────────────────────────────

export async function parseFinancialText(
  userText: string,
  config?: Partial<LLMConfig>,
  defaultCurrency: string = 'USD'
): Promise<AIParseResponse> {
  const today = format(new Date(), 'yyyy-MM-dd');

  const llmConfig: LLMConfig = {
    provider: (config?.provider || process.env.AI_PROVIDER || 'ollama') as LLMConfig['provider'],
    apiKey: config?.apiKey || process.env.AI_API_KEY || '',
    baseUrl: config?.baseUrl || process.env.AI_BASE_URL || '',
    model: config?.model || process.env.AI_MODEL || '',
  };

  const enrichedPrompt = `Current date: ${today}
Default currency: ${defaultCurrency}
User message: "${userText}"

Parse all transactions from this message.`;

  try {
    const model = getModel(llmConfig);

    const { output } = await generateText({
      model,
      system: SYSTEM_PROMPT,
      prompt: enrichedPrompt,
      output: Output.object({
        name: 'ParsedTransactions',
        description: 'Extracted financial transactions from natural language',
        schema: ParseResponseSchema,
      }),
    });

    if (!output) {
      console.warn('AI returned no structured output, falling back to rule-based parser');
      return ruleBasedParse(userText, defaultCurrency);
    }

    // Ensure dates and currencies are set
    const result: AIParseResponse = {
      message: output.message,
      transactions: (output.transactions || []).map(tx => ({
        ...tx,
        transaction_date: tx.transaction_date || today,
        currency: tx.currency || defaultCurrency,
        confidence: tx.confidence ?? 0.85,
      })),
      corrections: output.corrections || [],
      suggestions: output.suggestions || [],
      raw_analysis: output.raw_analysis || `Parsed ${output.transactions?.length || 0} transactions`,
    };

    return result;
  } catch (aiError) {
    console.warn('AI SDK parsing failed, falling back to rule-based:', aiError);
    return ruleBasedParse(userText, defaultCurrency);
  }
}

// ─── Generate AI Financial Insight ───────────────────────────────────────────

export async function generateInsight(
  data: {
    totalExpenses: number;
    totalIncome: number;
    topCategory: string;
    topAmount: number;
    currency: string;
    period: string;
  },
  config?: Partial<LLMConfig>
): Promise<string> {
  const { totalExpenses, totalIncome, topCategory, topAmount, currency, period } = data;
  const savingsRate = totalIncome > 0
    ? ((totalIncome - totalExpenses) / totalIncome * 100).toFixed(0)
    : '0';

  const prompt = `Based on this financial data for ${period}:
- Total Income: ${currency} ${(totalIncome / 100).toFixed(2)}
- Total Expenses: ${currency} ${(totalExpenses / 100).toFixed(2)}
- Top Category: ${topCategory} (${currency} ${(topAmount / 100).toFixed(2)})
- Savings Rate: ${savingsRate}%

Give ONE short (max 2 sentences), encouraging but honest financial insight. Be like a friendly financial advisor. Use emojis sparingly.`;

  try {
    const llmConfig: LLMConfig = {
      provider: (config?.provider || process.env.AI_PROVIDER || 'openai') as LLMConfig['provider'],
      apiKey: config?.apiKey || process.env.AI_API_KEY || '',
      baseUrl: config?.baseUrl || process.env.AI_BASE_URL || '',
      model: config?.model || process.env.AI_MODEL || '',
    };

    const model = getModel(llmConfig);

    const { text } = await generateText({
      model,
      system: 'You are a friendly financial advisor. Give short, helpful insights. No markdown.',
      prompt: prompt + '\n\nKeep your response to 1-2 sentences maximum.',
    });

    return text.trim();
  } catch {
    // Static fallback
    const rate = parseInt(savingsRate);
    if (rate > 20) return `Great job! You saved ${savingsRate}% this ${period}. Keep it up! 🎉`;
    if (rate > 0) return `You saved ${savingsRate}% this ${period}. Try to reduce ${topCategory} spending.`;
    return `Your expenses exceeded income this ${period}. Consider reviewing your ${topCategory} spending.`;
  }
}

// ─── Conversational Response (for non-financial messages) ─────────────────────

export async function generateConversationalResponse(
  userMessage: string,
  config?: Partial<LLMConfig>
): Promise<string> {
  try {
    const llmConfig: LLMConfig = {
      provider: (config?.provider || process.env.AI_PROVIDER || 'ollama') as LLMConfig['provider'],
      apiKey: config?.apiKey || process.env.AI_API_KEY || '',
      baseUrl: config?.baseUrl || process.env.AI_BASE_URL || '',
      model: config?.model || process.env.AI_MODEL || '',
    };

    const model = getModel(llmConfig);

    const { text } = await generateText({
      model,
      system: `You are CashBash AI, a friendly, warm, and helpful financial assistant.
You're like a supportive friend who happens to be great with money.

RULES:
1. Be conversational, friendly, and human — use casual language, emojis sparingly.
2. If the user greets you, greet back warmly and remind them you can help track expenses.
3. If they ask for financial advice, give practical, actionable tips.
4. If they ask about budgeting, savings, investing — give helpful guidance.
5. Keep responses concise (2-4 sentences max).
6. Always end with a gentle prompt to help them track something.
7. Never be robotic or formal.`,
      prompt: userMessage,
    });

    return text.trim();
  } catch {
    // Friendly static fallbacks based on message content
    const lower = userMessage.toLowerCase();
    if (lower.includes('hi') || lower.includes('hello') || lower.includes('hey')) {
      return "Hey there! 👋 Great to see you! I'm your CashBash AI buddy. I can help you track expenses, give budgeting tips, or just chat about money. What's on your mind?";
    }
    if (lower.includes('help') || lower.includes('what can you do')) {
      return "I can do a lot! 💪 Tell me what you spent today and I'll log it. Ask me for budgeting tips, savings advice, or how to manage your money better. Just chat naturally!";
    }
    if (lower.includes('save') || lower.includes('budget')) {
      return "Great question! 💡 A solid start is the 50/30/20 rule — 50% needs, 30% wants, 20% savings. Want me to help you track where your money's going this month?";
    }
    return "Hey! 👋 I'm CashBash AI. Tell me what you spent today and I'll log it for you, or ask me anything about managing your finances!";
  }
}

// ─── Rule-Based Fallback Parser ───────────────────────────────────────────────

function ruleBasedParse(userText: string, defaultCurrency: string = 'USD'): AIParseResponse {
  const today = format(new Date(), 'yyyy-MM-dd');
  const transactions: ParsedTransaction[] = [];
  const text = userText.toLowerCase();

  const currencyWords: Record<string, string> = {
    peso: 'PHP', pesos: 'PHP', php: 'PHP',
    dollar: 'USD', dollars: 'USD', usd: 'USD',
    euro: 'EUR', euros: 'EUR', eur: 'EUR',
    pound: 'GBP', pounds: 'GBP',
  };

  // Detect default currency from text
  let detectedCurrency = defaultCurrency;
  for (const [word, code] of Object.entries(currencyWords)) {
    if (text.includes(word)) { detectedCurrency = code; break; }
  }

  // Extract amounts + descriptions
  const amountPattern = /(\d+(?:\.\d+)?)\s*(?:pesos?|dollars?|euros?|pounds?|php|usd|eur|gbp)?\s+(?:for|on|in|at|of)?\s*([a-zA-Z\s]+?)(?:,|and|then|$)/gi;
  let match;

  while ((match = amountPattern.exec(text)) !== null) {
    const rawAmount = parseFloat(match[1]);
    const description = match[2].trim();

    if (!description || rawAmount <= 0) continue;

    const firstWord = description.split(' ')[0].toLowerCase();
    const categoryInfo = AI_CATEGORY_MAP[firstWord] ||
      Object.entries(AI_CATEGORY_MAP).find(([key]) =>
        description.toLowerCase().includes(key)
      )?.[1] ||
      { category: 'Other', type: 'expense' as TransactionType };

    transactions.push({
      amount: Math.round(rawAmount * 100),
      currency: detectedCurrency,
      description: description.charAt(0).toUpperCase() + description.slice(1),
      category_name: (categoryInfo as { category: string; type: TransactionType }).category,
      category_type: (categoryInfo as { category: string; type: TransactionType }).type,
      transaction_date: today,
      confidence: 0.7,
      raw_text: match[0],
    });
  }

  return {
    transactions,
    corrections: [],
    suggestions: transactions.length > 0
      ? [`Found ${transactions.length} transaction${transactions.length > 1 ? 's' : ''} (rule-based).`]
      : ['Could not parse transactions. Try: "I spent 100 pesos on coffee"'],
    raw_analysis: `Rule-based parser found ${transactions.length} transactions`,
  };
}
