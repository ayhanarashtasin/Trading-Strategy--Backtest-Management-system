-- Migration: Add median_trade_percent and duration_days to backtests
-- ASVS 1.2.4, 8.2.1, 8.3.1: Strongly typed numeric and generated columns

-- 1. Add median_trade_percent (Numeric 10,4 to store percentages with high precision, NULL if not provided)
ALTER TABLE public.backtests
ADD COLUMN IF NOT EXISTS median_trade_percent NUMERIC(10, 4);

-- 2. Add duration_days (Generated integer column calculated as end_date - start_date)
ALTER TABLE public.backtests
ADD COLUMN IF NOT EXISTS duration_days INTEGER GENERATED ALWAYS AS (end_date - start_date) STORED;

-- 3. Create indexes for performance when sorting/filtering 10,000+ backtests
CREATE INDEX IF NOT EXISTS idx_backtests_median_trade_percent
  ON public.backtests(median_trade_percent DESC NULLS LAST)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_backtests_duration_days
  ON public.backtests(duration_days)
  WHERE archived_at IS NULL;
