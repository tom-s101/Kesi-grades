/** Attendance-rule helpers mirroring supabase/migrations/0003_views.sql
 *  (attendance_daily / student_attendance_summary). */

import { isFriday } from "@/lib/quarters";

export const DROP_THRESHOLD_ABSENCES = 3;
export const WARNING_THRESHOLD_ABSENCES = 2;
export const LATES_PER_ABSENCE = 5;

export type SessionStatus = "present" | "late" | "absent" | null;

/** Effective absence-days contributed by one calendar day's AM/PM statuses. */
export function absenceDaysForDate(date: Date, am: SessionStatus, pm: SessionStatus): number {
  const friday = isFriday(date);
  const sessionWeight = friday ? 1 : 0.5;
  let days = 0;
  if (am === "absent") days += sessionWeight;
  if (!friday && pm === "absent") days += sessionWeight;
  return days;
}

export function lateCountForDate(am: SessionStatus, pm: SessionStatus, friday: boolean): number {
  let count = 0;
  if (am === "late") count += 1;
  if (!friday && pm === "late") count += 1;
  return count;
}

export function summarize(days: { date: Date; am: SessionStatus; pm: SessionStatus }[]) {
  let directAbsenceDays = 0;
  let totalLates = 0;

  for (const day of days) {
    const friday = isFriday(day.date);
    directAbsenceDays += absenceDaysForDate(day.date, day.am, day.pm);
    totalLates += lateCountForDate(day.am, day.pm, friday);
  }

  const absencesFromLates = Math.floor(totalLates / LATES_PER_ABSENCE);
  const effectiveAbsences = Math.round((directAbsenceDays + absencesFromLates) * 100) / 100;

  return {
    directAbsenceDays,
    totalLates,
    absencesFromLates,
    effectiveAbsences,
    atWarning: effectiveAbsences >= WARNING_THRESHOLD_ABSENCES,
    shouldBeDropped: effectiveAbsences >= DROP_THRESHOLD_ABSENCES,
  };
}
