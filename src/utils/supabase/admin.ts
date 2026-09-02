import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY!;

// Server-side only admin client with service_role privileges
// DO NOT import this in client-side components!
export function createAdminClient() {
  if (!supabaseServiceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not defined in server environment");
  }
  return createSupabaseClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
