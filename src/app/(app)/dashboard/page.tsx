import Link from "next/link";
import { AlertTriangle, CalendarCheck, ClipboardList, Sprout, Users } from "lucide-react";
import { requireTeacher } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  getCurrentSchoolYear,
  getQuarters,
  getTeacherAssignments,
} from "@/lib/queries";
import { findCurrentQuarter, weekNumberInQuarter } from "@/lib/quarters";
import { PASSING_GRADE } from "@/lib/grades";
import { Topbar } from "@/components/layout/topbar";
import { StatTile } from "@/components/dashboard/stat-tile";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SubjectAverageChart } from "@/components/dashboard/subject-average-chart";

export default async function DashboardPage() {
  const teacher = await requireTeacher();
  const supabase = await createClient();

  const schoolYear = await getCurrentSchoolYear();
  const quarters = schoolYear ? await getQuarters(schoolYear.id) : [];
  const currentQuarter = quarters.length ? findCurrentQuarter(quarters) : null;
  const currentWeek = currentQuarter ? weekNumberInQuarter(currentQuarter) : null;

  // Everything below is independent, so it all goes out at once. Run
  // one after another these were half a dozen serial round trips to
  // Singapore before a single tile appeared.
  const needsCompliance = Boolean(currentQuarter && currentWeek && !teacher.is_master_admin && !teacher.is_head_teacher);

  const [{ count: studentCount }, assignments, gradesResult, summaryResult, countsResult] = await Promise.all([
    supabase.from("students").select("*", { count: "exact", head: true }).eq("status", "active"),
    getTeacherAssignments(teacher.id),
    currentQuarter
      ? supabase.from("quarterly_grades").select("subject_name, quarterly_grade").eq("quarter_id", currentQuarter.id)
      : Promise.resolve({ data: [] as { subject_name: string; quarterly_grade: number | null }[] }),
    currentQuarter && schoolYear
      ? supabase
          .from("student_attendance_summary")
          .select("student_id, effective_absences, should_be_dropped, at_warning")
          .eq("school_year_id", schoolYear.id)
          .eq("at_warning", true)
      : Promise.resolve({ data: [] as { student_id: string; effective_absences: number; should_be_dropped: boolean }[] }),
    needsCompliance
      ? supabase
          .from("weekly_entry_counts")
          .select("section_id, subject_id, assessment_type")
          .eq("teacher_id", teacher.id)
          .eq("quarter_id", currentQuarter!.id)
          .eq("week_number", currentWeek!)
      : Promise.resolve({ data: [] as { section_id: string; subject_id: string; assessment_type: string }[] }),
  ]);

  const quarterlyGrades = gradesResult.data ?? [];
  const summaries = summaryResult.data ?? [];
  const missingWeeklyEntries: { grade: string; subject: string; type: string }[] = [];

  // Names for the at-risk list can only be fetched once we know who is
  // at risk, so this one genuinely has to wait its turn.
  let atRiskStudents: { id: string; first_name: string; last_name: string; effective_absences: number; should_be_dropped: boolean }[] = [];
  if (summaries.length) {
    const { data: students } = await supabase
      .from("students")
      .select("id, first_name, last_name")
      .in(
        "id",
        summaries.map((s) => s.student_id),
      );
    atRiskStudents = (students ?? []).map((s) => {
      const summary = summaries.find((x) => x.student_id === s.id)!;
      return { ...s, effective_absences: summary.effective_absences, should_be_dropped: summary.should_be_dropped };
    });
  }

  if (needsCompliance) {
    const covered = new Set((countsResult.data ?? []).map((c) => `${c.section_id}:${c.subject_id}:${c.assessment_type}`));
    for (const a of assignments) {
      for (const type of ["quiz", "homework_participation"] as const) {
        if (!covered.has(`${a.section_id}:${a.subject_id}:${type}`)) {
          missingWeeklyEntries.push({
            grade: a.grade_levels?.name ?? "",
            subject: a.subjects?.name ?? "",
            type: type === "quiz" ? "Quizzes" : "Homework / Participation",
          });
        }
      }
    }
  }

  const gradedValues = quarterlyGrades.filter((g) => g.quarterly_grade !== null);
  const passingCount = gradedValues.filter((g) => (g.quarterly_grade ?? 0) >= PASSING_GRADE).length;
  const passingRate = gradedValues.length ? Math.round((passingCount / gradedValues.length) * 100) : null;

  const subjectAverages = Object.values(
    gradedValues.reduce<Record<string, { subject: string; total: number; n: number }>>((acc, g) => {
      const key = g.subject_name;
      acc[key] ??= { subject: key, total: 0, n: 0 };
      acc[key].total += g.quarterly_grade ?? 0;
      acc[key].n += 1;
      return acc;
    }, {}),
  ).map((s) => ({ subject: s.subject, average: Math.round((s.total / s.n) * 10) / 10 }));

  return (
    <>
      <Topbar teacher={teacher} title={`Welcome, ${teacher.full_name.split(" ")[0]}`} />
      <main className="flex-1 space-y-6 p-4 lg:p-8">
        {currentQuarter ? (
          <p className="text-sm text-text-soft">
            {currentQuarter.name} &middot; Week {currentWeek ?? "exam"} &middot; {schoolYear?.label}
          </p>
        ) : (
          <p className="text-sm text-text-soft">No active quarter today — check the school calendar.</p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Active students" value={String(studentCount ?? 0)} icon={Users} />
          <StatTile
            label="Passing rate this quarter"
            value={passingRate !== null ? `${passingRate}%` : "—"}
            hint={`${PASSING_GRADE}+ average`}
            icon={Sprout}
            tone={passingRate === null ? "neutral" : passingRate >= 80 ? "good" : passingRate >= 60 ? "warn" : "bad"}
          />
          <StatTile
            label="Attendance warnings"
            value={String(atRiskStudents.length)}
            hint="2+ effective absences"
            icon={CalendarCheck}
            tone={atRiskStudents.length ? "warn" : "good"}
          />
          <StatTile
            label="Missing entries this week"
            value={String(missingWeeklyEntries.length)}
            hint={currentWeek ? `Week ${currentWeek}` : "Exam week"}
            icon={ClipboardList}
            tone={missingWeeklyEntries.length ? "warn" : "good"}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Subject averages this quarter</CardTitle>
              <CardDescription>Across the students you can see.</CardDescription>
            </CardHeader>
            <CardContent>
              {subjectAverages.length ? (
                <SubjectAverageChart data={subjectAverages} />
              ) : (
                <p className="py-8 text-center text-sm text-text-faint">
                  No exam scores recorded yet this quarter.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-status-warn" /> Attendance watch list
              </CardTitle>
              <CardDescription>2 or more effective absences.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {atRiskStudents.length === 0 && (
                <p className="text-sm text-text-faint">Nobody at risk right now — nice.</p>
              )}
              {atRiskStudents.map((s) => (
                <Link
                  key={s.id}
                  href={`/students/${s.id}`}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm hover:border-brand"
                >
                  <span className="text-text">
                    {s.first_name} {s.last_name}
                  </span>
                  <Badge tone={s.should_be_dropped ? "bad" : "warn"}>
                    {s.effective_absences} absences
                  </Badge>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>

        {missingWeeklyEntries.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Still need this week</CardTitle>
              <CardDescription>
                Week {currentWeek} entries not yet recorded for your classes.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {missingWeeklyEntries.map((m, i) => (
                <Badge key={i} tone="warn">
                  {m.grade} &middot; {m.subject} &middot; {m.type}
                </Badge>
              ))}
            </CardContent>
          </Card>
        )}
      </main>
    </>
  );
}
