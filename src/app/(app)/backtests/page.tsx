"use client";

import React, { useEffect, useState, useMemo, Suspense, useDeferredValue } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { useAuth } from "@/components/providers/auth-provider";
import { createClient } from "@/utils/supabase/client";
import { BacktestRow } from "@/components/backtests/table/column-definitions";
import { BacktestsTable } from "@/components/backtests/table/backtests-table";
import { FilterPanel, FilterState, INITIAL_FILTER_STATE } from "@/components/backtests/table/filter-panel";
import { SaveViewDialog } from "@/components/backtests/table/save-view-dialog";
import { Button } from "@/components/ui/button";
import { Plus, Bookmark } from "lucide-react";
import { useCachedState, readQueryCache } from "@/lib/query-cache";
import BacktestsLoading from "./loading";

function BacktestsPageContent() {
  const { canEdit, user } = useAuth();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [strategies, setStrategies] = useState<any[]>([]);
  const [savedViews, setSavedViews] = useState<any[]>([]);

  // Filters State
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTER_STATE);

  /* Archived and active are separate result sets, so they cache separately. */
  const cacheKey = `backtests:${filters.showArchived ? "archived" : "active"}`;
  const {
    data: backtests,
    setData: setBacktests,
    loading,
    setLoading,
    setIsRevalidating,
  } = useCachedState<BacktestRow[]>(cacheKey, []);
  const [saveViewOpen, setSaveViewOpen] = useState(false);

  // Load Strategies & Saved Views
  useEffect(() => {
    async function loadMeta() {
      // Two independent lookups — one round-trip, not two.
      const [{ data: strats }, views] = await Promise.all([
        supabase
          .from("strategies")
          .select("id, name, strategy_family")
          .is("archived_at", null)
          .order("name"),
        user?.id
          ? supabase.from("saved_views").select("*").order("name")
          : Promise.resolve({ data: [] as any[] }),
      ]);
      setStrategies(strats || []);
      setSavedViews(views.data || []);
    }
    loadMeta();
  }, [user?.id]);

  // Load Backtests from database
  const loadBacktests = async () => {
    const hasCached = readQueryCache(cacheKey) !== undefined;
    try {
      if (hasCached) setIsRevalidating(true);
      else setLoading(true);
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
        .order("created_at", { ascending: false });

      if (filters.showArchived) {
        query = query.not("archived_at", "is", null);
      } else {
        query = query.is("archived_at", null);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Transform rows for flat TanStack table access
      const transformed: BacktestRow[] = (data || []).map((b: any) => ({
        ...b,
        strategy_name: b.strategy_version?.strategy?.name || "Unknown Strategy",
        strategy_id: b.strategy_version?.strategy?.id,
        version_name: b.strategy_version?.version_name || "V1",
        creator_name: b.creator?.display_name || "Analyst",
      }));

      setBacktests(transformed);
    } catch (err) {
      console.error("Fetch backtests error:", err);
    } finally {
      setLoading(false);
      setIsRevalidating(false);
    }
  };

  useEffect(() => {
    loadBacktests();
  }, [filters.showArchived]);

  /* Filter off a deferred copy so the search box and the filter controls stay
     responsive while the table re-renders behind them. */
  const deferredFilters = useDeferredValue(filters);

  // Apply Client-Side Multi-Criteria Filtering
  const filteredData = useMemo(() => {
    const filters = deferredFilters;
    return backtests.filter((b) => {
      // 1. Text Search
      if (filters.search.trim()) {
        const query = filters.search.toLowerCase();
        const matchesName = b.backtest_name.toLowerCase().includes(query);
        const matchesSymbol = b.symbol.toLowerCase().includes(query);
        const matchesStrategy = (b.strategy_name || "").toLowerCase().includes(query);
        const matchesDetails = (b.details || "").toLowerCase().includes(query);
        if (!matchesName && !matchesSymbol && !matchesStrategy && !matchesDetails) return false;
      }

      // 2. Strategy Filter
      if (filters.strategyId !== "all" && b.strategy_id !== filters.strategyId) {
        return false;
      }

      // 3. Source Filter
      if (filters.source !== "all" && b.source !== filters.source) {
        return false;
      }

      // 4. Test Type Filter
      if (filters.testType !== "all" && b.test_type !== filters.testType) {
        return false;
      }

      // 5. Symbol Filter
      if (filters.symbol.trim() && !b.symbol.toLowerCase().includes(filters.symbol.toLowerCase())) {
        return false;
      }

      // 6. Timeframe Filter
      if (filters.timeframe !== "all" && b.timeframe !== filters.timeframe) {
        return false;
      }

      // 7. Direction Filter
      if (filters.direction !== "all" && b.direction !== filters.direction) {
        return false;
      }

      // 8. Total Trades Range
      if (filters.tradesVal.trim() !== "" && b.total_trades !== null) {
        const val = Number(filters.tradesVal);
        if (filters.tradesOp === ">=" && !(b.total_trades >= val)) return false;
        if (filters.tradesOp === "<=" && !(b.total_trades <= val)) return false;
        if (filters.tradesOp === "=" && !(b.total_trades === val)) return false;
        if (filters.tradesOp === ">" && !(b.total_trades > val)) return false;
        if (filters.tradesOp === "<" && !(b.total_trades < val)) return false;
      }

      // 9. Profit Factor Range
      if (filters.pfVal.trim() !== "" && b.profit_factor !== null) {
        const val = Number(filters.pfVal);
        const pf = Number(b.profit_factor);
        if (filters.pfOp === ">=" && !(pf >= val)) return false;
        if (filters.pfOp === "<=" && !(pf <= val)) return false;
        if (filters.pfOp === "=" && !(Math.abs(pf - val) < 0.001)) return false;
        if (filters.pfOp === ">" && !(pf > val)) return false;
        if (filters.pfOp === "<" && !(pf < val)) return false;
      }

      // 10. Max Drawdown %
      if (filters.ddVal.trim() !== "" && b.max_drawdown_percent !== null) {
        const val = Number(filters.ddVal);
        const dd = Number(b.max_drawdown_percent);
        if (filters.ddOp === "<=" && !(dd <= val)) return false;
        if (filters.ddOp === ">=" && !(dd >= val)) return false;
        if (filters.ddOp === "=" && !(Math.abs(dd - val) < 0.01)) return false;
      }

      // 11. Net Profit %
      if (filters.profitVal.trim() !== "" && b.net_profit_percent !== null) {
        const val = Number(filters.profitVal);
        const ret = Number(b.net_profit_percent);
        if (filters.profitOp === ">=" && !(ret >= val)) return false;
        if (filters.profitOp === "<=" && !(ret <= val)) return false;
      }

      // 12. Win Rate %
      if (filters.wrVal.trim() !== "" && b.win_rate_percent !== null) {
        const val = Number(filters.wrVal);
        const wr = Number(b.win_rate_percent);
        if (filters.wrOp === ">=" && !(wr >= val)) return false;
        if (filters.wrOp === "<=" && !(wr <= val)) return false;
      }

      // 13. Integrity Filters
      if (filters.feesIncludedOnly && !b.fees_included) return false;
      if (filters.oosTestedOnly && !b.oos_tested) return false;

      // 14. Date Added (Inserted into website) Filter
      if (filters.dateAddedRange !== "all" && b.created_at) {
        const itemDate = new Date(b.created_at);
        const now = new Date();
        if (filters.dateAddedRange === "today") {
          const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          if (itemDate < startOfToday) return false;
        } else if (filters.dateAddedRange === "7d") {
          const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (itemDate < cutoff) return false;
        } else if (filters.dateAddedRange === "30d") {
          const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          if (itemDate < cutoff) return false;
        } else if (filters.dateAddedRange === "90d") {
          const cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          if (itemDate < cutoff) return false;
        } else if (filters.dateAddedRange === "custom") {
          if (filters.dateAddedFrom) {
            const from = new Date(filters.dateAddedFrom + "T00:00:00");
            if (itemDate < from) return false;
          }
          if (filters.dateAddedTo) {
            const to = new Date(filters.dateAddedTo + "T23:59:59.999");
            if (itemDate > to) return false;
          }
        }
      }

      return true;
    });
  }, [backtests, deferredFilters]);

  // Distinct Symbols & Timeframes
  const allSymbols = useMemo(() => {
    return Array.from(new Set(backtests.map((b) => b.symbol))).filter(Boolean);
  }, [backtests]);

  const allTimeframes = useMemo(() => {
    return Array.from(new Set(backtests.map((b) => b.timeframe))).filter(Boolean);
  }, [backtests]);

  const applySavedView = (view: any) => {
    if (view.filters) {
      setFilters({
        ...INITIAL_FILTER_STATE,
        ...view.filters,
      });
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Record"
        title="Backtests"
        description="Every experiment the team has run, in one uniform schema. Filter it down, then open a row for the full specification."
      />

      {/* Saved views */}
      {savedViews.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
          <span className="eyebrow flex shrink-0 items-center gap-1.5">
            <Bookmark className="h-3 w-3 text-primary" />
            Saved views
          </span>
          {savedViews.map((sv) => (
            <button
              key={sv.id}
              onClick={() => applySavedView(sv)}
              className="shrink-0 whitespace-nowrap rounded-md border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground shadow-plate transition-colors hover:border-primary/40 hover:text-foreground"
            >
              {sv.name}
            </button>
          ))}
        </div>
      )}

      {/* Structured Multi-Criteria Filter Panel */}
      <FilterPanel
        filters={filters}
        onFilterChange={setFilters}
        strategies={strategies}
        allSymbols={allSymbols}
        allTimeframes={allTimeframes}
        onSaveViewPrompt={() => setSaveViewOpen(true)}
      />

      {/* Main TanStack Table with Column Controls & User Layout Persistence */}
      <BacktestsTable
        data={filteredData}
        loading={loading}
        onRefresh={loadBacktests}
      />

      {/* Save View Modal Dialog */}
      <SaveViewDialog
        open={saveViewOpen}
        onOpenChange={setSaveViewOpen}
        currentFilters={filters}
        onSaved={async () => {
          if (user?.id) {
            const { data: views } = await supabase.from("saved_views").select("*").order("name");
            setSavedViews(views || []);
          }
        }}
      />
    </div>
  );
}

export default function BacktestsPage() {
  return (
    <Suspense fallback={<BacktestsLoading />}>
      <BacktestsPageContent />
    </Suspense>
  );
}
