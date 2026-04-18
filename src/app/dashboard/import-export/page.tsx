'use client';

import { Download, Upload } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ImportExportPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Import / Export</h1>
          <p className="text-sm text-muted-foreground">Move your data in and out of CashDash</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-card shadow-soft p-8 flex flex-col items-center justify-center text-center"
        >
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Upload className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Import CSV</h2>
          <p className="text-muted-foreground mb-6">
            Upload a CSV file from your bank or another app to import transactions.
          </p>
          <button className="w-full py-2.5 rounded-xl border border-input text-sm font-medium hover:bg-muted transition-colors">
            Select CSV File
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-border bg-card shadow-soft p-8 flex flex-col items-center justify-center text-center"
        >
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Download className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Export Data</h2>
          <p className="text-muted-foreground mb-6">
            Download all your transaction data as a CSV file for your own records.
          </p>
          <button className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all hover:shadow-glow">
            Export All Data
          </button>
        </motion.div>
      </div>
    </div>
  );
}
