// ────────────────────────────────────────────────────────────────────────────────
// CashDash.ai - Workflows (Vercel Workflow SDK)
// Durable background tasks: recurring transactions, weekly summaries, onboarding
// ────────────────────────────────────────────────────────────────────────────────

import { sleep } from 'workflow';

// ─── User Onboarding Workflow ─────────────────────────────────────────────────
// Triggered when a new user signs up. Creates default accounts/categories,
// then sends onboarding prompts after delays.

export async function handleNewUserOnboarding(userId: string, email: string) {
  'use workflow';

  // Step 1: Create default account and categories
  const setupResult = await createDefaultSetup(userId);

  // Step 2: Wait 30 seconds, then prompt the user to try the AI assistant
  await sleep('30s');
  await sendOnboardingPrompt(userId, 'welcome');

  // Step 3: Wait 1 day, then send a follow-up tip
  await sleep('1d');
  await sendOnboardingPrompt(userId, 'ai-tip');

  // Step 4: Wait 3 more days, then prompt for budget setup
  await sleep('3d');
  await sendOnboardingPrompt(userId, 'budget-setup');

  return { userId, status: 'onboarded', ...setupResult };
}

async function createDefaultSetup(userId: string) {
  'use step';

  // This step would normally call Supabase to create defaults.
  // The handle_new_user trigger in schema.sql already does most of this,
  // but this workflow can do extended setup (e.g., pre-populate templates).
  console.log(`[Workflow] Setting up defaults for user: ${userId}`);

  return { defaultAccountCreated: true, categoriesCreated: true };
}

async function sendOnboardingPrompt(userId: string, promptType: string) {
  'use step';

  // In production, this would create an in-app notification or send an email
  console.log(`[Workflow] Sending ${promptType} prompt to user: ${userId}`);

  // Could insert into a notifications table:
  // await supabase.from('notifications').insert({ user_id: userId, type: promptType, ... })

  return { sent: true, type: promptType };
}

// ─── Weekly Spending Summary Workflow ─────────────────────────────────────────
// Generates a weekly spending summary for a user.

export async function generateWeeklySummary(userId: string) {
  'use workflow';

  const summary = await computeWeeklyStats(userId);
  await deliverSummary(userId, summary);

  return { userId, summary };
}

async function computeWeeklyStats(userId: string) {
  'use step';

  console.log(`[Workflow] Computing weekly stats for user: ${userId}`);

  // In production: query Supabase for last 7 days of transactions,
  // calculate totals, top categories, savings rate, etc.
  return {
    totalSpent: 0,
    totalEarned: 0,
    topCategory: 'Unknown',
    transactionCount: 0,
    period: 'This Week',
  };
}

async function deliverSummary(userId: string, summary: any) {
  'use step';

  console.log(`[Workflow] Delivering summary to user: ${userId}`, summary);

  // In production: send email, push notification, or create in-app notification
  return { delivered: true };
}

// ─── Recurring Transaction Workflow ───────────────────────────────────────────
// Processes a single recurring transaction (e.g., monthly subscription).

export async function processRecurringTransaction(
  templateId: string,
  userId: string,
  intervalDays: number
) {
  'use workflow';

  // Create the transaction from the template
  const result = await createFromTemplate(templateId, userId);

  // Schedule the next occurrence
  await sleep(`${intervalDays}d`);

  // Re-trigger itself for the next cycle
  // In production, you'd call `start(processRecurringTransaction, [templateId, userId, intervalDays])`
  console.log(`[Workflow] Next recurrence for template ${templateId} scheduled in ${intervalDays} days`);

  return result;
}

async function createFromTemplate(templateId: string, userId: string) {
  'use step';

  console.log(`[Workflow] Creating transaction from template: ${templateId} for user: ${userId}`);

  // In production: read template from DB, create transaction, update balance
  return { templateId, created: true, transactionId: crypto.randomUUID() };
}
