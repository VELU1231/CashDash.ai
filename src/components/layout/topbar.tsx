'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Search, Plus, Command, X, Brain } from 'lucide-react';
import Link from 'next/link';
import type { Profile } from '@/types';

interface TopbarProps { profile: Profile | null; }

export function DashboardTopbar({ profile }: TopbarProps) {
  const [showSearch, setShowSearch] = useState(false);

  return (
    <header className="h-16 border-b border-border bg-card/80 backdrop-blur-sm flex items-center px-4 sm:px-6 gap-4 shrink-0">
      {/* Breadcrumb / Title - empty; child pages set their own */}
      <div className="flex-1" />

      <div className="flex items-center gap-2">
        {/* Search trigger */}
        <motion.button
          onClick={() => setShowSearch(true)}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-input bg-muted/30 text-sm text-muted-foreground hover:bg-muted transition-colors"
          whileHover={{ scale: 1.01 }}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Search...</span>
          <kbd className="ml-4 px-1.5 py-0.5 rounded text-[10px] bg-background border border-border font-mono">
            ⌘K
          </kbd>
        </motion.button>

        {/* AI assistant quick link */}
        <Link href="/dashboard/ai-assistant">
          <motion.button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Brain className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">AI</span>
          </motion.button>
        </Link>

        {/* Add transaction */}
        <Link href="/dashboard/transactions/new">
          <motion.button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all hover:shadow-glow"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add</span>
          </motion.button>
        </Link>
      </div>

      {/* Search Modal */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-start justify-center pt-20 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSearch(false)}
          >
            <motion.div
              className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-xl overflow-hidden"
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                <Search className="w-4 h-4 text-muted-foreground" />
                <input
                  autoFocus
                  className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground"
                  placeholder="Search transactions, accounts, categories..."
                />
                <button onClick={() => setShowSearch(false)}>
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <div className="px-4 py-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Or use the <span className="text-primary font-medium">AI Assistant</span> to search with natural language
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
