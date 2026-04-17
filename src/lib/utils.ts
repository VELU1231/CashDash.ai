import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import type { CurrencyInfo, TransactionType } from '@/types';

// ─── Class Merge ─────────────────────────────────────────────────────────────

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Currency Formatting ──────────────────────────────────────────────────────

export const CURRENCIES: Record<string, CurrencyInfo> = {
  USD: { code: 'USD', name: 'US Dollar', symbol: '$', position: 'before', decimals: 2, flag: '🇺🇸' },
  EUR: { code: 'EUR', name: 'Euro', symbol: '€', position: 'before', decimals: 2, flag: '🇪🇺' },
  GBP: { code: 'GBP', name: 'British Pound', symbol: '£', position: 'before', decimals: 2, flag: '🇬🇧' },
  JPY: { code: 'JPY', name: 'Japanese Yen', symbol: '¥', position: 'before', decimals: 0, flag: '🇯🇵' },
  PHP: { code: 'PHP', name: 'Philippine Peso', symbol: '₱', position: 'before', decimals: 2, flag: '🇵🇭' },
  INR: { code: 'INR', name: 'Indian Rupee', symbol: '₹', position: 'before', decimals: 2, flag: '🇮🇳' },
  CAD: { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$', position: 'before', decimals: 2, flag: '🇨🇦' },
  AUD: { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', position: 'before', decimals: 2, flag: '🇦🇺' },
  SGD: { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', position: 'before', decimals: 2, flag: '🇸🇬' },
  MYR: { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', position: 'before', decimals: 2, flag: '🇲🇾' },
  THB: { code: 'THB', name: 'Thai Baht', symbol: '฿', position: 'before', decimals: 2, flag: '🇹🇭' },
  IDR: { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', position: 'before', decimals: 0, flag: '🇮🇩' },
  KRW: { code: 'KRW', name: 'South Korean Won', symbol: '₩', position: 'before', decimals: 0, flag: '🇰🇷' },
  CNY: { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', position: 'before', decimals: 2, flag: '🇨🇳' },
  HKD: { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', position: 'before', decimals: 2, flag: '🇭🇰' },
  CHF: { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr.', position: 'before', decimals: 2, flag: '🇨🇭' },
  BRL: { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', position: 'before', decimals: 2, flag: '🇧🇷' },
  MXN: { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$', position: 'before', decimals: 2, flag: '🇲🇽' },
  AED: { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', position: 'after', decimals: 2, flag: '🇦🇪' },
  SAR: { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', position: 'after', decimals: 2, flag: '🇸🇦' },
};

export function formatCurrency(
  amountInCents: number,
  currencyCode: string = 'USD',
  options?: { showSign?: boolean; compact?: boolean }
): string {
  const currency = CURRENCIES[currencyCode] || CURRENCIES.USD;
  const amount = amountInCents / 100;
  const { showSign = false, compact = false } = options || {};

  let formatted: string;

  if (compact && Math.abs(amount) >= 1000) {
    const abs = Math.abs(amount);
    if (abs >= 1_000_000) formatted = `${(abs / 1_000_000).toFixed(1)}M`;
    else if (abs >= 1_000) formatted = `${(abs / 1_000).toFixed(1)}K`;
    else formatted = abs.toFixed(currency.decimals);
  } else {
    formatted = Math.abs(amount).toLocaleString('en-US', {
      minimumFractionDigits: currency.decimals,
      maximumFractionDigits: currency.decimals,
    });
  }

  const withSymbol = currency.position === 'before'
    ? `${currency.symbol}${formatted}`
    : `${formatted} ${currency.symbol}`;

  if (showSign) {
    const sign = amount >= 0 ? '+' : '-';
    return `${sign}${withSymbol}`;
  }

  return amount < 0 ? `-${withSymbol}` : withSymbol;
}

export function parseCurrencyAmount(input: string): { amount: number; currency: string } {
  // Detect currency symbols
  const currencyMap: Record<string, string> = {
    '$': 'USD', '€': 'EUR', '£': 'GBP', '¥': 'JPY', '₱': 'PHP',
    '₹': 'INR', '฿': 'THB', '₩': 'KRW', 'RM': 'MYR', 'Rp': 'IDR',
  };

  let currency = 'USD';
  let cleanInput = input.trim();

  for (const [symbol, code] of Object.entries(currencyMap)) {
    if (cleanInput.includes(symbol)) {
      currency = code;
      cleanInput = cleanInput.replace(symbol, '').trim();
      break;
    }
  }

  // Detect currency codes
  const codeMatch = cleanInput.match(/^([A-Z]{3})\s+(.+)$/) ||
    cleanInput.match(/^(.+)\s+([A-Z]{3})$/);
  if (codeMatch) {
    const possibleCode = codeMatch[1].length === 3 ? codeMatch[1] : codeMatch[2];
    if (CURRENCIES[possibleCode]) {
      currency = possibleCode;
      cleanInput = codeMatch[1].length === 3 ? codeMatch[2] : codeMatch[1];
    }
  }

  // Detect "pesos" / "dollars" etc. in natural language
  const currencyWords: Record<string, string> = {
    'peso': 'PHP', 'pesos': 'PHP', 'php': 'PHP',
    'dollar': 'USD', 'dollars': 'USD', 'usd': 'USD',
    'euro': 'EUR', 'euros': 'EUR', 'eur': 'EUR',
    'pound': 'GBP', 'pounds': 'GBP', 'gbp': 'GBP',
    'yen': 'JPY', 'jpy': 'JPY',
    'rupee': 'INR', 'rupees': 'INR', 'inr': 'INR',
    'ringgit': 'MYR', 'myr': 'MYR',
    'baht': 'THB', 'thb': 'THB',
    'won': 'KRW', 'krw': 'KRW',
    'yuan': 'CNY', 'cny': 'CNY',
    'real': 'BRL', 'reais': 'BRL', 'brl': 'BRL',
  };

  for (const [word, code] of Object.entries(currencyWords)) {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    if (regex.test(cleanInput)) {
      currency = code;
      cleanInput = cleanInput.replace(regex, '').trim();
      break;
    }
  }

  const numMatch = cleanInput.match(/[\d,]+\.?\d*/);
  const amount = numMatch
    ? Math.round(parseFloat(numMatch[0].replace(/,/g, '')) * 100)
    : 0;

  return { amount, currency };
}

// ─── Date Formatting ──────────────────────────────────────────────────────────

export function formatDate(dateStr: string, fmt: string = 'MMM d, yyyy'): string {
  try {
    return format(parseISO(dateStr), fmt);
  } catch {
    return dateStr;
  }
}

export function formatRelativeDate(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return dateStr;
  }
}

export function formatDateForInput(dateStr?: string): string {
  const date = dateStr ? parseISO(dateStr) : new Date();
  return format(date, 'yyyy-MM-dd');
}

export function groupTransactionsByDate<T extends { transaction_date: string }>(
  transactions: T[]
): Record<string, T[]> {
  return transactions.reduce((groups, tx) => {
    const dateKey = tx.transaction_date.slice(0, 10);
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(tx);
    return groups;
  }, {} as Record<string, T[]>);
}

// ─── Transaction Helpers ──────────────────────────────────────────────────────

export function getTransactionColor(type: TransactionType): string {
  switch (type) {
    case 'income': return 'text-emerald-600 dark:text-emerald-400';
    case 'expense': return 'text-red-600 dark:text-red-400';
    case 'transfer': return 'text-blue-600 dark:text-blue-400';
  }
}

export function getTransactionSign(type: TransactionType): string {
  return type === 'income' ? '+' : type === 'expense' ? '-' : '→';
}

export function getAmountDisplay(amount: number, type: TransactionType, currency: string): string {
  const sign = getTransactionSign(type);
  const formatted = formatCurrency(Math.abs(amount), currency);
  return type === 'transfer' ? formatted : `${sign}${formatted}`;
}

// ─── Account Helpers ──────────────────────────────────────────────────────────

export const ACCOUNT_ICONS: Record<string, string> = {
  cash: '💵', checking: '🏦', savings: '🏧', credit: '💳',
  investment: '📈', loan: '📋', other: '💰',
};

export const ACCOUNT_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
];

// ─── Category Helpers ─────────────────────────────────────────────────────────

export const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Food & Drinks', icon: '🍔', color: '#f59e0b' },
  { name: 'Transportation', icon: '🚌', color: '#3b82f6' },
  { name: 'Shopping', icon: '🛍️', color: '#ec4899' },
  { name: 'Entertainment', icon: '🎬', color: '#8b5cf6' },
  { name: 'Health', icon: '💊', color: '#ef4444' },
  { name: 'Housing', icon: '🏠', color: '#06b6d4' },
  { name: 'Education', icon: '📚', color: '#84cc16' },
  { name: 'Utilities', icon: '⚡', color: '#f97316' },
  { name: 'Personal Care', icon: '💅', color: '#ec4899' },
  { name: 'Travel', icon: '✈️', color: '#6366f1' },
  { name: 'Gifts', icon: '🎁', color: '#10b981' },
  { name: 'Other', icon: '📦', color: '#94a3b8' },
];

export const DEFAULT_INCOME_CATEGORIES = [
  { name: 'Salary', icon: '💼', color: '#10b981' },
  { name: 'Freelance', icon: '💻', color: '#3b82f6' },
  { name: 'Business', icon: '🏢', color: '#8b5cf6' },
  { name: 'Investment', icon: '📈', color: '#f59e0b' },
  { name: 'Gift', icon: '🎁', color: '#ec4899' },
  { name: 'Rental', icon: '🏘️', color: '#06b6d4' },
  { name: 'Other Income', icon: '💰', color: '#84cc16' },
];

// AI category mapping for smart auto-categorization
export const AI_CATEGORY_MAP: Record<string, { category: string; type: TransactionType }> = {
  // Food
  coffee: { category: 'Food & Drinks', type: 'expense' },
  cafe: { category: 'Food & Drinks', type: 'expense' },
  restaurant: { category: 'Food & Drinks', type: 'expense' },
  lunch: { category: 'Food & Drinks', type: 'expense' },
  dinner: { category: 'Food & Drinks', type: 'expense' },
  breakfast: { category: 'Food & Drinks', type: 'expense' },
  food: { category: 'Food & Drinks', type: 'expense' },
  pizza: { category: 'Food & Drinks', type: 'expense' },
  burger: { category: 'Food & Drinks', type: 'expense' },
  snack: { category: 'Food & Drinks', type: 'expense' },
  grocery: { category: 'Food & Drinks', type: 'expense' },
  groceries: { category: 'Food & Drinks', type: 'expense' },
  milk: { category: 'Food & Drinks', type: 'expense' },
  drinks: { category: 'Food & Drinks', type: 'expense' },

  // Transportation
  bus: { category: 'Transportation', type: 'expense' },
  taxi: { category: 'Transportation', type: 'expense' },
  uber: { category: 'Transportation', type: 'expense' },
  grab: { category: 'Transportation', type: 'expense' },
  jeep: { category: 'Transportation', type: 'expense' },
  jeepney: { category: 'Transportation', type: 'expense' },
  mrt: { category: 'Transportation', type: 'expense' },
  lrt: { category: 'Transportation', type: 'expense' },
  train: { category: 'Transportation', type: 'expense' },
  subway: { category: 'Transportation', type: 'expense' },
  gas: { category: 'Transportation', type: 'expense' },
  fuel: { category: 'Transportation', type: 'expense' },
  parking: { category: 'Transportation', type: 'expense' },
  toll: { category: 'Transportation', type: 'expense' },
  fare: { category: 'Transportation', type: 'expense' },

  // Shopping
  shopping: { category: 'Shopping', type: 'expense' },
  clothes: { category: 'Shopping', type: 'expense' },
  shoes: { category: 'Shopping', type: 'expense' },
  mall: { category: 'Shopping', type: 'expense' },

  // Entertainment
  movie: { category: 'Entertainment', type: 'expense' },
  cinema: { category: 'Entertainment', type: 'expense' },
  netflix: { category: 'Entertainment', type: 'expense' },
  spotify: { category: 'Entertainment', type: 'expense' },
  game: { category: 'Entertainment', type: 'expense' },
  games: { category: 'Entertainment', type: 'expense' },

  // Health
  medicine: { category: 'Health', type: 'expense' },
  hospital: { category: 'Health', type: 'expense' },
  doctor: { category: 'Health', type: 'expense' },
  pharmacy: { category: 'Health', type: 'expense' },
  vitamins: { category: 'Health', type: 'expense' },
  gym: { category: 'Health', type: 'expense' },

  // Income
  salary: { category: 'Salary', type: 'income' },
  paycheck: { category: 'Salary', type: 'income' },
  freelance: { category: 'Freelance', type: 'income' },
  payment: { category: 'Freelance', type: 'income' },
  bonus: { category: 'Salary', type: 'income' },
  dividend: { category: 'Investment', type: 'income' },
  interest: { category: 'Investment', type: 'income' },
};

// ─── Number/Percentage Helpers ────────────────────────────────────────────────

export function formatPercent(value: number, decimals: number = 1): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

export function formatNumber(value: number, compact = false): string {
  if (compact) {
    if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toLocaleString('en-US');
}

// ─── Color Palette for Charts ─────────────────────────────────────────────────

export const CHART_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#a78bfa', '#34d399', '#60a5fa', '#fbbf24', '#f87171',
];

export function getChartColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length];
}

// ─── Misc Helpers ─────────────────────────────────────────────────────────────

export function generateId(): string {
  return crypto.randomUUID();
}

export function truncate(str: string, length: number = 30): string {
  return str.length > length ? `${str.slice(0, length)}…` : str;
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
