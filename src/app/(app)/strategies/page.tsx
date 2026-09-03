"use client";

import React, { useEffect, useState, useMemo, useDeferredValue } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { useAuth } from "@/components/providers/auth-provider";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Toolbar,
  ToolbarCheckbox,
  ViewSwitch,
  SearchField,
} from "@/components/ui/toolbar";
import {
  Layers,
  Plus,
  ArrowRight,
  GitBranch,
  RotateCcw,
  LayoutGrid,
  List,
  Calendar,
} from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/utils";
import { useCachedState, readQueryCache } from "@/lib/query-cache";
import { CardGridSkeleton, TableSkeleton } from "@/components/ui/skeleton";

import { Strategy } from "@/types/database";

export interface StrategyWithRelations {
  id: string;
  name: string;
  strategy_family: string;
  description: string | null;
  default_direction: Strategy["default_direction"];
  status: Strategy["status"];
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  creator?: { display_name: string } | null;
  versions?: Array<{ id: string; version_name: string; is_current: boolean }>;
  tags?: Array<{ tag: { id: string; name: string } | null }>;
  tagList: string[];
}

export default function StrategiesPage() {
  const { canEdit, user } = useAuth();
  const router = useRouter();

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState("");
  const [familyFilter, setFamilyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateAddedRange, setDateAddedRange] = useState<"all" | "today" | "7d" | "30d" | "90d" | "custom">("all");
  const [dateAddedFrom, setDateAddedFrom] = useState("");
  const [dateAddedTo, setDateAddedTo] = useState("");
  const [sortBy, setSortBy] = useState<"created_desc" | "created_asc" | "updated_desc" | "name_asc" | "name_desc">("created_desc");
  const [showArchived, setShowArchived] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const supabase = createClient();

  /* Active and archived are separate result sets, so they get separate cache
     entries — toggling between them shows the last known list at once instead
     of a skeleton. */
  const cacheKey = `strategies:${showArchived ? "archived" : "active"}`;
  const {
    data: strategies,
    setData: setStrategies,
    loading,
    setLoading,
    isRevalidating,
    setIsRevalidating,
  } = useCachedState<StrategyWithRelations[]>(cacheKey, []);

  const loadStrategies = async () => {
    const hasCached = readQueryCache(cacheKey) !== undefined;
    try {
      // Refreshing over cached rows is a quiet background update, not a
      // full-page loading state.
      if (hasCached) setIsRevalidating(true);
      else setLoading(true);
      let query = supabase
        .from("strategies")
        .select(`
          id,
          name,
          strategy_family,
          description,
          default_direction,
          status,
          created_at,
          updated_at,
          archived_at,
          creator:profiles!strategies_created_by_fkey(display_name),
          versions:strategy_versions(id, version_name, is_current),
          tags:strategy_tags(tag:tags(id, name))
        `)
        .order("created_at", { ascending: false });

      if (showArchived) {
        query = query.not("archived_at", "is", null);
      } else {
        query = query.is("archived_at", null);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Transform tags
      const transformed = (data || []).map((s: any) => ({
        ...s,
        tagList: s.tags?.map((t: any) => t.tag?.name).filter(Boolean) || [],
      }));

      setStrategies(transformed);
    } catch (err) {
      console.error("Load strategies error:", err);
    } finally {
      setLoading(false);
      setIsRevalidating(false);
    }
  };

  useEffect(() => {
    loadStrategies();
  }, [showArchived]);

  const handleRestoreStrategy = async (id: string, name: string) => {
    try {
      await supabase
        .from("strategies")
        .update({ archived_at: null, updated_by: user?.id })
        .eq("id", id);

      await supabase.from("activity_logs").insert({
        action: "strategy_restored",
        entity_type: "strategy",
        entity_id: id,
        description: `Restored archived strategy "${name}"`,
        user_id: user?.id,
      });

      loadStrategies();
    } catch (err) {
      console.error("Restore error:", err);
    }
  };

  /* The input keeps `searchQuery` so every keystroke paints immediately; the
     list re-filters off the deferred copy at lower priority. On a long list
     that is the difference between typing that keeps up and typing that
     stutters behind the render. */
  const deferredQuery = useDeferredValue(searchQuery);

  const filteredStrategies = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    const result = strategies.filter((s) => {
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q)) ||
        s.tagList.some((t: string) => t.toLowerCase().includes(q));

      const matchesFamily =
        familyFilter === "all" || s.strategy_family === familyFilter;
      const matchesStatus = statusFilter === "all" || s.status === statusFilter;

      // Date Added (Inserted into website) Filter
      if (dateAddedRange !== "all" && s.created_at) {
        const itemDate = new Date(s.created_at);
        const now = new Date();
        if (dateAddedRange === "today") {
          const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          if (itemDate < startOfToday) return false;
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

      return matchesSearch && matchesFamily && matchesStatus;
    });

    // Date-wise and alphabetical sorting
    result.sort((a, b) => {
      if (sortBy === "created_desc") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === "created_asc") {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (sortBy === "updated_desc") {
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
      if (sortBy === "name_asc") {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === "name_desc") {
        return b.name.localeCompare(a.name);
      }
      return 0;
    });

    return result;
  }, [strategies, deferredQuery, familyFilter, statusFilter, dateAddedRange, dateAddedFrom, dateAddedTo, sortBy]);

  const allFamilies = useMemo(
    () =>
      Array.from(new Set(strategies.map((s) => s.strategy_family))).filter(
        Boolean
      ),
    [strategies]
  );

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Record"
        title="Strategies"
        description="Every trading idea the team has defined, with its rule versions and the backtests run against them."
      />

      <Toolbar
        trailing={
          <ViewSwitch
            value={viewMode}
            onChange={(v) => setViewMode(v as "grid" | "table")}
            options={[
              {
                value: "grid",
                label: "Card view",
                icon: <LayoutGrid className="h-3.5 w-3.5" />,
              },
              {
                value: "table",
                label: "Table view",
                icon: <List className="h-3.5 w-3.5" />,
              },
            ]}
          />
        }
      >
        <SearchField
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search names, descriptions, tags"
        />

        <Select
          value={familyFilter}
          onChange={(e) => setFamilyFilter(e.target.value)}
          className="h-8 w-36 text-xs"
          aria-label="Filter by family"
        >
          <option value="all">All families</option>
          {allFamilies.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </Select>

        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-8 w-36 text-xs"
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          <option value="Idea">Idea</option>
          <option value="Baseline">Baseline</option>
          <option value="Experimental">Experimental</option>
          <option value="Candidate">Candidate</option>
          <option value="Validation">Validation</option>
          <option value="OOS Passed">OOS Passed</option>
          <option value="Paper Trading">Paper Trading</option>
          <option value="Production Candidate">Production Candidate</option>
          <option value="Live">Live</option>
          <option value="Rejected">Rejected</option>
        </Select>

        {/* Date Added (Inserted) Filter */}
        <Select
          value={dateAddedRange}
          onChange={(e) => setDateAddedRange(e.target.value as any)}
          className="h-8 w-36 text-xs"
          aria-label="Filter by date added"
        >
          <option value="all">Any date added</option>
          <option value="today">Added today</option>
          <option value="7d">Added past 7 days</option>
          <option value="30d">Added past 30 days</option>
          <option value="90d">Added past 90 days</option>
          <option value="custom">Custom date…</option>
        </Select>

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

        {/* Sort Order */}
        <Select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="h-8 w-36 text-xs"
          aria-label="Sort strategies"
        >
          <option value="created_desc">Newest inserted</option>
          <option value="created_asc">Oldest inserted</option>
          <option value="updated_desc">Recently updated</option>
          <option value="name_asc">Name (A–Z)</option>
          <option value="name_desc">Name (Z–A)</option>
        </Select>

        <ToolbarCheckbox checked={showArchived} onChange={setShowArchived}>
          Archived only
        </ToolbarCheckbox>

        <span className="ml-auto flex shrink-0 items-center gap-2 pr-1 font-mono text-[11px] text-muted-foreground">
          {isRevalidating && (
            <span
              aria-hidden
              className="h-3 w-3 animate-spin rounded-full border border-border border-t-primary"
            />
          )}
          {filteredStrategies.length} of {strategies.length}
        </span>
      </Toolbar>

      {loading ? (
        viewMode === "grid" ? (
          <CardGridSkeleton count={6} />
        ) : (
          <TableSkeleton rows={10} cols={6} />
        )
      ) : filteredStrategies.length === 0 ? (
        <EmptyState
          icon={<Layers className="h-5 w-5" />}
          title={showArchived ? "No archived strategies" : "No strategies yet"}
          description={
            showArchived
              ? "Nothing has been archived. Clear the filter to see active strategies."
              : strategies.length === 0
                ? "A strategy holds the trading idea; versions hold the rules; backtests hold the results. Start with the idea."
                : "No strategies match these filters."
          }
          action={
            canEdit &&
            !showArchived && (
              <Link href="/strategies/new">
                <Button size="sm">
                  <Plus className="h-3.5 w-3.5" />
                  New strategy
                </Button>
              </Link>
            )
          }
        />
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredStrategies.map((strategy) => (
            <Card
              key={strategy.id}
              className="flex flex-col transition-colors hover:border-primary/35"
            >
              <div className="flex-1 space-y-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={`/strategies/${strategy.id}`}
                    onMouseEnter={() => router.prefetch(`/strategies/${strategy.id}`)}
                    onFocus={() => router.prefetch(`/strategies/${strategy.id}`)}
                    className="text-[15px] font-semibold leading-snug tracking-tight text-foreground hover:text-primary hover:underline"
                  >
                    {strategy.name}
                  </Link>
                  <StatusBadge
                    status={strategy.status}
                    className="shrink-0"
                  />
                </div>

                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] text-muted-foreground">
                  <span className="text-foreground">
                    {strategy.strategy_family}
                  </span>
                  <span aria-hidden>·</span>
                  <span>{strategy.default_direction}</span>
                  <span aria-hidden>·</span>
                  <span className="inline-flex items-center gap-1">
                    <GitBranch className="h-3 w-3" />
                    {strategy.versions?.length || 0} version
                    {strategy.versions?.length === 1 ? "" : "s"}
                  </span>
                </p>

                {strategy.description && (
                  <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {strategy.description}
                  </p>
                )}

                {strategy.tagList.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {strategy.tagList.slice(0, 5).map((tag: string) => (
                      <span
                        key={tag}
                        className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                    {strategy.tagList.length > 5 && (
                      <span className="px-1 py-0.5 font-mono text-[10px] text-muted-foreground">
                        +{strategy.tagList.length - 5}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3">
                <div
                  className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground"
                  title={`Inserted into website on ${formatDateTime(strategy.created_at)}`}
                >
                  <Calendar className="h-3 w-3 text-primary/70" />
                  <span>Added {formatDate(strategy.created_at)}</span>
                  {strategy.creator?.display_name && (
                    <>
                      <span aria-hidden>·</span>
                      <span className="max-w-[100px] truncate">
                        {strategy.creator.display_name}
                      </span>
                    </>
                  )}
                </div>

                {strategy.archived_at ? (
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() =>
                      handleRestoreStrategy(strategy.id, strategy.name)
                    }
                  >
                    <RotateCcw className="h-3 w-3" />
                    Restore
                  </Button>
                ) : (
                  <Link
                    href={`/strategies/${strategy.id}`}
                    onMouseEnter={() => router.prefetch(`/strategies/${strategy.id}`)}
                    onFocus={() => router.prefetch(`/strategies/${strategy.id}`)}
                  >
                    <Button size="xs" variant="ghost">
                      Open
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="pl-5">Strategy</th>
                  <th>Family</th>
                  <th>Direction</th>
                  <th>Status</th>
                  <th className="text-right">Versions</th>
                  <th>Tags</th>
                  <th>Date Added</th>
                  <th className="pr-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStrategies.map((s) => (
                  <tr key={s.id}>
                    <td className="max-w-[18rem] pl-5">
                        <Link
                          href={`/strategies/${s.id}`}
                          onMouseEnter={() => router.prefetch(`/strategies/${s.id}`)}
                          onFocus={() => router.prefetch(`/strategies/${s.id}`)}
                        className="block truncate font-medium text-foreground hover:text-primary hover:underline"
                      >
                        {s.name}
                      </Link>
                    </td>
                    <td className="text-muted-foreground">
                      {s.strategy_family}
                    </td>
                    <td className="text-muted-foreground">
                      {s.default_direction}
                    </td>
                    <td>
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="text-right font-mono text-muted-foreground">
                      {s.versions?.length || 0}
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {s.tagList.slice(0, 3).map((t: string) => (
                          <span
                            key={t}
                            className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td
                      className="whitespace-nowrap font-mono text-xs text-muted-foreground"
                      title={`Inserted into website on ${formatDateTime(s.created_at)}`}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 text-muted-foreground/60" />
                        {formatDate(s.created_at)}
                      </span>
                    </td>
                    <td className="pr-5 text-right">
                      {s.archived_at ? (
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => handleRestoreStrategy(s.id, s.name)}
                        >
                          Restore
                        </Button>
                      ) : (
                      <Link
                        href={`/strategies/${s.id}`}
                        onMouseEnter={() => router.prefetch(`/strategies/${s.id}`)}
                        onFocus={() => router.prefetch(`/strategies/${s.id}`)}
                      >
                          <Button size="xs" variant="outline">
                            Open
                          </Button>
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
