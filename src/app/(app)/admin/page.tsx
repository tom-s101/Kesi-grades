import { redirect } from "next/navigation";
import { AlertTriangle, GraduationCap, TrendingUp, Users } from "lucide-react";
import { requireTeacher } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSchoolYear, getGradeLevels, getSchools, getSubjects } from "@/lib/queries";
import { findCurrentQuarter, weekNumberInQuarter } from "@/lib/quarters";
import { PASSING_GRADE } from "@/lib/grades";
import { Topbar } from "@/components/layout/topbar";
import { StatTile } from "@/components/dashboard/stat-tile";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminFilters } from "@/components/admin/admin-filters";
import { SchoolPassingRateChart } from "@/components/admin/school-passing-rate-chart";

export default async function OrgAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ school?: string; grade?: string; subject?: string }>;
}) {
  const teacher = await requireTeacher();
  if (!teacher.is_master_admin) redirect("/dashboard");

  const filters = await searchParams;
  const supabase = await createClient();

  const [schools, gradeLevels, subjects, schoolYear] = await Promise.all([
    getSchools(),
    getGradeLevels(),
    getSubjects(),
    getCurrentSchoolYear(),
  ]);

  let studentQuery = supabase.from("students").select("id, school_id, current_grade_level_id").eq("status", "active");
  if (filters.school) studentQuery = studentQuery.eq("school_id", filters.school);
  if (filters.grade) studentQuery = studentQuery.eq("current_grade_level_id", filters.grade);
  const { data: students } = await studentQuery;
  const studentIds = (students ?? []).map((s) => s.id);

  const quarters = schoolYear ? await (await import("@/lib/queries")).getQuarters(schoolYear.id) : [];
  const currentQuarter = findCurrentQuarter(quarters);
  const currentWeek = currentQuarter ? weekNumberInQuarter(currentQuarter) : null;

  let gradedRows: { student_id: string; subject_id: string; quarterly_grade: number | null }[] = [];
  if (currentQuarter && studentIds.length) {
    let gq = supabase
      .from("quarterly_grades")
      .select("student_id, subject_id, quarterly_grade")
      .eq("quarter_id", currentQuarter.id)
      .in("student_id", studentIds);
    if (filters.subject) gq = gq.eq("subject_id", filters.subject);
    const { data } = await gq;
    gradedRows = data ?? [];
  }
  const graded = gradedRows.filter((g) => g.quarterly_grade !== null);
  const passingRate = graded.length
    ? Math.round((graded.filter((g) => (g.quarterly_grade ?? 0) >= PASSING_GRADE).length / graded.length) * 100)
    : null;

  let attendanceSummaries: { student_id: string; at_warning: boolean; should_be_dropped: boolean; effective_absences: number }[] = [];
  if (schoolYear && studentIds.length) {
    const { data } = await supabase
      .from("student_attendance_summary")
      .select("student_id, at_warning, should_be_dropped, effective_absences")
      .eq("school_year_id", schoolYear.id)
      .in("student_id", studentIds);
    attendanceSummaries = data ?? [];
  }
  const atRiskCount = attendanceSummaries.filter((a) => a.at_warning).length;

  // Passing rate per school (unfiltered by school so the chart stays comparative).
  const bySchoolGrades = new Map<string, { total: number; passing: number }>();
  if (currentQuarter) {
    const allStudentIds = filters.grade || filters.school ? undefined : studentIds;
    let gq2 = supabase
      .from("quarterly_grades")
      .select("student_id, quarterly_grade")
      .eq("quarter_id", currentQuarter.id);
    if (allStudentIds) gq2 = gq2.in("student_id", allStudentIds);
    const { data: allGraded } = await gq2;
    const studentSchool = new Map((students ?? []).map((s) => [s.id, s.school_id]));
    for (const row of allGraded ?? []) {
      if (row.quarterly_grade === null) continue;
      const schoolId = studentSchool.get(row.student_id);
      if (!schoolId) continue;
      const entry = bySchoolGrades.get(schoolId) ?? { total: 0, passing: 0 };
      entry.total += 1;
      if (row.quarterly_grade >= PASSING_GRADE) entry.passing += 1;
      bySchoolGrades.set(schoolId, entry);
    }
  }
  const passingBySchool = schools.map((s) => {
    const e = bySchoolGrades.get(s.id);
    return { school: s.name, rate: e && e.total ? Math.round((e.passing / e.total) * 100) : 0 };
  });

  // Compliance: assignments with zero weekly entries this week.
  const missing: { school: string; grade: string; subject: string; teacher: string; type: string }[] = [];
  if (currentQuarter && currentWeek) {
    let assignQuery = supabase
      .from("class_subject_teachers")
      .select("*, schools(name), grade_levels(name), class_sections(name), subjects(name), teachers(full_name)")
      .eq("school_year_id", schoolYear!.id);
    if (filters.school) assignQuery = assignQuery.eq("school_id", filters.school);
    if (filters.grade) assignQuery = assignQuery.eq("grade_level_id", filters.grade);
    if (filters.subject) assignQuery = assignQuery.eq("subject_id", filters.subject);
    const { data: allAssignments } = await assignQuery;

    const { data: counts } = await supabase
      .from("weekly_entry_counts")
      .select("section_id, subject_id, assessment_type")
      .eq("quarter_id", currentQuarter.id)
      .eq("week_number", currentWeek);
    const covered = new Set((counts ?? []).map((c) => `${c.section_id}:${c.subject_id}:${c.assessment_type}`));

    for (const a of (allAssignments ?? []) as unknown as {
      section_id: string;
      subject_id: string;
      schools: { name: string } | null;
      grade_levels: { name: string } | null;
      class_sections: { name: string } | null;
      subjects: { name: string } | null;
      teachers: { full_name: string } | null;
    }[]) {
      for (const type of ["quiz", "homework_participation"] as const) {
        const key = `${a.section_id}:${a.subject_id}:${type}`;
        if (!covered.has(key)) {
          missing.push({
            school: a.schools?.name ?? "",
            grade: `${a.grade_levels?.name ?? ""}${
              a.class_sections?.name && a.class_sections.name !== "Main" ? ` (${a.class_sections.name})` : ""
            }`,
            subject: a.subjects?.name ?? "",
            teacher: a.teachers?.full_name ?? "",
            type: type === "quiz" ? "Quizzes" : "Homework",
          });
        }
      }
    }
  }

  return (
    <>
      <Topbar teacher={teacher} title="Organization Dashboard" />
      <main className="flex-1 space-y-6 p-5 lg:p-8">
        <AdminFilters schools={schools} gradeLevels={gradeLevels} subjects={subjects} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Active students" value={String(studentIds.length)} icon={Users} />
          <StatTile
            label="Passing rate"
            value={passingRate !== null ? `${passingRate}%` : "—"}
            icon={TrendingUp}
            tone={passingRate === null ? "neutral" : passingRate >= 80 ? "good" : passingRate >= 60 ? "warn" : "bad"}
          />
          <StatTile label="Attendance warnings" value={String(atRiskCount)} icon={AlertTriangle} tone={atRiskCount ? "warn" : "good"} />
          <StatTile label="Missing this week" value={String(missing.length)} icon={GraduationCap} tone={missing.length ? "warn" : "good"} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Passing rate by school</CardTitle>
            <CardDescription>Current quarter, {PASSING_GRADE}+ average.</CardDescription>
          </CardHeader>
          <CardContent>
            <SchoolPassingRateChart data={passingBySchool} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Not submitted this week</CardTitle>
            <CardDescription>{currentQuarter ? `${currentQuarter.name}, week ${currentWeek}` : "No active quarter"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {missing.length === 0 && <p className="text-sm text-text-faint">Everyone&rsquo;s caught up.</p>}
            {missing.slice(0, 40).map((m, i) => (
              <div key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                <span className="text-text">
                  {m.teacher} — {m.school} / {m.grade} / {m.subject}
                </span>
                <Badge tone="warn">{m.type}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
