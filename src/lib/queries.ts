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
  subject_id: string;
  school_year_id: string;
  teacher_id: string;
  grade_levels: { code: string; name: string; sort_order: number } | null;
  subjects: { code: string; name: string; sort_order: number } | null;
};

/** Grade levels + subjects a given teacher is assigned to (RLS lets anyone read this table). */
export async function getTeacherAssignments(teacherId: string): Promise<TeacherAssignment[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("class_subject_teachers")
    .select("*, grade_levels(code, name, sort_order), subjects(code, name, sort_order)")
    .eq("teacher_id", teacherId);
  return (data ?? []) as unknown as TeacherAssignment[];
}

export type StudentWithMeta = import("@/lib/types").Student & {
  grade_levels: { code: string; name: string } | null;
  schools: { name: string } | null;
};

/** Students visible to the current session (RLS already scopes this). */
export async function getVisibleStudents(filters?: {
  schoolId?: string;
  gradeLevelId?: string;
}): Promise<StudentWithMeta[]> {
  const supabase = await createClient();
  let query = supabase
    .from("students")
    .select("*, grade_levels(code, name), schools(name)")
    .order("last_name");
  if (filters?.schoolId) query = query.eq("school_id", filters.schoolId);
  if (filters?.gradeLevelId) query = query.eq("current_grade_level_id", filters.gradeLevelId);
  const { data } = await query;
  return (data ?? []) as unknown as StudentWithMeta[];
}

export async function getAttendanceSummaries(schoolYearId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_attendance_summary")
    .select("*")
    .eq("school_year_id", schoolYearId);
  return data ?? [];
}
