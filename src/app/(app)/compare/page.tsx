"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { GitCompare, Trash2, ExternalLink, Check, Minus } from "lucide-react";
import {
  formatPercent,
  formatNumber,
  formatDate,
  formatDateTime,
} from "@/lib/utils";
import { TableSkeleton } from "@/components/ui/skeleton";
import CompareLoading from "./loading";
import { useCachedState, readQueryCache } from "@/lib/query-cache";
import { Backtest } from "@/types/database";

/* Layout constants for the comparison matrix. The metric column is sticky, so
   its width has to be fixed in one place. */
const LABEL_CELL =
  "sticky left-0 z-10 w-48 min-w-[12rem] border-r border-border bg-muted px-4 py-2.5 text-left align-middle font-medium text-muted-foreground";
const VALUE_CELL =
  "border-r border-border px-4 py-2.5 align-middle last:border-r-0";

function CompareContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const {
    data: allBacktests,
    setData: setAllBacktests,
    loading,
    setLoading,
    setIsRevalidating,
  } = useCachedState<Backtest[]>("compare:all", []);
  const [selectedBacktests, setSelectedBacktests] = useState<Backtest[]>([]);
  const [addSelectId, setAddSelectId] = useState("");

  // Load available backtests
  useEffect(() => {
    async function loadData() {
      const hasCached = readQueryCache("compare:all") !== undefined;
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
            )
          `)
          .is("archived_at", null)
          .order("created_at", { ascending: false });

        setAllBacktests(data || []);

        const idsParam = searchParams.get("ids");
        if (idsParam) {
          const ids = idsParam.split(",").map((s) => s.trim()).filter(Boolean);
          const matched = (data || []).filter((b: Backtest) => ids.includes(b.id));
          setSelectedBacktests(matched);
        } else if (data && data.length >= 2) {
          setSelectedBacktests(data.slice(0, 2));
        }
      } catch (err) {
        console.error("Load compare data error:", err);
      } finally {
        setLoading(false);
        setIsRevalidating(false);
      }
    }
    loadData();
  }, [searchParams]);

  const handleAddBacktest = (id: string) => {
    if (!id || selectedBacktests.some((b) => b.id === id)) return;
    if (selectedBacktests.length >= 10) return;

    const found = allBacktests.find((b) => b.id === id);
    if (found) {
      const updated = [...selectedBacktests, found];
      setSelectedBacktests(updated);
      router.push(`/compare?ids=${updated.map((b) => b.id).join(",")}`);
      setAddSelectId("");
    }
  };

  const handleRemoveBacktest = (id: string) => {
    const updated = selectedBacktests.filter((b) => b.id !== id);
    setSelectedBacktests(updated);
    router.push(`/compare?ids=${updated.map((b) => b.id).join(",")}`);
  };

  // Metric Best Value Calculations
  const bestValues = useMemo(() => {
    if (selectedBacktests.length === 0) return {} as Record<string, number | null>;

    const pfValues = selectedBacktests.map((b) => b.profit_factor).filter((v) => v !== null).map(Number);
    const returnValues = selectedBacktests.map((b) => b.net_profit_percent).filter((v) => v !== null).map(Number);
    const ddValues = selectedBacktests.map((b) => b.max_drawdown_percent).filter((v) => v !== null).map(Number);
    const wrValues = selectedBacktests.map((b) => b.win_rate_percent).filter((v) => v !== null).map(Number);
    const avgTradeValues = selectedBacktests.map((b) => b.average_trade_percent).filter((v) => v !== null).map(Number);
    const medianTradeValues = selectedBacktests.map((b) => b.median_trade_percent).filter((v) => v !== null).map(Number);
    const sharpeValues = selectedBacktests.map((b) => b.sharpe_ratio).filter((v) => v !== null).map(Number);
    const sortinoValues = selectedBacktests.map((b) => b.sortino_ratio).filter((v) => v !== null).map(Number);

    return {
      bestPF: pfValues.length > 0 ? Math.max(...pfValues) : null,
      bestReturn: returnValues.length > 0 ? Math.max(...returnValues) : null,
      bestDD: ddValues.length > 0 ? Math.min(...ddValues) : null, // Lower DD is best
      bestWR: wrValues.length > 0 ? Math.max(...wrValues) : null,
      bestAvgTrade: avgTradeValues.length > 0 ? Math.max(...avgTradeValues) : null,
      bestMedianTrade: medianTradeValues.length > 0 ? Math.max(...medianTradeValues) : null,
      bestSharpe: sharpeValues.length > 0 ? Math.max(...sharpeValues) : null,
      bestSortino: sortinoValues.length > 0 ? Math.max(...sortinoValues) : null,
    };
  }, [selectedBacktests]);

  /** A band that names the group of rows beneath it. */
  const SectionRow = ({ children }: { children: React.ReactNode }) => (
    <tr>
      <td
        colSpan={selectedBacktests.length + 1}
        className="border-y border-border bg-muted/70 px-4 py-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-foreground"
      >
        {children}
      </td>
    </tr>
  );

  /** One metric across every selected backtest. */
  const MetricRow = ({
    label,
    render,
  }: {
    label: string;
    render: (b: any) => React.ReactNode;
  }) => (
    <tr>
      <th scope="row" className={LABEL_CELL}>
        <span className="eyebrow">{label}</span>
      </th>
      {selectedBacktests.map((b) => (
        <td key={b.id} className={VALUE_CELL}>
          {render(b)}
        </td>
      ))}
    </tr>
  );

  /** Two integrity flags shown side by side. */
  const Flag = ({ on, children }: { on: boolean; children: React.ReactNode }) => (
    <span
      className={
        "inline-flex items-center gap-1 text-[11px] " +
        (on ? "text-profit" : "text-muted-foreground")
      }
    >
      {on ? (
        <Check className="h-3 w-3" strokeWidth={3} />
      ) : (
        <Minus className="h-3 w-3" strokeWidth={3} />
      )}
      {children}
    </span>
  );

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Analysis"
        title="Compare"
        description="Up to ten backtests side by side. The strongest value in each directional metric is marked — read it alongside sample size and execution assumptions, never on its own."
        actions={
          <Select
            value={addSelectId}
            onChange={(e) => handleAddBacktest(e.target.value)}
            className="h-8 w-64 text-xs"
            disabled={selectedBacktests.length >= 10}
            aria-label="Add a backtest to the comparison"
          >
            <option value="">
              {selectedBacktests.length >= 10
                ? "Ten backtests is the maximum"
                : "Add a backtest…"}
            </option>
            {allBacktests
              .filter((b) => !selectedBacktests.some((s) => s.id === b.id))
              .map((b) => (
                <option key={b.id} value={b.id}>
                  {b.backtest_name} — {b.symbol} {b.timeframe}
                </option>
              ))}
          </Select>
        }
      />

      {loading ? (
        <TableSkeleton rows={14} cols={4} />
      ) : selectedBacktests.length === 0 ? (
        <EmptyState
          icon={<GitCompare className="h-5 w-5" />}
          title="Nothing to compare yet"
          description="Add a backtest above, or select rows in the backtests table and choose Compare."
          action={
            <Link href="/backtests">
              <Button size="sm">Browse backtests</Button>
            </Link>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-plate">
          <table className="w-full min-w-[720px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border">
                <th
                  scope="col"
                  className="sticky left-0 z-10 w-48 min-w-[12rem] border-r border-border bg-muted px-4 py-3"
                >
                  <span className="eyebrow">Metric</span>
                </th>
                {selectedBacktests.map((b) => (
                  <th
                    key={b.id}
                    scope="col"
                    className="min-w-[200px] border-r border-border bg-muted px-4 py-3 align-top last:border-r-0"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          href={`/backtests/${b.id}`}
                          className="block truncate text-[13px] font-semibold text-foreground hover:text-primary hover:underline"
                        >
                          {b.backtest_name}
                        </Link>
                        <p className="mt-0.5 truncate font-mono text-[10px] font-normal text-muted-foreground">
                          {b.strategy_version?.strategy?.name}{" "}
                          {b.strategy_version?.version_name}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveBacktest(b.id)}
                        className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/[0.08] hover:text-destructive"
                        title={`Remove ${b.backtest_name} from the comparison`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span className="sr-only">Remove</span>
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              <SectionRow>Market &amp; platform</SectionRow>

              <MetricRow
                label="Symbol / timeframe"
                render={(b) => (
                  <span className="font-mono font-semibold text-foreground">
                    {b.symbol}{" "}
                    <span className="font-normal text-muted-foreground">
                      {b.timeframe}
                    </span>
                  </span>
                )}
              />

              <MetricRow
                label="Source / test type"
                render={(b) => (
                  <span className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className="font-mono">
                      {b.source}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">
                      {b.test_type}
                    </span>
                  </span>
                )}
              />

              <MetricRow
                label="Period"
                render={(b) => (
                  <span className="whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                    {formatDate(b.start_date)} → {formatDate(b.end_date)}
                  </span>
                )}
              />

              <MetricRow
                label="Duration (Days)"
                render={(b) => {
                  const days =
                    b.duration_days != null
                      ? b.duration_days
                      : b.start_date && b.end_date
                        ? Math.max(
                            0,
                            Math.round(
                              (new Date(b.end_date).getTime() -
                                new Date(b.start_date).getTime()) /
                                (1000 * 60 * 60 * 24)
                            )
                          )
                        : null;
                  return (
                    <span className="font-mono text-muted-foreground">
                      {days != null ? `${formatNumber(days, 0)} days` : "N/A"}
                    </span>
                  );
                }}
              />

              <MetricRow
                label="Date inserted"
                render={(b) => (
                  <span
                    className="whitespace-nowrap font-mono text-[11px] text-muted-foreground"
                    title={`Inserted on ${formatDateTime(b.created_at)}`}
                  >
                    {formatDate(b.created_at)}
                  </span>
                )}
              />

              <SectionRow>Performance</SectionRow>

              <MetricRow
                label="Profit factor"
                render={(b) => {
                  const isBest =
                    b.profit_factor != null &&
                    Number(b.profit_factor) === bestValues.bestPF;
                  return (
                    <span className="flex items-center gap-1.5">
                      <span
                        className={`font-mono text-sm font-semibold ${
                          b.profit_factor == null
                            ? "text-muted-foreground/60"
                            : "text-foreground"
                        }`}
                      >
                        {b.profit_factor != null
                          ? Number(b.profit_factor).toFixed(2)
                          : "N/A"}
                      </span>
                      {isBest && <Badge variant="success">Best</Badge>}
                    </span>
                  );
                }}
              />

              <MetricRow
                label="Net return"
                render={(b) => {
                  const isBest =
                    b.net_profit_percent != null &&
                    Number(b.net_profit_percent) === bestValues.bestReturn;
                  return (
                    <span className="flex items-center gap-1.5">
                      <span
                        className={`font-mono text-sm font-semibold ${
                          b.net_profit_percent == null
                            ? "text-muted-foreground/60"
                            : Number(b.net_profit_percent) >= 0
                              ? "text-profit"
                              : "text-loss"
                        }`}
                      >
                        {formatPercent(b.net_profit_percent)}
                      </span>
                      {isBest && <Badge variant="success">Best</Badge>}
                    </span>
                  );
                }}
              />

              <MetricRow
                label="Max drawdown"
                render={(b) => {
                  const isBest =
                    b.max_drawdown_percent != null &&
                    Number(b.max_drawdown_percent) === bestValues.bestDD;
                  return (
                    <span className="flex items-center gap-1.5">
                      <span
                        className={`font-mono text-sm font-semibold ${
                          b.max_drawdown_percent == null
                            ? "text-muted-foreground/60"
                            : "text-loss"
                        }`}
                      >
                        {formatPercent(b.max_drawdown_percent)}
                      </span>
                      {isBest && <Badge variant="success">Shallowest</Badge>}
                    </span>
                  );
                }}
              />

              <MetricRow
                label="Average trade"
                render={(b) => {
                  const isBest =
                    b.average_trade_percent != null &&
                    Number(b.average_trade_percent) === bestValues.bestAvgTrade;
                  return (
                    <span className="flex items-center gap-1.5">
                      <span
                        className={`font-mono font-semibold ${
                          b.average_trade_percent == null
                            ? "text-muted-foreground/60"
                            : Number(b.average_trade_percent) >= 0
                              ? "text-profit"
                              : "text-loss"
                        }`}
                      >
                        {formatPercent(b.average_trade_percent, 3)}
                      </span>
                      {isBest && <Badge variant="success">Best</Badge>}
                    </span>
                  );
                }}
              />

              <MetricRow
                label="Median trade"
                render={(b) => {
                  const isBest =
                    b.median_trade_percent != null &&
                    Number(b.median_trade_percent) === bestValues.bestMedianTrade;
                  return (
                    <span className="flex items-center gap-1.5">
                      <span
                        className={`font-mono font-semibold ${
                          b.median_trade_percent == null
                            ? "text-muted-foreground/60"
                            : Number(b.median_trade_percent) >= 0
                              ? "text-profit"
                              : "text-loss"
                        }`}
                      >
                        {formatPercent(b.median_trade_percent, 3)}
                      </span>
                      {isBest && <Badge variant="success">Best</Badge>}
                    </span>
                  );
                }}
              />

              {/* Win rate is deliberately not marked "best" — a higher win rate
                  is not automatically the better strategy. */}
              <MetricRow
                label="Win rate"
                render={(b) => (
                  <span
                    className={`font-mono ${
                      b.win_rate_percent == null
                        ? "text-muted-foreground/60"
                        : "text-foreground"
                    }`}
                  >
                    {formatPercent(b.win_rate_percent)}
                  </span>
                )}
              />

              <MetricRow
                label="Trades"
                render={(b) => (
                  <span className="font-mono text-foreground">
                    {formatNumber(b.total_trades, 0)}
                  </span>
                )}
              />

              <MetricRow
                label="Sharpe / Sortino"
                render={(b) => (
                  <span className="font-mono text-muted-foreground">
                    {b.sharpe_ratio != null
                      ? Number(b.sharpe_ratio).toFixed(2)
                      : "N/A"}{" "}
                    /{" "}
                    {b.sortino_ratio != null
                      ? Number(b.sortino_ratio).toFixed(2)
                      : "N/A"}
                  </span>
                )}
              />

              <SectionRow>Execution &amp; integrity</SectionRow>

              <MetricRow
                label="Costs modelled"
                render={(b) => (
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Flag on={!!b.fees_included}>Fees</Flag>
                    <Flag on={!!b.slippage_included}>Slippage</Flag>
                  </span>
                )}
              />

              <MetricRow
                label="Method verified"
                render={(b) => (
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Flag on={!!b.intrabar_simulation}>Intrabar</Flag>
                    <Flag on={!!b.oos_tested}>Out of sample</Flag>
                  </span>
                )}
              />

              <MetricRow
                label="Specification"
                render={(b) => (
                  <>
                    <p className="line-clamp-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
                      {b.details || "No specification recorded."}
                    </p>
                    <Link
                      href={`/backtests/${b.id}`}
                      className="mt-1 inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
                    >
                      Full record <ExternalLink className="h-2.5 w-2.5" />
                    </Link>
                  </>
                )}
              />
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<CompareLoading />}>
      <CompareContent />
    </Suspense>
  );
}
