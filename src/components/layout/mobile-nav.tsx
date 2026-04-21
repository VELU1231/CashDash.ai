'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ChartBar, ArrowsLeftRight, Wallet, DotsThreeOutline
} from '@phosphor-icons/react';

const MOBILE_NAV = [
  { href: '/dashboard/transactions', icon: ArrowsLeftRight, label: 'Trans.' },
  { href: '/dashboard', icon: ChartBar, label: 'Stats' },
  { href: '/dashboard/accounts', icon: Wallet, label: 'Accounts' },
  { href: '/dashboard/settings', icon: DotsThreeOutline, label: 'More' },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden safe-area-bottom border-t border-border/70 bg-card/95 backdrop-blur-xl supports-[backdrop-filter]:bg-card/80 shadow-[0_-8px_24px_hsl(var(--foreground)_/_0.06)]">
      <div className="grid grid-cols-4 items-center px-2 pb-1 pt-2">
        {MOBILE_NAV.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link key={href} href={href} className="flex-1">
              <motion.div
                className={`flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-2xl transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
                whileTap={{ scale: 0.88 }}
                transition={{ duration: 0.15 }}
              >
                <div className="relative">
                  <Icon className="h-5 w-5" weight={isActive ? 'fill' : 'regular'} />
                  {isActive && (
                    <motion.div
                      className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary"
                      layoutId="mobileIndicator"
                      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                    />
                  )}
                </div>
                <span className="text-[11px] font-medium tracking-tight">{label}</span>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
