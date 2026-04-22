// ────────────────────────────────────────────────────────────────────────────────
// CashBash.ai Feature Flags (Vercel Flags SDK)
// Evaluate server-side, zero client-side spinners, easy to override via Vercel Toolbar
// ────────────────────────────────────────────────────────────────────────────────

import { flag } from 'flags/next';

// ─── AI Features ──────────────────────────────────────────────────────────────

/** Enable the AI-powered transaction parsing assistant */
export const aiAssistantFlag = flag({
  key: 'ai-assistant',
  defaultValue: true,
  description: 'Enable AI-powered natural language transaction entry',
  decide() {
    // On by default. Can be toggled off from Vercel Toolbar or env var.
    return process.env.FEATURE_AI_ASSISTANT !== 'false';
  },
});

/** Enable AI spending insights on the dashboard */
export const aiInsightsFlag = flag({
  key: 'ai-insights',
  defaultValue: true,
  description: 'Show AI-generated spending insights on the dashboard',
  decide() {
    return process.env.FEATURE_AI_INSIGHTS !== 'false';
  },
});

// ─── Dashboard & Analytics ────────────────────────────────────────────────────

/** Show the daily spending bar chart on the dashboard */
export const dailyChartFlag = flag({
  key: 'daily-spending-chart',
  defaultValue: true,
  description: 'Show daily spending bar chart on dashboard',
  decide() {
    return process.env.FEATURE_DAILY_CHART !== 'false';
  },
});

/** Enable CSV export from settings */
export const csvExportFlag = flag({
  key: 'csv-export',
  defaultValue: true,
  description: 'Allow users to export their data as CSV',
  decide() {
    return process.env.FEATURE_CSV_EXPORT !== 'false';
  },
});

// ─── Experimental ─────────────────────────────────────────────────────────────

/** Enable multi-currency support (experimental) */
export const multiCurrencyFlag = flag({
  key: 'multi-currency',
  defaultValue: false,
  description: 'Enable multi-currency accounts and exchange rate conversion',
  decide() {
    return process.env.FEATURE_MULTI_CURRENCY === 'true';
  },
});

/** Enable budget alerts (experimental) */
export const budgetAlertsFlag = flag({
  key: 'budget-alerts',
  defaultValue: false,
  description: 'Enable real-time budget overspend alerts',
  decide() {
    return process.env.FEATURE_BUDGET_ALERTS === 'true';
  },
});
