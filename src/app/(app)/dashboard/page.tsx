import { Suspense, cache } from "react";
import Link from "next/link";
import { AlertTriangle, CalendarCheck, ClipboardList, Sprout, Users, type LucideIcon } from "lucide-react";
import { requireTeacher, type CurrentTeacher } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSchoolYear, getGradesQuarter, getQuarters, getTeacherAssignments } from "@/lib/queries";
import { findCurrentQuarter, weekNumberInQuarter } from "@/lib/quarters";
import { PASSING_GRADE } from "@/lib/grades";
import { Topbar } from "@/components/layout/topbar";
import { StatTile } from "@/components/dashboard/stat-tile";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MorphLoader, SectionLoader } from "@/components/ui/loader";
import { SubjectAverageChart } from "@/components/charts/lazy-charts";

/*
 * The dashboard arrives in pieces. The greeting and the week line show
 * as soon as the teacher is known; each tile, the chart and the watch
 * list then fill in on their own as their numbers come back, each with
 * the loader in its place until then. Nothing waits for the slowest
 * part before anything else is shown.
 *
 * Several pieces need the same figures (the passing-rate tile and the
 * chart both use the same quarter's grades; the warnings tile and the watch
 * list both use the attendance warnings), so the loaders below are
 * cached per request: each is asked for once, whichever piece asks
 * first, and the other gets the same answer.
 */

const loadStudentCount = cache(async () => {
  const supabase = await createClient();
  const { count } = await supabase.from("students").select("*", { count: "exact", head: true }).eq("status", "active");
  return count ?? 0;
});

const loadQuarterGrades = cache(async (quarterId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("quarterly_grades")
    .select("subject_name, quarterly_grade")
    .eq("quarter_id", quarterId);
  const graded = (data ?? []).filter((g) => g.quarterly_grade !== null);
  const passing = graded.filter((g) => (g.quarterly_grade ?? 0) >= PASSING_GRADE).length;

  const subjectAverages = Object.values(
    graded.reduce<Record<string, { subject: string; total: number; n: number }>>((acc, g) => {
      acc[g.subject_name] ??= { subject: g.subject_name, total: 0, n: 0 };
      acc[g.subject_name].total += g.quarterly_grade ?? 0;
      acc[g.subject_name].n += 1;
      return acc;
    }, {}),
  ).map((s) => ({ subject: s.subject, average: Math.round((s.total / s.n) * 10) / 10 }));

  return {
    passingRate: graded.length ? Math.round((passing / graded.length) * 100) : null,
    subjectAverages,
  };
});

type AtRiskStudent = {
  id: string;
  first_name: string;
  last_name: string;
  effective_absences: number;
  should_be_dropped: boolean;
};

const loadAtRisk = cache(async (schoolYearId: string): Promise<AtRiskStudent[]> => {
  const supabase = await createClient();
  const { data: summaries } = await supabase
    .from("student_attendance_summary")
    .select("student_id, effective_absences, should_be_dropped, at_warning")
    .eq("school_year_id", schoolYearId)
    .eq("at_warning", true);
  if (!summaries?.length) return [];

  // Names can only be asked for once we know who is at risk.
  const { data: students } = await supabase
    .from("students")
    .select("id, first_name, last_name")
    .in(
      "id",
      summaries.map((s) => s.student_id),
    );
  const byId = new Map(summaries.map((s) => [s.student_id, s]));
  return (students ?? []).map((s) => ({
    ...s,
    effective_absences: byId.get(s.id)!.effective_absences,
    should_be_dropped: byId.get(s.id)!.should_be_dropped,
  }));
});

type MissingEntry = { grade: string; subject: string; type: string };

