import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import type { Profile } from "@/types/database";
import { VERIFIED_USER_HEADER } from "@/lib/auth-constants";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type InitialAuth = {
  user: { id: string; email?: string };
  profile: Profile | null;
};

export const getAuthenticatedUserId = cache(async (): Promise<string | null> => {
  const value = (await headers()).get(VERIFIED_USER_HEADER);
  // ASVS 2.2.1, 4.1.3: only accept the middleware's overwritten UUID header.
  return value && UUID_PATTERN.test(value) ? value : null;
});

export const getInitialAuth = cache(async (): Promise<InitialAuth | null> => {
  const userId = await getAuthenticatedUserId();
  if (!userId) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, display_name, role, status, avatar_url, created_at, updated_at, last_seen_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    // ASVS 16.5.1: log a non-sensitive code, not queries, tokens, or payloads.
    console.error("Initial profile lookup failed", { code: error.code });
  }

  return {
    user: { id: userId, email: data?.email },
    profile: (data as Profile | null) ?? null,
  };
});
