import {
  ActivityLog,
  Backtest,
  Strategy,
  StrategyVersion,
  Tag,
} from "@/types/database";

export type StrategyDetailBacktest = Pick<
  Backtest,
  | "id"
  | "backtest_name"
  | "symbol"
  | "timeframe"
  | "source"
  | "total_trades"
  | "profit_factor"
  | "net_profit_percent"
  | "max_drawdown_percent"
  | "win_rate_percent"
  | "created_at"
> & {
  version: { version_name: string; strategy_id: string } | null;
};

export type StrategyDetailData = {
  strategy: (Strategy & {
    creator?: Pick<import("@/types/database").Profile, "display_name" | "email"> | null;
    updater?: Pick<import("@/types/database").Profile, "display_name" | "email"> | null;
  }) | null;
  versions: Array<
    StrategyVersion & {
      creator?: Pick<import("@/types/database").Profile, "display_name"> | null;
    }
  >;
  tags: Tag[];
  backtests: StrategyDetailBacktest[];
  activityLogs: Array<
    ActivityLog & { user?: { display_name: string } | null }
  >;
};

export type RecentBacktestItem = Pick<
  Backtest,
  | "id"
  | "backtest_name"
  | "symbol"
  | "timeframe"
  | "source"
  | "profit_factor"
  | "net_profit_percent"
  | "win_rate_percent"
  | "max_drawdown_percent"
  | "total_trades"
  | "created_at"
  | "status"
>;

export type RecentStrategyItem = Pick<
  Strategy,
  "id" | "name" | "strategy_family" | "default_direction" | "status" | "created_at"
>;

export type NeedingValidationItem = Pick<
  Backtest,
  | "id"
  | "backtest_name"
  | "symbol"
  | "timeframe"
  | "source"
  | "profit_factor"
  | "net_profit_percent"
  | "created_at"
>;

export type RecentActivityItem = Pick<
  ActivityLog,
  "id" | "action" | "entity_type" | "entity_id" | "description" | "created_at"
> & {
  user?: { display_name: string } | null;
};

export type DashboardSnapshot = {
  stats: {
    totalStrategies: number;
    totalVersions: number;
    totalBacktests: number;
    candidatesCount: number;
    validatedCount: number;
    rejectedCount: number;
  };
  recentBacktests: RecentBacktestItem[];
  recentStrategies: RecentStrategyItem[];
  needingValidation: NeedingValidationItem[];
  recentActivity: RecentActivityItem[];
};
