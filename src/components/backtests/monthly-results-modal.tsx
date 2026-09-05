"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BacktestRow } from "./table/column-definitions";
import { BacktestMonthlyResult } from "@/types/database";
import { MonthlyResultsTable } from "./monthly-results-table";
import { createClient } from "@/utils/supabase/client";
import { Calendar, ExternalLink, Loader2 } from "lucide-react";
import Link from "next/link";

interface MonthlyResultsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  backtest: BacktestRow | null;
  onChanged?: () => void;
}

export function MonthlyResultsModal({
  open,
  onOpenChange,
  backtest,
  onChanged,
}: MonthlyResultsModalProps) {
  const supabase = createClient();
  const [monthlyResults, setMonthlyResults] = useState<BacktestMonthlyResult[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMonthlyResults = useCallback(async () => {
    if (!backtest?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("backtest_monthly_results")
        .select("*")
        .eq("backtest_id", backtest.id)
        .order("year", { ascending: false })
        .order("month", { ascending: false });

      if (error) {
        console.error("Error fetching monthly results:", error);
      } else {
        setMonthlyResults(data || []);
      }
    } catch (err) {
      console.error("Error fetching monthly results:", err);
    } finally {
      setLoading(false);
    }
  }, [backtest?.id, supabase]);

  useEffect(() => {
    if (open && backtest?.id) {
      fetchMonthlyResults();
    } else {
      setMonthlyResults([]);
    }
  }, [open, backtest?.id, fetchMonthlyResults]);

  if (!backtest) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange} size="2xl">
      <DialogContent className="max-h-[90vh] overflow-y-auto" onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Calendar className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">
                  Monthly Breakdown · {backtest.backtest_name}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {backtest.symbol} · {backtest.timeframe} · {backtest.source} · {backtest.test_type}
                  {backtest.strategy_name && ` · ${backtest.strategy_name} (${backtest.version_name || "v1"})`}
                </DialogDescription>
              </div>
            </div>

            <Link href={`/backtests/${backtest.id}`} target="_blank" rel="noopener noreferrer">
              <Button size="xs" variant="outline" className="gap-1 text-[11px]">
                <ExternalLink className="h-3 w-3" />
                Open full record
              </Button>
            </Link>
          </div>
        </DialogHeader>

        <div className="py-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary mb-2" />
              <p className="text-xs">Loading monthly results...</p>
            </div>
          ) : (
            <MonthlyResultsTable
              backtestId={backtest.id}
              initialResults={monthlyResults}
              onChanged={() => {
                fetchMonthlyResults();
                if (onChanged) onChanged();
              }}
            />
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
