import { notFound } from "next/navigation";
import { CalendarCheck, TriangleAlert } from "lucide-react";
import { requireTeacher } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSchoolYear, getGradeLevels, getSchools, getSections } from "@/lib/queries";
import { fullName, ageFromBirthdate, initials } from "@/lib/format";
import { remarkFor } from "@/lib/grades";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StudentForm } from "@/components/students/student-form";

export default async function StudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const teacher = await requireTeacher();
  const supabase = await createClient();

  const { data: studentRaw } = await supabase
    .from("students")
    .select("*, grade_levels(name), schools(name), class_sections(name)")
    .eq("id", id)
    .single();

  if (!studentRaw) notFound();
  const student = studentRaw as unknown as import("@/lib/types").Student & {
    grade_levels: { name: string } | null;
    schools: { name: string } | null;
    class_sections: { name: string } | null;
  };

  const schoolYear = await getCurrentSchoolYear();

  const [{ data: summary }, { data: grades }] = await Promise.all([
    schoolYear
      ? supabase
          .from("student_attendance_summary")
          .select("*")
          .eq("student_id", id)
          .eq("school_year_id", schoolYear.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("quarterly_grades")
      .select("*")
      .eq("student_id", id)
      .order("quarter_number"),
  ]);

  const canEditSensitive = teacher.is_head_teacher || teacher.is_master_admin;
  const age = ageFromBirthdate(student.birthdate);

  const bySubject = new Map<string, typeof grades>();
  (grades ?? []).forEach((g) => {
    const list = bySubject.get(g.subject_name) ?? [];
    list.push(g);
    bySubject.set(g.subject_name, list);
  });

  return (
    <>
      <Topbar teacher={teacher} title={fullName(student)} />
      <main className="flex-1 space-y-6 p-5 lg:p-8">
        <div className="flex flex-wrap items-start gap-6">
          <Card className="flex-1 min-w-[280px]">
            <CardContent className="flex items-center gap-4 !p-5">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-soft text-lg font-semibold text-brand-strong">
                {initials(student)}
              </span>
              <div>
                <p className="font-display text-xl font-medium text-text">{fullName(student)}</p>
                <p className="text-sm text-text-soft">
                  {student.grade_levels?.name ?? "Unassigned"}
                  {student.class_sections?.name && student.class_sections.name !== "Main"
                    ? ` (${student.class_sections.name})`
                    : ""}{" "}
                  &middot; {student.schools?.name}
                  {age !== null ? ` · ${age} years old` : ""}
                </p>
                <div className="mt-2 flex gap-2">
                  <Badge tone={student.status === "active" ? "good" : "neutral"}>{student.status}</Badge>
                  {student.lrn && <Badge tone="neutral">LRN {student.lrn}</Badge>}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="w-full sm:w-72">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarCheck size={16} className="text-brand" /> Attendance this year
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              <Row label="Effective absences" value={String(summary?.effective_absences ?? 0)} />
              <Row label="Total lates" value={String(summary?.total_lates ?? 0)} />
              {summary?.at_warning && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-status-warn-bg px-3 py-2 text-status-warn">
                  <TriangleAlert size={15} />
                  <span className="text-xs font-medium">
                    {summary.should_be_dropped
                      ? "At the 3-absence drop threshold"
                      : "2+ absences — keep an eye on this student"}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Grades by quarter</CardTitle>
            <CardDescription>85% exam &middot; 12% quizzes &middot; 3% homework &amp; participation</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-faint">
                  <th className="py-2 pr-4 font-medium">Subject</th>
                  <th className="py-2 px-3 font-medium">Q1</th>
                  <th className="py-2 px-3 font-medium">Q2</th>
                  <th className="py-2 px-3 font-medium">Q3</th>
                  <th className="py-2 px-3 font-medium">Q4</th>
                  <th className="py-2 pl-3 font-medium">Remark</th>
                </tr>
              </thead>
              <tbody>
                {[...bySubject.entries()].map(([subject, rows]) => {
                  const byQ = new Map(rows!.map((r) => [r.quarter_number, r.quarterly_grade]));
                  const completed = rows!.filter((r) => r.quarterly_grade !== null);
                  const average = completed.length
                    ? completed.reduce((a, r) => a + (r.quarterly_grade ?? 0), 0) / completed.length
                    : null;
                  const remark = remarkFor(average);
                  return (
                    <tr key={subject} className="border-b border-border last:border-0">
                      <td className="py-2.5 pr-4 font-medium text-text">{subject}</td>
                      {[1, 2, 3, 4].map((q) => (
                        <td key={q} className="py-2.5 px-3 text-text-soft">
                          {byQ.get(q) ?? "—"}
                        </td>
                      ))}
                      <td className="py-2.5 pl-3">
                        <Badge tone={remark.tone}>{remark.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
                {bySubject.size === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-text-faint">
                      No grades recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Edit student</CardTitle>
            <CardDescription>
              {canEditSensitive
                ? "Fix a typo, update contact info, or reassign grade/status."
                : "Fix a typo or update contact info. Grade level and status changes need a head teacher or admin."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EditSection student={student} canEditSensitive={canEditSensitive} isMasterAdmin={teacher.is_master_admin} />
          </CardContent>
        </Card>
      </main>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-text-soft">{label}</span>
      <span className="font-medium text-text">{value}</span>
    </div>
  );
}

async function EditSection({
  student,
  canEditSensitive,
  isMasterAdmin,
}: {
  student: import("@/lib/types").Student;
  canEditSensitive: boolean;
  isMasterAdmin: boolean;
}) {
  const schoolYear = await getCurrentSchoolYear();
  const [gradeLevels, schools, sections] = await Promise.all([
    getGradeLevels(),
    isMasterAdmin ? getSchools() : Promise.resolve([]),
    schoolYear ? getSections(student.school_id, schoolYear.id) : Promise.resolve([]),
  ]);
  return (
    <StudentForm
      mode="edit"
      student={student}
      gradeLevels={gradeLevels}
      sections={sections}
      schools={schools}
      defaultSchoolId={student.school_id}
      canEditSensitive={canEditSensitive}
    />
  );
}
