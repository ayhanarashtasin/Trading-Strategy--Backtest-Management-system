-- Escanor Strategy Lab: Initial Schema Migration
-- Designed according to project.md requirements & Supabase Postgres best practices

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. PROFILES TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')) DEFAULT 'viewer',
  status TEXT NOT NULL CHECK (status IN ('active', 'disabled')) DEFAULT 'active',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- ==============================================================================
-- 2. SECURITY DEFINER HELPER FUNCTIONS
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid() AND status = 'active';
  RETURN COALESCE(user_role, 'viewer');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (public.get_auth_user_role() = 'owner');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_editor_or_owner()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (public.get_auth_user_role() IN ('owner', 'editor'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Trigger to automatically create profile when new auth.user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_count INTEGER;
  assigned_role TEXT;
BEGIN
  SELECT count(*) INTO user_count FROM public.profiles;
  -- If first user ever created, assign owner role; else default to viewer
  IF user_count = 0 THEN
    assigned_role := 'owner';
  ELSE
    assigned_role := COALESCE(NEW.raw_user_meta_data->>'role', 'viewer');
  END IF;

  INSERT INTO public.profiles (id, email, display_name, role, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    assigned_role,
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==============================================================================
-- 3. STRATEGIES TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  strategy_family TEXT NOT NULL,
  description TEXT,
  default_direction TEXT NOT NULL CHECK (default_direction IN ('Long', 'Short', 'Both')) DEFAULT 'Long',
  status TEXT NOT NULL CHECK (status IN (
    'Idea', 'Baseline', 'Experimental', 'Candidate', 'Validation',
    'OOS Passed', 'Paper Trading', 'Production Candidate', 'Live',
    'Rejected', 'Archived'
  )) DEFAULT 'Idea',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_strategies_family ON public.strategies(strategy_family);
CREATE INDEX IF NOT EXISTS idx_strategies_status ON public.strategies(status);
CREATE INDEX IF NOT EXISTS idx_strategies_created_by ON public.strategies(created_by);
CREATE INDEX IF NOT EXISTS idx_strategies_archived_at ON public.strategies(archived_at);

DROP TRIGGER IF EXISTS set_strategies_updated_at ON public.strategies;
CREATE TRIGGER set_strategies_updated_at
  BEFORE UPDATE ON public.strategies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==============================================================================
-- 4. TAGS & STRATEGY_TAGS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.strategy_tags (
  strategy_id UUID NOT NULL REFERENCES public.strategies(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (strategy_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_strategy_tags_tag_id ON public.strategy_tags(tag_id);

-- ==============================================================================
-- 5. STRATEGY_VERSIONS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.strategy_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id UUID NOT NULL REFERENCES public.strategies(id) ON DELETE CASCADE,
  version_name TEXT NOT NULL,
  version_number INTEGER NOT NULL DEFAULT 1,
  description TEXT,
  entry_rules TEXT,
  exit_rules TEXT,
  risk_rules TEXT,
  parameter_summary TEXT,
  parameters_json JSONB DEFAULT '{}'::jsonb,
  is_current BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_strategy_versions_strategy_id ON public.strategy_versions(strategy_id);
CREATE INDEX IF NOT EXISTS idx_strategy_versions_is_current ON public.strategy_versions(strategy_id, is_current);

DROP TRIGGER IF EXISTS set_strategy_versions_updated_at ON public.strategy_versions;
CREATE TRIGGER set_strategy_versions_updated_at
  BEFORE UPDATE ON public.strategy_versions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==============================================================================
-- 6. BACKTESTS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.backtests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_version_id UUID NOT NULL REFERENCES public.strategy_versions(id) ON DELETE CASCADE,
  
  -- Identification
  backtest_name TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('TradingView', 'Freqtrade', 'Python', 'Codex', 'Manual', 'Other')),
  test_type TEXT NOT NULL CHECK (test_type IN (
    'Development', 'Optimization', 'Prior Period', 'Out of Sample',
    'Walk Forward', 'Robustness', 'Monte Carlo', 'Paper Trading', 'Live', 'Other'
  )) DEFAULT 'Development',
  engine_version TEXT,
  status TEXT NOT NULL DEFAULT 'Candidate',

  -- Market Information
  exchange TEXT,
  market_type TEXT,
  symbol TEXT NOT NULL,
  base_asset TEXT,
  quote_asset TEXT,
  direction TEXT CHECK (direction IN ('Long', 'Short', 'Both')),
  timeframe TEXT NOT NULL,
  higher_timeframe TEXT,
  intrabar_timeframe TEXT,
  data_source TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- Execution Assumptions
  fee_per_side_percent NUMERIC(8, 4),
  slippage_per_side_percent NUMERIC(8, 4),
  starting_capital NUMERIC(15, 2),
  leverage NUMERIC(6, 2),
  position_size_percent NUMERIC(6, 2),
  compounding BOOLEAN,
  stop_loss_description TEXT,
  take_profit_description TEXT,
  trailing_stop_description TEXT,
  funding_included BOOLEAN,

  -- Required & Standard Performance Metrics (stored numerically)
  total_trades INTEGER,
  profit_factor NUMERIC(10, 4),
  net_profit_percent NUMERIC(10, 4),
  net_profit_amount NUMERIC(15, 2),
  max_drawdown_percent NUMERIC(10, 4),
  win_rate_percent NUMERIC(10, 4),
  average_trade_percent NUMERIC(10, 4),
  cagr_percent NUMERIC(10, 4),
  payoff_ratio NUMERIC(10, 4),
  expectancy_percent NUMERIC(10, 4),
  average_win_percent NUMERIC(10, 4),
  average_loss_percent NUMERIC(10, 4),
  largest_win_percent NUMERIC(10, 4),
  largest_loss_percent NUMERIC(10, 4),
  sharpe_ratio NUMERIC(10, 4),
  sortino_ratio NUMERIC(10, 4),
  calmar_ratio NUMERIC(10, 4),
  recovery_factor NUMERIC(10, 4),
  exposure_percent NUMERIC(10, 4),
  average_trade_duration TEXT,
  long_trades INTEGER,
  short_trades INTEGER,
  winning_trades INTEGER,
  losing_trades INTEGER,

  -- Backtest Integrity
  fees_included BOOLEAN DEFAULT false,
  slippage_included BOOLEAN DEFAULT false,
  intrabar_simulation BOOLEAN DEFAULT false,
  lookahead_checked BOOLEAN DEFAULT false,
  lookahead_bias_detected BOOLEAN DEFAULT false,
  data_gaps_checked BOOLEAN DEFAULT false,
  warmup_checked BOOLEAN DEFAULT false,
  liquidation_modeled BOOLEAN DEFAULT false,
  same_bar_execution_checked BOOLEAN DEFAULT false,
  oos_tested BOOLEAN DEFAULT false,
  walk_forward_tested BOOLEAN DEFAULT false,

  -- Technical Specification & Details
  details TEXT,

  -- Auditing
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);

-- Performance & Query Indexes (Supporting 10,000+ Backtests query speed)
CREATE INDEX IF NOT EXISTS idx_backtests_version_id ON public.backtests(strategy_version_id);
CREATE INDEX IF NOT EXISTS idx_backtests_symbol ON public.backtests(symbol);
CREATE INDEX IF NOT EXISTS idx_backtests_timeframe ON public.backtests(timeframe);
CREATE INDEX IF NOT EXISTS idx_backtests_source ON public.backtests(source);
CREATE INDEX IF NOT EXISTS idx_backtests_test_type ON public.backtests(test_type);
CREATE INDEX IF NOT EXISTS idx_backtests_created_at ON public.backtests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_backtests_archived_at ON public.backtests(archived_at);
CREATE INDEX IF NOT EXISTS idx_backtests_profit_factor ON public.backtests(profit_factor);
CREATE INDEX IF NOT EXISTS idx_backtests_max_drawdown ON public.backtests(max_drawdown_percent);
CREATE INDEX IF NOT EXISTS idx_backtests_net_profit ON public.backtests(net_profit_percent);
CREATE INDEX IF NOT EXISTS idx_backtests_dup_check ON public.backtests(strategy_version_id, source, symbol, timeframe, start_date, end_date, test_type);

DROP TRIGGER IF EXISTS set_backtests_updated_at ON public.backtests;
CREATE TRIGGER set_backtests_updated_at
  BEFORE UPDATE ON public.backtests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==============================================================================
-- 7. BACKTEST_YEARLY_RESULTS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.backtest_yearly_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backtest_id UUID NOT NULL REFERENCES public.backtests(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  trades INTEGER,
  net_profit_percent NUMERIC(10, 4),
  profit_factor NUMERIC(10, 4),
  win_rate_percent NUMERIC(10, 4),
  average_trade_percent NUMERIC(10, 4),
  max_drawdown_percent NUMERIC(10, 4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (backtest_id, year)
);

CREATE INDEX IF NOT EXISTS idx_backtest_yearly_results_backtest_id ON public.backtest_yearly_results(backtest_id);

-- ==============================================================================
-- 8. RESEARCH_NOTES TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.research_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('strategy', 'strategy_version', 'backtest')),
  entity_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_research_notes_entity ON public.research_notes(entity_type, entity_id);

DROP TRIGGER IF EXISTS set_research_notes_updated_at ON public.research_notes;
CREATE TRIGGER set_research_notes_updated_at
  BEFORE UPDATE ON public.research_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==============================================================================
-- 9. ATTACHMENTS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('strategy', 'strategy_version', 'backtest')),
  entity_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attachments_entity ON public.attachments(entity_type, entity_id);

-- ==============================================================================
-- 10. SAVED_VIEWS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.saved_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_shared BOOLEAN NOT NULL DEFAULT false,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_config JSONB NOT NULL DEFAULT '[]'::jsonb,
  column_visibility JSONB NOT NULL DEFAULT '{}'::jsonb,
  column_order JSONB NOT NULL DEFAULT '[]'::jsonb,
  column_pinning JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_views_user_id ON public.saved_views(user_id);

DROP TRIGGER IF EXISTS set_saved_views_updated_at ON public.saved_views;
CREATE TRIGGER set_saved_views_updated_at
  BEFORE UPDATE ON public.saved_views
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==============================================================================
-- 11. USER_TABLE_PREFERENCES TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.user_table_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  table_id TEXT NOT NULL DEFAULT 'backtests',
  column_visibility JSONB NOT NULL DEFAULT '{}'::jsonb,
  column_order JSONB NOT NULL DEFAULT '[]'::jsonb,
  column_pinning JSONB NOT NULL DEFAULT '{}'::jsonb,
  column_sizing JSONB NOT NULL DEFAULT '{}'::jsonb,
  page_size INTEGER NOT NULL DEFAULT 50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, table_id)
);

CREATE INDEX IF NOT EXISTS idx_user_table_preferences_lookup ON public.user_table_preferences(user_id, table_id);

DROP TRIGGER IF EXISTS set_user_table_preferences_updated_at ON public.user_table_preferences;
CREATE TRIGGER set_user_table_preferences_updated_at
  BEFORE UPDATE ON public.user_table_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==============================================================================
-- 12. ACTIVITY_LOGS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  before_data JSONB,
  after_data JSONB,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON public.activity_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);

