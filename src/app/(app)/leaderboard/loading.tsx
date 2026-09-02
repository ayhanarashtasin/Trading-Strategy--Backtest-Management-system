import {
  SkeletonScreen,
  PageHeaderSkeleton,
  ToolbarSkeleton,
  TableSkeleton,
} from "@/components/ui/skeleton";

export default function LeaderboardLoading() {
  return (
    <SkeletonScreen label="Loading the leaderboard">
      <PageHeaderSkeleton actions={1} />
      <ToolbarSkeleton controls={3} />
      <TableSkeleton rows={12} cols={8} />
    </SkeletonScreen>
  );
}
