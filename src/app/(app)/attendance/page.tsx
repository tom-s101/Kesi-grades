import { requireTeacher } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSchoolYear, type TeacherAssignment, getTeacherAssignments } from "@/lib/queries";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { AttendanceClient } from "@/components/attendance/attendance-client";

function dedupeClasses(assignments: TeacherAssignment[]) {
  const seen = new Map<string, TeacherAssignment>();
  for (const a of assignments) {
    const key = a.section_id;
    if (!seen.has(key)) seen.set(key, a);
  }
  return [...seen.values()];
}

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ class?: string; date?: string }>;
}) {
  const teacher = await requireTeacher();
  const sp = await searchParams;
  const supabase = await createClient();

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

  const classes = dedupeClasses(assignments);
  const schoolYear = await getCurrentSchoolYear();

  if (!schoolYear || classes.length === 0) {
    return (
      <>
        <Topbar teacher={teacher} title="Attendance" />
        <main className="flex-1 p-5 lg:p-8">
          <Card>
            <CardContent className="py-10 text-center text-text-soft">
              No classes to take attendance for yet.
            </CardContent>
          </Card>
        </main>
      </>
    );
  }

  const activeClass = classes.find((c) => c.id === sp.class) ?? classes[0];
  const today = new Date();
  const isoToday = today.toISOString().slice(0, 10);
  const date = sp.date ?? isoToday;

  const { data: students } = await supabase
    .from("students")
    .select("id, first_name, middle_name, last_name")
    .eq("section_id", activeClass.section_id)
    .eq("status", "active")
    .order("last_name");

  const { data: existing } = await supabase
    .from("attendance_records")
    .select("student_id, session, status")
    .eq("attendance_date", date)
    .in("student_id", (students ?? []).map((s) => s.id));

  return (
    <>
      <Topbar teacher={teacher} title="Attendance" />
      <main className="flex-1 space-y-5 p-5 lg:p-8">
        <AttendanceClient
          classes={classes.map((c) => ({
            id: c.id,
            label: `${c.grade_levels?.name ?? ""}${
              c.class_sections?.name && c.class_sections.name !== "Main" ? ` (${c.class_sections.name})` : ""
            }`,
            schoolId: c.school_id,
          }))}
          activeClassId={activeClass.id}
          date={date}
          students={(students ?? []).map((s) => ({
            id: s.id,
            name: `${s.last_name}, ${s.first_name}${s.middle_name ? " " + s.middle_name[0] + "." : ""}`,
          }))}
          existing={existing ?? []}
          schoolYearId={schoolYear.id}
        />
      </main>
    </>
  );
}
