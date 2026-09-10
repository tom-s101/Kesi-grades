import { differenceInCalendarWeeks, isWithinInterval, startOfDay } from "date-fns";
import type { Quarter } from "@/lib/types";

/** Which quarter (if any) `today` falls inside — including its exam week. */
export function findCurrentQuarter(quarters: Quarter[], today: Date = new Date()): Quarter | null {
  const d = startOfDay(today);
  return (
    quarters.find((q) =>
      isWithinInterval(d, { start: new Date(q.start_date), end: new Date(q.exam_week_end) }),
    ) ?? null
  );
}

/** 1-indexed instructional week number for a date inside a quarter (exam week excluded). */
export function weekNumberInQuarter(quarter: Quarter, date: Date): number | null {
  const d = startOfDay(date);
  const start = new Date(quarter.start_date);
  const examStart = new Date(quarter.exam_week_start);
  if (d < start || d >= examStart) return null;
  return differenceInCalendarWeeks(d, start, { weekStartsOn: 1 }) + 1;
}

/** Total instructional weeks a quarter has, for building the weekly-entry checklist. */
export function totalWeeksInQuarter(quarter: Quarter): number {
  const start = new Date(quarter.start_date);
  const examStart = new Date(quarter.exam_week_start);
  return differenceInCalendarWeeks(examStart, start, { weekStartsOn: 1 }) + 1;
}

export function quarterLabel(quarter: Pick<Quarter, "number" | "name">): string {
  return quarter.name ?? `Quarter ${quarter.number}`;
}

/** Every weekday (Mon-Fri) between two dates, inclusive — for attendance grids. */
export function schoolDaysBetween(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const cur = startOfDay(start);
  const last = startOfDay(end);
  while (cur <= last) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

export function isFriday(date: Date): boolean {
  return date.getDay() === 5;
}
