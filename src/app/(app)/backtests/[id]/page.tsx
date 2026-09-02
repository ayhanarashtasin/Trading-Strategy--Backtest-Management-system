"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SectionRule, Value } from "@/components/ui/metric";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAuth } from "@/components/providers/auth-provider";
import { createClient } from "@/utils/supabase/client";
import { Backtest, StrategyVersion, BacktestYearlyResult } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { YearlyResultsTable } from "@/components/backtests/yearly-results-table";
import { NotesSection } from "@/components/shared/notes-section";
import { AttachmentsSection } from "@/components/shared/attachments-section";
import {
  FlaskConical,
  Layers,
  Calendar,
  Sliders,
  TrendingUp,
  ShieldCheck,
  FileText,
  MessageSquare,
  Paperclip,
  Activity,
  Edit,
  ArrowLeft,
  Trash2,
  Archive,
  RotateCcw,
  GitCompare,
  Clock,
  User,
  ShieldAlert,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { formatPercent, formatNumber, formatCurrency, formatDateTime, formatDate } from "@/lib/utils";
import { DetailSkeleton } from "@/components/ui/skeleton";

export default function BacktestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { canEdit, isOwner, user } = useAuth();
  const supabase = createClient();

  const [backtest, setBacktest] = useState<any | null>(null);
  const [yearlyResults, setYearlyResults] = useState<BacktestYearlyResult[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const loadBacktestData = async () => {
    try {
      setLoading(true);

      /* Three independent reads, keyed on the same id — issue them together. */
      const [
        { data: bt, error: btErr },
        { data: yrs },
        { data: acts },
      ] = await Promise.all([
        supabase
          .from("backtests")
          .select(`
            *,
            strategy_version:strategy_versions(
              id,
              version_name,
              version_number,
              entry_rules,
              exit_rules,
              risk_rules,
              parameter_summary,
              parameters_json,
              strategy:strategies(
                id,
                name,
                strategy_family,
                default_direction
              )
            ),
            creator:profiles!backtests_created_by_fkey(display_name, email),
            updater:profiles!backtests_updated_by_fkey(display_name, email)
          `)
          .eq("id", id)
          .single(),
        supabase
          .from("backtest_yearly_results")
          .select("*")
          .eq("backtest_id", id)
          .order("year", { ascending: true }),
        supabase
          .from("activity_logs")
          .select("*, user:profiles(display_name)")
          .eq("entity_id", id)
          .order("created_at", { ascending: false }),
      ]);

      if (btErr) throw btErr;

      setBacktest(bt);
      setYearlyResults(yrs || []);
      setActivityLogs(acts || []);
    } catch (err) {
      console.error("Backtest detail fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBacktestData();
  }, [id]);

  const handleArchiveToggle = async () => {
    if (!backtest) return;
    const newArchived = backtest.archived_at ? null : new Date().toISOString();
    try {
      await supabase
        .from("backtests")
        .update({ archived_at: newArchived, updated_by: user?.id })
        .eq("id", backtest.id);

      await supabase.from("activity_logs").insert({
        action: newArchived ? "backtest_archived" : "backtest_restored",
        entity_type: "backtest",
        entity_id: backtest.id,
        description: newArchived
          ? `Archived backtest "${backtest.backtest_name}"`
          : `Restored backtest "${backtest.backtest_name}"`,
        user_id: user?.id,
      });

      loadBacktestData();
    } catch (err) {
      console.error("Archive error:", err);
    }
  };

  const handlePermanentDelete = async () => {
    if (!backtest || !isOwner) return;
    try {
      await supabase.from("backtests").delete().eq("id", backtest.id);
      router.push("/backtests");
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  if (loading) {
    return <DetailSkeleton />;
  }

  if (!backtest) {
    return (
      <div className="space-y-3 py-16 text-center">
        <FlaskConical className="mx-auto h-9 w-9 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">
          This backtest is not in the record
        </h2>
        <p className="text-xs text-muted-foreground">
          It may have been permanently deleted.
        </p>
        <Link href="/backtests">
          <Button size="sm" variant="outline">
            Back to backtests
          </Button>
        </Link>
      </div>
    );
  }

  const strategy = backtest.strategy_version?.strategy;
  const version = backtest.strategy_version;

  return (
    <>
      <div className="space-y-6">
        {/* Breadcrumb Navigation */}
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] text-muted-foreground"
        >
          <Link
            href="/backtests"
            className="flex items-center gap-1 hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" />
            Backtests
          </Link>
          {strategy && (
            <>
              <span aria-hidden>/</span>
              <Link
                href={`/strategies/${strategy.id}`}
                className="hover:text-foreground"
              >
                {strategy.name}
              </Link>
            </>
          )}
          <span aria-hidden>/</span>
          <Value>{backtest.backtest_name}</Value>
        </nav>

        {/* Backtest Header Card */}
        <Card className="space-y-5 p-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="min-w-0 space-y-2.5">
              <p className="eyebrow">
                {backtest.test_type} &middot; {backtest.source}
              </p>

              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                  {backtest.backtest_name}
                </h1>
                <StatusBadge status={backtest.status} />
                {backtest.archived_at && (
                  <Badge variant="destructive">Archived</Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {strategy && (
                  <Link
                    href={`/strategies/${strategy.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {strategy.name}{" "}
                    <span className="font-mono">
                      {version?.version_name || "V1"}
                    </span>
                  </Link>
                )}
                <span aria-hidden>&middot;</span>
                <span className="font-mono font-semibold text-foreground">
                  {backtest.symbol} {backtest.timeframe}
                </span>
                <span aria-hidden>&middot;</span>
                <span className="font-mono">
                  {formatDate(backtest.start_date)} &rarr;{" "}
                  {formatDate(backtest.end_date)}
                </span>
                <span aria-hidden>&middot;</span>
                <span>
                  Entered by {backtest.creator?.display_name || "a team member"}
                </span>
              </div>
            </div>

            {/* Actions Toolbar */}
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/compare?ids=${backtest.id}`}>
                <Button size="xs" variant="outline" className="gap-1 text-xs">
                  <GitCompare className="h-3.5 w-3.5" />
                  Compare
                </Button>
              </Link>

              {canEdit && (
                <>
                  <Link href={`/backtests/${backtest.id}/edit`}>
                    <Button size="xs" variant="secondary" className="gap-1 text-xs">
                      <Edit className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                  </Link>

                  <Button
                    size="xs"
                    variant="outline"
                    onClick={handleArchiveToggle}
                    className="gap-1 text-xs hover:text-sun"
                  >
                    {backtest.archived_at ? (
                      <>
                        <RotateCcw className="h-3.5 w-3.5" />
                        Restore
                      </>
                    ) : (
                      <>
                        <Archive className="h-3.5 w-3.5" />
                        Archive
                      </>
                    )}
                  </Button>
                </>
              )}

              {isOwner && (
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="text-destructive hover:border-destructive/40 hover:bg-destructive/[0.06] hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              )}
            </div>
          </div>

          {/* The six readings that summarise the experiment */}
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3 lg:grid-cols-6">
            {[
              {
                label: "Trades",
                value: formatNumber(backtest.total_trades, 0),
                cls: "text-foreground",
              },
              {
                label: "Profit factor",
                value:
                  backtest.profit_factor != null
                    ? Number(backtest.profit_factor).toFixed(2)
                    : "N/A",
                cls:
                  backtest.profit_factor == null
                    ? "text-muted-foreground/60"
                    : Number(backtest.profit_factor) >= 1.2
                      ? "text-profit"
                      : Number(backtest.profit_factor) >= 1
                        ? "text-foreground"
                        : "text-loss",
              },
              {
                label: "Net return",
                value: formatPercent(backtest.net_profit_percent),
                cls:
                  backtest.net_profit_percent == null
                    ? "text-muted-foreground/60"
                    : Number(backtest.net_profit_percent) >= 0
                      ? "text-profit"
                      : "text-loss",
              },
              {
                label: "Max drawdown",
                value: formatPercent(backtest.max_drawdown_percent),
                cls:
                  backtest.max_drawdown_percent == null
                    ? "text-muted-foreground/60"
                    : "text-loss",
              },
              {
                label: "Win rate",
                value: formatPercent(backtest.win_rate_percent),
                cls: "text-foreground",
              },
              {
                label: "Average trade",
                value: formatPercent(backtest.average_trade_percent, 3),
                cls:
                  backtest.average_trade_percent == null
                    ? "text-muted-foreground/60"
                    : Number(backtest.average_trade_percent) >= 0
                      ? "text-profit"
                      : "text-loss",
              },
            ].map((r) => (
              <div key={r.label} className="bg-card px-4 py-3.5">
                <p className="eyebrow truncate">{r.label}</p>
                <p
                  className={`mt-2 font-mono text-xl font-semibold leading-none ${r.cls}`}
                >
                  {r.value}
                </p>
              </div>
            ))}
          </div>
        </Card>

        {/* Structured Tabs (Section 36) */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview" className="gap-1.5 text-xs">
              <FileText className="h-3.5 w-3.5" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="execution" className="gap-1.5 text-xs">
              <Sliders className="h-3.5 w-3.5" />
              Market & execution
            </TabsTrigger>
            <TabsTrigger value="metrics" className="gap-1.5 text-xs">
              <TrendingUp className="h-3.5 w-3.5" />
              Metrics
            </TabsTrigger>
            <TabsTrigger value="yearly" className="gap-1.5 text-xs">
              <Calendar className="h-3.5 w-3.5" />
              Yearly ({yearlyResults.length})
            </TabsTrigger>
            <TabsTrigger value="integrity" className="gap-1.5 text-xs">
              <ShieldCheck className="h-3.5 w-3.5" />
              Integrity
            </TabsTrigger>
            <TabsTrigger value="notes" className="gap-1.5 text-xs">
              <MessageSquare className="h-3.5 w-3.5" />
              Notes
            </TabsTrigger>
            <TabsTrigger value="attachments" className="gap-1.5 text-xs">
              <Paperclip className="h-3.5 w-3.5" />
              Attachments
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-1.5 text-xs">
              <Activity className="h-3.5 w-3.5" />
              Activity
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: OVERVIEW & TECHNICAL SPECS */}
          <TabsContent value="overview" className="space-y-4">
            {/* Technical Specification Details (Section 21) */}
            <Card className="p-5 space-y-3">
              <SectionRule>Technical specification</SectionRule>
              {backtest.details ? (
                <div className="rounded-lg bg-muted border border-border p-4">
                  <p className="text-xs font-mono text-foreground whitespace-pre-wrap leading-relaxed">
                    {backtest.details}
                  </p>
                </div>
              ) : (
                <p className="py-3 text-xs text-muted-foreground">
                  No technical specification was recorded for this backtest.
                </p>
              )}
            </Card>

            {/* Underlying Strategy Version Rules */}
            {version && (
              <Card className="p-5 space-y-4">
                <div className="flex items-center justify-between gap-4 border-b border-border pb-2.5">
                  <p className="eyebrow">
                    Version rules &middot; {version.version_name}
                  </p>
                  {strategy && (
                    <Link
                      href={`/strategies/${strategy.id}`}
                      className="shrink-0 text-xs text-primary hover:underline"
                    >
                      Open strategy &rarr;
                    </Link>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  {version.entry_rules && (
                    <div className="rounded-md border border-border bg-muted/50 p-3">
                      <span className="eyebrow mb-1 block text-profit">Entry rules</span>
                      <p className="text-muted-foreground whitespace-pre-wrap">{version.entry_rules}</p>
                    </div>
                  )}
                  {version.exit_rules && (
                    <div className="rounded-md border border-border bg-muted/50 p-3">
                      <span className="eyebrow mb-1 block text-sun">Exit rules</span>
                      <p className="text-muted-foreground whitespace-pre-wrap">{version.exit_rules}</p>
                    </div>
                  )}
                  {version.risk_rules && (
                    <div className="rounded-md border border-border bg-muted/50 p-3">
                      <span className="eyebrow mb-1 block text-loss">Risk rules</span>
                      <p className="text-muted-foreground whitespace-pre-wrap">{version.risk_rules}</p>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </TabsContent>

          {/* TAB 2: EXECUTION & MARKET */}
          <TabsContent value="execution" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-5 space-y-4">
                <SectionRule>Market</SectionRule>
                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div>
                    <span className="eyebrow block">Symbol</span>
                    <Value>{backtest.symbol}</Value>
                  </div>
                  <div>
                    <span className="eyebrow block">Direction</span>
                    <Value>{backtest.direction || "Both"}</Value>
                  </div>
                  <div>
                    <span className="eyebrow block">Timeframe</span>
                    <Value>{backtest.timeframe}</Value>
                  </div>
                  <div>
                    <span className="eyebrow block">Higher TF</span>
                    <Value>{backtest.higher_timeframe || "None"}</Value>
                  </div>
                  <div>
                    <span className="eyebrow block">Intrabar TF</span>
                    <Value>{backtest.intrabar_timeframe || "None"}</Value>
                  </div>
                  <div>
                    <span className="eyebrow block">Exchange</span>
                    <Value>{backtest.exchange || "Binance"}</Value>
                  </div>
                  <div>
                    <span className="eyebrow block">Market Type</span>
                    <Value>{backtest.market_type || "Futures"}</Value>
                  </div>
                  <div>
                    <span className="eyebrow block">Data Source</span>
                    <Value>{backtest.data_source || "API"}</Value>
                  </div>
                </div>
              </Card>

              <Card className="p-5 space-y-4">
                <SectionRule>Execution assumptions</SectionRule>
                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div>
                    <span className="eyebrow block">Fee Per Side</span>
                    <Value>{formatPercent(backtest.fee_per_side_percent)}</Value>
                  </div>
                  <div>
                    <span className="eyebrow block">Slippage Per Side</span>
                    <Value>{formatPercent(backtest.slippage_per_side_percent)}</Value>
                  </div>
                  <div>
                    <span className="eyebrow block">Starting Capital</span>
                    <Value>{formatCurrency(backtest.starting_capital)}</Value>
                  </div>
                  <div>
                    <span className="eyebrow block">Leverage</span>
                    <Value>{backtest.leverage ? `${backtest.leverage}x` : "1x"}</Value>
                  </div>
                  <div>
                    <span className="eyebrow block">Compounding</span>
                    <Value>{backtest.compounding ? "Enabled" : "Disabled"}</Value>
                  </div>
                  <div>
                    <span className="eyebrow block">Funding Included</span>
                    <Value>{backtest.funding_included ? "Yes" : "No"}</Value>
                  </div>
                </div>
                {backtest.stop_loss_description && (
                  <div className="pt-2 border-t border-border text-xs">
                    <span className="font-semibold text-foreground">Stop Loss: </span>
                    <span className="text-muted-foreground">{backtest.stop_loss_description}</span>
                  </div>
                )}
                {backtest.take_profit_description && (
                  <div className="text-xs">
                    <span className="font-semibold text-foreground">Take Profit: </span>
                    <span className="text-muted-foreground">{backtest.take_profit_description}</span>
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>

          {/* TAB 3: PERFORMANCE MATRIX */}
          <TabsContent value="metrics" className="space-y-4">
            <Card className="p-5 space-y-4">
              <SectionRule>Full metric set</SectionRule>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-xs font-mono">
                <div className="rounded-md border border-border bg-muted/50 p-3">
                  <span className="eyebrow block">CAGR %</span>
                  <Value className="mt-1.5 text-sm font-semibold">{formatPercent(backtest.cagr_percent)}</Value>
                </div>
                <div className="rounded-md border border-border bg-muted/50 p-3">
                  <span className="eyebrow block">Payoff Ratio</span>
                  <Value className="mt-1.5 text-sm font-semibold">{backtest.payoff_ratio ? Number(backtest.payoff_ratio).toFixed(2) : "N/A"}</Value>
                </div>
                <div className="rounded-md border border-border bg-muted/50 p-3">
                  <span className="eyebrow block">Sharpe Ratio</span>
                  <Value className="mt-1.5 text-sm font-semibold">{backtest.sharpe_ratio ? Number(backtest.sharpe_ratio).toFixed(2) : "N/A"}</Value>
                </div>
                <div className="rounded-md border border-border bg-muted/50 p-3">
                  <span className="eyebrow block">Sortino Ratio</span>
                  <Value className="mt-1.5 text-sm font-semibold">{backtest.sortino_ratio ? Number(backtest.sortino_ratio).toFixed(2) : "N/A"}</Value>
                </div>
                <div className="rounded-md border border-border bg-muted/50 p-3">
                  <span className="eyebrow block">Calmar Ratio</span>
                  <Value className="mt-1.5 text-sm font-semibold">{backtest.calmar_ratio ? Number(backtest.calmar_ratio).toFixed(2) : "N/A"}</Value>
                </div>
                <div className="rounded-md border border-border bg-muted/50 p-3">
                  <span className="eyebrow block">Recovery Factor</span>
                  <Value className="mt-1.5 text-sm font-semibold">{backtest.recovery_factor ? Number(backtest.recovery_factor).toFixed(2) : "N/A"}</Value>
                </div>
                <div className="rounded-md border border-border bg-muted/50 p-3">
                  <span className="eyebrow block">Exposure %</span>
                  <Value className="mt-1.5 text-sm font-semibold">{formatPercent(backtest.exposure_percent)}</Value>
                </div>
                <div className="rounded-md border border-border bg-muted/50 p-3">
                  <span className="eyebrow block">Avg Trade Duration</span>
                  <Value className="mt-1.5 text-sm font-semibold">{backtest.average_trade_duration || "N/A"}</Value>
                </div>
                <div className="rounded-md border border-border bg-muted/50 p-3">
                  <span className="eyebrow block">Winning / Losing Trades</span>
                  <Value className="mt-1.5 text-sm font-semibold">{backtest.winning_trades ?? "N/A"} / {backtest.losing_trades ?? "N/A"}</Value>
                </div>
                <div className="rounded-md border border-border bg-muted/50 p-3">
                  <span className="eyebrow block">Long / Short Trades</span>
                  <Value className="mt-1.5 text-sm font-semibold">{backtest.long_trades ?? "N/A"} / {backtest.short_trades ?? "N/A"}</Value>
                </div>
                <div className="rounded-md border border-border bg-muted/50 p-3">
                  <span className="eyebrow block">Largest Win % / Loss %</span>
                  <Value className="mt-1.5 text-sm font-semibold">{formatPercent(backtest.largest_win_percent)} / {formatPercent(backtest.largest_loss_percent)}</Value>
                </div>
                <div className="rounded-md border border-border bg-muted/50 p-3">
                  <span className="eyebrow block">Net Profit Amount ($)</span>
                  <Value className="mt-1.5 text-sm font-semibold">{formatCurrency(backtest.net_profit_amount)}</Value>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* TAB 4: YEARLY RESULTS */}
          <TabsContent value="yearly">
            <YearlyResultsTable
              backtestId={backtest.id}
              initialResults={yearlyResults}
              onChanged={loadBacktestData}
            />
          </TabsContent>

          {/* TAB 5: INTEGRITY & QUALITY CHECKS */}
          <TabsContent value="integrity" className="space-y-4">
            <Card className="p-5 space-y-4">
              <SectionRule>Integrity checks</SectionRule>
              <p className="text-xs text-muted-foreground leading-relaxed">
                A promising result and a trustworthy result are different things. These are the checks that separate them.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                {[
                  { label: "Fees Included", checked: backtest.fees_included },
                  { label: "Slippage Included", checked: backtest.slippage_included },
                  { label: "Intrabar Candle Simulation", checked: backtest.intrabar_simulation },
                  { label: "Lookahead Checked", checked: backtest.lookahead_checked },
                  { label: "Lookahead Bias Detected", checked: backtest.lookahead_bias_detected, warningIfTrue: true },
                  { label: "Data Gaps Checked", checked: backtest.data_gaps_checked },
                  { label: "Indicator Warmup Checked", checked: backtest.warmup_checked },
                  { label: "Liquidation Modeled", checked: backtest.liquidation_modeled },
                  { label: "Same Bar Execution Checked", checked: backtest.same_bar_execution_checked },
                  { label: "Out of Sample Tested", checked: backtest.oos_tested },
                  { label: "Walk Forward Tested", checked: backtest.walk_forward_tested },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`flex items-center justify-between gap-2 rounded-md border p-3 ${
                      item.checked
                        ? item.warningIfTrue
                          ? "border-loss/25 bg-loss/[0.06] text-loss"
                          : "border-profit/25 bg-profit/[0.06] text-profit"
                        : "border-border bg-muted text-muted-foreground"
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.checked ? (
                      item.warningIfTrue ? (
                        <XCircle className="h-4 w-4 text-loss" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-profit" />
                      )
                    ) : (
                      <span className="eyebrow shrink-0">Not checked</span>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* TAB 6: RESEARCH NOTES */}
          <TabsContent value="notes">
            <NotesSection entityType="backtest" entityId={backtest.id} />
          </TabsContent>

          {/* TAB 7: ATTACHMENTS */}
          <TabsContent value="attachments">
            <AttachmentsSection entityType="backtest" entityId={backtest.id} />
          </TabsContent>

          {/* TAB 8: ACTIVITY HISTORY */}
          <TabsContent value="activity">
            <Card className="p-5 space-y-4">
              <SectionRule>Audit trail</SectionRule>
              {activityLogs.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Nothing has changed on this record yet.</p>
              ) : (
                <div className="divide-y divide-border text-xs font-sans">
                  {activityLogs.map((log) => (
                    <div key={log.id} className="py-3 flex items-start justify-between">
                      <div>
                        <span className="font-semibold text-foreground capitalize">
                          {log.action.replace(/_/g, " ")}
                        </span>
                        <p className="text-muted-foreground mt-0.5">{log.description}</p>
                        <span className="text-[10px] text-muted-foreground">by {log.user?.display_name || "User"}</span>
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {formatDateTime(log.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Modal */}
      {isOwner && (
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent className="max-w-md" onClose={() => setDeleteConfirmOpen(false)}>
            <div className="mb-4 flex items-start gap-2.5">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div>
                <h2 className="text-base font-semibold tracking-tight text-foreground">
                  Delete this backtest permanently?
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  &quot;{backtest.backtest_name}&quot; and every yearly result,
                  attachment and note attached to it will be removed from the
                  record. This cannot be undone — archive it instead if you may
                  need it later.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setDeleteConfirmOpen(false)}
              >
                Keep it
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handlePermanentDelete}
              >
                Delete permanently
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
