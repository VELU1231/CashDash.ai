'use client';

import Link from 'next/link';
import { Check, X, ArrowLeft, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);

  const handleUpgrade = async (planId: string, variantId?: string) => {
    if (!variantId) {
      window.location.href = '/register';
      return;
    }
    setLoading(planId);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variantId })
      });
      
      const data = await res.json();
      
      if (res.status === 401) {
        toast.error('Please log in first to upgrade.');
        window.location.href = '/login?next=/pricing';
        return;
      }
      
      if (!res.ok) throw new Error(data.error);
      
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to initiate checkout');
    } finally {
      setLoading(null);
    }
  };

  const PLANS = [
    {
      id: 'free',
      name: 'Basic',
      price: '0',
      desc: 'Perfect for getting started.',
      variantId: null,
      features: [
        { text: 'Up to 5 accounts', included: true },
        { text: 'Unlimited manual transactions', included: true },
        { text: 'Basic Charts & Analytics', included: true },
        { text: 'Multi-currency support', included: false },
        { text: 'AI Receipt Scanning', included: false },
        { text: 'Proactive AI Insights', included: false },
        { text: 'Shared Workspaces', included: false },
      ]
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '5',
      desc: 'For serious financial control.',
      popular: true,
      variantId: process.env.NEXT_PUBLIC_LEMONSQUEEZY_PRO_VARIANT_ID || 'dummy-pro',
      features: [
        { text: 'Unlimited accounts & transactions', included: true },
        { text: 'Persistent AI Chat History', included: true },
        { text: 'Multi-currency & Live Rates', included: true },
        { text: 'Scheduled Templates', included: true },
        { text: 'AI Receipt Scanning (OCR)', included: true },
        { text: 'Proactive AI Financial Insights', included: true },
        { text: 'Shared Workspaces', included: false },
      ]
    },
    {
      id: 'family',
      name: 'Family',
      price: '12',
      desc: 'Manage finances together.',
      variantId: process.env.NEXT_PUBLIC_LEMONSQUEEZY_FAMILY_VARIANT_ID || 'dummy-family',
      features: [
        { text: 'Everything in Pro', included: true },
        { text: 'Up to 5 Family Members', included: true },
        { text: 'Shared Workspaces', included: true },
        { text: 'Granular Permissions', included: true },
        { text: 'Family Budget Goals', included: true },
        { text: 'Kids Allowance Tracking', included: true },
        { text: 'Custom Categories', included: true },
      ]
    },
    {
      id: 'business',
      name: 'Business',
      price: '49',
      desc: 'For small businesses & freelancers.',
      variantId: process.env.NEXT_PUBLIC_LEMONSQUEEZY_BUSINESS_VARIANT_ID || 'dummy-biz',
      features: [
        { text: 'Everything in Family', included: true },
        { text: 'Unlimited Team Members', included: true },
        { text: 'Invoice Generation', included: true },
        { text: 'Receipt Matching', included: true },
        { text: 'Tax Prep Export', included: true },
        { text: 'API Access', included: true },
        { text: 'Priority Support', included: true },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <nav className="p-4">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
      </nav>
      <main className="flex-1 flex flex-col items-center justify-center py-10 px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Simple, transparent pricing</h1>
          <p className="text-lg text-muted-foreground">Start for free, upgrade when you need more power.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto w-full">
          {PLANS.map(plan => (
            <div key={plan.id} className={`rounded-3xl border bg-card p-6 shadow-sm flex flex-col relative overflow-hidden transition-all hover:shadow-glow ${plan.popular ? 'border-2 border-primary' : 'border-border'}`}>
              {plan.popular && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-bl-lg tracking-wider">
                  POPULAR
                </div>
              )}
              <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
              <p className="text-sm text-muted-foreground mb-6 h-10">{plan.desc}</p>
              <div className="text-4xl font-bold mb-6">${plan.price}<span className="text-lg text-muted-foreground font-normal">/mo</span></div>
              
              <button 
                onClick={() => handleUpgrade(plan.id, plan.variantId || undefined)}
                disabled={loading === plan.id}
                className={`w-full py-2.5 flex items-center justify-center gap-2 rounded-xl text-center font-medium transition-all mb-8 disabled:opacity-70 ${
                  plan.popular ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'border border-input hover:bg-muted text-foreground'
                }`}>
                {loading === plan.id && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading === plan.id ? 'Processing...' : plan.id === 'free' ? 'Start for free' : `Upgrade to ${plan.name}`}
              </button>
              
              <div className="space-y-3 flex-1">
                {plan.features.map((f, i) => (
                  <Feature key={i} icon={f.included ? <Check className="w-4 h-4 text-emerald-500" /> : <X className="w-4 h-4 text-muted-foreground" />} text={f.text} disabled={!f.included} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

function Feature({ icon, text, disabled }: { icon: React.ReactNode; text: string; disabled?: boolean }) {
  return (
    <div className={`flex items-center gap-3 ${disabled ? 'opacity-50' : ''}`}>
      {icon}
      <span className={disabled ? 'text-muted-foreground' : 'text-foreground'}>{text}</span>
    </div>
  );
}