-- ==============================================================================
-- 13. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategy_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategy_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backtests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backtest_yearly_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_table_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- PROFILES POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can view active profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view active profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR public.is_owner())
  WITH CHECK (auth.uid() = id OR public.is_owner());

DROP POLICY IF EXISTS "Owners can delete profiles" ON public.profiles;
CREATE POLICY "Owners can delete profiles"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (public.is_owner());

-- ------------------------------------------------------------------------------
-- STRATEGIES POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can view strategies" ON public.strategies;
CREATE POLICY "Authenticated users can view strategies"
  ON public.strategies FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Editors and Owners can insert strategies" ON public.strategies;
CREATE POLICY "Editors and Owners can insert strategies"
  ON public.strategies FOR INSERT
  TO authenticated
  WITH CHECK (public.is_editor_or_owner());

DROP POLICY IF EXISTS "Editors and Owners can update strategies" ON public.strategies;
CREATE POLICY "Editors and Owners can update strategies"
  ON public.strategies FOR UPDATE
  TO authenticated
  USING (public.is_editor_or_owner())
  WITH CHECK (public.is_editor_or_owner());

DROP POLICY IF EXISTS "Owners can delete strategies" ON public.strategies;
CREATE POLICY "Owners can delete strategies"
  ON public.strategies FOR DELETE
  TO authenticated
  USING (public.is_owner());

