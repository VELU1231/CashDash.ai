-- ════════════════════════════════════════════════════════════════════════════════
-- CashDash.ai — Complete Supabase SQL Schema (CLEAN RESET)
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard → SQL Editor
-- ════════════════════════════════════════════════════════════════════════════════

-- ─── 0. DROP everything (clean slate) ─────────────────────────────────────────

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS adjust_account_balance(UUID, BIGINT) CASCADE;

DROP TABLE IF EXISTS ai_chat_messages CASCADE;
DROP TABLE IF EXISTS transaction_attachments CASCADE;
DROP TABLE IF EXISTS transaction_tags CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS tag_groups CASCADE;
DROP TABLE IF EXISTS transaction_templates CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS exchange_rates CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- ─── 1. PROFILES ──────────────────────────────────────────────────────────────

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  default_currency TEXT NOT NULL DEFAULT 'USD',
  timezone TEXT NOT NULL DEFAULT 'UTC',
  locale TEXT NOT NULL DEFAULT 'en-US',
  date_format TEXT NOT NULL DEFAULT 'yyyy-MM-dd',
  number_format TEXT NOT NULL DEFAULT 'comma-dot',
  first_day_of_week INT NOT NULL DEFAULT 0,
  theme TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('light','dark','system')),
  ai_enabled BOOLEAN NOT NULL DEFAULT true,
  ai_auto_categorize BOOLEAN NOT NULL DEFAULT true,
  ai_suggestions BOOLEAN NOT NULL DEFAULT true,
  weekly_budget BIGINT,
  monthly_budget BIGINT,
  -- Subscription (LemonSqueezy)
  subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free','pro','family')),
  lemonsqueezy_customer_id TEXT,
  lemonsqueezy_subscription_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ─── 2. ACCOUNTS ──────────────────────────────────────────────────────────────

CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'cash' CHECK (type IN ('cash','checking','savings','credit','investment','loan','other')),
  icon TEXT NOT NULL DEFAULT '💰',
  color TEXT NOT NULL DEFAULT '#10b981',
  currency TEXT NOT NULL DEFAULT 'USD',
  balance BIGINT NOT NULL DEFAULT 0,
  initial_balance BIGINT NOT NULL DEFAULT 0,
  display_order INT NOT NULL DEFAULT 0,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  parent_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_accounts_user ON accounts(user_id);

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own accounts"
  ON accounts FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own accounts"
  ON accounts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own accounts"
  ON accounts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own accounts"
  ON accounts FOR DELETE USING (auth.uid() = user_id);

-- ─── 3. CATEGORIES ────────────────────────────────────────────────────────────

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'expense' CHECK (type IN ('income','expense','transfer')),
  icon TEXT NOT NULL DEFAULT '📦',  -- stores any emoji or icon name
  color TEXT NOT NULL DEFAULT '#94a3b8',
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  display_order INT NOT NULL DEFAULT 0,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_categories_user ON categories(user_id);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own categories"
  ON categories FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own categories"
  ON categories FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories"
  ON categories FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories"
  ON categories FOR DELETE USING (auth.uid() = user_id);

-- ─── 4. TRANSACTIONS ─────────────────────────────────────────────────────────

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income','expense','transfer')),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  dest_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  amount BIGINT NOT NULL DEFAULT 0,  -- in cents
  dest_amount BIGINT,
  currency TEXT NOT NULL DEFAULT 'USD',
  description TEXT,
  note TEXT,
  emoji TEXT,  -- optional emoji for this transaction
  transaction_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_ai_created BOOLEAN NOT NULL DEFAULT false,
  ai_confidence REAL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(user_id, transaction_date DESC);
CREATE INDEX idx_transactions_type ON transactions(user_id, type);
CREATE INDEX idx_transactions_account ON transactions(account_id);
CREATE INDEX idx_transactions_category ON transactions(category_id);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
  ON transactions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions"
  ON transactions FOR DELETE USING (auth.uid() = user_id);

-- ─── 5. TRANSACTION TEMPLATES ─────────────────────────────────────────────────

CREATE TABLE transaction_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income','expense','transfer')),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  dest_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  amount BIGINT,
  currency TEXT NOT NULL DEFAULT 'USD',
  description TEXT,
  schedule_type TEXT NOT NULL DEFAULT 'manual' CHECK (schedule_type IN ('manual','daily','weekly','biweekly','monthly','quarterly','yearly')),
  schedule_config JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_executed_at TIMESTAMPTZ,
  next_execution_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_templates_user ON transaction_templates(user_id);

ALTER TABLE transaction_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own templates"
  ON transaction_templates FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own templates"
  ON transaction_templates FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates"
  ON transaction_templates FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates"
  ON transaction_templates FOR DELETE USING (auth.uid() = user_id);

-- ─── 6. TAGS ──────────────────────────────────────────────────────────────────

CREATE TABLE tag_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE tag_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tag_groups"
  ON tag_groups FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tag_groups"
  ON tag_groups FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tag_groups"
  ON tag_groups FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own tag_groups"
  ON tag_groups FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  group_id UUID REFERENCES tag_groups(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tags"
  ON tags FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tags"
  ON tags FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tags"
  ON tags FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own tags"
  ON tags FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE transaction_tags (
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (transaction_id, tag_id)
);

ALTER TABLE transaction_tags ENABLE ROW LEVEL SECURITY;

-- For junction table, validate via the transaction's user_id
CREATE POLICY "Users can view own transaction_tags"
  ON transaction_tags FOR SELECT
  USING (EXISTS (SELECT 1 FROM transactions WHERE id = transaction_id AND user_id = auth.uid()));

CREATE POLICY "Users can insert own transaction_tags"
  ON transaction_tags FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM transactions WHERE id = transaction_id AND user_id = auth.uid()));

