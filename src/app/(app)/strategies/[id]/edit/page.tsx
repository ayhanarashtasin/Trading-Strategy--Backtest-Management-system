"use client";

import React, { useEffect, useState, use } from "react";
import { StrategyForm } from "@/components/strategies/strategy-form";
import { createClient } from "@/utils/supabase/client";
import { FormSkeleton } from "@/components/ui/skeleton";

export default function EditStrategyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [strategy, setStrategy] = useState<any | null>(null);
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      try {
        const [{ data: strat }, { data: tagData }] = await Promise.all([
          supabase.from("strategies").select("*").eq("id", id).single(),
          supabase.from("strategy_tags").select("tag:tags(*)").eq("strategy_id", id),
        ]);

        setStrategy(strat);
        setTags((tagData || []).map((t: any) => t.tag).filter(Boolean));
      } catch (err) {
        console.error("Load edit strategy error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  if (loading) {
    return <FormSkeleton fields={8} />;
  }

  return (
    <StrategyForm
      initialStrategy={strategy}
      initialTags={tags}
      isEdit={true}
    />
  );
}
