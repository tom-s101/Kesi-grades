import { requireTeacher } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSchoolYear, getSectionOptions } from "@/lib/queries";
import { schoolToday } from "@/lib/school-time";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { AttendanceClient } from "@/components/attendance/attendance-client";
import type { AttendanceStatus } from "@/lib/types";

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ class?: string; date?: string }>;
}) {
  const teacher = await requireTeacher();
  const sp = await searchParams;
  const supabase = await createClient();

  const schoolYear = await getCurrentSchoolYear();
  // Attendance is taken per class, not per subject — so the class list
  // comes from the sections themselves. A head teacher or admin gets
  // every class in scope even before any teacher has been assigned.
  const classes = schoolYear ? await getSectionOptions(teacher) : [];

  if (!schoolYear || classes.length === 0) {
    return (
      <>
        <Topbar teacher={teacher} title="Attendance" />
        <main className="flex-1 p-4 lg:p-8">
          <Card>
            <CardContent className="py-10 text-center text-text-soft">
              {!schoolYear
                ? "No school year is set up yet."
                : "No classes to take attendance for yet. A head teacher can set up classes on the School Admin page."}
            </CardContent>
          </Card>
        </main>
      </>
    );
  }

  const activeClass = classes.find((c) => c.id === sp.class) ?? classes[0];
  const date = sp.date ?? schoolToday();

  // Marks are pulled by joining through to the class rather than by
  // first fetching the roster and then asking again with its ids, so
  // both queries can go out at the same time.
  const [{ data: students }, joined] = await Promise.all([
    supabase
      .from("students")
      .select("id, first_name, middle_name, last_name")
      .eq("section_id", activeClass.id)
      .eq("status", "active")
      .order("last_name"),
    supabase
      .from("attendance_records")
      .select("student_id, session, status, students!inner(section_id)")
      .eq("attendance_date", date)
      .eq("students.section_id", activeClass.id),
  ]);

  // The hand-written Database type can't describe an !inner join, so
  // the shape is asserted rather than inferred.
  type Mark = { student_id: string; session: "am" | "pm"; status: AttendanceStatus };
  let existingMarks = (joined.data ?? []) as unknown as Mark[];

  // Showing an unmarked sheet when marks do exist would let a teacher
  // save right over them, so a failed join falls back to the plain
  // two-step lookup rather than quietly returning nothing.
  if (joined.error) {
    console.error("attendance join failed, falling back:", joined.error);
    const studentIds = (students ?? []).map((s) => s.id);
    if (studentIds.length) {
      const { data } = await supabase
        .from("attendance_records")
        .select("student_id, session, status")
        .eq("attendance_date", date)
        .in("student_id", studentIds);
      existingMarks = (data ?? []) as Mark[];
    } else {
      existingMarks = [];
    }
  }

  return (
    <>
      <Topbar teacher={teacher} title="Attendance" />
      <main className="flex-1 space-y-5 p-4 lg:p-8">
        <AttendanceClient
          // Remount when the class or date changes, so the marks on
          // screen always belong to what's selected.
          key={`${activeClass.id}:${date}`}
          classes={classes.map((c) => ({ id: c.id, label: c.label }))}
          activeClassId={activeClass.id}
          date={date}
          students={(students ?? []).map((s) => ({
            id: s.id,
            name: `${s.last_name}, ${s.first_name}${s.middle_name ? " " + s.middle_name[0] + "." : ""}`,
          }))}
          existing={existingMarks}
          schoolYearId={schoolYear.id}
        />
      </main>
    </>
  );
}
