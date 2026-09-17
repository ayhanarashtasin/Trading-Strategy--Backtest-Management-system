import {
  SkeletonScreen,
  PageHeaderSkeleton,
  ToolbarSkeleton,
  TableSkeleton,
} from "@/components/ui/skeleton";

export default function StarredLoading() {
  return (
    <SkeletonScreen label="Loading starred strategies and backtests">
      <PageHeaderSkeleton actions={1} />
      <ToolbarSkeleton controls={4} />
      <TableSkeleton rows={10} cols={8} />
    </SkeletonScreen>
  );
}
