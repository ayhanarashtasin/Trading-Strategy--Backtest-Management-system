export type UserRole = 'owner' | 'editor' | 'viewer';
export type UserStatus = 'active' | 'disabled';

export type StrategyFamily =
  | 'Supertrend'
  | 'Momentum'
  | 'Trend Following'
  | 'Mean Reversion'
  | 'Breakout'
  | 'Scalping'
  | 'Swing'
  | 'Moving Average'
  | 'RSI'
  | 'MACD'
  | 'VWAP'
  | 'Volume'
  | 'Multi-Timeframe'
  | 'Custom'
  | 'Other';

export type StrategyStatus =
  | 'Idea'
  | 'Baseline'
  | 'Experimental'
  | 'Candidate'
  | 'Validation'
  | 'OOS Passed'
  | 'Paper Trading'
  | 'Production Candidate'
  | 'Live'
  | 'Rejected'
  | 'Archived';

export type DefaultDirection = 'Long' | 'Short' | 'Both';

export type BacktestSource =
  | 'TradingView'
  | 'Freqtrade'
  | 'Python'
  | 'Codex'
  | 'Manual'
  | 'Other';

export type TestType =
  | 'Development'
  | 'Optimization'
  | 'Prior Period'
  | 'Out of Sample'
  | 'Walk Forward'
  | 'Robustness'
  | 'Monte Carlo'
  | 'Paper Trading'
  | 'Live'
  | 'Other';

export type EntityType = 'strategy' | 'strategy_version' | 'backtest';

export interface Profile {
  id: string;
  email: string;
  display_name: string;
  role: UserRole;
  status: UserStatus;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  last_seen_at: string | null;
}

export interface Tag {
  id: string;
  name: string;
  created_at: string;
}

export interface Strategy {
  id: string;
  name: string;
  strategy_family: StrategyFamily | string;
  description: string | null;
  default_direction: DefaultDirection;
  status: StrategyStatus;
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
  archived_at: string | null;
  // Relations
  creator?: Profile | null;
  updater?: Profile | null;
  tags?: Tag[];
  versions_count?: number;
  backtests_count?: number;
}

export interface StrategyVersion {
  id: string;
  strategy_id: string;
  version_name: string;
  version_number: number;
  description: string | null;
  entry_rules: string | null;
  exit_rules: string | null;
  risk_rules: string | null;
  parameter_summary: string | null;
  parameters_json: Record<string, any> | null;
  is_current: boolean;
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
  archived_at: string | null;
  // Relations
  strategy?: Strategy | null;
  creator?: Profile | null;
  backtests_count?: number;
}

export interface Backtest {
  id: string;
  strategy_version_id: string;

  // Identification
  backtest_name: string;
  source: BacktestSource;
  test_type: TestType;
  engine_version: string | null;
  status: string;

  // Market
  exchange: string | null;
  market_type: string | null;
  symbol: string;
  base_asset: string | null;
  quote_asset: string | null;
  direction: DefaultDirection | null;
  timeframe: string;
  higher_timeframe: string | null;
  intrabar_timeframe: string | null;
  data_source: string | null;
  start_date: string;
  end_date: string;
  duration_days?: number | null;

  // Execution Assumptions
  fee_per_side_percent: number | null;
  slippage_per_side_percent: number | null;
  starting_capital: number | null;
  leverage: number | null;
  position_size_percent: number | null;
  compounding: boolean | null;
  stop_loss_description: string | null;
  take_profit_description: string | null;
  trailing_stop_description: string | null;
  funding_included: boolean | null;

  // Standard Performance Metrics
  total_trades: number | null;
  profit_factor: number | null;
  net_profit_percent: number | null;
  net_profit_amount: number | null;
  max_drawdown_percent: number | null;
  win_rate_percent: number | null;
  average_trade_percent: number | null;
  median_trade_percent: number | null;
  cagr_percent: number | null;
  payoff_ratio: number | null;
  expectancy_percent: number | null;
  average_win_percent: number | null;
  average_loss_percent: number | null;
  largest_win_percent: number | null;
  largest_loss_percent: number | null;
  sharpe_ratio: number | null;
  sortino_ratio: number | null;
  calmar_ratio: number | null;
  recovery_factor: number | null;
  exposure_percent: number | null;
  average_trade_duration: string | null;
  long_trades: number | null;
  short_trades: number | null;
  winning_trades: number | null;
  losing_trades: number | null;

  // Integrity
  fees_included: boolean;
  slippage_included: boolean;
  intrabar_simulation: boolean;
  lookahead_checked: boolean;
  lookahead_bias_detected: boolean;
  data_gaps_checked: boolean;
  warmup_checked: boolean;
  liquidation_modeled: boolean;
  same_bar_execution_checked: boolean;
  oos_tested: boolean;
  walk_forward_tested: boolean;

  // Technical Details
  details: string | null;

  // Meta
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
  archived_at: string | null;

  // Relations
  strategy_version?: StrategyVersion & { strategy?: Strategy };
  creator?: Profile | null;
  updater?: Profile | null;
  yearly_results?: BacktestYearlyResult[];
  research_notes?: ResearchNote[];
  attachments?: Attachment[];
}

export interface BacktestYearlyResult {
  id: string;
  backtest_id: string;
  year: number;
  trades: number | null;
  net_profit_percent: number | null;
  profit_factor: number | null;
  win_rate_percent: number | null;
  average_trade_percent: number | null;
  max_drawdown_percent: number | null;
  created_at: string;
}

export interface ResearchNote {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  content: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  creator?: Profile | null;
}

export interface Attachment {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  file_name: string;
  storage_path: string;
  mime_type: string;
  file_size: number;
  uploaded_by: string | null;
  created_at: string;
  uploader?: Profile | null;
  url?: string;
}

export interface SavedView {
  id: string;
  user_id: string;
  name: string;
  is_shared: boolean;
  filters: Record<string, any>;
  sort_config: Array<{ id: string; desc: boolean }>;
  column_visibility: Record<string, boolean>;
  column_order: string[];
  column_pinning: { left?: string[]; right?: string[] };
  created_at: string;
  updated_at: string;
}

export interface UserTablePreferences {
  id: string;
  user_id: string;
  table_id: string;
  column_visibility: Record<string, boolean>;
  column_order: string[];
  column_pinning: { left?: string[]; right?: string[] };
  column_sizing: Record<string, number>;
  page_size: number;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  before_data: any | null;
  after_data: any | null;
  description: string | null;
  created_at: string;
  user?: Profile | null;
}
