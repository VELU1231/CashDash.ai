/* ─── Self-Hosted Ad / Promo Configuration ─── */

export type PromoVariant = 'upgrade' | 'feature' | 'partner';

export interface PromoItem {
  id: string;
  variant: PromoVariant;
  title: string;
  description: string;
  cta: string;
  ctaLink: string;
  emoji?: string;
  gradient?: string;
}

/* Promos rotate daily based on the day number */
export const PROMO_ITEMS: PromoItem[] = [
  // ─── Upgrade Promos ───
  {
    id: 'upgrade-ai',
    variant: 'upgrade',
    title: 'Unlock AI Insights',
    description: 'Get personalized financial advice powered by AI. Upgrade to Pro for unlimited smart suggestions.',
    cta: 'Go Pro',
    ctaLink: '/pricing',
    emoji: '🧠',
    gradient: 'from-violet-500/10 to-blue-500/10',
  },
  {
    id: 'upgrade-receipt',
    variant: 'upgrade',
    title: 'Scan receipts in seconds',
    description: 'Point your camera at any receipt — AI reads it instantly. Available on Pro plan.',
    cta: 'Upgrade Now',
    ctaLink: '/pricing',
    emoji: '📸',
    gradient: 'from-emerald-500/10 to-teal-500/10',
  },
  {
    id: 'upgrade-multi-currency',
    variant: 'upgrade',
    title: 'Multi-Currency + Live Rates',
    description: 'Track finances across countries with real-time exchange rates. Pro users love it.',
    cta: 'Try Pro Free',
    ctaLink: '/pricing',
    emoji: '💱',
    gradient: 'from-amber-500/10 to-orange-500/10',
  },

  // ─── Feature Discovery Promos ───
  {
    id: 'feature-templates',
    variant: 'feature',
    title: 'Save time with Templates',
    description: 'Create templates for recurring expenses — rent, subscriptions, groceries. One tap to log.',
    cta: 'Try Templates',
    ctaLink: '/dashboard/templates',
    emoji: '📋',
    gradient: 'from-sky-500/10 to-indigo-500/10',
  },
  {
    id: 'feature-budgets',
    variant: 'feature',
    title: 'Set a monthly budget',
    description: 'Track spending limits by category. Get alerts before you overspend.',
    cta: 'Set Budget',
    ctaLink: '/dashboard/budgets',
    emoji: '🎯',
    gradient: 'from-pink-500/10 to-rose-500/10',
  },
  {
    id: 'feature-goals',
    variant: 'feature',
    title: 'Financial Goals',
    description: 'Save for vacation, emergency fund, or that new gadget. Track progress visually.',
    cta: 'Start a Goal',
    ctaLink: '/dashboard/goals',
    emoji: '🏆',
    gradient: 'from-yellow-500/10 to-amber-500/10',
  },
  {
    id: 'feature-export',
    variant: 'feature',
    title: 'Export your data',
    description: 'Download your transactions as CSV for tax prep or personal records. Your data, your control.',
    cta: 'Export Now',
    ctaLink: '/dashboard/import-export',
    emoji: '📊',
    gradient: 'from-cyan-500/10 to-blue-500/10',
  },
  {
    id: 'feature-tags',
    variant: 'feature',
    title: 'Organize with Tags',
    description: 'Add custom tags to transactions — #vacation, #business, #reimbursable. Filter smartly.',
    cta: 'Manage Tags',
    ctaLink: '/dashboard/tags',
    emoji: '🏷️',
    gradient: 'from-fuchsia-500/10 to-purple-500/10',
  },
];

/* ─── Which promo to show based on page + day rotation ─── */
export function getPromoForPage(page: string): PromoItem {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);

  // Page-specific variant preferences
  const variantMap: Record<string, PromoVariant[]> = {
    dashboard: ['upgrade', 'feature'],
    transactions: ['feature', 'upgrade'],
    analytics: ['upgrade'],
    categories: ['feature'],
    settings: ['upgrade'],
    budgets: ['feature'],
    goals: ['feature'],
    tags: ['feature'],
    templates: ['upgrade'],
  };

  const preferredVariants = variantMap[page] || ['upgrade', 'feature'];
  const candidates = PROMO_ITEMS.filter(p => preferredVariants.includes(p.variant));

  // Rotate through candidates based on day
  return candidates[dayOfYear % candidates.length];
}

/* ─── Should show promo for this user tier? ─── */
export function shouldShowPromo(tier?: string): boolean {
  if (!tier || tier === 'free') return true;
  return false; // Pro, Family, Business = no promos
}
