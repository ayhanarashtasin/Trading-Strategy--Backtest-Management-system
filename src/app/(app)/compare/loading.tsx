import {
  SkeletonScreen,
  PageHeaderSkeleton,
  Skeleton,
} from "@/components/ui/skeleton";

export default function CompareLoading() {
  return (
    <SkeletonScreen label="Loading the comparison">
      <PageHeaderSkeleton actions={1} />
      {/* Backtests sit side by side in columns, so the placeholder does too. */}
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-plate">
        <div className="flex gap-4 border-b border-border bg-muted/40 px-4 py-3">
          <Skeleton className="h-3 w-36 shrink-0" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-3 flex-1" />
          ))}
        </div>
        {Array.from({ length: 14 }).map((_, r) => (
          <div
            key={r}
            className="flex items-center gap-4 border-b border-border/60 px-4 py-3 last:border-b-0"
          >
            <Skeleton className="h-2.5 w-36 shrink-0" />
            {Array.from({ length: 3 }).map((_, c) => (
              <Skeleton key={c} className="h-3 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </SkeletonScreen>
  );
}
