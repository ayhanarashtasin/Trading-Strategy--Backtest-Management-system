"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAuth } from "@/components/providers/auth-provider";
import { useStrategyDetailData } from "@/components/providers/page-data-provider";
import { createClient } from "@/utils/supabase/client";
import { StrategyVersion } from "@/types/database";
import type { StrategyDetailData } from "@/types/page-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { VersionFormDialog } from "@/components/strategies/version-form-dialog";
import { NotesSection } from "@/components/shared/notes-section";
import { AttachmentsSection } from "@/components/shared/attachments-section";
import {
  Layers,
  FlaskConical,
  Edit,
  Plus,
  ArrowLeft,
  Trash2,
  Archive,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  Paperclip,
  MessageSquare,
  Activity,
  FileCode,
  ShieldAlert,
  Calendar,
} from "lucide-react";
import { formatPercent, formatNumber, formatDate, formatDateTime } from "@/lib/utils";

export default function StrategyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { canEdit, isOwner, user } = useAuth();
  const initialData = useStrategyDetailData();
  const supabase = createClient();

  const [strategy, setStrategy] = useState(initialData.strategy);
  const [versions, setVersions] = useState(initialData.versions);
  const [backtests, setBacktests] = useState(initialData.backtests);
  const [tags, setTags] = useState(initialData.tags);
  const [activityLogs, setActivityLogs] = useState(initialData.activityLogs);

  // Version modal state
  const [versionModalOpen, setVersionModalOpen] = useState(false);
  const [versionToEdit, setVersionToEdit] = useState<StrategyVersion | null>(null);

  // Delete confirmation modal state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const loadStrategyData = async () => {
    try {
      // A single RLS-aware read model refreshes every strategy panel.
      const { data, error } = await supabase.rpc("get_strategy_detail", {
        p_strategy_id: id,
      });
      if (error) throw error;

      const next = data as StrategyDetailData;
      setStrategy(next.strategy);
      setVersions(next.versions);
      setTags(next.tags);
      setBacktests(next.backtests);
      setActivityLogs(next.activityLogs);
    } catch (err) {
      console.error("Strategy detail fetch error:", err);
    }
  };

  useEffect(() => {
    if (searchParams.get("openNewVersion") === "true") {
      setVersionToEdit(null);
      setVersionModalOpen(true);
    }
  }, [id]);

  const handleArchiveToggle = async () => {
    if (!strategy) return;
    const newArchived = strategy.archived_at ? null : new Date().toISOString();
    try {
      await supabase
        .from("strategies")
        .update({ archived_at: newArchived, updated_by: user?.id })
        .eq("id", strategy.id);

      await supabase.from("activity_logs").insert({
        action: newArchived ? "strategy_archived" : "strategy_restored",
        entity_type: "strategy",
        entity_id: strategy.id,
        description: newArchived
          ? `Archived strategy "${strategy.name}"`
          : `Restored strategy "${strategy.name}"`,
        user_id: user?.id,
      });

      loadStrategyData();
    } catch (err) {
      console.error("Archive toggle error:", err);
    }
  };

  const handlePermanentDelete = async () => {
    if (!strategy || !isOwner) return;
    try {
      await supabase.from("strategies").delete().eq("id", strategy.id);
      router.push("/strategies");
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  if (!strategy) {
    return (
      <div className="space-y-3 py-16 text-center">
        <Layers className="mx-auto h-9 w-9 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">
          This strategy is not in the record
        </h2>
        <p className="text-xs text-muted-foreground">
          It may have been permanently deleted.
        </p>
        <Link href="/strategies">
          <Button size="sm" variant="outline">
            Back to strategies
          </Button>
        </Link>
      </div>
    );
  }

  const currentVersion = versions.find((v) => v.is_current) || versions[0];

  return (
    <>
      <div className="space-y-6">
        {/* Breadcrumb & Navigation */}
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] text-muted-foreground"
        >
          <Link
            href="/strategies"
            className="flex items-center gap-1 hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" />
            Strategies
          </Link>
          <span aria-hidden>/</span>
          <span className="text-foreground">{strategy.name}</span>
        </nav>

        {/* Strategy Header Card */}
        <Card className="space-y-5 p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div className="min-w-0 space-y-2.5">
              <p className="eyebrow">{strategy.strategy_family}</p>

              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                  {strategy.name}
                </h1>
                <StatusBadge status={strategy.status} />
                {strategy.archived_at && (
                  <Badge variant="destructive">Archived</Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="font-mono font-semibold text-foreground">
                  {strategy.default_direction}
                </span>
                <span aria-hidden>&middot;</span>
                <span
                  className="inline-flex items-center gap-1 font-mono"
                  title={`Inserted into website on ${formatDateTime(strategy.created_at)}`}
                >
                  <Calendar className="h-3 w-3 text-primary/70" />
                  Inserted on {formatDate(strategy.created_at)}
                </span>
                <span aria-hidden>&middot;</span>
                <span>
                  Created by {strategy.creator?.display_name || "a team member"}
                </span>
              </div>

              {strategy.description && (
                <p className="max-w-3xl pt-1 text-xs leading-relaxed text-muted-foreground">
                  {strategy.description}
                </p>
              )}
            </div>

            {/* Action Buttons Toolbar */}
            <div className="flex flex-wrap items-center gap-2">
              {canEdit && (
                <>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => {
                      setVersionToEdit(null);
                      setVersionModalOpen(true);
                    }}
                    className="gap-1 text-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    New version
                  </Button>

                  {currentVersion && (
                    <Link href={`/backtests/new?versionId=${currentVersion.id}`}>
                      <Button size="xs" variant="default" className="gap-1 text-xs">
                        <FlaskConical className="h-3.5 w-3.5" />
                        Add backtest
                      </Button>
                    </Link>
                  )}

                  <Link href={`/strategies/${strategy.id}/edit`}>
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
                    {strategy.archived_at ? (
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

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 border-t border-border pt-4">
              <span className="eyebrow mr-1">Tags</span>
              {tags.map((t) => (
                <span
                  key={t.id}
                  className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                >
                  {t.name}
                </span>
              ))}
            </div>
          )}
        </Card>

        {/* Tabbed Detail Sections */}
        <Tabs defaultValue="versions" className="space-y-4">
          <TabsList>
            <TabsTrigger value="versions" className="gap-1.5">
              <Layers className="h-3.5 w-3.5" />
              Versions ({versions.length})
            </TabsTrigger>
            <TabsTrigger value="backtests" className="gap-1.5">
              <FlaskConical className="h-3.5 w-3.5" />
              Backtests ({backtests.length})
            </TabsTrigger>
            <TabsTrigger value="notes" className="gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              Notes
            </TabsTrigger>
            <TabsTrigger value="attachments" className="gap-1.5">
              <Paperclip className="h-3.5 w-3.5" />
              Attachments
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-1.5">
              <Activity className="h-3.5 w-3.5" />
              Activity
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: VERSIONS */}
          <TabsContent value="versions" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Rule versions</h2>
              {canEdit && (
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => {
                    setVersionToEdit(null);
                    setVersionModalOpen(true);
                  }}
                  className="gap-1 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add version
                </Button>
              )}
            </div>

            {versions.length === 0 ? (
              <Card className="border-dashed bg-muted/40 p-8 text-center text-xs text-muted-foreground">
                No versions yet. A version holds the entry, exit and risk rules
                a backtest is run against — add one to start logging results.
              </Card>
            ) : (
              <div className="space-y-4">
                {versions.map((ver) => (
                  <Card
                    key={ver.id}
                    className={`space-y-4 p-5 ${
                      ver.is_current ? "border-primary/40" : ""
                    }`}
                  >
                    <div className="flex flex-col justify-between gap-2 border-b border-border pb-3 sm:flex-row sm:items-center">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-mono text-base font-semibold text-foreground">
                          {ver.version_name}
                        </span>
                        {ver.is_current && (
                          <Badge variant="success">Current</Badge>
                        )}
                        <span className="eyebrow">
                          Revision {ver.version_number}
                        </span>
                        <span
                          className="inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground"
                          title={`Version added on ${formatDateTime(ver.created_at)}`}
                        >
                          <Calendar className="h-2.5 w-2.5 text-muted-foreground/70" />
                          Added {formatDate(ver.created_at)}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        {canEdit && (
                          <>
                            <Link href={`/backtests/new?versionId=${ver.id}`}>
                              <Button size="xs" variant="default" className="text-[11px] gap-1">
                                <FlaskConical className="h-3 w-3" />
                                Add backtest
                              </Button>
                            </Link>
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => {
                                setVersionToEdit(ver);
                                setVersionModalOpen(true);
                              }}
                              className="text-[11px]"
                            >
                              Edit
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {ver.description && (
                      <p className="text-xs text-muted-foreground leading-relaxed">{ver.description}</p>
                    )}

                    {/* Rules Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      {ver.entry_rules && (
                        <div className="rounded-md border border-border bg-muted/50 p-3">
                          <span className="eyebrow mb-1 block text-profit">Entry Rules</span>
                          <p className="text-muted-foreground whitespace-pre-wrap text-xs">{ver.entry_rules}</p>
                        </div>
                      )}

                      {ver.exit_rules && (
                        <div className="rounded-md border border-border bg-muted/50 p-3">
                          <span className="eyebrow mb-1 block text-sun">Exit Rules</span>
                          <p className="text-muted-foreground whitespace-pre-wrap text-xs">{ver.exit_rules}</p>
                        </div>
                      )}

                      {ver.risk_rules && (
                        <div className="rounded-md border border-border bg-muted/50 p-3">
                          <span className="eyebrow mb-1 block text-loss">Risk Rules</span>
                          <p className="text-muted-foreground whitespace-pre-wrap text-xs">{ver.risk_rules}</p>
                        </div>
                      )}
                    </div>

                    {!ver.description &&
                      !ver.entry_rules &&
                      !ver.exit_rules &&
                      !ver.risk_rules &&
                      !ver.parameter_summary && (
                        <p className="text-xs text-muted-foreground">
                          No rules recorded for this version yet.
                          {canEdit &&
                            " Use Edit to add entry, exit and risk rules."}
                        </p>
                      )}

                    {/* Parameter Summary */}
                    {ver.parameter_summary && (
                      <div className="rounded-md border border-border bg-muted/50 p-3">
                        <span className="eyebrow mb-1 block">Parameters</span>
                        <p className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-muted-foreground">
                          {ver.parameter_summary}
                        </p>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* TAB 2: BACKTESTS */}
          <TabsContent value="backtests" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Backtests</h2>
              {canEdit && currentVersion && (
                <Link href={`/backtests/new?versionId=${currentVersion.id}`}>
                  <Button size="xs" variant="default" className="gap-1 text-xs">
                    <Plus className="h-3.5 w-3.5" />
                    Add backtest
                  </Button>
                </Link>
              )}
            </div>

            {backtests.length === 0 ? (
              <Card className="border-dashed bg-muted/40 p-8 text-center text-xs text-muted-foreground">
                No backtests logged against this strategy yet.
              </Card>
            ) : (
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th className="pl-5">Backtest</th>
                        <th>Version</th>
                        <th>Market</th>
                        <th>Source</th>
                        <th>Date Added</th>
                        <th className="text-right">Trades</th>
                        <th className="text-right">PF</th>
                        <th className="text-right">Return</th>
                        <th className="text-right">Max DD</th>
                        <th className="text-right">Win rate</th>
                        <th className="pr-5 text-right">Open</th>
                      </tr>
                    </thead>
                    <tbody>
                      {backtests.map((bt) => (
                        <tr key={bt.id}>
                          <td className="max-w-[16rem] pl-5">
                            <Link
                              href={`/backtests/${bt.id}`}
                              className="block truncate font-medium text-foreground hover:text-primary hover:underline"
                            >
                              {bt.backtest_name}
                            </Link>
                          </td>
                          <td className="font-mono text-muted-foreground">
                            {bt.version?.version_name || "V1"}
                          </td>
                          <td className="whitespace-nowrap font-mono text-muted-foreground">
                            {bt.symbol}{" "}
                            <span className="text-foreground">
                              {bt.timeframe}
                            </span>
                          </td>
                          <td>
                            <Badge variant="outline" className="font-mono">
                              {bt.source}
                            </Badge>
                          </td>
                          <td
                            className="whitespace-nowrap font-mono text-xs text-muted-foreground"
                            title={`Inserted into website on ${formatDateTime(bt.created_at)}`}
                          >
                            <span className="inline-flex items-center gap-1.5">
                              <Calendar className="h-3 w-3 text-muted-foreground/60" />
                              {formatDate(bt.created_at)}
                            </span>
                          </td>
                          <td className="text-right font-mono text-muted-foreground">
                            {formatNumber(bt.total_trades, 0)}
                          </td>
                          <td className="text-right font-mono font-semibold text-foreground">
                            {bt.profit_factor != null
                              ? Number(bt.profit_factor).toFixed(2)
                              : "N/A"}
                          </td>
                          <td className="text-right">
                            <span
                              className={
                                Number(bt.net_profit_percent) >= 0
                                  ? "val-gain"
                                  : "val-loss"
                              }
                            >
                              {formatPercent(bt.net_profit_percent)}
                            </span>
                          </td>
                          <td className="text-right font-mono text-loss">
                            {formatPercent(bt.max_drawdown_percent)}
                          </td>
                          <td className="text-right font-mono text-muted-foreground">
                            {formatPercent(bt.win_rate_percent)}
                          </td>
                          <td className="pr-5 text-right">
                            <Link href={`/backtests/${bt.id}`}>
                              <Button size="xs" variant="outline">
                                Open
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* TAB 3: RESEARCH NOTES */}
          <TabsContent value="notes">
            <NotesSection entityType="strategy" entityId={strategy.id} />
          </TabsContent>

          {/* TAB 4: ATTACHMENTS */}
          <TabsContent value="attachments">
            <AttachmentsSection entityType="strategy" entityId={strategy.id} />
          </TabsContent>

          {/* TAB 5: ACTIVITY LOG */}
          <TabsContent value="activity">
            <Card className="p-5 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Strategy Audit Trail</h3>
              {activityLogs.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No activity entries recorded yet.</p>
              ) : (
                <div className="divide-y divide-border text-xs">
                  {activityLogs.map((log) => (
                    <div key={log.id} className="py-3 flex items-start justify-between">
                      <div>
                        <span className="font-semibold text-foreground capitalize">
                          {log.action.replace(/_/g, " ")}
                        </span>
                        <p className="text-muted-foreground mt-0.5">{log.description || "Action performed"}</p>
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

      {/* Version Form Modal Dialog */}
      <VersionFormDialog
        open={versionModalOpen}
        onOpenChange={setVersionModalOpen}
        strategyId={strategy.id}
        versionToEdit={versionToEdit}
        currentUserId={user?.id}
        onSuccess={() => loadStrategyData()}
      />

      {/* Delete Confirmation Modal (Owner only) */}
      {isOwner && (
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent className="max-w-md" onClose={() => setDeleteConfirmOpen(false)}>
            <CardHeader className="p-0 mb-3">
              <div className="flex items-center space-x-2 text-destructive">
                <ShieldAlert className="h-5 w-5" />
                <CardTitle className="text-base font-bold">Permanently Delete Strategy?</CardTitle>
              </div>
              <CardDescription className="text-xs">
                This will permanently delete &quot;{strategy.name}&quot; and all linked versions, backtests, attachments, and notes. This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <div className="flex justify-end space-x-2 pt-3 border-t border-border">
              <Button size="sm" variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="destructive" onClick={handlePermanentDelete}>
                Permanently Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
