import React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Backtest } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { formatPercent, formatNumber, formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import Link from "next/link";
import { Eye, Trophy, Calendar } from "lucide-react";

export interface BacktestRow extends Backtest {
  strategy_name?: string;
  strategy_id?: string;
  version_name?: string;
  creator_name?: string;
}

export interface LeaderboardRow extends BacktestRow {
  rank: number;
}

export const ALL_COLUMN_METADATA = [
  { id: "select", label: "Select", defaultVisible: true, category: "Selection" },
  { id: "strategy_name", label: "Strategy", defaultVisible: true, category: "General" },
  { id: "version_name", label: "Version", defaultVisible: true, category: "General" },
  { id: "backtest_name", label: "Backtest Name", defaultVisible: true, category: "General" },
  { id: "status", label: "Status", defaultVisible: true, category: "General" },
  { id: "symbol", label: "Symbol", defaultVisible: true, category: "Market" },
  { id: "timeframe", label: "Timeframe", defaultVisible: true, category: "Market" },
  { id: "source", label: "Source", defaultVisible: true, category: "General" },
  { id: "test_type", label: "Test Type", defaultVisible: true, category: "General" },
  { id: "start_date", label: "Start Date", defaultVisible: true, category: "Market" },
  { id: "end_date", label: "End Date", defaultVisible: true, category: "Market" },
  { id: "duration_days", label: "Days", defaultVisible: true, category: "Market" },
  { id: "total_trades", label: "Trades", defaultVisible: true, category: "Performance" },
  { id: "profit_factor", label: "Profit Factor", defaultVisible: true, category: "Performance" },
  { id: "average_trade_percent", label: "Avg Trade %", defaultVisible: true, category: "Performance" },
  { id: "median_trade_percent", label: "Median Trade %", defaultVisible: true, category: "Performance" },
  { id: "win_rate_percent", label: "Win Rate %", defaultVisible: true, category: "Performance" },
  { id: "payoff_ratio", label: "Payoff Ratio", defaultVisible: true, category: "Performance" },
  { id: "max_drawdown_percent", label: "Max Drawdown %", defaultVisible: true, category: "Performance" },
  { id: "net_profit_percent", label: "Net Profit %", defaultVisible: true, category: "Performance" },
  { id: "monthly_results", label: "Monthly Results", defaultVisible: true, category: "Performance" },
  { id: "details", label: "Details", defaultVisible: true, category: "General" },
  { id: "creator_name", label: "Created By", defaultVisible: true, category: "Auditing" },
  { id: "created_at", label: "Date Added", defaultVisible: true, category: "Auditing" },

  // Additional performance & metrics
  { id: "net_profit_amount", label: "Net Profit $", defaultVisible: false, category: "Performance" },
  { id: "expectancy_percent", label: "Expectancy %", defaultVisible: false, category: "Performance" },
  { id: "cagr_percent", label: "CAGR %", defaultVisible: false, category: "Performance" },
  { id: "sharpe_ratio", label: "Sharpe", defaultVisible: false, category: "Performance" },
  { id: "sortino_ratio", label: "Sortino", defaultVisible: false, category: "Performance" },
  { id: "calmar_ratio", label: "Calmar", defaultVisible: false, category: "Performance" },
  { id: "recovery_factor", label: "Recovery Factor", defaultVisible: false, category: "Performance" },
  { id: "exposure_percent", label: "Exposure %", defaultVisible: false, category: "Performance" },
  { id: "average_win_percent", label: "Avg Win %", defaultVisible: false, category: "Performance" },
  { id: "average_loss_percent", label: "Avg Loss %", defaultVisible: false, category: "Performance" },
  { id: "largest_win_percent", label: "Largest Win %", defaultVisible: false, category: "Performance" },
  { id: "largest_loss_percent", label: "Largest Loss %", defaultVisible: false, category: "Performance" },
  { id: "long_trades", label: "Long Trades", defaultVisible: false, category: "Performance" },
  { id: "short_trades", label: "Short Trades", defaultVisible: false, category: "Performance" },
  { id: "winning_trades", label: "Win Trades", defaultVisible: false, category: "Performance" },
  { id: "losing_trades", label: "Loss Trades", defaultVisible: false, category: "Performance" },
  { id: "average_trade_duration", label: "Avg Duration", defaultVisible: false, category: "Performance" },

  // Market
  { id: "exchange", label: "Exchange", defaultVisible: false, category: "Market" },
  { id: "market_type", label: "Market Type", defaultVisible: false, category: "Market" },
  { id: "direction", label: "Direction", defaultVisible: false, category: "Market" },
  { id: "higher_timeframe", label: "Higher TF", defaultVisible: false, category: "Market" },
  { id: "intrabar_timeframe", label: "Intrabar TF", defaultVisible: false, category: "Market" },
  { id: "data_source", label: "Data Source", defaultVisible: false, category: "Market" },

  // Execution
  { id: "fee_per_side_percent", label: "Fee Per Side %", defaultVisible: false, category: "Execution" },
  { id: "slippage_per_side_percent", label: "Slippage %", defaultVisible: false, category: "Execution" },
  { id: "starting_capital", label: "Starting Capital", defaultVisible: false, category: "Execution" },
  { id: "leverage", label: "Leverage", defaultVisible: false, category: "Execution" },
  { id: "position_size_percent", label: "Position Size %", defaultVisible: false, category: "Execution" },
  { id: "compounding", label: "Compounding", defaultVisible: false, category: "Execution" },
  { id: "funding_included", label: "Funding Included", defaultVisible: false, category: "Execution" },

  // Integrity
  { id: "oos_tested", label: "OOS Tested", defaultVisible: false, category: "Integrity" },
  { id: "fees_included", label: "Fees Included", defaultVisible: false, category: "Integrity" },
  { id: "slippage_included", label: "Slippage Included", defaultVisible: false, category: "Integrity" },
  { id: "intrabar_simulation", label: "Intrabar Sim", defaultVisible: false, category: "Integrity" },

  // Auditing
  { id: "updated_at", label: "Updated At", defaultVisible: false, category: "Auditing" },
];

export const LEADERBOARD_COLUMN_METADATA = [
  { id: "rank", label: "Rank", defaultVisible: true, category: "Ranking" },
  ...ALL_COLUMN_METADATA,
];

export function getInitialVisibility(): Record<string, boolean> {
  const vis: Record<string, boolean> = {};
  ALL_COLUMN_METADATA.forEach((col) => {
    vis[col.id] = col.defaultVisible;
  });
  return vis;
}

export function getInitialLeaderboardVisibility(): Record<string, boolean> {
  const vis: Record<string, boolean> = {
    rank: true,
  };
  ALL_COLUMN_METADATA.forEach((col) => {
    vis[col.id] = col.defaultVisible;
  });
  return vis;
}

function renderRankedHeader(label: string, isRanked: boolean) {
  if (!isRanked) return label;
  return (
    <div className="flex items-center gap-1 font-semibold text-primary">
      <span>{label}</span>
      <span className="rounded bg-primary/10 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
        Ranked
      </span>
    </div>
  );
}

export function createBaseColumns<T extends BacktestRow>(
  onViewDetails: (row: T) => void,
  primaryMetric?: string,
  onViewMonthly?: (row: T) => void
): ColumnDef<T>[] {
  return [
    // 1. Select Checkbox
    {
      id: "select",
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllPageRowsSelected()}
          onChange={(e) => table.toggleAllPageRowsSelected(!!e.target.checked)}
          className="h-3.5 w-3.5 cursor-pointer rounded border-input accent-primary"
          title="Select all rows on this page"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={(e) => row.toggleSelected(!!e.target.checked)}
          className="h-3.5 w-3.5 cursor-pointer rounded border-input accent-primary"
          title="Select row"
        />
      ),
      size: 40,
      enableSorting: false,
      enableResizing: false,
    },

    // 2. Strategy Name
    {
      id: "strategy_name",
      accessorKey: "strategy_name",
      header: "Strategy",
      cell: ({ row }) => (
        <Link
          href={`/strategies/${row.original.strategy_id || ""}`}
          className="font-medium text-foreground hover:text-primary hover:underline truncate block max-w-[160px]"
        >
          {row.original.strategy_name || "Strategy"}
        </Link>
      ),
      size: 160,
    },

    // 3. Version
    {
      id: "version_name",
      accessorKey: "version_name",
      header: "Version",
      cell: ({ row }) => (
        <span className="font-mono text-muted-foreground">
          {row.original.version_name || "V1"}
        </span>
      ),
      size: 80,
    },

    // 4. Backtest Name
    {
      id: "backtest_name",
      accessorKey: "backtest_name",
      header: "Backtest Name",
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => onViewDetails(row.original)}
          className="font-semibold text-foreground hover:text-primary hover:underline text-left truncate block max-w-[180px]"
        >
          {row.original.backtest_name}
        </button>
      ),
      size: 180,
    },

    // 5. Status
    {
      id: "status",
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
      size: 100,
    },

    // 6. Symbol
    {
      id: "symbol",
      accessorKey: "symbol",
      header: "Symbol",
      cell: ({ row }) => (
        <span className="font-mono font-semibold text-foreground">
          {row.original.symbol}
        </span>
      ),
      size: 90,
    },

    // 7. Timeframe
    {
      id: "timeframe",
      accessorKey: "timeframe",
      header: "TF",
      cell: ({ row }) => (
        <span className="font-mono text-muted-foreground">{row.original.timeframe}</span>
      ),
      size: 60,
    },

    // 8. Source
    {
      id: "source",
      accessorKey: "source",
      header: "Source",
      cell: ({ row }) => (
        <Badge variant="outline" className="font-mono text-[10px]">
          {row.original.source}
        </Badge>
      ),
      size: 95,
    },

    // 9. Test Type
    {
      id: "test_type",
      accessorKey: "test_type",
      header: "Test Type",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-[11px] truncate block">
          {row.original.test_type}
        </span>
      ),
      size: 110,
    },

    // 10. Start Date
    {
      id: "start_date",
      accessorKey: "start_date",
      header: "Start Date",
      cell: ({ row }) => (
        <span className="font-mono text-muted-foreground text-[11px]">
          {formatDate(row.original.start_date)}
        </span>
      ),
      size: 95,
    },

    // 11. End Date
    {
      id: "end_date",
      accessorKey: "end_date",
      header: "End Date",
      cell: ({ row }) => (
        <span className="font-mono text-muted-foreground text-[11px]">
          {formatDate(row.original.end_date)}
        </span>
      ),
      size: 95,
    },

    // 11b. Duration Days
    {
      id: "duration_days",
      accessorFn: (row) => {
        if (row.duration_days != null) return row.duration_days;
        if (row.start_date && row.end_date) {
          const diff = Math.round(
            (new Date(row.end_date).getTime() - new Date(row.start_date).getTime()) /
              (1000 * 60 * 60 * 24)
          );
          return isNaN(diff) ? null : Math.max(0, diff);
        }
        return null;
      },
      header: "Days",
      sortingFn: "basic",
      cell: ({ getValue }) => {
        const days = getValue<number | null>();
        if (days == null) return <div className="text-right font-mono text-muted-foreground/60">N/A</div>;
        return (
          <div className="text-right font-mono text-muted-foreground text-[11px]">
            {formatNumber(days, 0)} d
          </div>
        );
      },
      size: 75,
    },

    // 12. Trades
    {
      id: "total_trades",
      accessorKey: "total_trades",
      header: () => renderRankedHeader("Trades", primaryMetric === "total_trades"),
      sortingFn: "basic",
      cell: ({ row }) => (
        <div className={`text-right font-mono text-muted-foreground ${primaryMetric === "total_trades" ? "bg-primary/[0.05] font-semibold text-foreground" : ""}`}>
          {formatNumber(row.original.total_trades, 0)}
        </div>
      ),
      size: 80,
    },

    // 13. Profit Factor
    {
      id: "profit_factor",
      accessorKey: "profit_factor",
      header: () => renderRankedHeader("PF", primaryMetric === "profit_factor"),
      sortingFn: "basic",
      cell: ({ row }) => {
        const pf = row.original.profit_factor;
        if (pf === null || pf === undefined) return <div className="text-right font-mono text-muted-foreground/60">N/A</div>;
        const num = Number(pf);
        return (
          <div className={`text-right font-mono font-semibold ${num >= 1.2 ? "text-profit" : num >= 1.0 ? "text-foreground" : "text-loss"} ${primaryMetric === "profit_factor" ? "bg-primary/[0.05]" : ""}`}>
            {num.toFixed(2)}
          </div>
        );
      },
      size: 75,
    },

    // 14. Avg Trade %
    {
      id: "average_trade_percent",
      accessorKey: "average_trade_percent",
      header: () => renderRankedHeader("Avg Trade", primaryMetric === "average_trade_percent"),
      sortingFn: "basic",
      cell: ({ row }) => {
        const val = row.original.average_trade_percent;
        if (val === null || val === undefined) return <div className="text-right font-mono text-muted-foreground/60">N/A</div>;
        const num = Number(val);
        return (
          <div className={`text-right font-mono ${num > 0 ? "text-profit" : num < 0 ? "text-loss" : "text-foreground"} ${primaryMetric === "average_trade_percent" ? "bg-primary/[0.05] font-semibold" : ""}`}>
            {formatPercent(num, 3)}
          </div>
        );
      },
      size: 90,
    },

    // 14b. Median Trade %
    {
      id: "median_trade_percent",
      accessorKey: "median_trade_percent",
      header: "Median Trade",
      sortingFn: "basic",
      cell: ({ row }) => {
        const val = row.original.median_trade_percent;
        if (val === null || val === undefined) return <div className="text-right font-mono text-muted-foreground/60">N/A</div>;
        const num = Number(val);
        return (
          <div className={`text-right font-mono ${num > 0 ? "text-profit" : num < 0 ? "text-loss" : "text-foreground"}`}>
            {formatPercent(num, 3)}
          </div>
        );
      },
      size: 95,
    },

    // 15. Win Rate %
    {
      id: "win_rate_percent",
      accessorKey: "win_rate_percent",
      header: () => renderRankedHeader("Win Rate", primaryMetric === "win_rate_percent"),
      sortingFn: "basic",
      cell: ({ row }) => (
        <div className={`text-right font-mono text-muted-foreground ${primaryMetric === "win_rate_percent" ? "bg-primary/[0.05] font-semibold text-foreground" : ""}`}>
          {formatPercent(row.original.win_rate_percent)}
        </div>
      ),
      size: 85,
    },

    // 16. Payoff Ratio
    {
      id: "payoff_ratio",
      accessorKey: "payoff_ratio",
      header: () => renderRankedHeader("Payoff", primaryMetric === "payoff_ratio"),
      sortingFn: "basic",
      cell: ({ row }) => (
        <div className={`text-right font-mono text-muted-foreground ${primaryMetric === "payoff_ratio" ? "bg-primary/[0.05] font-semibold text-foreground" : ""}`}>
          {row.original.payoff_ratio ? Number(row.original.payoff_ratio).toFixed(2) : "N/A"}
        </div>
      ),
      size: 75,
    },

    // 17. Max Drawdown %
    {
      id: "max_drawdown_percent",
      accessorKey: "max_drawdown_percent",
      header: () => renderRankedHeader("Max DD", primaryMetric === "max_drawdown_percent"),
      sortingFn: "basic",
      cell: ({ row }) => (
        <div className={`text-right font-mono text-loss ${primaryMetric === "max_drawdown_percent" ? "bg-primary/[0.05] font-semibold" : ""}`}>
          {formatPercent(row.original.max_drawdown_percent)}
        </div>
      ),
      size: 85,
    },

    // 18. Net Profit %
    {
      id: "net_profit_percent",
      accessorKey: "net_profit_percent",
      header: () => renderRankedHeader("Return", primaryMetric === "net_profit_percent"),
      sortingFn: "basic",
      cell: ({ row }) => {
        const val = row.original.net_profit_percent;
        if (val === null || val === undefined) return <div className="text-right font-mono text-muted-foreground/60">N/A</div>;
        const num = Number(val);
        return (
          <div className={`text-right font-mono font-semibold ${num >= 0 ? "text-profit" : "text-loss"} ${primaryMetric === "net_profit_percent" ? "bg-primary/[0.05]" : ""}`}>
            {num >= 0 ? "+" : ""}{formatPercent(num)}
          </div>
        );
      },
      size: 95,
    },

    // Monthly Results Button
    {
      id: "monthly_results",
      header: "Monthly",
      cell: ({ row }) => (
        <Button
          size="xs"
          variant="outline"
          onClick={() => (onViewMonthly ? onViewMonthly(row.original) : onViewDetails(row.original))}
          className="h-6 gap-1 px-2 text-[10px] text-primary hover:text-primary hover:bg-primary/10 border-primary/30"
          title="View month-by-month results"
        >
          <Calendar className="h-3 w-3" />
          View
        </Button>
      ),
      size: 75,
      enableSorting: false,
    },

    // Details Drawer Button
    {
      id: "details",
      header: "Details",
      cell: ({ row }) => (
        <Button
          size="xs"
          variant="outline"
          onClick={() => onViewDetails(row.original)}
          className="h-6 gap-1 px-2 text-[10px]"
        >
          <Eye className="h-3 w-3" />
          View
        </Button>
      ),
      size: 70,
      enableSorting: false,
    },

    // Creator
    {
      id: "creator_name",
      accessorKey: "creator_name",
      header: "Created By",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-[11px] truncate block max-w-[100px]">
          {row.original.creator_name || "Analyst"}
        </span>
      ),
      size: 100,
    },

    // Date Added
    {
      id: "created_at",
      accessorKey: "created_at",
      header: "Date Added",
      sortingFn: "datetime",
      cell: ({ row }) => (
        <span
          className="font-mono text-muted-foreground text-[11px] whitespace-nowrap"
          title={`Inserted into website on ${formatDateTime(row.original.created_at)}`}
        >
          {formatDate(row.original.created_at)}
        </span>
      ),
      size: 110,
    },

    // Additional Performance & Statistics
    {
      id: "net_profit_amount",
      accessorKey: "net_profit_amount",
      header: "Net Profit $",
      sortingFn: "basic",
      cell: ({ row }) => {
        const val = row.original.net_profit_amount;
        if (val === null || val === undefined) return <div className="text-right font-mono text-muted-foreground/60">N/A</div>;
        const num = Number(val);
        return (
          <div className={`text-right font-mono font-semibold ${num >= 0 ? "text-profit" : "text-loss"}`}>
            {formatCurrency(num)}
          </div>
        );
      },
      size: 100,
    },
    {
      id: "expectancy_percent",
      accessorKey: "expectancy_percent",
      header: "Expectancy %",
      sortingFn: "basic",
      cell: ({ row }) => {
        const val = row.original.expectancy_percent;
        if (val === null || val === undefined) return <div className="text-right font-mono text-muted-foreground/60">N/A</div>;
        const num = Number(val);
        return (
          <div className={`text-right font-mono ${num >= 0 ? "text-profit" : "text-loss"}`}>
            {formatPercent(num, 3)}
          </div>
        );
      },
      size: 95,
    },
    {
      id: "cagr_percent",
      accessorKey: "cagr_percent",
      header: () => renderRankedHeader("CAGR %", primaryMetric === "cagr_percent"),
      sortingFn: "basic",
      cell: ({ row }) => (
        <div className={`text-right font-mono text-muted-foreground ${primaryMetric === "cagr_percent" ? "bg-primary/[0.05] font-semibold text-foreground" : ""}`}>
          {formatPercent(row.original.cagr_percent)}
        </div>
      ),
      size: 85,
    },
    {
      id: "sharpe_ratio",
      accessorKey: "sharpe_ratio",
      header: () => renderRankedHeader("Sharpe", primaryMetric === "sharpe_ratio"),
      sortingFn: "basic",
      cell: ({ row }) => (
        <div className={`text-right font-mono text-muted-foreground ${primaryMetric === "sharpe_ratio" ? "bg-primary/[0.05] font-semibold text-foreground" : ""}`}>
          {row.original.sharpe_ratio ? Number(row.original.sharpe_ratio).toFixed(2) : "N/A"}
        </div>
      ),
      size: 75,
    },
    {
      id: "sortino_ratio",
      accessorKey: "sortino_ratio",
      header: () => renderRankedHeader("Sortino", primaryMetric === "sortino_ratio"),
      sortingFn: "basic",
      cell: ({ row }) => (
        <div className={`text-right font-mono text-muted-foreground ${primaryMetric === "sortino_ratio" ? "bg-primary/[0.05] font-semibold text-foreground" : ""}`}>
          {row.original.sortino_ratio ? Number(row.original.sortino_ratio).toFixed(2) : "N/A"}
        </div>
      ),
      size: 75,
    },
    {
      id: "calmar_ratio",
      accessorKey: "calmar_ratio",
      header: () => renderRankedHeader("Calmar", primaryMetric === "calmar_ratio"),
      sortingFn: "basic",
      cell: ({ row }) => (
        <div className={`text-right font-mono text-muted-foreground ${primaryMetric === "calmar_ratio" ? "bg-primary/[0.05] font-semibold text-foreground" : ""}`}>
          {row.original.calmar_ratio ? Number(row.original.calmar_ratio).toFixed(2) : "N/A"}
        </div>
      ),
      size: 75,
    },
    {
      id: "recovery_factor",
      accessorKey: "recovery_factor",
      header: () => renderRankedHeader("Recovery", primaryMetric === "recovery_factor"),
      sortingFn: "basic",
      cell: ({ row }) => (
        <div className={`text-right font-mono text-muted-foreground ${primaryMetric === "recovery_factor" ? "bg-primary/[0.05] font-semibold text-foreground" : ""}`}>
          {row.original.recovery_factor ? Number(row.original.recovery_factor).toFixed(2) : "N/A"}
        </div>
      ),
      size: 80,
    },
    {
      id: "exposure_percent",
      accessorKey: "exposure_percent",
      header: "Exposure %",
      sortingFn: "basic",
      cell: ({ row }) => (
        <div className="text-right font-mono text-muted-foreground">
          {formatPercent(row.original.exposure_percent)}
        </div>
      ),
      size: 85,
    },
    {
      id: "average_win_percent",
      accessorKey: "average_win_percent",
      header: "Avg Win %",
      sortingFn: "basic",
      cell: ({ row }) => (
        <div className="text-right font-mono text-profit">
          {row.original.average_win_percent != null ? formatPercent(row.original.average_win_percent) : "N/A"}
        </div>
      ),
      size: 85,
    },
    {
      id: "average_loss_percent",
      accessorKey: "average_loss_percent",
      header: "Avg Loss %",
      sortingFn: "basic",
      cell: ({ row }) => (
        <div className="text-right font-mono text-loss">
          {row.original.average_loss_percent != null ? formatPercent(row.original.average_loss_percent) : "N/A"}
        </div>
      ),
      size: 85,
    },
    {
      id: "largest_win_percent",
      accessorKey: "largest_win_percent",
      header: "Largest Win %",
      sortingFn: "basic",
      cell: ({ row }) => (
        <div className="text-right font-mono text-profit">
          {row.original.largest_win_percent != null ? formatPercent(row.original.largest_win_percent) : "N/A"}
        </div>
      ),
      size: 95,
    },
    {
      id: "largest_loss_percent",
      accessorKey: "largest_loss_percent",
      header: "Largest Loss %",
      sortingFn: "basic",
      cell: ({ row }) => (
        <div className="text-right font-mono text-loss">
          {row.original.largest_loss_percent != null ? formatPercent(row.original.largest_loss_percent) : "N/A"}
        </div>
      ),
      size: 95,
    },
    {
      id: "long_trades",
      accessorKey: "long_trades",
      header: "Long Trades",
      sortingFn: "basic",
      cell: ({ row }) => (
        <div className="text-right font-mono text-muted-foreground">
          {row.original.long_trades != null ? formatNumber(row.original.long_trades, 0) : "N/A"}
        </div>
      ),
      size: 90,
    },
    {
      id: "short_trades",
      accessorKey: "short_trades",
      header: "Short Trades",
      sortingFn: "basic",
      cell: ({ row }) => (
        <div className="text-right font-mono text-muted-foreground">
          {row.original.short_trades != null ? formatNumber(row.original.short_trades, 0) : "N/A"}
        </div>
      ),
      size: 90,
    },
    {
      id: "winning_trades",
      accessorKey: "winning_trades",
      header: "Win Trades",
      sortingFn: "basic",
      cell: ({ row }) => (
        <div className="text-right font-mono text-profit">
          {row.original.winning_trades != null ? formatNumber(row.original.winning_trades, 0) : "N/A"}
        </div>
      ),
      size: 85,
    },
    {
      id: "losing_trades",
      accessorKey: "losing_trades",
      header: "Loss Trades",
      sortingFn: "basic",
      cell: ({ row }) => (
        <div className="text-right font-mono text-loss">
          {row.original.losing_trades != null ? formatNumber(row.original.losing_trades, 0) : "N/A"}
        </div>
      ),
      size: 85,
    },
    {
      id: "average_trade_duration",
      accessorKey: "average_trade_duration",
      header: "Avg Duration",
      cell: ({ row }) => (
        <span className="font-mono text-muted-foreground text-[11px] truncate block">
          {row.original.average_trade_duration || "N/A"}
        </span>
      ),
      size: 95,
    },

    // Market details
    {
      id: "exchange",
      accessorKey: "exchange",
      header: "Exchange",
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.exchange || "N/A"}</span>,
      size: 90,
    },
    {
      id: "market_type",
      accessorKey: "market_type",
      header: "Market Type",
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.market_type || "N/A"}</span>,
      size: 100,
    },
    {
      id: "direction",
      accessorKey: "direction",
      header: "Direction",
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.direction || "Both"}</span>,
      size: 80,
    },
    {
      id: "higher_timeframe",
      accessorKey: "higher_timeframe",
      header: "Higher TF",
      cell: ({ row }) => <span className="font-mono text-muted-foreground">{row.original.higher_timeframe || "N/A"}</span>,
      size: 80,
    },
    {
      id: "intrabar_timeframe",
      accessorKey: "intrabar_timeframe",
      header: "Intrabar TF",
      cell: ({ row }) => <span className="font-mono text-muted-foreground">{row.original.intrabar_timeframe || "N/A"}</span>,
      size: 85,
    },
    {
      id: "data_source",
      accessorKey: "data_source",
      header: "Data Source",
      cell: ({ row }) => <span className="text-muted-foreground text-[11px]">{row.original.data_source || "N/A"}</span>,
      size: 120,
    },

    // Execution assumptions
    {
      id: "fee_per_side_percent",
      accessorKey: "fee_per_side_percent",
      header: "Fee %",
      sortingFn: "basic",
      cell: ({ row }) => <div className="text-right font-mono text-muted-foreground">{formatPercent(row.original.fee_per_side_percent)}</div>,
      size: 75,
    },
    {
      id: "slippage_per_side_percent",
      accessorKey: "slippage_per_side_percent",
      header: "Slippage %",
      sortingFn: "basic",
      cell: ({ row }) => <div className="text-right font-mono text-muted-foreground">{formatPercent(row.original.slippage_per_side_percent)}</div>,
      size: 80,
    },
    {
      id: "starting_capital",
      accessorKey: "starting_capital",
      header: "Capital",
      sortingFn: "basic",
      cell: ({ row }) => <div className="text-right font-mono text-muted-foreground">{formatCurrency(row.original.starting_capital)}</div>,
      size: 95,
    },
    {
      id: "leverage",
      accessorKey: "leverage",
      header: "Leverage",
      sortingFn: "basic",
      cell: ({ row }) => <div className="text-right font-mono text-muted-foreground">{row.original.leverage ? `${row.original.leverage}x` : "1x"}</div>,
      size: 75,
    },
    {
      id: "position_size_percent",
      accessorKey: "position_size_percent",
      header: "Pos Size %",
      sortingFn: "basic",
      cell: ({ row }) => <div className="text-right font-mono text-muted-foreground">{row.original.position_size_percent != null ? formatPercent(row.original.position_size_percent) : "N/A"}</div>,
      size: 85,
    },
    {
      id: "compounding",
      accessorKey: "compounding",
      header: "Compounding",
      cell: ({ row }) => <span className="text-muted-foreground text-[11px]">{row.original.compounding ? "Yes" : "No"}</span>,
      size: 85,
    },
    {
      id: "funding_included",
      accessorKey: "funding_included",
      header: "Funding Inc.",
      cell: ({ row }) => <span className="text-muted-foreground text-[11px]">{row.original.funding_included ? "Yes" : "No"}</span>,
      size: 85,
    },

    // Integrity
    {
      id: "oos_tested",
      accessorKey: "oos_tested",
      header: "OOS",
      cell: ({ row }) => (
        <Badge
          variant={row.original.oos_tested ? "outline" : "secondary"}
          className={`font-mono text-[10px] ${row.original.oos_tested ? "text-profit border-profit/30 bg-profit/[0.06]" : "text-muted-foreground"}`}
        >
          {row.original.oos_tested ? "Yes" : "No"}
        </Badge>
      ),
      size: 70,
    },
    {
      id: "fees_included",
      accessorKey: "fees_included",
      header: "Fees Inc.",
      cell: ({ row }) => (
        <span className={`text-[11px] font-mono ${row.original.fees_included ? "text-profit" : "text-muted-foreground"}`}>
          {row.original.fees_included ? "Yes" : "No"}
        </span>
      ),
      size: 75,
    },
    {
      id: "slippage_included",
      accessorKey: "slippage_included",
      header: "Slippage Inc.",
      cell: ({ row }) => (
        <span className={`text-[11px] font-mono ${row.original.slippage_included ? "text-profit" : "text-muted-foreground"}`}>
          {row.original.slippage_included ? "Yes" : "No"}
        </span>
      ),
      size: 85,
    },
    {
      id: "intrabar_simulation",
      accessorKey: "intrabar_simulation",
      header: "Intrabar Sim",
      cell: ({ row }) => (
        <span className={`text-[11px] font-mono ${row.original.intrabar_simulation ? "text-profit" : "text-muted-foreground"}`}>
          {row.original.intrabar_simulation ? "Yes" : "No"}
        </span>
      ),
      size: 85,
    },

    // Auditing
    {
      id: "updated_at",
      accessorKey: "updated_at",
      header: "Updated At",
      sortingFn: "basic",
      cell: ({ row }) => <span className="font-mono text-muted-foreground text-[11px]">{formatDateTime(row.original.updated_at)}</span>,
      size: 120,
    },
  ];
}

