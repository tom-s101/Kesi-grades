import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Teacher } from "@/lib/types";

export type CurrentTeacher = Teacher & { school_name: string | null };

/** Loads the signed-in teacher's profile row, redirecting to /login if absent. */
export async function requireTeacher(): Promise<CurrentTeacher> {
  const supabase = await createClient();
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
