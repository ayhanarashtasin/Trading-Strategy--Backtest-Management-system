"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  SortingState,
  VisibilityState,
  ColumnOrderState,
  ColumnPinningState,
  RowSelectionState,
  flexRender,
} from "@tanstack/react-table";
import {
  BacktestRow,
  LeaderboardRow,
  createLeaderboardColumns,
  LEADERBOARD_COLUMN_METADATA,
  ALL_COLUMN_METADATA,
} from "@/components/backtests/table/column-definitions";
import { ColumnSettingsDialog } from "@/components/backtests/table/column-settings-dialog";
import { BacktestDrawer } from "@/components/backtests/drawer/backtest-drawer";
import { MonthlyResultsModal } from "@/components/backtests/monthly-results-modal";
import { useAuth } from "@/components/providers/auth-provider";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Sliders,
  Download,
  GitCompare,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Pin,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RotateCcw,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { TableRowsSkeleton } from "@/components/ui/skeleton";
import type { Strategy, StrategyVersion } from "@/types/database";
import type { StrategyDetailBacktest } from "@/types/page-data";

interface StrategyBacktestsTableProps {
  strategy: Pick<Strategy, "id" | "name">;
  currentVersion?: StrategyVersion | null;
  backtests: StrategyDetailBacktest[];
  canEdit: boolean;
  onRefresh?: () => void;
  columnSettingsOpen?: boolean;
  onColumnSettingsOpenChange?: (open: boolean) => void;
}

const DEFAULT_COLUMN_ORDER = LEADERBOARD_COLUMN_METADATA.map((c) => c.id);
const DEFAULT_COLUMN_PINNING: ColumnPinningState = {
  left: ["rank", "select", "backtest_name"],
  right: ["details"],
};

function getInitialStrategyVisibility(): VisibilityState {
  const vis: Record<string, boolean> = {
    rank: true,
    strategy_name: false, // Hidden by default on single strategy view
  };
  ALL_COLUMN_METADATA.forEach((col) => {
    if (col.id !== "strategy_name") {
      vis[col.id] = col.defaultVisible;
    }
  });
  return vis;
}

