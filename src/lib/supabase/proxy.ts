import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — MUST happen before any other logic
  let {
    data: { user },
  } = await supabase.auth.getUser();

  // Dev-only auto-login. Gated on NODE_ENV (always "production" on Vercel, so
  // this branch is literally unreachable in any deployed build) AND on the
  // presence of DEV_AUTO_LOGIN_* env vars in .env.local.
  if (
    !user &&
    process.env.NODE_ENV === "development" &&
    process.env.DEV_AUTO_LOGIN_EMAIL &&
    process.env.DEV_AUTO_LOGIN_PASSWORD &&
    !request.nextUrl.pathname.startsWith("/auth") &&
    !request.nextUrl.pathname.startsWith("/api/og")
  ) {
    const { error } = await supabase.auth.signInWithPassword({
      email: process.env.DEV_AUTO_LOGIN_EMAIL,
      password: process.env.DEV_AUTO_LOGIN_PASSWORD,
    });
    if (!error) {
      ({
        data: { user },
      } = await supabase.auth.getUser());
    }
  }

  // Redirect unauthenticated users to /login.
  // /api/og/* is exempt so OG image crawlers (Slack, Twitter, etc.) can generate
  // unfurl thumbnails without a session — the route handler renders a fallback
  // when RLS denies post access.
  if (
    !user &&
    !request.nextUrl.pathname.startsWith("/login") &&
    !request.nextUrl.pathname.startsWith("/auth") &&
    !request.nextUrl.pathname.startsWith("/api/og")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from /login
  if (user && request.nextUrl.pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/feed";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
