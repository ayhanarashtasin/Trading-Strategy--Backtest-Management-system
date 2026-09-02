import {
  SkeletonScreen,
  PageHeaderSkeleton,
  ToolbarSkeleton,
  TableSkeleton,
} from "@/components/ui/skeleton";

export default function BacktestsLoading() {
  return (
    <SkeletonScreen label="Loading backtests">
      <PageHeaderSkeleton actions={2} />
      <ToolbarSkeleton controls={4} />
      <TableSkeleton rows={12} cols={8} />
    </SkeletonScreen>
  );
}
