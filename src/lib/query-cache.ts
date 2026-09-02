"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * A very small stale-while-revalidate cache for the client-side page loads.
 *
 * Without it every navigation starts from nothing: leave /strategies, come
 * back, and you pay the full round-trip again staring at a skeleton for data
 * you were looking at a second ago. With it the page paints the last known
 * result immediately and refreshes underneath — which is what makes moving
 * around the app feel instant rather than merely fast.
 *
 * Deliberately not a data-fetching library. Pages keep owning their own
 * queries and their own refetch-after-mutation calls; this only remembers the
 * last result so the next mount has something to show.
 *
 * Lives in module scope, so it is per-tab and dies on a full reload. Sign-out
 * does a hard navigation, which clears it — `clearQueryCache` is here for the
 * cases that don't.
 */

interface CacheEntry<T> {
  value: T;
  userScope: string | null;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
let activeUserScope: string | null = null;

/** Sets or switches the active user scope. When the authenticated identity changes, the entire cache is immediately flushed to prevent cross-user leakage. */
export function setActiveUserScope(userId: string | null): void {
  // ASVS 14.2.2: private research data is cached only in the current browser
  // tab, never in a shared server module during Client Component prerendering.
  if (typeof window === "undefined") return;
  if (activeUserScope !== userId) {
    activeUserScope = userId;
    cache.clear();
  }
}

export function readQueryCache<T>(key: string): T | undefined {
  if (typeof window === "undefined") return undefined;
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return undefined;
  // ASVS 8.2.1: Enforce strict data isolation between user sessions
  if (entry.userScope !== activeUserScope) {
    cache.delete(key);
    return undefined;
  }
  return entry.value;
}

export function writeQueryCache<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  cache.set(key, {
    value,
    userScope: activeUserScope,
    timestamp: Date.now(),
  });
}

/** Drop one entry, every entry under a prefix, or the lot. */
export function clearQueryCache(prefix?: string): void {
  if (typeof window === "undefined") return;
  if (prefix === undefined) {
    cache.clear();
    return;
  }
  for (const key of Array.from(cache.keys())) {
    if (key === prefix || key.startsWith(prefix)) cache.delete(key);
  }
}

/**
 * State that survives navigation.
 *
 * Returns the cached value for `key` if there is one — in which case
 * `loading` starts false and the page renders real content on first paint —
 * otherwise `fallback` with `loading` true. Writing through `setData` updates
 * the cache too.
 *
 * `isRevalidating` is true while a background refresh runs over cached data,
 * for callers that want to show a quiet activity hint instead of a skeleton.
 */
export function useCachedState<T>(key: string, fallback: T) {
  const initial = readQueryCache<T>(key);
  const [data, setDataState] = useState<T>(initial ?? fallback);
  const [loading, setLoading] = useState(initial === undefined);
  const [isRevalidating, setIsRevalidating] = useState(false);

  // Keep the latest fallback without making it a dependency of the key effect.
  const fallbackRef = useRef(fallback);
  fallbackRef.current = fallback;

  const firstRun = useRef(true);
  useEffect(() => {
    // On a key change (a filter toggle, a different record) swap to whatever
    // that key has cached rather than blanking the view.
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const next = readQueryCache<T>(key);
    setDataState(next ?? fallbackRef.current);
    setLoading(next === undefined);
  }, [key]);

  const setData = useCallback(
    (value: T) => {
      writeQueryCache(key, value);
      setDataState(value);
    },
    [key]
  );

  return {
    data,
    setData,
    loading,
    setLoading,
    isRevalidating,
    setIsRevalidating,
  };
}
