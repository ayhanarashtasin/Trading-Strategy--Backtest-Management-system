-- Consolidated, RLS-aware read models for latency-sensitive pages.
-- ASVS 1.2.4, 8.2.1, 8.3.1: parameters remain typed, the caller's role is
-- preserved, and the existing table RLS policies remain the authorization
-- boundary.

CREATE OR REPLACE FUNCTION public.get_strategy_detail(p_strategy_id UUID)
RETURNS JSONB
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'strategy', (
      SELECT to_jsonb(s) || jsonb_build_object(
        'creator', CASE
          WHEN creator.id IS NULL THEN NULL
          ELSE jsonb_build_object(
            'display_name', creator.display_name,
            'email', creator.email
          )
        END,
        'updater', CASE
          WHEN updater.id IS NULL THEN NULL
          ELSE jsonb_build_object(
            'display_name', updater.display_name,
            'email', updater.email
          )
        END
      )
      FROM public.strategies AS s
      LEFT JOIN public.profiles AS creator ON creator.id = s.created_by
      LEFT JOIN public.profiles AS updater ON updater.id = s.updated_by
      WHERE s.id = p_strategy_id
    ),
    'versions', COALESCE((
      SELECT jsonb_agg(
        to_jsonb(v) || jsonb_build_object(
          'creator', CASE
            WHEN creator.id IS NULL THEN NULL
            ELSE jsonb_build_object('display_name', creator.display_name)
          END
        )
        ORDER BY v.version_number DESC
      )
      FROM public.strategy_versions AS v
      LEFT JOIN public.profiles AS creator ON creator.id = v.created_by
      WHERE v.strategy_id = p_strategy_id
    ), '[]'::jsonb),
    'tags', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', t.id,
          'name', t.name,
          'created_at', t.created_at
        )
        ORDER BY t.name
      )
      FROM public.strategy_tags AS st
      JOIN public.tags AS t ON t.id = st.tag_id
      WHERE st.strategy_id = p_strategy_id
    ), '[]'::jsonb),
    'backtests', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', b.id,
          'backtest_name', b.backtest_name,
          'symbol', b.symbol,
          'timeframe', b.timeframe,
          'source', b.source,
          'total_trades', b.total_trades,
          'profit_factor', b.profit_factor,
          'net_profit_percent', b.net_profit_percent,
          'max_drawdown_percent', b.max_drawdown_percent,
          'win_rate_percent', b.win_rate_percent,
          'created_at', b.created_at,
          'version', jsonb_build_object(
            'version_name', v.version_name,
            'strategy_id', v.strategy_id
          )
        )
        ORDER BY b.created_at DESC
      )
      FROM public.backtests AS b
      JOIN public.strategy_versions AS v ON v.id = b.strategy_version_id
      WHERE v.strategy_id = p_strategy_id
        AND b.archived_at IS NULL
    ), '[]'::jsonb),
    'activityLogs', COALESCE((
      SELECT jsonb_agg(activity_row.payload ORDER BY activity_row.created_at DESC)
      FROM (
        SELECT
          a.created_at,
          jsonb_build_object(
            'id', a.id,
            'user_id', a.user_id,
            'action', a.action,
            'entity_type', a.entity_type,
            'entity_id', a.entity_id,
            'description', a.description,
            'created_at', a.created_at,
            'user', CASE
              WHEN p.id IS NULL THEN NULL
              ELSE jsonb_build_object('display_name', p.display_name)
            END
          ) AS payload
        FROM public.activity_logs AS a
        LEFT JOIN public.profiles AS p ON p.id = a.user_id
        WHERE a.entity_id = p_strategy_id
        ORDER BY a.created_at DESC
        LIMIT 20
      ) AS activity_row
    ), '[]'::jsonb)
  );
$$;

