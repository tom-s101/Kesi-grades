import "server-only";
import { createClient } from "@/lib/supabase/server";

/** The single school_years row flagged is_current — the whole app pivots off this. */
export async function getCurrentSchoolYear() {
  const supabase = await createClient();
  const { data } = await supabase.from("school_years").select("*").eq("is_current", true).single();
  return data;
}

export async function getQuarters(schoolYearId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("quarters")
    .select("*")
    .eq("school_year_id", schoolYearId)
    .order("number");
  return data ?? [];
}

export async function getSubjects() {
  const supabase = await createClient();
  const { data } = await supabase.from("subjects").select("*").order("sort_order");
  return data ?? [];
}

export async function getGradeLevels() {
  const supabase = await createClient();
  const { data } = await supabase.from("grade_levels").select("*").order("sort_order");
  return data ?? [];
}

export async function getSchools() {
  const supabase = await createClient();
  const { data } = await supabase.from("schools").select("*").order("name");
  return data ?? [];
}

export type TeacherAssignment = {
  id: string;
  school_id: string;
  grade_level_id: string;
  section_id: string;
  subject_id: string;
  school_year_id: string;
  teacher_id: string;
  grade_levels: { code: string; name: string; sort_order: number } | null;
  subjects: { code: string; name: string; sort_order: number } | null;
  class_sections: { name: string } | null;
};

/** Grade levels + subjects a given teacher is assigned to (RLS lets anyone read this table). */
export async function getTeacherAssignments(teacherId: string): Promise<TeacherAssignment[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("class_subject_teachers")
    .select("*, grade_levels(code, name, sort_order), subjects(code, name, sort_order), class_sections(name)")
    .eq("teacher_id", teacherId);
  return (data ?? []) as unknown as TeacherAssignment[];
}

export type StudentWithMeta = import("@/lib/types").Student & {
  grade_levels: { code: string; name: string } | null;
  schools: { name: string } | null;
  class_sections: { name: string } | null;
};

/**
 * Students visible to the current session.
 *
 * Normally row-level security does the scoping. In open testing mode
 * the app runs with the service-role key, which bypasses RLS — so when
 * a specific teacher is being viewed-as, the same scoping is applied
 * here instead. Otherwise "view as Janet" would still show her the
 * whole organization, which defeats the point of checking her view.
 */
export type VisibleStudents = { rows: StudentWithMeta[]; error: string | null };

export async function getVisibleStudents(
  filters?: { schoolId?: string; gradeLevelId?: string },
  scopeTo?: { id: string; school_id: string | null; is_head_teacher: boolean; is_master_admin: boolean },
): Promise<VisibleStudents> {
  const supabase = await createClient();
  let query = supabase
    .from("students")
    .select("*, grade_levels(code, name), schools(name), class_sections(name)")
    .order("last_name");
  if (filters?.schoolId) query = query.eq("school_id", filters.schoolId);
  if (filters?.gradeLevelId) query = query.eq("current_grade_level_id", filters.gradeLevelId);

  if (scopeTo && !scopeTo.is_master_admin) {
    if (scopeTo.is_head_teacher && scopeTo.school_id) {
      query = query.eq("school_id", scopeTo.school_id);
    } else if (!scopeTo.is_head_teacher) {
      const sectionIds = [...new Set((await getTeacherAssignments(scopeTo.id)).map((a) => a.section_id))];
      if (sectionIds.length === 0) return { rows: [], error: null };
      query = query.in("section_id", sectionIds);
    }
  }

  const { data, error } = await query;

  // A failed query used to come back as an empty list, which looked
  // exactly like "this class has no students yet". A missing column or
  // table after a half-applied migration is the usual cause, so say so
  // rather than quietly showing an empty roster.
  if (error) {
    console.error("getVisibleStudents failed:", error);
    return { rows: [], error: error.message };
  }

  return { rows: (data ?? []) as unknown as StudentWithMeta[], error: null };
}