-- ------------------------------------------------------------------------------
-- TAGS & STRATEGY_TAGS POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can view tags" ON public.tags;
CREATE POLICY "Authenticated users can view tags"
  ON public.tags FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Editors and Owners can insert tags" ON public.tags;
CREATE POLICY "Editors and Owners can insert tags"
  ON public.tags FOR INSERT
  TO authenticated
  WITH CHECK (public.is_editor_or_owner());

DROP POLICY IF EXISTS "Authenticated users can view strategy_tags" ON public.strategy_tags;
CREATE POLICY "Authenticated users can view strategy_tags"
  ON public.strategy_tags FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Editors and Owners can insert strategy_tags" ON public.strategy_tags;
CREATE POLICY "Editors and Owners can insert strategy_tags"
  ON public.strategy_tags FOR INSERT
  TO authenticated
  WITH CHECK (public.is_editor_or_owner());

DROP POLICY IF EXISTS "Editors and Owners can delete strategy_tags" ON public.strategy_tags;
CREATE POLICY "Editors and Owners can delete strategy_tags"
  ON public.strategy_tags FOR DELETE
  TO authenticated
  USING (public.is_editor_or_owner());

-- ------------------------------------------------------------------------------
-- STRATEGY_VERSIONS POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can view strategy versions" ON public.strategy_versions;
CREATE POLICY "Authenticated users can view strategy versions"
  ON public.strategy_versions FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Editors and Owners can insert strategy versions" ON public.strategy_versions;
