'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Sparkle, TrendUp, Shield, Lightning, ChartBar,
  ChatCircle, ArrowRight, CheckCircle, Star,
  CurrencyDollar, ChartPie, ChartLineUp, Brain
} from '@phosphor-icons/react';

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.1 } },
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* ─── Navigation — Glass ─── */}
      <motion.nav
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          background: 'hsl(var(--background) / 0.7)',
          backdropFilter: 'blur(20px) saturate(1.6)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
          borderBottom: '1px solid hsl(var(--foreground) / 0.04)',
        }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-glow">
              <TrendUp className="w-4 h-4 text-white" weight="bold" />
            </div>
            <span className="font-serif font-bold text-lg tracking-tight">CashBash<span className="text-emerald-500">.ai</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors duration-200">Features</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors duration-200">How it works</a>
            <a href="#pricing" className="hover:text-foreground transition-colors duration-200">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200">
              Sign in
            </Link>
            <Link
              href="/register"
              className="btn-primary !text-[13px] !px-4 !py-2"
            >
              Get started free
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* ─── Hero — Editorial + Liquid ─── */}
      <section className="pt-36 pb-24 px-4 relative">
        {/* Background gradient blobs — clean tones */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div 
            className="absolute top-20 left-1/4 w-[500px] h-[500px] rounded-full blur-[100px]"
            style={{ background: 'hsl(var(--primary) / 0.05)' }}
            animate={{ y: [0, -20, 0], x: [0, 10, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute top-40 right-1/4 w-[400px] h-[400px] rounded-full blur-[100px]"
            style={{ background: 'hsl(217 91% 60% / 0.04)' }}
            animate={{ y: [0, 15, 0], x: [0, -10, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-56 rounded-full blur-[100px]"
            style={{ background: 'hsl(var(--primary) / 0.03)' }}
          />
        </div>

        <div className="max-w-4xl mx-auto text-center relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium mb-8"
            style={{
              border: '1px solid hsl(var(--primary) / 0.2)',
              background: 'hsl(var(--primary) / 0.06)',
              color: 'hsl(var(--primary))',
            }}
          >
            <Sparkle className="w-3 h-3" weight="duotone" />
            AI-powered finance tracking
          </motion.div>

          <motion.h1
            className="text-5xl sm:text-6xl lg:text-7xl font-serif font-bold tracking-tight text-balance mb-6 editorial-heading"
            {...fadeUp}
          >
            Your money,{' '}
            <span className="gradient-text">beautifully</span>
            <br />organized.
          </motion.h1>

          <motion.p
            className="text-lg sm:text-xl text-muted-foreground text-balance mb-10 max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          >
            Just say &ldquo;I spent ₱150 on lunch and ₱50 on bus fare&rdquo; — CashBash AI
            automatically logs every transaction, creates categories, and gives you
            beautiful financial insights.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <Link href="/register">
              <motion.button
                className="group btn-primary !px-7 !py-3.5 !rounded-2xl !text-base"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
              >
                Start for free
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" weight="bold" />
              </motion.button>
            </Link>
            <Link href="/login">
              <motion.button
                className="btn-secondary !px-7 !py-3.5 !rounded-2xl !text-base"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Sign in to dashboard
              </motion.button>
            </Link>
          </motion.div>

          {/* AI Chat Demo — Glass Panel */}
          <motion.div
            className="mt-20 max-w-lg mx-auto"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="float-panel overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3.5" style={{ borderBottom: '1px solid hsl(var(--foreground) / 0.04)', background: 'hsl(var(--foreground) / 0.02)' }}>
                <Brain className="w-4 h-4 text-emerald-500" weight="duotone" />
                <span className="text-xs font-medium text-muted-foreground">CashBash AI Assistant</span>
                <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-emerald-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-soft" />
                  Online
                </span>
              </div>
              <div className="p-5 space-y-3">
                <div className="ai-message user text-sm">
                  Today I spent 10 pesos on coffee and 15 pesos on bus fare
                </div>
                <div className="ai-message assistant text-sm">
                  <p className="font-medium text-foreground mb-2">✅ Got it! I logged 2 transactions:</p>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs rounded-xl px-3 py-2.5" style={{ background: 'hsl(var(--foreground) / 0.03)' }}>
                      <span>☕ Coffee → Food & Drinks</span>
                      <span className="font-semibold font-serif text-red-400">-₱10.00</span>
                    </div>
                    <div className="flex items-center justify-between text-xs rounded-xl px-3 py-2.5" style={{ background: 'hsl(var(--foreground) / 0.03)' }}>
                      <span>🚌 Bus fare → Transportation</span>
                      <span className="font-semibold font-serif text-red-400">-₱15.00</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2.5 font-mono">Today · Philippine Peso</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Stats — Editorial Numbers ─── */}
      <section className="py-16" style={{ borderTop: '1px solid hsl(var(--foreground) / 0.04)', borderBottom: '1px solid hsl(var(--foreground) / 0.04)', background: 'hsl(var(--foreground) / 0.015)' }}>
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
              <div className="text-4xl font-serif font-bold gradient-text editorial-number">{stat.value}</div>
              <div className="text-sm text-muted-foreground mt-1.5">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ─── Features — Glass Cards ─── */}
      <section id="features" className="py-28 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          >
            <h2 className="text-3xl sm:text-5xl font-serif font-bold mb-5 editorial-heading">Everything you need</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto leading-relaxed">
              From AI chat to beautiful charts — CashBash covers your entire financial life.
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
            variants={stagger}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {[
              {
                icon: <ChatCircle className="w-5 h-5" weight="regular" />,
                color: 'hsl(var(--primary))',
                bg: 'hsl(var(--primary) / 0.08)',
                title: 'AI Chat Entry',
                desc: 'Just tell CashBash what you spent. It understands natural language in any currency and auto-creates transactions.',
              },
              {
                icon: <ChartBar className="w-5 h-5" weight="regular" />,
                color: 'hsl(217 91% 60%)',
                bg: 'hsl(217 91% 60% / 0.08)',
                title: 'Beautiful Analytics',
                desc: 'Pie charts, line charts, bar charts, and trend analysis. Understand your money at a glance.',
              },
              {
                icon: <ChartPie className="w-5 h-5" weight="regular" />,
                color: 'hsl(280 45% 55%)',
                bg: 'hsl(280 45% 55% / 0.08)',
                title: 'Smart Categories',
                desc: 'AI auto-creates and assigns categories. From "coffee" to Food & Drinks — no manual setup needed.',
              },
              {
                icon: <Shield className="w-5 h-5" weight="regular" />,
                color: 'hsl(215 25% 40%)',
                bg: 'hsl(215 25% 40% / 0.08)',
                title: 'Privacy First',
                desc: 'Your data is encrypted and protected with Supabase RLS. Only you can see your finances.',
              },
              {
                icon: <Lightning className="w-5 h-5" weight="regular" />,
                color: 'hsl(24 95% 53%)',
                bg: 'hsl(24 95% 53% / 0.08)',
                title: 'Multi-Currency',
                desc: 'Track in PHP, USD, EUR, and 17+ more currencies. Perfect for travelers and freelancers.',
              },
              {
                icon: <ChartLineUp className="w-5 h-5" weight="regular" />,
                color: 'hsl(var(--primary))',
                bg: 'hsl(var(--primary) / 0.08)',
                title: 'Budget Tracking',
                desc: 'Set monthly budgets, track progress, and get alerts when approaching limits.',
              },
            ].map((feature) => (
              <motion.div
                key={feature.title}
                variants={fadeUp}
                className="glass-card p-6 group"
              >
                <div className="inline-flex p-2.5 rounded-xl mb-5" style={{ background: feature.bg }}>
                  <span style={{ color: feature.color }}>{feature.icon}</span>
                </div>
                <h3 className="font-serif font-semibold text-base mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── How It Works — Editorial Steps ─── */}
      <section id="how-it-works" className="py-28 px-4" style={{ background: 'hsl(var(--foreground) / 0.015)' }}>
        <div className="max-w-5xl mx-auto">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-5xl font-serif font-bold mb-5 editorial-heading">How it works</h2>
            <p className="text-muted-foreground text-lg">Three steps to financial clarity</p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-10">
            {[
              { step: '01', icon: <ChatCircle className="w-6 h-6" weight="regular" />, title: 'Tell the AI', desc: 'Type or speak naturally. "Spent ₱200 on groceries" — done.' },
              { step: '02', icon: <Brain className="w-6 h-6" weight="duotone" />, title: 'AI categorizes', desc: 'Extracts amount, currency, category, and date. Creates entries automatically.' },
              { step: '03', icon: <ChartBar className="w-6 h-6" weight="regular" />, title: 'View insights', desc: 'Beautiful charts and AI insights show exactly where your money goes.' },
            ].map((step, i) => (
              <motion.div
                key={step.step}
                className="text-center"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                viewport={{ once: true }}
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5 text-emerald-500"
                  style={{ background: 'hsl(var(--primary) / 0.08)' }}>
                  {step.icon}
                </div>
                <div className="text-xs font-mono text-muted-foreground mb-3 tracking-wider">{step.step}</div>
                <h3 className="font-serif font-semibold text-xl mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing — Editorial Layout ─── */}
      <section id="pricing" className="py-28 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-5xl font-serif font-bold mb-5 editorial-heading">Simple pricing</h2>
            <p className="text-muted-foreground text-lg">Start free, upgrade when you need more.</p>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                name: 'Free', price: '$0', period: 'forever',
                features: ['Unlimited manual transactions', '50 AI messages/month', '5 accounts', 'Basic charts', 'CSV export'],
                cta: 'Get started free', href: '/register', highlight: false,
              },
              {
                name: 'Pro', price: '$5', period: '/month',
                features: ['Everything in Free', 'Unlimited AI messages', 'Unlimited accounts', 'Proactive AI Insights', 'AI Receipt Scanning', 'Multi-currency support'],
                cta: 'Upgrade to Pro', href: '/pricing', highlight: true,
              },
            ].map((plan) => (
              <motion.div
                key={plan.name}
                className={`rounded-2xl p-8 ${plan.highlight ? 'glass-card glow-emerald-strong' : 'glass-card'}`}
                style={plan.highlight ? { borderColor: 'hsl(var(--primary) / 0.2)' } : {}}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                {plan.highlight && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium mb-5"
                    style={{ background: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))' }}>
                    <Star className="w-3 h-3" weight="fill" /> Most popular
                  </span>
                )}
                <h3 className="text-2xl font-serif font-bold mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-7">
                  <span className="text-5xl font-serif font-bold editorial-number">{plan.price}</span>
                  <span className="text-muted-foreground text-sm">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm">
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" weight="fill" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href={plan.href}>
                  <motion.button
                    className={`w-full py-3.5 px-6 rounded-xl font-medium transition-all duration-300 text-sm ${
                      plan.highlight
                        ? 'btn-primary !w-full !rounded-xl'
                        : 'btn-secondary !w-full !rounded-xl'
                    }`}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    {plan.cta}
                  </motion.button>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Footer — Refined ─── */}
      <footer style={{ borderTop: '1px solid hsl(var(--foreground) / 0.04)' }} className="py-14 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
              <TrendUp className="w-3.5 h-3.5 text-white" weight="bold" />
            </div>
            <span className="font-serif font-semibold text-sm">CashBash.ai</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © 2025 CashBash.ai · Built by DrVelu · Your money, beautifully organized.
          </p>
          <div className="flex items-center gap-5 text-xs text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors duration-200">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors duration-200">Terms</a>
            <a href="https://github.com/VELU1231/CashBash.ai" className="hover:text-foreground transition-colors duration-200">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
