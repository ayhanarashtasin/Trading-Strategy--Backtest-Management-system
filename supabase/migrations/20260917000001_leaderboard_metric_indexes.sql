-- Leaderboard Performance Metric Indexes
-- Enables rapid index scans for multi-column ranking and ordering on active backtests

CREATE INDEX IF NOT EXISTS idx_backtests_active_pf_desc 
ON public.backtests (profit_factor DESC NULLS LAST) 
WHERE (archived_at IS NULL);

CREATE INDEX IF NOT EXISTS idx_backtests_active_net_profit_desc 
ON public.backtests (net_profit_percent DESC NULLS LAST) 
WHERE (archived_at IS NULL);

CREATE INDEX IF NOT EXISTS idx_backtests_active_max_dd_asc 
ON public.backtests (max_drawdown_percent ASC NULLS LAST) 
WHERE (archived_at IS NULL);

CREATE INDEX IF NOT EXISTS idx_backtests_active_win_rate_desc 
ON public.backtests (win_rate_percent DESC NULLS LAST) 
WHERE (archived_at IS NULL);

CREATE INDEX IF NOT EXISTS idx_backtests_active_trades_desc 
ON public.backtests (total_trades DESC NULLS LAST) 
WHERE (archived_at IS NULL);

CREATE INDEX IF NOT EXISTS idx_backtests_active_sharpe_desc 
ON public.backtests (sharpe_ratio DESC NULLS LAST) 
WHERE (archived_at IS NULL);

CREATE INDEX IF NOT EXISTS idx_backtests_active_sortino_desc 
ON public.backtests (sortino_ratio DESC NULLS LAST) 
WHERE (archived_at IS NULL);

CREATE INDEX IF NOT EXISTS idx_backtests_active_recovery_desc 
ON public.backtests (recovery_factor DESC NULLS LAST) 
WHERE (archived_at IS NULL);

CREATE INDEX IF NOT EXISTS idx_backtests_active_calmar_desc 
ON public.backtests (calmar_ratio DESC NULLS LAST) 
WHERE (archived_at IS NULL);

CREATE INDEX IF NOT EXISTS idx_backtests_active_cagr_desc 
ON public.backtests (cagr_percent DESC NULLS LAST) 
WHERE (archived_at IS NULL);

CREATE INDEX IF NOT EXISTS idx_backtests_active_avg_trade_desc 
ON public.backtests (average_trade_percent DESC NULLS LAST) 
WHERE (archived_at IS NULL);

CREATE INDEX IF NOT EXISTS idx_backtests_active_payoff_desc 
ON public.backtests (payoff_ratio DESC NULLS LAST) 
WHERE (archived_at IS NULL);
