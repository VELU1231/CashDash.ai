'use client';

import { useState, useEffect, useRef } from 'react';
import { Download, Upload, CheckCircle2, Loader2, Trash2, Edit2, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import Papa from 'papaparse';
import { createWorker, PSM } from 'tesseract.js';
import { ParsedTransaction } from '@/lib/smart-parser';

import * as pdfjsLib from 'pdfjs-dist';

export default function ImportExportPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [importing, setImporting] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [statusText, setStatusText] = useState('');
  
  const [extractedTransactions, setExtractedTransactions] = useState<ParsedTransaction[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<ParsedTransaction | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Initialize PDF worker
    if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
    }
    
    fetch('/api/accounts').then(r => r.json()).then(res => {
      setAccounts(res.data || []);
      if (res.data?.length > 0) setSelectedAccountId(res.data[0].id);
    });
  }, []);

  const handleExport = () => {
    window.location.href = '/api/export';
    toast.success('Export started!');
  };

  const processCSV = (file: File) => {
    setStatusText('Parsing CSV...');
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const txs: ParsedTransaction[] = results.data.map((row: any) => {
            const amountStr = row.Amount || row.amount || '0';
            const amountNum = parseFloat(amountStr.replace(/[^0-9.-]/g, ''));
            const isExpense = amountNum < 0 || (row.Type?.toLowerCase() === 'expense');
            
            return {
              date: row.Date || row.date || new Date().toISOString().split('T')[0],
              description: row.Description || row.description || row.Payee || 'Imported CSV',
              amount: Math.round(Math.abs(amountNum) * 100),
              currency: row.Currency || row.currency || 'USD',
              type: isExpense ? 'expense' : 'income'
            };
          });
          setExtractedTransactions(txs);
          setExtracting(false);
          toast.success(`Found ${txs.length} transactions`);
        } catch {
          toast.error('Failed to parse CSV format');
          setExtracting(false);
        }
      },
      error: (error) => {
        toast.error(`CSV error: ${error.message}`);
        setExtracting(false);
      }
    });
  };

  const processImage = async (file: File) => {
    setStatusText('Loading OCR engine...');
    try {
      const worker = await createWorker('eng');
      
      worker.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK // Assume uniform block of text
      });

      setStatusText('Reading image text...');
      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();
      
      setStatusText('Extracting transactions...');
      // Use our backend smart-parser logic here if we exposed it or fetch to backend
      const formData = new FormData();
      // create a text file out of the OCR text to send to backend parser
      const textFile = new File([text], 'ocr.txt', { type: 'text/plain' });
      formData.append('file', textFile);
      
      const res = await fetch('/api/import/extract', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error);
      
      setExtractedTransactions(data.transactions || []);
      toast.success(`Found ${data.transactions?.length || 0} transactions`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to process image');
    } finally {
      setExtracting(false);
    }
  };

  const processPDF = async (file: File) => {
    setStatusText('Loading PDF engine...');
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        setStatusText(`Extracting page ${i} of ${pdf.numPages}...`);
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n';
      }
      
      if (!fullText.trim()) {
        throw new Error('No text found in PDF. It might be a scanned image.');
      }

      setStatusText('Extracting transactions...');
      const formData = new FormData();
      const textFile = new File([fullText], 'pdf-extracted.txt', { type: 'text/plain' });
      formData.append('file', textFile);
      
      const res = await fetch('/api/import/extract', {
        method: 'POST',
        body: formData
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setExtractedTransactions(data.transactions || []);
      toast.success(`Found ${data.transactions?.length || 0} transactions`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to process PDF');
    } finally {
      setExtracting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedAccountId) return;

    setExtracting(true);
    setExtractedTransactions([]);

    const type = file.type;
    const name = file.name.toLowerCase();

    if (type === 'text/csv' || name.endsWith('.csv')) {
      processCSV(file);
    } else if (type === 'application/pdf' || name.endsWith('.pdf')) {
      processPDF(file);
    } else if (type.startsWith('image/') || name.match(/\.(jpg|jpeg|png|webp)$/)) {
      await processImage(file);
    } else {
      toast.error('Unsupported file type. Use CSV, PDF, or Images.');
      setExtracting(false);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImportAll = async () => {
    if (extractedTransactions.length === 0) return;
    
    setImporting(true);
    try {
      // The API expects amount to be un-multiplied (it will multiply by 100) OR we modify the API.
      // Wait, our API does: Math.round(Math.abs(amountFloat) * 100).
      // Since our parser already returned cents, we must pass it formatted as a string decimal for the current API to ingest properly.
      const formattedTxs = extractedTransactions.map(t => ({
        date: t.date,
        description: t.description,
        amount: (t.amount / 100).toFixed(2), // convert back to decimal for the API
        currency: t.currency,
        type: t.type
      }));

      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: selectedAccountId, transactions: formattedTxs })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(`Successfully imported ${data.count} transactions!`);
      setExtractedTransactions([]);
    } catch (err: any) {
      toast.error(err.message || 'Failed to import');
    } finally {
      setImporting(false);
    }
  };

  const deleteRow = (index: number) => {
    setExtractedTransactions(prev => prev.filter((_, i) => i !== index));
  };

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditForm({ ...extractedTransactions[index] });
  };

  const saveEdit = () => {
    if (editingIndex === null || !editForm) return;
    setExtractedTransactions(prev => {
      const nw = [...prev];
      nw[editingIndex] = editForm;
      return nw;
    });
    setEditingIndex(null);
    setEditForm(null);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Smart Import / Export</h1>
          <p className="text-sm text-muted-foreground">Extract transactions from CSV, PDF, or Images (Zero AI Cost)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-card shadow-soft p-8 flex flex-col items-center justify-center text-center relative overflow-hidden"
        >
          {extracting && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
              <p className="font-medium">{statusText}</p>
            </div>
          )}
          
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Upload className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Smart Import</h2>
          <p className="text-muted-foreground mb-4 text-sm">
            Upload a CSV, PDF bank statement, or Receipt Image. We'll extract the data automatically.
          </p>
          <div className="w-full text-left mb-6 space-y-1">
            <label className="text-sm font-medium">Target Account</label>
            <select value={selectedAccountId} onChange={e => setSelectedAccountId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>)}
            </select>
          </div>
          <input type="file" accept=".csv,.pdf,image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={extracting || accounts.length === 0}
            className="w-full flex justify-center items-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all hover:shadow-glow disabled:opacity-50">
            Select File
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
          <p className="text-muted-foreground mb-6 text-sm">
            Download all your transaction data as a CSV file for your own records.
          </p>
          <button onClick={handleExport} className="w-full py-2.5 rounded-xl border border-input text-sm font-medium hover:bg-muted transition-colors mt-auto">
            Export All Data
          </button>
        </motion.div>
      </div>

      <AnimatePresence>
        {extractedTransactions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden"
          >
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
              <div>
                <h3 className="font-semibold">Review Extracted Data</h3>
                <p className="text-sm text-muted-foreground">Found {extractedTransactions.length} transactions. Edit or remove before importing.</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setExtractedTransactions([])}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-input hover:bg-muted"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleImportAll}
                  disabled={importing}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2"
                >
                  {importing ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckCircle2 className="w-4 h-4" />}
                  Confirm Import
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground bg-muted/50 uppercase">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {extractedTransactions.map((tx, idx) => (
                    <tr key={idx} className="hover:bg-muted/30">
                      {editingIndex === idx && editForm ? (
                        <>
                          <td className="px-4 py-2"><input type="date" value={editForm.date} onChange={e => setEditForm({...editForm, date: e.target.value})} className="w-full bg-background border rounded px-2 py-1" /></td>
                          <td className="px-4 py-2"><input type="text" value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} className="w-full bg-background border rounded px-2 py-1" /></td>
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-1">
                              {editForm.currency} <input type="number" step="0.01" value={(editForm.amount/100).toFixed(2)} onChange={e => setEditForm({...editForm, amount: Math.round(parseFloat(e.target.value)*100)})} className="w-20 bg-background border rounded px-2 py-1" />
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            <select value={editForm.type} onChange={e => setEditForm({...editForm, type: e.target.value as any})} className="bg-background border rounded px-2 py-1">
                              <option value="expense">Expense</option>
                              <option value="income">Income</option>
                            </select>
                          </td>
                          <td className="px-4 py-2 text-right">
                            <button onClick={saveEdit} className="text-green-500 p-1"><Check className="w-4 h-4"/></button>
                            <button onClick={() => setEditingIndex(null)} className="text-red-500 p-1"><X className="w-4 h-4"/></button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 font-mono">{tx.date}</td>
                          <td className="px-4 py-3 max-w-[200px] truncate" title={tx.description}>{tx.description}</td>
                          <td className={`px-4 py-3 font-mono font-medium ${tx.type === 'income' ? 'text-emerald-500' : 'text-red-500'}`}>
                            {tx.type === 'income' ? '+' : '-'}{(tx.amount/100).toFixed(2)} {tx.currency}
                          </td>
                          <td className="px-4 py-3 capitalize">{tx.type}</td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => startEdit(idx)} className="text-muted-foreground hover:text-primary p-1 inline-block"><Edit2 className="w-4 h-4"/></button>
                            <button onClick={() => deleteRow(idx)} className="text-muted-foreground hover:text-red-500 p-1 inline-block"><Trash2 className="w-4 h-4"/></button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
