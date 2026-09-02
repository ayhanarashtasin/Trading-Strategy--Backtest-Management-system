import {
  SkeletonScreen,
  PageHeaderSkeleton,
  Skeleton,
} from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <SkeletonScreen label="Loading settings">
      <PageHeaderSkeleton actions={0} />
      {Array.from({ length: 2 }).map((_, i) => (
        <div
          key={i}
          className="space-y-5 rounded-lg border border-border bg-card p-5 shadow-plate"
        >
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-2.5 w-64" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, f) => (
              <div key={f} className="space-y-1.5">
                <Skeleton className="h-2.5 w-24" />
                <Skeleton className="h-8 w-full rounded-md" />
              </div>
            ))}
          </div>
          <Skeleton className="h-8 w-28 rounded-md" />
        </div>
      ))}
    </SkeletonScreen>
  );
}
