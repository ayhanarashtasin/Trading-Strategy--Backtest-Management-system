"use client";

import React from "react";
import Link from "next/link";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Reading, SectionRule } from "@/components/ui/metric";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { NotesSection } from "@/components/shared/notes-section";
import { AttachmentsSection } from "@/components/shared/attachments-section";
import {
  Sliders,
  TrendingUp,
  FileText,
  MessageSquare,
  Paperclip,
  ExternalLink,
  Edit,
  Check,
  Minus,
} from "lucide-react";
import {
  formatPercent,
  formatNumber,
  formatCurrency,
  formatDate,
} from "@/lib/utils";

import { BacktestRow } from "../table/column-definitions";

interface BacktestDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  backtest: BacktestRow | null;
}

/** One integrity check. Unchecked is absence, not failure — so it stays grey. */
function IntegrityCheck({
  passed,
  children,
}: {
  passed: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span
        className={
          "flex h-4 w-4 shrink-0 items-center justify-center rounded border " +
          (passed
            ? "border-profit/30 bg-profit/[0.08] text-profit"
            : "border-border bg-muted text-muted-foreground/60")
        }
      >
        {passed ? (
          <Check className="h-2.5 w-2.5" strokeWidth={3} />
        ) : (
          <Minus className="h-2.5 w-2.5" strokeWidth={3} />
        )}
      </span>
      <span className={passed ? "text-foreground" : "text-muted-foreground"}>
        {children}
      </span>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <SectionRule className="mb-3.5">{title}</SectionRule>
      {children}
    </section>
  );
}

