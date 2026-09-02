import {
  SkeletonScreen,
  PageHeaderSkeleton,
  MetricRowSkeleton,
  Skeleton,
  ListSkeleton,
} from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <SkeletonScreen label="Loading the dashboard">
      <PageHeaderSkeleton actions={0} />
      <MetricRowSkeleton count={6} />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-7">
          <DashboardPanelSkeleton rows={5} />
          <DashboardPanelSkeleton rows={5} />
        </div>
        <div className="space-y-5 lg:col-span-5">
          <DashboardPanelSkeleton rows={5} />
          <DashboardPanelSkeleton rows={6} />
        </div>
      </div>
    </SkeletonScreen>
  );
}

function DashboardPanelSkeleton({ rows }: { rows: number }) {
  return (
    <div className="rounded-lg border border-border bg-card shadow-plate">
      <div className="flex items-start justify-between gap-4 p-5 pb-3">
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-40" />
          <Skeleton className="h-2.5 w-52" />
        </div>
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="px-5 pb-5">
        <ListSkeleton rows={rows} />
      </div>
    </div>
  );
}
