'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MagnifyingGlass, Plus, X, Sparkle, ArrowLeft } from '@phosphor-icons/react';
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
  { match: /^\/dashboard\/ai-assistant/, title: 'AI Assistant', subtitle: 'Ask CashDash anything' },
];

export function DashboardTopbar({ profile }: TopbarProps) {
  const [showSearch, setShowSearch] = useState(false);
  const pathname = usePathname();
  const pageMeta = PAGE_META.find((item) => item.match.test(pathname)) || PAGE_META[0];
  const isRoot = pathname === '/dashboard';
  const firstName = profile?.display_name?.trim()?.split(' ')[0] || 'there';

  return (
    <header
      className="safe-area-top sticky top-0 z-30 shrink-0 border-b border-border/70 bg-background/92 backdrop-blur-xl"
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {!isRoot && (
            <Link
              href="/dashboard"
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-card/80 text-muted-foreground transition-colors hover:text-foreground md:hidden"
            >
              <ArrowLeft className="h-5 w-5" weight="regular" />
            </Link>
          )}

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground md:hidden">
              Hello, {firstName}
            </p>
            <div className="flex items-baseline gap-2">
              <h1 className="truncate text-lg font-semibold text-foreground md:text-2xl">{pageMeta.title}</h1>
              <p className="hidden text-sm text-muted-foreground md:block">{pageMeta.subtitle}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <motion.button
            onClick={() => setShowSearch(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-card/80 text-muted-foreground transition-all duration-200 hover:text-foreground md:hidden"
            whileTap={{ scale: 0.94 }}
          >
            <MagnifyingGlass className="h-4 w-4" weight="regular" />
          </motion.button>

          <motion.button
            onClick={() => setShowSearch(true)}
            className="hidden items-center gap-2 rounded-2xl border border-border/70 bg-card/70 px-3.5 py-2 text-sm text-muted-foreground transition-all duration-200 hover:border-primary/30 hover:text-foreground md:flex"
            whileHover={{ scale: 1.01 }}
          >
            <MagnifyingGlass className="h-3.5 w-3.5" weight="light" />
            <span className="text-[13px]">Search</span>
          </motion.button>

          <Link href="/dashboard/ai-assistant" className="hidden md:block">
            <motion.button
              className="inline-flex items-center gap-1.5 rounded-2xl bg-primary/10 px-3 py-2 text-sm font-medium text-primary"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Sparkle className="h-3.5 w-3.5" weight="duotone" />
              AI
            </motion.button>
          </Link>

          <Link href="/dashboard/transactions/new">
            <motion.button
              className="btn-primary !h-10 !rounded-2xl !px-3.5 !py-0"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Plus className="h-4 w-4" weight="bold" />
              <span className="hidden md:inline">Add</span>
            </motion.button>
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