export function BacktestDrawer({
  open,
  onOpenChange,
  backtest,
}: BacktestDrawerProps) {
  if (!backtest) return null;

  const pf =
    backtest.profit_factor != null ? Number(backtest.profit_factor) : null;
  const netProfit =
    backtest.net_profit_percent != null
      ? Number(backtest.net_profit_percent)
      : null;

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title={backtest.backtest_name}
      description={`${backtest.symbol} · ${backtest.timeframe} · ${backtest.source} · ${backtest.test_type}`}
      size="xl"
    >
      <div className="space-y-6">
        {/* The four readings that decide whether the rest is worth reading */}
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4">
          {[
            {
              label: "Profit factor",
              value: pf != null ? pf.toFixed(2) : "N/A",
              cls:
                pf == null
                  ? "text-muted-foreground/60"
                  : pf >= 1.2
                    ? "text-profit"
                    : pf >= 1
                      ? "text-foreground"
                      : "text-loss",
            },
            {
              label: "Net return",
              value: formatPercent(backtest.net_profit_percent),
              cls:
                netProfit == null
                  ? "text-muted-foreground/60"
                  : netProfit >= 0
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
              label: "Trades",
              value: formatNumber(backtest.total_trades, 0),
              cls: "text-foreground",
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

        {/* Provenance and actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-y border-border py-2.5">
          <p className="text-xs text-muted-foreground">
            <span className="eyebrow mr-2">Strategy</span>
            <Link
              href={`/strategies/${backtest.strategy_version?.strategy?.id || ""}`}
              className="font-medium text-primary hover:underline"
            >
              {backtest.strategy_version?.strategy?.name || "Strategy"}
            </Link>
            <span className="ml-1.5 font-mono">
              {backtest.strategy_version?.version_name || ""}
            </span>
          </p>

          <div className="flex items-center gap-2">
            <Link href={`/backtests/${backtest.id}`}>
              <Button size="xs">
                <ExternalLink className="h-3.5 w-3.5" />
                Open full record
              </Button>
            </Link>
            <Link href={`/backtests/${backtest.id}/edit`}>
              <Button size="xs" variant="outline">
                <Edit className="h-3.5 w-3.5" />
                Edit
              </Button>
            </Link>
          </div>
        </div>

        <Tabs defaultValue="spec" className="space-y-4">
          <TabsList>
            <TabsTrigger value="spec">
              <FileText className="h-3.5 w-3.5" />
              Specification
            </TabsTrigger>
            <TabsTrigger value="execution">
              <Sliders className="h-3.5 w-3.5" />
              Market &amp; execution
            </TabsTrigger>
            <TabsTrigger value="metrics">
              <TrendingUp className="h-3.5 w-3.5" />
              All metrics
            </TabsTrigger>
            <TabsTrigger value="notes">
              <MessageSquare className="h-3.5 w-3.5" />
              Notes
            </TabsTrigger>
            <TabsTrigger value="attachments">
              <Paperclip className="h-3.5 w-3.5" />
              Files
            </TabsTrigger>
          </TabsList>

          {/* Specification */}
          <TabsContent value="spec" className="space-y-4">
            {backtest.details ? (
              <Panel title="Technical specification">
                <p className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground">
                  {backtest.details}
                </p>
              </Panel>
            ) : (
              <p className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                No technical details were entered for this backtest.
              </p>
            )}

            {backtest.strategy_version && (
              <Panel
                title={`Version rules · ${backtest.strategy_version.version_name}`}
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {backtest.strategy_version.entry_rules && (
                    <div>
                      <p className="eyebrow mb-1 text-profit">Entry</p>
                      <p className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                        {backtest.strategy_version.entry_rules}
                      </p>
                    </div>
                  )}
                  {backtest.strategy_version.exit_rules && (
                    <div>
                      <p className="eyebrow mb-1 text-sun">Exit</p>
                      <p className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                        {backtest.strategy_version.exit_rules}
                      </p>
                    </div>
                  )}
                </div>
              </Panel>
            )}
          </TabsContent>

          {/* Market & execution */}
          <TabsContent value="execution" className="space-y-4">
            <Panel title="Market">
              <div className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
                <Reading label="Exchange" value={backtest.exchange} mono={false} />
                <Reading
                  label="Market type"
                  value={backtest.market_type}
                  mono={false}
                />
                <Reading
                  label="Direction"
                  value={backtest.direction || "Both"}
                  mono={false}
                />
                <Reading label="Timeframe" value={backtest.timeframe} />
                <Reading
                  label="Higher timeframe"
                  value={backtest.higher_timeframe}
                />
                <Reading
                  label="Intrabar"
                  value={backtest.intrabar_timeframe}
                />
                <Reading
                  label="Period"
                  value={`${formatDate(backtest.start_date)} → ${formatDate(backtest.end_date)}`}
                  className="col-span-2"
                />
                <Reading
                  label="Data source"
                  value={backtest.data_source}
                  mono={false}
                />
              </div>
            </Panel>

            <Panel title="Execution assumptions">
              <div className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
                <Reading
                  label="Fee per side"
                  value={formatPercent(backtest.fee_per_side_percent)}
                />
                <Reading
                  label="Slippage per side"
                  value={formatPercent(backtest.slippage_per_side_percent)}
                />
                <Reading
                  label="Starting capital"
                  value={formatCurrency(backtest.starting_capital)}
                />
                <Reading
                  label="Leverage"
                  value={backtest.leverage ? `${backtest.leverage}x` : "1x"}
                />
                <Reading
                  label="Stop loss"
                  value={backtest.stop_loss_description}
                  mono={false}
                />
                <Reading
                  label="Take profit"
                  value={backtest.take_profit_description}
                  mono={false}
                />
              </div>
            </Panel>

            <Panel title="Integrity">
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <IntegrityCheck passed={!!backtest.fees_included}>
                  Fees included
                </IntegrityCheck>
                <IntegrityCheck passed={!!backtest.slippage_included}>
                  Slippage included
                </IntegrityCheck>
                <IntegrityCheck passed={!!backtest.intrabar_simulation}>
                  Intrabar simulation
                </IntegrityCheck>
                <IntegrityCheck passed={!!backtest.oos_tested}>
                  Out-of-sample tested
                </IntegrityCheck>
              </div>
            </Panel>
          </TabsContent>

          {/* All metrics */}
          <TabsContent value="metrics">
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
              {[
                ["Win rate", formatPercent(backtest.win_rate_percent)],
                ["Average trade", formatPercent(backtest.average_trade_percent, 3)],
                [
                  "Payoff ratio",
                  backtest.payoff_ratio != null
                    ? Number(backtest.payoff_ratio).toFixed(2)
                    : "N/A",
                ],
                [
                  "Sharpe",
                  backtest.sharpe_ratio != null
                    ? Number(backtest.sharpe_ratio).toFixed(2)
                    : "N/A",
                ],
                [
                  "Sortino",
                  backtest.sortino_ratio != null
                    ? Number(backtest.sortino_ratio).toFixed(2)
                    : "N/A",
                ],
                ["CAGR", formatPercent(backtest.cagr_percent)],
                [
                  "Net profit",
                  formatCurrency(backtest.net_profit_amount),
                ],
                [
                  "Won / lost",
                  backtest.winning_trades != null || backtest.losing_trades != null
                    ? `${backtest.winning_trades ?? "—"} / ${backtest.losing_trades ?? "—"}`
                    : "N/A",
                ],
                ["Average duration", backtest.average_trade_duration || "N/A"],
              ].map(([label, value]) => (
                <div key={label as string} className="bg-card px-4 py-3">
                  <p className="eyebrow truncate">{label}</p>
                  <p
                    className={
                      "mt-1.5 font-mono text-sm font-medium " +
                      (value === "N/A"
                        ? "text-muted-foreground/60"
                        : "text-foreground")
                    }
                  >
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="notes">
            <NotesSection entityType="backtest" entityId={backtest.id} />
          </TabsContent>

          <TabsContent value="attachments">
            <AttachmentsSection entityType="backtest" entityId={backtest.id} />
          </TabsContent>
        </Tabs>
      </div>
    </Drawer>
  );
}
