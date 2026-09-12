-- Migration: Widen ratio column precision in backtests
-- Allows storing high ratio calculations (e.g. Sortino ratio when downside deviation approaches zero)
-- ASVS 1.2.4: Strongly typed numeric precision

ALTER TABLE public.backtests
  ALTER COLUMN sortino_ratio TYPE NUMERIC(20, 4);

ALTER TABLE public.backtests
  ALTER COLUMN calmar_ratio TYPE NUMERIC(20, 4);

ALTER TABLE public.backtests
  ALTER COLUMN sharpe_ratio TYPE NUMERIC(20, 4);

ALTER TABLE public.backtests
  ALTER COLUMN recovery_factor TYPE NUMERIC(20, 4);
