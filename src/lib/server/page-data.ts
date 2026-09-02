import "server-only";

import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getAuthenticatedUserId } from "@/lib/server/auth";
import type { DashboardSnapshot, StrategyDetailData } from "@/types/page-data";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function requireAuthenticatedUser() {
  if (!(await getAuthenticatedUserId())) redirect("/login");
}

export const getStrategyDetail = cache(
  async (strategyId: string): Promise<StrategyDetailData> => {
    // ASVS 2.2.1: positively validate the route parameter at the server boundary.
    if (!UUID_PATTERN.test(strategyId)) notFound();
    await requireAuthenticatedUser();

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_strategy_detail", {
      p_strategy_id: strategyId,
    });

    if (error) {
      // ASVS 16.5.1: retain a useful code without exposing private row data.
      console.error("Strategy detail read failed", { code: error.code });
      throw new Error("Unable to load this strategy right now.");
    }

    return data as StrategyDetailData;
  }
);

export const getDashboardSnapshot = cache(async (): Promise<DashboardSnapshot> => {
  await requireAuthenticatedUser();

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_dashboard_snapshot");

  if (error) {
    console.error("Dashboard read failed", { code: error.code });
    throw new Error("Unable to load the dashboard right now.");
  }

  return data as DashboardSnapshot;
});
