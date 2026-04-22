'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MagnifyingGlass, Plus, X, ArrowLeft } from '@phosphor-icons/react';
import Link from 'next/link';
import type { Profile } from '@/types';

interface TopbarProps { profile: Profile | null; }

const PAGE_META: Array<{ match: RegExp; title: string; subtitle: string }> = [
  { match: /^\/dashboard$/, title: 'Overview', subtitle: 'Your finance dashboard' },
  { match: /^\/dashboard\/transactions(?:\/new)?$/, title: 'Transactions', subtitle: 'Track every money movement' },
  { match: /^\/dashboard\/accounts/, title: 'Accounts', subtitle: 'Balances and wallets' },
  { match: /^\/dashboard\/budgets/, title: 'Budgets', subtitle: 'Control monthly spending' },
  { match: /^\/dashboard\/goals/, title: 'Goals', subtitle: 'Plan savings targets' },
  { match: /^\/dashboard\/bills/, title: 'Bills', subtitle: 'Manage recurring payments' },
  { match: /^\/dashboard\/categories/, title: 'Categories', subtitle: 'Structure your spending' },
  { match: /^\/dashboard\/settings/, title: 'More', subtitle: 'Preferences and configuration' },
  { match: /^\/dashboard\/analytics/, title: 'Analytics', subtitle: 'Spending patterns and trends' },
  { match: /^\/dashboard\/import-export/, title: 'Import & Export', subtitle: 'Move your data safely' },
  { match: /^\/dashboard\/ai-assistant/, title: 'AI Assistant', subtitle: 'Ask CashBash anything' },
];

export function DashboardTopbar({ profile }: TopbarProps) {
  const [showSearch, setShowSearch] = useState(false);
  const pathname = usePathname();
  const pageMeta = PAGE_META.find((item) => item.match.test(pathname)) || PAGE_META[0];
  const isRoot = pathname === '/dashboard';
  const firstName = profile?.display_name?.trim()?.split(' ')[0] || 'there';

  return (
    <header
      className="safe-area-top sticky top-0 z-30 shrink-0 border-b border-border/60 bg-background/92 backdrop-blur-xl"
    >
      <div className="mx-auto flex h-14 w-full items-center gap-3 px-3 sm:px-5 md:px-6 md:max-w-6xl md:h-16">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {!isRoot && (
            <Link
              href="/dashboard"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:text-foreground md:hidden"
            >
              <ArrowLeft className="h-5 w-5" weight="regular" />
            </Link>
          )}

          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground md:hidden">
              Hello, {firstName}
            </p>
            <div className="flex items-baseline gap-2">
              <h1 className="truncate text-base font-semibold text-foreground md:text-xl">{pageMeta.title}</h1>
              <p className="hidden text-sm text-muted-foreground md:block">{pageMeta.subtitle}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            onClick={() => setShowSearch(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-all duration-200 hover:text-foreground"
            whileTap={{ scale: 0.94 }}
          >
            <MagnifyingGlass className="h-[18px] w-[18px]" weight="regular" />
          </motion.button>

          <button
            onClick={() => setShowSearch(true)}
            className="hidden items-center gap-2 rounded-xl border border-border/60 bg-card/60 px-3 py-1.5 text-sm text-muted-foreground transition-all duration-200 hover:border-primary/30 hover:text-foreground md:flex"
          >
            <MagnifyingGlass className="h-3.5 w-3.5" weight="light" />
            <span className="text-[13px]">Search</span>
          </button>

          <Link href="/dashboard/transactions/new">
            <motion.div
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm md:h-9 md:w-auto md:gap-1.5 md:px-3"
              whileTap={{ scale: 0.95 }}
            >
              <Plus className="h-4 w-4" weight="bold" />
              <span className="hidden text-sm font-medium md:inline">Add</span>
            </motion.div>
          </Link>
        </div>
      </div>

      <AnimatePresence>
        {showSearch && (
          <motion.div
            className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4"
            style={{
              background: 'hsl(var(--background) / 0.75)',
              backdropFilter: 'blur(12px)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSearch(false)}
          >
            <motion.div
              className="w-full max-w-lg float-panel overflow-hidden"
              initial={{ opacity: 0, y: -20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.96 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: '1px solid hsl(var(--foreground) / 0.04)' }}>
                <MagnifyingGlass className="w-4 h-4 text-muted-foreground" weight="light" />
                <input
                  autoFocus
                  className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground/60"
                  placeholder="Search transactions, accounts, categories..."
                />
                <button onClick={() => setShowSearch(false)}>
                  <X className="w-4 h-4 text-muted-foreground" weight="light" />
                </button>
              </div>
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Or use the <span className="text-emerald-500 font-medium">AI Assistant</span> to search with natural language
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