CREATE OR REPLACE FUNCTION public.get_dashboard_snapshot()
RETURNS JSONB
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'stats', jsonb_build_object(
      'totalStrategies', (
        SELECT count(*) FROM public.strategies WHERE archived_at IS NULL
      ),
      'totalVersions', (
        SELECT count(*) FROM public.strategy_versions WHERE archived_at IS NULL
      ),
      'totalBacktests', (
        SELECT count(*) FROM public.backtests WHERE archived_at IS NULL
      ),
      'candidatesCount', (
        SELECT count(*) FROM public.strategies
        WHERE status = 'Candidate' AND archived_at IS NULL
      ),
      'validatedCount', (
        SELECT count(*) FROM public.strategies
        WHERE status IN ('Validation', 'OOS Passed', 'Production Candidate', 'Live')
          AND archived_at IS NULL
      ),
      'rejectedCount', (
        SELECT count(*) FROM public.strategies
        WHERE status = 'Rejected' AND archived_at IS NULL
      )
    ),
    'recentBacktests', COALESCE((
      SELECT jsonb_agg(to_jsonb(recent_backtests) ORDER BY created_at DESC)
      FROM (
        SELECT
          id, backtest_name, symbol, timeframe, source, profit_factor,
          net_profit_percent, win_rate_percent, max_drawdown_percent,
          total_trades, created_at, status
        FROM public.backtests
        WHERE archived_at IS NULL
        ORDER BY created_at DESC
        LIMIT 5
      ) AS recent_backtests
    ), '[]'::jsonb),
    'recentStrategies', COALESCE((
      SELECT jsonb_agg(to_jsonb(recent_strategies) ORDER BY created_at DESC)
      FROM (
        SELECT id, name, strategy_family, default_direction, status, created_at
        FROM public.strategies
        WHERE archived_at IS NULL
        ORDER BY created_at DESC
        LIMIT 5
      ) AS recent_strategies
    ), '[]'::jsonb),
    'needingValidation', COALESCE((
      SELECT jsonb_agg(to_jsonb(needs_validation) ORDER BY profit_factor DESC NULLS LAST)
      FROM (
        SELECT
          id, backtest_name, symbol, timeframe, source, profit_factor,
          net_profit_percent, created_at
        FROM public.backtests
        WHERE archived_at IS NULL AND oos_tested = false
        ORDER BY profit_factor DESC NULLS LAST
        LIMIT 5
      ) AS needs_validation
    ), '[]'::jsonb),
    'recentActivity', COALESCE((
      SELECT jsonb_agg(activity_row.payload ORDER BY activity_row.created_at DESC)
      FROM (
        SELECT
          a.created_at,
          jsonb_build_object(
            'id', a.id,
            'action', a.action,
            'entity_type', a.entity_type,
            'entity_id', a.entity_id,
            'description', a.description,
            'created_at', a.created_at,
            'user', CASE
              WHEN p.id IS NULL THEN NULL
              ELSE jsonb_build_object('display_name', p.display_name)
            END
          ) AS payload
        FROM public.activity_logs AS a
        LEFT JOIN public.profiles AS p ON p.id = a.user_id
        ORDER BY a.created_at DESC
        LIMIT 6
      ) AS activity_row
    ), '[]'::jsonb)
  );
$$;

REVOKE ALL ON FUNCTION public.get_strategy_detail(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_dashboard_snapshot() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_strategy_detail(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_snapshot() TO authenticated;

-- Partial/composite indexes match the read-model filters and sort order.
CREATE INDEX IF NOT EXISTS idx_strategies_active_created_at
  ON public.strategies(created_at DESC)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_strategies_active_status
  ON public.strategies(status)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_backtests_active_created_at
  ON public.backtests(created_at DESC)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_backtests_active_version_created_at
  ON public.backtests(strategy_version_id, created_at DESC)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_backtests_unvalidated_profit_factor
  ON public.backtests(profit_factor DESC NULLS LAST)
  WHERE archived_at IS NULL AND oos_tested = false;
