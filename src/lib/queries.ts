import "server-only";
import { createClient } from "@/lib/supabase/server";
import { cacheReference } from "@/lib/reference-cache";
import type { Quarter } from "@/lib/types";

/** The single school_years row flagged is_current — the whole app pivots off this. */
export const getCurrentSchoolYear = cacheReference("school_year", async () => {
  const supabase = await createClient();
  const { data } = await supabase.from("school_years").select("*").eq("is_current", true).single();
  return data;
});

const quartersByYear = new Map<string, () => Promise<Quarter[]>>();

export async function getQuarters(schoolYearId: string): Promise<Quarter[]> {
  let load = quartersByYear.get(schoolYearId);
  if (!load) {
    load = cacheReference(`quarters:${schoolYearId}`, async () => {
      const supabase = await createClient();
      const { data } = await supabase
        .from("quarters")
        .select("*")
        .eq("school_year_id", schoolYearId)
        .order("number");
      return (data ?? []) as Quarter[];
    });
    quartersByYear.set(schoolYearId, load);
  }
  return load();
}

export const getSubjects = cacheReference("subjects", async () => {
  const supabase = await createClient();
  const { data } = await supabase.from("subjects").select("*").order("sort_order");
  return data ?? [];
});

export const getGradeLevels = cacheReference("grade_levels", async () => {
  const supabase = await createClient();
  const { data } = await supabase.from("grade_levels").select("*").order("sort_order");
  return data ?? [];
});

export const getSchools = cacheReference("schools", async () => {
  const supabase = await createClient();
  const { data } = await supabase.from("schools").select("*").order("name");
  return data ?? [];
});

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

export type StudentListRow = {
  id: string;
  name: string;
  initials: string;
  status: string;
  schoolId: string;
  schoolName: string;
  gradeLevelId: string | null;
  gradeName: string;
  sectionName: string | null;
  absences: number;
  atWarning: boolean;
  shouldBeDropped: boolean;
};

/**
 * The whole roster a person may see, in the shape the list screen
 * needs and nothing more.
 *
 * Deliberately unfiltered: the filters live in the browser now. Asking
 * the server again for every change of school or grade meant a full
 * page round trip — several seconds on a phone — to narrow a list that
 * was already on screen.
 */
export async function getStudentListRows(teacher: {
  id: string;
  school_id: string | null;
  is_head_teacher: boolean;
  is_master_admin: boolean;
}): Promise<{ rows: StudentListRow[]; error: string | null }> {
  const supabase = await createClient();
  const schoolYear = await getCurrentSchoolYear();

  let query = supabase
    .from("students")
    .select(
      "id, first_name, middle_name, last_name, status, school_id, current_grade_level_id, grade_levels(name), schools(name), class_sections(name)",
    )
    .order("last_name");

  if (!teacher.is_master_admin) {
    if (teacher.is_head_teacher && teacher.school_id) {
      query = query.eq("school_id", teacher.school_id);
    } else if (!teacher.is_head_teacher) {
      const sectionIds = [...new Set((await getTeacherAssignments(teacher.id)).map((a) => a.section_id))];
      if (sectionIds.length === 0) return { rows: [], error: null };
      query = query.in("section_id", sectionIds);
    }
  }

  // The roster and the attendance tallies don't depend on each other,
  // so they go out together rather than one after the other.
  const [{ data, error }, summaryResult] = await Promise.all([
    query,
    schoolYear
      ? supabase
          .from("student_attendance_summary")
          .select("student_id, effective_absences, at_warning, should_be_dropped")
          .eq("school_year_id", schoolYear.id)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  if (error) {
    console.error("getStudentListRows failed:", error);
    return { rows: [], error: error.message };
  }

  type SummaryRow = { student_id: string; effective_absences: number; at_warning: boolean; should_be_dropped: boolean };
  const summaries = new Map<string, SummaryRow>(
    ((summaryResult.data ?? []) as SummaryRow[]).map((s) => [s.student_id, s]),
  );

  type Row = {
    id: string;
    first_name: string;
    middle_name: string | null;
    last_name: string;
    status: string;
    school_id: string;
    current_grade_level_id: string | null;
    grade_levels: { name: string } | null;
    schools: { name: string } | null;
    class_sections: { name: string } | null;
  };

  const rows = ((data ?? []) as unknown as Row[]).map((r) => {
    const summary = summaries.get(r.id);
    return {
      id: r.id,
      name: [r.first_name, r.middle_name, r.last_name].filter(Boolean).join(" "),
      initials: `${r.first_name[0] ?? ""}${r.last_name[0] ?? ""}`.toUpperCase(),
      status: r.status,
      schoolId: r.school_id,
      schoolName: r.schools?.name ?? "—",
      gradeLevelId: r.current_grade_level_id,
      gradeName: r.grade_levels?.name ?? "Unassigned",
      sectionName: r.class_sections?.name ?? null,
      absences: summary?.effective_absences ?? 0,
      atWarning: summary?.at_warning ?? false,
      shouldBeDropped: summary?.should_be_dropped ?? false,
    };
  });

  return { rows, error: null };
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
