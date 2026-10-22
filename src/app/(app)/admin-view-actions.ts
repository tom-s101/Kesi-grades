"use server";

import { revalidatePath } from "next/cache";
import { requireTeacher } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { openAccessEnabled } from "@/lib/testing-mode";

/**
 * Switch between admin and teacher view (migration 0015). Only someone
 * who holds admin rights can, and only for their own account — so it
 * can hand back rights they already had, never new ones.
 */
export async function setTeacherView(teacherView: boolean): Promise<{ ok: true } | { ok: false; error: string }> {
  if (openAccessEnabled()) return { ok: false, error: "Not available while the site is open for testing." };
  const teacher = await requireTeacher();
  if (!teacher.admin_capable) return { ok: false, error: "Only an admin can switch views." };

  const { error } = await createAdminClient()
    .from("teachers")
    .update({ acting_as_teacher: teacherView })
    .eq("id", teacher.id);
  if (error) {
    return {
      ok: false,
      error: error.message.includes("acting_as_teacher")
        ? "Run migration 0015_admin_teacher_view.sql in Supabase first."
        : "Couldn't switch. Try again in a moment.",
    };
  }

  // Every page looks different afterwards — menu, student lists, grades.
  revalidatePath("/", "layout");
  return { ok: true };
}
