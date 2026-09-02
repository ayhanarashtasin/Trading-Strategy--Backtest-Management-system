--
CREATE INDEX IF NOT EXISTS idx_backtests_created_by ON public.backtests(created_by);
CREATE INDEX IF NOT EXISTS idx_backtests_updated_by ON public.backtests(updated_by);
CREATE INDEX IF NOT EXISTS idx_strategy_versions_created_by ON public.strategy_versions(created_by);
CREATE INDEX IF NOT EXISTS idx_strategy_versions_updated_by ON public.strategy_versions(updated_by);
CREATE INDEX IF NOT EXISTS idx_strategies_updated_by ON public.strategies(updated_by);
CREATE INDEX IF NOT EXISTS idx_research_notes_created_by ON public.research_notes(created_by);
CREATE INDEX IF NOT EXISTS idx_attachments_uploaded_by ON public.attachments(uploaded_by);