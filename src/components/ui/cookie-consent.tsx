'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem('cookie-consent', 'declined');
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed bottom-4 left-4 right-4 z-[100] mx-auto max-w-lg"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        >
          <div
            className="rounded-3xl p-5 shadow-2xl"
            style={{
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border) / 0.3)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              We use essential cookies for authentication and preferences. No tracking or advertising cookies.{' '}
              <Link href="/privacy" className="text-primary underline hover:no-underline">Learn more</Link>
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={decline}
                className="flex-1 py-2.5 rounded-2xl text-sm font-medium border border-border/30 text-muted-foreground hover:bg-foreground/[0.03] transition-all"
              >
                Decline
              </button>
              <button
                type="button"
                onClick={accept}
                className="flex-1 py-2.5 rounded-2xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
              >
                Accept
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
