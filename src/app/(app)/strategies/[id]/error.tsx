"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowLeft, RotateCcw } from "lucide-react";

export default function StrategyDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Strategy detail page error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center p-6 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">Unable to load strategy</h2>
      <p className="mt-1 max-w-md text-xs text-muted-foreground">
        We encountered an issue loading this strategy. This might happen if the strategy has a very large dataset or if there is a temporary network problem.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-[11px] text-muted-foreground/70">
          Digest: {error.digest}
        </p>
      )}
      <div className="mt-6 flex items-center gap-3">
        <Button size="sm" variant="default" onClick={() => reset()} className="gap-1.5 text-xs">
          <RotateCcw className="h-3.5 w-3.5" />
          Try again
        </Button>
        <Link href="/strategies">
          <Button size="sm" variant="outline" className="gap-1.5 text-xs">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to strategies
          </Button>
        </Link>
      </div>
    </div>
  );
}
