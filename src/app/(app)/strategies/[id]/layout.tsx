import { Suspense } from "react";
import StrategyDetailLoading from "./loading";
import { StrategyDetailDataProvider } from "@/components/providers/page-data-provider";
import { getStrategyDetail } from "@/lib/server/page-data";

export default async function StrategyDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <Suspense fallback={<StrategyDetailLoading />}>
      <StrategyDetailDataBoundary strategyId={id}>
        {children}
      </StrategyDetailDataBoundary>
    </Suspense>
  );
}

async function StrategyDetailDataBoundary({
  strategyId,
  children,
}: {
  strategyId: string;
  children: React.ReactNode;
}) {
  const data = await getStrategyDetail(strategyId);
  return (
    <StrategyDetailDataProvider data={data}>
      {children}
    </StrategyDetailDataProvider>
  );
}
