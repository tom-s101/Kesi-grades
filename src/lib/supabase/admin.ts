import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";

/**
 * Service-role client — bypasses RLS entirely. Only import this from
 * server-only code (route handlers, server actions) that has a specific,
 * narrow reason to (the pre-auth login directory, the WhatsApp webhook,
 * the teacher seed script). Never send this key to the browser.
 */
export function createAdminClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
