"use client";

import React, { useEffect, useState, useMemo } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { createClient } from "@/utils/supabase/client";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  X,
  RotateCcw,
  SlidersHorizontal,
  ArrowDown,
  ArrowUp,
  Plus,
} from "lucide-react";
import { useCachedState, readQueryCache } from "@/lib/query-cache";
import { useStarredBacktests } from "@/lib/use-starred-backtests";
import { LeaderboardTable } from "@/components/leaderboard/leaderboard-table";
import { BacktestRow, LeaderboardRow } from "@/components/backtests/table/column-definitions";
import { cn, getBacktestDurationDays } from "@/lib/utils";

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
  | "total_trades"
  | "payoff_ratio";

interface SortCriterion {
  metric: RankingMetric;
  desc: boolean;
}

interface RankingPreset {
  id: string;
  name: string;
  description: string;
  criteria: SortCriterion[];
}

const RANKING_METRICS_INFO: { id: RankingMetric; label: string; defaultDesc: boolean }[] = [
  { id: "profit_factor", label: "Profit Factor", defaultDesc: true },
  { id: "net_profit_percent", label: "Net Return %", defaultDesc: true },
  { id: "max_drawdown_percent", label: "Max Drawdown %", defaultDesc: false },
  { id: "win_rate_percent", label: "Win Rate %", defaultDesc: true },
  { id: "sharpe_ratio", label: "Sharpe Ratio", defaultDesc: true },
  { id: "sortino_ratio", label: "Sortino Ratio", defaultDesc: true },
  { id: "recovery_factor", label: "Recovery Factor", defaultDesc: true },
  { id: "calmar_ratio", label: "Calmar Ratio", defaultDesc: true },
  { id: "cagr_percent", label: "CAGR %", defaultDesc: true },
  { id: "average_trade_percent", label: "Avg Trade %", defaultDesc: true },
  { id: "total_trades", label: "Total Trades", defaultDesc: true },
  { id: "payoff_ratio", label: "Payoff Ratio", defaultDesc: true },
];

const RANKING_PRESETS: RankingPreset[] = [
  {
    id: "balanced",
    name: "Balanced Quality",
    description: "Profit Factor (High) → Max Drawdown (Low) → Total Trades (High)",
    criteria: [
      { metric: "profit_factor", desc: true },
      { metric: "max_drawdown_percent", desc: false },
      { metric: "total_trades", desc: true },
    ],
  },
  {
    id: "conservative",
    name: "Capital Preservation",
    description: "Max Drawdown (Low) → Profit Factor (High) → Sharpe Ratio (High)",
    criteria: [
      { metric: "max_drawdown_percent", desc: false },
      { metric: "profit_factor", desc: true },
      { metric: "sharpe_ratio", desc: true },
    ],
  },
  {
    id: "growth",
    name: "Aggressive Growth",
    description: "Net Return % (High) → Profit Factor (High) → Total Trades (High)",
    criteria: [
      { metric: "net_profit_percent", desc: true },
      { metric: "profit_factor", desc: true },
      { metric: "total_trades", desc: true },
    ],
  },
  {
    id: "risk_adjusted",
    name: "Risk-Adjusted Efficiency",
    description: "Sharpe Ratio (High) → Sortino Ratio (High) → Recovery Factor (High)",
    criteria: [
      { metric: "sharpe_ratio", desc: true },
      { metric: "sortino_ratio", desc: true },
      { metric: "recovery_factor", desc: true },
    ],
  },
  {
    id: "consistency",
    name: "High Consistency",
    description: "Win Rate % (High) → Profit Factor (High) → Max Drawdown (Low)",
    criteria: [
      { metric: "win_rate_percent", desc: true },
      { metric: "profit_factor", desc: true },
      { metric: "max_drawdown_percent", desc: false },
    ],
  },
];

const EPSILON = 1e-5;

