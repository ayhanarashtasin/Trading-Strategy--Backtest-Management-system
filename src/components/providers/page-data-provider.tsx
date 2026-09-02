"use client";

import { createContext, useContext } from "react";
import type { DashboardSnapshot, StrategyDetailData } from "@/types/page-data";

const DashboardDataContext = createContext<DashboardSnapshot | null>(null);
const StrategyDetailDataContext = createContext<StrategyDetailData | null>(null);

export function DashboardDataProvider({
  data,
  children,
}: {
  data: DashboardSnapshot;
  children: React.ReactNode;
}) {
  return (
    <DashboardDataContext.Provider value={data}>
      {children}
    </DashboardDataContext.Provider>
  );
}

export function StrategyDetailDataProvider({
  data,
  children,
}: {
  data: StrategyDetailData;
  children: React.ReactNode;
}) {
  return (
    <StrategyDetailDataContext.Provider value={data}>
      {children}
    </StrategyDetailDataContext.Provider>
  );
}

export function useDashboardData() {
  const value = useContext(DashboardDataContext);
  if (!value) throw new Error("Dashboard data provider is missing");
  return value;
}

export function useStrategyDetailData() {
  const value = useContext(StrategyDetailDataContext);
  if (!value) throw new Error("Strategy detail data provider is missing");
  return value;
}
