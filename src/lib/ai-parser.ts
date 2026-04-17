// ────────────────────────────────────────────────────────────────────────────────
// CashDash.ai - AI Financial Parser
// Supports: OpenAI, Gemini, Ollama (local/cloud)
// ────────────────────────────────────────────────────────────────────────────────

import type { AIParseResponse, ParsedTransaction, TransactionType } from '@/types';
import { AI_CATEGORY_MAP } from '@/lib/utils';
import { format } from 'date-fns';

// ─── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are CashDash AI, an expert financial transaction parser.

Your job is to extract financial transactions from natural language text.

RULES:
1. Extract ALL transactions mentioned (can be multiple in one sentence)
2. Detect currency from context:
   - "pesos" or "₱" → PHP
   - "dollars" or "$" → USD
   - "euros" or "€" → EUR
   - "pounds" or "£" → GBP
   - Context clue (mention of country/city) helps detect currency
3. Default date is TODAY unless specified
4. Map descriptions to smart categories using context:
   - coffee/cafe/food/restaurant/grocery → Food & Drinks (expense)
   - bus/taxi/uber/grab/train/jeep/fare → Transportation (expense)
   - netflix/spotify/movie/game → Entertainment (expense)
   - medicine/hospital/doctor/gym → Health (expense)
   - shopping/clothes/shoes → Shopping (expense)
   - salary/paycheck/bonus → Salary (income)
   - freelance/project/payment received → Freelance (income)
   - investment/dividend → Investment (income)
5. Determine transaction type: expense (default), income, transfer
6. Handle corrections: "change X to Y" or "update X"
7. Confidence 0.0-1.0 based on clarity of input

RESPOND ONLY WITH VALID JSON matching this exact structure:
{
  "transactions": [
    {
      "amount": 1000,       // in smallest unit (cents/centavos)
      "currency": "PHP",
      "description": "Coffee at Starbucks",
      "category_name": "Food & Drinks",
      "category_type": "expense",
      "transaction_date": "2025-01-15",
      "confidence": 0.95,
      "raw_text": "coffee"
    }
  ],
  "corrections": [],       // if user is correcting a past entry
  "suggestions": [         // helpful AI suggestions
    "Consider setting a daily coffee budget!"
  ],
  "raw_analysis": "Found 2 transactions: coffee expense and bus fare"
}`;

// ─── Provider Implementations ─────────────────────────────────────────────────

interface LLMConfig {
  provider: 'openai' | 'ollama' | 'gemini';
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

async function callOpenAI(
  userMessage: string,
  config: LLMConfig
): Promise<string> {
  const baseUrl = config.baseUrl || 'https://api.openai.com/v1';
  const model = config.model || 'gpt-4o-mini';

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function callOllama(
  userMessage: string,
  config: LLMConfig
): Promise<string> {
  const baseUrl = config.baseUrl || 'http://localhost:11434';
  const model = config.model || 'llama3.2';

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      stream: false,
      format: 'json',
      options: { temperature: 0.1 },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.message.content;
}

async function callGemini(
  userMessage: string,
  config: LLMConfig
): Promise<string> {
  const model = config.model || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `${SYSTEM_PROMPT}\n\nUser: ${userMessage}`,
        }],
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 2000,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

// ─── Rule-Based Fallback Parser ───────────────────────────────────────────────

function ruleBasedParse(userText: string): AIParseResponse {
  const today = format(new Date(), 'yyyy-MM-dd');
  const transactions: ParsedTransaction[] = [];
  const text = userText.toLowerCase();

  // Pattern: "NUMBER currency/word on/for DESCRIPTION"
  // e.g., "10 pesos coffee", "spent 15 on bus"
  const patterns = [
    /(?:spent?|paid?|buy|bought|spend)\s+(\d+(?:\.\d+)?)\s*([a-z]+)?\s+(?:on|for|in|at)?\s+([a-z\s]+)/gi,
    /(\d+(?:\.\d+)?)\s*([a-z]+)?\s+(?:for|on|in|at)\s+([a-z\s]+)/gi,
    /([a-z\s]+)\s+(?:for|costs?|costing|worth)\s+(\d+(?:\.\d+)?)\s*([a-z]+)?/gi,
  ];

  const currencyWords: Record<string, string> = {
    peso: 'PHP', pesos: 'PHP', php: 'PHP',
    dollar: 'USD', dollars: 'USD', usd: 'USD',
    euro: 'EUR', euros: 'EUR', eur: 'EUR',
    pound: 'GBP', pounds: 'GBP',
  };

  // Simple extraction: find amounts followed by descriptions
  const amountPattern = /(\d+(?:\.\d+)?)\s*(?:pesos?|dollars?|euros?|pounds?|php|usd|eur|gbp)?\s+(?:for|on|in|at|of)?\s*([a-zA-Z\s]+?)(?:,|and|then|$)/gi;
  let match;

  while ((match = amountPattern.exec(text)) !== null) {
    const rawAmount = parseFloat(match[1]);
    const description = match[2].trim();

    if (!description || rawAmount <= 0) continue;

    // Detect currency from context
    let currency = 'USD';
    for (const [word, code] of Object.entries(currencyWords)) {
      if (text.includes(word)) { currency = code; break; }
    }

    // Smart category mapping
    const firstWord = description.split(' ')[0].toLowerCase();
    const categoryInfo = AI_CATEGORY_MAP[firstWord] ||
      Object.entries(AI_CATEGORY_MAP).find(([key]) =>
        description.toLowerCase().includes(key)
      )?.[1] ||
      { category: 'Other', type: 'expense' as TransactionType };

    transactions.push({
      amount: Math.round(rawAmount * 100),
      currency,
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
      ? [`I found ${transactions.length} transaction${transactions.length > 1 ? 's' : ''} in your message.`]
      : ['I couldn\'t parse any transactions. Try: "I spent 100 pesos on coffee"'],
    raw_analysis: `Rule-based parser found ${transactions.length} transactions`,
  };
}

// ─── Main Parse Function ──────────────────────────────────────────────────────

export async function parseFinancialText(
  userText: string,
  config?: Partial<LLMConfig>,
  defaultCurrency: string = 'USD'
): Promise<AIParseResponse> {
  const today = format(new Date(), 'yyyy-MM-dd');

  // Build config from env vars as defaults
  const llmConfig: LLMConfig = {
    provider: (config?.provider || process.env.AI_PROVIDER || 'ollama') as LLMConfig['provider'],
    apiKey: config?.apiKey || process.env.AI_API_KEY || '',
    baseUrl: config?.baseUrl || process.env.AI_BASE_URL || '',
    model: config?.model || process.env.AI_MODEL || '',
  };

  const enrichedMessage = `
