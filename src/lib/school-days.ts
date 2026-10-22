/**
 * Calendar arithmetic on "YYYY-MM-DD" strings for the attendance week
 * view and the quarter catch-up. Strings in, strings out, worked out in
 * UTC — so the answer is the same on the server (UTC) and on a phone in
 * Manila, and never slips a day at midnight.
 */

function toUtc(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function fromUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const d = toUtc(date);
  d.setUTCDate(d.getUTCDate() + days);
  return fromUtc(d);
}

/** 0 = Sunday … 6 = Saturday. */
export function weekday(date: string): number {
  return toUtc(date).getUTCDay();
}

export function isFridayDate(date: string): boolean {
  return weekday(date) === 5;
}

/** The Monday of the week a date falls in (Sunday counts with the week before). */
export function mondayOf(date: string): string {
  const wd = weekday(date);
  return addDays(date, wd === 0 ? -6 : 1 - wd);
}

/** Monday to Friday of the week starting on `monday`. */
export function schoolWeek(monday: string): string[] {
  return [0, 1, 2, 3, 4].map((i) => addDays(monday, i));
}

/** Every Monday-to-Friday date from `from` to `to`, inclusive. */
export function schoolDaysBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const wd = weekday(d);
    if (wd >= 1 && wd <= 5) out.push(d);
  }
  return out;
}

/** The sessions held on a school day: Fridays are morning-only. */
export function sessionsOn(date: string): ("am" | "pm")[] {
  return isFridayDate(date) ? ["am"] : ["am", "pm"];
}

const short = new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", timeZone: "UTC" });
const dayName = new Intl.DateTimeFormat("en-PH", { weekday: "short", timeZone: "UTC" });

export function shortDate(date: string): string {
  return short.format(toUtc(date));
}

export function shortWeekday(date: string): string {
  return dayName.format(toUtc(date));
}
