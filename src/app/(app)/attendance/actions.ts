"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sessionUserId } from "@/lib/supabase/session";
import { schoolToday } from "@/lib/school-time";
import { isFridayDate, schoolDaysBetween, sessionsOn } from "@/lib/school-days";
import type { AttendanceStatus } from "@/lib/types";

export type AttendanceEntry = { studentId: string; am: AttendanceStatus | null; pm: AttendanceStatus | null };
export type SaveResult = { error?: string; ok?: boolean };

export async function saveAttendance(input: {
  schoolYearId: string;
  date: string;
  entries: AttendanceEntry[];
}): Promise<SaveResult> {
  const supabase = await createClient();
  const userId = await sessionUserId(supabase);

  const isFriday = new Date(input.date + "T00:00:00").getDay() === 5;

  const rows: { student_id: string; school_year_id: string; attendance_date: string; session: "am" | "pm"; status: AttendanceStatus; recorded_by?: string }[] = [];
  for (const e of input.entries) {
    if (e.am) {
      rows.push({ student_id: e.studentId, school_year_id: input.schoolYearId, attendance_date: input.date, session: "am", status: e.am, recorded_by: userId ?? undefined });
    }
    if (e.pm && !isFriday) {
      rows.push({ student_id: e.studentId, school_year_id: input.schoolYearId, attendance_date: input.date, session: "pm", status: e.pm, recorded_by: userId ?? undefined });
    }
  }

  if (!rows.length) return { error: "Mark at least one student before saving." };

  const { error } = await supabase
    .from("attendance_records")
    .upsert(rows, { onConflict: "student_id,attendance_date,session" });

  if (error) return { error: error.message };
  attendanceChanged();
  return { ok: true };
}

function attendanceChanged() {
  revalidatePath("/attendance");
  revalidatePath("/dashboard");
  // Absence tallies show on the roster and the student profile too, so
  // those have to drop their cached copies or they'll show old counts.
  revalidatePath("/students");
  revalidatePath("/students", "layout");
}

type AttendanceRow = {
  student_id: string;
  school_year_id: string;
  attendance_date: string;
  session: "am" | "pm";
  status: AttendanceStatus;
  recorded_by?: string;
};

/** Big catch-up saves go in slices, so no single request gets too large. */
const CHUNK = 1000;

export type WeekCell = { studentId: string; date: string; session: "am" | "pm"; status: AttendanceStatus | null };

/**
 * Save a whole week's sheet for one class (the week view). Every box on
 * the sheet is sent: a mark is saved, and a box left blank clears any
 * mark saved there before — which is how "No class" undoes a day that
 * was filled in by mistake, such as a holiday.
 *
 * Row-level security decides whose attendance this teacher may write;
 * anything else is refused by the database, not just hidden here.
 */
export async function saveAttendanceWeek(input: {
  schoolYearId: string;
  cells: WeekCell[];
}): Promise<SaveResult & { saved?: number; cleared?: number }> {
  const today = schoolToday();
  if (input.cells.some((c) => c.date > today)) return { error: "Days after today can't be marked yet." };

  const supabase = await createClient();
  const userId = await sessionUserId(supabase);

  // Fridays are morning-only; a stray afternoon box is simply ignored.
  const cells = input.cells.filter((c) => !(c.session === "pm" && isFridayDate(c.date)));

  const rows: AttendanceRow[] = cells
    .filter((c): c is WeekCell & { status: AttendanceStatus } => c.status !== null)
    .map((c) => ({
      student_id: c.studentId,
      school_year_id: input.schoolYearId,
      attendance_date: c.date,
      session: c.session,
      status: c.status,
      recorded_by: userId ?? undefined,
    }));

  // Blank boxes: clear whatever was saved there, one request per
  // date-and-session.
  const toClear = new Map<string, string[]>();
  for (const c of cells) {
    if (c.status !== null) continue;
    const key = `${c.date}|${c.session}`;
    toClear.set(key, [...(toClear.get(key) ?? []), c.studentId]);
  }

  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await supabase
      .from("attendance_records")
      .upsert(rows.slice(i, i + CHUNK), { onConflict: "student_id,attendance_date,session" });
    if (error) return { error: error.message };
  }

  const clears = await Promise.all(
    [...toClear.entries()].map(([key, studentIds]) => {
      const [date, session] = key.split("|");
      return supabase
        .from("attendance_records")
        .delete()
        .eq("attendance_date", date)
        .eq("session", session as "am" | "pm")
        .in("student_id", studentIds);
    }),
  );
  const clearError = clears.find((r) => r.error)?.error;
  if (clearError) return { error: clearError.message };

  attendanceChanged();
  return { ok: true, saved: rows.length, cleared: [...toClear.values()].reduce((n, ids) => n + ids.length, 0) };
}

/**
 * Catch-up for a quarter that ran before the site was in use: mark every
 * student in the class present for every school day of the quarter, up
 * to today — but only where nothing is recorded yet. Marks a teacher has
 * already entered are never touched, so this is safe to press again.
 * Lates, absences and days with no class are then fixed in the week view.
 */
export async function markQuarterPresent(input: {
  sectionId: string;
  quarterId: string;
}): Promise<{ ok: true; added: number; from: string; to: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const userId = await sessionUserId(supabase);

  const [{ data: quarter }, { data: students }] = await Promise.all([
    supabase
      .from("quarters")
      .select("start_date, end_date, exam_week_end, school_year_id, name")
      .eq("id", input.quarterId)
      .maybeSingle(),
    supabase.from("students").select("id").eq("section_id", input.sectionId).eq("status", "active"),
  ]);
  if (!quarter) return { ok: false, error: "That quarter isn't set up." };
  if (!students?.length) return { ok: false, error: "There are no students in this class to mark." };

  const today = schoolToday();
  const from = quarter.start_date;
  const last = quarter.exam_week_end ?? quarter.end_date;
  const to = last < today ? last : today;
  if (from > to) return { ok: false, error: `${quarter.name} hasn't started yet.` };

  const rows: AttendanceRow[] = [];
  for (const date of schoolDaysBetween(from, to)) {
    for (const session of sessionsOn(date)) {
      for (const s of students) {
        rows.push({
          student_id: s.id,
          school_year_id: quarter.school_year_id,
          attendance_date: date,
          session,
          status: "present",
          recorded_by: userId ?? undefined,
        });
      }
    }
  }

  let added = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    // ignoreDuplicates = "on conflict do nothing": an existing mark wins.
    const { data, error } = await supabase
      .from("attendance_records")
      .upsert(rows.slice(i, i + CHUNK), { onConflict: "student_id,attendance_date,session", ignoreDuplicates: true })
      .select("student_id");
    if (error) return { ok: false, error: error.message };
    added += data?.length ?? 0;
  }

  attendanceChanged();
  return { ok: true, added, from, to };
}