const loadMissingEntries = cache(
  async (teacherId: string, quarterId: string, week: number): Promise<MissingEntry[]> => {
    const supabase = await createClient();
    const [assignments, { data: counts }] = await Promise.all([
      getTeacherAssignments(teacherId),
      supabase
        .from("weekly_entry_counts")
        .select("section_id, subject_id, assessment_type")
        .eq("teacher_id", teacherId)
        .eq("quarter_id", quarterId)
        .eq("week_number", week),
    ]);

    const covered = new Set((counts ?? []).map((c) => `${c.section_id}:${c.subject_id}:${c.assessment_type}`));
    const missing: MissingEntry[] = [];
    // A class shared among several teachers isn't any one of them's to
    // chase for weekly entries.
    for (const a of assignments.filter((x) => !x.shared)) {
      // Quizzes are weekly; homework & participation is one score a
      // quarter, so it isn't chased week by week.
      for (const type of ["quiz"] as const) {
        if (!covered.has(`${a.section_id}:${a.subject_id}:${type}`)) {
          missing.push({
            grade: a.grade_levels?.name ?? "",
            subject: a.subjects?.name ?? "",
            type: type === "quiz" ? "Quizzes" : "Homework / Participation",
          });
        }
      }
    }
    return missing;
  },
);

export default async function DashboardPage() {
  const [teacher, schoolYear] = await Promise.all([requireTeacher(), getCurrentSchoolYear()]);
  const quarters = schoolYear ? await getQuarters(schoolYear.id) : [];
  const currentQuarter = quarters.length ? findCurrentQuarter(quarters) : null;
  const currentWeek = currentQuarter ? weekNumberInQuarter(currentQuarter) : null;

  // Weekly-entry reminders are for class teachers; heads and admins
  // don't have a class of their own to be reminded about.
  const compliance =
    currentQuarter && currentWeek && !teacher.is_master_admin && !teacher.is_head_teacher
      ? { quarterId: currentQuarter.id, week: currentWeek }
      : null;

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
          <Suspense fallback={<TileLoading label="Active students" icon={Users} />}>
            <StudentCountTile />
          </Suspense>
          <Suspense fallback={<TileLoading label="Passing rate" icon={Sprout} />}>
            <PassingRateTile schoolYearId={schoolYear?.id ?? null} currentQuarterId={currentQuarter?.id ?? null} />
          </Suspense>
          <Suspense fallback={<TileLoading label="Attendance warnings" icon={CalendarCheck} />}>
            <WarningsTile schoolYearId={currentQuarter && schoolYear ? schoolYear.id : null} />
          </Suspense>
          <Suspense fallback={<TileLoading label="Missing entries this week" icon={ClipboardList} />}>
            <MissingTile teacher={teacher} compliance={compliance} weekLabel={currentWeek ? `Week ${currentWeek}` : "Exam week"} />
          </Suspense>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Subject averages</CardTitle>
              <CardDescription>Across the students you can see.</CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<SectionLoader label="Loading grades" className="h-64" />}>
                <SubjectChart schoolYearId={schoolYear?.id ?? null} currentQuarterId={currentQuarter?.id ?? null} />
              </Suspense>
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
              <Suspense fallback={<SectionLoader label="Checking attendance" />}>
                <WatchList schoolYearId={currentQuarter && schoolYear ? schoolYear.id : null} />
              </Suspense>
            </CardContent>
          </Card>
        </div>

        {/* Only appears if something is missing, so nothing to hold its
            place while it's worked out. */}
        <Suspense fallback={null}>
          <MissingEntriesCard teacher={teacher} compliance={compliance} week={currentWeek} />
        </Suspense>
      </main>
    </>
  );
}

/** A tile whose number is still on its way: same card, loader for the figure. */
function TileLoading({ label, icon: Icon }: { label: string; icon: LucideIcon }) {
  return (
    <Card className="flex items-center gap-4 p-4 sm:p-5" aria-busy="true">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-sunken text-text-faint">
        <Icon size={18} strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <MorphLoader size={36} className="my-1" />
        <span className="mt-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-text-faint">
          {label}
        </span>
      </span>
    </Card>
  );
}

async function StudentCountTile() {
  const count = await loadStudentCount();
  return <StatTile label="Active students" value={String(count)} icon={Users} />;
}

