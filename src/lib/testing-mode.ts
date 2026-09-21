/**
 * Open testing mode.
 *
 * While the site is being tried out, there's no login: anyone with the
 * link gets in, and by default they get full master-admin access. A
 * "viewing as" switcher lets you step into any teacher's shoes to see
 * exactly what they'd see.
 *
 * This is ON by default. To lock the site down for real use, set
 * REQUIRE_LOGIN=true (or DISABLE_AUTH=false) in the hosting
 * environment and redeploy — the normal login + row-level security
 * then apply again, with no other code changes.
 */
export function openAccessEnabled(): boolean {
  if (process.env.REQUIRE_LOGIN === "true") return false;
  if (process.env.DISABLE_AUTH === "false") return false;
  return true;
}

/** Cookie holding the teacher currently being impersonated, if any. */
export const ACT_AS_COOKIE = "kesi-act-as";

/**
 * Cookie holding which door someone came in through on the landing
 * page. "teacher" still gets the run of every campus while we're
 * testing — the point is to see the site the way a teacher would, not
 * to be stopped by permissions that aren't set up yet.
 */
export const ROLE_COOKIE = "kesi-role";

export type TestRole = "teacher" | "admin";

export function parseTestRole(value: string | undefined | null): TestRole {
  return value === "teacher" ? "teacher" : "admin";
}
