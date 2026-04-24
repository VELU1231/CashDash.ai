'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiSlash, ArrowsClockwise, CheckCircle } from '@phosphor-icons/react';
import { syncPendingTransactions, getPendingTransactions } from '@/lib/offline-store';

type SyncState = 'online' | 'offline' | 'syncing' | 'synced';

export function OfflineBadge() {
  const [state, setState] = useState<SyncState>('online');
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateStatus = () => {
      setState(navigator.onLine ? 'online' : 'offline');
    };

    const checkPending = async () => {
      const pending = await getPendingTransactions();
      setPendingCount(pending.length);
    };

    const handleOnline = async () => {
      const pending = await getPendingTransactions();
      if (pending.length > 0) {
        setState('syncing');
        const result = await syncPendingTransactions();
        if (result.synced > 0) {
          setState('synced');
          setTimeout(() => setState('online'), 3000);
        } else {
          setState('online');
        }
      } else {
        setState('online');
      }
    };

    updateStatus();
    checkPending();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', updateStatus);

    // Check pending every 10 seconds
    const interval = setInterval(checkPending, 10000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', updateStatus);
      clearInterval(interval);
    };
  }, []);

  if (state === 'online') return null;

  const config = {
    offline: {
      icon: WifiSlash,
      text: pendingCount > 0
        ? `Offline · ${pendingCount} pending`
        : 'Offline · changes saved locally',
      bg: 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400',
    },
    syncing: {
      icon: ArrowsClockwise,
      text: 'Syncing...',
      bg: 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400',
    },
    synced: {
      icon: CheckCircle,
      text: 'All synced ✓',
      bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    },
  } as const;

  const current = config[state as keyof typeof config];
  if (!current) return null;

  const Icon = current.icon;

  return (
    <AnimatePresence>
      <motion.div
        className={`fixed top-3 left-1/2 -translate-x-1/2 z-[70] px-4 py-2 rounded-2xl border text-xs font-medium flex items-center gap-2 shadow-lg backdrop-blur-sm ${current.bg}`}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        <Icon
          className={`w-3.5 h-3.5 ${state === 'syncing' ? 'animate-spin' : ''}`}
          weight={state === 'synced' ? 'fill' : 'regular'}
        />
        {current.text}
      </motion.div>
    </AnimatePresence>
  );
}
