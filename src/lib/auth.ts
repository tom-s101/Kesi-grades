import { redirect } from "next/navigation";
import { createClient, authDisabled } from "@/lib/supabase/server";
import type { Teacher } from "@/lib/types";

export type CurrentTeacher = Teacher & { school_name: string | null };

const PLACEHOLDER_TEACHER: CurrentTeacher = {
  id: "00000000-0000-0000-0000-000000000000",
  full_name: "Test Admin",
  school_id: null,
  is_head_teacher: true,
  is_master_admin: true,
  whatsapp_number: null,
  active: true,
  created_at: new Date().toISOString(),
  school_name: null,
};

/**
 * Loads the signed-in teacher's profile row, redirecting to /login if
 * absent. In DISABLE_AUTH testing mode, skips the login check entirely
 * and impersonates a real master admin if one exists (so assignments/
 * data look right) or a synthetic placeholder if the database is empty.
 */
export async function requireTeacher(): Promise<CurrentTeacher> {
  const supabase = await createClient();

  if (authDisabled()) {
    const { data: teacher } = await supabase
      .from("teachers")
      .select("*, schools(name)")
      .eq("is_master_admin", true)
      .eq("active", true)
      .limit(1)
      .maybeSingle();

    if (!teacher) return PLACEHOLDER_TEACHER;

    const { schools, ...rest } = teacher as unknown as Teacher & { schools: { name: string } | null };
    return { ...rest, school_name: schools?.name ?? null };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: teacher } = await supabase
    .from("teachers")
    .select("*, schools(name)")
    .eq("id", user.id)
    .single();

  if (!teacher) redirect("/login");

  const { schools, ...rest } = teacher as unknown as Teacher & { schools: { name: string } | null };
  return { ...rest, school_name: schools?.name ?? null };
}

export function roleLabel(teacher: Pick<Teacher, "is_master_admin" | "is_head_teacher">): string {
  if (teacher.is_master_admin) return "Master Admin";
  if (teacher.is_head_teacher) return "Head Teacher";
  return "Teacher";
}
