-- Migration: Add backtest_monthly_results table
-- Designed according to project.md section 8 & 290 and Supabase Postgres best practices

CREATE TABLE IF NOT EXISTS public.backtest_monthly_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backtest_id UUID NOT NULL REFERENCES public.backtests(id) ON DELETE CASCADE,
  year INTEGER NOT NULL CHECK (year >= 1970 AND year <= 2100),
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  trades INTEGER CHECK (trades >= 0),
  net_profit_percent NUMERIC(10, 4),
  net_profit_amount NUMERIC(15, 2),
  profit_factor NUMERIC(10, 4),
  win_rate_percent NUMERIC(10, 4),
  average_trade_percent NUMERIC(10, 4),
  max_drawdown_percent NUMERIC(10, 4),
  winning_trades INTEGER CHECK (winning_trades >= 0),
  losing_trades INTEGER CHECK (losing_trades >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (backtest_id, year, month)
);

CREATE INDEX IF NOT EXISTS idx_backtest_monthly_results_backtest_id 
  ON public.backtest_monthly_results(backtest_id);

CREATE INDEX IF NOT EXISTS idx_backtest_monthly_results_order 
  ON public.backtest_monthly_results(backtest_id, year DESC, month DESC);

-- Enable Row Level Security
ALTER TABLE public.backtest_monthly_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Authenticated users can view monthly results" ON public.backtest_monthly_results;
CREATE POLICY "Authenticated users can view monthly results"
  ON public.backtest_monthly_results FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Editors and Owners can insert monthly results" ON public.backtest_monthly_results;
CREATE POLICY "Editors and Owners can insert monthly results"
  ON public.backtest_monthly_results FOR INSERT
  TO authenticated
  WITH CHECK (public.is_editor_or_owner());

DROP POLICY IF EXISTS "Editors and Owners can update monthly results" ON public.backtest_monthly_results;
CREATE POLICY "Editors and Owners can update monthly results"
  ON public.backtest_monthly_results FOR UPDATE
  TO authenticated
  USING (public.is_editor_or_owner())
  WITH CHECK (public.is_editor_or_owner());

DROP POLICY IF EXISTS "Editors and Owners can delete monthly results" ON public.backtest_monthly_results;
CREATE POLICY "Editors and Owners can delete monthly results"
  ON public.backtest_monthly_results FOR DELETE
  TO authenticated
  USING (public.is_editor_or_owner());
