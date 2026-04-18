'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import {
  ChartLineUp, ArrowsLeftRight, Wallet, Tag, FolderOpen,
  ChartBar, GearSix, Brain, DownloadSimple, CaretLeft,
  CaretRight, TrendUp, SignOut, BookmarkSimple,
  Sun, Moon, Monitor, Sparkle
} from '@phosphor-icons/react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import type { Profile } from '@/types';

const NAV_ITEMS = [
  { href: '/dashboard', icon: ChartLineUp, label: 'Dashboard' },
  { href: '/dashboard/transactions', icon: ArrowsLeftRight, label: 'Transactions' },
  { href: '/dashboard/accounts', icon: Wallet, label: 'Accounts' },
  { href: '/dashboard/categories', icon: FolderOpen, label: 'Categories' },
  { href: '/dashboard/tags', icon: Tag, label: 'Tags' },
  { href: '/dashboard/analytics', icon: ChartBar, label: 'Analytics' },
  { href: '/dashboard/templates', icon: BookmarkSimple, label: 'Templates' },
  { href: '/dashboard/ai-assistant', icon: Brain, label: 'AI Assistant', badge: 'AI' },
  { href: '/dashboard/import-export', icon: DownloadSimple, label: 'Import / Export' },
];

export function DashboardSidebar({ profile }: { profile: Profile | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const { theme, setTheme } = useTheme();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success('Signed out successfully');
    router.push('/login');
  };

  const themeOptions = [
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'dark', icon: Moon, label: 'Dark' },
    { value: 'system', icon: Monitor, label: 'System' },
  ];

  return (
    <motion.aside
      animate={{ width: collapsed ? 68 : 256 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="relative flex flex-col h-full glass-panel z-10 overflow-hidden border-r-0"
      style={{
        borderRight: '1px solid hsl(var(--foreground) / 0.05)',
      }}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 shrink-0" style={{ borderBottom: '1px solid hsl(var(--foreground) / 0.04)' }}>
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex items-center gap-2.5"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shrink-0 shadow-glow">
                <TrendUp className="w-4 h-4 text-white" weight="bold" />
              </div>
              <span className="font-serif font-bold text-base leading-none tracking-tight">
                Cash<span className="text-emerald-500">Dash</span><span className="text-muted-foreground text-xs font-sans font-normal">.ai</span>
              </span>
            </motion.div>
          )}
        </AnimatePresence>
        {collapsed && (
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mx-auto shadow-glow">
            <TrendUp className="w-4 h-4 text-white" weight="bold" />
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-foreground/5 transition-colors text-muted-foreground hover:text-foreground shrink-0"
        >
          {collapsed
            ? <CaretRight className="w-4 h-4" weight="light" />
            : <CaretLeft className="w-4 h-4" weight="light" />
          }
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2.5 py-4 space-y-0.5 overflow-y-auto scrollbar-thin">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                className={`sidebar-item ${isActive ? 'active' : ''} justify-between group`}
                whileHover={{ x: collapsed ? 0 : 3 }}
                transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon 
                    className="w-[18px] h-[18px] shrink-0" 
                    weight={isActive ? 'regular' : 'light'}
                  />
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="truncate text-[13px]"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
                {item.badge && !collapsed && (
                  <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 text-[10px] font-semibold tracking-wide">
                    {item.badge}
                  </span>
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-2.5 py-3 space-y-1.5 shrink-0" style={{ borderTop: '1px solid hsl(var(--foreground) / 0.04)' }}>
        {/* Theme toggle */}
        {!collapsed && (
          <div className="flex items-center gap-1 p-1 rounded-xl bg-foreground/[0.03]">
            {themeOptions.map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                title={label}
                className={`flex-1 flex items-center justify-center p-1.5 rounded-lg transition-all duration-200 text-xs ${
                  theme === value
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-3.5 h-3.5" weight="light" />
              </button>
            ))}
          </div>
        )}

        <Link href="/dashboard/settings">
          <div className={`sidebar-item ${pathname.startsWith('/dashboard/settings') ? 'active' : ''}`}>
            <GearSix className="w-[18px] h-[18px] shrink-0" weight="light" />
            {!collapsed && <span className="text-[13px]">Settings</span>}
          </div>
        </Link>

        <button onClick={handleSignOut} className="sidebar-item w-full text-left">
          <SignOut className="w-[18px] h-[18px] shrink-0" weight="light" />
          {!collapsed && <span className="text-[13px]">Sign out</span>}
        </button>

        {/* Profile */}
        {!collapsed && (
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-foreground/[0.03] mt-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {profile?.display_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium truncate">
                {profile?.display_name || 'User'}
              </div>
              <div className="text-[10px] text-muted-foreground font-mono">
                {profile?.default_currency || 'USD'}
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.aside>
  );
}
