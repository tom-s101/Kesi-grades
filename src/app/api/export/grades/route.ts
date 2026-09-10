import { createClient } from "@/lib/supabase/server";
import { csvResponse } from "@/lib/csv";
import { fullName } from "@/lib/format";

export async function GET(request: Request) {
  const supabase = await createClient();
  const school = new URL(request.url).searchParams.get("school");

  let studentQuery = supabase.from("students").select("id, first_name, middle_name, last_name, current_grade_level_id, school_id");
  if (school) studentQuery = studentQuery.eq("school_id", school);
  const { data: students } = await studentQuery;
  const studentIds = (students ?? []).map((s) => s.id);
  if (!studentIds.length) return csvResponse("grades.csv", []);

  const { data: grades } = await supabase
    .from("quarterly_grades")
    .select("*")
    .in("student_id", studentIds)
    .order("quarter_number");

  const studentById = new Map((students ?? []).map((s) => [s.id, s]));

  const rows = (grades ?? []).map((g) => {
    const student = studentById.get(g.student_id);
    return {
      student: student ? fullName(student) : g.student_id,
      subject: g.subject_name,
      quarter: g.quarter_number,
      exam_percentage: g.exam_percentage ?? "",
      quiz_average: g.quiz_average ?? "",
      homework_average: g.homework_average ?? "",
      quarterly_grade: g.quarterly_grade ?? "",
    };
  });

  return csvResponse("grades.csv", rows);
}
