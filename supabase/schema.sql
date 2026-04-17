-- ============================================================
-- CashDash.ai — Supabase PostgreSQL Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- ─── PROFILES (extends auth.users) ──────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  default_currency TEXT DEFAULT 'USD',
  timezone TEXT DEFAULT 'UTC',
  locale TEXT DEFAULT 'en',
  date_format TEXT DEFAULT 'YYYY-MM-DD',
  number_format TEXT DEFAULT 'en-US',
  first_day_of_week INT DEFAULT 0,
  theme TEXT DEFAULT 'system',
  ai_enabled BOOLEAN DEFAULT true,
  ai_auto_categorize BOOLEAN DEFAULT true,
  ai_suggestions BOOLEAN DEFAULT true,
  weekly_budget BIGINT,
  monthly_budget BIGINT,
  show_balance BOOLEAN DEFAULT true,
  compact_mode BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── ACCOUNTS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'cash' CHECK (type IN ('cash','checking','savings','credit','investment','loan','other')),
  icon TEXT DEFAULT '💰',
  color TEXT DEFAULT '#10b981',
  currency TEXT DEFAULT 'USD',
  balance BIGINT DEFAULT 0,
  initial_balance BIGINT DEFAULT 0,
  display_order INT DEFAULT 0,
  is_hidden BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  parent_id UUID REFERENCES public.accounts(id),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── CATEGORIES (two-level hierarchy) ───────────────────────
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income','expense','transfer')),
  icon TEXT DEFAULT '📁',
  color TEXT DEFAULT '#6366f1',
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  display_order INT DEFAULT 0,
  is_hidden BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── TRANSACTIONS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income','expense','transfer')),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  dest_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  amount BIGINT NOT NULL CHECK (amount >= 0),
  dest_amount BIGINT,
  currency TEXT DEFAULT 'USD',
  description TEXT,
  note TEXT,
  transaction_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_ai_created BOOLEAN DEFAULT false,
  ai_confidence DECIMAL(4,3),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── TAGS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── TAG GROUPS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tag_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── TRANSACTION-TAG JUNCTION ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transaction_tags (
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (transaction_id, tag_id)
);

-- ─── TAG-GROUP MEMBERS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tag_group_members (
  tag_group_id UUID NOT NULL REFERENCES public.tag_groups(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (tag_group_id, tag_id)
);

-- ─── TRANSACTION TEMPLATES ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transaction_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income','expense','transfer')),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  dest_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  amount BIGINT,
  currency TEXT DEFAULT 'USD',
  description TEXT,
  schedule_type TEXT DEFAULT 'manual' CHECK (schedule_type IN ('manual','daily','weekly','biweekly','monthly','quarterly','yearly')),
  schedule_config JSONB,
  is_active BOOLEAN DEFAULT true,
  last_executed_at TIMESTAMPTZ,
  next_execution_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── TRANSACTION ATTACHMENTS ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transaction_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INT,
  mime_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── EXCHANGE RATES CACHE ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency TEXT NOT NULL,
  target_currency TEXT NOT NULL,
  rate DECIMAL(20,10) NOT NULL,
  source TEXT DEFAULT 'ecb',
  fetched_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(base_currency, target_currency, source)
);

-- ─── ENABLE ROW LEVEL SECURITY ────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tag_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tag_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_attachments ENABLE ROW LEVEL SECURITY;

-- ─── RLS POLICIES ─────────────────────────────────────────────
CREATE POLICY "Users own their profile" ON public.profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users own their accounts" ON public.accounts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their categories" ON public.categories FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their transactions" ON public.transactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their tags" ON public.tags FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their tag groups" ON public.tag_groups FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their tx tags" ON public.transaction_tags FOR ALL
  USING (EXISTS (SELECT 1 FROM public.transactions t WHERE t.id = transaction_id AND t.user_id = auth.uid()));
CREATE POLICY "Users own their tag group members" ON public.tag_group_members FOR ALL
  USING (EXISTS (SELECT 1 FROM public.tag_groups g WHERE g.id = tag_group_id AND g.user_id = auth.uid()));
