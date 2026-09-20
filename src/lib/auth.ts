import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient, authDisabled } from "@/lib/supabase/server";
import { ACT_AS_COOKIE } from "@/lib/testing-mode";
import type { Teacher } from "@/lib/types";

export type CurrentTeacher = Teacher & { school_name: string | null };

/** Used when open testing mode is on but no teachers exist yet. */
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

function withSchoolName(row: unknown): CurrentTeacher {
  const { schools, ...rest } = row as Teacher & { schools: { name: string } | null };
  return { ...rest, school_name: schools?.name ?? null };
}

/**
 * Who the app should treat this request as.
 *
 * Normally that's the signed-in teacher. In open testing mode there's
 * no sign-in, so it's whoever the "viewing as" switcher picked —
 * falling back to a master admin so everything is reachable.
 */
export async function requireTeacher(): Promise<CurrentTeacher> {
  const supabase = await createClient();

  if (authDisabled()) {
    const actingAs = (await cookies()).get(ACT_AS_COOKIE)?.value;

    if (actingAs) {
      const { data } = await supabase.from("teachers").select("*, schools(name)").eq("id", actingAs).maybeSingle();
      if (data) return withSchoolName(data);
    }

    const { data: admin } = await supabase
      .from("teachers")
      .select("*, schools(name)")
      .eq("is_master_admin", true)
      .eq("active", true)
      .limit(1)
      .maybeSingle();

    return admin ? withSchoolName(admin) : PLACEHOLDER_TEACHER;
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

  return withSchoolName(teacher);
}

export function roleLabel(teacher: Pick<Teacher, "is_master_admin" | "is_head_teacher">): string {
  if (teacher.is_master_admin) return "Master Admin";
  if (teacher.is_head_teacher) return "Head Teacher";
  return "Teacher";
}
