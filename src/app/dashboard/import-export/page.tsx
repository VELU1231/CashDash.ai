import { useState, useEffect, useRef } from 'react';
import { Download, Upload, CheckCircle2, Loader2, FileWarning } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import Papa from 'papaparse';

export default function ImportExportPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/accounts').then(r => r.json()).then(res => {
      setAccounts(res.data || []);
      if (res.data?.length > 0) setSelectedAccountId(res.data[0].id);
    });
  }, []);

  const handleExport = () => {
    window.location.href = '/api/export';
    toast.success('Export started!');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedAccountId) return;

    setImporting(true);
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const transactions = results.data.map((row: any) => ({
            date: row.Date || row.date || new Date().toISOString(),
            description: row.Description || row.description || row.Payee || 'Imported',
            amount: row.Amount || row.amount || '0',
            currency: row.Currency || row.currency || 'USD',
          }));

          const res = await fetch('/api/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ account_id: selectedAccountId, transactions })
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error);

          toast.success(`Successfully imported ${data.count} transactions!`);
        } catch (err: any) {
          toast.error(err.message || 'Failed to import CSV');
        } finally {
          setImporting(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      },
      error: (error) => {
        toast.error(`CSV Parsing error: ${error.message}`);
        setImporting(false);
      }
    });
  };
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
          <p className="text-muted-foreground mb-4">
            Upload a CSV file with columns: <code>Date, Description, Amount</code>
          </p>
          <div className="w-full text-left mb-6 space-y-1">
            <label className="text-sm font-medium">Target Account</label>
            <select value={selectedAccountId} onChange={e => setSelectedAccountId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>)}
            </select>
          </div>
          <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={importing || accounts.length === 0}
            className="w-full flex justify-center items-center gap-2 py-2.5 rounded-xl border border-input text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50">
            {importing ? <><Loader2 className="w-4 h-4 animate-spin"/> Importing...</> : 'Select CSV File'}
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
          <button onClick={handleExport} className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all hover:shadow-glow">
            Export All Data
          </button>
        </motion.div>
      </div>
    </div>
  );
}
