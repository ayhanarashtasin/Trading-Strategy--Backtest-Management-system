"use client";

import React, { useEffect, useState, useMemo } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { createClient } from "@/utils/supabase/client";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, RotateCcw } from "lucide-react";
import { useCachedState, readQueryCache } from "@/lib/query-cache";
import { LeaderboardTable } from "@/components/leaderboard/leaderboard-table";
import { BacktestRow, LeaderboardRow } from "@/components/backtests/table/column-definitions";

type RankingMetric =
  | "profit_factor"
  | "net_profit_percent"
  | "max_drawdown_percent"
  | "win_rate_percent"
  | "sharpe_ratio"
  | "sortino_ratio"
  | "recovery_factor"
  | "calmar_ratio"
  | "cagr_percent"
  | "average_trade_percent"
  | "total_trades";

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
  } = useCachedState<BacktestRow[]>("leaderboard:active", []);

  // Leaderboard criteria
  const [primaryMetric, setPrimaryMetric] = useState<RankingMetric>("profit_factor");
  const [minTrades, setMinTrades] = useState<number>(100);
  const [symbolFilter, setSymbolFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [dateAddedRange, setDateAddedRange] = useState<"all" | "today" | "7d" | "30d" | "90d" | "custom">("all");
  const [dateAddedFrom, setDateAddedFrom] = useState("");
  const [dateAddedTo, setDateAddedTo] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [oosOnly, setOosOnly] = useState(false);

  const loadData = async () => {
    const hasCached = readQueryCache("leaderboard:active") !== undefined;
    try {
      if (hasCached) setIsRevalidating(true);
      else setLoading(true);

      const PAGE_SIZE = 1000;
      let allRows: any[] = [];
      let from = 0;

      while (true) {
        const { data, error } = await supabase
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
          .is("archived_at", null)
          .order("created_at", { ascending: false })
          .range(from, from + PAGE_SIZE - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;
        allRows.push(...data);
        if (data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }

      const transformed: BacktestRow[] = allRows.map((b: any) => ({
        ...b,
        strategy_name: b.strategy_version?.strategy?.name || "Unknown Strategy",
        strategy_id: b.strategy_version?.strategy?.id,
        version_name: b.strategy_version?.version_name || "V1",
        creator_name: b.creator?.display_name || "Analyst",
      }));

      setBacktests(transformed);
    } catch (err) {
      console.error("Load leaderboard error:", err);
    } finally {
      setLoading(false);
      setIsRevalidating(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Extract unique available symbols for the dropdown filter
  const availableSymbols = useMemo(() => {
    const set = new Set<string>();
    backtests.forEach((b) => {
      if (b.symbol) set.add(b.symbol);
    });
    return Array.from(set).sort();
  }, [backtests]);

  const hasActiveFilters =
    primaryMetric !== "profit_factor" ||
    minTrades !== 100 ||
    symbolFilter !== "all" ||
    sourceFilter !== "all" ||
    dateAddedRange !== "all" ||
    searchQuery.trim() !== "" ||
    oosOnly;

  const handleResetFilters = () => {
    setPrimaryMetric("profit_factor");
    setMinTrades(100);
    setSymbolFilter("all");
    setSourceFilter("all");
    setDateAddedRange("all");
    setDateAddedFrom("");
    setDateAddedTo("");
    setSearchQuery("");
    setOosOnly(false);
  };

  // Filter and rank backtests
  const rankedBacktests = useMemo<LeaderboardRow[]>(() => {
    const query = searchQuery.trim().toLowerCase();

    return backtests
      .filter((b) => {
        // Trade count threshold
        if (minTrades > 0 && (b.total_trades === null || b.total_trades < minTrades)) {
          return false;
        }

        // Symbol dropdown filter
        if (symbolFilter !== "all" && b.symbol !== symbolFilter) {
          return false;
        }

        // Source platform
        if (sourceFilter !== "all" && b.source !== sourceFilter) {
          return false;
        }

        // Date Added (Inserted into website) Filter
        if (dateAddedRange !== "all") {
          if (!b.created_at) return false;
          const itemDate = new Date(b.created_at);
          const now = new Date();
          if (dateAddedRange === "today") {
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const within24Hours = (now.getTime() - itemDate.getTime()) <= 24 * 60 * 60 * 1000 && (now.getTime() - itemDate.getTime()) >= 0;
            if (itemDate < startOfToday && !within24Hours) return false;
          } else if (dateAddedRange === "7d") {
            const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            if (itemDate < cutoff) return false;
          } else if (dateAddedRange === "30d") {
            const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            if (itemDate < cutoff) return false;
          } else if (dateAddedRange === "90d") {
            const cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            if (itemDate < cutoff) return false;
          } else if (dateAddedRange === "custom") {
            if (dateAddedFrom) {
              const from = new Date(dateAddedFrom + "T00:00:00");
              if (itemDate < from) return false;
            }
            if (dateAddedTo) {
              const to = new Date(dateAddedTo + "T23:59:59.999");
              if (itemDate > to) return false;
            }
          }
        }

        // Symbol / Name / Strategy search
        if (query) {
          const matchSymbol = b.symbol?.toLowerCase().includes(query);
          const matchName = b.backtest_name?.toLowerCase().includes(query);
          const matchStrat = (b.strategy_name || "").toLowerCase().includes(query);
          if (!matchSymbol && !matchName && !matchStrat) return false;
        }

        // OOS Tested
        if (oosOnly && !b.oos_tested) {
          return false;
        }

        // Metric must not be null or undefined
        const val = b[primaryMetric as keyof BacktestRow];
        if (val === null || val === undefined) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        const valA = Number(a[primaryMetric as keyof BacktestRow]);
        const valB = Number(b[primaryMetric as keyof BacktestRow]);

        // Max Drawdown is ranked lowest-first (smaller DD is superior)
        if (primaryMetric === "max_drawdown_percent") {
          if (valA !== valB) return valA - valB;
        } else {
          if (valA !== valB) return valB - valA;
        }

        // Deterministic tie-breaker: profit factor, then total trades
        const pfA = Number(a.profit_factor) || 0;
        const pfB = Number(b.profit_factor) || 0;
        if (pfA !== pfB) return pfB - pfA;

        return (b.total_trades || 0) - (a.total_trades || 0);
      })
      .map((b, index) => ({
        ...b,
        rank: index + 1,
      }));
  }, [backtests, primaryMetric, minTrades, symbolFilter, sourceFilter, dateAddedRange, dateAddedFrom, dateAddedTo, searchQuery, oosOnly]);

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
              <option value="calmar_ratio">Calmar ratio</option>
              <option value="cagr_percent">CAGR %</option>
              <option value="average_trade_percent">Avg trade return</option>
              <option value="total_trades">Total trades</option>
            </Select>
          </div>

          {/* Min Trades Threshold */}
          <div className="flex items-center gap-2">
            <span className="eyebrow">Min trades</span>
            <Select
              value={minTrades.toString()}
              onChange={(e) => setMinTrades(Number(e.target.value))}
              className="h-8 w-28 text-xs"
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

          {/* Symbol Filter */}
          <div className="flex items-center gap-2">
            <span className="eyebrow">Symbol</span>
            <Select
              value={symbolFilter}
              onChange={(e) => setSymbolFilter(e.target.value)}
              className="h-8 w-36 text-xs font-mono"
              aria-label="Filter by symbol"
            >
              <option value="all">All symbols</option>
              {availableSymbols.map((sym) => (
                <option key={sym} value={sym}>
                  {sym}
                </option>
              ))}
            </Select>
          </div>

          {/* Source Filter */}
          <div className="flex items-center gap-2">
            <span className="eyebrow">Source</span>
            <Select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="h-8 w-32 text-xs"
              aria-label="Filter by source"
            >
              <option value="all">All sources</option>
              <option value="AggTrades">AggTrades</option>
              <option value="TradingView">TradingView</option>
              <option value="Freqtrade">Freqtrade</option>
              <option value="Python">Python</option>
              <option value="Codex">Codex</option>
              <option value="Manual">Manual</option>
              <option value="Other">Other</option>
            </Select>
          </div>

          {/* Date Added Filter */}
          <div className="flex items-center gap-2">
            <span className="eyebrow">Date added</span>
            <Select
              value={dateAddedRange}
              onChange={(e) => setDateAddedRange(e.target.value as any)}
              className="h-8 w-36 text-xs"
              aria-label="Filter leaderboard by date added"
            >
              <option value="all">Any date added</option>
              <option value="today">Added today</option>
              <option value="7d">Added past 7 days</option>
              <option value="30d">Added past 30 days</option>
              <option value="90d">Added past 90 days</option>
              <option value="custom">Custom date…</option>
            </Select>
          </div>

          {dateAddedRange === "custom" && (
            <div className="flex items-center gap-1">
              <Input
                type="date"
                value={dateAddedFrom}
                onChange={(e) => setDateAddedFrom(e.target.value)}
                aria-label="Date added from"
                className="h-8 w-32 font-mono text-xs px-2"
                title="Date added from"
              />
              <span className="text-muted-foreground text-xs">to</span>
              <Input
                type="date"
                value={dateAddedTo}
                onChange={(e) => setDateAddedTo(e.target.value)}
                aria-label="Date added to"
                className="h-8 w-32 font-mono text-xs px-2"
                title="Date added to"
              />
            </div>
          )}

          {/* Symbol / Name search */}
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Filter symbol / name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-44 pl-8 pr-7 text-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
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

          {/* Reset button */}
          {hasActiveFilters && (
            <Button
              size="xs"
              variant="ghost"
              onClick={handleResetFilters}
              className="h-7 gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground"
              title="Reset filters to defaults"
            >
              <RotateCcw className="h-3 w-3" />
              Reset filters
            </Button>
          )}
        </div>

        <p className="pr-1 font-mono text-[11px] text-muted-foreground">
          <span className="font-semibold text-foreground">
            {rankedBacktests.length}
          </span>{" "}
          qualifying
        </p>
      </div>

      {/* TanStack-Powered Leaderboard Table with All Backtest Columns */}
      <LeaderboardTable
        data={rankedBacktests}
        loading={loading}
        primaryMetric={primaryMetric}
        onRefresh={loadData}
      />
    </div>
  );
}
