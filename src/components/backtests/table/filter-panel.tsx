"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SearchField } from "@/components/ui/toolbar";
import { Filter, RotateCcw, ChevronDown, ChevronUp, Bookmark } from "lucide-react";

export interface FilterState {
  search: string;
  strategyId: string;
  source: string;
  testType: string;
  symbol: string;
  timeframe: string;
  direction: string;
  status: string;

  // Date Added (Inserted into website) for date-wise tracking
  dateAddedRange: "all" | "today" | "7d" | "30d" | "90d" | "custom";
  dateAddedFrom: string;
  dateAddedTo: string;

  // Numeric filters with operators
  tradesOp: ">=" | "<=" | "=" | ">" | "<";
  tradesVal: string;

  pfOp: ">=" | "<=" | "=" | ">" | "<";
  pfVal: string;

  profitOp: ">=" | "<=" | "=" | ">" | "<";
  profitVal: string;

  ddOp: "<=" | ">=" | "=" | "<" | ">";
  ddVal: string;

  wrOp: ">=" | "<=" | "=" | ">" | "<";
  wrVal: string;

  // Integrity flags
  feesIncludedOnly: boolean;
  oosTestedOnly: boolean;
  showArchived: boolean;
}

export const INITIAL_FILTER_STATE: FilterState = {
  search: "",
  strategyId: "all",
  source: "all",
  testType: "all",
  symbol: "",
  timeframe: "all",
  direction: "all",
  status: "all",
  dateAddedRange: "all",
  dateAddedFrom: "",
  dateAddedTo: "",
  tradesOp: ">=",
  tradesVal: "",
  pfOp: ">=",
  pfVal: "",
  profitOp: ">=",
  profitVal: "",
  ddOp: "<=",
  ddVal: "",
  wrOp: ">=",
  wrVal: "",
  feesIncludedOnly: false,
  oosTestedOnly: false,
  showArchived: false,
};

interface FilterPanelProps {
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
  strategies: Array<{ id: string; name: string }>;
  allSymbols: string[];
  allTimeframes: string[];
  onSaveViewPrompt?: () => void;
}

