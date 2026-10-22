"use server";

import { revalidatePath } from "next/cache";
import { requireTeacher } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { STARTING_PASSWORD } from "@/lib/starting-password";
import { openAccessEnabled } from "@/lib/testing-mode";

/**
 * Put a teacher back on the shared starting password, for when they've
 * forgotten their own. Admins only, and only while in admin view.
 *
 * Their old password stops working at once. password_changed_at goes
 * back to null, so the page shows them as on the starting password again
 * and they're offered the "choose your own" prompt at their next sign-in.
 */
export async function resetToStartingPassword(teacherId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (openAccessEnabled()) return { ok: false, error: "There are no passwords while the site is open for testing." };
  const caller = await requireTeacher();
  if (!caller.is_master_admin) return { ok: false, error: "Only an admin can reset passwords." };

  const admin = createAdminClient();
  const { data: target } = await admin.from("teachers").select("id").eq("id", teacherId).maybeSingle();
  if (!target) return { ok: false, error: "That teacher isn't on file." };

  const { error } = await admin.auth.admin.updateUserById(teacherId, { password: STARTING_PASSWORD });
  if (error) return { ok: false, error: "Couldn't reset the password. Try again in a moment." };

  await admin.from("teachers").update({ password_changed_at: null }).eq("id", teacherId);

  revalidatePath("/admin/logins");
  return { ok: true };
}
