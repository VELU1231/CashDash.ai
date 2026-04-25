'use client';
export const runtime = 'edge';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { EnvelopeSimple, MapPin, ChatCircle } from '@phosphor-icons/react';
import { toast } from 'sonner';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSending(true);
    // In production, this would POST to an API endpoint
    await new Promise(r => setTimeout(r, 1000));
    toast.success('Message sent! We\'ll get back to you within 24 hours.');
    setForm({ name: '', email: '', subject: '', message: '' });
    setSending(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/" className="text-sm text-primary hover:underline mb-8 inline-block">← Back to Home</Link>

        <h1 className="text-4xl font-serif font-bold mb-2">Contact Us</h1>
        <p className="text-muted-foreground mb-10">Have a question, feedback, or need support? We&apos;d love to hear from you.</p>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {[
            { icon: EnvelopeSimple, title: 'Email', detail: 'support@cashbash.app', desc: 'Typically replies within 24h' },
            { icon: ChatCircle, title: 'In-App Chat', detail: 'AI Assistant', desc: 'Available in your dashboard' },
            { icon: MapPin, title: 'Location', detail: 'Remote-first', desc: 'Serving users worldwide' },
          ].map(item => (
            <motion.div key={item.title}
              className="rounded-2xl border border-border/40 bg-card/50 p-5"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            >
              <item.icon className="w-5 h-5 text-primary mb-3" weight="regular" />
              <h3 className="font-semibold text-sm mb-0.5">{item.title}</h3>
              <p className="text-sm text-foreground">{item.detail}</p>
              <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
            </motion.div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Name *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl text-sm border border-border/30 bg-foreground/[0.02] focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all"
                placeholder="Your name" required />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Email *</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl text-sm border border-border/30 bg-foreground/[0.02] focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all"
                placeholder="you@example.com" required />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Subject</label>
            <input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}
              className="w-full px-4 py-3 rounded-2xl text-sm border border-border/30 bg-foreground/[0.02] focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all"
              placeholder="What can we help with?" />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Message *</label>
            <textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })}
              rows={5}
              className="w-full px-4 py-3 rounded-2xl text-sm border border-border/30 bg-foreground/[0.02] focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all resize-none"
              placeholder="Tell us more..." required />
          </div>

          <motion.button type="submit" disabled={sending}
            className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60 transition-all shadow-sm"
            whileTap={{ scale: 0.98 }}>
            {sending ? 'Sending...' : 'Send Message'}
          </motion.button>
        </form>

        <div className="mt-12 pt-8 border-t border-border/20 flex gap-6 text-sm text-muted-foreground">
          <Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
          <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
        </div>
      </div>
    </div>
  );
}

