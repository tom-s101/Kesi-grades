import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient, authDisabled } from "@/lib/supabase/server";
import { ACT_AS_COOKIE, ROLE_COOKIE, parseTestRole } from "@/lib/testing-mode";
import type { Teacher } from "@/lib/types";

export type CurrentTeacher = Teacher & {
  school_name: string | null;
  /** Overrides the badge in the top bar for the testing personas. */
  role_label?: string;
};

/** Stand-in id for the testing personas — never written to the database. */
const TEST_PERSONA_ID = "00000000-0000-0000-0000-000000000000";

/**
 * The "I'm a teacher" door on the landing page.
 *
 * Deliberately carries full privileges: during testing a teacher is
 * meant to reach every campus and edit anything, because the real
 * per-teacher assignments aren't in place yet. To see the site the way
 * one specific teacher will actually see it, use the "Viewing as"
 * picker in the top bar instead — that uses their real permissions.
 */
const TEST_TEACHER: CurrentTeacher = {
  id: TEST_PERSONA_ID,
  full_name: "Teacher (testing)",
  school_id: null,
  is_head_teacher: true,
  is_master_admin: true,
  whatsapp_number: null,
  active: true,
  created_at: new Date().toISOString(),
  school_name: null,
  role_label: "Teacher · all campuses",
};

/** Used when open testing mode is on but no teachers exist yet. */
const TEST_ADMIN: CurrentTeacher = {
  ...TEST_TEACHER,
  full_name: "Test Admin",
  role_label: undefined,
};

function withSchoolName(row: unknown): CurrentTeacher {
  const { schools, ...rest } = row as Teacher & { schools: { name: string } | null };
  return { ...rest, school_name: schools?.name ?? null };
}

/**
 * Who the app should treat this request as.
 *
 * Normally that's the signed-in teacher. In open testing mode there's
 * no sign-in, so it's whoever the "viewing as" switcher picked, else
 * the persona chosen on the landing page.
 *
 * Wrapped in cache() because the layout, the page and the top bar all
 * ask independently — without it that's three identical round trips on
 * every single navigation.
 */
export const requireTeacher = cache(async function requireTeacher(): Promise<CurrentTeacher> {
  const supabase = await createClient();

  if (authDisabled()) {
    const jar = await cookies();
    const actingAs = jar.get(ACT_AS_COOKIE)?.value;

    // Impersonating a real teacher wins: that's the whole point of the
    // switcher, and it uses their genuine school/section scoping.
    if (actingAs) {
      const { data } = await supabase.from("teachers").select("*, schools(name)").eq("id", actingAs).maybeSingle();
      if (data) return withSchoolName(data);
    }

    if (parseTestRole(jar.get(ROLE_COOKIE)?.value) === "teacher") return TEST_TEACHER;

    const { data: admin } = await supabase
      .from("teachers")
      .select("*, schools(name)")
      .eq("is_master_admin", true)
      .eq("active", true)
      .limit(1)
      .maybeSingle();

    return admin ? withSchoolName(admin) : TEST_ADMIN;
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
});

export function roleLabel(
  teacher: Pick<Teacher, "is_master_admin" | "is_head_teacher"> & { role_label?: string },
): string {
  if (teacher.role_label) return teacher.role_label;
  if (teacher.is_master_admin) return "Master Admin";
  if (teacher.is_head_teacher) return "Head Teacher";
  return "Teacher";
}
