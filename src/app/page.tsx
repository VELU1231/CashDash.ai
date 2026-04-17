'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Sparkles, TrendingUp, Shield, Zap, BarChart3,
  MessageSquare, ArrowRight, CheckCircle2, Star,
  DollarSign, PieChart, LineChart, Brain
} from 'lucide-react';

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: 'easeOut' },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.1 } },
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* ─── Navigation ─── */}
      <motion.nav
        className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">CashDash<span className="text-emerald-600">.ai</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How it works</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Sign in
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all hover:shadow-glow"
            >
              Get started free
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* ─── Hero ─── */}
      <section className="pt-32 pb-20 px-4 relative">
        {/* Background gradient blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-emerald-500/8 rounded-full blur-3xl" />
          <div className="absolute top-40 right-1/4 w-80 h-80 bg-teal-500/8 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-48 bg-emerald-500/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto text-center relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 text-xs font-medium mb-6"
          >
            <Sparkles className="w-3 h-3" />
            AI-powered finance tracking
          </motion.div>

          <motion.h1
            className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-balance mb-6"
            {...fadeUp}
          >
            Your money,{' '}
            <span className="gradient-text">beautifully</span>
            <br />organized.
          </motion.h1>

          <motion.p
            className="text-lg sm:text-xl text-muted-foreground text-balance mb-8 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            Just say &ldquo;I spent ₱150 on lunch and ₱50 on bus fare&rdquo; — CashDash AI
            automatically logs every transaction, creates categories, and gives you
            beautiful financial insights.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <Link
              href="/register"
              className="group inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all hover:shadow-glow hover:scale-105"
            >
              Start for free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-border hover:border-primary/50 font-medium transition-all hover:bg-accent"
            >
              Sign in to dashboard
            </Link>
          </motion.div>

          {/* AI Chat Demo */}
          <motion.div
            className="mt-16 max-w-lg mx-auto"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
                <Brain className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium text-muted-foreground">CashDash AI Assistant</span>
                <span className="ml-auto inline-flex items-center gap-1 text-xs text-emerald-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-soft" />
                  Online
                </span>
              </div>
              <div className="p-4 space-y-3">
                <div className="ai-message user text-sm">
                  Today I spent 10 pesos on coffee and 15 pesos on bus fare
                </div>
                <div className="ai-message assistant text-sm">
                  <p className="font-medium text-foreground mb-2">✅ Got it! I logged 2 transactions:</p>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs bg-background rounded-lg px-3 py-2">
                      <span>☕ Coffee → Food & Drinks</span>
                      <span className="font-semibold text-red-500">-₱10.00</span>
                    </div>
                    <div className="flex items-center justify-between text-xs bg-background rounded-lg px-3 py-2">
                      <span>🚌 Bus fare → Transportation</span>
                      <span className="font-semibold text-red-500">-₱15.00</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Today · Philippine Peso</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Stats ─── */}
      <section className="py-12 border-y border-border bg-muted/30">
        <motion.div
          className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8"
          variants={stagger}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
        >
          {[
            { label: 'Transactions logged', value: '2M+' },
            { label: 'Currencies supported', value: '20+' },
            { label: 'AI accuracy', value: '95%' },
            { label: 'Always free tier', value: '✓' },
          ].map((stat) => (
            <motion.div key={stat.label} variants={fadeUp} className="text-center">
              <div className="text-3xl font-bold gradient-text">{stat.value}</div>
              <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Everything you need</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              From AI chat to beautiful charts — CashDash covers your entire financial life.
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={stagger}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {[
              {
                icon: <MessageSquare className="w-5 h-5" />,
                color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50',
                title: 'AI Chat Entry',
                desc: 'Just tell CashDash what you spent. It understands natural language in any currency and auto-creates transactions.',
              },
              {
                icon: <BarChart3 className="w-5 h-5" />,
                color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/50',
                title: 'Beautiful Analytics',
                desc: 'Pie charts, line charts, bar charts, and trend analysis. Understand your money at a glance.',
              },
              {
                icon: <PieChart className="w-5 h-5" />,
                color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/50',
                title: 'Smart Categories',
                desc: 'AI auto-creates and assigns categories. From "coffee" to Food & Drinks — no manual setup needed.',
              },
              {
                icon: <Shield className="w-5 h-5" />,
                color: 'text-orange-600 bg-orange-50 dark:bg-orange-950/50',
                title: 'Privacy First',
                desc: 'Your data is encrypted and protected with Supabase RLS. Only you can see your finances.',
              },
              {
                icon: <Zap className="w-5 h-5" />,
                color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/50',
                title: 'Multi-Currency',
                desc: 'Track in PHP, USD, EUR, and 17+ more currencies. Perfect for travelers and freelancers.',
              },
              {
                icon: <LineChart className="w-5 h-5" />,
                color: 'text-teal-600 bg-teal-50 dark:bg-teal-950/50',
                title: 'Budget Tracking',
                desc: 'Set monthly budgets, track progress, and get alerts when approaching limits.',
              },
            ].map((feature) => (
              <motion.div
                key={feature.title}
                variants={fadeUp}
                className="rounded-xl border border-border bg-card p-6 card-hover"
              >
                <div className={`inline-flex p-2.5 rounded-lg ${feature.color} mb-4`}>
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-base mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section id="how-it-works" className="py-24 px-4 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">How it works</h2>
            <p className="text-muted-foreground text-lg">Three steps to financial clarity</p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', icon: <MessageSquare className="w-6 h-6" />, title: 'Tell the AI', desc: 'Type or speak naturally. "Spent ₱200 on groceries" — done.' },
              { step: '02', icon: <Brain className="w-6 h-6" />, title: 'AI categorizes', desc: 'Extracts amount, currency, category, and date. Creates entries automatically.' },
              { step: '03', icon: <BarChart3 className="w-6 h-6" />, title: 'View insights', desc: 'Beautiful charts and AI insights show exactly where your money goes.' },
            ].map((step, i) => (
              <motion.div
                key={step.step}
                className="text-center"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15 }}
                viewport={{ once: true }}
              >
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary mb-4">
                  {step.icon}
                </div>
                <div className="text-xs font-mono text-muted-foreground mb-2">{step.step}</div>
                <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section id="pricing" className="py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Simple pricing</h2>
            <p className="text-muted-foreground">Start free, upgrade when you need more.</p>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                name: 'Free', price: '$0', period: 'forever',
                features: ['Unlimited manual transactions', '50 AI messages/month', '5 accounts', 'Basic charts', 'CSV export'],
                cta: 'Get started free', href: '/register', highlight: false,
              },
              {
                name: 'Pro', price: '$5', period: '/month',
                features: ['Everything in Free', 'Unlimited AI messages', 'Unlimited accounts', 'Advanced analytics', 'Receipt scanning (coming)', 'Priority support'],
                cta: 'Start Pro trial', href: '/register?plan=pro', highlight: true,
              },
            ].map((plan) => (
              <motion.div
                key={plan.name}
                className={`rounded-2xl border p-8 ${plan.highlight ? 'border-primary bg-primary/5 shadow-glow' : 'border-border bg-card'}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                {plan.highlight && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
                    <Star className="w-3 h-3" /> Most popular
                  </span>
                )}
                <h3 className="text-2xl font-bold mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={`block w-full text-center py-3 px-6 rounded-xl font-medium transition-all ${
                    plan.highlight
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-glow'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  {plan.cta}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border py-12 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <TrendingUp className="w-3 h-3 text-white" />
            </div>
            <span className="font-semibold text-sm">CashDash.ai</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © 2025 CashDash.ai · Built by DrVelu · Your money, beautifully organized.
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            <a href="https://github.com/VELU1231/CashDash.ai" className="hover:text-foreground transition-colors">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
