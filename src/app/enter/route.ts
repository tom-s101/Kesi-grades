import { NextResponse, type NextRequest } from "next/server";
import { ACT_AS_COOKIE, ROLE_COOKIE, openAccessEnabled, parseTestRole } from "@/lib/testing-mode";

/**
 * The landing page's two doors.
 *
 * A plain GET handler on purpose: the buttons are ordinary links, so
 * tapping one is a real browser navigation with the browser's own
 * loading indicator. A client-side <Link> into the dashboard looks
 * dead on a phone while the server renders it, and silently does
 * nothing at all if that render fails.
 */
export async function GET(request: NextRequest) {
  if (!openAccessEnabled()) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const role = parseTestRole(request.nextUrl.searchParams.get("as"));
  const response = NextResponse.redirect(new URL("/dashboard", request.url));

  response.cookies.set(ROLE_COOKIE, role, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });
  // Coming in the front door starts fresh — drop any teacher that a
  // previous session was "viewing as".
  response.cookies.delete(ACT_AS_COOKIE);

  return response;
}
