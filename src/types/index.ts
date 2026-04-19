// ────────────────────────────────────────────────────────────────────────────────
// CashDash.ai - Core TypeScript Types
// ────────────────────────────────────────────────────────────────────────────────

// ─── Supabase DB Types ────────────────────────────────────────────────────────

export type TransactionType = 'income' | 'expense' | 'transfer';
export type AccountType = 'cash' | 'checking' | 'savings' | 'credit' | 'investment' | 'loan' | 'other';
export type CategoryType = 'income' | 'expense' | 'transfer';
export type ScheduleType = 'manual' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
export type ThemeType = 'light' | 'dark' | 'system';
export type CurrencyPosition = 'before' | 'after';

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  default_currency: string;
  timezone: string;
  locale: string;
  date_format: string;
  number_format: string;
  first_day_of_week: number;
  theme: ThemeType;
  ai_enabled: boolean;
  ai_auto_categorize: boolean;
  ai_suggestions: boolean;
  weekly_budget: number | null;
  monthly_budget: number | null;
  created_at: string;
  updated_at: string;
  subscription_tier?: 'free' | 'pro' | 'family';
  lemonsqueezy_customer_id?: string;
  lemonsqueezy_subscription_id?: string;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  icon: string;
  color: string;
  currency: string;
  balance: number; // in cents
  initial_balance: number;
  display_order: number;
  is_hidden: boolean;
  is_archived: boolean;
  parent_id: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
  parent_id: string | null;
  display_order: number;
  is_hidden: boolean;
  children?: Category[];
  subcategories?: Category[];
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color: string;
  display_order: number;
  created_at: string;
}

export interface TagGroup {
  id: string;
  user_id: string;
  name: string;
  display_order: number;
  tags?: Tag[];
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  category_id: string | null;
  account_id: string;
  dest_account_id: string | null;
  amount: number; // in cents
  dest_amount: number | null;
  currency: string;
  description: string | null;
  note: string | null;
  transaction_date: string;
  latitude: number | null;
  longitude: number | null;
  is_ai_created: boolean;
  ai_confidence: number | null;
  created_at: string;
  updated_at: string;
  // Joined
  category?: Category;
  account?: Account;
  dest_account?: Account;
  tags?: Tag[];
  attachments?: TransactionAttachment[];
}

export interface TransactionAttachment {
  id: string;
  transaction_id: string;
  user_id: string;
  file_path: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
}

export interface TransactionTemplate {
  id: string;
  user_id: string;
  name: string;
  type: TransactionType;
  category_id: string | null;
  account_id: string | null;
  dest_account_id: string | null;
  amount: number | null;
  currency: string;
  description: string | null;
  schedule_type: ScheduleType;
  schedule_config: Record<string, unknown> | null;
  is_active: boolean;
  last_executed_at: string | null;
  next_execution_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExchangeRate {
  id: string;
  base_currency: string;
  target_currency: string;
  rate: number;
  source: string;
  fetched_at: string;
}

// ─── AI Types ────────────────────────────────────────────────────────────────

export interface ParsedTransaction {
  amount: number;
  currency: string;
  description: string;
  category_name: string;
  category_type: TransactionType;
  transaction_date: string;
  confidence: number;
  raw_text: string;
}

export interface AIParseResponse {
  message?: string;
  transactions: ParsedTransaction[];
  corrections: string[];
  suggestions: string[];
  raw_analysis: string;
}

export interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  parsed_transactions?: ParsedTransaction[];
  created_transactions?: Transaction[];
}

export interface AIConfig {
  provider: 'openai' | 'gemini' | 'ollama';
  model: string;
  base_url?: string;
  auto_categorize: boolean;
  auto_create_categories: boolean;
  show_suggestions: boolean;
  confidence_threshold: number;
}

// ─── Dashboard / Analytics Types ─────────────────────────────────────────────

export interface DashboardStats {
  total_balance: number;
  monthly_income: number;
  monthly_expenses: number;
  monthly_net: number;
  income_change_pct: number;
  expense_change_pct: number;
  transaction_count: number;
  top_expense_category: string | null;
  savings_rate: number;
}

export interface CategoryBreakdown {
  category_id: string;
  category_name: string;
  category_icon: string;
  category_color: string;
  total: number;
  percentage: number;
  count: number;
}

export interface MonthlyData {
  month: string; // "YYYY-MM"
  label: string; // "Jan 2025"
  income: number;
  expenses: number;
  net: number;
  transaction_count: number;
}

export interface DailySpending {
  date: string;
  amount: number;
  count: number;
}

export interface AccountBalance {
  account_id: string;
  account_name: string;
  account_type: AccountType;
  account_color: string;
  account_icon: string;
  balance: number;
  currency: string;
  change_amount: number;
  change_pct: number;
}

// ─── UI / Filter Types ────────────────────────────────────────────────────────

export interface TransactionFilters {
  type?: TransactionType | 'all';
  account_id?: string;
  category_id?: string;
  tag_ids?: string[];
  date_from?: string;
  date_to?: string;
  amount_min?: number;
  amount_max?: number;
  search?: string;
  currency?: string;
}

export interface SortConfig {
  field: 'transaction_date' | 'amount' | 'description' | 'created_at';
  direction: 'asc' | 'desc';
}

export interface PaginationConfig {
  page: number;
  per_page: number;
  total: number;
}

// ─── Currency Info ────────────────────────────────────────────────────────────

export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  position: CurrencyPosition;
  decimals: number;
  flag?: string;
}

// ─── Settings Types ───────────────────────────────────────────────────────────

export interface AppSettings {
  currency: string;
  theme: ThemeType;
  date_format: string;
  number_format: string;
  timezone: string;
  locale: string;
  first_day_of_week: number;
  ai_enabled: boolean;
  ai_provider: string;
  ai_model: string;
  ai_base_url: string;
  ai_auto_categorize: boolean;
  monthly_budget: number | null;
  weekly_budget: number | null;
  show_balance: boolean;
  compact_mode: boolean;
}

// ─── API Response Types ───────────────────────────────────────────────────────

export interface APIResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}

export interface ListResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

// ─── Form Types ───────────────────────────────────────────────────────────────

export interface TransactionFormData {
  type: TransactionType;
  amount: string;
  currency: string;
  description: string;
  note: string;
  category_id: string;
  account_id: string;
  dest_account_id: string;
  transaction_date: string;
  tag_ids: string[];
  attachment?: File | null;
}

export interface AccountFormData {
  name: string;
  type: AccountType;
  icon: string;
  color: string;
  currency: string;
  initial_balance: string;
  description: string;
  parent_id: string;
}

export interface CategoryFormData {
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
  parent_id: string;
}
