'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, ArrowLeftRight, Wallet, BarChart3, Brain
} from 'lucide-react';

const MOBILE_NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { href: '/dashboard/transactions', icon: ArrowLeftRight, label: 'Tx' },
  { href: '/dashboard/ai-assistant', icon: Brain, label: 'AI', highlight: true },
  { href: '/dashboard/accounts', icon: Wallet, label: 'Accounts' },
  { href: '/dashboard/analytics', icon: BarChart3, label: 'Charts' },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden border-t border-border bg-card/90 backdrop-blur-md safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {MOBILE_NAV.map(({ href, icon: Icon, label, highlight }) => {
          const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link key={href} href={href} className="flex-1">
              <motion.div
                className={`flex flex-col items-center justify-center gap-1 h-full ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
                whileTap={{ scale: 0.9 }}
              >
                {highlight ? (
                  <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-glow">
                    <Icon className="w-5 h-5 text-primary-foreground" />
                  </div>
                ) : (
                  <>
                    <Icon className="w-5 h-5" />
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