CREATE POLICY "Editors and Owners can insert strategy versions"
  ON public.strategy_versions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_editor_or_owner());

DROP POLICY IF EXISTS "Editors and Owners can update strategy versions" ON public.strategy_versions;
CREATE POLICY "Editors and Owners can update strategy versions"
  ON public.strategy_versions FOR UPDATE
  TO authenticated
  USING (public.is_editor_or_owner())
  WITH CHECK (public.is_editor_or_owner());

DROP POLICY IF EXISTS "Owners can delete strategy versions" ON public.strategy_versions;
CREATE POLICY "Owners can delete strategy versions"
  ON public.strategy_versions FOR DELETE
  TO authenticated
  USING (public.is_owner());

-- ------------------------------------------------------------------------------
-- BACKTESTS POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can view backtests" ON public.backtests;
CREATE POLICY "Authenticated users can view backtests"
  ON public.backtests FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Editors and Owners can insert backtests" ON public.backtests;
CREATE POLICY "Editors and Owners can insert backtests"
  ON public.backtests FOR INSERT
  TO authenticated
  WITH CHECK (public.is_editor_or_owner());

DROP POLICY IF EXISTS "Editors and Owners can update backtests" ON public.backtests;
CREATE POLICY "Editors and Owners can update backtests"
  ON public.backtests FOR UPDATE
  TO authenticated
  USING (public.is_editor_or_owner())
  WITH CHECK (public.is_editor_or_owner());

DROP POLICY IF EXISTS "Owners can delete backtests" ON public.backtests;
CREATE POLICY "Owners can delete backtests"
  ON public.backtests FOR DELETE
  TO authenticated
  USING (public.is_owner());

-- ------------------------------------------------------------------------------
-- BACKTEST_YEARLY_RESULTS POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can view yearly results" ON public.backtest_yearly_results;
CREATE POLICY "Authenticated users can view yearly results"
  ON public.backtest_yearly_results FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Editors and Owners can insert yearly results" ON public.backtest_yearly_results;
CREATE POLICY "Editors and Owners can insert yearly results"
  ON public.backtest_yearly_results FOR INSERT
  TO authenticated
  WITH CHECK (public.is_editor_or_owner());

DROP POLICY IF EXISTS "Editors and Owners can update yearly results" ON public.backtest_yearly_results;
CREATE POLICY "Editors and Owners can update yearly results"
  ON public.backtest_yearly_results FOR UPDATE
  TO authenticated
  USING (public.is_editor_or_owner())
  WITH CHECK (public.is_editor_or_owner());

DROP POLICY IF EXISTS "Owners can delete yearly results" ON public.backtest_yearly_results;
CREATE POLICY "Owners can delete yearly results"
  ON public.backtest_yearly_results FOR DELETE
  TO authenticated
  USING (public.is_owner());

