'use client';

import Link from 'next/link';
import { Check, X, ArrowLeft, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function PricingPage() {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variantId: process.env.NEXT_PUBLIC_LEMONSQUEEZY_PRO_VARIANT_ID || 'dummy' })
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
      setLoading(false);
    }
  };

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

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto w-full">
          {/* Free Tier */}
          <div className="rounded-3xl border border-border bg-card p-8 shadow-sm flex flex-col">
            <h3 className="text-2xl font-bold mb-2">Basic</h3>
            <p className="text-muted-foreground mb-6">Perfect for getting started.</p>
            <div className="text-4xl font-bold mb-6">$0<span className="text-lg text-muted-foreground font-normal">/mo</span></div>
            <Link href="/signup" className="w-full py-3 rounded-xl border border-input text-center font-medium hover:bg-muted transition-colors mb-8">
              Start for free
            </Link>
            <div className="space-y-4 flex-1">
              <Feature icon={<Check className="w-5 h-5 text-emerald-500" />} text="Up to 5 accounts" />
              <Feature icon={<Check className="w-5 h-5 text-emerald-500" />} text="Unlimited manual transactions" />
              <Feature icon={<Check className="w-5 h-5 text-emerald-500" />} text="Basic Charts & Analytics" />
              <Feature icon={<X className="w-5 h-5 text-muted-foreground" />} text="Multi-currency support" disabled />
              <Feature icon={<X className="w-5 h-5 text-muted-foreground" />} text="AI Receipt Scanning" disabled />
              <Feature icon={<X className="w-5 h-5 text-muted-foreground" />} text="Proactive AI Insights" disabled />
            </div>
          </div>

          {/* Pro Tier */}
          <div className="rounded-3xl border-2 border-primary bg-card p-8 shadow-glow flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">
              POPULAR
            </div>
            <h3 className="text-2xl font-bold mb-2">Pro</h3>
            <p className="text-muted-foreground mb-6">For serious financial control.</p>
            <div className="text-4xl font-bold mb-6">$5<span className="text-lg text-muted-foreground font-normal">/mo</span></div>
            <button 
              onClick={handleUpgrade}
              disabled={loading}
              className="w-full py-3 flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground text-center font-medium hover:bg-primary/90 transition-all hover:shadow-glow mb-8 disabled:opacity-70">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Processing...' : 'Upgrade to Pro'}
            </button>
            <div className="space-y-4 flex-1">
              <Feature icon={<Check className="w-5 h-5 text-emerald-500" />} text="Unlimited accounts & transactions" />
              <Feature icon={<Check className="w-5 h-5 text-emerald-500" />} text="Persistent AI Chat History" />
              <Feature icon={<Check className="w-5 h-5 text-emerald-500" />} text="Multi-currency support & Live Rates" />
              <Feature icon={<Check className="w-5 h-5 text-emerald-500" />} text="Scheduled Transactions (Templates)" />
              <Feature icon={<Check className="w-5 h-5 text-emerald-500" />} text="AI Receipt Scanning (OCR)" />
              <Feature icon={<Check className="w-5 h-5 text-emerald-500" />} text="Proactive AI Financial Insights" />
            </div>
          </div>
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
