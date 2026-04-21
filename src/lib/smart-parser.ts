export interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  currency: string;
}

/**
 * Extracts transactions from raw text (e.g., from PDF or OCR) using regex.
 * Zero-AI, completely offline/free parsing.
 */
export function extractTransactionsFromText(text: string, defaultCurrency: string = 'USD'): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // Regex patterns
  // Matches: 2024-05-12, 12/05/2024, May 12 2024, 12 May 2024, etc.
  const dateRegex = /(?:19|20)\d\d[- /.](?:0[1-9]|1[012])[- /.](?:0[1-9]|[12][0-9]|3[01])|(?:0[1-9]|1[012])[- /.](?:0[1-9]|[12][0-9]|3[01])[- /.](?:19|20)\d\d|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? ?(?:19|20)\d\d|\d{1,2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* (?:19|20)\d\d/i;
  
  // Matches: $15.00, -15.00, (15.00), 1,500.50
  const amountRegex = /[-$£€₱¥(]?\s*(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{2})?\s*[)]?/g;
  
  // Currency symbols mapping to ISO codes
  const currencySymbols: Record<string, string> = {
    '$': 'USD', '£': 'GBP', '€': 'EUR', '₱': 'PHP', '¥': 'JPY'
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    const dateMatch = line.match(dateRegex);
    if (!dateMatch) continue; // Must have a date to be a transaction line

    let rawDateStr = dateMatch[0];
    
    // Attempt to standardize date parsing. If invalid, fallback to current date.
    let dateObj = new Date(rawDateStr);
    if (isNaN(dateObj.getTime())) {
       // try some manual fixes or ignore line
       continue;
    }
    const isoDate = dateObj.toISOString().split('T')[0];

    // Remove the date from the line to find the rest
    let remainingLine = line.replace(rawDateStr, '').trim();

    // Find all amounts
    const amountMatches = remainingLine.match(amountRegex);
    if (!amountMatches) continue; // Must have an amount
    
    // Usually the last amount in a bank statement line is the transaction amount (sometimes balance is there too)
    // We'll take the first one that looks like a valid amount, or heuristics
    // For simplicity, take the first match as the amount
    let amountStr = amountMatches[0].trim();
    
    // Determine currency
    let currency = defaultCurrency;
    for (const [sym, code] of Object.entries(currencySymbols)) {
      if (amountStr.includes(sym) || remainingLine.includes(sym)) {
        currency = code;
        break;
      }
    }

    // Determine sign (expense vs income)
    let isNegative = amountStr.includes('-') || (amountStr.startsWith('(') && amountStr.endsWith(')'));
    let cleanAmountStr = amountStr.replace(/[^0-9.]/g, ''); // Keep only numbers and decimal
    
    let amountNum = parseFloat(cleanAmountStr);
    if (isNaN(amountNum)) continue;

    // Convert to cents
    let amountCents = Math.round(amountNum * 100);

    // Remove the amount from the line to get the description
    let description = remainingLine.replace(amountStr, '').trim();
    
    // Clean up description (remove extra spaces, weird chars often left over from OCR)
    description = description.replace(/\s{2,}/g, ' ').replace(/^[-|,.;:]+/, '').trim();
    if (!description) description = 'Unknown Transaction';

    // Heuristic: If it has "deposit", "salary", "refund" it might be income even if positive.
    // Usually statements show positive for deposits, negative for withdrawals.
    // If there's no sign, we might have to guess or assume expense if it's a credit card, income if it's a bank statement.
    // For now, let's assume standard: negative or parentheses = expense, otherwise income.
    // BUT many receipts just show positive totals. So if no explicit sign, assume expense for now unless it looks like a refund.
    let type: 'income' | 'expense' = 'expense';
    
    const lowerDesc = description.toLowerCase();
    if (isNegative || lowerDesc.includes('payment') || lowerDesc.includes('fee')) {
        type = 'expense';
    } else if (lowerDesc.includes('deposit') || lowerDesc.includes('salary') || lowerDesc.includes('refund') || lowerDesc.includes('credit')) {
        type = 'income';
    } else {
        // Default to expense for unsigned amounts (like receipts)
        type = 'expense';
    }

    transactions.push({
      date: isoDate,
      description: description.substring(0, 100), // Cap length
      amount: amountCents,
      type: type,
      currency: currency
    });
  }

  return transactions;
}

/**
 * Very basic NLP fallback for parsing things like "I spent 15 on coffee yesterday"
 * Zero-AI, runs instantly locally.
 */
export function parseNaturalLanguageTransaction(text: string, defaultCurrency: string = 'USD'): ParsedTransaction | null {
  const lowerText = text.toLowerCase();
  
  // Quick check if it looks like a transaction statement
  if (!lowerText.includes('spent') && !lowerText.includes('bought') && !lowerText.includes('paid') && !lowerText.includes('earned') && !lowerText.includes('got')) {
      return null;
  }

  // Find amount
  const amountMatch = lowerText.match(/\$?(\d+(?:\.\d{2})?)/);
  if (!amountMatch) return null;
  
  const amountNum = parseFloat(amountMatch[1]);
  if (isNaN(amountNum)) return null;

  // Determine type
  let type: 'income' | 'expense' = 'expense';
  if (lowerText.includes('earned') || lowerText.includes('got paid') || lowerText.includes('received')) {
      type = 'income';
  }

  // Try to find description
  let desc = 'Transaction';
  const descRegex = /(?:on|for|bought|paid|from) ([\w\s]+?)(?:today|yesterday|last|this|$)/i;
  const descMatch = lowerText.match(descRegex);
  if (descMatch && descMatch[1]) {
      desc = descMatch[1].trim();
  }

  // Try to find date
  let date = new Date();
  if (lowerText.includes('yesterday')) {
      date.setDate(date.getDate() - 1);
  } else if (lowerText.includes('day before yesterday')) {
      date.setDate(date.getDate() - 2);
  }
  
  return {
      date: date.toISOString().split('T')[0],
      description: desc.substring(0, 50),
      amount: Math.round(amountNum * 100),
      type,
      currency: defaultCurrency
  };
}
