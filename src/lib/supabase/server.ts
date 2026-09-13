import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/types";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * TESTING ONLY: when DISABLE_AUTH=true, every request uses the
 * service-role client instead of a real session — this bypasses RLS
 * entirely, so anyone with the URL sees and can edit every school's
 * data with no login. Never set this in an environment real student
 * data will touch. See docs/SUPABASE_SETUP.md.
 */
export function authDisabled() {
  return process.env.DISABLE_AUTH === "true";
}

export async function createClient() {
  if (authDisabled()) {
    return createAdminClient();
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component with no request context to
            // write to — fine as long as middleware refreshes the
            // session on navigations.
          }
        },
      },
    },
  );
}
