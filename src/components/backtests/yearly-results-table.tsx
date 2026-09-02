"use client";

import React, { useState } from "react";
import { BacktestYearlyResult } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { formatPercent, formatNumber } from "@/lib/utils";
import { Calendar, Plus, Trash2, TrendingUp, AlertCircle, Check } from "lucide-react";

interface YearlyResultsTableProps {
  backtestId: string;
  initialResults: BacktestYearlyResult[];
  onChanged?: () => void;
}

export function YearlyResultsTable({
  backtestId,
  initialResults,
  onChanged,
}: YearlyResultsTableProps) {
  const { canEdit, isOwner } = useAuth();
  const supabase = createClient();

  const [results, setResults] = useState<BacktestYearlyResult[]>(initialResults);
  const [showAddForm, setShowAddForm] = useState(false);

  // New Year Form State
  const [year, setYear] = useState(new Date().getFullYear());
  const [trades, setTrades] = useState("");
  const [netProfit, setNetProfit] = useState("");
  const [profitFactor, setProfitFactor] = useState("");
  const [winRate, setWinRate] = useState("");
  const [avgTrade, setAvgTrade] = useState("");
  const [maxDrawdown, setMaxDrawdown] = useState("");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAddYear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!year) return;

    setLoading(true);
    setError(null);

    try {
      const payload = {
        backtest_id: backtestId,
        year: Number(year),
        trades: trades.trim() ? parseInt(trades.trim(), 10) : null,
        net_profit_percent: netProfit.trim() ? Number(netProfit.trim()) : null,
        profit_factor: profitFactor.trim() ? Number(profitFactor.trim()) : null,
        win_rate_percent: winRate.trim() ? Number(winRate.trim()) : null,
        average_trade_percent: avgTrade.trim() ? Number(avgTrade.trim()) : null,
        max_drawdown_percent: maxDrawdown.trim() ? Number(maxDrawdown.trim()) : null,
      };

      const { data, error: insertErr } = await supabase
        .from("backtest_yearly_results")
        .upsert(payload, { onConflict: "backtest_id,year" })
        .select()
        .single();

      if (insertErr) throw insertErr;

      const updated = [...results.filter((r) => r.year !== Number(year)), data].sort(
        (a, b) => a.year - b.year
      );
      setResults(updated);
      setShowAddForm(false);
      // Reset inputs
      setTrades("");
      setNetProfit("");
      setProfitFactor("");
      setWinRate("");
      setAvgTrade("");
      setMaxDrawdown("");
      if (onChanged) onChanged();
    } catch (err: any) {
      setError(err.message || "Failed to add yearly result.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteYear = async (id: string) => {
    if (deletingId) return;
    setDeletingId(id);
    setError(null);
    try {
      const { error: delErr } = await supabase.from("backtest_yearly_results").delete().eq("id", id);
      if (delErr) throw delErr;
      setResults(results.filter((r) => r.id !== id));
      if (onChanged) onChanged();
    } catch (err: any) {
      setError(err.message || "Failed to remove yearly result.");
      console.error("Delete yearly result error:", err);
    } finally {
      setDeletingId(null);
    }
  };

  // Derived Annual Metrics (Section 39)
  const positiveYears = results.filter((r) => r.net_profit_percent !== null && Number(r.net_profit_percent) > 0).length;
  const negativeYears = results.filter((r) => r.net_profit_percent !== null && Number(r.net_profit_percent) < 0).length;
  const pfValues = results.map((r) => r.profit_factor).filter((v) => v !== null).map(Number);
  const bestPF = pfValues.length > 0 ? Math.max(...pfValues) : null;
  const worstPF = pfValues.length > 0 ? Math.min(...pfValues) : null;
  const returnValues = results.map((r) => r.net_profit_percent).filter((v) => v !== null).map(Number);
  const bestReturn = returnValues.length > 0 ? Math.max(...returnValues) : null;
  const worstReturn = returnValues.length > 0 ? Math.min(...returnValues) : null;

  return (
    <Card className="bg-card border-border p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-semibold">Annual Performance Breakdown (Year-by-Year)</CardTitle>
        </div>

        {canEdit && (
          <Button
            size="xs"
            variant="outline"
            onClick={() => setShowAddForm(!showAddForm)}
            >
            <Plus className="h-3 w-3" />
            {showAddForm ? "Cancel" : "Add year"}
          </Button>
        )}
      </div>

      {/* Derived Consistency Summary */}
      {results.length > 0 && (
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-6">
          <div className="bg-card px-3 py-2.5">
            <span className="eyebrow block truncate">Positive Years</span>
            <span className="mt-1.5 block font-mono text-sm font-semibold text-profit">{positiveYears}</span>
          </div>
          <div className="bg-card px-3 py-2.5">
            <span className="eyebrow block truncate">Negative Years</span>
            <span className="mt-1.5 block font-mono text-sm font-semibold text-loss">{negativeYears}</span>
          </div>
          <div className="bg-card px-3 py-2.5">
            <span className="eyebrow block truncate">Best Year Return</span>
            <span className="mt-1.5 block font-mono text-sm font-semibold text-profit">{formatPercent(bestReturn)}</span>
          </div>
          <div className="bg-card px-3 py-2.5">
            <span className="eyebrow block truncate">Worst Year Return</span>
            <span className="mt-1.5 block font-mono text-sm font-semibold text-loss">{formatPercent(worstReturn)}</span>
          </div>
          <div className="bg-card px-3 py-2.5">
            <span className="eyebrow block truncate">Best Year PF</span>
            <span className="mt-1.5 block font-mono text-sm font-semibold text-profit">{bestPF ? bestPF.toFixed(2) : "N/A"}</span>
          </div>
          <div className="bg-card px-3 py-2.5">
            <span className="eyebrow block truncate">Worst Year PF</span>
            <span className="mt-1.5 block font-mono text-sm font-semibold text-foreground">{worstPF ? worstPF.toFixed(2) : "N/A"}</span>
          </div>
        </div>
      )}

      {/* Add Year Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddYear}
          className="space-y-3 rounded-lg border border-border bg-muted/50 p-3.5"
        >
          <p className="eyebrow-ruled">Add a year</p>
          {error && (
            <div role="alert" className="flex items-start gap-2 text-xs leading-relaxed text-destructive">
              <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 font-mono text-xs">
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
              <label className="eyebrow mb-1 block">Trades</label>
              <Input
                type="number"
                value={trades}
                onChange={(e) => setTrades(e.target.value)}
                placeholder="244"
                className="h-8 text-xs font-mono"
              />
            </div>
            <div>
              <label className="eyebrow mb-1 block">Return %</label>
              <Input
                type="number"
                step="0.1"
                value={netProfit}
                onChange={(e) => setNetProfit(e.target.value)}
                placeholder="31.0"
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
                placeholder="1.21"
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
                placeholder="37.0"
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
                placeholder="0.08"
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
                placeholder="9.0"
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button size="xs" variant="outline" type="button" onClick={() => setShowAddForm(false)}>
              Cancel
            </Button>
            <Button size="xs" type="submit" disabled={loading}>
              <Check className="h-3 w-3" />
              Save year
            </Button>
          </div>
        </form>
      )}

      {/* Yearly Results Table */}
      {results.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-muted/40 py-8 text-center text-xs text-muted-foreground">
          No yearly breakdown yet. Year-by-year results are how you tell a
          consistent strategy from one good year.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Year</th>
                <th className="text-right">Trades</th>
                <th className="text-right">Return</th>
                <th className="text-right">PF</th>
                <th className="text-right">Win rate</th>
                <th className="text-right">Avg trade</th>
                <th className="text-right">Max DD</th>
                {canEdit && <th className="text-right">Remove</th>}
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.id}>
                  <td className="font-mono font-semibold text-foreground">
                    {r.year}
                  </td>
                  <td className="text-right font-mono text-muted-foreground">
                    {formatNumber(r.trades, 0)}
                  </td>
                  <td className="text-right">
                    <span
                      className={
                        Number(r.net_profit_percent) >= 0
                          ? "val-gain"
                          : "val-loss"
                      }
                    >
                      {formatPercent(r.net_profit_percent)}
                    </span>
                  </td>
                  <td className="text-right font-mono font-semibold text-foreground">
                    {r.profit_factor != null
                      ? Number(r.profit_factor).toFixed(2)
                      : "N/A"}
                  </td>
                  <td className="text-right font-mono text-muted-foreground">
                    {formatPercent(r.win_rate_percent)}
                  </td>
                  <td className="text-right font-mono text-muted-foreground">
                    {formatPercent(r.average_trade_percent)}
                  </td>
                  <td className="text-right font-mono text-loss">
                    {formatPercent(r.max_drawdown_percent)}
                  </td>
                  {canEdit && (
                    <td className="text-right">
                      <button
                        onClick={() => handleDeleteYear(r.id)}
                        disabled={deletingId === r.id}
                        className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/[0.08] hover:text-destructive disabled:opacity-50"
                        title={`Remove ${r.year}`}
                      >
                        <Trash2 className="h-3 w-3" />
                        <span className="sr-only">Remove {r.year}</span>
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
