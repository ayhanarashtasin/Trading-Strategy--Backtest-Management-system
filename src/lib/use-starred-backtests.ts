"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { clearQueryCache } from "@/lib/query-cache";

// Global cache of starred IDs for instantaneous cross-component sync
let cachedStarredIds: Set<string> = new Set();
let hasLoadedOnce = false;

export function useStarredBacktests() {
  const { user } = useAuth();
  const supabase = createClient();
  const [starredIds, setStarredIds] = useState<Set<string>>(cachedStarredIds);
  const [loading, setLoading] = useState(!hasLoadedOnce);

  // Load from database on mount or user change
  useEffect(() => {
    if (!user?.id) {
      setStarredIds(new Set());
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function fetchStarred() {
      try {
        const { data, error } = await supabase
          .from("starred_backtests")
          .select("backtest_id")
          .eq("user_id", user!.id);

        if (error) {
          console.error("Error fetching starred backtests:", error);
          return;
        }

        if (isMounted && data) {
          const newSet = new Set<string>(data.map((r) => r.backtest_id));
          cachedStarredIds = newSet;
          hasLoadedOnce = true;
          setStarredIds(newSet);
        }
      } catch (err) {
        console.error("Unexpected error fetching starred backtests:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchStarred();

    // Listen for custom star events emitted by other components
    const handleStarEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ backtestId: string; isStarred: boolean }>;
      if (customEvent.detail) {
        setStarredIds((prev) => {
          const next = new Set(prev);
          if (customEvent.detail.isStarred) {
            next.add(customEvent.detail.backtestId);
          } else {
            next.delete(customEvent.detail.backtestId);
          }
          cachedStarredIds = next;
          return next;
        });
      }
    };

    window.addEventListener("escanor:starred-change", handleStarEvent);
    return () => {
      isMounted = false;
      window.removeEventListener("escanor:starred-change", handleStarEvent);
    };
  }, [user?.id]);

  const toggleStar = useCallback(
    async (backtest: { id: string }) => {
      if (!user?.id) return;
      const backtestId = backtest.id;
      const currentlyStarred = starredIds.has(backtestId);
      const newStatus = !currentlyStarred;

      // 1. Optimistic Update
      const nextSet = new Set(starredIds);
      if (newStatus) {
        nextSet.add(backtestId);
      } else {
        nextSet.delete(backtestId);
      }
      cachedStarredIds = nextSet;
      setStarredIds(nextSet);

      // Invalidate starred query cache
      clearQueryCache("starred:");

      // Emit event so other table instances sync immediately
      window.dispatchEvent(
        new CustomEvent("escanor:starred-change", {
          detail: { backtestId, isStarred: newStatus },
        })
      );

      // 2. Persist to Supabase
      try {
        if (newStatus) {
          const { error } = await supabase.from("starred_backtests").insert({
            user_id: user.id,
            backtest_id: backtestId,
          });
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("starred_backtests")
            .delete()
            .eq("user_id", user.id)
            .eq("backtest_id", backtestId);
          if (error) throw error;
        }
      } catch (err) {
        console.error("Failed to toggle star in database:", err);
        // Rollback optimistic update
        const rollbackSet = new Set(starredIds);
        if (currentlyStarred) {
          rollbackSet.add(backtestId);
        } else {
          rollbackSet.delete(backtestId);
        }
        cachedStarredIds = rollbackSet;
        setStarredIds(rollbackSet);
        window.dispatchEvent(
          new CustomEvent("escanor:starred-change", {
            detail: { backtestId, isStarred: currentlyStarred },
          })
        );
      }
    },
    [user?.id, starredIds]
  );

  const isStarred = useCallback(
    (id: string) => starredIds.has(id),
    [starredIds]
  );

  return {
    starredIds,
    isStarred,
    toggleStar,
    loading,
  };
}