-- ------------------------------------------------------------------------------
-- RESEARCH_NOTES POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can view notes" ON public.research_notes;
CREATE POLICY "Authenticated users can view notes"
  ON public.research_notes FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Editors and Owners can insert notes" ON public.research_notes;
CREATE POLICY "Editors and Owners can insert notes"
  ON public.research_notes FOR INSERT
  TO authenticated
  WITH CHECK (public.is_editor_or_owner());

DROP POLICY IF EXISTS "Author or Owner can update notes" ON public.research_notes;
CREATE POLICY "Author or Owner can update notes"
  ON public.research_notes FOR UPDATE
  TO authenticated
  USING ((created_by = auth.uid() AND public.is_editor_or_owner()) OR public.is_owner())
  WITH CHECK ((created_by = auth.uid() AND public.is_editor_or_owner()) OR public.is_owner());

DROP POLICY IF EXISTS "Author or Owner can delete notes" ON public.research_notes;
CREATE POLICY "Author or Owner can delete notes"
  ON public.research_notes FOR DELETE
  TO authenticated
  USING ((created_by = auth.uid() AND public.is_editor_or_owner()) OR public.is_owner());

-- ------------------------------------------------------------------------------
-- ATTACHMENTS POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can view attachments metadata" ON public.attachments;
CREATE POLICY "Authenticated users can view attachments metadata"
  ON public.attachments FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Editors and Owners can insert attachments" ON public.attachments;
CREATE POLICY "Editors and Owners can insert attachments"
  ON public.attachments FOR INSERT
  TO authenticated
  WITH CHECK (public.is_editor_or_owner());

DROP POLICY IF EXISTS "Author or Owner can delete attachments" ON public.attachments;
CREATE POLICY "Author or Owner can delete attachments"
  ON public.attachments FOR DELETE
  TO authenticated
  USING ((uploaded_by = auth.uid() AND public.is_editor_or_owner()) OR public.is_owner());

-- ------------------------------------------------------------------------------
-- SAVED_VIEWS POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own or shared saved views" ON public.saved_views;
CREATE POLICY "Users can view own or shared saved views"
  ON public.saved_views FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR is_shared = true);

DROP POLICY IF EXISTS "Users can insert saved views" ON public.saved_views;
CREATE POLICY "Users can insert saved views"
  ON public.saved_views FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own saved views" ON public.saved_views;
CREATE POLICY "Users can update own saved views"
  ON public.saved_views FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR (is_shared = true AND public.is_owner()))
  WITH CHECK (user_id = auth.uid() OR (is_shared = true AND public.is_owner()));

DROP POLICY IF EXISTS "Users can delete own saved views" ON public.saved_views;
CREATE POLICY "Users can delete own saved views"
  ON public.saved_views FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR (is_shared = true AND public.is_owner()));

-- ------------------------------------------------------------------------------
-- USER_TABLE_PREFERENCES POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users manage own table preferences" ON public.user_table_preferences;
CREATE POLICY "Users manage own table preferences"
  ON public.user_table_preferences FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ------------------------------------------------------------------------------
-- ACTIVITY_LOGS POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can view activity logs" ON public.activity_logs;
CREATE POLICY "Authenticated users can view activity logs"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert activity logs" ON public.activity_logs;
CREATE POLICY "Authenticated users can insert activity logs"
  ON public.activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Owners can delete activity logs" ON public.activity_logs;
CREATE POLICY "Owners can delete activity logs"
  ON public.activity_logs FOR DELETE
  TO authenticated
  USING (public.is_owner());

-- ==============================================================================
-- 14. STORAGE BUCKET CONFIGURATION
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS
DROP POLICY IF EXISTS "Authenticated users can view attachments in storage" ON storage.objects;
CREATE POLICY "Authenticated users can view attachments in storage"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'attachments');

DROP POLICY IF EXISTS "Editors and Owners can upload attachments to storage" ON storage.objects;
CREATE POLICY "Editors and Owners can upload attachments to storage"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'attachments' AND public.is_editor_or_owner());

DROP POLICY IF EXISTS "Author or Owner can delete attachments from storage" ON storage.objects;
CREATE POLICY "Author or Owner can delete attachments from storage"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'attachments' AND (owner = auth.uid() OR public.is_owner()));