export function FilterPanel({
  filters,
  onFilterChange,
  strategies,
  allSymbols,
  allTimeframes,
  onSaveViewPrompt,
}: FilterPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const updateField = (key: keyof FilterState, val: any) => {
    onFilterChange({
      ...filters,
      [key]: val,
    });
  };

  const handleReset = () => {
    onFilterChange(INITIAL_FILTER_STATE);
  };

  const activeFilterCount = [
    filters.strategyId !== "all",
    filters.source !== "all",
    filters.testType !== "all",
    filters.symbol !== "",
    filters.timeframe !== "all",
    filters.direction !== "all",
    filters.status !== "all",
    filters.dateAddedRange !== "all",
    filters.tradesVal !== "",
    filters.pfVal !== "",
    filters.profitVal !== "",
    filters.ddVal !== "",
    filters.wrVal !== "",
    filters.feesIncludedOnly,
    filters.oosTestedOnly,
    filters.showArchived,
  ].filter(Boolean).length;

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-2.5 shadow-plate">
      {/* Quick filters */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {/* The filter state carries a free-text search; this is where it is set. */}
          <SearchField
            value={filters.search}
            onChange={(v) => updateField("search", v)}
            placeholder="Search names, symbols, details"
            className="min-w-[180px] max-w-[240px]"
          />

          {/* Strategy Select */}
          <Select
            value={filters.strategyId}
            onChange={(e) => updateField("strategyId", e.target.value)}
            className="h-8 w-40 text-xs"
            aria-label="Filter by strategy"
          >
            <option value="all">All strategies</option>
            {strategies.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>

          {/* Date Added (Inserted) Filter */}
          <Select
            value={filters.dateAddedRange}
            onChange={(e) => updateField("dateAddedRange", e.target.value)}
            className="h-8 w-36 text-xs"
            aria-label="Filter by date added"
          >
            <option value="all">Any date added</option>
            <option value="today">Added today</option>
            <option value="7d">Added past 7 days</option>
            <option value="30d">Added past 30 days</option>
            <option value="90d">Added past 90 days</option>
            <option value="custom">Custom date range…</option>
          </Select>

          {filters.dateAddedRange === "custom" && (
            <div className="flex items-center gap-1">
              <Input
                type="date"
                value={filters.dateAddedFrom}
                onChange={(e) => updateField("dateAddedFrom", e.target.value)}
                aria-label="Date added from"
                className="h-8 w-32 font-mono text-xs px-2"
                title="Added from"
              />
              <span className="text-muted-foreground text-xs">to</span>
              <Input
                type="date"
                value={filters.dateAddedTo}
                onChange={(e) => updateField("dateAddedTo", e.target.value)}
                aria-label="Date added to"
                className="h-8 w-32 font-mono text-xs px-2"
                title="Added to"
              />
            </div>
          )}

          {/* Source Select */}
          <Select
            value={filters.source}
            onChange={(e) => updateField("source", e.target.value)}
            className="h-8 w-32 text-xs"
            aria-label="Filter by source"
          >
            <option value="all">All sources</option>
            <option value="AggTrades">AggTrades</option>
            <option value="TradingView">TradingView</option>
            <option value="Freqtrade">Freqtrade</option>
            <option value="Python">Python</option>
            <option value="Codex">Codex</option>
            <option value="Manual">Manual</option>
            <option value="Other">Other</option>
          </Select>

          {/* Timeframe Select */}
          <Select
            value={filters.timeframe}
            onChange={(e) => updateField("timeframe", e.target.value)}
            className="h-8 w-28 text-xs"
            aria-label="Filter by timeframe"
          >
            <option value="all">All timeframes</option>
            {allTimeframes.map((tf) => (
              <option key={tf} value={tf}>
                {tf}
              </option>
            ))}
          </Select>

          {/* Symbol Input / Select */}
          <Input
            value={filters.symbol}
            onChange={(e) => updateField("symbol", e.target.value)}
            placeholder="BTCUSDT"
            aria-label="Filter by symbol"
            className="h-8 w-32 font-mono text-xs"
          />

          {/* Quick PF filter */}
          <div className="flex h-8 items-center gap-1.5 rounded-md border border-input bg-card px-2 shadow-plate focus-within:border-primary">
            <span className="eyebrow shrink-0">PF &ge;</span>
            <input
              type="number"
              step="0.05"
              value={filters.pfVal}
              onChange={(e) => updateField("pfVal", e.target.value)}
              placeholder="1.15"
              aria-label="Minimum profit factor"
              className="w-14 bg-transparent font-mono text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
            />
          </div>

          {/* Quick DD filter */}
          <div className="flex h-8 items-center gap-1.5 rounded-md border border-input bg-card px-2 shadow-plate focus-within:border-primary">
            <span className="eyebrow shrink-0">DD &le;</span>
            <input
              type="number"
              step="1"
              value={filters.ddVal}
              onChange={(e) => updateField("ddVal", e.target.value)}
              placeholder="25"
              aria-label="Maximum drawdown percent"
              className="w-14 bg-transparent font-mono text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
            />
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <Button size="xs" variant="ghost" onClick={handleReset}>
              <RotateCcw className="h-3 w-3" />
              Clear {activeFilterCount}
            </Button>
          )}

          {onSaveViewPrompt && (
            <Button size="xs" variant="outline" onClick={onSaveViewPrompt}>
              <Bookmark className="h-3 w-3 text-primary" />
              Save view
            </Button>
          )}

          <Button
            size="xs"
            variant="secondary"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
          >
            <Filter className="h-3 w-3" />
            {expanded ? "Fewer filters" : "More filters"}
            {expanded ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>

      {/* Expanded Filter Panel */}
      {expanded && (
        <div className="grid grid-cols-1 gap-3 border-t border-border pt-3 text-xs sm:grid-cols-2 md:grid-cols-4">
          {/* Test Type */}
          <div className="space-y-1">
            <label className="eyebrow block">Test type</label>
            <Select
              value={filters.testType}
              onChange={(e) => updateField("testType", e.target.value)}
              className="h-8 text-xs"
            >
              <option value="all">All test types</option>
              <option value="Development">Development</option>
              <option value="Optimization">Optimization</option>
              <option value="Prior Period">Prior Period</option>
              <option value="Out of Sample">Out of Sample</option>
              <option value="Walk Forward">Walk Forward</option>
              <option value="Robustness">Robustness</option>
              <option value="Monte Carlo">Monte Carlo</option>
              <option value="Paper Trading">Paper Trading</option>
              <option value="Live">Live</option>
            </Select>
          </div>

          {/* Direction */}
          <div className="space-y-1">
            <label className="eyebrow block">Direction</label>
            <Select
              value={filters.direction}
              onChange={(e) => updateField("direction", e.target.value)}
              className="h-8 text-xs"
            >
              <option value="all">All directions</option>
              <option value="Long">Long</option>
              <option value="Short">Short</option>
              <option value="Both">Both</option>
            </Select>
          </div>

          {/* Total Trades Filter */}
          <div className="space-y-1">
            <label className="eyebrow block">Trades</label>
            <div className="flex items-center gap-1">
              <Select
                value={filters.tradesOp}
                onChange={(e) => updateField("tradesOp", e.target.value)}
                className="h-8 w-16 text-xs"
              >
                <option value=">=">≥</option>
                <option value="<=">≤</option>
                <option value="=">=</option>
                <option value=">">&gt;</option>
                <option value="<">&lt;</option>
              </Select>
              <Input
                type="number"
                value={filters.tradesVal}
                onChange={(e) => updateField("tradesVal", e.target.value)}
                placeholder="500"
                className="h-8 font-mono text-xs"
              />
            </div>
          </div>

          {/* Win Rate Filter */}
          <div className="space-y-1">
            <label className="eyebrow block">Win rate %</label>
            <div className="flex items-center gap-1">
              <Select
                value={filters.wrOp}
                onChange={(e) => updateField("wrOp", e.target.value)}
                className="h-8 w-16 text-xs"
              >
                <option value=">=">≥</option>
                <option value="<=">≤</option>
                <option value="=">=</option>
              </Select>
              <Input
                type="number"
                value={filters.wrVal}
                onChange={(e) => updateField("wrVal", e.target.value)}
                placeholder="40"
                className="h-8 font-mono text-xs"
              />
            </div>
          </div>

          {/* Net Profit % Filter */}
          <div className="space-y-1">
            <label className="eyebrow block">Net profit %</label>
            <div className="flex items-center gap-1">
              <Select
                value={filters.profitOp}
                onChange={(e) => updateField("profitOp", e.target.value)}
                className="h-8 w-16 text-xs"
              >
                <option value=">=">≥</option>
                <option value="<=">≤</option>
                <option value="=">=</option>
              </Select>
              <Input
                type="number"
                value={filters.profitVal}
                onChange={(e) => updateField("profitVal", e.target.value)}
                placeholder="50%"
                className="h-8 font-mono text-xs"
              />
            </div>
          </div>

          {/* Integrity Checkboxes */}
          <div className="col-span-1 flex flex-wrap items-center gap-4 pt-2 sm:col-span-2 md:col-span-4">
            <label className="flex cursor-pointer select-none items-center gap-1.5 text-xs text-foreground">
              <input
                type="checkbox"
                checked={filters.feesIncludedOnly}
                onChange={(e) => updateField("feesIncludedOnly", e.target.checked)}
                className="h-3.5 w-3.5 rounded border-input accent-primary"
              />
              <span>Fees included</span>
            </label>

            <label className="flex cursor-pointer select-none items-center gap-1.5 text-xs text-foreground">
              <input
                type="checkbox"
                checked={filters.oosTestedOnly}
                onChange={(e) => updateField("oosTestedOnly", e.target.checked)}
                className="h-3.5 w-3.5 rounded border-input accent-primary"
              />
              <span>OOS tested</span>
            </label>

            <label className="flex cursor-pointer select-none items-center gap-1.5 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={filters.showArchived}
                onChange={(e) => updateField("showArchived", e.target.checked)}
                className="h-3.5 w-3.5 rounded border-input accent-primary"
              />
              <span>Archived only</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