Current date: ${today}
Default currency: ${defaultCurrency}
User message: "${userText}"

Parse all transactions from this message.
`.trim();

  let rawResponse: string;

  try {
    switch (llmConfig.provider) {
      case 'openai':
        rawResponse = await callOpenAI(enrichedMessage, llmConfig);
        break;
      case 'gemini':
        rawResponse = await callGemini(enrichedMessage, llmConfig);
        break;
      case 'ollama':
      default:
        rawResponse = await callOllama(enrichedMessage, llmConfig);
        break;
    }

    // Parse and validate JSON response
    const parsed = JSON.parse(rawResponse) as AIParseResponse;

    // Ensure dates are set
    if (parsed.transactions) {
      parsed.transactions = parsed.transactions.map(tx => ({
        ...tx,
        transaction_date: tx.transaction_date || today,
        currency: tx.currency || defaultCurrency,
        confidence: tx.confidence ?? 0.85,
      }));
    }

    return parsed;
  } catch (aiError) {
    console.warn('AI parsing failed, falling back to rule-based:', aiError);

    // Always fall back to rule-based parser if AI fails
    return ruleBasedParse(userText);
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

Give ONE short (max 2 sentences), encouraging but honest financial insight. Be like a friendly financial advisor. Use emojis sparingly. NO markdown.`;

  try {
    const llmConfig: LLMConfig = {
      provider: (config?.provider || process.env.AI_PROVIDER || 'ollama') as LLMConfig['provider'],
      apiKey: config?.apiKey || process.env.AI_API_KEY || '',
      baseUrl: config?.baseUrl || process.env.AI_BASE_URL || '',
      model: config?.model || process.env.AI_MODEL || '',
    };

    let response: string;
    const insightMessages = [
      { role: 'system' as const, content: 'You are a friendly financial advisor. Give short, helpful insights.' },
      { role: 'user' as const, content: prompt },
    ];

    if (llmConfig.provider === 'openai') {
      const res = await fetch(`${llmConfig.baseUrl || 'https://api.openai.com/v1'}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${llmConfig.apiKey}` },
        body: JSON.stringify({ model: llmConfig.model || 'gpt-4o-mini', messages: insightMessages, max_tokens: 100 }),
      });
      const d = await res.json();
      response = d.choices[0].message.content;
    } else {
      // Ollama fallback
      const res = await fetch(`${llmConfig.baseUrl || 'http://localhost:11434'}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: llmConfig.model || 'llama3.2', messages: insightMessages, stream: false }),
      });
      const d = await res.json();
      response = d.message.content;
    }

    return response.trim();
  } catch {
    // Fallback insight
    const rate = parseInt(savingsRate);
    if (rate > 20) return `Great job! You saved ${savingsRate}% this ${period}. Keep it up! 🎉`;
    if (rate > 0) return `You saved ${savingsRate}% this ${period}. Try to increase savings by reducing ${topCategory} spending.`;
    return `Your expenses exceeded income this ${period}. Consider reviewing your ${topCategory} spending.`;
  }
}
