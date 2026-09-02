import {
  SkeletonScreen,
  PageHeaderSkeleton,
  ToolbarSkeleton,
  ListSkeleton,
} from "@/components/ui/skeleton";

export default function ActivityLoading() {
  return (
    <SkeletonScreen label="Loading activity">
      <PageHeaderSkeleton actions={0} />
      <ToolbarSkeleton controls={2} />
      <ListSkeleton rows={12} />
    </SkeletonScreen>
  );
}
