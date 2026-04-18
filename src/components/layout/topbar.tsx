'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MagnifyingGlass, Plus, X, Brain, Command, Sparkle } from '@phosphor-icons/react';
import Link from 'next/link';
import type { Profile } from '@/types';

interface TopbarProps { profile: Profile | null; }

export function DashboardTopbar({ profile }: TopbarProps) {
  const [showSearch, setShowSearch] = useState(false);

  return (
    <header
      className="h-16 flex items-center px-4 sm:px-6 gap-4 shrink-0"
      style={{
        background: 'hsl(var(--card) / 0.4)',
        backdropFilter: 'blur(20px) saturate(1.5)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.5)',
        borderBottom: '1px solid hsl(var(--foreground) / 0.04)',
      }}
    >
      {/* Breadcrumb / Title - empty; child pages set their own */}
      <div className="flex-1" />

      <div className="flex items-center gap-2.5">
        {/* Search trigger */}
        <motion.button
          onClick={() => setShowSearch(true)}
          className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-sm text-muted-foreground transition-all duration-200"
          style={{
            border: '1px solid hsl(var(--foreground) / 0.06)',
            background: 'hsl(var(--foreground) / 0.02)',
          }}
          whileHover={{ scale: 1.01, borderColor: 'hsl(var(--primary) / 0.2)' }}
        >
          <MagnifyingGlass className="w-3.5 h-3.5" weight="light" />
          <span className="text-[13px]">Search...</span>
          <kbd className="ml-4 px-1.5 py-0.5 rounded-md text-[10px] font-mono text-muted-foreground/60"
            style={{
              background: 'hsl(var(--foreground) / 0.03)',
              border: '1px solid hsl(var(--foreground) / 0.06)',
            }}>
            ⌘K
          </kbd>
        </motion.button>

        {/* AI assistant quick link */}
        <Link href="/dashboard/ai-assistant">
          <motion.button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200"
            style={{
              background: 'hsl(var(--primary) / 0.08)',
              color: 'hsl(var(--primary))',
            }}
            whileHover={{ scale: 1.03, boxShadow: '0 0 16px hsl(160 84% 39% / 0.15)' }}
            whileTap={{ scale: 0.97 }}
          >
            <Sparkle className="w-3.5 h-3.5" weight="duotone" />
            <span className="hidden sm:inline text-[13px]">AI</span>
          </motion.button>
        </Link>

        {/* Add transaction */}
        <Link href="/dashboard/transactions/new">
          <motion.button
            className="btn-primary !py-1.5 !px-3.5 !rounded-xl !text-[13px]"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <Plus className="w-3.5 h-3.5" weight="bold" />
            <span className="hidden sm:inline">Add</span>
          </motion.button>
        </Link>
      </div>

      {/* Search Modal */}
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
