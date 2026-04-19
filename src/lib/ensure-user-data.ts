import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Ensures a user has a profile, default account, and default categories.
 * This handles the case where:
 *   - A user existed in auth.users before the schema was created
 *   - The schema was reset (DROP + CREATE) while the user was still logged in
 *   - The signup trigger failed for any reason
 *
 * Returns the profile row or null if creation failed.
 */
export async function ensureUserData(supabase: SupabaseClient, user: { id: string; email?: string; user_metadata?: Record<string, any> }) {
  // 1. Check if profile exists
  const { data: existing } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (existing) return existing;

  // 2. Profile doesn't exist — create it
  const displayName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    'User';

  const { data: newProfile, error: profileErr } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      display_name: displayName,
      avatar_url: user.user_metadata?.avatar_url || null,
      default_currency: 'PHP',
      theme: 'system',
    })
    .select()
    .single();

  if (profileErr) {
    // Could be a race condition — another request created it first
    if (profileErr.code === '23505') {
      // Unique violation = profile was created by another concurrent request
      const { data: retried } = await supabase
        .from('profiles').select('*').eq('id', user.id).maybeSingle();
      return retried;
    }
    console.error('[ensureUserData] Failed to create profile:', profileErr.message);
    return null;
  }

  // 3. Create default account
  await supabase.from('accounts').insert({
    user_id: user.id,
    name: 'Cash',
    type: 'cash',
    currency: 'PHP',
    balance: 0,
    initial_balance: 0,
    icon: '💵',
    color: '#10b981',
    display_order: 0,
  });

  // 4. Create default categories
  const defaultCategories = [
    { name: 'Food & Drinks', type: 'expense', icon: '🍔', color: '#f59e0b', display_order: 1 },
    { name: 'Transportation', type: 'expense', icon: '🚌', color: '#3b82f6', display_order: 2 },
    { name: 'Shopping', type: 'expense', icon: '🛍️', color: '#ec4899', display_order: 3 },
    { name: 'Entertainment', type: 'expense', icon: '🎬', color: '#8b5cf6', display_order: 4 },
    { name: 'Health', type: 'expense', icon: '💊', color: '#ef4444', display_order: 5 },
    { name: 'Housing', type: 'expense', icon: '🏠', color: '#06b6d4', display_order: 6 },
    { name: 'Utilities', type: 'expense', icon: '⚡', color: '#f97316', display_order: 7 },
    { name: 'Other', type: 'expense', icon: '📦', color: '#94a3b8', display_order: 8 },
    { name: 'Salary', type: 'income', icon: '💼', color: '#10b981', display_order: 1 },
    { name: 'Freelance', type: 'income', icon: '💻', color: '#3b82f6', display_order: 2 },
    { name: 'Other Income', type: 'income', icon: '💰', color: '#84cc16', display_order: 3 },
  ];

  await supabase.from('categories').insert(
    defaultCategories.map(c => ({ user_id: user.id, ...c }))
  );

  return newProfile;
}

/**
 * Ensures the user has at least one account. Returns the default account.
 * Call AFTER ensureUserData().
 */
export async function ensureDefaultAccount(supabase: SupabaseClient, userId: string) {
  const { data: account } = await supabase
    .from('accounts')
    .select('id, currency')
    .eq('user_id', userId)
    .eq('is_hidden', false)
    .order('display_order')
    .limit(1)
    .maybeSingle();

  if (account) return account;

  // Create one
  const { data: newAccount } = await supabase
    .from('accounts')
    .insert({
      user_id: userId,
      name: 'Cash',
      type: 'cash',
      currency: 'PHP',
      balance: 0,
      initial_balance: 0,
      icon: '💵',
      color: '#10b981',
      display_order: 0,
    })
    .select('id, currency')
    .single();

  return newAccount;
}
