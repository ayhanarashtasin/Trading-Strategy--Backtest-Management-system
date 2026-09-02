"use client";

import React from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ExternalLink, Check } from "lucide-react";
import { formatDate } from "@/lib/utils";

import { Backtest } from "@/types/database";

interface DuplicateWarningDialogProps {
  open: boolean;
  duplicateData: Partial<Backtest> | null;
  onSaveAnyway: () => void;
  onCancel: () => void;
}

export function DuplicateWarningDialog({
  open,
  duplicateData,
  onSaveAnyway,
  onCancel,
}: DuplicateWarningDialogProps) {
  if (!duplicateData) return null;

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onCancel()}>
      <DialogContent className="max-w-md" onClose={onCancel}>
        <DialogHeader>
          <div className="flex items-center gap-2 pr-8">
            <AlertTriangle className="h-4 w-4 shrink-0 text-sun" />
            <DialogTitle>This looks like a repeat</DialogTitle>
          </div>
          <DialogDescription>
            A backtest with the same market, timeframe and period is already in
            the record. Repeating a test is legitimate — just make sure you meant
            to.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-sun/25 bg-sun/[0.06] p-4">
          <p className="text-xs font-semibold text-foreground">
            {duplicateData.backtest_name}
          </p>

          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
            <div>
              <dt className="eyebrow">Market</dt>
              <dd className="mt-1 font-mono text-[13px] font-medium text-foreground">
                {duplicateData.symbol} {duplicateData.timeframe}
              </dd>
            </div>
            <div>
              <dt className="eyebrow">Source</dt>
              <dd className="mt-1 font-mono text-[13px] font-medium text-foreground">
                {duplicateData.source}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="eyebrow">Period</dt>
              <dd className="mt-1 font-mono text-[13px] font-medium text-foreground">
                {formatDate(duplicateData.start_date)} →{" "}
                {formatDate(duplicateData.end_date)}
              </dd>
            </div>
            {duplicateData.profit_factor != null && (
              <div>
                <dt className="eyebrow">Profit factor</dt>
                <dd className="mt-1 font-mono text-[13px] font-semibold text-foreground">
                  {Number(duplicateData.profit_factor).toFixed(2)}
                </dd>
              </div>
            )}
          </dl>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onCancel}>
            Go back
          </Button>

          <Link href={`/backtests/${duplicateData.id}`} target="_blank">
            <Button variant="secondary" size="sm" className="w-full">
              <ExternalLink className="h-3.5 w-3.5" />
              Open the existing one
            </Button>
          </Link>

          <Button size="sm" onClick={onSaveAnyway}>
            <Check className="h-3.5 w-3.5" />
            Save anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
