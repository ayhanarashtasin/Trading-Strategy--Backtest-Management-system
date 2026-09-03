-- Migration: Add 'AggTrades' to backtests source check constraint
ALTER TABLE public.backtests DROP CONSTRAINT IF EXISTS backtests_source_check;
ALTER TABLE public.backtests ADD CONSTRAINT backtests_source_check 
  CHECK (source IN ('TradingView', 'Freqtrade', 'Python', 'Codex', 'Manual', 'Other', 'AggTrades'));
