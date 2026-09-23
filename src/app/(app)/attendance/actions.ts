"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { AttendanceStatus } from "@/lib/types";

export type AttendanceEntry = { studentId: string; am: AttendanceStatus | null; pm: AttendanceStatus | null };
export type SaveResult = { error?: string; ok?: boolean };

export async function saveAttendance(input: {
  schoolYearId: string;
  date: string;
  entries: AttendanceEntry[];
}): Promise<SaveResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isFriday = new Date(input.date + "T00:00:00").getDay() === 5;

  const rows: { student_id: string; school_year_id: string; attendance_date: string; session: "am" | "pm"; status: AttendanceStatus; recorded_by?: string }[] = [];
  for (const e of input.entries) {
    if (e.am) {
      rows.push({ student_id: e.studentId, school_year_id: input.schoolYearId, attendance_date: input.date, session: "am", status: e.am, recorded_by: user?.id });
    }
    if (e.pm && !isFriday) {
      rows.push({ student_id: e.studentId, school_year_id: input.schoolYearId, attendance_date: input.date, session: "pm", status: e.pm, recorded_by: user?.id });
    }
  }

  if (!rows.length) return { error: "Mark at least one student before saving." };

  const { error } = await supabase
    .from("attendance_records")
    .upsert(rows, { onConflict: "student_id,attendance_date,session" });

  if (error) return { error: error.message };
  revalidatePath("/attendance");
  revalidatePath("/dashboard");
  // Absence tallies show on the roster and the student profile too, so
  // those have to drop their cached copies or they'll show old counts.
  revalidatePath("/students");
  revalidatePath("/students", "layout");
  return { ok: true };
}