CREATE POLICY "Users own their templates" ON public.transaction_templates FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their attachments" ON public.transaction_attachments FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Exchange rates are public" ON public.exchange_rates FOR SELECT USING (true);

-- ─── INDEXES ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_type ON public.transactions(user_id, type);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON public.transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_accounts_user ON public.accounts(user_id, display_order);
CREATE INDEX IF NOT EXISTS idx_categories_user ON public.categories(user_id, type);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON public.categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_tags_user ON public.tags(user_id);
CREATE INDEX IF NOT EXISTS idx_exchange_rates ON public.exchange_rates(base_currency, target_currency);

-- ─── AUTO-CREATE PROFILE ON SIGNUP ───────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Create default accounts
  INSERT INTO public.accounts (user_id, name, type, icon, color, currency, balance, display_order)
  VALUES
    (NEW.id, 'Cash', 'cash', '💵', '#10b981', 'USD', 0, 1),
    (NEW.id, 'Bank Account', 'checking', '🏦', '#3b82f6', 'USD', 0, 2);

  -- Create default expense categories
  INSERT INTO public.categories (user_id, name, type, icon, color, display_order)
  VALUES
    (NEW.id, 'Food & Drinks', 'expense', '🍔', '#f59e0b', 1),
    (NEW.id, 'Transportation', 'expense', '🚌', '#3b82f6', 2),
    (NEW.id, 'Shopping', 'expense', '🛍️', '#ec4899', 3),
    (NEW.id, 'Entertainment', 'expense', '🎬', '#8b5cf6', 4),
    (NEW.id, 'Health', 'expense', '💊', '#ef4444', 5),
    (NEW.id, 'Housing', 'expense', '🏠', '#06b6d4', 6),
    (NEW.id, 'Education', 'expense', '📚', '#84cc16', 7),
    (NEW.id, 'Utilities', 'expense', '⚡', '#f97316', 8),
    (NEW.id, 'Other', 'expense', '📦', '#94a3b8', 9),
    -- Income categories
    (NEW.id, 'Salary', 'income', '💼', '#10b981', 1),
    (NEW.id, 'Freelance', 'income', '💻', '#3b82f6', 2),
    (NEW.id, 'Investment', 'income', '📈', '#f59e0b', 3),
    (NEW.id, 'Other Income', 'income', '💰', '#84cc16', 4);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── HELPER FUNCTIONS ─────────────────────────────────────────

-- Update account balance atomically
CREATE OR REPLACE FUNCTION public.adjust_account_balance(p_account_id UUID, p_delta BIGINT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.accounts
  SET balance = balance + p_delta, updated_at = now()
  WHERE id = p_account_id;
END;
$$;

-- Get monthly stats for a user
CREATE OR REPLACE FUNCTION public.get_monthly_stats(
  p_user_id UUID,
  p_year INT,
  p_month INT
)
RETURNS TABLE(
  total_income BIGINT,
  total_expenses BIGINT,
  total_net BIGINT,
  transaction_count INT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0)::BIGINT,
    COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)::BIGINT,
    COALESCE(SUM(CASE WHEN type = 'income' THEN amount WHEN type = 'expense' THEN -amount ELSE 0 END), 0)::BIGINT,
    COUNT(*)::INT
  FROM public.transactions
  WHERE user_id = p_user_id
    AND EXTRACT(YEAR FROM transaction_date) = p_year
    AND EXTRACT(MONTH FROM transaction_date) = p_month;
END;
$$;

-- ─── SUPABASE STORAGE BUCKETS ─────────────────────────────────
-- Run these separately in Supabase Storage settings or SQL:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('attachments', 'attachments', false);
-- CREATE POLICY "Users can upload their attachments" ON storage.objects FOR INSERT WITH CHECK (auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "Users can view their attachments" ON storage.objects FOR SELECT USING (auth.uid()::text = (storage.foldername(name))[1]);
