# CashDash.ai — Setup Guide

## What You Need Before Starting

| Item | Where to get it |
|------|----------------|
| **Supabase account** | [supabase.com](https://supabase.com) (free) |
| **Vercel account** | [vercel.com](https://vercel.com) (free) |
| **Ollama account** | [ollama.com](https://ollama.com) (free — for AI features) |
| **GitHub repo** | Your repo: `Book-wallet` |

---

## Step 1: Set Up Supabase Database

1. Go to **[supabase.com/dashboard](https://supabase.com/dashboard)**
2. Click your project (or create one if you don't have one)
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. Open the file `supabase_schema.sql` from your repo
6. **Copy the ENTIRE file** and paste it into the SQL Editor
7. Click **Run** (the play button)
8. You should see "Success. No rows returned" — that means it worked

### What this creates:

- ✅ All database tables (profiles, accounts, categories, transactions, etc.)
- ✅ Security policies so users can only see their own data
- ✅ Auto-setup for new users: when someone signs up, they automatically get:
  - A profile with **pro** subscription (for testing)
  - A default "Cash" account
  - 19 default categories (Food, Transport, Shopping, Salary, etc.)

### About Subscription Tiers

The app has **3 tiers** (+ business as contact-us):

| Tier | What it means |
|------|--------------|
| `free` | Basic features (default for new signups) |
| `pro` | All features including AI insights, chat history |
| `family` | Multi-user, everything included |
| Business | Contact us (not a database tier) |

**Your account (`velu2k03@gmail.com`) is set to `family`** so you can test everything.

To upgrade your account after running the SQL, run this in SQL Editor:

```sql
UPDATE profiles SET subscription_tier = 'family'
WHERE id = (SELECT id FROM auth.users WHERE email = 'velu2k03@gmail.com');
```

---

## Step 2: Get Your Supabase Keys

1. In Supabase Dashboard, click **Project Settings** (gear icon, bottom-left)
2. Click **API** in the left menu
3. You'll see:

| Key | Where it is | What to copy |
|-----|------------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | "Project URL" section | The URL like `https://abcdefgh.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | "Project API keys" → `anon` `public` | The long key starting with `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | "Project API keys" → `service_role` `secret` | The other long key (keep this SECRET) |

---

## Step 3: Enable Supabase Auth

1. In Supabase Dashboard, click **Authentication** in the left sidebar
2. Click **Providers**
3. Make sure **Email** is enabled (it should be by default)
4. (Optional) Enable **Google** or **GitHub** login if you want social login

---

## Step 4: Get Your Ollama API Key (for AI features)

> **Note:** AI is optional. The app works perfectly without it. Skip this step if you don't want AI.

1. Go to [ollama.com](https://ollama.com) and sign in (or create account)
2. Go to [ollama.com/settings/keys](https://ollama.com/settings/keys)
3. Click **Create new key**
4. Copy the key — this is your `OLLAMA_API_KEY`

---

## Step 5: Add Environment Variables to Vercel

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click your project
3. Click **Settings** tab at the top
4. Click **Environment Variables** in the left menu
5. Add these variables ONE BY ONE:

| Name | Value | Environment |
|------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project-id.supabase.co` | All |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your anon key from Step 2 | All |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service role key from Step 2 | All |
| `AI_PROVIDER` | `ollama` | All |
| `AI_BASE_URL` | `https://ollama.com/api` | All |
| `AI_MODEL` | `gemma4:31b-cloud` | All |
| `OLLAMA_API_KEY` | Your key from Step 4 | All |

For each one:
- Type the **Name** in the "Key" field
- Paste the **Value**
- Select **All Environments** (Production, Preview, Development)
- Click **Save**

---

## Step 6: Deploy

### Option A: Auto-deploy (recommended)
Just push your code to GitHub. Vercel will automatically build and deploy.

```bash
git add .
git commit -m "fix: complete system fix - auth, RLS, emoji picker, Ollama cloud"
git push origin main
```

### Option B: Manual redeploy
1. Go to Vercel Dashboard → your project
2. Click **Deployments** tab
3. Click the **...** menu on the latest deployment
4. Click **Redeploy**

---

## Step 7: Test Everything

After deployment:

1. **Open your app URL** (e.g., `https://your-app.vercel.app`)
2. **Sign up** with a new email — you'll auto-get `pro` tier
3. **Test manual transaction:**
   - Dashboard → "Add Transaction" button
   - Fill: Type=expense, Amount=10, Description="Test coffee"
   - Click "Save Transaction"
   - ✅ Should redirect to transactions list and show your entry
4. **Test AI (if configured):**
   - Dashboard → "AI Assistant" (or sidebar → AI Assistant)
   - Type: "I spent $5 on coffee and $12 on lunch"
   - ✅ Should show parsed transactions for review
   - Click "Save" to confirm
5. **Test edit/delete:**
   - Go to Transactions list
   - Hover over any transaction
   - ✅ Edit and Delete buttons should appear

---

## Local Development

If you want to run locally:

```bash
# 1. Copy env file
cp .env.example .env.local

# 2. Edit .env.local — paste your real keys from Steps 2-4

# 3. Install dependencies
npm install --legacy-peer-deps

# 4. Run dev server
npm run dev

# 5. Open http://localhost:3000
```

---

## Troubleshooting

| Problem | Likely Cause | Fix |
|---------|-------------|-----|
| "Unauthorized" error on save | Auth token expired | Sign out and sign back in |
| Transaction saves but doesn't appear | RLS policies missing | Re-run `supabase_schema.sql` |
| "No account found" error | No accounts in database | Sign up with a new account (trigger creates default account) |
| AI not responding | Missing `OLLAMA_API_KEY` | Add it to Vercel env vars |
| 500 error on any API | Check Vercel logs | Vercel Dashboard → Deployments → click latest → "Runtime Logs" |
| Categories look wrong | Old icon format | Categories now use emoji (🍔) not icon names |

---

## Files Changed in This Update

| File | What changed |
|------|-------------|
| `supabase_schema.sql` | **NEW** — Complete database schema |
| `src/proxy.ts` | Cleaned up (same function, was already correct) |
| `src/app/api/transactions/route.ts` | Better error logging |
| `src/app/api/ai/chat/route.ts` | Ollama cloud + configurable model |
| `src/lib/ai-parser.ts` | Default to Ollama cloud instead of gateway |
| `src/app/dashboard/transactions/page.tsx` | Fixed invisible edit/delete buttons |
| `src/app/dashboard/transactions/new/page.tsx` | Added emoji picker |
| `src/app/dashboard/categories/page.tsx` | Replaced icon picker with emoji picker |
| `src/components/ui/emoji-picker-mart.tsx` | **NEW** — Emoji picker component |
| `.env.example` | Updated with Ollama cloud setup |
