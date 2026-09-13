import { requireTeacher } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSchoolYear, getQuarters, getTeacherAssignments, type TeacherAssignment } from "@/lib/queries";
import { findCurrentQuarter, totalWeeksInQuarter, weekNumberInQuarter } from "@/lib/quarters";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { GradeEntryClient } from "@/components/grades/grade-entry-client";

export default async function GradesPage({
  searchParams,
}: {
  searchParams: Promise<{ assignment?: string; quarter?: string; mode?: string; week?: string }>;
}) {
  const teacher = await requireTeacher();
  const sp = await searchParams;
  const supabase = await createClient();

  const schoolYear = await getCurrentSchoolYear();
  const quarters = schoolYear ? await getQuarters(schoolYear.id) : [];

  let assignments: TeacherAssignment[];
  if (teacher.is_master_admin || teacher.is_head_teacher) {
    const query = supabase
      .from("class_subject_teachers")
      .select("*, grade_levels(code, name, sort_order), subjects(code, name, sort_order), class_sections(name)")
      .order("school_id");
    const scoped = teacher.is_master_admin ? query : query.eq("school_id", teacher.school_id ?? "");
    const { data } = await scoped;
    assignments = (data ?? []) as unknown as TeacherAssignment[];
  } else {
    assignments = await getTeacherAssignments(teacher.id);
  }

  if (!schoolYear || assignments.length === 0) {
    return (
      <>
        <Topbar teacher={teacher} title="Grades" />
        <main className="flex-1 p-5 lg:p-8">
          <Card>
            <CardContent className="py-10 text-center text-text-soft">
              {assignments.length === 0
                ? "You don't have any class assignments yet. Ask your head teacher to assign you a grade and subject."
                : "No school year is set up yet."}
            </CardContent>
          </Card>
        </main>
      </>
    );
  }

  const activeAssignment = assignments.find((a) => a.id === sp.assignment) ?? assignments[0];
  const activeQuarter = quarters.find((q) => q.id === sp.quarter) ?? findCurrentQuarter(quarters) ?? quarters[0];
  const mode = (sp.mode as "quiz" | "homework_participation" | "exam") ?? "quiz";
  const currentWeek = activeQuarter ? weekNumberInQuarter(activeQuarter, new Date()) : null;
  const totalWeeks = activeQuarter ? totalWeeksInQuarter(activeQuarter) : 1;
  const week = Number(sp.week) || currentWeek || 1;

  const { data: students } = await supabase
    .from("students")
    .select("id, first_name, middle_name, last_name")
    .eq("section_id", activeAssignment.section_id)
    .eq("status", "active")
    .order("last_name");

  let existingScores: { student_id: string; raw_score: number | null; max_score: number | null; percentage: number }[] = [];
  if (activeQuarter) {
    if (mode === "exam") {
      const { data } = await supabase
        .from("quarter_exam_scores")
        .select("student_id, raw_score, max_score, percentage")
        .eq("quarter_id", activeQuarter.id)
        .eq("subject_id", activeAssignment.subject_id);
      existingScores = data ?? [];
    } else {
      const { data } = await supabase
        .from("weekly_scores")
        .select("student_id, raw_score, max_score, percentage")
        .eq("quarter_id", activeQuarter.id)
        .eq("subject_id", activeAssignment.subject_id)
        .eq("assessment_type", mode)
        .eq("week_number", week);
      existingScores = data ?? [];
    }
  }

  return (
    <>
      <Topbar teacher={teacher} title="Grades" />
      <main className="flex-1 space-y-5 p-5 lg:p-8">
        <GradeEntryClient
          assignments={assignments.map((a) => ({
            id: a.id,
            label: `${a.grade_levels?.name}${
              a.class_sections?.name && a.class_sections.name !== "Main" ? ` (${a.class_sections.name})` : ""
            } — ${a.subjects?.name}`,
            gradeLevelId: a.grade_level_id,
            sectionId: a.section_id,
            subjectId: a.subject_id,
            schoolId: a.school_id,
          }))}
          quarters={quarters.map((q) => ({ id: q.id, name: q.name, number: q.number }))}
          activeAssignmentId={activeAssignment.id}
          activeQuarterId={activeQuarter?.id ?? ""}
          mode={mode}
          week={week}
          totalWeeks={totalWeeks}
          students={(students ?? []).map((s) => ({
            id: s.id,
            name: `${s.last_name}, ${s.first_name}${s.middle_name ? " " + s.middle_name[0] + "." : ""}`,
          }))}
          existingScores={existingScores}
          schoolYearId={schoolYear.id}
          subjectId={activeAssignment.subject_id}
        />
      </main>
    </>
  );
}
