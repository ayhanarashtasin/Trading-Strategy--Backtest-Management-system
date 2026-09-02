import {
  SkeletonScreen,
  PageHeaderSkeleton,
  ToolbarSkeleton,
  CardGridSkeleton,
} from "@/components/ui/skeleton";

export default function StrategiesLoading() {
  return (
    <SkeletonScreen label="Loading strategies">
      <PageHeaderSkeleton actions={1} />
      <ToolbarSkeleton controls={3} />
      <CardGridSkeleton count={6} />
    </SkeletonScreen>
  );
}