/** Which quarter's grades to show, and its grades — see getGradesQuarter(). */
async function gradesToShow(schoolYearId: string | null, currentQuarterId: string | null) {
  if (!schoolYearId) return null;
  const shown = await getGradesQuarter(schoolYearId, currentQuarterId);
  if (!shown) return null;
  return { ...shown, ...(await loadQuarterGrades(shown.quarter.id)) };
}

async function PassingRateTile({
  schoolYearId,
  currentQuarterId,
}: {
  schoolYearId: string | null;
  currentQuarterId: string | null;
}) {
  const shown = await gradesToShow(schoolYearId, currentQuarterId);
  const passingRate = shown?.passingRate ?? null;
  return (
    <StatTile
      label={shown ? `Passing rate · ${shown.quarter.name}` : "Passing rate"}
      value={passingRate !== null ? `${passingRate}%` : "—"}
      hint={`${PASSING_GRADE}+ average`}
      icon={Sprout}
      tone={passingRate === null ? "neutral" : passingRate >= 80 ? "good" : passingRate >= 60 ? "warn" : "bad"}
    />
  );
}

async function WarningsTile({ schoolYearId }: { schoolYearId: string | null }) {
  const atRisk = schoolYearId ? await loadAtRisk(schoolYearId) : [];
  return (
    <StatTile
      label="Attendance warnings"
      value={String(atRisk.length)}
      hint="2+ effective absences"
      icon={CalendarCheck}
      tone={atRisk.length ? "warn" : "good"}
    />
  );
}

async function MissingTile({
  teacher,
  compliance,
  weekLabel,
}: {
  teacher: CurrentTeacher;
  compliance: { quarterId: string; week: number } | null;
  weekLabel: string;
}) {
  const missing = compliance ? await loadMissingEntries(teacher.id, compliance.quarterId, compliance.week) : [];
  return (
    <StatTile
      label="Missing entries this week"
      value={String(missing.length)}
      hint={weekLabel}
      icon={ClipboardList}
      tone={missing.length ? "warn" : "good"}
    />
  );
}

async function SubjectChart({
  schoolYearId,
  currentQuarterId,
}: {
  schoolYearId: string | null;
  currentQuarterId: string | null;
}) {
  const shown = await gradesToShow(schoolYearId, currentQuarterId);
  if (!shown || shown.subjectAverages.length === 0) {
    return <p className="py-8 text-center text-sm text-text-faint">No exam scores recorded yet.</p>;
  }
  return (
    <>
      <p className="mb-3 text-sm text-text-soft">
        {shown.quarter.name}
        {!shown.isCurrent && (
          <span className="text-text-faint"> — the latest quarter with exam scores; this quarter has none yet.</span>
        )}
      </p>
      <SubjectAverageChart data={shown.subjectAverages} />
    </>
  );
}

async function WatchList({ schoolYearId }: { schoolYearId: string | null }) {
  const atRisk = schoolYearId ? await loadAtRisk(schoolYearId) : [];
  if (atRisk.length === 0) return <p className="text-sm text-text-faint">Nobody at risk right now — nice.</p>;
  return (
    <>
      {atRisk.map((s) => (
        <Link
          key={s.id}
          href={`/students/${s.id}`}
          className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm hover:border-brand"
        >
          <span className="text-text">
            {s.first_name} {s.last_name}
          </span>
          <Badge tone={s.should_be_dropped ? "bad" : "warn"}>{s.effective_absences} absences</Badge>
        </Link>
      ))}
    </>
  );
}

async function MissingEntriesCard({
  teacher,
  compliance,
  week,
}: {
  teacher: CurrentTeacher;
  compliance: { quarterId: string; week: number } | null;
  week: number | null;
}) {
  const missing = compliance ? await loadMissingEntries(teacher.id, compliance.quarterId, compliance.week) : [];
  if (missing.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Still need this week</CardTitle>
        <CardDescription>Week {week} entries not yet recorded for your classes.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {missing.map((m, i) => (
          <Badge key={i} tone="warn">
            {m.grade} &middot; {m.subject} &middot; {m.type}
          </Badge>
        ))}
      </CardContent>
    </Card>
  );
}
