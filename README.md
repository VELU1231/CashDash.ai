# 💰 CashDash.ai

> **AI-powered personal finance tracker. Your money, beautifully organized.**

Built with Next.js 15 + Supabase + Ollama/OpenAI — 100% Vercel-compatible.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/VELU1231/CashDash.ai)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🤖 **AI Chat Entry** | Say "I spent ₱150 on lunch" — AI logs it automatically |
| 🏦 **Multi-Account** | Cash, bank, credit cards, investments |
| 📊 **Beautiful Charts** | Pie, line, area, bar charts with Recharts |
| 🗂️ **Smart Categories** | Two-level hierarchy, AI auto-creates categories |
| 🏷️ **Tags & Groups** | Organize transactions with flexible tags |
| 💱 **20+ Currencies** | PHP, USD, EUR, GBP, INR, JPY and more |
| 🌙 **Dark/Light Mode** | System-aware with manual toggle |
| 📱 **Mobile Ready** | Responsive design + bottom navigation |
| 🔒 **Privacy First** | Supabase RLS — your data is yours only |
| 📤 **CSV Export** | Export all your data anytime |
| 📅 **Templates** | Scheduled/recurring transactions |

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/VELU1231/CashDash.ai.git
cd CashDash.ai
npm install
```

### 2. Set up Supabase

1. Go to [supabase.com](https://supabase.com) → New project
2. In SQL Editor, run the contents of `supabase/schema.sql`
3. Copy your Project URL and Anon Key

### 3. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
AI_PROVIDER=ollama
AI_BASE_URL=http://localhost:11434
AI_MODEL=llama3.2
```

### 4. Set up Ollama (AI - Free & Local)

```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull a model
ollama pull llama3.2

# Start Ollama (runs on port 11434)
ollama serve
```

> **For Vercel deployment**: Use [Ollama Cloud](https://ollama.ai/cloud) or switch to OpenAI/Gemini.

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🤖 AI Configuration

### Option A: Ollama (Free, Local)
```env
AI_PROVIDER=ollama
AI_BASE_URL=http://localhost:11434
AI_MODEL=llama3.2
```

### Option B: OpenAI
```env
AI_PROVIDER=openai
AI_API_KEY=sk-your-key
AI_MODEL=gpt-4o-mini
AI_BASE_URL=https://api.openai.com/v1
```

### Option C: Gemini
```env
AI_PROVIDER=gemini
AI_API_KEY=your-gemini-key
AI_MODEL=gemini-1.5-flash
```

### Option D: Custom Ollama Cloud (Vercel-compatible)
```env
AI_PROVIDER=openai
AI_BASE_URL=https://your-ollama-cloud-url/v1
AI_MODEL=llama3.2
AI_API_KEY=your-cloud-key
```

---

## 📊 Supabase Setup

1. Create project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor**
3. Paste and run `supabase/schema.sql`
4. Enable **Email Auth** in Authentication settings
5. (Optional) Enable **Google OAuth** for social login
6. Set redirect URL: `https://your-app.vercel.app/auth/callback`

---

## 🚀 Deploy to Vercel

```bash
npm install -g vercel
vercel --prod
```

Or click: [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/VELU1231/CashDash.ai)

**Vercel Environment Variables to set:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `AI_PROVIDER` + `AI_API_KEY` + `AI_BASE_URL` + `AI_MODEL`

---

## 📁 Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login, Register pages
│   ├── dashboard/       # Main app pages
│   │   ├── ai-assistant/   # AI chat interface
│   │   ├── transactions/   # Transaction management
│   │   ├── accounts/       # Account management
│   │   ├── categories/     # Category management
│   │   ├── analytics/      # Charts & insights
│   │   ├── tags/           # Tag management
│   │   ├── templates/      # Scheduled transactions
│   │   └── settings/       # User settings
│   └── api/             # Next.js API routes
│       ├── ai/parse/    # AI transaction parser
│       ├── transactions/ # CRUD
│       ├── accounts/    # CRUD
│       └── ...
├── components/
│   ├── layout/          # Sidebar, Topbar, Mobile nav
│   ├── dashboard/       # Dashboard widgets
│   └── ui/              # Reusable UI components
├── lib/
│   ├── supabase/        # Client, server, middleware
│   ├── ai-parser.ts     # AI parsing engine
│   └── utils.ts         # Utilities & formatters
└── types/               # TypeScript definitions
supabase/
└── schema.sql           # Database schema + RLS
```

---

## 💰 Monetization Strategy

| Tier | Price | Limits |
|------|-------|--------|
| **Free** | $0/mo | 50 AI messages/mo, 5 accounts |
| **Pro** | $5/mo | Unlimited AI, unlimited accounts, receipt scanning |
| **Family** | $8/mo | Pro + 5 users |
| **Business** | $20/mo | Pro + 20 users + export APIs |

**Viral Features:**
- 📊 Shareable "Financial Wrapped" annual report
- 💡 AI insights: "You spent too much on coffee ☕"
- 🎯 Savings challenges with progress sharing

---

## 🔮 Roadmap

- [ ] Receipt OCR scanning (Tesseract.js)
- [ ] Bank statement import (CSV, OFX)
- [ ] Budget alerts & push notifications
- [ ] Financial health score
- [ ] Mobile app (React Native)
- [ ] Plaid bank integration
- [ ] Multi-user family accounts

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, TypeScript |
| Styling | Tailwind CSS, shadcn/ui |
| Animations | Framer Motion |
| Charts | Recharts |
| Icons | Lucide React |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| AI | Ollama / OpenAI / Gemini |
| Deployment | Vercel |

---

## 📄 License

MIT © 2025 DrVelu

---

> Built with ❤️ as a modern replacement for ezbookkeeping, rebuilt from Go → Next.js + Supabase + AI.