export type SectionOption = {
  id: string;
  label: string;
  schoolId: string;
  gradeLevelId: string;
};

/**
 * The classes a person can work with, newest-school-year only:
 * everything for a master admin, their own school for a head teacher,
 * and just the classes they're assigned to for a regular teacher.
 *
 * Deliberately built from class_sections rather than from teaching
 * assignments, so a head teacher or admin can still take attendance
 * and enter grades for a class that has no teacher assigned yet.
 */
export async function getSectionOptions(teacher: {
  id: string;
  school_id: string | null;
  is_head_teacher: boolean;
  is_master_admin: boolean;
}): Promise<SectionOption[]> {
  const supabase = await createClient();
  const schoolYear = await getCurrentSchoolYear();
  if (!schoolYear) return [];

  let query = supabase
    .from("class_sections")
    .select("id, name, school_id, grade_level_id, sort_order, grade_levels(name, sort_order), schools(name)")
    .eq("school_year_id", schoolYear.id);

  if (!teacher.is_master_admin && teacher.school_id) {
    query = query.eq("school_id", teacher.school_id);
  }

  const { data } = await query;
  let rows = (data ?? []) as unknown as {
    id: string;
    name: string;
    school_id: string;
    grade_level_id: string;
    sort_order: number;
    grade_levels: { name: string; sort_order: number } | null;
    schools: { name: string } | null;
  }[];

  if (!teacher.is_master_admin && !teacher.is_head_teacher) {
    const assigned = new Set((await getTeacherAssignments(teacher.id)).map((a) => a.section_id));
    rows = rows.filter((r) => assigned.has(r.id));
  }

  return rows
    .sort(
      (a, b) =>
        (a.schools?.name ?? "").localeCompare(b.schools?.name ?? "") ||
        (a.grade_levels?.sort_order ?? 0) - (b.grade_levels?.sort_order ?? 0) ||
        a.sort_order - b.sort_order,
    )
    .map((r) => ({
      id: r.id,
      schoolId: r.school_id,
      gradeLevelId: r.grade_level_id,
      label: [
        teacher.is_master_admin ? r.schools?.name : null,
        r.grade_levels?.name ?? "",
        r.name !== "Main" ? r.name : null,
      ]
        .filter(Boolean)
        .join(" · "),
    }));
}

/** Subjects a person may enter grades for in a given class. */
export async function getSubjectOptionsForSection(
  teacher: { id: string; is_head_teacher: boolean; is_master_admin: boolean },
  sectionId: string,
) {
  const subjects = await getSubjects();
  if (teacher.is_master_admin || teacher.is_head_teacher) return subjects;

  const assignedSubjectIds = new Set(
    (await getTeacherAssignments(teacher.id)).filter((a) => a.section_id === sectionId).map((a) => a.subject_id),
  );
  return subjects.filter((s) => assignedSubjectIds.has(s.id));
}

/** Sections that exist at a school for the given year — every grade, unless gradeLevelId narrows it. */
export async function getSections(schoolId: string, schoolYearId: string, gradeLevelId?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("class_sections")
    .select("*")
    .eq("school_id", schoolId)
    .eq("school_year_id", schoolYearId)
    .order("sort_order");
  if (gradeLevelId) query = query.eq("grade_level_id", gradeLevelId);
  const { data } = await query;
  return data ?? [];
}

/**
 * Every class in the year, across all schools. The master admin's
 * student form lets them pick the school, so the class list on screen
 * has to be able to follow whichever school they choose.
 */
export async function getAllSections(schoolYearId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("class_sections")
    .select("*")
    .eq("school_year_id", schoolYearId)
    .order("sort_order");
  return data ?? [];
}

export async function getAttendanceSummaries(schoolYearId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_attendance_summary")
    .select("*")
    .eq("school_year_id", schoolYearId);
  return data ?? [];
}
