"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { useAuth } from "@/components/providers/auth-provider";
import { createClient } from "@/utils/supabase/client";
import { ActivityLog } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import {
  Activity,
  Layers,
  FlaskConical,
  MessageSquare,
  Paperclip,
  Clock,
  User,
  Filter,
  ArrowRight,
  TrendingUp,
  Archive,
  RotateCcw,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { ListRowsSkeleton } from "@/components/ui/skeleton";
import { useCachedState, readQueryCache } from "@/lib/query-cache";

export default function ActivityPage() {
  const { user } = useAuth();
  const supabase = createClient();

  const [entityFilter, setEntityFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");

  // The entity filter is applied server-side, so it is part of the key.
  const cacheKey = `activity:${entityFilter}`;
  const {
    data: logs,
    setData: setLogs,
    loading,
    setLoading,
    setIsRevalidating,
  } = useCachedState<ActivityLog[]>(cacheKey, []);

  const loadActivityLogs = async () => {
    const hasCached = readQueryCache(cacheKey) !== undefined;
    try {
      if (hasCached) setIsRevalidating(true);
      else setLoading(true);
      let query = supabase
        .from("activity_logs")
        .select(`
          *,
          user:profiles(display_name, email, role)
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (entityFilter !== "all") {
        query = query.eq("entity_type", entityFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error("Load activity logs error:", err);
    } finally {
      setLoading(false);
      setIsRevalidating(false);
    }
  };

  useEffect(() => {
    loadActivityLogs();
  }, [entityFilter]);

  const filteredLogs = logs.filter((log) => {
    if (actionFilter !== "all" && log.action !== actionFilter) return false;
    return true;
  });

  const getEntityIcon = (type: string) => {
    switch (type) {
      case "strategy":
        return <Layers className="h-4 w-4 text-primary" />;
      case "strategy_version":
        return <TrendingUp className="h-4 w-4 text-primary" />;
      case "backtest":
        return <FlaskConical className="h-4 w-4 text-primary" />;
      case "note":
        return <MessageSquare className="h-4 w-4 text-sun" />;
      case "attachment":
        return <Paperclip className="h-4 w-4 text-chart-4" />;
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActionBadge = (action: string) => {
    const label = action.replace(/_/g, " ");
    if (action.includes("created")) return <Badge variant="success">{label}</Badge>;
    if (action.includes("updated") || action.includes("changed"))
      return <Badge variant="info">{label}</Badge>;
    if (action.includes("archived")) return <Badge variant="warning">{label}</Badge>;
    if (action.includes("deleted"))
      return <Badge variant="destructive">{label}</Badge>;
    return <Badge variant="secondary">{label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Activity"
        description="Every write to the record, newest first — who added a strategy, edited a rule, logged a backtest, or attached a file."
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-border bg-card p-2.5 text-xs shadow-plate">
        <div className="flex items-center gap-2">
          <span className="eyebrow">Entity</span>
          <Select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="h-8 w-36 text-xs"
            aria-label="Filter by entity"
          >
            <option value="all">All entities</option>
            <option value="strategy">Strategies</option>
            <option value="strategy_version">Versions</option>
            <option value="backtest">Backtests</option>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="eyebrow">Action</span>
          <Select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="h-8 w-44 text-xs"
            aria-label="Filter by action"
          >
            <option value="all">All actions</option>
            <option value="strategy_created">Strategy created</option>
            <option value="strategy_updated">Strategy updated</option>
            <option value="strategy_archived">Strategy archived</option>
            <option value="strategy_restored">Strategy restored</option>
            <option value="strategy_version_created">Version created</option>
            <option value="backtest_created">Backtest created</option>
            <option value="backtest_updated">Backtest updated</option>
            <option value="note_created">Note added</option>
            <option value="attachment_uploaded">File attached</option>
          </Select>
        </div>
      </div>

      {/* The audit trail is a real chronology, so it is set as one: a single
          rule running down the page with a marker at each write. */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <ListRowsSkeleton rows={10} />
          ) : filteredLogs.length === 0 ? (
            <p className="py-12 text-center text-xs text-muted-foreground">
              No activity matches these filters.
            </p>
          ) : (
            <ol className="relative py-2">
              {/* the spine */}
              <span
                aria-hidden
                className="absolute bottom-6 left-[2.4rem] top-6 w-px bg-border"
              />

              {filteredLogs.map((log) => (
                <li
                  key={log.id}
                  className="relative flex gap-4 px-5 py-3.5 transition-colors hover:bg-accent/40"
                >
                  <span className="relative z-10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-card">
                    {getEntityIcon(log.entity_type)}
                  </span>

                  <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-semibold text-foreground">
                          {log.user?.display_name || "A team member"}
                        </span>
                        {getActionBadge(log.action)}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-foreground">
                        {log.description ||
                          `${log.action.replace(/_/g, " ")} on ${log.entity_type}`}
                      </p>
                      <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
                        {log.entity_type} &middot; {log.entity_id}
                      </p>
                    </div>

                    <time className="flex shrink-0 items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDateTime(log.created_at)}
                    </time>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
