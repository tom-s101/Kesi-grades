/**
 * How names are compared at sign-in: case, accents, punctuation and
 * extra spaces don't matter, so "ann  inahid" finds "Ann Inahid".
 *
 * Mirrors normalize_person_name() in
 * supabase/migrations/0012_teacher_name_login.sql — the roster script
 * uses that one to match names already on file. Keep the two in step.
 */
export function normalizePersonName(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
