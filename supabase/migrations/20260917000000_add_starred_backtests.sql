-- Migration: Add starred_backtests table
-- Supports starring / favoriting backtest runs with strategy details
-- ASVS 8.2.1, 8.3.1: Enforce RLS so users manage their own starred items

CREATE TABLE IF NOT EXISTS public.starred_backtests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  backtest_id UUID NOT NULL REFERENCES public.backtests(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_starred_backtests_user_backtest UNIQUE (user_id, backtest_id)
);

-- Index foreign keys and lookup queries (Rule: query-missing-indexes)
CREATE INDEX IF NOT EXISTS idx_starred_backtests_user_id 
  ON public.starred_backtests(user_id);

CREATE INDEX IF NOT EXISTS idx_starred_backtests_backtest_id 
  ON public.starred_backtests(backtest_id);

CREATE INDEX IF NOT EXISTS idx_starred_backtests_user_created 
  ON public.starred_backtests(user_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.starred_backtests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own starred backtests
DROP POLICY IF EXISTS "Users can view their own starred backtests" ON public.starred_backtests;
CREATE POLICY "Users can view their own starred backtests"
  ON public.starred_backtests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can star backtests for themselves
DROP POLICY IF EXISTS "Users can star backtests" ON public.starred_backtests;
CREATE POLICY "Users can star backtests"
  ON public.starred_backtests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can unstar backtests for themselves
DROP POLICY IF EXISTS "Users can unstar backtests" ON public.starred_backtests;
CREATE POLICY "Users can unstar backtests"
  ON public.starred_backtests FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
