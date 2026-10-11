"use server";

import { cookies } from "next/headers";
import { PASSWORD_LATER_COOKIE } from "@/lib/password-prompt";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { normalizePersonName } from "@/lib/names";
import { openAccessEnabled } from "@/lib/testing-mode";

export type SignInResult = { ok: true; firstName: string } | { ok: false; error: string };

const NO_MATCH = "That name and password don't match. Type your name as it's on the school's list.";

/**
 * Sign in with a name and a password.
 *
 * Supabase Auth signs in by email, but teachers don't know (or need)
 * one: the roster script gives each a made-up login address. So the
 * name is looked up here, on the server, and the email never reaches
 * the browser. The password is still checked by Supabase Auth itself,
 * and on success the session cookie is set on this response.
 *
 * Every failure gives the same answer, so the form can't be used to
 * find out which names are on the list.
 */
export async function signInWithName(name: string, password: string): Promise<SignInResult> {
  if (openAccessEnabled()) return { ok: false, error: "Sign-in is switched off while the site is open for testing." };

  const wanted = normalizePersonName(name ?? "");
  if (!wanted || !password) return { ok: false, error: "Enter your name and your password." };

  const admin = createAdminClient();
  const { data: teachers, error } = await admin.from("teachers").select("id, full_name").eq("active", true);
  if (error) return { ok: false, error: "Couldn't reach the school's records. Try again in a moment." };

  // Normally exactly one. The roster script refuses duplicate names,
  // but a teacher added by hand could share one — try each in turn
  // and let the password decide.
  const candidates = (teachers ?? []).filter((t) => normalizePersonName(t.full_name) === wanted);
  if (candidates.length === 0) return { ok: false, error: NO_MATCH };

  const supabase = await createClient();
  for (const teacher of candidates) {
    const { data } = await admin.auth.admin.getUserById(teacher.id);
    const email = data.user?.email;
    if (!email) continue;

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (!signInError) {
      // A fresh sign-in gets a fresh offer to change the password.
      (await cookies()).delete(PASSWORD_LATER_COOKIE);
      return { ok: true, firstName: teacher.full_name.trim().split(/\s+/)[0] };
    }
  }

  return { ok: false, error: NO_MATCH };
}
