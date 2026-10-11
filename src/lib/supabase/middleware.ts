import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { openAccessEnabled } from "@/lib/testing-mode";

const PUBLIC_EXACT_PATHS = ["/", "/login"];
const PUBLIC_PREFIXES = ["/api/whatsapp", "/api/auth/", "/api/ping"];

export async function updateSession(request: NextRequest) {
  // Open testing mode: no login gate at all. This has to agree with
  // src/lib/testing-mode.ts — if the gate here redirected to /login
  // while the login page redirected back to the dashboard, every
  // request would bounce between the two forever.
  if (openAccessEnabled()) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // Only "is anyone signed in?" is decided here, and that needs no trip
  // to the Auth server: getSession() reads the cookie, and refreshes it
  // when the token has expired. Who they are, and what they may see, is
  // checked against the database by requireTeacher() and row-level
  // security on every page — see lib/supabase/session.ts.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const signedIn = Boolean(session?.access_token);

  const isPublic =
    PUBLIC_EXACT_PATHS.includes(request.nextUrl.pathname) ||
    PUBLIC_PREFIXES.some((p) => request.nextUrl.pathname.startsWith(p));

  if (!signedIn && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return response;
}
