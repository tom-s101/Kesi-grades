import { requireTeacher } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSchoolYear, getQuarters, getSectionOptions, getSubjectOptionsForSection } from "@/lib/queries";
import { findCurrentQuarter, totalWeeksInQuarter, weekNumberInQuarter } from "@/lib/quarters";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { GradeEntryClient } from "@/components/grades/grade-entry-client";

export default async function GradesPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string; subject?: string; quarter?: string; mode?: string; week?: string }>;
}) {
  const teacher = await requireTeacher();
  const sp = await searchParams;
  const supabase = await createClient();

  const schoolYear = await getCurrentSchoolYear();
  const quarters = schoolYear ? await getQuarters(schoolYear.id) : [];
  const sections = schoolYear ? await getSectionOptions(teacher) : [];

  if (!schoolYear || sections.length === 0 || quarters.length === 0) {
    return (
      <>
        <Topbar teacher={teacher} title="Grades" />
        <main className="flex-1 p-5 lg:p-8">
          <Card>
            <CardContent className="py-10 text-center text-text-soft">
              {!schoolYear || quarters.length === 0
                ? "No school year is set up yet."
                : "You don't have any classes yet. A head teacher can assign you one on the School Admin page."}
            </CardContent>
          </Card>
        </main>
      </>
    );
  }

  const activeSection = sections.find((s) => s.id === sp.section) ?? sections[0];
  const subjects = await getSubjectOptionsForSection(teacher, activeSection.id);

  if (subjects.length === 0) {
    return (
      <>
        <Topbar teacher={teacher} title="Grades" />
        <main className="flex-1 p-5 lg:p-8">
          <Card>
            <CardContent className="py-10 text-center text-text-soft">
              You aren&rsquo;t assigned any subjects for this class yet.
            </CardContent>
          </Card>
        </main>
      </>
    );
  }

  const activeSubject = subjects.find((s) => s.id === sp.subject) ?? subjects[0];
  const activeQuarter = quarters.find((q) => q.id === sp.quarter) ?? findCurrentQuarter(quarters) ?? quarters[0];
  const mode = (sp.mode as "quiz" | "homework_participation" | "exam") ?? "quiz";
  const totalWeeks = totalWeeksInQuarter(activeQuarter);
  const currentWeek = weekNumberInQuarter(activeQuarter);
  const week = Math.min(totalWeeks, Math.max(1, Number(sp.week) || currentWeek || 1));

  const { data: students } = await supabase
    .from("students")
    .select("id, first_name, middle_name, last_name")
    .eq("section_id", activeSection.id)
    .eq("status", "active")
    .order("last_name");

  let existingScores: { student_id: string; raw_score: number | null; max_score: number | null; percentage: number }[] = [];
  if (mode === "exam") {
    const { data } = await supabase
      .from("quarter_exam_scores")
      .select("student_id, raw_score, max_score, percentage")
      .eq("quarter_id", activeQuarter.id)
      .eq("subject_id", activeSubject.id);
    existingScores = data ?? [];
  } else {
    const { data } = await supabase
      .from("weekly_scores")
      .select("student_id, raw_score, max_score, percentage")
      .eq("quarter_id", activeQuarter.id)
      .eq("subject_id", activeSubject.id)
      .eq("assessment_type", mode)
      .eq("week_number", week);
    existingScores = data ?? [];
  }

  return (
    <>
      <Topbar teacher={teacher} title="Grades" />
      <main className="flex-1 space-y-5 p-5 lg:p-8">
        <GradeEntryClient
          // Remount whenever the thing being graded changes, so the
          // boxes on screen always hold that week's scores and never
          // carry the previous week's numbers into a save.
          key={`${activeSection.id}:${activeSubject.id}:${activeQuarter.id}:${mode}:${week}`}
          sections={sections.map((s) => ({ id: s.id, label: s.label }))}
          subjects={subjects.map((s) => ({ id: s.id, name: s.name }))}
          quarters={quarters.map((q) => ({ id: q.id, name: q.name, number: q.number }))}
          activeSectionId={activeSection.id}
          activeSubjectId={activeSubject.id}
          activeQuarterId={activeQuarter.id}
          mode={mode}
          week={week}
          totalWeeks={totalWeeks}
          students={(students ?? []).map((s) => ({
            id: s.id,
            name: `${s.last_name}, ${s.first_name}${s.middle_name ? " " + s.middle_name[0] + "." : ""}`,
          }))}
          existingScores={existingScores}
          schoolYearId={schoolYear.id}
        />
      </main>
    </>
  );
}