CREATE POLICY "Users can delete own transaction_tags"
  ON transaction_tags FOR DELETE
  USING (EXISTS (SELECT 1 FROM transactions WHERE id = transaction_id AND user_id = auth.uid()));

-- ─── 7. TRANSACTION ATTACHMENTS ───────────────────────────────────────────────

CREATE TABLE transaction_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL DEFAULT 'attachment',
  file_size BIGINT,
  mime_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE transaction_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own attachments"
  ON transaction_attachments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own attachments"
  ON transaction_attachments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own attachments"
  ON transaction_attachments FOR DELETE USING (auth.uid() = user_id);

-- ─── 8. AI CHAT MESSAGES ─────────────────────────────────────────────────────

CREATE TABLE ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  parsed_transactions JSONB,
  created_transactions JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_chat_user ON ai_chat_messages(user_id, created_at DESC);

ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chat messages"
  ON ai_chat_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own chat messages"
  ON ai_chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own chat messages"
  ON ai_chat_messages FOR DELETE USING (auth.uid() = user_id);

-- ─── 9. EXCHANGE RATES (public read) ─────────────────────────────────────────

CREATE TABLE exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency TEXT NOT NULL,
  target_currency TEXT NOT NULL,
  rate DOUBLE PRECISION NOT NULL,
  source TEXT DEFAULT 'api',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(base_currency, target_currency)
);

ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

-- Exchange rates are readable by anyone authenticated
CREATE POLICY "Authenticated users can read exchange rates"
  ON exchange_rates FOR SELECT USING (auth.role() = 'authenticated');

-- ─── 10. FUNCTIONS ────────────────────────────────────────────────────────────

-- Atomic balance adjustment for accounts
CREATE OR REPLACE FUNCTION adjust_account_balance(p_account_id UUID, p_delta BIGINT)
RETURNS VOID AS $$
BEGIN
  UPDATE accounts
  SET balance = balance + p_delta,
      updated_at = now()
  WHERE id = p_account_id
    AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 11. NEW USER TRIGGER ────────────────────────────────────────────────────
-- Auto-creates profile + default account + default categories on signup

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_user_id UUID := NEW.id;
  user_email TEXT := COALESCE(NEW.email, '');
  display TEXT;
BEGIN
  -- Extract display name from email
  display := split_part(user_email, '@', 1);
  IF display = '' THEN display := 'User'; END IF;

  -- Create profile (new users start on free tier)
  INSERT INTO profiles (id, display_name, default_currency, subscription_tier)
  VALUES (new_user_id, display, 'USD', 'free')
  ON CONFLICT (id) DO NOTHING;

  -- Create default "Cash" account
  INSERT INTO accounts (user_id, name, type, icon, color, currency, balance, initial_balance, display_order)
  VALUES (new_user_id, 'Cash', 'cash', '💵', '#10b981', 'USD', 0, 0, 0);

  -- Create default expense categories
  INSERT INTO categories (user_id, name, type, icon, color, display_order) VALUES
    (new_user_id, 'Food & Drinks',    'expense', '🍔', '#f59e0b', 1),
    (new_user_id, 'Transportation',   'expense', '🚌', '#3b82f6', 2),
    (new_user_id, 'Shopping',         'expense', '🛍️', '#ec4899', 3),
    (new_user_id, 'Entertainment',    'expense', '🎬', '#8b5cf6', 4),
    (new_user_id, 'Health',           'expense', '💊', '#ef4444', 5),
    (new_user_id, 'Housing',          'expense', '🏠', '#06b6d4', 6),
    (new_user_id, 'Education',        'expense', '📚', '#84cc16', 7),
    (new_user_id, 'Utilities',        'expense', '⚡', '#f97316', 8),
    (new_user_id, 'Personal Care',    'expense', '💅', '#ec4899', 9),
    (new_user_id, 'Travel',           'expense', '✈️', '#6366f1', 10),
    (new_user_id, 'Gifts',            'expense', '🎁', '#10b981', 11),
    (new_user_id, 'Other',            'expense', '📦', '#94a3b8', 12);

  -- Create default income categories
  INSERT INTO categories (user_id, name, type, icon, color, display_order) VALUES
    (new_user_id, 'Salary',       'income', '💼', '#10b981', 1),
    (new_user_id, 'Freelance',    'income', '💻', '#3b82f6', 2),
    (new_user_id, 'Business',     'income', '🏢', '#8b5cf6', 3),
    (new_user_id, 'Investment',   'income', '📈', '#f59e0b', 4),
    (new_user_id, 'Gift',         'income', '🎁', '#ec4899', 5),
    (new_user_id, 'Rental',       'income', '🏘️', '#06b6d4', 6),
    (new_user_id, 'Other Income', 'income', '💰', '#84cc16', 7);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── 12. STORAGE BUCKET FOR ATTACHMENTS ──────────────────────────────────────
-- Run this separately if you want receipt upload support:
--
-- INSERT INTO storage.buckets (id, name, public) VALUES ('attachments', 'attachments', false);
--
-- CREATE POLICY "Users can upload own attachments"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
--
-- CREATE POLICY "Users can view own attachments"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
--
-- CREATE POLICY "Users can delete own attachments"
--   ON storage.objects FOR DELETE
--   USING (bucket_id = 'attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ════════════════════════════════════════════════════════════════════════════════
-- DONE! All tables created with RLS policies.
-- New users get: profile (tier=free) + Cash account + 19 categories
-- ════════════════════════════════════════════════════════════════════════════════

-- ─── ADMIN: Set velu2k03@gmail.com to family tier ────────────────────────────
-- Run this AFTER a user with this email has signed up:
-- UPDATE profiles SET subscription_tier = 'family'
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'velu2k03@gmail.com');
