'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  House, ArrowsLeftRight, ChartPieSlice, Wallet, DotsThreeOutline, Plus
} from '@phosphor-icons/react';

const MOBILE_NAV = [
  { href: '/dashboard', icon: House, label: 'Home', exact: true },
  { href: '/dashboard/transactions', icon: ArrowsLeftRight, label: 'Trans.' },
  { href: '/dashboard/analytics', icon: ChartPieSlice, label: 'Stats' },
  { href: '/dashboard/accounts', icon: Wallet, label: 'Accounts' },
  { href: '/dashboard/settings', icon: DotsThreeOutline, label: 'More' },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <>
      {/* FAB — Floating Add Button */}
      <Link href="/dashboard/transactions/new" className="fab-button md:hidden" aria-label="Add transaction">
        <Plus weight="bold" className="w-6 h-6" />
      </Link>

      <nav className="md:hidden safe-area-bottom border-t border-border/40 bg-card/98 backdrop-blur-xl">
        <div className="grid grid-cols-5 items-center">
          {MOBILE_NAV.map(({ href, icon: Icon, label, exact }) => {
            const isActive = exact
              ? pathname === href
              : pathname.startsWith(href);
            return (
              <Link key={href} href={href} className="flex-1">
                <motion.div
                  className={`flex flex-col items-center justify-center gap-0.5 py-2 transition-colors ${
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  }`}
                  whileTap={{ scale: 0.9 }}
                  transition={{ duration: 0.12 }}
                >
                  <Icon className="h-[22px] w-[22px]" weight={isActive ? 'fill' : 'regular'} />
                  <span className="text-[10px] font-medium">{label}</span>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
