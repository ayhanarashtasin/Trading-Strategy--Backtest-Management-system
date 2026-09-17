-- Migration: Optimize get_strategy_detail read model to prevent statement timeouts
-- and Vercel serverless payload overflow when a strategy has thousands of versions/backtests.

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
        END,
        'versions_count', (
          SELECT count(*)::int
          FROM public.strategy_versions AS v
          WHERE v.strategy_id = p_strategy_id
        ),
        'backtests_count', (
          SELECT count(*)::int
          FROM public.backtests AS b
          JOIN public.strategy_versions AS v ON v.id = b.strategy_version_id
          WHERE v.strategy_id = p_strategy_id
            AND b.archived_at IS NULL
        )
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
      FROM (
        SELECT v.*
        FROM public.strategy_versions AS v
        WHERE v.strategy_id = p_strategy_id
        ORDER BY v.is_current DESC, v.version_number DESC
        LIMIT 100
      ) AS v
      LEFT JOIN public.profiles AS creator ON creator.id = v.created_by
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
        to_jsonb(b) || jsonb_build_object(
          'version', jsonb_build_object(
            'version_name', b.version_name,
            'strategy_id', b.strategy_id
          ),
          'version_name', b.version_name,
          'strategy_name', s.name,
          'strategy_id', s.id,
          'creator_name', creator.display_name
        )
      )
      FROM (
        SELECT b.*, v.version_name, v.strategy_id
        FROM public.backtests AS b
        JOIN public.strategy_versions AS v ON v.id = b.strategy_version_id
        WHERE v.strategy_id = p_strategy_id
          AND b.archived_at IS NULL
        ORDER BY b.created_at DESC
        LIMIT 200
      ) AS b
      JOIN public.strategies AS s ON s.id = b.strategy_id
      LEFT JOIN public.profiles AS creator ON creator.id = b.created_by
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
              WHEN u.id IS NULL THEN NULL
              ELSE jsonb_build_object('display_name', u.display_name)
            END
          ) AS payload
        FROM public.activity_logs AS a
        LEFT JOIN public.profiles AS u ON u.id = a.user_id
        WHERE a.entity_type = 'strategy'
          AND a.entity_id = p_strategy_id
        ORDER BY a.created_at DESC
        LIMIT 20
      ) AS activity_row
    ), '[]'::jsonb)
  );
$$;

REVOKE ALL ON FUNCTION public.get_strategy_detail(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_strategy_detail(UUID) TO authenticated;
