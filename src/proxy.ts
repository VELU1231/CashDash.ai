import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Next.js 16 Proxy (replaces middleware.ts)
 *
 * Responsibilities:
 * 1. Refresh the Supabase auth session (cookie-based JWT)
 * 2. Redirect unauthenticated users away from protected routes (/dashboard/*)
 * 3. Redirect authenticated users away from auth-only routes (/login, /register)
 * 4. Allow public routes (/, /pricing, /forgot-password, etc.) for everyone
 */
export async function proxy(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase env vars are not set, skip auth — let pages render
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: any[]) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  try {
    // Refresh the session — this is the primary purpose of the proxy
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const pathname = request.nextUrl.pathname;

    // ─── Route Classification ─────────────────────────────────────
    //
    // AUTH-ONLY routes: Only for non-logged-in users.
    //   If a logged-in user visits these, redirect → /dashboard
    const isAuthOnlyRoute =
      pathname.startsWith('/login') ||
      pathname.startsWith('/register') ||
      pathname.startsWith('/forgot-password') ||
      pathname.startsWith('/reset-password');

    // PROTECTED routes: Only for logged-in users.
    //   If a non-logged-in user visits these, redirect → /login
    const isProtectedRoute = pathname.startsWith('/dashboard');

    // PUBLIC routes: Accessible to everyone (logged in or not).
    //   /, /pricing, /api/*, /auth/callback, static assets, etc.
    //   No redirects needed for these.

    // ─── Redirect Logic ───────────────────────────────────────────

    // Not logged in + trying to access protected route → login
    if (!user && isProtectedRoute) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    // Logged in + trying to access auth-only route → dashboard
    if (user && isAuthOnlyRoute) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }

    // Everything else: allow through (public routes like /, /pricing, API routes, etc.)
  } catch {
    // If auth check fails, let the request through
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - Static asset files (svg, png, jpg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
