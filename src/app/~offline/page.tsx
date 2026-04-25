'use client';
export const runtime = 'edge';

import Link from 'next/link';
import { WifiSlash, House } from '@phosphor-icons/react';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/10 flex items-center justify-center mx-auto mb-6">
          <WifiSlash className="w-8 h-8 text-amber-500" weight="fill" />
        </div>
        <h1 className="text-2xl font-serif font-bold mb-3">You&apos;re offline</h1>
        <p className="text-muted-foreground text-sm leading-relaxed mb-8">
          Don&apos;t worry — your recent data is still available locally.
          Any transactions you add will sync automatically when you reconnect.
        </p>
        <div className="space-y-3">
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold transition-all"
          >
            <House className="w-4 h-4" weight="fill" />
            Go to Dashboard
          </Link>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full py-3 rounded-2xl border border-border/30 text-sm font-medium text-muted-foreground hover:text-foreground transition-all"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}

