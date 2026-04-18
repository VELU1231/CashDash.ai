'use client';

import { Plus, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function NewTransactionPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/transactions" className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">New Transaction</h1>
          <p className="text-sm text-muted-foreground">Add a new manual transaction</p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card shadow-soft p-12 flex flex-col items-center justify-center text-center"
      >
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Plus className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Manual Entry Form</h2>
        <p className="text-muted-foreground max-w-md mx-auto mb-6">
          The manual transaction entry form is being updated. In the meantime, you can use the AI Assistant to log transactions quickly!
        </p>
        <Link href="/dashboard/ai-assistant">
          <button className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all hover:shadow-glow">
            Use AI Assistant Instead
          </button>
        </Link>
      </motion.div>
    </div>
  );
}
