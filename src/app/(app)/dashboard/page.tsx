"use client";

import React from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { useAuth } from "@/components/providers/auth-provider";
import { useDashboardData } from "@/components/providers/page-data-provider";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MetricPlate } from "@/components/ui/metric";
import {
  Layers,
  FlaskConical,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
  ArrowRight,
  GitBranch,
  Clock,
} from "lucide-react";
import { formatPercent, formatNumber, formatDateTime } from "@/lib/utils";

export default function DashboardPage() {
  const { profile, canEdit } = useAuth();
  const {
    stats,
    recentBacktests,
    recentStrategies,
    recentActivity,
    needingValidation,
  } = useDashboardData();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Overview"
        title="Research dashboard"
        description={`The state of the record, ${
          profile?.display_name || "researcher"
        }. Every strategy, version, and backtest the team has logged.`}
      />

      {/* Readings off the record */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <MetricPlate
          label="Strategies"
          value={formatNumber(stats.totalStrategies, 0)}
          note="Distinct trading ideas"
          icon={<Layers className="h-4 w-4" />}
        />
        <MetricPlate
          label="Versions"
          value={formatNumber(stats.totalVersions, 0)}
          note="Rule iterations"
          icon={<GitBranch className="h-4 w-4" />}
        />
        <MetricPlate
          label="Backtests"
          value={formatNumber(stats.totalBacktests, 0)}
          note="Logged experiments"
          icon={<FlaskConical className="h-4 w-4" />}
        />
        <MetricPlate
          label="Candidates"
          value={formatNumber(stats.candidatesCount, 0)}
          note="In active development"
          tone="attention"
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <MetricPlate
          label="Validated"
          value={formatNumber(stats.validatedCount, 0)}
          note="OOS passed or live"
          tone="gain"
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <MetricPlate
          label="Rejected"
          value={formatNumber(stats.rejectedCount, 0)}
          note="Discarded ideas"
          icon={<XCircle className="h-4 w-4" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-7">
          {/* Latest experiments */}
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
              <div>
                <CardTitle className="text-sm">Latest backtest runs</CardTitle>
                <CardDescription>
                  The five most recent experiments entered into the lab
                </CardDescription>
              </div>
              <Link
                href="/backtests"
                className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                All backtests <ArrowRight className="h-3 w-3" />
              </Link>
            </CardHeader>

            <CardContent className="p-0">
              {recentBacktests.length === 0 ? (
                <EmptyRow>No backtests recorded yet. Add one to start the log.</EmptyRow>
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th className="pl-5">Backtest</th>
                        <th>Market</th>
                        <th className="text-right">Trades</th>
                        <th className="text-right">PF</th>
                        <th className="text-right">Return</th>
                        <th className="pr-5 text-right">Max DD</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentBacktests.map((bt) => (
                        <tr key={bt.id}>
                          <td className="max-w-[16rem] pl-5">
                            <Link
                              href={`/backtests/${bt.id}`}
                              className="block truncate font-medium text-foreground hover:text-primary hover:underline"
                            >
                              {bt.backtest_name}
                            </Link>
                          </td>
                          <td className="whitespace-nowrap font-mono text-muted-foreground">
                            {bt.symbol}{" "}
                            <span className="text-foreground">
                              {bt.timeframe}
                            </span>
                          </td>
                          <td className="text-right font-mono text-muted-foreground">
                            {formatNumber(bt.total_trades, 0)}
                          </td>
                          <td className="text-right font-mono font-semibold text-foreground">
                            {bt.profit_factor != null
                              ? Number(bt.profit_factor).toFixed(2)
                              : "—"}
                          </td>
                          <td className="text-right">
                            <ReturnValue value={bt.net_profit_percent} />
                          </td>
                          <td className="pr-5 text-right font-mono text-muted-foreground">
                            {formatPercent(bt.max_drawdown_percent)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Awaiting validation */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-sun" />
                Awaiting out-of-sample validation
              </CardTitle>
              <CardDescription>
                Strong development results are not yet trustworthy results.
                These still need an OOS test.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {needingValidation.length === 0 ? (
                <EmptyRow>Every top backtest has been validated out of sample.</EmptyRow>
              ) : (
                <ul className="divide-y divide-border">
                  {needingValidation.map((bt) => (
                    <li
                      key={bt.id}
                      className="flex items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-accent/50"
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/backtests/${bt.id}`}
                          className="block truncate text-xs font-semibold text-foreground hover:text-primary hover:underline"
                        >
                          {bt.backtest_name}
                        </Link>
                        <p className="truncate font-mono text-[11px] text-muted-foreground">
                          {bt.symbol} {bt.timeframe} · {bt.source}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3 text-xs">
                        <span className="font-mono text-muted-foreground">
                          PF{" "}
                          <span className="font-semibold text-foreground">
                            {bt.profit_factor != null
                              ? Number(bt.profit_factor).toFixed(2)
                              : "—"}
                          </span>
                        </span>
                        <ReturnValue value={bt.net_profit_percent} />
                        <Link href={`/backtests/${bt.id}`}>
                          <Button size="xs" variant="outline">
                            Review
                          </Button>
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5 lg:col-span-5">
          {/* Strategies */}
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
              <div>
                <CardTitle className="text-sm">Active strategies</CardTitle>
                <CardDescription>Most recently defined ideas</CardDescription>
              </div>
              <Link
                href="/strategies"
                className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                All strategies <ArrowRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {recentStrategies.length === 0 ? (
                <EmptyRow>No strategies defined yet.</EmptyRow>
              ) : (
                <ul className="divide-y divide-border">
                  {recentStrategies.map((s) => (
                    <li key={s.id}>
                      <Link
                        href={`/strategies/${s.id}`}
                        className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-accent/50"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-foreground">
                            {s.name}
                          </p>
                          <p className="truncate font-mono text-[11px] text-muted-foreground">
                            {s.strategy_family} · {s.default_direction}
                          </p>
                        </div>
                        <Badge variant="outline" className="shrink-0">
                          {s.status}
                        </Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Activity */}
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Activity className="h-4 w-4 text-primary" />
                  Audit trail
                </CardTitle>
                <CardDescription>
                  Who changed what, and when
                </CardDescription>
              </div>
              <Link
                href="/activity"
                className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Full log <ArrowRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {recentActivity.length === 0 ? (
                <EmptyRow>No activity recorded yet.</EmptyRow>
              ) : (
                <ul className="divide-y divide-border">
                  {recentActivity.map((act) => (
                    <li
                      key={act.id}
                      className="px-5 py-3 transition-colors hover:bg-accent/50"
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="truncate text-xs font-semibold capitalize text-foreground">
                          {act.action.replace(/_/g, " ")}
                        </span>
                        <span className="flex shrink-0 items-center gap-1 font-mono text-[10px] text-muted-foreground">
                          <Clock className="h-2.5 w-2.5" />
                          {formatDateTime(act.created_at)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                        {act.description ||
                          `${act.user?.display_name || "A team member"} performed ${act.action}`}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function EmptyRow({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-5 py-8 text-center text-xs text-muted-foreground">
      {children}
    </p>
  );
}

function ReturnValue({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) {
    return <span className="val-null">—</span>;
  }
  const positive = Number(value) >= 0;
  return (
    <span className={positive ? "val-gain" : "val-loss"}>
      {positive ? "+" : ""}
      {formatPercent(value)}
    </span>
  );
}
