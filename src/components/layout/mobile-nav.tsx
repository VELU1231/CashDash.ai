'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ChartLineUp, ArrowsLeftRight, Wallet, ChartBar, Brain,
  Receipt, PiggyBank
} from '@phosphor-icons/react';

const MOBILE_NAV = [
  { href: '/dashboard', icon: ChartLineUp, label: 'Home' },
  { href: '/dashboard/transactions', icon: ArrowsLeftRight, label: 'Tx' },
  { href: '/dashboard/ai-assistant', icon: Brain, label: 'AI', highlight: true },
  { href: '/dashboard/budgets', icon: Receipt, label: 'Budgets' },
  { href: '/dashboard/goals', icon: PiggyBank, label: 'Goals' },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden safe-area-bottom"
      style={{
        background: 'hsl(var(--card) / 0.7)',
        backdropFilter: 'blur(24px) saturate(1.8)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
        borderTop: '1px solid hsl(var(--foreground) / 0.04)',
      }}
    >
      <div className="flex items-center justify-around h-16">
        {MOBILE_NAV.map(({ href, icon: Icon, label, highlight }) => {
          const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link key={href} href={href} className="flex-1">
              <motion.div
                className={`flex flex-col items-center justify-center gap-1 h-full ${
                  isActive ? 'text-emerald-500' : 'text-muted-foreground'
                }`}
                whileTap={{ scale: 0.88 }}
                transition={{ duration: 0.15 }}
              >
                {highlight ? (
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-glow">
                    <Icon className="w-5 h-5 text-white" weight="regular" />
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Icon className="w-5 h-5" weight={isActive ? 'regular' : 'light'} />
                      {isActive && (
                        <motion.div
                          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-500"
                          layoutId="mobileIndicator"
                          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                        />
                      )}
                    </div>
                    <span className="text-[10px] font-medium">{label}</span>
                  </>
                )}
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