export function createBacktestColumns(
  onViewDetails: (row: BacktestRow) => void,
  onViewMonthly?: (row: BacktestRow) => void
): ColumnDef<BacktestRow>[] {
  return createBaseColumns<BacktestRow>(onViewDetails, undefined, onViewMonthly);
}

export function createLeaderboardColumns(
  onViewDetails: (row: LeaderboardRow) => void,
  primaryMetric?: string,
  onViewMonthly?: (row: LeaderboardRow) => void
): ColumnDef<LeaderboardRow>[] {
  const rankColumn: ColumnDef<LeaderboardRow> = {
    id: "rank",
    accessorKey: "rank",
    header: () => (
      <div className="flex items-center justify-center gap-1 font-semibold text-foreground">
        <Trophy className="h-3 w-3 text-sun" />
        <span>Rank</span>
      </div>
    ),
    cell: ({ row }) => {
      const rank = row.original.rank;
      return (
        <div className="flex justify-center">
          <span
            className={
              "flex h-6 w-7 items-center justify-center rounded font-mono text-[11px] tabular-nums " +
              (rank === 1
                ? "bg-sun/[0.15] text-sun ring-1 ring-inset ring-sun/30 font-bold"
                : rank <= 3
                  ? "bg-muted text-foreground ring-1 ring-inset ring-border font-semibold"
                  : "text-muted-foreground font-medium")
            }
          >
            {rank}
          </span>
        </div>
      );
    },
    size: 55,
    sortingFn: "basic",
    enableResizing: false,
  };

  const baseCols = createBaseColumns<LeaderboardRow>(onViewDetails, primaryMetric, onViewMonthly);
  return [rankColumn, ...baseCols];
}
