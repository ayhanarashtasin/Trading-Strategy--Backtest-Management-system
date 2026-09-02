import {
  SkeletonScreen,
  PageHeaderSkeleton,
  ListSkeleton,
} from "@/components/ui/skeleton";

export default function TeamLoading() {
  return (
    <SkeletonScreen label="Loading the team">
      <PageHeaderSkeleton actions={1} />
      <ListSkeleton rows={6} />
    </SkeletonScreen>
  );
}
