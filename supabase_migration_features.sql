-- ============================================================
-- CashBash.ai — New Feature Tables Migration
-- Run this in your Supabase SQL Editor
-- ============================================================

-- ─── 1. BUDGETS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.budgets (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id     UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  amount          BIGINT NOT NULL DEFAULT 0,       -- stored in cents
  currency        TEXT NOT NULL DEFAULT 'PHP',
  period          TEXT NOT NULL DEFAULT 'monthly'  -- weekly, monthly, quarterly, yearly
                  CHECK (period IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  icon            TEXT NOT NULL DEFAULT '📊',
  color           TEXT NOT NULL DEFAULT '#3b82f6',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own budgets" ON public.budgets
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON public.budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_category_id ON public.budgets(category_id);

-- ─── 2. BILLS (Recurring) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bills (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id     UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  account_id      UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  amount_min      BIGINT NOT NULL DEFAULT 0,       -- stored in cents (fixed or min of range)
  amount_max      BIGINT NOT NULL DEFAULT 0,       -- stored in cents (max of range, same as min if fixed)
  currency        TEXT NOT NULL DEFAULT 'PHP',
  frequency       TEXT NOT NULL DEFAULT 'monthly'
                  CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
  icon            TEXT NOT NULL DEFAULT '📄',
  color           TEXT NOT NULL DEFAULT '#f59e0b',
  due_day         SMALLINT CHECK (due_day BETWEEN 1 AND 31),  -- day of month
  next_due_date   DATE,
  last_paid_date  DATE,
  is_auto_pay     BOOLEAN NOT NULL DEFAULT false,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own bills" ON public.bills
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_bills_user_id ON public.bills(user_id);
CREATE INDEX IF NOT EXISTS idx_bills_next_due ON public.bills(next_due_date);

-- ─── 3. PIGGY BANKS (Savings Goals) ────────────────────────
CREATE TABLE IF NOT EXISTS public.piggy_banks (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  account_id      UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  target_amount   BIGINT NOT NULL DEFAULT 0,       -- stored in cents
  current_amount  BIGINT NOT NULL DEFAULT 0,       -- stored in cents
  currency        TEXT NOT NULL DEFAULT 'PHP',
  icon            TEXT NOT NULL DEFAULT '🐷',
  color           TEXT NOT NULL DEFAULT '#ec4899',
  target_date     DATE,
  is_completed    BOOLEAN NOT NULL DEFAULT false,
  notes           TEXT,
  display_order   SMALLINT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.piggy_banks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own piggy banks" ON public.piggy_banks
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_piggy_banks_user_id ON public.piggy_banks(user_id);

-- ─── 4. Auto-update updated_at triggers ─────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_budgets_updated_at ON public.budgets;
CREATE TRIGGER update_budgets_updated_at
  BEFORE UPDATE ON public.budgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bills_updated_at ON public.bills;
CREATE TRIGGER update_bills_updated_at
  BEFORE UPDATE ON public.bills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_piggy_banks_updated_at ON public.piggy_banks;
CREATE TRIGGER update_piggy_banks_updated_at
  BEFORE UPDATE ON public.piggy_banks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Done ────────────────────────────────────────────────────
-- Verify all 3 tables created:
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('budgets', 'bills', 'piggy_banks');
