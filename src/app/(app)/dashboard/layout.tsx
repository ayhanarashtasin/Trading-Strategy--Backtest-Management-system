import { Suspense } from "react";
import DashboardLoading from "./loading";
import { DashboardDataProvider } from "@/components/providers/page-data-provider";
import { getDashboardSnapshot } from "@/lib/server/page-data";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardDataBoundary>{children}</DashboardDataBoundary>
    </Suspense>
  );
}

async function DashboardDataBoundary({ children }: { children: React.ReactNode }) {
  const data = await getDashboardSnapshot();
  return <DashboardDataProvider data={data}>{children}</DashboardDataProvider>;
}
