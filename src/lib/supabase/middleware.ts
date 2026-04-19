import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  // If Supabase env vars are not set, skip auth check and let the page render
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
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
    }
  );

  try {
    const { data: { user } } = await supabase.auth.getUser();

    const url = request.nextUrl.clone();
    const isAuthRoute = url.pathname.startsWith('/login') ||
      url.pathname.startsWith('/register') ||
      url.pathname.startsWith('/forgot-password') ||
      url.pathname === '/' ||
      url.pathname === '/manifest.webmanifest';

    if (!user && !isAuthRoute) {
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    if (user && isAuthRoute && url.pathname !== '/') {
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  } catch {
    // If Supabase auth check fails, let the request through
    return supabaseResponse;
  }

  return supabaseResponse;
}
