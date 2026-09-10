import { createClient } from "@/lib/supabase/server";
import { csvResponse } from "@/lib/csv";
import { fullName } from "@/lib/format";
import { getCurrentSchoolYear } from "@/lib/queries";

export async function GET(request: Request) {
  const supabase = await createClient();
  const school = new URL(request.url).searchParams.get("school");

  let studentQuery = supabase.from("students").select("id, first_name, middle_name, last_name, school_id");
  if (school) studentQuery = studentQuery.eq("school_id", school);
  const { data: students } = await studentQuery;
  const studentIds = (students ?? []).map((s) => s.id);
  if (!studentIds.length) return csvResponse("attendance.csv", []);

  const schoolYear = await getCurrentSchoolYear();
  if (!schoolYear) return csvResponse("attendance.csv", []);

  const { data: summaries } = await supabase
    .from("student_attendance_summary")
    .select("*")
    .eq("school_year_id", schoolYear.id)
    .in("student_id", studentIds);

  const studentById = new Map((students ?? []).map((s) => [s.id, s]));

  const rows = (summaries ?? []).map((s) => {
    const student = studentById.get(s.student_id);
    return {
      student: student ? fullName(student) : s.student_id,
      total_lates: s.total_lates,
      direct_absence_days: s.direct_absence_days,
      absences_from_lates: s.absences_from_lates,
      effective_absences: s.effective_absences,
      at_warning: s.at_warning,
      should_be_dropped: s.should_be_dropped,
    };
  });

  return csvResponse("attendance.csv", rows);
}
