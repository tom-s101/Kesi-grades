"use server";

import { cookies } from "next/headers";
import { requireTeacher } from "@/lib/auth";
import { PASSWORD_LATER_COOKIE } from "@/lib/password-prompt";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { openAccessEnabled } from "@/lib/testing-mode";
import { STARTING_PASSWORD } from "@/lib/starting-password";

export type ChangePasswordResult = { ok: true } | { ok: false; error: string };


export async function changePassword(newPassword: string, confirmPassword: string): Promise<ChangePasswordResult> {
  if (openAccessEnabled()) return { ok: false, error: "There are no passwords while the site is open for testing." };
  const teacher = await requireTeacher();

  if (newPassword.length < 8) return { ok: false, error: "Make it at least 8 characters." };
  if (newPassword !== confirmPassword) return { ok: false, error: "The two passwords don't match." };
  if (newPassword.trim().toLowerCase() === STARTING_PASSWORD) {
    return { ok: false, error: "That's the shared starting password — choose one only you know." };
  }

  // The teacher's own session, so Supabase Auth changes their password
  // and nobody else's.
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    return {
      ok: false,
      error: error.message.toLowerCase().includes("different")
        ? "That's the password you already have — choose a new one."
        : "Couldn't change your password. Try again in a moment.",
    };
  }

  // Recorded with the service role: it's a fact about the account, not
  // something a teacher should be able to set on their own row.
  await createAdminClient()
    .from("teachers")
    .update({ password_changed_at: new Date().toISOString() })
    .eq("id", teacher.id);

  // Deliberately no revalidatePath: refreshing the layout here would
  // unmount the dialog before it could say the change worked. The
  // prompt is gone from the next page load on regardless.
  return { ok: true };
}

/** "Not now" — don't ask again until they next sign in. */
export async function remindAboutPasswordLater(): Promise<void> {
  const teacher = await requireTeacher();
  (await cookies()).set(PASSWORD_LATER_COOKIE, teacher.id, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });
}