export function StrategyBacktestsTable({
  strategy,
  currentVersion,
  backtests,
  canEdit,
  onRefresh,
  columnSettingsOpen: externalColumnSettingsOpen,
  onColumnSettingsOpenChange,
}: StrategyBacktestsTableProps) {
  const { user } = useAuth();
  const supabase = createClient();

  // Modal & Drawer states
  const [selectedBacktestForDrawer, setSelectedBacktestForDrawer] = useState<LeaderboardRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedBacktestForMonthly, setSelectedBacktestForMonthly] = useState<LeaderboardRow | null>(null);
  const [monthlyModalOpen, setMonthlyModalOpen] = useState(false);

  // Column settings modal state (supports both controlled from parent and internal)
  const [internalColumnSettingsOpen, setInternalColumnSettingsOpen] = useState(false);
  const isColumnSettingsOpen =
    externalColumnSettingsOpen !== undefined ? externalColumnSettingsOpen : internalColumnSettingsOpen;
  const setColumnSettingsOpen = useCallback(
    (open: boolean) => {
      setInternalColumnSettingsOpen(open);
      onColumnSettingsOpenChange?.(open);
    },
    [onColumnSettingsOpenChange]
  );

  // TanStack table state
  const [sorting, setSorting] = useState<SortingState>([{ id: "created_at", desc: true }]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(getInitialStrategyVisibility);
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(DEFAULT_COLUMN_ORDER);
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>(DEFAULT_COLUMN_PINNING);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [pageSize, setPageSize] = useState(50);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  // Load User Table Preferences on Mount
  useEffect(() => {
    async function loadUserPreferences() {
      if (!user?.id) return;
      try {
        const { data: pref } = await supabase
          .from("user_table_preferences")
          .select("*")
          .eq("user_id", user.id)
          .eq("table_id", "strategy_backtests")
          .maybeSingle();

        if (pref) {
          if (pref.column_visibility && Object.keys(pref.column_visibility).length > 0) {
            setColumnVisibility({
              ...getInitialStrategyVisibility(),
              ...pref.column_visibility,
              ...(pref.column_visibility.created_at === undefined ? { created_at: true } : {}),
              ...(pref.column_visibility.leverage === undefined ? { leverage: true } : {}),
            });
          }
          if (pref.column_order && pref.column_order.length > 0) {
            let newOrder = [...pref.column_order];
            if (!newOrder.includes("created_at")) {
              const creatorIndex = newOrder.indexOf("creator_name");
              if (creatorIndex !== -1) {
                newOrder.splice(creatorIndex + 1, 0, "created_at");
              } else {
                newOrder.push("created_at");
              }
            }
            if (!newOrder.includes("leverage")) {
              const tfIndex = newOrder.indexOf("timeframe");
              if (tfIndex !== -1) {
                newOrder.splice(tfIndex + 1, 0, "leverage");
              } else {
                newOrder.push("leverage");
              }
            }
            setColumnOrder(newOrder);
          }
          if (pref.column_pinning) {
            setColumnPinning(pref.column_pinning);
          }
          if (pref.page_size) {
            setPageSize(pref.page_size);
          }
        }
      } catch (err) {
        console.error("Load strategy backtests table preferences error:", err);
      } finally {
        setPrefsLoaded(true);
      }
    }
    loadUserPreferences();
  }, [user?.id]);

  // Debounced save of preferences
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const savePreferences = (
    newVis = columnVisibility,
    newOrd = columnOrder,
    newPin = columnPinning,
    newSize = pageSize
  ) => {
    if (!user?.id || !prefsLoaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);

    saveTimer.current = setTimeout(async () => {
      try {
        await supabase.from("user_table_preferences").upsert(
          {
            user_id: user.id,
            table_id: "strategy_backtests",
            column_visibility: newVis,
            column_order: newOrd,
            column_pinning: newPin,
            column_sizing: {},
            page_size: newSize,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,table_id" }
        );
      } catch (err) {
        console.error("Save strategy backtests table prefs error:", err);
      }
    }, 500);
  };

  const handleVisibilityChange = (colId: string, visible: boolean) => {
    const nextVis = { ...columnVisibility, [colId]: visible };
    setColumnVisibility(nextVis);
    savePreferences(nextVis, columnOrder, columnPinning, pageSize);
  };

  const handleOrderChange = (newOrder: string[]) => {
    setColumnOrder(newOrder);
    savePreferences(columnVisibility, newOrder, columnPinning, pageSize);
  };

  const handlePinningChange = (colId: string, position: "left" | "right" | false) => {
    let nextLeft = (columnPinning.left || []).filter((id) => id !== colId);
    let nextRight = (columnPinning.right || []).filter((id) => id !== colId);

    if (position === "left") {
      nextLeft.push(colId);
    } else if (position === "right") {
      nextRight.push(colId);
    }

    const nextPin = { left: nextLeft, right: nextRight };
    setColumnPinning(nextPin);
    savePreferences(columnVisibility, columnOrder, nextPin, pageSize);
  };

  const handleResetToDefault = () => {
    const defaultVis = getInitialStrategyVisibility();
    const defaultOrd = DEFAULT_COLUMN_ORDER;
    const defaultPin = DEFAULT_COLUMN_PINNING;

    setColumnVisibility(defaultVis);
    setColumnOrder(defaultOrd);
    setColumnPinning(defaultPin);
    setPageSize(50);

    savePreferences(defaultVis, defaultOrd, defaultPin, 50);
  };

  // Open Drawer handler
  const handleViewDetails = useCallback((row: LeaderboardRow) => {
    setSelectedBacktestForDrawer(row);
    setDrawerOpen(true);
  }, []);

  // Open Monthly handler
  const handleViewMonthly = useCallback((row: LeaderboardRow) => {
    setSelectedBacktestForMonthly(row);
    setMonthlyModalOpen(true);
  }, []);

  // Map rows with rank and full metadata
  const rowsData = useMemo<LeaderboardRow[]>(() => {
    return (backtests || []).map((b, index) => ({
      ...b,
      rank: index + 1,
      strategy_name: b.strategy_name || strategy.name,
      strategy_id: b.strategy_id || strategy.id,
      version_name: b.version_name || b.version?.version_name || "V1",
      creator_name: b.creator_name || "Analyst",
    }));
  }, [backtests, strategy.id, strategy.name]);

  // Columns definition with leaderboard columns
  const columns = useMemo(
    () => createLeaderboardColumns(handleViewDetails, undefined, handleViewMonthly),
    [handleViewDetails, handleViewMonthly]
  );

  const table = useReactTable({
    data: rowsData,
    columns,
    state: {
      sorting,
      columnVisibility,
      columnOrder,
      columnPinning,
      rowSelection,
      pagination: {
        pageIndex: 0,
        pageSize,
      },
    },
    enableRowSelection: true,
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    onColumnPinningChange: setColumnPinning,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  // Selected rows for Compare
  const selectedRows = table.getSelectedRowModel().rows;
  const selectedIds = selectedRows.map((r) => r.original.id);

  // Check if current sort is not the default created_at sort
  const isSortedByCustom =
    sorting.length > 0 && (sorting[0].id !== "created_at" || !sorting[0].desc);

  // CSV Export handler
  const handleExportCSV = () => {
    if (rowsData.length === 0) return;

    const visibleCols = table
      .getVisibleLeafColumns()
      .filter((c) => c.id !== "select" && c.id !== "details" && c.id !== "monthly_results");
    const headers = visibleCols.map((c) => {
      const meta = LEADERBOARD_COLUMN_METADATA.find((m) => m.id === c.id);
      return meta ? meta.label : c.id;
    });

    const rows = rowsData.map((row) => {
      return visibleCols.map((c) => {
        const id = c.id;
        const val = (row as any)[id];
        if (val === null || val === undefined) return '""';
        if (typeof val === "boolean") return `"${val ? "Yes" : "No"}"`;
        if (typeof val === "number") return `"${val}"`;
        return `"${String(val).replace(/"/g, '""')}"`;
      });
    });

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `strategy_${strategy.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}_backtests_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-3">
      {/* Table Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-2.5 text-xs shadow-plate">
        <div className="flex items-center gap-2 pl-1">
          {selectedIds.length > 0 ? (
            <Link href={`/compare?ids=${selectedIds.join(",")}`}>
              <Button size="xs">
                <GitCompare className="h-3.5 w-3.5" />
                Compare {selectedIds.length} selected
              </Button>
            </Link>
          ) : (
            <span className="font-mono text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground">{rowsData.length}</span>{" "}
              backtest{rowsData.length === 1 ? "" : "s"}
            </span>
          )}

          {isSortedByCustom && (
            <Button
              size="xs"
              variant="outline"
              onClick={() => setSorting([{ id: "created_at", desc: true }])}
              className="gap-1 text-[11px] text-muted-foreground hover:text-foreground"
              title="Reset sorting back to newest first"
            >
              <RotateCcw className="h-3 w-3" />
              Reset sort
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Columns Button */}
          <Button
            size="xs"
            variant="outline"
            onClick={() => setColumnSettingsOpen(true)}
            className="gap-1.5"
            title="Configure visible columns from leaderboard"
          >
            <Sliders className="h-3.5 w-3.5" />
            Columns
          </Button>

          <Button
            size="xs"
            variant="outline"
            onClick={handleExportCSV}
            disabled={rowsData.length === 0}
            className="gap-1.5"
            title="Export backtests as CSV"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>

          {canEdit && currentVersion && (
            <Link href={`/backtests/new?versionId=${currentVersion.id}`}>
              <Button size="xs" variant="default" className="gap-1 text-xs">
                <Plus className="h-3.5 w-3.5" />
                Add backtest
              </Button>
            </Link>
          )}
        </div>
      </div>

      {rowsData.length === 0 ? (
        <Card className="border-dashed bg-muted/40 p-8 text-center text-xs text-muted-foreground">
          No backtests logged against this strategy yet.
          {canEdit && currentVersion && (
            <div className="mt-3">
              <Link href={`/backtests/new?versionId=${currentVersion.id}`}>
                <Button size="xs" variant="outline" className="gap-1 text-xs">
                  <Plus className="h-3.5 w-3.5" />
                  Add backtest
                </Button>
              </Link>
            </div>
          )}
        </Card>
      ) : (
        /* TanStack Table Container */
        <Card className="overflow-hidden">
          <div className="max-h-[640px] overflow-auto">
            <table className="table-dense w-full border-collapse text-left text-xs">
              <thead className="sticky top-0 z-20 select-none bg-muted font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      const isPinned = header.column.getIsPinned();
                      const canSort = header.column.getCanSort();
                      const sortDirection = header.column.getIsSorted();

                      return (
                        <th
                          key={header.id}
                          colSpan={header.colSpan}
                          style={{
                            width: header.getSize(),
                            left: isPinned === "left" ? `${header.column.getStart("left")}px` : undefined,
                            right: isPinned === "right" ? `${header.column.getAfter("right")}px` : undefined,
                            position: isPinned ? "sticky" : "relative",
                            zIndex: isPinned ? 30 : 1,
                          }}
                          className={`border-b border-r border-border bg-muted px-3 py-2.5 last:border-r-0 ${
                            isPinned === "left"
                              ? "shadow-[1px_0_0_0_hsl(var(--border))]"
                              : isPinned === "right"
                                ? "border-l shadow-[-1px_0_0_0_hsl(var(--border))]"
                                : ""
                          }`}
                        >
                          <div className="flex items-center justify-between space-x-1">
                            {canSort ? (
                              <button
                                type="button"
                                onClick={header.column.getToggleSortingHandler()}
                                className="flex items-center gap-1 transition-colors hover:text-foreground"
                              >
                                <span>
                                  {flexRender(
                                    header.column.columnDef.header,
                                    header.getContext()
                                  )}
                                </span>
                                {sortDirection === "asc" && <ArrowUp className="h-3 w-3 text-primary" />}
                                {sortDirection === "desc" && <ArrowDown className="h-3 w-3 text-primary" />}
                                {!sortDirection && (
                                  <ArrowUpDown className="h-2.5 w-2.5 opacity-35" />
                                )}
                              </button>
                            ) : (
                              <span>
                                {flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                              </span>
                            )}

                            {isPinned && <Pin className="h-2.5 w-2.5 text-primary opacity-70" />}
                          </div>

                          {/* Column Resize Handle */}
                          {header.column.getCanResize() && (
                            <div
                              onMouseDown={header.getResizeHandler()}
                              onTouchStart={header.getResizeHandler()}
                              className={`absolute right-0 top-0 h-full w-1.5 cursor-col-resize touch-none select-none hover:bg-primary/40 ${
                                header.column.getIsResizing() ? "w-2 bg-primary" : ""
                              }`}
                            />
                          )}
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>

              <tbody className="divide-y divide-border">
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className={`transition-colors ${
                      row.getIsSelected()
                        ? "bg-primary/[0.07] hover:bg-primary/[0.1]"
                        : "bg-card hover:bg-accent/50"
                    }`}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const isPinned = cell.column.getIsPinned();

                      return (
                        <td
                          key={cell.id}
                          style={{
                            width: cell.column.getSize(),
                            left: isPinned === "left" ? `${cell.column.getStart("left")}px` : undefined,
                            right: isPinned === "right" ? `${cell.column.getAfter("right")}px` : undefined,
                            position: isPinned ? "sticky" : "relative",
                            zIndex: isPinned ? 10 : 1,
                          }}
                          className={`border-r border-border px-3 py-2 last:border-r-0 ${
                            isPinned
                              ? row.getIsSelected()
                                ? "bg-[hsl(var(--row-selected))]"
                                : "bg-card"
                              : ""
                          } ${
                            isPinned === "left"
                              ? "shadow-[1px_0_0_0_hsl(var(--border))]"
                              : isPinned === "right"
                                ? "border-l shadow-[-1px_0_0_0_hsl(var(--border))]"
                                : ""
                          }`}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Pagination & Footer Controls */}
      {rowsData.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                const newSize = Number(e.target.value);
                setPageSize(newSize);
                savePreferences(columnVisibility, columnOrder, columnPinning, newSize);
              }}
              className="rounded border border-input bg-card px-2 py-1 text-xs text-foreground focus:border-primary focus:outline-none"
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="250">250</option>
            </select>
            <span className="pl-2 font-mono text-[11px]">
              Showing {rowsData.length === 0 ? 0 : table.getState().pagination.pageIndex * pageSize + 1} -{" "}
              {Math.min((table.getState().pagination.pageIndex + 1) * pageSize, rowsData.length)} of{" "}
              <span className="font-semibold text-foreground">{rowsData.length}</span> backtest
              {rowsData.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              size="xs"
              variant="outline"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              title="First page"
            >
              <ChevronsLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="xs"
              variant="outline"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              title="Previous page"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="px-2 font-mono text-[11px]">
              Page {table.getPageCount() === 0 ? 1 : table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount() || 1}
            </span>
            <Button
              size="xs"
              variant="outline"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              title="Next page"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="xs"
              variant="outline"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              title="Last page"
            >
              <ChevronsRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Column Settings Modal Dialog - Contains ALL columns from leaderboard */}
      <ColumnSettingsDialog
        open={isColumnSettingsOpen}
        onOpenChange={setColumnSettingsOpen}
        columnVisibility={columnVisibility as Record<string, boolean>}
        onVisibilityChange={handleVisibilityChange}
        columnOrder={columnOrder}
        onOrderChange={handleOrderChange}
        columnPinning={columnPinning}
        onPinningChange={handlePinningChange}
        onResetToDefault={handleResetToDefault}
        columnsMetadata={LEADERBOARD_COLUMN_METADATA}
      />

      {/* Backtest Detail Slide-out Drawer */}
      <BacktestDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        backtest={selectedBacktestForDrawer}
      />

      {/* Month-by-Month Results Modal */}
      <MonthlyResultsModal
        open={monthlyModalOpen}
        onOpenChange={setMonthlyModalOpen}
        backtest={selectedBacktestForMonthly}
        onChanged={onRefresh}
      />
    </div>
  );
}
