"use client";

import React, { useEffect, useState, use } from "react";
import { BacktestForm } from "@/components/backtests/backtest-form";
import { createClient } from "@/utils/supabase/client";
import { FormSkeleton } from "@/components/ui/skeleton";

export default function EditBacktestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [backtest, setBacktest] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      try {
        const { data } = await supabase
          .from("backtests")
          .select("*")
          .eq("id", id)
          .single();

        setBacktest(data);
      } catch (err) {
        console.error("Load edit backtest error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  if (loading) {
    return <FormSkeleton fields={12} />;
  }

  return (
    <BacktestForm
      initialBacktest={backtest}
      isEdit={true}
    />
  );
}
