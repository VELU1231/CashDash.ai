'use client';

import { FolderOpen, Plus, MoreHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';

export default function CategoriesPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Categories</h1>
          <p className="text-sm text-muted-foreground">Manage your income and expense categories</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all hover:shadow-glow">
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card shadow-soft p-12 flex flex-col items-center justify-center text-center"
      >
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <FolderOpen className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Category Management</h2>
        <p className="text-muted-foreground max-w-md mx-auto mb-6">
          Organize your transactions with custom categories. This feature is currently being migrated to our new Next.js architecture.
        </p>
      </motion.div>
    </div>
  );
}