export default function LeaderboardPage() {
  const supabase = createClient();
  const { starredIds, toggleStar } = useStarredBacktests();

  // Multi-Column Ranking Criteria (Primary, Secondary, Tertiary...)
  const [sortCriteria, setSortCriteria] = useState<SortCriterion[]>([
    { metric: "profit_factor", desc: true },
    { metric: "max_drawdown_percent", desc: false },
    { metric: "total_trades", desc: true },
  ]);

  // Primary metric is the first criterion
  const primaryMetric = sortCriteria[0]?.metric || "profit_factor";
  const primaryDesc = sortCriteria[0]?.desc ?? true;

  // Filter criteria
  const [minTrades, setMinTrades] = useState<number>(100);
  const [minDays, setMinDays] = useState<string>("");
  const [symbolFilter, setSymbolFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [dateAddedRange, setDateAddedRange] = useState<"all" | "today" | "7d" | "30d" | "90d" | "custom">("all");
  const [dateAddedFrom, setDateAddedFrom] = useState("");
  const [dateAddedTo, setDateAddedTo] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [oosOnly, setOosOnly] = useState(false);

  const cacheKey = `leaderboard:${primaryMetric}:${primaryDesc ? "desc" : "asc"}`;
  const {
    data: backtests,
    setData: setBacktests,
    loading,
    setLoading,
    setIsRevalidating,
  } = useCachedState<BacktestRow[]>(cacheKey, []);

  const loadData = async () => {
    const hasCached = readQueryCache(cacheKey) !== undefined;
    try {
      if (hasCached) setIsRevalidating(true);
      else setLoading(true);

      const PAGE_SIZE = 1000;
      const MAX_ROWS = 1500;
      const allRows: any[] = [];
      let from = 0;

      while (from < MAX_ROWS) {
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
          .order(primaryMetric, { ascending: !primaryDesc, nullsFirst: false })
          .range(from, from + PAGE_SIZE - 1);

        if (error) {
          console.warn("Leaderboard query warning/error:", error.message);
          break;
        }
        if (!data || data.length === 0) break;
        allRows.push(...data);
        if (data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }

      const transformed: BacktestRow[] = allRows.map((b: any) => ({
        ...b,
        duration_days: getBacktestDurationDays(b),
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
  }, [primaryMetric, primaryDesc]);

  // Priority map for columns highlighting: { [metric]: rankPriority }
  const rankingPriority = useMemo(() => {
    const map: Record<string, number> = {};
    sortCriteria.forEach((crit, index) => {
      map[crit.metric] = index + 1;
    });
    return map;
  }, [sortCriteria]);

  // Criteria manipulation handlers
  const handleUpdateCriterionMetric = (index: number, newMetric: RankingMetric) => {
    setSortCriteria((prev) => {
      const next = [...prev];
      const info = RANKING_METRICS_INFO.find((m) => m.id === newMetric);
      next[index] = {
        metric: newMetric,
        desc: info ? info.defaultDesc : true,
      };
      return next;
    });
  };

  const handleToggleDirection = (index: number) => {
    setSortCriteria((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], desc: !next[index].desc };
      return next;
    });
  };

  const handleAddCriterion = () => {
    if (sortCriteria.length >= 4) return;
    const used = new Set(sortCriteria.map((c) => c.metric));
    const available = RANKING_METRICS_INFO.find((m) => !used.has(m.id));
    if (!available) return;
    setSortCriteria((prev) => [
      ...prev,
      { metric: available.id, desc: available.defaultDesc },
    ]);
  };

  const handleRemoveCriterion = (index: number) => {
    if (sortCriteria.length <= 1) return; // Keep at least 1 primary metric
    setSortCriteria((prev) => prev.filter((_, i) => i !== index));
  };

  const handleApplyPreset = (preset: RankingPreset) => {
    setSortCriteria([...preset.criteria]);
  };

  // Determine active preset if criteria matches
  const activePresetId = useMemo(() => {
    const match = RANKING_PRESETS.find((p) => {
      if (p.criteria.length !== sortCriteria.length) return false;
      return p.criteria.every(
        (c, idx) => c.metric === sortCriteria[idx].metric && c.desc === sortCriteria[idx].desc
      );
    });
    return match ? match.id : null;
  }, [sortCriteria]);

  // Extract unique available symbols for the dropdown filter
  const availableSymbols = useMemo(() => {
    const set = new Set<string>();
    backtests.forEach((b) => {
      if (b.symbol) set.add(b.symbol);
    });
    return Array.from(set).sort();
  }, [backtests]);

  const isDefaultCriteria =
    sortCriteria.length === 3 &&
    sortCriteria[0].metric === "profit_factor" &&
    sortCriteria[0].desc === true &&
    sortCriteria[1].metric === "max_drawdown_percent" &&
    sortCriteria[1].desc === false &&
    sortCriteria[2].metric === "total_trades" &&
    sortCriteria[2].desc === true;

  const hasActiveFilters =
    !isDefaultCriteria ||
    minTrades !== 100 ||
    minDays.trim() !== "" ||
    symbolFilter !== "all" ||
    sourceFilter !== "all" ||
    dateAddedRange !== "all" ||
    searchQuery.trim() !== "" ||
    oosOnly;

  const handleResetFilters = () => {
    setSortCriteria([
      { metric: "profit_factor", desc: true },
      { metric: "max_drawdown_percent", desc: false },
      { metric: "total_trades", desc: true },
    ]);
    setMinTrades(100);
    setMinDays("");
    setSymbolFilter("all");
    setSourceFilter("all");
    setDateAddedRange("all");
    setDateAddedFrom("");
    setDateAddedTo("");
    setSearchQuery("");
    setOosOnly(false);
  };

  // Hierarchical Multi-Level Filtering and Ranking
  const rankedBacktests = useMemo<LeaderboardRow[]>(() => {
    const query = searchQuery.trim().toLowerCase();

    return backtests
      .filter((b) => {
        // Trade count threshold
        if (minTrades > 0 && (b.total_trades === null || b.total_trades < minTrades)) {
          return false;
        }

        // Min Days threshold
        if (minDays.trim() !== "") {
          const daysThreshold = Number(minDays);
          if (!isNaN(daysThreshold)) {
            const duration = getBacktestDurationDays(b);
            if (duration === null || duration < daysThreshold) {
              return false;
            }
          }
        }

        // Symbol dropdown filter
        if (symbolFilter !== "all" && b.symbol !== symbolFilter) {
          return false;
        }

        // Source platform
        if (sourceFilter !== "all" && b.source !== sourceFilter) {
          return false;
        }

        // Date Added Filter
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

        // Primary metric must not be null or undefined
        const primaryVal = b[primaryMetric as keyof BacktestRow];
        if (primaryVal === null || primaryVal === undefined) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        // Multi-level hierarchical comparison loop
        for (const crit of sortCriteria) {
          const rawA = a[crit.metric as keyof BacktestRow];
          const rawB = b[crit.metric as keyof BacktestRow];

          const isNullA = rawA === null || rawA === undefined;
          const isNullB = rawB === null || rawB === undefined;

          // Rows with null sink below rows with valid values
          if (isNullA && !isNullB) return 1;
          if (!isNullA && isNullB) return -1;
          if (isNullA && isNullB) continue;

          const valA = Number(rawA);
          const valB = Number(rawB);

          if (isNaN(valA) && !isNaN(valB)) return 1;
          if (!isNaN(valA) && isNaN(valB)) return -1;
          if (isNaN(valA) && isNaN(valB)) continue;

          // Compute difference based on sort direction
          const diff = crit.desc ? valB - valA : valA - valB;
          if (Math.abs(diff) > EPSILON) {
            return diff;
          }
          // If tied within floating-point epsilon, evaluate next tie-breaker
        }

        // Deterministic fallback tie-breakers
        const tradesA = Number(a.total_trades) || 0;
        const tradesB = Number(b.total_trades) || 0;
        if (tradesA !== tradesB) return tradesB - tradesA;

        const pfA = Number(a.profit_factor) || 0;
        const pfB = Number(b.profit_factor) || 0;
        if (pfA !== pfB) return pfB - pfA;

        return (a.id || "").localeCompare(b.id || "");
      })
      .map((b, index) => ({
        ...b,
        rank: index + 1,
        is_starred: starredIds.has(b.id),
      }));
  }, [
    backtests,
    sortCriteria,
    primaryMetric,
    minTrades,
    minDays,
    symbolFilter,
    sourceFilter,
    dateAddedRange,
    dateAddedFrom,
    dateAddedTo,
    searchQuery,
    oosOnly,
    starredIds,
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Analysis"
        title="Leaderboard"
        description="Multi-column hierarchical ranking engine. Prioritize primary metrics and resolve ties with secondary and tertiary tie-breakers."
      />

      {/* Multi-Column Ranking Hierarchy Panel */}
      <div className="rounded-lg border border-border bg-card p-3 shadow-plate space-y-3">
        {/* Header row: Title + Presets */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
              <SlidersHorizontal className="h-3.5 w-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-semibold text-foreground tracking-tight">
                  Multi-Column Rank Hierarchy
                </h2>
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                  {sortCriteria.length} level{sortCriteria.length > 1 ? "s" : ""}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Primary metric sets the rank, followed by tie-breakers in exact priority order
              </p>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="eyebrow shrink-0 text-[10px] text-muted-foreground/80">Presets:</span>
            <div className="flex flex-wrap items-center gap-1">
              {RANKING_PRESETS.map((preset) => {
                const isCurrent = activePresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className={cn(
                      "rounded px-2 py-1 text-[11px] font-medium transition-colors",
                      isCurrent
                        ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                    title={preset.description}
                  >
                    {preset.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Criteria Hierarchy List */}
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          {sortCriteria.map((crit, index) => {
            const isPrimary = index === 0;
            return (
              <div
                key={index}
                className={cn(
                  "flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs transition-all w-full sm:w-auto",
                  isPrimary
                    ? "border-primary/40 bg-primary/[0.04] shadow-xs"
                    : "border-border bg-card hover:border-border/80"
                )}
              >
                {/* Level Badge */}
                <div className="flex items-center gap-1 shrink-0">
                  <span
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded font-mono text-[10px] font-bold",
                      isPrimary
                        ? "bg-primary text-primary-foreground"
                        : index === 1
                        ? "bg-amber-500/20 text-amber-500 font-bold"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    #{index + 1}
                  </span>
                  <span className="hidden sm:inline text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {isPrimary ? "Primary" : `Tie-breaker ${index}`}
                  </span>
                </div>

                {/* Metric Selector */}
                <select
                  value={crit.metric}
                  onChange={(e) => handleUpdateCriterionMetric(index, e.target.value as RankingMetric)}
                  aria-label={`Ranking criterion #${index + 1}`}
                  className="h-7 min-w-0 flex-1 sm:w-40 rounded border border-border bg-background px-2 py-0 text-xs font-medium text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {RANKING_METRICS_INFO.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>

                {/* Direction Toggle */}
                <button
                  type="button"
                  onClick={() => handleToggleDirection(index)}
                  className={cn(
                    "flex h-7 shrink-0 items-center gap-1 rounded border px-2 text-[11px] font-medium whitespace-nowrap transition-colors",
                    crit.desc
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                      : "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20"
                  )}
                  title={crit.desc ? "Sorting High → Low (click to invert)" : "Sorting Low → High (click to invert)"}
                >
                  {crit.desc ? (
                    <>
                      <ArrowDown className="h-3 w-3" />
                      <span>High → Low</span>
                    </>
                  ) : (
                    <>
                      <ArrowUp className="h-3 w-3" />
                      <span>Low → High</span>
                    </>
                  )}
                </button>

                {/* Remove button for tie-breakers */}
                {!isPrimary && (
                  <button
                    type="button"
                    onClick={() => handleRemoveCriterion(index)}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors ml-0.5"
                    title="Remove tie-breaker"
                    aria-label="Remove tie-breaker"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}

          {/* Add Tie-breaker Button */}
          {sortCriteria.length < 4 && (
            <Button
              size="xs"
              variant="outline"
              onClick={handleAddCriterion}
              className="h-8 gap-1 border-dashed text-xs text-muted-foreground hover:border-primary hover:text-primary"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Tie-breaker</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-2.5 text-xs shadow-plate">
        <div className="flex w-full flex-wrap items-center gap-2.5 sm:w-auto">
          {/* Min Trades Threshold */}
          <div className="flex w-[calc(50%-0.375rem)] items-center gap-1.5 sm:w-auto">
            <span className="eyebrow shrink-0">Min trades</span>
            <Select
              value={minTrades.toString()}
              onChange={(e) => setMinTrades(Number(e.target.value))}
              className="h-8 w-full sm:w-28 text-xs"
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

          {/* Day Box (Min Days) */}
          <div className="flex h-8 w-[calc(50%-0.375rem)] sm:w-auto items-center gap-1.5 rounded-md border border-input bg-card px-2 shadow-plate focus-within:border-primary">
            <span className="eyebrow shrink-0">Days &ge;</span>
            <input
              type="number"
              min="0"
              value={minDays}
              onChange={(e) => setMinDays(e.target.value)}
              placeholder="200"
              aria-label="Filter by minimum days"
              className="w-14 bg-transparent font-mono text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
            />
            {minDays && (
              <button
                type="button"
                onClick={() => setMinDays("")}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Clear days filter"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Symbol Filter */}
          <div className="flex w-[calc(50%-0.375rem)] items-center gap-1.5 sm:w-auto">
            <span className="eyebrow shrink-0">Symbol</span>
            <Select
              value={symbolFilter}
              onChange={(e) => setSymbolFilter(e.target.value)}
              className="h-8 w-full sm:w-36 text-xs font-mono"
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
          <div className="flex w-[calc(50%-0.375rem)] items-center gap-1.5 sm:w-auto">
            <span className="eyebrow shrink-0">Source</span>
            <Select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="h-8 w-full sm:w-32 text-xs"
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
          <div className="flex w-[calc(50%-0.375rem)] items-center gap-1.5 sm:w-auto">
            <span className="eyebrow shrink-0">Date added</span>
            <Select
              value={dateAddedRange}
              onChange={(e) => setDateAddedRange(e.target.value as any)}
              className="h-8 w-full sm:w-36 text-xs"
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
            <div className="flex w-full items-center gap-1 sm:w-auto">
              <Input
                type="date"
                value={dateAddedFrom}
                onChange={(e) => setDateAddedFrom(e.target.value)}
                aria-label="Date added from"
                className="h-8 w-full sm:w-32 font-mono text-xs px-2"
                title="Date added from"
              />
              <span className="text-muted-foreground text-xs">to</span>
              <Input
                type="date"
                value={dateAddedTo}
                onChange={(e) => setDateAddedTo(e.target.value)}
                aria-label="Date added to"
                className="h-8 w-full sm:w-32 font-mono text-xs px-2"
                title="Date added to"
              />
            </div>
          )}

          {/* Symbol / Name search */}
          <div className="relative flex w-full items-center sm:w-44">
            <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Filter symbol / name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-full pl-8 pr-7 text-xs"
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
              title="Reset filters and ranking to defaults"
            >
              <RotateCcw className="h-3 w-3" />
              Reset all
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

      {/* TanStack-Powered Leaderboard Table with Multi-Column Ranking Badges */}
      <LeaderboardTable
        data={rankedBacktests}
        loading={loading}
        primaryMetric={primaryMetric}
        rankingPriority={rankingPriority}
        onRefresh={loadData}
        onToggleStar={toggleStar}
      />
    </div>
  );
}
