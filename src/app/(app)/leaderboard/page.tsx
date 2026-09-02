"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import {
  Trophy,
  Medal,
  Award,
  TrendingUp,
  Sliders,
  Filter,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { formatPercent, formatNumber, formatDate } from "@/lib/utils";
import { TableRowsSkeleton } from "@/components/ui/skeleton";
import { useCachedState, readQueryCache } from "@/lib/query-cache";

type RankingMetric =
  | "profit_factor"
  | "net_profit_percent"
  | "max_drawdown_percent"
  | "win_rate_percent"
  | "sharpe_ratio"
  | "sortino_ratio"
  | "recovery_factor";

import { Backtest } from "@/types/database";

export default function LeaderboardPage() {
  const supabase = createClient();

  /* Same rows the backtests list uses; ranking happens client-side, so a
     revisit can rank the cached set immediately. */
  const {
    data: backtests,
    setData: setBacktests,
    loading,
    setLoading,
    setIsRevalidating,
  } = useCachedState<Backtest[]>("leaderboard:active", []);

  // Leaderboard criteria
  const [primaryMetric, setPrimaryMetric] = useState<RankingMetric>("profit_factor");
  const [minTrades, setMinTrades] = useState<number>(100);
  const [sourceFilter, setSourceFilter] = useState("all");
  const [oosOnly, setOosOnly] = useState(false);

  useEffect(() => {
    async function loadData() {
      const hasCached = readQueryCache("leaderboard:active") !== undefined;
      try {
        if (hasCached) setIsRevalidating(true);
        else setLoading(true);
        const { data } = await supabase
          .from("backtests")
          .select(`
            *,
            strategy_version:strategy_versions(
              id,
              version_name,
              strategy:strategies(id, name, strategy_family)
            ),
            creator:profiles!backtests_created_by_fkey(display_name)
          `)
          .is("archived_at", null);

        setBacktests(data || []);
      } catch (err) {
        console.error("Load leaderboard error:", err);
      } finally {
        setLoading(false);
        setIsRevalidating(false);
      }
    }
    loadData();
  }, []);

  // Filter and rank backtests
  const rankedBacktests = useMemo(() => {
    return backtests
      .filter((b) => {
        // Trade count threshold
        if (minTrades > 0 && (b.total_trades === null || b.total_trades < minTrades)) {
          return false;
        }

        // Source platform
        if (sourceFilter !== "all" && b.source !== sourceFilter) {
          return false;
        }

        // OOS Tested
        if (oosOnly && !b.oos_tested) {
          return false;
        }

        // Metric must not be null
        if (b[primaryMetric] === null || b[primaryMetric] === undefined) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        const valA = Number(a[primaryMetric]);
        const valB = Number(b[primaryMetric]);

        // Max Drawdown is ranked lowest-first (smaller DD is superior)
        if (primaryMetric === "max_drawdown_percent") {
          return valA - valB;
        }

        // Other metrics ranked highest-first
        return valB - valA;
      });
  }, [backtests, primaryMetric, minTrades, sourceFilter, oosOnly]);

  /* Rank is a position in an ordered list, so it is set as a number. Only the
     top three get emphasis, and it comes from weight, not from medals. */
  const getRankBadge = (index: number) => (
    <span
      className={
        "flex h-6 w-7 items-center justify-center rounded font-mono text-[11px] font-semibold tabular-nums " +
        (index === 0
          ? "bg-sun/[0.12] text-sun ring-1 ring-inset ring-sun/25"
          : index < 3
            ? "bg-muted text-foreground ring-1 ring-inset ring-border"
            : "text-muted-foreground")
      }
    >
      {index + 1}
    </span>
  );

  const getMetricLabel = (m: RankingMetric) => {
    switch (m) {
      case "profit_factor":
        return "Profit factor";
      case "net_profit_percent":
        return "Net return";
      case "max_drawdown_percent":
        return "Max drawdown";
      case "win_rate_percent":
        return "Win rate";
      case "sharpe_ratio":
        return "Sharpe";
      case "sortino_ratio":
        return "Sortino";
      case "recovery_factor":
        return "Recovery factor";
    }
  };

  /* The ranked column already shows this metric, so the matching summary
     column stands down rather than printing the same number twice. */
  const showsSummary = (metric: RankingMetric) => primaryMetric !== metric;
  const columnCount =
    7 +
    [
      "profit_factor",
      "net_profit_percent",
      "max_drawdown_percent",
      "win_rate_percent",
    ].filter((m) => showsSummary(m as RankingMetric)).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Analysis"
        title="Leaderboard"
        description="Rank the record by whichever metric you are testing against. Set a minimum sample size first — a short backtest can top any single metric."
      />

      {/* Filter Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-2.5 text-xs shadow-plate">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {/* Metric Select */}
          <div className="flex items-center gap-2">
            <span className="eyebrow">Rank by</span>
            <Select
              value={primaryMetric}
              onChange={(e) => setPrimaryMetric(e.target.value as RankingMetric)}
              className="h-8 w-48 text-xs font-medium"
              aria-label="Ranking metric"
            >
              <option value="profit_factor">Profit factor</option>
              <option value="net_profit_percent">Net return</option>
              <option value="max_drawdown_percent">Max drawdown (lowest first)</option>
              <option value="win_rate_percent">Win rate</option>
              <option value="sharpe_ratio">Sharpe ratio</option>
              <option value="sortino_ratio">Sortino ratio</option>
              <option value="recovery_factor">Recovery factor</option>
            </Select>
          </div>

          {/* Min Trades Threshold */}
          <div className="flex items-center gap-2">
            <span className="eyebrow">Min trades</span>
            <Select
              value={minTrades.toString()}
              onChange={(e) => setMinTrades(Number(e.target.value))}
              className="h-8 w-32 text-xs"
              aria-label="Minimum sample size"
            >
              <option value="0">Any</option>
              <option value="50">50+</option>
              <option value="100">100+</option>
              <option value="300">300+</option>
              <option value="500">500+</option>
              <option value="1000">1,000+</option>
            </Select>
          </div>

          {/* Source */}
          <div className="flex items-center gap-2">
            <span className="eyebrow">Source</span>
            <Select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="h-8 w-32 text-xs"
              aria-label="Filter by source"
            >
              <option value="all">All sources</option>
              <option value="TradingView">TradingView</option>
              <option value="Freqtrade">Freqtrade</option>
              <option value="Python">Python</option>
              <option value="Codex">Codex</option>
            </Select>
          </div>

          {/* OOS Tested */}
          <label className="flex cursor-pointer select-none items-center gap-1.5 text-xs text-foreground">
            <input
              type="checkbox"
              checked={oosOnly}
              onChange={(e) => setOosOnly(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-input accent-primary"
            />
            <span>OOS tested only</span>
          </label>
        </div>

        <p className="pr-1 font-mono text-[11px] text-muted-foreground">
          <span className="font-semibold text-foreground">
            {rankedBacktests.length}
          </span>{" "}
          qualifying
        </p>
      </div>

      {/* Ranked Leaderboard Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-14 pl-5 text-center">Rank</th>
                <th>Backtest</th>
                <th>Market</th>
                <th>Source</th>
                <th className="text-right">Trades</th>
                <th className="bg-primary/[0.06] text-right text-primary">
                  {getMetricLabel(primaryMetric)}
                </th>
                {showsSummary("profit_factor") && (
                  <th className="text-right">PF</th>
                )}
                {showsSummary("net_profit_percent") && (
                  <th className="text-right">Return</th>
                )}
                {showsSummary("max_drawdown_percent") && (
                  <th className="text-right">Max DD</th>
                )}
                {showsSummary("win_rate_percent") && (
                  <th className="text-right">Win rate</th>
                )}
                <th className="pr-5 text-right">Open</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableRowsSkeleton rows={10} cols={columnCount} />
              ) : rankedBacktests.length === 0 ? (
                <tr>
                  <td
                    colSpan={columnCount}
                    className="py-16 text-center text-xs text-muted-foreground"
                  >
                    No backtests clear these thresholds. Lower the minimum
                    sample size or widen the source filter.
                  </td>
                </tr>
              ) : (
                rankedBacktests.map((b, index) => {
                  const strategy = b.strategy_version?.strategy;
                  const version = b.strategy_version;

                  return (
                    <tr
                      key={b.id}
                      className="transition-colors hover:bg-accent/50"
                    >
                      <td className="pl-5">
                        <div className="flex justify-center">
                          {getRankBadge(index)}
                        </div>
                      </td>

                      <td className="max-w-[18rem]">
                        <Link
                          href={`/backtests/${b.id}`}
                          className="block truncate font-medium text-foreground hover:text-primary hover:underline"
                        >
                          {b.backtest_name}
                        </Link>
                        {strategy && (
                          <span className="block truncate font-mono text-[11px] text-muted-foreground">
                            {strategy.name} {version?.version_name}
                          </span>
                        )}
                      </td>

                      <td className="whitespace-nowrap font-mono">
                        <span className="font-semibold text-foreground">
                          {b.symbol}
                        </span>{" "}
                        <span className="text-muted-foreground">
                          {b.timeframe}
                        </span>
                      </td>

                      <td>
                        <Badge variant="outline" className="font-mono">
                          {b.source}
                        </Badge>
                      </td>

                      <td className="text-right font-mono text-muted-foreground">
                        {formatNumber(b.total_trades, 0)}
                      </td>

                      {/* The metric being ranked on */}
                      <td className="bg-primary/[0.05] text-right font-mono text-sm font-semibold text-foreground">
                        {primaryMetric.includes("percent")
                          ? formatPercent(b[primaryMetric])
                          : primaryMetric.includes("trades")
                          ? formatNumber(b[primaryMetric], 0)
                          : Number(b[primaryMetric]).toFixed(2)}
                      </td>

                      {showsSummary("profit_factor") && (
                        <td className="text-right font-mono text-foreground">
                          {b.profit_factor != null
                            ? Number(b.profit_factor).toFixed(2)
                            : "N/A"}
                        </td>
                      )}

                      {showsSummary("net_profit_percent") && (
                        <td className="text-right">
                          <span
                            className={
                              Number(b.net_profit_percent) >= 0
                                ? "val-gain"
                                : "val-loss"
                            }
                          >
                            {formatPercent(b.net_profit_percent)}
                          </span>
                        </td>
                      )}

                      {showsSummary("max_drawdown_percent") && (
                        <td className="text-right font-mono text-loss">
                          {formatPercent(b.max_drawdown_percent)}
                        </td>
                      )}

                      {showsSummary("win_rate_percent") && (
                        <td className="text-right font-mono text-muted-foreground">
                          {formatPercent(b.win_rate_percent)}
                        </td>
                      )}

                      <td className="pr-5 text-right">
                        <Link href={`/backtests/${b.id}`}>
                          <Button size="xs" variant="outline">
                            Open
                            <ArrowRight className="h-2.5 w-2.5" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
