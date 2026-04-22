'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowsLeftRight, ChartPieSlice, Wallet, DotsThreeOutline
} from '@phosphor-icons/react';

const MOBILE_NAV = [
  { href: '/dashboard/transactions', icon: ArrowsLeftRight, label: 'Trans.' },
  { href: '/dashboard/analytics', icon: ChartPieSlice, label: 'Stats' },
  { href: '/dashboard/accounts', icon: Wallet, label: 'Accounts' },
  { href: '/dashboard/settings', icon: DotsThreeOutline, label: 'More' },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden safe-area-bottom border-t border-border/60 bg-card/95 backdrop-blur-xl supports-[backdrop-filter]:bg-card/85">
      <div className="grid grid-cols-4 items-center px-1">
        {MOBILE_NAV.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href ||
            (href !== '/dashboard' && pathname.startsWith(href)) ||
            (href === '/dashboard/analytics' && pathname === '/dashboard');
          return (
            <Link key={href} href={href} className="flex-1">
              <motion.div
                className={`flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors ${
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
  );
}
