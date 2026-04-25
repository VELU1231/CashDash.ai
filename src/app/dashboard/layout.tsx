export const runtime = 'edge';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DashboardSidebar } from '@/components/layout/sidebar';
import { DashboardTopbar } from '@/components/layout/topbar';
import { MobileNav } from '@/components/layout/mobile-nav';
import { LockScreen } from '@/components/ui/lock-screen';
import { OfflineBadge } from '@/components/ui/offline-badge';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  return (
    <LockScreen>
      <div className="flex h-dvh bg-background overflow-hidden">
        <div className="hidden md:flex flex-col h-full">
          <DashboardSidebar profile={profile} />
        </div>

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <DashboardTopbar profile={profile} />
          <OfflineBadge />
          <main className="flex-1 overflow-y-auto scrollbar-thin relative mobile-app-surface">
            <div className="mx-auto w-full md:max-w-6xl pb-24 md:pb-0">
              <div className="px-3 py-3 sm:px-5 md:px-6 md:py-6">
                {children}
              </div>
            </div>
          </main>

          <MobileNav />
        </div>
      </div>
    </LockScreen>
  );
}
