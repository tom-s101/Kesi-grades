import { differenceInCalendarWeeks, isWithinInterval } from "date-fns";
import { parseDateOnly, schoolTodayDate } from "@/lib/school-time";
import type { Quarter } from "@/lib/types";

/** Which quarter (if any) today falls inside — including its exam week. */
export function findCurrentQuarter(quarters: Quarter[], today: Date = schoolTodayDate()): Quarter | null {
  return (
    quarters.find((q) =>
      isWithinInterval(today, {
        start: parseDateOnly(q.start_date),
        end: parseDateOnly(q.exam_week_end),
      }),
    ) ?? null
  );
}

/** 1-indexed instructional week number for a date inside a quarter (exam week excluded). */
export function weekNumberInQuarter(quarter: Quarter, date: Date = schoolTodayDate()): number | null {
  const start = parseDateOnly(quarter.start_date);
  const examStart = parseDateOnly(quarter.exam_week_start);
  if (date < start || date >= examStart) return null;
  return differenceInCalendarWeeks(date, start, { weekStartsOn: 1 }) + 1;
}

/**
 * How many instructional weeks a quarter has. Exam week starts the
 * Monday after the last instructional week, so the difference in
 * calendar weeks is already the count — adding 1 would offer a week
 * that doesn't exist.
 */
export function totalWeeksInQuarter(quarter: Quarter): number {
  const start = parseDateOnly(quarter.start_date);
  const examStart = parseDateOnly(quarter.exam_week_start);
  return Math.max(1, differenceInCalendarWeeks(examStart, start, { weekStartsOn: 1 }));
}

export function quarterLabel(quarter: Pick<Quarter, "number" | "name">): string {
  return quarter.name ?? `Quarter ${quarter.number}`;
}

export function isFriday(date: Date): boolean {
  return date.getDay() === 5;
}
