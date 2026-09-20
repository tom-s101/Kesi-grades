/**
 * The school runs on Philippine time; the server does not (Netlify runs
 * UTC). Left alone, `new Date().toISOString()` rolls over to the next
 * day at 8am Manila — so a teacher opening attendance at 7am would be
 * marking *yesterday*, and the "current week" would flip a day early
 * on Sunday nights. Everything date-shaped goes through here instead.
 */
export const SCHOOL_TIME_ZONE = "Asia/Manila";

/** Today's calendar date at the school, as "YYYY-MM-DD". */
export function schoolToday(): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SCHOOL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Parses a "YYYY-MM-DD" into local midnight. Date-only values are
 * calendar days, not instants — parsing them with `new Date(str)`
 * treats them as UTC midnight, which lands on the previous day for
 * anyone behind UTC. Comparing two values parsed this way is stable in
 * any server timezone.
 */
export function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** Today at the school, as a Date at local midnight (safe to compare). */
export function schoolTodayDate(): Date {
  return parseDateOnly(schoolToday());
}
