import { createClient } from "@/lib/supabase/server";
import { csvResponse } from "@/lib/csv";
import { fullName } from "@/lib/format";
import type { Student } from "@/lib/types";

type StudentRow = Student & { grade_levels: { name: string } | null; schools: { name: string } | null };

export async function GET(request: Request) {
  const supabase = await createClient();
  const school = new URL(request.url).searchParams.get("school");

  let query = supabase.from("students").select("*, grade_levels(name), schools(name)").order("last_name");
  if (school) query = query.eq("school_id", school);
  const { data } = await query;

  const rows = ((data ?? []) as unknown as StudentRow[]).map((s) => ({
    name: fullName(s),
    lrn: s.lrn ?? "",
    grade_level: s.grade_levels?.name ?? "",
    school: s.schools?.name ?? "",
    sex: s.sex ?? "",
    birthdate: s.birthdate ?? "",
    guardian_name: s.guardian_name ?? "",
    guardian_contact: s.guardian_contact ?? "",
    status: s.status,
  }));

  return csvResponse("students.csv", rows);
}
