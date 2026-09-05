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
import { BacktestRow, createBacktestColumns, ALL_COLUMN_METADATA, getInitialVisibility } from "./column-definitions";
import { ColumnSettingsDialog } from "./column-settings-dialog";
import { BacktestDrawer } from "../drawer/backtest-drawer";
import { MonthlyResultsModal } from "../monthly-results-modal";
import { useAuth } from "@/components/providers/auth-provider";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Layers,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { TableRowsSkeleton } from "@/components/ui/skeleton";

interface BacktestsTableProps {
  data: BacktestRow[];
  loading: boolean;
  onRefresh?: () => void;
}

const DEFAULT_COLUMN_ORDER = ALL_COLUMN_METADATA.map((c) => c.id);
const DEFAULT_COLUMN_PINNING: ColumnPinningState = {
  left: ["select", "strategy_name"],
  right: ["details"],
};

export function BacktestsTable({ data, loading, onRefresh }: BacktestsTableProps) {
  const { user } = useAuth();
  const supabase = createClient();

  // Drawer state
  const [selectedBacktestForDrawer, setSelectedBacktestForDrawer] = useState<BacktestRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Monthly modal state
  const [selectedBacktestForMonthly, setSelectedBacktestForMonthly] = useState<BacktestRow | null>(null);
  const [monthlyModalOpen, setMonthlyModalOpen] = useState(false);

  // Column settings modal
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false);

  // TanStack Table states
  const [sorting, setSorting] = useState<SortingState>([{ id: "created_at", desc: true }]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(getInitialVisibility);
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(DEFAULT_COLUMN_ORDER);
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>(DEFAULT_COLUMN_PINNING);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [pageSize, setPageSize] = useState(50);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  // 1. Load User Table Preferences on Mount
  useEffect(() => {
    async function loadUserPreferences() {
      if (!user?.id) return;
      try {
        const { data: pref, error } = await supabase
          .from("user_table_preferences")
          .select("*")
          .eq("user_id", user.id)
          .eq("table_id", "backtests")
          .maybeSingle();

        if (pref) {
          if (pref.column_visibility && Object.keys(pref.column_visibility).length > 0) {
            setColumnVisibility({
              ...getInitialVisibility(),
              ...pref.column_visibility,
              ...(pref.column_visibility.created_at === undefined ? { created_at: true } : {}),
            });
          }
          if (pref.column_order && pref.column_order.length > 0) {
            const hasCreatedAt = pref.column_order.includes("created_at");
            if (!hasCreatedAt) {
              const creatorIndex = pref.column_order.indexOf("creator_name");
              const newOrder = [...pref.column_order];
              if (creatorIndex !== -1) {
                newOrder.splice(creatorIndex + 1, 0, "created_at");
              } else {
                newOrder.push("created_at");
              }
              setColumnOrder(newOrder);
            } else {
              setColumnOrder(pref.column_order);
            }
          }
          if (pref.column_pinning) {
            setColumnPinning(pref.column_pinning);
          }
          if (pref.page_size) {
            setPageSize(pref.page_size);
          }
        }
      } catch (err) {
        console.error("Load table prefs error:", err);
      } finally {
        setPrefsLoaded(true);
      }
    }
    loadUserPreferences();
  }, [user?.id]);

  /* 2. Save Table Preferences
     Working through the column settings dialog fires one of these per
     checkbox. Coalescing them means a burst of toggles costs a single write
     once the user settles, and the UI never waits on the network to update. */
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
            table_id: "backtests",
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
        console.error("Save table prefs error:", err);
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
    const defaultVis = getInitialVisibility();
    const defaultOrd = ALL_COLUMN_METADATA.map((c) => c.id);
    const defaultPin = { left: ["select", "strategy_name"], right: ["details"] };

    setColumnVisibility(defaultVis);
    setColumnOrder(defaultOrd);
    setColumnPinning(defaultPin);
    setPageSize(50);

    savePreferences(defaultVis, defaultOrd, defaultPin, 50);
  };

  // Open Drawer handler
  const handleViewDetails = useCallback((row: BacktestRow) => {
    setSelectedBacktestForDrawer(row);
    setDrawerOpen(true);
  }, []);

  // Open Monthly handler
  const handleViewMonthly = useCallback((row: BacktestRow) => {
    setSelectedBacktestForMonthly(row);
    setMonthlyModalOpen(true);
  }, []);

  // Columns definition
  const columns = useMemo(
    () => createBacktestColumns(handleViewDetails, handleViewMonthly),
    [handleViewDetails, handleViewMonthly]
  );

  const table = useReactTable({
    data,
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

  // CSV Export handler
  const handleExportCSV = () => {
    if (data.length === 0) return;

    const headers = [
      "Strategy",
      "Version",
      "Backtest Name",
      "Symbol",
      "Timeframe",
      "Source",
      "Test Type",
      "Start Date",
      "End Date",
      "Trades",
      "Profit Factor",
      "Net Profit %",
      "Max Drawdown %",
      "Win Rate %",
      "Avg Trade %",
      "Sharpe",
      "Sortino",
    ];

    const rows = data.map((b) => [
      `"${(b.strategy_name || "").replace(/"/g, '""')}"`,
      `"${(b.version_name || "").replace(/"/g, '""')}"`,
      `"${(b.backtest_name || "").replace(/"/g, '""')}"`,
      `"${b.symbol}"`,
      `"${b.timeframe}"`,
      `"${b.source}"`,
      `"${b.test_type}"`,
      `"${b.start_date}"`,
      `"${b.end_date}"`,
      b.total_trades ?? "",
      b.profit_factor ?? "",
      b.net_profit_percent ?? "",
      b.max_drawdown_percent ?? "",
      b.win_rate_percent ?? "",
      b.average_trade_percent ?? "",
      b.sharpe_ratio ?? "",
      b.sortino_ratio ?? "",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `escanor_backtests_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-3">
      {/* Table toolbar */}
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
              <span className="font-semibold text-foreground">{data.length}</span>{" "}
              backtest{data.length === 1 ? "" : "s"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="xs"
            variant="outline"
            onClick={() => setColumnSettingsOpen(true)}
          >
            <Sliders className="h-3.5 w-3.5" />
            Columns
          </Button>

          <Button
            size="xs"
            variant="outline"
            onClick={handleExportCSV}
            disabled={data.length === 0}
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* TanStack Table Container */}
      <Card className="overflow-hidden">
        <div className="max-h-[680px] overflow-auto">
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
              {loading ? (
                <TableRowsSkeleton rows={10} cols={columns.length} />
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="py-16 text-center text-xs text-muted-foreground"
                  >
                    No backtests match these filters. Widen a range or clear the
                    search.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
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
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination Bar */}
        <div className="flex flex-col gap-3 border-t border-border bg-muted/40 px-4 py-2.5 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[11px] text-muted-foreground">
            Page{" "}
            <span className="font-semibold text-foreground">
              {table.getState().pagination.pageIndex + 1}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-foreground">
              {Math.max(1, table.getPageCount())}
            </span>{" "}
            &middot; {data.length} rows
          </p>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-muted-foreground">
              <span className="eyebrow">Rows</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  const newSize = Number(e.target.value);
                  setPageSize(newSize);
                  table.setPageSize(newSize);
                  savePreferences(columnVisibility, columnOrder, columnPinning, newSize);
                }}
                className="rounded border border-input bg-card px-1.5 py-0.5 font-mono text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {[25, 50, 100, 250].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronsLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <ChevronsRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Column Settings Modal */}
      <ColumnSettingsDialog
        open={columnSettingsOpen}
        onOpenChange={setColumnSettingsOpen}
        columnVisibility={columnVisibility}
        onVisibilityChange={handleVisibilityChange}
        columnOrder={columnOrder}
        onOrderChange={handleOrderChange}
        columnPinning={columnPinning}
        onPinningChange={handlePinningChange}
        onResetToDefault={handleResetToDefault}
      />

      {/* Right-Side Details Drawer */}
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
