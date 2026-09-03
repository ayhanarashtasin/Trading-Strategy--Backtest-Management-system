-- Escanor Strategy Lab: Index strategies.created_at for date-wise tracking & sorting
-- Supabase Postgres Best Practices: support fast date-ordered pagination on strategies

CREATE INDEX IF NOT EXISTS idx_strategies_created_at ON public.strategies(created_at DESC);
