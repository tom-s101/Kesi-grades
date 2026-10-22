import { Suspense } from "react";
import { requireTeacher, type CurrentTeacher } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSchoolYear, getQuarters, getSectionOptions } from "@/lib/queries";
import { mondayOf, schoolWeek } from "@/lib/school-days";
import { schoolToday } from "@/lib/school-time";
import { Topbar } from "@/components/layout/topbar";
import { SectionLoader } from "@/components/ui/loader";
import { Card, CardContent } from "@/components/ui/card";
import { AttendanceClient } from "@/components/attendance/attendance-client";
import { AttendanceWeekClient } from "@/components/attendance/attendance-week-client";
import type { AttendanceStatus } from "@/lib/types";

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ class?: string; date?: string; view?: string; week?: string; filled?: string; fq?: string; ff?: string; ft?: string }>;
}) {
  const teacher = await requireTeacher();

  // The header shows straight away; the class sheet streams in behind it.
  // Switching class or date keeps the current sheet up, dimmed, until the
  // new one arrives (see the client component).
  return (
    <>
      <Topbar teacher={teacher} title="Attendance" />
      <Suspense fallback={<main className="flex-1 p-4 lg:p-8"><SectionLoader label="Loading attendance" /></main>}>
        <AttendanceBody teacher={teacher} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function AttendanceBody({
  teacher,
  searchParams,
}: {
  teacher: CurrentTeacher;
  searchParams: Promise<{ class?: string; date?: string; view?: string; week?: string; filled?: string; fq?: string; ff?: string; ft?: string }>;
}) {
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

  if (sp.view === "week") {
    return (
      <WeekSheet
        classes={classes.map((c) => ({ id: c.id, label: c.label }))}
        activeClassId={activeClass.id}
        monday={mondayOf(sp.week ?? date)}
        schoolYearId={schoolYear.id}
        filled={
          sp.filled && sp.fq && sp.ff && sp.ft
            ? { added: Number(sp.filled) || 0, quarter: sp.fq, from: sp.ff, to: sp.ft }
            : null
        }
      />
    );
  }

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

/**
 * The week view: a whole Monday-to-Friday sheet for one class, for
 * catching up on attendance that wasn't taken in the app at the time.
 */
async function WeekSheet({
  classes,
  activeClassId,
  monday,
  schoolYearId,
  filled,
}: {
  classes: { id: string; label: string }[];
  activeClassId: string;
  monday: string;
  schoolYearId: string;
  filled: { added: number; quarter: string; from: string; to: string } | null;
}) {
  const supabase = await createClient();
  const days = schoolWeek(monday);

  const [{ data: students }, { data: marks }, quarters] = await Promise.all([
    supabase
      .from("students")
      .select("id, first_name, middle_name, last_name")
      .eq("section_id", activeClassId)
      .eq("status", "active")
      .order("last_name"),
    supabase
      .from("attendance_records")
      .select("student_id, attendance_date, session, status, students!inner(section_id)")
      .gte("attendance_date", days[0])
      .lte("attendance_date", days[4])
      .eq("students.section_id", activeClassId),
    getQuarters(schoolYearId),
  ]);

  type Mark = { student_id: string; attendance_date: string; session: "am" | "pm"; status: AttendanceStatus };

  return (
    <main className="flex-1 space-y-5 p-4 lg:p-8">
      <AttendanceWeekClient
        // A fresh sheet for every class and week, so unsaved boxes never
        // carry over into a different week.
        key={`${activeClassId}:${monday}`}
        classes={classes}
        activeClassId={activeClassId}
        days={days}
        today={schoolToday()}
        students={(students ?? []).map((s) => ({
          id: s.id,
          name: `${s.last_name}, ${s.first_name}${s.middle_name ? " " + s.middle_name[0] + "." : ""}`,
        }))}
        existing={((marks ?? []) as unknown as Mark[]).map((m) => ({
          studentId: m.student_id,
          date: m.attendance_date,
          session: m.session,
          status: m.status,
        }))}
        quarters={quarters.map((q) => ({
          id: q.id,
          name: q.name,
          start: q.start_date,
          end: q.exam_week_end ?? q.end_date,
        }))}
        schoolYearId={schoolYearId}
        filled={filled}
      />
    </main>
  );
}
