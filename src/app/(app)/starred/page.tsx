"use client";

import React, { useEffect, useState, useMemo, Suspense, useDeferredValue } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { useAuth } from "@/components/providers/auth-provider";
import { createClient } from "@/utils/supabase/client";
import { BacktestRow } from "@/components/backtests/table/column-definitions";
import { BacktestsTable } from "@/components/backtests/table/backtests-table";
import { FilterPanel, FilterState, INITIAL_FILTER_STATE } from "@/components/backtests/table/filter-panel";
import { useStarredBacktests } from "@/lib/use-starred-backtests";
import { useCachedState, readQueryCache } from "@/lib/query-cache";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Star, FlaskConical, Trophy, RotateCcw } from "lucide-react";
import { formatPercent, formatNumber, getBacktestDurationDays } from "@/lib/utils";
import StarredLoading from "./loading";

function StarredPageContent() {
  const { user } = useAuth();
  const supabase = createClient();
  const { starredIds, toggleStar } = useStarredBacktests();

  const [strategies, setStrategies] = useState<any[]>([]);
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTER_STATE);

  const cacheKey = `starred:${filters.showArchived ? "archived" : "active"}`;
  const {
    data: backtests,
    setData: setBacktests,
    loading,
    setLoading,
    setIsRevalidating,
  } = useCachedState<BacktestRow[]>(cacheKey, []);

  // Load Strategies for the filter dropdown
  useEffect(() => {
    async function loadStrategies() {
      const { data } = await supabase
        .from("strategies")
        .select("id, name, strategy_family")
        .is("archived_at", null)
        .order("name");
      setStrategies(data || []);
    }
    loadStrategies();
  }, []);

  // Load Starred Backtests from database
  const loadStarredBacktests = async () => {
    if (!user?.id) return;
    const hasCached = readQueryCache(cacheKey) !== undefined;

    try {
      if (hasCached) setIsRevalidating(true);
      else setLoading(true);

      // 1. Fetch user's starred backtest records
      const { data: starRecords, error: starErr } = await supabase
        .from("starred_backtests")
        .select("backtest_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (starErr) throw starErr;

      if (!starRecords || starRecords.length === 0) {
        setBacktests([]);
        return;
      }

      const backtestIds = starRecords.map((r) => r.backtest_id);

      // 2. Fetch full backtest models for the starred IDs
      let query = supabase
        .from("backtests")
        .select(`
          *,
          strategy_version:strategy_versions(
            id,
            version_name,
            strategy:strategies(
              id,
              name,
              strategy_family
            )
          ),
          creator:profiles!backtests_created_by_fkey(display_name)
        `)
        .in("id", backtestIds);

      if (filters.showArchived) {
        query = query.not("archived_at", "is", null);
      } else {
        query = query.is("archived_at", null);
      }

      const { data: btData, error: btErr } = await query;
      if (btErr) throw btErr;

      // Preserve starred order (most recently starred first)
      const orderMap = new Map<string, number>();
      starRecords.forEach((r, idx) => orderMap.set(r.backtest_id, idx));

      const transformed: BacktestRow[] = (btData || [])
        .map((b: any) => ({
          ...b,
          duration_days: getBacktestDurationDays(b),
          is_starred: true,
          strategy_name: b.strategy_version?.strategy?.name || "Unknown Strategy",
          strategy_id: b.strategy_version?.strategy?.id,
          version_name: b.strategy_version?.version_name || "V1",
          creator_name: b.creator?.display_name || "Analyst",
        }))
        .sort((a, b) => {
          const orderA = orderMap.get(a.id) ?? 9999;
          const orderB = orderMap.get(b.id) ?? 9999;
          return orderA - orderB;
        });

      setBacktests(transformed);
    } catch (err) {
      console.error("Fetch starred backtests error:", err);
    } finally {
      setLoading(false);
      setIsRevalidating(false);
    }
  };

  useEffect(() => {
    loadStarredBacktests();
  }, [user?.id, filters.showArchived]);

  // Keep list synchronized when a star is toggled
  const handleToggleStar = async (row: BacktestRow) => {
    await toggleStar(row);
    // When unstarred, mark row as unstarred in view
    setBacktests((prev) =>
      prev.map((b) => (b.id === row.id ? { ...b, is_starred: !b.is_starred } : b))
    );
  };

  const deferredFilters = useDeferredValue(filters);

  // Apply Client-Side Multi-Criteria Filtering
  const filteredData = useMemo(() => {
    const activeFilters = deferredFilters;
    return backtests.filter((b) => {
      // 1. Text Search
      if (activeFilters.search.trim()) {
        const query = activeFilters.search.toLowerCase();
        const matchesName = b.backtest_name.toLowerCase().includes(query);
        const matchesSymbol = b.symbol.toLowerCase().includes(query);
        const matchesStrategy = (b.strategy_name || "").toLowerCase().includes(query);
        const matchesDetails = (b.details || "").toLowerCase().includes(query);
        if (!matchesName && !matchesSymbol && !matchesStrategy && !matchesDetails) return false;
      }

      // 2. Strategy Filter
      if (activeFilters.strategyId !== "all" && b.strategy_id !== activeFilters.strategyId) {
        return false;
      }

      // 3. Source Filter
      if (activeFilters.source !== "all" && b.source !== activeFilters.source) {
        return false;
      }

      // 4. Test Type Filter
      if (activeFilters.testType !== "all" && b.test_type !== activeFilters.testType) {
        return false;
      }

      // 5. Symbol Filter
      if (activeFilters.symbol.trim() && !b.symbol.toLowerCase().includes(activeFilters.symbol.toLowerCase())) {
        return false;
      }

      // 6. Timeframe Filter
      if (activeFilters.timeframe !== "all" && b.timeframe !== activeFilters.timeframe) {
        return false;
      }

      // 7. Direction Filter
      if (activeFilters.direction !== "all" && b.direction !== activeFilters.direction) {
        return false;
      }

      // 8. Total Trades Range
      if (activeFilters.tradesVal.trim() !== "" && b.total_trades !== null) {
        const val = Number(activeFilters.tradesVal);
        if (activeFilters.tradesOp === ">=" && !(b.total_trades >= val)) return false;
        if (activeFilters.tradesOp === "<=" && !(b.total_trades <= val)) return false;
        if (activeFilters.tradesOp === "=" && !(b.total_trades === val)) return false;
        if (activeFilters.tradesOp === ">" && !(b.total_trades > val)) return false;
        if (activeFilters.tradesOp === "<" && !(b.total_trades < val)) return false;
      }

      // 9. Profit Factor Range
      if (activeFilters.pfVal.trim() !== "" && b.profit_factor !== null) {
        const val = Number(activeFilters.pfVal);
        const pf = Number(b.profit_factor);
        if (activeFilters.pfOp === ">=" && !(pf >= val)) return false;
        if (activeFilters.pfOp === "<=" && !(pf <= val)) return false;
        if (activeFilters.pfOp === "=" && !(Math.abs(pf - val) < 0.001)) return false;
        if (activeFilters.pfOp === ">" && !(pf > val)) return false;
        if (activeFilters.pfOp === "<" && !(pf < val)) return false;
      }

      // 10. Max Drawdown %
      if (activeFilters.ddVal.trim() !== "" && b.max_drawdown_percent !== null) {
        const val = Number(activeFilters.ddVal);
        const dd = Number(b.max_drawdown_percent);
        if (activeFilters.ddOp === "<=" && !(dd <= val)) return false;
        if (activeFilters.ddOp === ">=" && !(dd >= val)) return false;
        if (activeFilters.ddOp === "=" && !(Math.abs(dd - val) < 0.01)) return false;
      }

      // 11. Net Profit %
      if (activeFilters.profitVal.trim() !== "" && b.net_profit_percent !== null) {
        const val = Number(activeFilters.profitVal);
        const ret = Number(b.net_profit_percent);
        if (activeFilters.profitOp === ">=" && !(ret >= val)) return false;
        if (activeFilters.profitOp === "<=" && !(ret <= val)) return false;
      }

      // 12. Win Rate %
      if (activeFilters.wrVal.trim() !== "" && b.win_rate_percent !== null) {
        const val = Number(activeFilters.wrVal);
        const wr = Number(b.win_rate_percent);
        if (activeFilters.wrOp === ">=" && !(wr >= val)) return false;
        if (activeFilters.wrOp === "<=" && !(wr <= val)) return false;
      }

      // 13. Integrity Filters
      if (activeFilters.feesIncludedOnly && !b.fees_included) return false;
      if (activeFilters.oosTestedOnly && !b.oos_tested) return false;

      // 14. Date Added Filter
      if (activeFilters.dateAddedRange !== "all" && b.created_at) {
        const itemDate = new Date(b.created_at);
        const now = new Date();
        if (activeFilters.dateAddedRange === "today") {
          const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          if (itemDate < startOfToday) return false;
        } else if (activeFilters.dateAddedRange === "7d") {
          const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (itemDate < cutoff) return false;
        } else if (activeFilters.dateAddedRange === "30d") {
          const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          if (itemDate < cutoff) return false;
        } else if (activeFilters.dateAddedRange === "90d") {
          const cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          if (itemDate < cutoff) return false;
        } else if (activeFilters.dateAddedRange === "custom") {
          if (activeFilters.dateAddedFrom) {
            const from = new Date(activeFilters.dateAddedFrom + "T00:00:00");
            if (itemDate < from) return false;
          }
          if (activeFilters.dateAddedTo) {
            const to = new Date(activeFilters.dateAddedTo + "T23:59:59.999");
            if (itemDate > to) return false;
          }
        }
      }

      // 15. Duration (Days) Filter
      if (activeFilters.daysVal && activeFilters.daysVal.trim() !== "") {
        const val = Number(activeFilters.daysVal);
        if (!isNaN(val)) {
          const duration = getBacktestDurationDays(b);
          if (duration === null || duration < val) return false;
        }
      }

      if (activeFilters.daysMaxVal && activeFilters.daysMaxVal.trim() !== "") {
        const maxVal = Number(activeFilters.daysMaxVal);
        if (!isNaN(maxVal)) {
          const duration = getBacktestDurationDays(b);
          if (duration === null || duration > maxVal) return false;
        }
      }

      return true;
    }).map((b) => ({
      ...b,
      is_starred: starredIds.has(b.id),
    }));
  }, [backtests, deferredFilters, starredIds]);

  // Distinct Symbols & Timeframes for filter inputs
  const allSymbols = useMemo(() => {
    return Array.from(new Set(backtests.map((b) => b.symbol))).filter(Boolean);
  }, [backtests]);

  const allTimeframes = useMemo(() => {
    return Array.from(new Set(backtests.map((b) => b.timeframe))).filter(Boolean);
  }, [backtests]);

  // KPI Summary Statistics
  const stats = useMemo(() => {
    if (backtests.length === 0) return null;

    const uniqueStrategies = new Set(backtests.map((b) => b.strategy_id).filter(Boolean));
    
    let maxPf: number | null = null;
    let maxProfit: number | null = null;
    let winRateSum = 0;
    let winRateCount = 0;

    backtests.forEach((b) => {
      if (b.profit_factor != null) {
        const pf = Number(b.profit_factor);
        if (maxPf === null || pf > maxPf) maxPf = pf;
      }
      if (b.net_profit_percent != null) {
        const p = Number(b.net_profit_percent);
        if (maxProfit === null || p > maxProfit) maxProfit = p;
      }
      if (b.win_rate_percent != null) {
        winRateSum += Number(b.win_rate_percent);
        winRateCount++;
      }
    });

    const avgWinRate = winRateCount > 0 ? winRateSum / winRateCount : null;

    return {
      totalStarred: backtests.length,
      strategiesCount: uniqueStrategies.size,
      maxPf,
      maxProfit,
      avgWinRate,
    };
  }, [backtests]);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Favorites"
        title="Starred"
        description="Curated collection of your favourite strategies and backtest results. Full performance metrics, column controls, and analytical records in one place."
      />

      {/* KPI Overview Cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-border bg-card p-3 shadow-plate">
            <span className="eyebrow block text-[10px]">Saved Backtests</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="font-mono text-xl font-bold text-foreground">
                {stats.totalStarred}
              </span>
              <span className="text-xs text-muted-foreground">
                across {stats.strategiesCount} {stats.strategiesCount === 1 ? "strategy" : "strategies"}
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-3 shadow-plate">
            <span className="eyebrow block text-[10px]">Top Profit Factor</span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className={`font-mono text-xl font-bold ${stats.maxPf != null && stats.maxPf >= 1.2 ? "text-profit" : "text-foreground"}`}>
                {formatNumber(stats.maxPf, 2)}
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-3 shadow-plate">
            <span className="eyebrow block text-[10px]">Top Net Return</span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className={`font-mono text-xl font-bold ${stats.maxProfit != null && stats.maxProfit > 0 ? "text-profit" : "text-foreground"}`}>
                {stats.maxProfit != null ? formatPercent(stats.maxProfit) : "N/A"}
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-3 shadow-plate">
            <span className="eyebrow block text-[10px]">Average Win Rate</span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="font-mono text-xl font-bold text-foreground">
                {stats.avgWinRate != null ? formatPercent(stats.avgWinRate) : "N/A"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {!loading && backtests.length === 0 ? (
        <EmptyState
          icon={<Star className="h-5 w-5 text-sun fill-sun" />}
          title="No starred strategies or backtests yet"
          description="Click the star button on any strategy or backtest in the Backtests or Leaderboard page to save your favourites here with all their results."
          action={
            <div className="flex items-center gap-3">
              <Link href="/backtests">
                <Button size="sm" variant="outline" className="gap-1.5">
                  <FlaskConical className="h-4 w-4 text-primary" />
                  Browse Backtests
                </Button>
              </Link>
              <Link href="/leaderboard">
                <Button size="sm" className="gap-1.5">
                  <Trophy className="h-4 w-4 text-sun" />
                  Explore Leaderboard
                </Button>
              </Link>
            </div>
          }
        />
      ) : (
        <>
          {/* Multi-Criteria Filter Panel */}
          <FilterPanel
            filters={filters}
            onFilterChange={setFilters}
            strategies={strategies}
            allSymbols={allSymbols}
            allTimeframes={allTimeframes}
          />

          {/* Table or Filtered Empty State */}
          {filteredData.length === 0 && !loading ? (
            <EmptyState
              title="No starred items match your filter"
              description="Try adjusting search terms or clearing some filter conditions."
              action={
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => setFilters(INITIAL_FILTER_STATE)}
                  className="gap-1.5"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset filters
                </Button>
              }
            />
          ) : (
            <BacktestsTable
              data={filteredData}
              loading={loading}
              onRefresh={loadStarredBacktests}
              onToggleStar={handleToggleStar}
              defaultSortColumn={
                (filters.daysVal && filters.daysVal.trim() !== "") ||
                (filters.daysMaxVal && filters.daysMaxVal.trim() !== "")
                  ? "duration_days"
                  : undefined
              }
              defaultSortDesc={true}
            />
          )}
        </>
      )}
    </div>
  );
}

export default function StarredPage() {
  return (
    <Suspense fallback={<StarredLoading />}>
      <StarredPageContent />
    </Suspense>
  );
}
