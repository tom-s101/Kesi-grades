import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Who the session cookie says this is, without a trip to Supabase.
 *
 * `auth.getUser()` asks the Auth server on every call. It ran twice per
 * page (middleware, then requireTeacher) and again on every save. From
 * a server far from the database that was most of the wait on each tap.
 *
 * This reads the user id out of the access token itself. On its own
 * that proves nothing, since a cookie can be edited, so it is only
 * ever used together with a database query made WITH THAT SAME TOKEN:
 * Supabase checks the token's signature on every query and rejects a
 * forged or edited one. requireTeacher() only accepts the id once the
 * teacher lookup succeeds, and every write is checked the same way by
 * row-level security.
 *
 * The id comes from the signed token rather than session.user, which
 * is stored next to the token unsigned and could be swapped for
 * someone else's id while keeping a genuine token.
 */
export async function sessionUserId(supabase: Pick<SupabaseClient, "auth">): Promise<string | null> {
  // Reads the cookie; only goes to the network when the token has
  // expired and needs refreshing (about once an hour).
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return null;
  return tokenSubject(session.access_token);
}

function tokenSubject(jwt: string): string | null {
  const payload = jwt.split(".")[1];
  if (!payload) return null;
  try {
    // atob rather than Buffer, so this also runs where middleware is
    // deployed as an edge function.
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const json = JSON.parse(new TextDecoder().decode(bytes)) as { sub?: unknown };
    return typeof json.sub === "string" ? json.sub : null;
  } catch {
    return null;
  }
}
