import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { openAccessEnabled } from "@/lib/testing-mode";

/**
 * TESTING ONLY: in open access mode every request uses the
 * service-role client instead of a real session — this bypasses RLS
 * entirely, so anyone with the URL sees and can edit every school's
 * data with no login. Turn it off before real student data goes in
 * (see src/lib/testing-mode.ts).
 */
export function authDisabled() {
  return openAccessEnabled();
}

export async function createClient() {
  if (authDisabled()) {
    // Without the service-role key the admin client is constructed with
    // an undefined key and throws deep inside supabase-js. Say what is
    // actually wrong instead.
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error(
        "Open testing mode needs SUPABASE_SERVICE_ROLE_KEY in the environment " +
          "(Netlify → Site configuration → Environment variables). " +
          "Set REQUIRE_LOGIN=true instead to use the normal sign-in.",
      );
    }
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
