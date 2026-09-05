"use client";

import React, { useState } from "react";
import { BacktestMonthlyResult } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { formatPercent, formatNumber, formatCurrency } from "@/lib/utils";
import { Calendar, Plus, Trash2, AlertCircle, Check, Filter } from "lucide-react";

interface MonthlyResultsTableProps {
  backtestId: string;
  initialResults: BacktestMonthlyResult[];
  onChanged?: () => void;
  compact?: boolean;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export function MonthlyResultsTable({
  backtestId,
  initialResults,
  onChanged,
  compact = false,
}: MonthlyResultsTableProps) {
  const { canEdit } = useAuth();
  const supabase = createClient();

  const [results, setResults] = useState<BacktestMonthlyResult[]>(initialResults);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>("ALL");

  // Sync results when initialResults change
  React.useEffect(() => {
    setResults(initialResults);
  }, [initialResults]);

  // New Month Form State
  const currentDate = new Date();
  const [year, setYear] = useState(currentDate.getFullYear());
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [trades, setTrades] = useState("");
  const [winTrades, setWinTrades] = useState("");
  const [lossTrades, setLossTrades] = useState("");
  const [netProfit, setNetProfit] = useState("");
  const [netProfitAmount, setNetProfitAmount] = useState("");
  const [profitFactor, setProfitFactor] = useState("");
  const [winRate, setWinRate] = useState("");
  const [avgTrade, setAvgTrade] = useState("");
  const [maxDrawdown, setMaxDrawdown] = useState("");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAddMonth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!year || !month) return;

    setLoading(true);
    setError(null);

