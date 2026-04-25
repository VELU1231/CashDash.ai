'use client';
export const runtime = 'edge';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { TrendingUp, Mail, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast.error(error.message);
      } else {
        setSuccess(true);
        toast.success('Check your email for the reset link!');
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-2 relative z-10">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg">CashBash<span className="text-emerald-600">.ai</span></span>
          </Link>
        </div>

        <Link href="/login" className="flex items-center gap-2 mb-8 text-sm text-muted-foreground hover:text-foreground w-fit transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to login</span>
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">Reset your password</h1>
          <p className="text-muted-foreground text-sm">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        {success ? (
          <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-sm">
            We've sent a password reset link to <strong>{email}</strong>. Please check your inbox and spam folder.
          </div>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-sm input-animated focus:outline-none"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-all hover:shadow-glow disabled:opacity-60 flex items-center justify-center gap-2"
              whileTap={{ scale: 0.98 }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send reset link'}
            </motion.button>
          </form>
        )}
      </motion.div>
    </div>
  );
}

