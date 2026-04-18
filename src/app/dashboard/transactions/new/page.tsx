'use client';

import { Plus, ArrowLeft, Scan, CircleNotch, Image as ImageIcon, X } from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export default function NewTransactionPage() {
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  
  const [form, setForm] = useState<any>({
    type: 'expense',
    amount: '',
    currency: 'USD',
    description: '',
    note: '',
    category_id: '',
    account_id: '',
    dest_account_id: '',
    transaction_date: new Date().toISOString().split('T')[0],
    attachment: null as File | null
  });

  useEffect(() => {
    // Fetch accounts and categories
    Promise.all([
      fetch('/api/accounts').then(r => r.json()),
      fetch('/api/categories').then(r => r.json())
    ]).then(([accRes, catRes]) => {
      setAccounts(accRes.data || []);
      setCategories(catRes.data || []);
      if (accRes.data?.length > 0) {
        setForm((f: any) => ({ ...f, account_id: accRes.data[0].id, currency: accRes.data[0].currency }));
      }
    });
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setForm({ ...form, attachment: file });

      // If user wants to auto-scan, we can do it here or via a dedicated button
      // Let's add a prompt or just let them click the scan button
    }
  };

  const handleScanReceipt = async () => {
    if (!form.attachment) {
      toast.error('Please attach a receipt image first');
      return;
    }

    setScanning(true);
    try {
      const formData = new FormData();
      formData.append('file', form.attachment);

      const res = await fetch('/api/ai/scan', {
        method: 'POST',
        body: formData
      });
      const result = await res.json();

      if (!res.ok) throw new Error(result.error);

      // Auto-fill form
      const data = result.data;
      if (data) {
        setForm((f: any) => ({
          ...f,
          amount: data.total ? data.total.toString() : f.amount,
          date: data.date ? data.date : f.date,
          description: data.merchant ? data.merchant : f.description,
          currency: data.currency ? data.currency : f.currency
        }));
        toast.success('Receipt scanned and fields auto-filled!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Scanning failed. Try again.');
    } finally {
      setScanning(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || !form.account_id) {
      toast.error('Amount and Account are required');
      return;
    }

    setLoading(true);
    try {
      let attachment_path = null;
      let attachment_name = null;
      let attachment_size = null;
      let attachment_type = null;

      if (form.attachment) {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const fileExt = form.attachment.name.split('.').pop();
          const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
          // the policy restricts users to their own folder: user_id/filename
          const filePath = `${user.id}/${fileName}`;
          
          const { error: uploadError } = await supabase.storage
            .from('attachments')
            .upload(filePath, form.attachment);

          if (uploadError) {
            console.error('Upload error:', uploadError);
            toast.error('Failed to upload attachment (Did you run the SQL snippet?)');
          } else {
            attachment_path = filePath;
            attachment_name = form.attachment.name;
            attachment_size = form.attachment.size;
            attachment_type = form.attachment.type;
          }
        }
      }

      // Exclude the File object — it can't be JSON-serialized
      const { attachment: _file, ...formData } = form;
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          attachment_path,
          attachment_name,
          attachment_size,
          attachment_type
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');

      toast.success('Transaction saved!');
      window.location.href = '/dashboard/transactions';
    } catch (err: any) {
      toast.error(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter(c => c.type === form.type);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/transactions" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 font-medium">
          <ArrowLeft className="w-4 h-4" /> Back to transactions
        </Link>
        <div>
          <h1 className="text-2xl font-bold">New Transaction</h1>
          <p className="text-sm text-muted-foreground">Add a new manual transaction</p>
        </div>
      </div>

      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 space-y-6"
      >
        {/* Type Selector */}
        <div className="flex bg-muted/50 p-1 rounded-xl">
          {(['expense', 'income', 'transfer'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setForm({ ...form, type: t, category_id: '' })}
              className={`flex-1 py-2 text-sm font-medium capitalize rounded-lg transition-all ${
                form.type === t
                  ? t === 'expense' ? 'bg-red-500 text-white shadow-md'
                  : t === 'income' ? 'bg-emerald-500 text-white shadow-md'
                  : 'bg-blue-500 text-white shadow-md'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Amount *</label>
              <div className="flex items-center gap-2">
                <select value={form.currency} onChange={e => setForm({...form, currency: e.target.value})} className="px-3 py-2 rounded-lg border border-input bg-background w-24 focus:outline-none">
                  {['USD','PHP','EUR','GBP','JPY','INR','SGD','MYR','THB','AUD','CAD'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input type="number" step="0.01" required value={form.amount} onChange={e => setForm({...form, amount: e.target.value})}
                  className="flex-1 px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="0.00" />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Description</label>
              <input type="text" value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="e.g. Groceries at Walmart" />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Date</label>
              <input type="date" value={form.transaction_date} onChange={e => setForm({...form, transaction_date: e.target.value})}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">{form.type === 'transfer' ? 'From Account' : 'Account'} *</label>
              <select required value={form.account_id} onChange={e => setForm({...form, account_id: e.target.value})}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                {accounts.map(a => <option key={a.id} value={a.id}>{a.icon} {a.name} ({a.currency})</option>)}
              </select>
            </div>

            {form.type === 'transfer' ? (
              <div>
                <label className="text-sm font-medium mb-1 block">To Account *</label>
                <select required value={form.dest_account_id} onChange={e => setForm({...form, dest_account_id: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <option value="">Select Destination Account</option>
                  {accounts.filter(a => a.id !== form.account_id).map(a => <option key={a.id} value={a.id}>{a.icon} {a.name} ({a.currency})</option>)}
                </select>
              </div>
            ) : (
              <div>
                <label className="text-sm font-medium mb-1 block">Category</label>
                <select value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <option value="">No Category</option>
                  {filteredCategories.map(c => (
                    <optgroup key={c.id} label={`${c.icon} ${c.name}`}>
                      <option value={c.id}>{c.icon} {c.name}</option>
                      {c.subcategories?.map((sub: any) => (
                        <option key={sub.id} value={sub.id}>&nbsp;&nbsp;&nbsp;{sub.icon} {sub.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-1 block">Attachment (Receipt)</label>
              <input type="file" accept="image/*,application/pdf" onChange={handleFileChange}
                className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
              {form.attachment && form.attachment.type.startsWith('image/') && (
                <button type="button" onClick={handleScanReceipt} disabled={scanning}
                  className="mt-2 w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors disabled:opacity-50">
                  {scanning ? <CircleNotch className="w-4 h-4 animate-spin" /> : <Scan className="w-4 h-4" />}
                  {scanning ? 'Scanning Receipt...' : 'Auto-fill with AI Scanner (Pro)'}
                </button>
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Notes (Optional)</label>
          <textarea value={form.note} onChange={e => setForm({...form, note: e.target.value})} rows={3}
            className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Additional details..." />
        </div>

        <div className="flex gap-4 pt-4 border-t border-border">
          <Link href="/dashboard/transactions" className="flex-1 text-center py-2.5 rounded-xl border border-input font-medium hover:bg-muted transition-colors">
            Cancel
          </Link>
          <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all shadow-md disabled:opacity-70 flex justify-center items-center gap-2">
            {loading ? <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span> : <Plus className="w-4 h-4" />}
            {loading ? 'Saving...' : 'Save Transaction'}
          </button>
        </div>
      </motion.form>
    </div>
  );
}
