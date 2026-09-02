"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { BacktestForm } from "@/components/backtests/backtest-form";
import { FormSkeleton } from "@/components/ui/skeleton";

function NewBacktestContent() {
  const searchParams = useSearchParams();
  const versionId = searchParams.get("versionId") || undefined;
  const strategyId = searchParams.get("strategyId") || undefined;

  return (
    <BacktestForm
      preselectedVersionId={versionId}
      preselectedStrategyId={strategyId}
    />
  );
}

export default function NewBacktestPage() {
  return (
    <Suspense fallback={<FormSkeleton fields={12} />}>
      <NewBacktestContent />
    </Suspense>
  );
}