    try {
      const payload = {
        backtest_id: backtestId,
        year: Number(year),
        month: Number(month),
        trades: trades.trim() ? parseInt(trades.trim(), 10) : null,
        winning_trades: winTrades.trim() ? parseInt(winTrades.trim(), 10) : null,
        losing_trades: lossTrades.trim() ? parseInt(lossTrades.trim(), 10) : null,
        net_profit_percent: netProfit.trim() ? Number(netProfit.trim()) : null,
        net_profit_amount: netProfitAmount.trim() ? Number(netProfitAmount.trim()) : null,
        profit_factor: profitFactor.trim() ? Number(profitFactor.trim()) : null,
        win_rate_percent: winRate.trim() ? Number(winRate.trim()) : null,
        average_trade_percent: avgTrade.trim() ? Number(avgTrade.trim()) : null,
        max_drawdown_percent: maxDrawdown.trim() ? Number(maxDrawdown.trim()) : null,
      };

      const { data, error: insertErr } = await supabase
        .from("backtest_monthly_results")
        .upsert(payload, { onConflict: "backtest_id,year,month" })
        .select()
        .single();

      if (insertErr) throw insertErr;

      const updated = [
        ...results.filter((r) => !(r.year === Number(year) && r.month === Number(month))),
        data,
      ].sort((a, b) => {
        if (b.year !== a.year) return b.year - a.year;
        return b.month - a.month;
      });

      setResults(updated);
      setShowAddForm(false);

      // Reset inputs
      setTrades("");
      setWinTrades("");
      setLossTrades("");
      setNetProfit("");
      setNetProfitAmount("");
      setProfitFactor("");
      setWinRate("");
      setAvgTrade("");
      setMaxDrawdown("");

      if (onChanged) onChanged();
    } catch (err: any) {
      setError(err.message || "Failed to add monthly result.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMonth = async (id: string, label: string) => {
    if (deletingId) return;
    setDeletingId(id);
    setError(null);
    try {
      const { error: delErr } = await supabase
        .from("backtest_monthly_results")
        .delete()
        .eq("id", id);
      if (delErr) throw delErr;

      setResults(results.filter((r) => r.id !== id));
      if (onChanged) onChanged();
    } catch (err: any) {
      setError(err.message || "Failed to remove monthly result.");
      console.error("Delete monthly result error:", err);
    } finally {
      setDeletingId(null);
    }
  };

  // Available years for filtering
  const availableYears = Array.from(new Set(results.map((r) => r.year))).sort((a, b) => b - a);

  // Filtered results
  const filteredResults =
    selectedYearFilter === "ALL"
      ? results
      : results.filter((r) => r.year === Number(selectedYearFilter));

  // Consistency metrics across all or filtered results
  const positiveMonths = filteredResults.filter(
    (r) => r.net_profit_percent !== null && Number(r.net_profit_percent) > 0
  ).length;
  const negativeMonths = filteredResults.filter(
    (r) => r.net_profit_percent !== null && Number(r.net_profit_percent) < 0
  ).length;
  const totalRecorded = filteredResults.length;
  const monthlyWinRate = totalRecorded > 0 ? (positiveMonths / totalRecorded) * 100 : null;

  const returnValues = filteredResults
    .map((r) => r.net_profit_percent)
    .filter((v) => v !== null)
    .map(Number);
  const bestMonth = returnValues.length > 0 ? Math.max(...returnValues) : null;
  const worstMonth = returnValues.length > 0 ? Math.min(...returnValues) : null;
  const avgMonthlyReturn =
    returnValues.length > 0
      ? returnValues.reduce((acc, curr) => acc + curr, 0) / returnValues.length
      : null;

  const totalTradesRecorded = filteredResults.reduce(
    (sum, r) => sum + (r.trades != null ? Number(r.trades) : 0),
    0
  );

  return (
    <Card className="bg-card border-border p-4 sm:p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-semibold">Month-by-Month Performance Breakdown</CardTitle>
          <span className="text-xs text-muted-foreground font-mono">
            ({filteredResults.length} {filteredResults.length === 1 ? "month" : "months"})
          </span>
        </div>

        <div className="flex items-center gap-2">
          {availableYears.length > 1 && (
            <div className="flex items-center gap-1 text-xs">
              <Filter className="h-3 w-3 text-muted-foreground" />
              <select
                value={selectedYearFilter}
                onChange={(e) => setSelectedYearFilter(e.target.value)}
                className="h-7 rounded border border-border bg-card px-2 text-xs font-mono focus:border-primary focus:outline-none"
              >
                <option value="ALL">All Years</option>
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          )}

          {canEdit && (
            <Button
              size="xs"
              variant="outline"
              onClick={() => setShowAddForm(!showAddForm)}
              className="gap-1"
            >
              <Plus className="h-3 w-3" />
              {showAddForm ? "Cancel" : "Add month"}
            </Button>
          )}
        </div>
      </div>

      {/* Derived Consistency Summary */}
      {filteredResults.length > 0 && (
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-6">
          <div className="bg-card px-3 py-2.5">
            <span className="eyebrow block truncate">Profitable Months</span>
            <span className="mt-1.5 block font-mono text-sm font-semibold text-profit">
              {positiveMonths}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                ({monthlyWinRate != null ? `${monthlyWinRate.toFixed(0)}%` : "N/A"})
              </span>
            </span>
          </div>
          <div className="bg-card px-3 py-2.5">
            <span className="eyebrow block truncate">Losing Months</span>
            <span className="mt-1.5 block font-mono text-sm font-semibold text-loss">
              {negativeMonths}
            </span>
          </div>
          <div className="bg-card px-3 py-2.5">
            <span className="eyebrow block truncate">Best Month</span>
            <span className="mt-1.5 block font-mono text-sm font-semibold text-profit">
              {formatPercent(bestMonth)}
            </span>
          </div>
          <div className="bg-card px-3 py-2.5">
            <span className="eyebrow block truncate">Worst Month</span>
            <span className="mt-1.5 block font-mono text-sm font-semibold text-loss">
              {formatPercent(worstMonth)}
            </span>
          </div>
          <div className="bg-card px-3 py-2.5">
            <span className="eyebrow block truncate">Avg Monthly Return</span>
            <span
              className={`mt-1.5 block font-mono text-sm font-semibold ${
                avgMonthlyReturn != null && avgMonthlyReturn >= 0
                  ? "text-profit"
                  : "text-loss"
              }`}
            >
              {formatPercent(avgMonthlyReturn)}
            </span>
          </div>
          <div className="bg-card px-3 py-2.5">
            <span className="eyebrow block truncate">Total Trades</span>
            <span className="mt-1.5 block font-mono text-sm font-semibold text-foreground">
              {formatNumber(totalTradesRecorded, 0)}
            </span>
          </div>
        </div>
      )}

      {/* Add Month Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddMonth}
          className="space-y-3 rounded-lg border border-border bg-muted/50 p-3.5"
        >
          <p className="eyebrow-ruled">Add or Update a Month</p>
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 text-xs leading-relaxed text-destructive"
            >
              <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 font-mono text-xs">
            <div>
              <label className="eyebrow mb-1 block">Year</label>
              <Input
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value) || 2026)}
                className="h-8 text-xs font-mono"
                required
              />
            </div>
            <div>
              <label className="eyebrow mb-1 block">Month</label>
              <select
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value, 10))}
                className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs font-mono focus:border-primary focus:outline-none"
                required
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {idx + 1} - {name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="eyebrow mb-1 block">Net Profit %</label>
              <Input
                type="number"
                step="0.01"
                value={netProfit}
                onChange={(e) => setNetProfit(e.target.value)}
                placeholder="4.25"
                className="h-8 text-xs font-mono"
              />
            </div>
            <div>
              <label className="eyebrow mb-1 block">Net Profit $</label>
              <Input
                type="number"
                step="0.01"
                value={netProfitAmount}
                onChange={(e) => setNetProfitAmount(e.target.value)}
                placeholder="425.00"
                className="h-8 text-xs font-mono"
              />
            </div>
            <div>
              <label className="eyebrow mb-1 block">Profit Factor</label>
              <Input
                type="number"
                step="0.01"
                value={profitFactor}
                onChange={(e) => setProfitFactor(e.target.value)}
                placeholder="1.65"
                className="h-8 text-xs font-mono"
              />
            </div>
            <div>
              <label className="eyebrow mb-1 block">Win Rate %</label>
              <Input
                type="number"
                step="0.1"
                value={winRate}
                onChange={(e) => setWinRate(e.target.value)}
                placeholder="55.0"
                className="h-8 text-xs font-mono"
              />
            </div>
            <div>
              <label className="eyebrow mb-1 block">Trades</label>
              <Input
                type="number"
                value={trades}
                onChange={(e) => setTrades(e.target.value)}
                placeholder="28"
                className="h-8 text-xs font-mono"
              />
            </div>
            <div>
              <label className="eyebrow mb-1 block">Win Trades</label>
              <Input
                type="number"
                value={winTrades}
                onChange={(e) => setWinTrades(e.target.value)}
                placeholder="16"
                className="h-8 text-xs font-mono"
              />
            </div>
            <div>
              <label className="eyebrow mb-1 block">Loss Trades</label>
              <Input
                type="number"
                value={lossTrades}
                onChange={(e) => setLossTrades(e.target.value)}
                placeholder="12"
                className="h-8 text-xs font-mono"
              />
            </div>
            <div>
              <label className="eyebrow mb-1 block">Avg Trade %</label>
              <Input
                type="number"
                step="0.01"
                value={avgTrade}
                onChange={(e) => setAvgTrade(e.target.value)}
                placeholder="0.15"
                className="h-8 text-xs font-mono"
              />
            </div>
            <div>
              <label className="eyebrow mb-1 block">Max DD %</label>
              <Input
                type="number"
                step="0.1"
                value={maxDrawdown}
                onChange={(e) => setMaxDrawdown(e.target.value)}
                placeholder="3.2"
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2 pt-1">
            <Button
              size="xs"
              variant="outline"
              type="button"
              onClick={() => setShowAddForm(false)}
            >
              Cancel
            </Button>
            <Button size="xs" type="submit" disabled={loading} className="gap-1">
              <Check className="h-3 w-3" />
              Save month
            </Button>
          </div>
        </form>
      )}

      {/* Monthly Results Table */}
      {filteredResults.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-muted/40 py-8 text-center text-xs text-muted-foreground">
          <Calendar className="mx-auto h-6 w-6 text-muted-foreground/50 mb-2" />
          <p className="font-medium text-foreground">No monthly results recorded yet.</p>
          <p className="mt-1 text-muted-foreground">
            Month-by-month results help evaluate the consistency and drawdown patterns of this strategy across different market regimes.
          </p>
          {canEdit && (
            <Button
              size="xs"
              variant="outline"
              onClick={() => setShowAddForm(true)}
              className="mt-3 gap-1"
            >
              <Plus className="h-3 w-3" />
              Add first month
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Month</th>
                <th className="text-right">Return %</th>
                <th className="text-right">Return $</th>
                <th className="text-right">PF</th>
                <th className="text-right">Win Rate</th>
                <th className="text-right">Trades</th>
                <th className="text-right">W / L</th>
                <th className="text-right">Avg Trade %</th>
                <th className="text-right">Max DD %</th>
                {canEdit && <th className="text-right">Remove</th>}
              </tr>
            </thead>
            <tbody>
              {filteredResults.map((r) => {
                const monthName = MONTH_NAMES[r.month - 1] || `M${r.month}`;
                const isGain = r.net_profit_percent != null && Number(r.net_profit_percent) >= 0;
                return (
                  <tr key={r.id}>
                    <td className="font-mono font-semibold text-foreground whitespace-nowrap">
                      <span className="inline-block px-1.5 py-0.5 rounded bg-muted/60 text-foreground mr-1.5 text-[11px]">
                        {r.year}
                      </span>
                      <span>{monthName}</span>
                    </td>
                    <td className="text-right font-mono font-medium">
                      {r.net_profit_percent != null ? (
                        <span className={isGain ? "val-gain" : "val-loss"}>
                          {Number(r.net_profit_percent) >= 0 ? "+" : ""}
                          {formatPercent(r.net_profit_percent)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </td>
                    <td className="text-right font-mono text-muted-foreground">
                      {r.net_profit_amount != null ? (
                        <span className={Number(r.net_profit_amount) >= 0 ? "text-profit" : "text-loss"}>
                          {Number(r.net_profit_amount) >= 0 ? "+" : ""}
                          {formatCurrency(r.net_profit_amount)}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="text-right font-mono font-semibold text-foreground">
                      {r.profit_factor != null ? Number(r.profit_factor).toFixed(2) : "N/A"}
                    </td>
                    <td className="text-right font-mono text-muted-foreground">
                      {formatPercent(r.win_rate_percent)}
                    </td>
                    <td className="text-right font-mono text-foreground">
                      {formatNumber(r.trades, 0)}
                    </td>
                    <td className="text-right font-mono text-xs text-muted-foreground">
                      {r.winning_trades != null || r.losing_trades != null ? (
                        <span>
                          <span className="text-profit">{r.winning_trades ?? 0}</span>
                          {" / "}
                          <span className="text-loss">{r.losing_trades ?? 0}</span>
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="text-right font-mono text-muted-foreground">
                      {r.average_trade_percent != null ? (
                        <span className={Number(r.average_trade_percent) >= 0 ? "text-profit" : "text-loss"}>
                          {Number(r.average_trade_percent) >= 0 ? "+" : ""}
                          {formatPercent(r.average_trade_percent)}
                        </span>
                      ) : (
                        "N/A"
                      )}
                    </td>
                    <td className="text-right font-mono text-loss">
                      {formatPercent(r.max_drawdown_percent)}
                    </td>
                    {canEdit && (
                      <td className="text-right">
                        <button
                          onClick={() => handleDeleteMonth(r.id, `${monthName} ${r.year}`)}
                          disabled={deletingId === r.id}
                          className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/[0.08] hover:text-destructive disabled:opacity-50"
                          title={`Remove ${monthName} ${r.year}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="sr-only">Remove {monthName} {r.year}</span>
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
