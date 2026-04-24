'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight } from '@phosphor-icons/react';
import { getPromoForPage, shouldShowPromo } from '@/lib/ad-config';

interface PromoCardProps {
  page: string;
  tier?: string;
}

export function PromoCard({ page, tier }: PromoCardProps) {
  const [dismissed, setDismissed] = useState(false);

  const promo = useMemo(() => getPromoForPage(page), [page]);
  const show = useMemo(() => shouldShowPromo(tier), [tier]);

  if (!show || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        className={`relative rounded-3xl border border-border/20 overflow-hidden bg-gradient-to-br ${promo.gradient || 'from-primary/5 to-primary/10'}`}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.4 }}
      >
        <div className="px-5 py-4 flex items-center gap-4">
          {/* Emoji Icon */}
          <div className="text-3xl flex-shrink-0">{promo.emoji}</div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-foreground mb-0.5">{promo.title}</h4>
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{promo.description}</p>
          </div>

          {/* CTA */}
          <Link
            href={promo.ctaLink}
            className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-all"
          >
            {promo.cta}
            <ArrowRight className="w-3 h-3" weight="bold" />
          </Link>

          {/* Dismiss */}
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss promotion"
            className="flex-shrink-0 p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors"
          >
            <X className="w-3.5 h-3.5" weight="bold" />
          </button>
        </div>

        {/* Subtle "Ad" label */}
        <div className="absolute bottom-1 right-3 text-[9px] text-muted-foreground/40 font-mono tracking-wider">
          PROMO
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
