/**
 * Open testing mode.
 *
 * With it on there's no login: anyone with the link gets in, by
 * default with full master-admin access, and a "viewing as" switcher
 * lets you step into any teacher's shoes to see exactly what they'd see.
 *
 * It's OFF unless OPEN_ACCESS=true is set in the hosting environment:
 * teachers sign in by name (see src/app/login/actions.ts), and
 * row-level security applies. The older REQUIRE_LOGIN / DISABLE_AUTH
 * switches are deliberately ignored now, so a value left over on the
 * host from the testing phase can't quietly keep the site open.
 */
export function openAccessEnabled(): boolean {
  return process.env.OPEN_ACCESS === "true";
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
