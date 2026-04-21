// ─── DEPRECATED ─────────────────────────────────────────────────────────────
// This file is no longer used. The auth + routing logic has been moved
// directly into src/proxy.ts (the Next.js 16 proxy convention).
//
// This file is kept for reference only.
// ────────────────────────────────────────────────────────────────────────────

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * @deprecated Use src/proxy.ts instead. Next.js 16 uses proxy.ts, not middleware.ts.
 */
export async function updateSession(request: NextRequest) {
  // This function is no longer called. See src/proxy.ts.
  return NextResponse.next({ request });
}
